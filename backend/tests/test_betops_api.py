import json
import os
import uuid
from pathlib import Path

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL is required for API tests")
BASE_URL = BASE_URL.rstrip("/")
API_BASE = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api_client():
    """Shared HTTP session for API tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()


@pytest.fixture(scope="session")
def test_user(api_client):
    """Authentication flow (register/login) with unique account"""
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    password = "Test@123456"
    payload = {"full_name": "Test Runner", "email": email, "password": password}

    register = api_client.post(f"{API_BASE}/auth/register", json=payload)
    assert register.status_code == 200, register.text
    reg_data = register.json()
    assert isinstance(reg_data.get("access_token"), str)
    assert reg_data["user"]["email"] == email

    login = api_client.post(
        f"{API_BASE}/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200, login.text
    login_data = login.json()
    assert isinstance(login_data.get("access_token"), str)
    assert login_data["user"]["email"] == email

    return {
        "email": email,
        "password": password,
        "token": login_data["access_token"],
        "user_id": login_data["user"]["id"],
    }


@pytest.fixture(scope="session")
def auth_client(api_client, test_user):
    """Authenticated API session for protected endpoints"""
    api_client.headers.update({"Authorization": f"Bearer {test_user['token']}"})
    return api_client


@pytest.fixture(scope="session")
def default_bookmakers_from_design():
    """Reference list for mandatory default bookmakers"""
    design_path = Path("/app/design_guidelines.json")
    with design_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("bookmakers_list", [])


# Bookmakers module + seed verification

def test_seeded_default_bookmakers_complete(auth_client, default_bookmakers_from_design):
    response = auth_client.get(f"{API_BASE}/bookmakers")
    assert response.status_code == 200, response.text
    bookmakers = response.json()

    names = [item["name"] for item in bookmakers]
    missing = sorted(set(default_bookmakers_from_design) - set(names))

    assert missing == [], f"Missing default bookmakers: {missing}"
    assert len(bookmakers) >= len(default_bookmakers_from_design)
    assert all("id" in item and isinstance(item["id"], str) for item in bookmakers)


# Transactions module (create -> get persistence + balance integrity)

def test_transactions_deposit_withdrawal_and_balance_persistence(auth_client):
    bookmakers_response = auth_client.get(f"{API_BASE}/bookmakers")
    assert bookmakers_response.status_code == 200
    first_bookmaker = bookmakers_response.json()[0]
    bookmaker_id = first_bookmaker["id"]

    deposit_payload = {
        "bookmaker_id": bookmaker_id,
        "type": "deposit",
        "amount": 150.0,
        "notes": "TEST_DEPOSIT",
    }
    deposit = auth_client.post(f"{API_BASE}/transactions", json=deposit_payload)
    assert deposit.status_code == 200, deposit.text
    deposit_data = deposit.json()
    assert deposit_data["type"] == "deposit"
    assert deposit_data["amount"] == 150.0

    withdrawal_payload = {
        "bookmaker_id": bookmaker_id,
        "type": "withdrawal",
        "amount": 40.0,
        "notes": "TEST_WITHDRAWAL",
    }
    withdrawal = auth_client.post(f"{API_BASE}/transactions", json=withdrawal_payload)
    assert withdrawal.status_code == 200, withdrawal.text
    withdrawal_data = withdrawal.json()
    assert withdrawal_data["type"] == "withdrawal"
    assert withdrawal_data["amount"] == 40.0

    tx_list = auth_client.get(f"{API_BASE}/transactions")
    assert tx_list.status_code == 200
    txs = tx_list.json()
    notes = [tx.get("notes") for tx in txs]
    assert "TEST_DEPOSIT" in notes
    assert "TEST_WITHDRAWAL" in notes

    refreshed_bookmakers = auth_client.get(f"{API_BASE}/bookmakers")
    assert refreshed_bookmakers.status_code == 200
    refreshed = next(
        item for item in refreshed_bookmakers.json() if item["id"] == bookmaker_id
    )
    assert refreshed["balance"] >= 110.0


# Bets module (register bet + profit/loss validation)

def test_bet_registration_profit_loss_calculation(auth_client):
    bookmakers = auth_client.get(f"{API_BASE}/bookmakers").json()
    bookmaker_id = bookmakers[0]["id"]

    bet_payload = {
        "bookmaker_id": bookmaker_id,
        "event": "TEST Event",
        "market": "Match Odds",
        "sport": "Football",
        "odds": 2.5,
        "stake": 100.0,
        "bet_type": "simples",
        "result": "won",
        "notes": "TEST_BET_WON",
    }
    created = auth_client.post(f"{API_BASE}/bets", json=bet_payload)
    assert created.status_code == 200, created.text
    bet = created.json()

    assert bet["event"] == "TEST Event"
    assert bet["profit_loss"] == 150.0
    assert bet["result"] == "won"

    all_bets = auth_client.get(f"{API_BASE}/bets")
    assert all_bets.status_code == 200
    bets = all_bets.json()
    found = [item for item in bets if item["id"] == bet["id"]]
    assert len(found) == 1
    assert found[0]["notes"] == "TEST_BET_WON"


# Calculators module (arbitrage + freebet)

def test_arbitrage_calculator_returns_positive_profit(api_client):
    payload = {"odd_a": 2.1, "odd_b": 2.08, "banca_total": 1000}
    response = api_client.post(f"{API_BASE}/calculators/arbitrage", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["stake_lado_a"] > 0
    assert data["stake_lado_b"] > 0
    assert data["lucro_garantido"] > 0
    assert isinstance(data["roi_arbitragem"], float)


def test_freebet_calculator_snr_sr_modes(api_client):
    snr = api_client.post(
        f"{API_BASE}/calculators/freebet",
        json={
            "freebet_amount": 100,
            "back_odd": 5.0,
            "lay_odd": 5.2,
            "commission": 0.02,
            "mode": "snr",
        },
    )
    assert snr.status_code == 200, snr.text
    snr_data = snr.json()
    assert snr_data["modo"] == "snr"
    assert snr_data["stake_hedge"] > 0

    sr = api_client.post(
        f"{API_BASE}/calculators/freebet",
        json={
            "freebet_amount": 100,
            "back_odd": 5.0,
            "lay_odd": 5.2,
            "commission": 0.02,
            "mode": "sr",
        },
    )
    assert sr.status_code == 200, sr.text
    sr_data = sr.json()
    assert sr_data["modo"] == "sr"
    assert sr_data["stake_hedge"] > 0


# Dashboard + reports module

def test_dashboard_summary_and_recent_bets_shape(auth_client):
    response = auth_client.get(f"{API_BASE}/dashboard/summary")
    assert response.status_code == 200, response.text
    data = response.json()

    assert isinstance(data["bankroll_current"], float)
    assert isinstance(data["net_profit"], float)
    assert isinstance(data["recent_bets"], list)
    assert "profit_by_bookmaker" in data


def test_reports_endpoints_basic_render_data(auth_client):
    endpoints = [
        "/reports/monthly",
        "/reports/by-strategy",
        "/reports/by-bookmaker",
        "/reports/odds-performance",
    ]
    for endpoint in endpoints:
        response = auth_client.get(f"{API_BASE}{endpoint}")
        assert response.status_code == 200, f"{endpoint} => {response.status_code}"
        assert isinstance(response.json(), list)
