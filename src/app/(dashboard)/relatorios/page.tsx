"use client";

import { useEffect, useState } from "react";
import { Download, FileDown, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, EmptyState, Input, PageHeader, Select, Spinner, StatCard } from "@/components/ui";
import { useEscolas } from "@/hooks/useEscolas";
import { attendanceCell } from "@/lib/attendance-report";
import { formatDate } from "@/lib/utils";
import type { RelatorioFrequencia } from "@/lib/types";

export default function RelatoriosPage() {
  const { escolas } = useEscolas();
  const [school, setSchool] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [report, setReport] = useState<RelatorioFrequencia | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => { setSchool(new URLSearchParams(window.location.search).get("escolaId") ?? ""); }, []);
  useEffect(() => {
    if (!school) { setReport(null); return; }
    const controller = new AbortController();
    const query = new URLSearchParams({ escolaId: school });
    if (start) query.set("inicio", start); if (end) query.set("fim", end);
    setLoading(true); setError(""); setReport(null);
    fetch(`/api/relatorios/frequencia?${query}`, { signal: controller.signal }).then(async res => {
      const result = await res.json(); if (!res.ok) throw new Error(result.error); setReport(result);
    }).catch(err => { if (err.name !== "AbortError") setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [school, start, end, revision]);
  async function download(format: "csv" | "pdf") {
    if (!report) return;
    setDownloading(format);
    try {
      const query = new URLSearchParams({ escolaId: school, formato: format, inicio: report.inicio!, fim: report.fim! });
      const res = await fetch(`/api/relatorios/frequencia?${query}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a"); link.href = url; link.download = `frequencia-${report.inicio}-${report.fim}.${format}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error((err as Error).message); }
    finally { setDownloading(null); }
  }
  const students = report?.alunos.filter(a => a.nome.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))) ?? [];
  return <div className="report-page flex h-full flex-col">
    <div className="print-hidden"><PageHeader title="Relatório de frequência" actions={<><Button variant="secondary" disabled={!report || downloading !== null} loading={downloading === "csv"} onClick={() => download("csv")}><Download size={15} /> CSV</Button><Button variant="secondary" disabled={!report || downloading !== null} loading={downloading === "pdf"} onClick={() => download("pdf")}><FileDown size={15} /> PDF</Button><Button variant="secondary" disabled={!report} onClick={() => window.print()}><Printer size={15} /> Imprimir</Button></>} /></div>
    <div className="report-content flex-1 space-y-5 overflow-auto p-4 sm:p-6">
      <div className="print-hidden grid gap-3 rounded-lg border border-[#e3ebf1] bg-white p-4 sm:grid-cols-3">
        <Select label="Escola" value={school} onChange={e => { setSchool(e.target.value); setStart(""); setEnd(""); setSearch(""); }} options={[{ value: "", label: "Selecione a escola" }, ...escolas.map(e => ({ value: e.id, label: e.nome }))]} />
        <Input type="date" label="De (opcional)" value={start} onChange={e => setStart(e.target.value)} hint="Em branco: desde o início do curso." />
        <Input type="date" label="Até (opcional)" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} hint="Em branco: término da escola ou hoje." />
      </div>
      {loading ? <Spinner /> : error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<Button size="sm" variant="secondary" onClick={() => setRevision(r => r + 1)} className="ml-3">Tentar novamente</Button></div> : !report ? <EmptyState icon={<FileDown size={22} />} title="Selecione uma escola para consultar a frequência" /> : <>
        <div><h2 className="text-xl">{report.escola}</h2><p className="mt-1 text-sm text-[#62798a]">{formatDate(report.inicio)} a {formatDate(report.fim)} · Alunos de todas as turmas, em uma lista única.</p></div>
        <div className="print-hidden grid gap-3 sm:grid-cols-3"><StatCard label="Alunos no relatório" value={report.alunos.length} tone="accent" /><StatCard label="Chamadas registradas" value={report.chamadas} tone="green" /><StatCard label="Aulas passadas sem chamada" value={report.aulasPendentes} tone="amber" /></div>
        {report.aulasPendentes > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Há {report.aulasPendentes} aulas sem chamada no período. Complete os registros para obter o relatório final do curso.</p>}
        <p className="text-xs text-[#62798a]">P = presente · F = falta · — = sem registro. A frequência considera apenas os registros de cada aluno. Feriados, cancelamentos e aulas sem chamada não contam como faltas. O CSV e o PDF incluem todos os alunos.</p>
        <div className="print-hidden max-w-sm"><Input label="Buscar aluno" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome do aluno" /></div>
        {!students.length ? <EmptyState title="Nenhum aluno encontrado" /> : <div className="report-table overflow-auto rounded-lg border border-[#e3ebf1] bg-white"><table className="w-full text-sm"><thead><tr className="bg-[#f3f7fa] text-left text-xs text-[#62798a]"><th className="min-w-48 px-4 py-3">Aluno</th><th className="px-4 py-3">Presenças</th><th className="px-4 py-3">Faltas</th><th className="px-4 py-3">Frequência</th><th className="whitespace-nowrap px-4 py-3">Última presença</th>{report.datas.map(d => <th key={d} className="whitespace-nowrap px-3 py-3 text-center">{formatDate(d)}</th>)}</tr></thead><tbody>{students.map(a => <tr key={a.id} className="border-t border-[#e3ebf1]"><td className="px-4 py-3 font-semibold">{a.nome}</td><td className="px-4 py-3 font-bold text-emerald-700">{a.presencas}</td><td className="px-4 py-3">{a.faltas}</td><td className="px-4 py-3"><Badge variant={a.frequencia == null ? "gray" : a.frequencia >= 75 ? "green" : "amber"}>{a.frequencia == null ? "Sem registros" : `${a.frequencia}%`}</Badge></td><td className="px-4 py-3">{formatDate(a.ultimaPresenca)}</td>{report.datas.map(d => <td key={d} className={`whitespace-nowrap px-3 py-3 text-center ${a.dias[d]?.faltas ? "text-red-600" : a.dias[d]?.presentes ? "text-emerald-700" : "text-[#8ea0b0]"}`}>{attendanceCell(a.dias[d])}</td>)}</tr>)}</tbody></table></div>}
      </>}
    </div>
  </div>;
}
