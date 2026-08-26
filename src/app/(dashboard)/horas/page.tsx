"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, Download, RefreshCw, TrendingUp, Users, BookOpen } from "lucide-react";
import { useSessionStore } from "@/store/session";
import { useEscolas } from "@/hooks/useEscolas";
import { Select, Spinner } from "@/components/ui";
import toast from "react-hot-toast";
import type { RegistroHoras } from "@/lib/types";

interface Professor { id: string; nome: string; }

interface ProfResumo {
  professorId: string;
  nome: string;
  totalAulas: number;
  totalHoras: number;
  mediaPresenca: number;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatarHoras(h: number): string {
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs === 0) return `${min}min`;
  if (min === 0) return `${hrs}h`;
  return `${hrs}h ${min}min`;
}

function escaparCSV(valor: string | number | null | undefined): string {
  const texto = String(valor ?? "");
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function Card({
  titulo, valor, cor, icone,
}: { titulo: string; valor: string; cor: string; icone: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cor}`}>
        {icone}
      </div>
      <div>
        <p className="text-xs text-gray-500">{titulo}</p>
        <p className={`text-2xl font-bold`}>{valor}</p>
      </div>
    </div>
  );
}

export default function HorasPage() {
  const { sessao, isAdmin } = useSessionStore();
  const admin = isAdmin();
  const profId = sessao?.id ?? "";

  const [registros, setRegistros] = useState<RegistroHoras[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const { escolas } = useEscolas();
  const [loading, setLoading] = useState(true);
  const [profFiltro, setProfFiltro] = useState("");
  const [naicaFiltro, setNaicaFiltro] = useState("");

  const anoAtual = new Date().getFullYear();
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState(String(anoAtual));

  // Admin: linha selecionada no resumo
  const [profSel, setProfSel] = useState<ProfResumo | null>(null);
  const [registrosDetalhe, setRegistrosDetalhe] = useState<RegistroHoras[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!admin) params.set("professorId", profId);
      else if (profFiltro) params.set("professorId", profFiltro);
      if (naicaFiltro) params.set("escolaId", naicaFiltro);
      if (mes) params.set("mes", String(MESES.indexOf(mes) + 1));
      if (ano) params.set("ano", ano);

      const res = await fetch(`/api/horas?${params}`);
      const data = await res.json();
      setRegistros(Array.isArray(data) ? data : []);
    } catch { toast.error("Erro ao carregar horas."); }
    finally { setLoading(false); }
  }, [admin, profId, profFiltro, naicaFiltro, mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!admin) return;
    fetch("/api/professores").then((r) => r.json()).then(setProfessores);
  }, [admin]);

  // Resumo por professor (admin)
  const resumosPorProf = useMemo((): ProfResumo[] => {
    const mapa = new Map<string, RegistroHoras[]>();
    for (const r of registros) {
      const pid = r.professorId ?? "";
      const arr = mapa.get(pid) ?? [];
      arr.push(r);
      mapa.set(pid, arr);
    }
    return Array.from(mapa.entries()).map(([pid, lista]) => {
      const nome = lista[0].professorNome ?? "—";
      const totalHoras = lista.reduce((s, r) => s + r.horasMinistradas, 0);
      const mediaPresenca =
        lista.filter((r) => r.totalAlunos > 0)
          .reduce((s, r) => s + (r.totalPresentes / r.totalAlunos) * 100, 0) /
        (lista.filter((r) => r.totalAlunos > 0).length || 1);
      return { professorId: pid, nome, totalAulas: lista.length, totalHoras, mediaPresenca };
    }).sort((a, b) => b.totalHoras - a.totalHoras);
  }, [registros]);

  // Detalhes do professor selecionado no resumo
  useEffect(() => {
    if (!profSel) { setRegistrosDetalhe(registros); return; }
    setRegistrosDetalhe(registros.filter((r) => r.professorId === profSel.professorId));
  }, [profSel, registros]);

  const listaExibida = admin ? registrosDetalhe : registros;

  const totalHoras = listaExibida.reduce((s, r) => s + r.horasMinistradas, 0);
  const mediaPresenca = listaExibida.length > 0
    ? listaExibida
        .filter((r) => r.totalAlunos > 0)
        .reduce((s, r) => s + (r.totalPresentes / r.totalAlunos) * 100, 0) /
      (listaExibida.filter((r) => r.totalAlunos > 0).length || 1)
    : 0;

  function exportarCSV() {
    const linhas = [
      [
        "Data", "Professor", "Turma", "Escola", "Tipo", "Horário de início",
        "Horário de fim", "Quantidade de horas", "Alunos presentes", "Presentes", "Total de alunos",
      ].map(escaparCSV).join(","),
      ...listaExibida.map((r) => [
        formatarData(r.dataAula),
        r.professorNome,
        r.turmaNome,
        r.escolaNome,
        r.tipoAula,
        r.horarioInicio,
        r.horarioFim,
        formatarHoras(r.horasMinistradas),
        r.alunosPresentes || "—",
        r.totalPresentes,
        r.totalAlunos,
      ].map(escaparCSV).join(",")),
    ];
    const blob = new Blob(["\uFEFF" + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horas_${mes || "todos"}_${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const anos = Array.from({ length: 4 }, (_, i) => String(anoAtual - i));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-4 bg-white border-b border-slate-200 sm:flex-row sm:items-center sm:flex-wrap sm:px-6">
        <h1 className="text-lg font-bold text-gray-900">
          {admin ? "Registro de Horas — Administração" : "Meu Registro de Horas"}
        </h1>

        <div className="hidden sm:block sm:flex-1" />

        {admin && (
          <div className="w-full sm:w-48">
            <Select
              value={profFiltro}
              onChange={(e) => setProfFiltro(e.target.value)}
              options={[
                { value: "", label: "Todos os professores" },
                ...professores.map((p) => ({ value: p.id, label: p.nome })),
              ]}
            />
          </div>
        )}

        <div className="w-full sm:w-48">
          <Select
            value={naicaFiltro}
            onChange={(e) => setNaicaFiltro(e.target.value)}
            options={[
              { value: "", label: "Todos os NAICAs" },
              ...escolas.map((escola) => ({ value: escola.id, label: escola.nome })),
            ]}
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            options={[
              { value: "", label: "Todos os meses" },
              ...MESES.map((m) => ({ value: m, label: m })),
            ]}
          />
        </div>

        <div className="w-full sm:w-24">
          <Select
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            options={anos.map((a) => ({ value: a, label: a }))}
          />
        </div>

        <button
          onClick={carregar}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
        >
          <RefreshCw size={15} />
        </button>

        <button
          onClick={exportarCSV}
          disabled={listaExibida.length === 0}
          className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold border border-slate-300 rounded-md hover:bg-[#f4f8fb] disabled:opacity-40 transition sm:w-auto"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-1 gap-3 px-4 py-4 bg-[#f5f7f9] border-b border-slate-200 sm:grid-cols-3 sm:px-6">
        <Card
          titulo="Total de Aulas"
          valor={String(listaExibida.length)}
          cor="bg-blue-100 text-blue-600"
          icone={<BookOpen size={18} />}
        />
        <Card
          titulo="Total de Horas"
          valor={formatarHoras(totalHoras)}
          cor="bg-green-100 text-green-600"
          icone={<Clock size={18} />}
        />
        <Card
          titulo="Média de Presença"
          valor={`${Math.round(mediaPresenca)}%`}
          cor="bg-amber-100 text-amber-600"
          icone={<TrendingUp size={18} />}
        />
      </div>

      {/* Conteúdo */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Resumo por professor (admin) */}
          {admin && (
            <div className="max-h-72 w-full flex-none overflow-auto border-b border-gray-200 lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Resumo por Professor
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Clique para filtrar detalhes</p>
              </div>
              {resumosPorProf.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum dado.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Professor</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-500">Horas</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-500">Pres.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumosPorProf.map((r) => (
                      <tr
                        key={r.professorId}
                        onClick={() => setProfSel(profSel?.professorId === r.professorId ? null : r)}
                        className={`border-b border-slate-100 cursor-pointer transition hover:bg-[#f4f8fb] ${
                          profSel?.professorId === r.professorId ? "bg-blue-50 font-semibold" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-800 truncate max-w-[120px]">{r.nome}</td>
                        <td className="px-2 py-2 text-right text-gray-700">
                          {formatarHoras(r.totalHoras)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className={`font-semibold ${
                            r.mediaPresenca >= 75 ? "text-green-600" :
                            r.mediaPresenca >= 50 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {Math.round(r.mediaPresenca)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tabela de detalhes */}
          <div className="flex-1 overflow-auto">
            {listaExibida.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <Clock size={48} className="opacity-20 mb-2" />
                <p className="text-sm">Nenhum registro para o período selecionado.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Data</th>
                    {admin && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Professor</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Turma</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Escola</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Horário</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Horas</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Presença</th>
                  </tr>
                </thead>
                <tbody>
                  {listaExibida.map((r, i) => {
                    const pct = r.totalAlunos > 0
                      ? Math.round((r.totalPresentes / r.totalAlunos) * 100) : 0;
                    const isOcasional = r.tipoAula !== "AULA";
                    const isPrivada = r.escolaTipo === "PRIVADA";
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 transition ${
                          isOcasional ? "bg-purple-50/30" : isPrivada ? "bg-green-50/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {formatarData(r.dataAula)}
                        </td>
                        {admin && (
                          <td className="px-4 py-3 text-gray-700">{r.professorNome}</td>
                        )}
                        <td className="px-4 py-3 text-gray-700">{r.turmaNome}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{r.escolaNome}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${
                            isOcasional ? "text-purple-600" :
                            isPrivada ? "text-green-700" : "text-blue-700"
                          }`}>
                            {r.tipoAula === "REUNIÃO" ? "📋 Reunião" :
                             r.tipoAula === "AULA_SUBSTITUTA" ? "🔄 Substituta" : "📚 Aula"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                          {r.horarioInicio}–{r.horarioFim}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">
                          {formatarHoras(r.horasMinistradas)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold ${
                            pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {r.totalPresentes}/{r.totalAlunos}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
