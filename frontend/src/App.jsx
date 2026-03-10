import "@/App.css";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import BookmakersPage from "@/pages/BookmakersPage";
import TransactionsPage from "@/pages/TransactionsPage";
import BetsPage from "@/pages/BetsPage";
import ArbitragePage from "@/pages/ArbitragePage";
import FreebetPage from "@/pages/FreebetPage";
import ReportsPage from "@/pages/ReportsPage";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center" data-testid="app-loading-screen">
        <p className="text-zinc-300">Carregando plataforma...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const MainRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="bookmakers" element={<BookmakersPage />} />
      <Route path="transactions" element={<TransactionsPage />} />
      <Route path="bets" element={<BetsPage />} />
      <Route path="arbitrage" element={<ArbitragePage />} />
      <Route path="freebet" element={<FreebetPage />} />
      <Route path="reports" element={<ReportsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainRoutes />
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        toastOptions={{ duration: 2600 }}
      />
    </AuthProvider>
  );
}
