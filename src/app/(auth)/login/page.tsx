"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useSessionStore } from "@/store/session";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const setSessao = useSessionStore((s) => s.setSessao);

  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!login.trim() || !senha) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Credenciais inválidas.");
        return;
      }

      setSessao(data.sessao);

      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next ?? "/escolas");
    } catch {
      toast.error("Erro de conexão. Verifique a rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — identidade visual */}
      <div className="hidden md:flex w-80 flex-col items-center justify-center gap-6 px-10"
        style={{ background: "linear-gradient(to bottom right, #1a202c, #2d3748)" }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-bold text-blue-300"
            style={{ background: "#2c5282" }}>
            OA
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">SAG</h1>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed">
            Painel de gestão escolar<br />para o Bloquin IDE
          </p>
        </div>
        <div className="w-16 h-px bg-gray-600" />
        <p className="text-xs text-gray-600">v2.0 — Web</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm">
          {/* Mobile: logo pequena */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-blue-300"
              style={{ background: "#2c5282" }}>OA</div>
            <span className="font-bold text-gray-800">SAG</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h2>
          <p className="mt-1 text-sm text-gray-500">Entre com suas credenciais</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {/* Usuário */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Usuário
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Login ou e-mail"
                autoFocus
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm
                  bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  placeholder-gray-400 transition"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={senhaVisivel ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg text-sm
                    bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    placeholder-gray-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                    hover:text-gray-600 transition p-1"
                >
                  {senhaVisivel ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                text-white font-semibold rounded-lg text-sm transition flex items-center
                justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Verificando..." : "Entrar no Sistema"}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-gray-400">
            Plataforma SAG
          </p>
        </div>
      </div>
    </div>
  );
}
