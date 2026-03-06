import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function FreebetPage() {
  const [bookmakers, setBookmakers] = useState([]);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    freebet_amount: "100",
    back_odd: "5.0",
    lay_odd: "5.2",
    commission: "0.02",
    mode: "snr",
    bookmaker_id: "",
    event: "Operação de Freebet",
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
      const response = await api.post("/calculators/freebet", {
        freebet_amount: Number(form.freebet_amount),
        back_odd: Number(form.back_odd),
        lay_odd: Number(form.lay_odd),
        commission: Number(form.commission),
        mode: form.mode,
      });
      setResult(response.data);
      toast.success("Cálculo de freebet concluído");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Erro no cálculo");
    }
  };

  const registerFreebet = async () => {
    if (!result) return;
    try {
      await api.post("/bets", {
        bookmaker_id: form.bookmaker_id,
        event: form.event,
        market: "Freebet",
        sport: "Trading",
        odds: Number(form.back_odd),
        stake: Number(form.freebet_amount),
        strategy_name: "Freebet",
        bet_type: "freebet",
        result: "won",
        freebet_stake_returned: form.mode === "sr",
        notes: `Hedge ${result.stake_hedge} | modo ${result.modo}`,
      });
      toast.success("Freebet registrada no histórico");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Erro ao registrar freebet");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="freebet-page">
      <form className="panel grid gap-3 p-5" onSubmit={calculate} data-testid="freebet-form">
        <h3 className="text-2xl uppercase">Calculadora de Freebet</h3>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={form.freebet_amount}
          onChange={(event) => setForm((prev) => ({ ...prev, freebet_amount: event.target.value }))}
          placeholder="Valor da freebet"
          data-testid="freebet-amount-input"
        />
        <Input
          type="number"
          min="1"
          step="0.01"
          value={form.back_odd}
          onChange={(event) => setForm((prev) => ({ ...prev, back_odd: event.target.value }))}
          placeholder="Odd back"
          data-testid="freebet-back-odd-input"
        />
        <Input
          type="number"
          min="1"
          step="0.01"
          value={form.lay_odd}
          onChange={(event) => setForm((prev) => ({ ...prev, lay_odd: event.target.value }))}
          placeholder="Odd lay"
          data-testid="freebet-lay-odd-input"
        />
        <Input
          type="number"
          min="0"
          max="1"
          step="0.001"
          value={form.commission}
          onChange={(event) => setForm((prev) => ({ ...prev, commission: event.target.value }))}
          placeholder="Comissão (ex: 0.02)"
          data-testid="freebet-commission-input"
        />
        <select
          className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
          value={form.mode}
          onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))}
          data-testid="freebet-mode-select"
        >
          <option value="snr">Stake Not Returned</option>
          <option value="sr">Stake Returned</option>
        </select>
        <Button type="submit" data-testid="freebet-calculate-button">
          Calcular hedge e lucro
        </Button>
      </form>

      <section className="panel p-5" data-testid="freebet-results-panel">
        <h3 className="text-2xl uppercase">Resultado</h3>
        {result ? (
          <div className="mt-4 grid gap-3">
            <p className="metric-value text-lg" data-testid="freebet-hedge-stake">
              Stake hedge: R$ {result.stake_hedge.toFixed(2)}
            </p>
            <p className="metric-value text-lg text-green-400" data-testid="freebet-expected-profit">
              Lucro esperado: R$ {result.lucro_esperado.toFixed(2)}
            </p>
            <p className="metric-value text-lg" data-testid="freebet-best-odd">
              Melhor odd: {result.melhor_odd.toFixed(2)}
            </p>
            <p className="metric-value text-lg" data-testid="freebet-extraction-rate">
              Taxa de extração: {result.taxa_extracao.toFixed(2)}%
            </p>

            <Input
              value={form.event}
              onChange={(event) => setForm((prev) => ({ ...prev, event: event.target.value }))}
              placeholder="Nome do evento"
              data-testid="freebet-event-input"
            />
            <select
              className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
              value={form.bookmaker_id}
              onChange={(event) => setForm((prev) => ({ ...prev, bookmaker_id: event.target.value }))}
              data-testid="freebet-bookmaker-select"
            >
              {bookmakers.map((bookmaker) => (
                <option key={bookmaker.id} value={bookmaker.id}>
                  {bookmaker.name}
                </option>
              ))}
            </select>
            <Button onClick={registerFreebet} data-testid="freebet-register-button">
              Registrar freebet no histórico
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500" data-testid="freebet-empty-state">
            Informe os parâmetros para obter odd ótima, hedge e lucro esperado.
          </p>
        )}
      </section>
    </div>
  );
}
