import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { ChartFrame } from "@/components/ChartFrame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ReportsPage() {
  const [monthly, setMonthly] = useState([]);
  const [strategy, setStrategy] = useState([]);
  const [bookmaker, setBookmaker] = useState([]);
  const [odds, setOdds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [monthlyRes, strategyRes, bookmakerRes, oddsRes] = await Promise.all([
          api.get("/reports/monthly"),
          api.get("/reports/by-strategy"),
          api.get("/reports/by-bookmaker"),
          api.get("/reports/odds-performance"),
        ]);
        setMonthly(monthlyRes.data);
        setStrategy(strategyRes.data);
        setBookmaker(bookmakerRes.data);
        setOdds(oddsRes.data);
      } catch {
        toast.error("Falha ao carregar relatórios");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="space-y-6" data-testid="reports-page">
      <section className="panel p-5" data-testid="monthly-report-panel">
        <h3 className="text-2xl uppercase">Lucro mensal</h3>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-500" data-testid="reports-loading-state">
            Carregando relatórios...
          </p>
        ) : monthly.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500" data-testid="monthly-report-empty-state">
            Sem dados mensais até o momento.
          </p>
        ) : (
          <ChartFrame testId="monthly-report-chart" className="mt-4" height={288}>
            {({ width, height }) => (
              <BarChart width={width} height={height} data={monthly}>
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip />
                <Bar dataKey="delta" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ChartFrame>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2" data-testid="reports-tables-grid">
        <article className="panel p-5" data-testid="strategy-report-panel">
          <h3 className="text-2xl uppercase">Lucro por estratégia</h3>
          <Table className="mt-4" data-testid="strategy-report-table">
            <TableHeader>
              <TableRow>
                <TableHead>Estratégia</TableHead>
                <TableHead>Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strategy.length > 0 ? (
                strategy.map((item) => (
                  <TableRow key={item.name} data-testid={`strategy-report-row-${item.name}`}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className={item.profit >= 0 ? "metric-value text-green-400" : "metric-value text-red-400"}>
                      R$ {item.profit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow data-testid="strategy-report-empty-row">
                  <TableCell colSpan={2} className="text-zinc-500">
                    Sem dados de estratégia.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </article>

        <article className="panel p-5" data-testid="bookmaker-report-panel">
          <h3 className="text-2xl uppercase">Lucro por casa</h3>
          <Table className="mt-4" data-testid="bookmaker-report-table">
            <TableHeader>
              <TableRow>
                <TableHead>Casa</TableHead>
                <TableHead>Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookmaker.length > 0 ? (
                bookmaker.map((item) => (
                  <TableRow key={item.name} data-testid={`bookmaker-report-row-${item.name}`}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className={item.profit >= 0 ? "metric-value text-green-400" : "metric-value text-red-400"}>
                      R$ {item.profit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow data-testid="bookmaker-report-empty-row">
                  <TableCell colSpan={2} className="text-zinc-500">
                    Sem dados por casa.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </article>
      </section>

      <section className="panel p-5" data-testid="odds-performance-panel">
        <h3 className="text-2xl uppercase">Performance por faixa de odds</h3>
        <Table className="mt-4" data-testid="odds-performance-table">
          <TableHeader>
            <TableRow>
              <TableHead>Faixa</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Stake</TableHead>
              <TableHead>Lucro</TableHead>
              <TableHead>Yield</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {odds.length > 0 ? (
              odds.map((item) => (
                <TableRow key={item.range} data-testid={`odds-range-row-${item.range}`}>
                  <TableCell>{item.range}</TableCell>
                  <TableCell className="metric-value">{item.count}</TableCell>
                  <TableCell className="metric-value">R$ {item.stake.toFixed(2)}</TableCell>
                  <TableCell className={item.profit >= 0 ? "metric-value text-green-400" : "metric-value text-red-400"}>
                    R$ {item.profit.toFixed(2)}
                  </TableCell>
                  <TableCell className={item.yield >= 0 ? "metric-value text-green-400" : "metric-value text-red-400"}>
                    {item.yield.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow data-testid="odds-report-empty-row">
                <TableCell colSpan={5} className="text-zinc-500">
                  Sem dados de performance por odds.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
