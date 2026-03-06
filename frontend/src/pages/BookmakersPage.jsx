import { useEffect, useMemo, useState } from "react";
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

export default function BookmakersPage() {
  const [bookmakers, setBookmakers] = useState([]);
  const [search, setSearch] = useState("");
  const [newBookmaker, setNewBookmaker] = useState("");

  const loadBookmakers = async () => {
    const response = await api.get("/bookmakers");
    setBookmakers(response.data);
  };

  useEffect(() => {
    loadBookmakers();
  }, []);

  const filteredBookmakers = useMemo(
    () => bookmakers.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [bookmakers, search],
  );

  const createBookmaker = async (event) => {
    event.preventDefault();
    if (!newBookmaker.trim()) return;
    try {
      await api.post("/bookmakers", { name: newBookmaker.trim(), balance: 0 });
      setNewBookmaker("");
      await loadBookmakers();
      toast.success("Casa adicionada com sucesso");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Erro ao adicionar casa");
    }
  };

  return (
    <div className="space-y-6" data-testid="bookmakers-page">
      <section className="panel p-5" data-testid="bookmakers-controls-panel">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar casa de apostas"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="bookmakers-search-input"
          />
        </div>
        <form className="mt-4 flex flex-wrap gap-3" onSubmit={createBookmaker} data-testid="create-bookmaker-form">
          <Input
            placeholder="Nova casa personalizada"
            value={newBookmaker}
            onChange={(event) => setNewBookmaker(event.target.value)}
            data-testid="new-bookmaker-input"
          />
          <Button type="submit" data-testid="create-bookmaker-button">
            Adicionar Casa
          </Button>
        </form>
      </section>

      <section className="panel p-5" data-testid="bookmakers-table-panel">
        <h3 className="text-2xl uppercase">Casas cadastradas ({filteredBookmakers.length})</h3>
        <Table className="mt-4" data-testid="bookmakers-table">
          <TableHeader>
            <TableRow>
              <TableHead>Casa</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookmakers.map((item) => (
              <TableRow key={item.id} data-testid={`bookmaker-row-${item.id}`}>
                <TableCell data-testid={`bookmaker-name-${item.id}`}>{item.name}</TableCell>
                <TableCell className="metric-value" data-testid={`bookmaker-balance-${item.id}`}>
                  R$ {item.balance.toFixed(2)}
                </TableCell>
                <TableCell>{item.is_default ? "Padrão" : "Manual"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
