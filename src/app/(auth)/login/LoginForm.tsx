"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useSessionStore } from "@/store/session";
import toast from "react-hot-toast";

export default function LoginForm() {
  const router = useRouter();
  const setSessao = useSessionStore((state) => state.setSessao);
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!login.trim() || !senha) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), senha }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Credenciais inválidas.");
        return;
      }

      setSessao(data.sessao);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next ?? "/dashboard");
    } catch {
      toast.error("Não foi possível conectar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#eef2f7] px-4">
      <div className="w-full max-w-[320px]">
        <p className="mb-6 text-center text-lg font-extrabold text-[#1f2d3a]">
          SAG <span className="font-semibold text-[#8ea0b0]">(Bloquin)</span>
        </p>

        <form onSubmit={handleLogin} className="space-y-3 rounded-lg border border-[#e3ebf1] bg-white p-6 shadow-card">
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Usuário"
            autoComplete="username"
            autoFocus
            className="h-10 w-full rounded border border-[#d4e1e9] px-3 text-sm text-[#1f2d3a] outline-none transition placeholder:text-[#8ea0b0] focus:border-[#23638c] focus:ring-2 focus:ring-[#23638c]/15"
          />

          <div className="relative">
            <input
              type={senhaVisivel ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              className="h-10 w-full rounded border border-[#d4e1e9] px-3 pr-9 text-sm text-[#1f2d3a] outline-none transition placeholder:text-[#8ea0b0] focus:border-[#23638c] focus:ring-2 focus:ring-[#23638c]/15"
            />
            <button
              type="button"
              onClick={() => setSenhaVisivel((v) => !v)}
              aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8ea0b0] hover:text-[#45566a]"
            >
              {senhaVisivel ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !login.trim() || !senha}
            className="flex h-10 w-full items-center justify-center gap-2 rounded bg-[#23638c] text-sm font-bold text-white transition hover:bg-[#1a4b6b] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
