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

export default function TransactionsPage() {
  const [bookmakers, setBookmakers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingBookmakers, setIsLoadingBookmakers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ bookmaker_id: "", type: "deposit", amount: "", notes: "" });

  const loadData = async () => {
    setIsLoadingBookmakers(true);
    try {
      const [bookmakersRes, transactionsRes] = await Promise.all([
        api.get("/bookmakers"),
        api.get("/transactions"),
      ]);
      setBookmakers(bookmakersRes.data);
      setTransactions(transactionsRes.data);
      const firstBookmakerId = bookmakersRes.data[0]?.id || "";

      setForm((prev) => ({
        ...prev,
        bookmaker_id: bookmakersRes.data.some((bookmaker) => bookmaker.id === prev.bookmaker_id)
          ? prev.bookmaker_id
          : firstBookmakerId,
      }));
    } catch {
      toast.error("Falha ao carregar movimentações");
    } finally {
      setIsLoadingBookmakers(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoadingBookmakers) {
      toast.error("Aguarde o carregamento das casas");
      return;
    }
    if (!form.bookmaker_id) {
      toast.error("Selecione uma casa de apostas válida");
      return;
    }
    if (Number(form.amount) <= 0) {
      toast.error("Informe um valor maior que zero");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/transactions", {
        ...form,
        amount: Number(form.amount),
      });
      setForm((prev) => ({ ...prev, amount: "", notes: "" }));
      await loadData();
      toast.success("Movimentação registrada");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Erro ao registrar movimentação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !isLoadingBookmakers && Boolean(form.bookmaker_id) && Number(form.amount) > 0;

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <form className="panel grid gap-4 p-5 md:grid-cols-5" onSubmit={handleSubmit} data-testid="transaction-form">
        <select
          className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
          value={form.bookmaker_id}
          onChange={(event) => setForm((prev) => ({ ...prev, bookmaker_id: event.target.value }))}
          disabled={isLoadingBookmakers || bookmakers.length === 0}
          data-testid="transaction-bookmaker-select"
        >
          <option value="" disabled>
            {isLoadingBookmakers ? "Carregando casas..." : "Selecione uma casa"}
          </option>
          {bookmakers.map((bookmaker) => (
            <option key={bookmaker.id} value={bookmaker.id}>
              {bookmaker.name}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-zinc-950 px-3 text-sm"
          value={form.type}
          onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          data-testid="transaction-type-select"
        >
          <option value="deposit">Depósito</option>
          <option value="withdrawal">Saque</option>
        </select>

        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Valor"
          value={form.amount}
          onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          data-testid="transaction-amount-input"
        />

        <Input
          placeholder="Observação"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          data-testid="transaction-notes-input"
        />

        <Button type="submit" disabled={!canSubmit || isSubmitting} data-testid="transaction-submit-button">
          {isSubmitting ? "Registrando..." : "Registrar"}
        </Button>
      </form>

      {bookmakers.length === 0 && !isLoadingBookmakers && (
        <p className="text-sm text-yellow-500" data-testid="transaction-bookmaker-empty-warning">
          Nenhuma casa disponível para movimentação.
        </p>
      )}

      <section className="panel p-5" data-testid="transactions-table-panel">
        <h3 className="text-2xl uppercase">Histórico de depósitos e saques</h3>
        <Table className="mt-4" data-testid="transactions-table">
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Casa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.slice(0, 50).map((item) => (
              <TableRow key={item.id} data-testid={`transaction-row-${item.id}`}>
                <TableCell>{new Date(item.date).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{bookmakers.find((bookmaker) => bookmaker.id === item.bookmaker_id)?.name || "-"}</TableCell>
                <TableCell>{item.type === "deposit" ? "Depósito" : "Saque"}</TableCell>
                <TableCell className={item.type === "deposit" ? "metric-value text-green-400" : "metric-value text-red-400"}>
                  R$ {item.amount.toFixed(2)}
                </TableCell>
                <TableCell>{item.notes || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
