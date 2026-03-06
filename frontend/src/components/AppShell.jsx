import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Calculator,
  CircleDollarSign,
  Landmark,
  LogOut,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/bookmakers", label: "Casas", icon: Landmark },
  { to: "/transactions", label: "Movimentações", icon: Wallet },
  { to: "/bets", label: "Apostas", icon: CircleDollarSign },
  { to: "/arbitrage", label: "Arbitragem", icon: Calculator },
  { to: "/freebet", label: "Freebet", icon: ShieldCheck },
  { to: "/reports", label: "Relatórios", icon: BarChart3 },
];

export const AppShell = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen lg:flex" data-testid="app-shell-layout">
      <aside
        className="w-full border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r"
        data-testid="sidebar-container"
      >
        <div className="mb-8">
          <p className="text-xs uppercase text-zinc-500" data-testid="brand-eyebrow">
            BetOps Quant Suite
          </p>
          <h1 className="text-3xl font-black uppercase text-zinc-100" data-testid="brand-title">
            Trading Desk
          </h1>
        </div>

        <nav className="grid gap-2" data-testid="main-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                    isActive
                      ? "border-blue-500 bg-blue-500/15 text-blue-200"
                      : "border-zinc-800 bg-zinc-900/55 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
                  }`
                }
              >
                <span className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/55 p-4" data-testid="user-card">
          <p className="text-xs uppercase text-zinc-500">Operador logado</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100" data-testid="logged-user-email">
            {user?.email}
          </p>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={logout}
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 lg:px-10" data-testid="main-content-area">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4" data-testid="main-header">
          <div>
            <p className="text-xs uppercase text-zinc-500" data-testid="page-route-indicator">
              {pathname}
            </p>
            <h2 className="text-4xl font-extrabold uppercase text-zinc-100" data-testid="page-main-heading">
              Plataforma de Gestão Quantitativa
            </h2>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};
