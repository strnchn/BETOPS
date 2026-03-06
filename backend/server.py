import json
import os
import uuid
import logging
from datetime import datetime, timezone
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
PROJECT_ROOT = ROOT_DIR.parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
jwt_secret = os.environ["JWT_SECRET"]
jwt_algorithm = os.environ["JWT_ALGORITHM"]

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

app = FastAPI(title="BetOps SaaS API")
api_router = APIRouter(prefix="/api")


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    full_name: str
    email: EmailStr
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserPublic


class BookmakerCreate(BaseModel):
    name: str
    balance: float = 0.0


class Bookmaker(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    user_id: str
    name: str
    balance: float
    is_default: bool
    created_at: str


class StrategyCreate(BaseModel):
    name: str
    description: str = ""
    target_roi: float = 0.0


class Strategy(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    user_id: str
    name: str
    description: str
    target_roi: float
    created_at: str


class TransactionCreate(BaseModel):
    bookmaker_id: str
    type: Literal["deposit", "withdrawal"]
    amount: float
    date: Optional[str] = None
    notes: str = ""


class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    user_id: str
    bookmaker_id: str
    type: Literal["deposit", "withdrawal"]
    amount: float
    date: str
    notes: str


class BetCreate(BaseModel):
    bookmaker_id: str
    event: str
    market: str
    sport: str
    odds: float
    stake: float
    strategy_id: Optional[str] = None
    strategy_name: Optional[str] = None
    bet_type: Literal[
        "simples",
        "multipla",
        "arbitragem",
        "freebet",
        "dutching",
        "super_odds",
        "duplo_green",
    ]
    result: Literal["pending", "won", "lost", "void", "cashout"] = "pending"
    return_amount: Optional[float] = None
    freebet_stake_returned: bool = False
    notes: str = ""


class Bet(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    user_id: str
    bookmaker_id: str
    event: str
    market: str
    sport: str
    odds: float
    stake: float
    strategy_id: Optional[str] = None
    strategy_name: str
    bet_type: str
    result: str
    return_amount: Optional[float] = None
    freebet_stake_returned: bool
    profit_loss: float
    placed_at: str
    settled_at: Optional[str] = None
    notes: str


class ArbitrageRequest(BaseModel):
    odd_a: float
    odd_b: float
    banca_total: float


class FreebetRequest(BaseModel):
    freebet_amount: float
    back_odd: float
    lay_odd: float
    commission: float = 0.02
    mode: Literal["snr", "sr"] = "snr"
    candidate_back_odds: Optional[List[float]] = None


class DashboardSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bankroll_current: float
    deposits_total: float
    withdrawals_total: float
    net_profit: float
    roi_total: float
    yield_total: float
    win_rate: float
    hit_rate: float
    total_bets: int
    settled_bets: int
    profit_by_strategy: List[Dict[str, str | float]]
    profit_by_bookmaker: List[Dict[str, str | float]]
    profit_by_sport: List[Dict[str, str | float]]
    growth_curve: List[Dict[str, str | float]]
    recent_bets: List[Bet]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso_safe(date_value: Optional[str]) -> datetime:
    if not date_value:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(date_value)
    except ValueError:
        return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(datetime.now(timezone.utc).timestamp()),
    }
    return jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)


def load_default_bookmakers() -> List[str]:
    design_file = PROJECT_ROOT / "design_guidelines.json"
    with design_file.open("r", encoding="utf-8") as file:
        content = json.load(file)
    return content.get("bookmakers_list", [])


async def seed_defaults_for_user(user_id: str):
    default_bookmakers = load_default_bookmakers()
    now = now_iso()

    bookmaker_docs = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": name,
            "balance": 0.0,
            "is_default": True,
            "created_at": now,
        }
        for name in default_bookmakers
    ]
    if bookmaker_docs:
        await db.bookmakers.insert_many(bookmaker_docs)

    default_strategies = [
        {"name": "Aposta Simples", "description": "Mercado único", "target_roi": 3.0},
        {"name": "Arbitragem", "description": "Lucro garantido", "target_roi": 2.0},
        {"name": "Freebet", "description": "Extração de valor", "target_roi": 20.0},
        {"name": "Dutching", "description": "Cobertura múltipla", "target_roi": 5.0},
        {"name": "Super Odds", "description": "Odds promocionais", "target_roi": 8.0},
        {"name": "Duplo Green", "description": "Dupla proteção", "target_roi": 4.0},
    ]
    strategy_docs = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": strategy["name"],
            "description": strategy["description"],
            "target_roi": strategy["target_roi"],
            "created_at": now,
        }
        for strategy in default_strategies
    ]
    await db.strategies.insert_many(strategy_docs)


