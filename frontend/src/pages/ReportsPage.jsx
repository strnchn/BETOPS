import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
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

  useEffect(() => {
    Promise.all([
      api.get("/reports/monthly"),
      api.get("/reports/by-strategy"),
      api.get("/reports/by-bookmaker"),
      api.get("/reports/odds-performance"),
    ]).then(([monthlyRes, strategyRes, bookmakerRes, oddsRes]) => {
      setMonthly(monthlyRes.data);
      setStrategy(strategyRes.data);
      setBookmaker(bookmakerRes.data);
      setOdds(oddsRes.data);
    });
  }, []);

  return (
    <div className="space-y-6" data-testid="reports-page">
      <section className="panel p-5" data-testid="monthly-report-panel">
        <h3 className="text-2xl uppercase">Lucro mensal</h3>
        <div className="mt-4 h-72" data-testid="monthly-report-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="2 2" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip />
              <Bar dataKey="delta" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
              {strategy.map((item) => (
                <TableRow key={item.name} data-testid={`strategy-report-row-${item.name}`}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className={item.profit >= 0 ? "metric-value text-green-400" : "metric-value text-red-400"}>
                    R$ {item.profit.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
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
              {bookmaker.map((item) => (
                <TableRow key={item.name} data-testid={`bookmaker-report-row-${item.name}`}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className={item.profit >= 0 ? "metric-value text-green-400" : "metric-value text-red-400"}>
                    R$ {item.profit.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
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
            {odds.map((item) => (
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
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
