"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ArrowRight } from "lucide-react";
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
      toast.error("Não foi possível conectar. Verifique sua rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#eef2f7] lg:flex">
      <aside className="hidden min-h-dvh bg-[#233f5c] text-white lg:flex lg:w-[390px] lg:flex-col">
        <div className="border-b border-[#365570] px-10 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#e8f1f6] text-xs font-black text-[#233f5c]">SAG</div>
            <div>
              <p className="text-base font-bold">SAG</p>
              <p className="text-xs text-slate-300">Sistema de Acompanhamento e Gestão</p>
            </div>
          </div>
        </div>

        <div className="my-auto px-10 py-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-200">Acesso institucional</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">Gestão escolar</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Ambiente para administração de escolas, turmas, alunos, professores e rotinas pedagógicas.
          </p>
          <div className="mt-10 border-t border-[#365570] pt-5 text-xs leading-relaxed text-slate-400">
            <p>Utilize as credenciais fornecidas pela administração.</p>
            <p className="mt-2">Em caso de dificuldade, procure o responsável pelo sistema.</p>
          </div>
        </div>

        <div className="border-t border-[#365570] px-10 py-5 text-xs text-slate-400">SAG · Bloquin</div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#233f5c] text-[11px] font-black text-white">SAG</div>
            <div><p className="text-sm font-bold text-slate-900">SAG</p><p className="text-xs text-slate-500">Sistema institucional</p></div>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#23638c]">Área restrita</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Acesso ao sistema</h2>
              <p className="mt-2 text-sm text-slate-500">Informe seus dados para continuar.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 px-6 py-6 sm:px-8">
              <div className="space-y-2">
                <label htmlFor="login" className="block text-sm font-semibold text-slate-700">Usuário ou e-mail</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="login" type="text" value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Digite seu usuário ou e-mail" autoComplete="username" autoFocus className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#23638c] focus:ring-2 focus:ring-[#23638c]/15" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="senha" className="block text-sm font-semibold text-slate-700">Senha</label>
                <div className="relative">
                  <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="senha" type={senhaVisivel ? "text" : "password"} value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#23638c] focus:ring-2 focus:ring-[#23638c]/15" />
                  <button type="button" onClick={() => setSenhaVisivel((visible) => !visible)} aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                    {senhaVisivel ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || !login.trim() || !senha} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#23638c] px-5 text-sm font-bold text-white transition hover:bg-[#1a4b6b] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : <>Entrar <ArrowRight size={16} /></>}
              </button>
            </form>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs leading-relaxed text-slate-500 sm:px-8">
              <p className="flex items-start gap-2"><LockKeyhole size={14} className="mt-0.5 flex-none text-slate-400" /> Em caso de perda de acesso, solicite a redefinição ao administrador.</p>
            </div>
          </section>

          <p className="mt-6 text-center text-xs text-slate-400">SAG · Sistema de Acompanhamento e Gestão</p>
        </div>
      </main>
    </div>
  );
}