def calculate_bet_profit(payload: BetCreate) -> float:
    if payload.result == "pending":
        return 0.0
    if payload.bet_type == "freebet":
        if payload.result == "won":
            if payload.freebet_stake_returned:
                return payload.stake * payload.odds
            return payload.stake * (payload.odds - 1)
        return 0.0
    if payload.result == "won":
        if payload.return_amount is not None:
            return payload.return_amount - payload.stake
        return payload.stake * (payload.odds - 1)
    if payload.result == "lost":
        return -payload.stake
    if payload.result == "cashout":
        if payload.return_amount is None:
            return 0.0
        return payload.return_amount - payload.stake
    return 0.0


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserPublic:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise credentials_exception
    return UserPublic(**user)


async def validate_bookmaker_ownership(user_id: str, bookmaker_id: str):
    bookmaker = await db.bookmakers.find_one(
        {"id": bookmaker_id, "user_id": user_id}, {"_id": 0}
    )
    if not bookmaker:
        raise HTTPException(status_code=404, detail="Casa de apostas não encontrada")


async def recalculate_bookmaker_balance(user_id: str, bookmaker_id: str):
    transactions = await db.transactions.find(
        {"user_id": user_id, "bookmaker_id": bookmaker_id},
        {"_id": 0, "type": 1, "amount": 1},
    ).to_list(5000)
    bets = await db.bets.find(
        {
            "user_id": user_id,
            "bookmaker_id": bookmaker_id,
            "result": {"$ne": "pending"},
        },
        {"_id": 0, "profit_loss": 1},
    ).to_list(5000)

    deposits = sum(item["amount"] for item in transactions if item["type"] == "deposit")
    withdrawals = sum(
        item["amount"] for item in transactions if item["type"] == "withdrawal"
    )
    net_profit = sum(item.get("profit_loss", 0.0) for item in bets)
    balance = float((deposits - withdrawals) + net_profit)

    await db.bookmakers.update_one(
        {"id": bookmaker_id, "user_id": user_id}, {"$set": {"balance": balance}}
    )


async def build_dashboard_data(user_id: str) -> DashboardSummary:
    bookmakers = await db.bookmakers.find({"user_id": user_id}, {"_id": 0}).to_list(2000)
    strategies = await db.strategies.find({"user_id": user_id}, {"_id": 0}).to_list(2000)
    transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    bets = await db.bets.find({"user_id": user_id}, {"_id": 0}).to_list(10000)

    deposits_total = sum(item["amount"] for item in transactions if item["type"] == "deposit")
    withdrawals_total = sum(
        item["amount"] for item in transactions if item["type"] == "withdrawal"
    )
    settled_bets = [bet for bet in bets if bet["result"] != "pending"]
    net_profit = sum(bet.get("profit_loss", 0.0) for bet in settled_bets)
    total_staked = sum(bet.get("stake", 0.0) for bet in settled_bets)
    bankroll_current = (deposits_total - withdrawals_total) + net_profit

    wins = len([bet for bet in settled_bets if bet["result"] == "won"])
    settled_count = len(settled_bets)
    win_rate = (wins / settled_count * 100) if settled_count else 0.0
    hit_rate = win_rate
    base_roi = deposits_total - withdrawals_total
    roi_total = (net_profit / base_roi * 100) if base_roi > 0 else 0.0
    yield_total = (net_profit / total_staked * 100) if total_staked > 0 else 0.0

    bookmaker_map = {item["id"]: item["name"] for item in bookmakers}
    strategy_map = {item["id"]: item["name"] for item in strategies}

    profit_by_strategy_map: Dict[str, float] = defaultdict(float)
    profit_by_bookmaker_map: Dict[str, float] = defaultdict(float)
    profit_by_sport_map: Dict[str, float] = defaultdict(float)
    month_change_map: Dict[str, float] = defaultdict(float)

    for txn in transactions:
        month_key = parse_iso_safe(txn.get("date")).strftime("%Y-%m")
        if txn["type"] == "deposit":
            month_change_map[month_key] += txn["amount"]
        else:
            month_change_map[month_key] -= txn["amount"]

    for bet in settled_bets:
        strategy_name = bet.get("strategy_name") or strategy_map.get(
            bet.get("strategy_id") or "", "Sem estratégia"
        )
        bookmaker_name = bookmaker_map.get(bet["bookmaker_id"], "Não informado")
        sport_name = bet.get("sport", "Não informado")
        profit = float(bet.get("profit_loss", 0.0))

        profit_by_strategy_map[strategy_name] += profit
        profit_by_bookmaker_map[bookmaker_name] += profit
        profit_by_sport_map[sport_name] += profit

        settlement_date = bet.get("settled_at") or bet.get("placed_at")
        month_key = parse_iso_safe(settlement_date).strftime("%Y-%m")
        month_change_map[month_key] += profit

    cumulative = 0.0
    growth_curve = []
    for month in sorted(month_change_map.keys()):
        cumulative += month_change_map[month]
        growth_curve.append({"month": month, "bankroll": round(cumulative, 2)})

    recent_bets = sorted(
        bets,
        key=lambda item: item.get("placed_at", ""),
        reverse=True,
    )[:8]

    return DashboardSummary(
        bankroll_current=round(bankroll_current, 2),
        deposits_total=round(deposits_total, 2),
        withdrawals_total=round(withdrawals_total, 2),
        net_profit=round(net_profit, 2),
        roi_total=round(roi_total, 2),
        yield_total=round(yield_total, 2),
        win_rate=round(win_rate, 2),
        hit_rate=round(hit_rate, 2),
        total_bets=len(bets),
        settled_bets=settled_count,
        profit_by_strategy=[
            {"name": key, "profit": round(value, 2)}
            for key, value in profit_by_strategy_map.items()
        ],
        profit_by_bookmaker=[
            {"name": key, "profit": round(value, 2)}
            for key, value in profit_by_bookmaker_map.items()
        ],
        profit_by_sport=[
            {"name": key, "profit": round(value, 2)}
            for key, value in profit_by_sport_map.items()
        ],
        growth_curve=growth_curve,
        recent_bets=recent_bets,
    )


