import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const defaultForm = {
  bookmaker_id: "",
  strategy_id: "",
  event: "",
  market: "",
  sport: "",
  odds: "",
  stake: "",
  bet_type: "simples",
  result: "pending",
  notes: "",
};

export default function BetsPage() {
  const [bookmakers, setBookmakers] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [bets, setBets] = useState([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const loadData = async () => {
    setIsLoadingInitial(true);
    try {
      const [bookmakersRes, strategiesRes, betsRes] = await Promise.all([
        api.get("/bookmakers"),
        api.get("/strategies"),
        api.get("/bets"),
      ]);
      setBookmakers(bookmakersRes.data);
      setStrategies(strategiesRes.data);
      setBets(betsRes.data);

      const firstBookmakerId = bookmakersRes.data[0]?.id || "";
      setForm((prev) => ({
        ...prev,
        bookmaker_id: bookmakersRes.data.some((bookmaker) => bookmaker.id === prev.bookmaker_id)
          ? prev.bookmaker_id
          : firstBookmakerId,
      }));
    } catch {
      toast.error("Falha ao carregar apostas");
    } finally {
      setIsLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitBet = async (event) => {
    event.preventDefault();

    if (isLoadingInitial) {
      toast.error("Aguarde o carregamento das casas");
      return;
    }
    if (!form.bookmaker_id) {
      toast.error("Selecione uma casa de apostas válida");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/bets", {
        ...form,
        strategy_id: form.strategy_id || null,
        odds: Number(form.odds),
        stake: Number(form.stake),
      });
      setForm((prev) => ({ ...defaultForm, bookmaker_id: prev.bookmaker_id }));
      await loadData();
      toast.success("Aposta registrada");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Erro ao registrar aposta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isLoadingInitial &&
    Boolean(form.bookmaker_id) &&
    Boolean(form.event.trim()) &&
    Boolean(form.market.trim()) &&
    Boolean(form.sport.trim()) &&
    Number(form.odds) > 1 &&
    Number(form.stake) >= 0;

  return (
    <div className="space-y-6" data-testid="bets-page">
      <form className="panel grid gap-3 p-5 md:grid-cols-4" onSubmit={submitBet} data-testid="bet-form">
        <select
          className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
          value={form.bookmaker_id}
          onChange={(event) => setForm((prev) => ({ ...prev, bookmaker_id: event.target.value }))}
          disabled={isLoadingInitial || bookmakers.length === 0}
          data-testid="bet-bookmaker-select"
        >
          <option value="" disabled>
            {isLoadingInitial ? "Carregando casas..." : "Selecione uma casa"}
          </option>
          {bookmakers.map((bookmaker) => (
            <option key={bookmaker.id} value={bookmaker.id}>
              {bookmaker.name}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
          value={form.strategy_id}
          onChange={(event) => setForm((prev) => ({ ...prev, strategy_id: event.target.value }))}
          data-testid="bet-strategy-select"
        >
          <option value="">Sem estratégia</option>
          {strategies.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.name}
            </option>
          ))}
        </select>

        <Input
          placeholder="Evento"
          value={form.event}
          onChange={(event) => setForm((prev) => ({ ...prev, event: event.target.value }))}
          required
          data-testid="bet-event-input"
        />
        <Input
          placeholder="Mercado"
          value={form.market}
          onChange={(event) => setForm((prev) => ({ ...prev, market: event.target.value }))}
          required
          data-testid="bet-market-input"
        />
        <Input
          placeholder="Esporte"
          value={form.sport}
          onChange={(event) => setForm((prev) => ({ ...prev, sport: event.target.value }))}
          required
          data-testid="bet-sport-input"
        />
        <Input
          type="number"
          min="1"
          step="0.01"
          placeholder="Odds"
          value={form.odds}
          onChange={(event) => setForm((prev) => ({ ...prev, odds: event.target.value }))}
          required
          data-testid="bet-odds-input"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Stake"
          value={form.stake}
          onChange={(event) => setForm((prev) => ({ ...prev, stake: event.target.value }))}
          required
          data-testid="bet-stake-input"
        />

        <select
          className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
          value={form.bet_type}
          onChange={(event) => setForm((prev) => ({ ...prev, bet_type: event.target.value }))}
          data-testid="bet-type-select"
        >
          <option value="simples">Simples</option>
          <option value="multipla">Múltipla</option>
          <option value="arbitragem">Arbitragem</option>
          <option value="freebet">Freebet</option>
          <option value="dutching">Dutching</option>
          <option value="super_odds">Super Odds</option>
          <option value="duplo_green">Duplo Green</option>
        </select>

        <select
          className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
          value={form.result}
          onChange={(event) => setForm((prev) => ({ ...prev, result: event.target.value }))}
          data-testid="bet-result-select"
        >
          <option value="pending">Pendente</option>
          <option value="won">Win</option>
          <option value="lost">Loss</option>
          <option value="void">Void</option>
          <option value="cashout">Cashout</option>
        </select>

        <Input
          placeholder="Notas"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          data-testid="bet-notes-input"
        />

        <Button
          type="submit"
          className="md:col-span-4"
          disabled={!canSubmit || isSubmitting}
          data-testid="bet-submit-button"
        >
          {isSubmitting ? "Registrando..." : "Registrar aposta"}
        </Button>
      </form>

      {bookmakers.length === 0 && !isLoadingInitial && (
        <p className="text-sm text-yellow-500" data-testid="bet-bookmaker-empty-warning">
          Nenhuma casa disponível para registrar apostas.
        </p>
      )}

      <section className="panel p-5" data-testid="bets-table-panel">
        <h3 className="text-2xl uppercase">Histórico de apostas</h3>
        <Table className="mt-4" data-testid="bets-table">
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Odd</TableHead>
              <TableHead>Stake</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Lucro/Prejuízo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bets.slice(0, 60).map((bet) => (
              <TableRow key={bet.id} data-testid={`bet-row-${bet.id}`}>
                <TableCell>{new Date(bet.placed_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{bet.event}</TableCell>
                <TableCell>{bet.bet_type}</TableCell>
                <TableCell className="metric-value">{bet.odds}</TableCell>
                <TableCell className="metric-value">R$ {bet.stake.toFixed(2)}</TableCell>
                <TableCell>{bet.result}</TableCell>
                <TableCell className={bet.profit_loss >= 0 ? "metric-value text-green-400" : "metric-value text-red-400"}>
                  R$ {bet.profit_loss.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
