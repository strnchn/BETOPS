import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function ArbitragePage() {
  const [bookmakers, setBookmakers] = useState([]);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    odd_a: "2.10",
    odd_b: "2.08",
    banca_total: "1000",
    bookmaker_id: "",
    event: "Arbitragem Operacional",
  });

  useEffect(() => {
    api.get("/bookmakers").then((response) => {
      setBookmakers(response.data);
      if (response.data.length) {
        setForm((prev) => ({ ...prev, bookmaker_id: response.data[0].id }));
      }
    });
  }, []);

  const calculate = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post("/calculators/arbitrage", {
        odd_a: Number(form.odd_a),
        odd_b: Number(form.odd_b),
        banca_total: Number(form.banca_total),
      });
      setResult(response.data);
      toast.success("Arbitragem calculada");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Erro no cálculo");
    }
  };

  const registerArbitrage = async () => {
    if (!result) return;
    const stakeTotal = result.stake_lado_a + result.stake_lado_b;
    const syntheticOdd = result.retorno_garantido / stakeTotal;

    try {
      await api.post("/bets", {
        bookmaker_id: form.bookmaker_id,
        event: form.event,
        market: "Arbitragem 2-way",
        sport: "Trading",
        odds: Number(syntheticOdd.toFixed(4)),
        stake: Number(stakeTotal.toFixed(2)),
        strategy_name: "Arbitragem",
        bet_type: "arbitragem",
        result: "won",
        return_amount: Number(result.retorno_garantido.toFixed(2)),
        notes: `A:${form.odd_a} B:${form.odd_b}`,
      });
      toast.success("Arbitragem registrada no histórico");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Erro ao registrar arbitragem");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="arbitrage-page">
      <form className="panel grid gap-3 p-5" onSubmit={calculate} data-testid="arbitrage-form">
        <h3 className="text-2xl uppercase">Calculadora de Arbitragem</h3>
        <Input
          type="number"
          step="0.01"
          min="1"
          value={form.odd_a}
          onChange={(event) => setForm((prev) => ({ ...prev, odd_a: event.target.value }))}
          placeholder="Odd lado A"
          data-testid="arbitrage-odd-a-input"
        />
        <Input
          type="number"
          step="0.01"
          min="1"
          value={form.odd_b}
          onChange={(event) => setForm((prev) => ({ ...prev, odd_b: event.target.value }))}
          placeholder="Odd lado B"
          data-testid="arbitrage-odd-b-input"
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          value={form.banca_total}
          onChange={(event) => setForm((prev) => ({ ...prev, banca_total: event.target.value }))}
          placeholder="Banca alocada"
          data-testid="arbitrage-bankroll-input"
        />
        <Button type="submit" data-testid="arbitrage-calculate-button">
          Calcular stakes ideais
        </Button>
      </form>

      <section className="panel p-5" data-testid="arbitrage-results-panel">
        <h3 className="text-2xl uppercase">Resultado da Arbitragem</h3>

        {result ? (
          <div className="mt-4 grid gap-3">
            <p className="metric-value text-lg" data-testid="arbitrage-stake-a">
              Stake lado A: R$ {result.stake_lado_a.toFixed(2)}
            </p>
            <p className="metric-value text-lg" data-testid="arbitrage-stake-b">
              Stake lado B: R$ {result.stake_lado_b.toFixed(2)}
            </p>
            <p className="metric-value text-lg text-green-400" data-testid="arbitrage-profit-guaranteed">
              Lucro garantido: R$ {result.lucro_garantido.toFixed(2)}
            </p>
            <p className="metric-value text-lg" data-testid="arbitrage-roi">
              ROI da arbitragem: {result.roi_arbitragem.toFixed(2)}%
            </p>

            <Input
              value={form.event}
              onChange={(event) => setForm((prev) => ({ ...prev, event: event.target.value }))}
              placeholder="Nome do evento"
              data-testid="arbitrage-event-input"
            />
            <select
              className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
              value={form.bookmaker_id}
              onChange={(event) => setForm((prev) => ({ ...prev, bookmaker_id: event.target.value }))}
              data-testid="arbitrage-bookmaker-select"
            >
              {bookmakers.map((bookmaker) => (
                <option key={bookmaker.id} value={bookmaker.id}>
                  {bookmaker.name}
                </option>
              ))}
            </select>

            <Button onClick={registerArbitrage} data-testid="arbitrage-register-button">
              Registrar arbitragem no histórico
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500" data-testid="arbitrage-empty-state">
            Preencha as odds para calcular stake, lucro garantido e ROI.
          </p>
        )}
      </section>
    </div>
  );
}
