import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

const loginImage =
  "https://images.unsplash.com/photo-1578344151866-f13ecd6b615a?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate("/");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="auth-page-wrapper">
      <section className="relative hidden lg:block" data-testid="auth-image-section">
        <img
          src={loginImage}
          alt="Trading esportivo"
          className="h-full w-full object-cover object-center"
          data-testid="auth-hero-image"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 to-zinc-950/35" />
      </section>

      <section className="flex items-center justify-center p-6 md:p-12" data-testid="auth-form-section">
        <div className="panel w-full max-w-lg rounded-2xl p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500" data-testid="auth-eyebrow">
            BetOps SaaS
          </p>
          <h1 className="mt-2 text-5xl font-black uppercase text-zinc-100" data-testid="auth-main-title">
            {isRegister ? "Criar Conta" : "Entrar na Plataforma"}
          </h1>
          <p className="mt-3 text-sm text-zinc-400" data-testid="auth-subtitle">
            Controle banca, apostas, arbitragem e freebets em um único painel.
          </p>

          <form className="mt-8 grid gap-4" onSubmit={handleSubmit} data-testid="auth-form">
            {isRegister && (
              <div>
                <label className="mb-2 block text-xs uppercase text-zinc-500" htmlFor="full_name">
                  Nome completo
                </label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Seu nome"
                  data-testid="register-full-name-input"
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-xs uppercase text-zinc-500" htmlFor="email">
                E-mail
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="voce@email.com"
                data-testid="auth-email-input"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase text-zinc-500" htmlFor="password">
                Senha
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="********"
                data-testid="auth-password-input"
              />
            </div>

            <Button type="submit" disabled={loading} data-testid="auth-submit-button">
              {loading ? "Processando..." : isRegister ? "Criar Conta" : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRegister((prev) => !prev)}
              data-testid="auth-toggle-mode-button"
            >
              {isRegister ? "Já tenho conta" : "Ainda não tenho conta"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
