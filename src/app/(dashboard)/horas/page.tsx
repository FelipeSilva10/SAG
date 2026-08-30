"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, Download, RefreshCw, TrendingUp, BookOpen } from "lucide-react";
import { useSessionStore } from "@/store/session";
import { useEscolas } from "@/hooks/useEscolas";
import { Select, Spinner, PageHeader, StatCard, Table, type Column, EmptyState } from "@/components/ui";
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
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horas_${mes || "todos"}_${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const anos = Array.from({ length: 4 }, (_, i) => String(anoAtual - i));

  const columns: Column<RegistroHoras>[] = [
    {
      key: "dataAula",
      header: "Data",
      render: (r) => <span className="whitespace-nowrap font-semibold text-[#1f2d3a]">{formatarData(r.dataAula)}</span>,
    },
    ...(admin ? [{ key: "professorNome", header: "Professor" } as Column<RegistroHoras>] : []),
    { key: "turmaNome", header: "Turma" },
    { key: "escolaNome", header: "Escola" },
    {
      key: "tipoAula",
      header: "Tipo",
      render: (r) => {
        const isOcasional = r.tipoAula !== "AULA";
        const isPrivada = r.escolaTipo === "PRIVADA";
        return (
          <span className={`text-xs font-bold ${isOcasional ? "text-purple-600" : isPrivada ? "text-emerald-700" : "text-[#23638c]"}`}>
            {r.tipoAula === "REUNIÃO" ? "📋 Reunião" : r.tipoAula === "AULA_SUBSTITUTA" ? "🔄 Substituta" : "📚 Aula"}
          </span>
        );
      },
    },
    {
      key: "horario",
      header: "Horário",
      render: (r) => <span className="font-mono text-xs text-[#62798a]">{r.horarioInicio}–{r.horarioFim}</span>,
    },
    {
      key: "horas",
      header: "Horas",
      render: (r) => <span className="font-semibold text-[#1f2d3a]">{formatarHoras(r.horasMinistradas)}</span>,
    },
    {
      key: "presenca",
      header: "Presença",
      render: (r) => {
        const pct = r.totalAlunos > 0 ? Math.round((r.totalPresentes / r.totalAlunos) * 100) : 0;
        return (
          <span className={`text-xs font-bold ${pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {r.totalPresentes}/{r.totalAlunos}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={admin ? "Registro de Horas — Administração" : "Meu Registro de Horas"}
        actions={
          <>
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
              <Select value={ano} onChange={(e) => setAno(e.target.value)} options={anos.map((a) => ({ value: a, label: a }))} />
            </div>
            <button
              onClick={carregar}
              className="rounded-lg p-2 text-[#8ea0b0] transition hover:bg-[#f3f7fa] hover:text-[#45566a]"
              aria-label="Atualizar"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={exportarCSV}
              disabled={listaExibida.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-[#d4e1e9] px-3 py-2 text-sm font-bold text-[#45566a] transition hover:bg-[#f3f7fa] disabled:opacity-40 sm:w-auto"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </>
        }
      />

      {/* Cards de totais */}
      <div className="grid grid-cols-1 gap-3 border-b border-[#e3ebf1] bg-[#f3f7fa] px-4 py-4 sm:grid-cols-3 sm:px-6">
        <StatCard label="Total de Aulas" value={listaExibida.length} icon={<BookOpen size={18} />} tone="accent" />
        <StatCard label="Total de Horas" value={formatarHoras(totalHoras)} icon={<Clock size={18} />} tone="green" />
        <StatCard label="Média de Presença" value={`${Math.round(mediaPresenca)}%`} icon={<TrendingUp size={18} />} tone="amber" />
      </div>

      {/* Conteúdo */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Resumo por professor (admin) */}
          {admin && (
            <div className="max-h-72 w-full flex-none overflow-auto border-b border-[#e3ebf1] lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
              <div className="border-b border-[#e3ebf1] bg-[#f3f7fa] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#62798a]">
                  Resumo por Professor
                </p>
                <p className="mt-0.5 text-xs text-[#8ea0b0]">Clique para filtrar detalhes</p>
              </div>
              {resumosPorProf.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#8ea0b0]">Nenhum dado.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#e3ebf1] bg-[#f3f7fa]">
                      <th className="px-3 py-2 text-left font-bold text-[#62798a]">Professor</th>
                      <th className="px-2 py-2 text-right font-bold text-[#62798a]">Horas</th>
                      <th className="px-2 py-2 text-right font-bold text-[#62798a]">Pres.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumosPorProf.map((r) => (
                      <tr
                        key={r.professorId}
                        onClick={() => setProfSel(profSel?.professorId === r.professorId ? null : r)}
                        className={`cursor-pointer border-b border-[#eef2f7] transition hover:bg-[#e8f1f6]/60 ${
                          profSel?.professorId === r.professorId ? "bg-[#e8f1f6] font-bold" : ""
                        }`}
                      >
                        <td className="max-w-[120px] truncate px-3 py-2 text-[#1f2d3a]">{r.nome}</td>
                        <td className="px-2 py-2 text-right text-[#45566a]">
                          {formatarHoras(r.totalHoras)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className={`font-bold ${
                            r.mediaPresenca >= 75 ? "text-emerald-600" :
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
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {listaExibida.length === 0 ? (
              <EmptyState icon={<Clock size={22} />} title="Nenhum registro para o período selecionado" />
            ) : (
              <Table<RegistroHoras>
                columns={columns}
                data={listaExibida}
                rowKey={(r) => r.chamadaId}
                rowClassName={(r) => (r.tipoAula !== "AULA" ? "bg-purple-50/30" : r.escolaTipo === "PRIVADA" ? "bg-emerald-50/30" : "")}
                pageSize={25}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