@api_router.get("/")
async def root():
    return {"message": "BetOps API online"}


@api_router.post("/auth/register", response_model=TokenResponse)
async def register(payload: UserCreate):
    exists = await db.users.find_one({"email": payload.email}, {"_id": 0, "id": 1})
    if exists:
        raise HTTPException(status_code=409, detail="Email já cadastrado")

    now = now_iso()
    user_doc = {
        "id": str(uuid.uuid4()),
        "full_name": payload.full_name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "created_at": now,
    }
    await db.users.insert_one(user_doc)
    await seed_defaults_for_user(user_doc["id"])

    token = create_access_token(user_doc["id"], user_doc["email"])
    user_public = UserPublic(
        id=user_doc["id"],
        full_name=user_doc["full_name"],
        email=user_doc["email"],
        created_at=user_doc["created_at"],
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_public)


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_access_token(user["id"], user["email"])
    user_public = UserPublic(
        id=user["id"],
        full_name=user["full_name"],
        email=user["email"],
        created_at=user["created_at"],
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_public)


@api_router.get("/auth/me", response_model=UserPublic)
async def me(current_user: UserPublic = Depends(get_current_user)):
    return current_user


@api_router.get("/bookmakers", response_model=List[Bookmaker])
async def list_bookmakers(current_user: UserPublic = Depends(get_current_user)):
    rows = await db.bookmakers.find({"user_id": current_user.id}, {"_id": 0}).to_list(3000)
    return sorted(rows, key=lambda item: item["name"])


@api_router.post("/bookmakers", response_model=Bookmaker)
async def create_bookmaker(
    payload: BookmakerCreate, current_user: UserPublic = Depends(get_current_user)
):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "name": payload.name.strip(),
        "balance": float(payload.balance),
        "is_default": False,
        "created_at": now_iso(),
    }
    await db.bookmakers.insert_one(doc)
    return Bookmaker(**doc)


@api_router.get("/strategies", response_model=List[Strategy])
async def list_strategies(current_user: UserPublic = Depends(get_current_user)):
    rows = await db.strategies.find({"user_id": current_user.id}, {"_id": 0}).to_list(500)
    return sorted(rows, key=lambda item: item["name"])


@api_router.post("/strategies", response_model=Strategy)
async def create_strategy(
    payload: StrategyCreate, current_user: UserPublic = Depends(get_current_user)
):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "name": payload.name.strip(),
        "description": payload.description.strip(),
        "target_roi": float(payload.target_roi),
        "created_at": now_iso(),
    }
    await db.strategies.insert_one(doc)
    return Strategy(**doc)


