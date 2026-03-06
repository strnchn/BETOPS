import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { MetricCard } from "@/components/MetricCard";
import { ChartFrame } from "@/components/ChartFrame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get("/dashboard/summary").then((response) => setSummary(response.data));
  }, []);

  if (!summary) {
    return <p data-testid="dashboard-loading">Carregando métricas...</p>;
  }

  const growthData = summary.growth_curve || [];
  const strategyData = summary.profit_by_strategy || [];
  const recentBets = summary.recent_bets || [];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <section className="dashboard-grid" data-testid="dashboard-kpi-grid">
        <div className="lg:col-span-3">
          <MetricCard
            testId="metric-bankroll"
            title="Banca Atual"
            value={`R$ ${summary.bankroll_current.toFixed(2)}`}
            positive={summary.bankroll_current >= 0}
            helper="(depósitos - saques) + lucro líquido"
          />
        </div>
        <div className="lg:col-span-3">
          <MetricCard
            testId="metric-net-profit"
            title="Lucro Líquido"
            value={`R$ ${summary.net_profit.toFixed(2)}`}
            positive={summary.net_profit >= 0}
          />
        </div>
        <div className="lg:col-span-2">
          <MetricCard
            testId="metric-roi"
            title="ROI Total"
            value={`${summary.roi_total.toFixed(2)}%`}
            positive={summary.roi_total >= 0}
          />
        </div>
        <div className="lg:col-span-2">
          <MetricCard
            testId="metric-yield"
            title="Yield"
            value={`${summary.yield_total.toFixed(2)}%`}
            positive={summary.yield_total >= 0}
          />
        </div>
        <div className="lg:col-span-2">
          <MetricCard
            testId="metric-hit-rate"
            title="Taxa de Acerto"
            value={`${summary.hit_rate.toFixed(2)}%`}
            positive={summary.hit_rate >= 50}
            helper={`${summary.settled_bets} apostas liquidadas`}
          />
        </div>
      </section>

      <section className="dashboard-grid" data-testid="dashboard-charts-grid">
        <article className="panel min-w-0 lg:col-span-7 p-5" data-testid="bankroll-growth-card">
          <h3 className="text-2xl uppercase text-zinc-100">Curva de crescimento da banca</h3>
          {growthData.length > 0 ? (
            <ChartFrame testId="bankroll-growth-chart" className="mt-4" height={288}>
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={growthData}>
                  <defs>
                    <linearGradient id="bankrollGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#a1a1aa" />
                  <YAxis stroke="#a1a1aa" />
                  <Tooltip />
                  <Area type="monotone" dataKey="bankroll" stroke="#3b82f6" fill="url(#bankrollGradient)" />
                </AreaChart>
              )}
            </ChartFrame>
          ) : (
            <p className="mt-4 text-sm text-zinc-500" data-testid="bankroll-growth-empty-state">
              Sem histórico suficiente para curva de banca.
            </p>
          )}
        </article>

        <article className="panel min-w-0 lg:col-span-5 p-5" data-testid="strategy-profit-card">
          <h3 className="text-2xl uppercase text-zinc-100">Lucro por estratégia</h3>
          {strategyData.length > 0 ? (
            <ChartFrame testId="strategy-profit-chart" className="mt-4" height={288}>
              {({ width, height }) => (
                <BarChart width={width} height={height} data={strategyData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#a1a1aa" interval={0} angle={-15} textAnchor="end" height={72} />
                  <YAxis stroke="#a1a1aa" />
                  <Tooltip />
                  <Bar dataKey="profit" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ChartFrame>
          ) : (
            <p className="mt-4 text-sm text-zinc-500" data-testid="strategy-profit-empty-state">
              Sem dados de estratégia para exibir.
            </p>
          )}
        </article>
      </section>

      <section className="panel p-5" data-testid="recent-bets-section">
        <h3 className="text-2xl uppercase text-zinc-100">Últimas apostas registradas</h3>
        <Table className="mt-4" data-testid="recent-bets-table">
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Odd</TableHead>
              <TableHead>Stake</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Lucro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentBets.length > 0 ? (
              recentBets.map((bet) => (
                <TableRow key={bet.id} data-testid={`recent-bet-row-${bet.id}`}>
                  <TableCell data-testid={`recent-bet-event-${bet.id}`}>{bet.event}</TableCell>
                  <TableCell>{bet.bet_type}</TableCell>
                  <TableCell className="metric-value">{bet.odds}</TableCell>
                  <TableCell className="metric-value">R$ {bet.stake.toFixed(2)}</TableCell>
                  <TableCell>{bet.result}</TableCell>
                  <TableCell className={bet.profit_loss >= 0 ? "text-green-400 metric-value" : "text-red-400 metric-value"}>
                    R$ {bet.profit_loss.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow data-testid="recent-bets-empty-row">
                <TableCell colSpan={6} className="text-zinc-500">
                  Nenhuma aposta registrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
