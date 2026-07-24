"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, GraduationCap, Loader2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { useSessionStore } from "@/store/session";
import toast from "react-hot-toast";

const highlights = [
  { title: "Rotina em um só lugar", detail: "Chamadas, diário e cronograma conectados." },
  { title: "Gestão sem ruído", detail: "Cadastros e vínculos fáceis de acompanhar." },
  { title: "Dados sempre à mão", detail: "Relatórios de horas para decisões melhores." },
];

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
    <div className="min-h-dvh bg-[#f7f8fc] lg:flex">
      <aside className="relative hidden min-h-dvh overflow-hidden bg-[#111827] px-12 py-10 text-white lg:flex lg:w-[46%] lg:flex-col xl:px-16">
        <div className="pointer-events-none absolute -right-32 -top-24 h-[30rem] w-[30rem] rounded-full border-[44px] border-indigo-500/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 text-xs font-black shadow-xl shadow-indigo-950/40">SAG</div>
          <div>
            <p className="text-base font-bold">SAG</p>
            <p className="text-xs text-slate-500">Gestão escolar</p>
          </div>
        </div>

        <div className="relative my-auto max-w-lg py-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-200">
            <Sparkles size={13} /> Feito para simplificar sua rotina
          </div>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight xl:text-5xl">
            A escola organizada começa por aqui.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
            Um espaço claro para cuidar das turmas, apoiar os professores e manter cada aula no lugar certo.
          </p>
          <div className="mt-10 space-y-4">
            {highlights.map((item, index) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-indigo-200">0{index + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">SAG · Plataforma de gestão do Bloquin</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[25rem]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white shadow-md">SAG</div>
            <div><p className="text-sm font-bold text-slate-900">SAG</p><p className="text-xs text-slate-400">Gestão escolar</p></div>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><GraduationCap size={21} /></div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Área restrita</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Bem-vindo de volta</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Entre com suas credenciais para acessar o painel.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="login" className="block text-sm font-semibold text-slate-700">Usuário ou e-mail</label>
              <div className="relative">
                <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="login" type="text" value={login} onChange={(event) => setLogin(event.target.value)} placeholder="seu@email.com" autoComplete="username" autoFocus className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="senha" className="block text-sm font-semibold text-slate-700">Senha</label>
              <div className="relative">
                <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="senha" type={senhaVisivel ? "text" : "password"} value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10" />
                <button type="button" onClick={() => setSenhaVisivel((visible) => !visible)} aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  {senhaVisivel ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !login.trim() || !senha} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:shadow-none">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Entrando...</> : <>Acessar o painel <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-3.5 text-xs leading-relaxed text-slate-500">
            <LockKeyhole size={15} className="mt-0.5 flex-none text-slate-400" />
            <p>Use o usuário e a senha fornecidos pela administração da sua escola.</p>
          </div>
          <p className="mt-8 text-center text-xs text-slate-400">SAG · Sistema de Aulas e Gestão</p>
        </div>
      </main>
    </div>
  );
}