@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions(current_user: UserPublic = Depends(get_current_user)):
    rows = await db.transactions.find({"user_id": current_user.id}, {"_id": 0}).to_list(5000)
    return sorted(rows, key=lambda item: item["date"], reverse=True)


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(
    payload: TransactionCreate, current_user: UserPublic = Depends(get_current_user)
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")
    await validate_bookmaker_ownership(current_user.id, payload.bookmaker_id)

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "bookmaker_id": payload.bookmaker_id,
        "type": payload.type,
        "amount": float(payload.amount),
        "date": payload.date or now_iso(),
        "notes": payload.notes.strip(),
    }
    await db.transactions.insert_one(doc)
    await recalculate_bookmaker_balance(current_user.id, payload.bookmaker_id)
    return Transaction(**doc)


@api_router.get("/bets", response_model=List[Bet])
async def list_bets(current_user: UserPublic = Depends(get_current_user)):
    rows = await db.bets.find({"user_id": current_user.id}, {"_id": 0}).to_list(5000)
    return sorted(rows, key=lambda item: item["placed_at"], reverse=True)


@api_router.post("/bets", response_model=Bet)
async def create_bet(payload: BetCreate, current_user: UserPublic = Depends(get_current_user)):
    if payload.odds <= 1:
        raise HTTPException(status_code=400, detail="Odds deve ser maior que 1")
    if payload.stake < 0:
        raise HTTPException(status_code=400, detail="Stake não pode ser negativa")
    await validate_bookmaker_ownership(current_user.id, payload.bookmaker_id)

    strategy_name = payload.strategy_name or "Sem estratégia"
    if payload.strategy_id:
        strategy = await db.strategies.find_one(
            {"id": payload.strategy_id, "user_id": current_user.id},
            {"_id": 0, "name": 1},
        )
        if strategy:
            strategy_name = strategy["name"]

    profit_loss = calculate_bet_profit(payload)
    settled_at = now_iso() if payload.result != "pending" else None

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "bookmaker_id": payload.bookmaker_id,
        "event": payload.event.strip(),
        "market": payload.market.strip(),
        "sport": payload.sport.strip(),
        "odds": float(payload.odds),
        "stake": float(payload.stake),
        "strategy_id": payload.strategy_id,
        "strategy_name": strategy_name,
        "bet_type": payload.bet_type,
        "result": payload.result,
        "return_amount": payload.return_amount,
        "freebet_stake_returned": payload.freebet_stake_returned,
        "profit_loss": float(round(profit_loss, 2)),
        "placed_at": now_iso(),
        "settled_at": settled_at,
        "notes": payload.notes.strip(),
    }

    await db.bets.insert_one(doc)
    await recalculate_bookmaker_balance(current_user.id, payload.bookmaker_id)
    return Bet(**doc)


@api_router.post("/calculators/arbitrage")
async def calculate_arbitrage(payload: ArbitrageRequest):
    if payload.odd_a <= 1 or payload.odd_b <= 1:
        raise HTTPException(status_code=400, detail="Odds devem ser maiores que 1")
    if payload.banca_total <= 0:
        raise HTTPException(status_code=400, detail="Banca deve ser maior que zero")

    denominator = (1 / payload.odd_a) + (1 / payload.odd_b)
    stake_a = (payload.banca_total / payload.odd_a) / denominator
    stake_b = (payload.banca_total / payload.odd_b) / denominator
    total_stake = stake_a + stake_b
    guaranteed_return = stake_a * payload.odd_a
    guaranteed_profit = guaranteed_return - total_stake
    roi = (guaranteed_profit / total_stake * 100) if total_stake > 0 else 0.0

    return {
        "stake_lado_a": round(stake_a, 2),
        "stake_lado_b": round(stake_b, 2),
        "retorno_garantido": round(guaranteed_return, 2),
        "lucro_garantido": round(guaranteed_profit, 2),
        "roi_arbitragem": round(roi, 2),
    }


def freebet_profit(mode: str, freebet_amount: float, back_odd: float, lay_odd: float, commission: float):
    if mode == "snr":
        lay_stake = (freebet_amount * (back_odd - 1)) / (lay_odd - commission)
        profit_if_back_wins = (freebet_amount * (back_odd - 1)) - (lay_stake * (lay_odd - 1))
        profit_if_lay_wins = lay_stake * (1 - commission)
    else:
        lay_stake = (freebet_amount * back_odd) / (lay_odd - commission)
        profit_if_back_wins = (freebet_amount * (back_odd - 1)) - (lay_stake * (lay_odd - 1))
        profit_if_lay_wins = (lay_stake * (1 - commission)) - freebet_amount
    expected = min(profit_if_back_wins, profit_if_lay_wins)
    return lay_stake, profit_if_back_wins, profit_if_lay_wins, expected


@api_router.post("/calculators/freebet")
async def calculate_freebet(payload: FreebetRequest):
    if payload.freebet_amount <= 0:
        raise HTTPException(status_code=400, detail="Freebet deve ser maior que zero")
    if payload.back_odd <= 1 or payload.lay_odd <= 1:
        raise HTTPException(status_code=400, detail="Odds devem ser maiores que 1")
    if payload.commission < 0 or payload.commission >= 1:
        raise HTTPException(status_code=400, detail="Comissão inválida")

    lay_stake, back_profit, lay_profit, expected_profit = freebet_profit(
        payload.mode,
        payload.freebet_amount,
        payload.back_odd,
        payload.lay_odd,
        payload.commission,
    )

    best_odd = payload.back_odd
    best_profit = expected_profit
    if payload.candidate_back_odds:
        for candidate in payload.candidate_back_odds:
            if candidate > 1:
                _, _, _, candidate_profit = freebet_profit(
                    payload.mode,
                    payload.freebet_amount,
                    candidate,
                    payload.lay_odd,
                    payload.commission,
                )
                if candidate_profit > best_profit:
                    best_profit = candidate_profit
                    best_odd = candidate

    extraction_rate = (
        (expected_profit / payload.freebet_amount) * 100 if payload.freebet_amount > 0 else 0.0
    )

    return {
        "modo": payload.mode,
        "stake_hedge": round(lay_stake, 2),
        "lucro_se_back": round(back_profit, 2),
        "lucro_se_lay": round(lay_profit, 2),
        "lucro_esperado": round(expected_profit, 2),
        "melhor_odd": round(best_odd, 2),
        "taxa_extracao": round(extraction_rate, 2),
    }


@api_router.get("/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(current_user: UserPublic = Depends(get_current_user)):
    return await build_dashboard_data(current_user.id)


@api_router.get("/reports/monthly")
async def monthly_report(current_user: UserPublic = Depends(get_current_user)):
    summary = await build_dashboard_data(current_user.id)
    monthly = []
    previous = 0.0
    for point in summary.growth_curve:
        monthly.append(
            {
                "month": point["month"],
                "bankroll": point["bankroll"],
                "delta": round(point["bankroll"] - previous, 2),
            }
        )
        previous = point["bankroll"]
    return monthly


@api_router.get("/reports/by-strategy")
async def strategy_report(current_user: UserPublic = Depends(get_current_user)):
    summary = await build_dashboard_data(current_user.id)
    return sorted(summary.profit_by_strategy, key=lambda item: item["profit"], reverse=True)


@api_router.get("/reports/by-bookmaker")
async def bookmaker_report(current_user: UserPublic = Depends(get_current_user)):
    summary = await build_dashboard_data(current_user.id)
    return sorted(summary.profit_by_bookmaker, key=lambda item: item["profit"], reverse=True)


@api_router.get("/reports/odds-performance")
async def odds_performance(current_user: UserPublic = Depends(get_current_user)):
    bets = await db.bets.find(
        {"user_id": current_user.id, "result": {"$ne": "pending"}},
        {"_id": 0, "odds": 1, "stake": 1, "profit_loss": 1},
    ).to_list(10000)

    buckets = {
        "1.01-1.49": {"count": 0, "stake": 0.0, "profit": 0.0},
        "1.50-1.99": {"count": 0, "stake": 0.0, "profit": 0.0},
        "2.00-2.99": {"count": 0, "stake": 0.0, "profit": 0.0},
        "3.00+": {"count": 0, "stake": 0.0, "profit": 0.0},
    }

    for bet in bets:
        odd = bet.get("odds", 0)
        if odd < 1.5:
            bucket = "1.01-1.49"
        elif odd < 2.0:
            bucket = "1.50-1.99"
        elif odd < 3.0:
            bucket = "2.00-2.99"
        else:
            bucket = "3.00+"

        buckets[bucket]["count"] += 1
        buckets[bucket]["stake"] += float(bet.get("stake", 0.0))
        buckets[bucket]["profit"] += float(bet.get("profit_loss", 0.0))

    report = []
    for key, value in buckets.items():
        yield_bucket = (value["profit"] / value["stake"] * 100) if value["stake"] > 0 else 0.0
        report.append(
            {
                "range": key,
                "count": value["count"],
                "stake": round(value["stake"], 2),
                "profit": round(value["profit"], 2),
                "yield": round(yield_bucket, 2),
            }
        )
    return report


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ["CORS_ORIGINS"].split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()