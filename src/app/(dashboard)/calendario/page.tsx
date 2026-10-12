"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, EmptyState, Input, PageHeader, Select, SidePanel, Spinner, StatCard, useConfirmDialog } from "@/components/ui";
import { useEscolas } from "@/hooks/useEscolas";
import { useTurmas } from "@/hooks/useTurmas";
import { addDays, isDate, isTeachingDay, todayInSaoPaulo } from "@/lib/course-calendar";
import { formatDate } from "@/lib/utils";
import type { AulaCalendario, DadosCalendario, TipoExcecao } from "@/lib/types";

const TYPES = [
  { value: "FERIADO", label: "Feriado / recesso" }, { value: "CANCELAMENTO", label: "Cancelar aula" },
  { value: "REPOSICAO", label: "Reposição" }, { value: "EXTRA", label: "Aula extra" }, { value: "ALTERACAO", label: "Alterar horário" },
];
const LABELS: Record<string, string> = { AULA: "Aula", FERIADO: "Feriado / recesso", CANCELAMENTO: "Cancelada", REPOSICAO: "Reposição", EXTRA: "Aula extra", ALTERACAO: "Horário alterado" };
const STATUS: Record<AulaCalendario["status"], string> = { REALIZADA: "Chamada registrada", PENDENTE: "Sem chamada", AGENDADA: "Agendada", CANCELADA: "Sem aula" };
const TONE: Record<AulaCalendario["status"], "green" | "amber" | "blue" | "gray"> = { REALIZADA: "green", PENDENTE: "amber", AGENDADA: "blue", CANCELADA: "gray" };

export default function CalendarioPage() {
  const router = useRouter();
  const confirm = useConfirmDialog();
  const { escolas } = useEscolas();
  const { turmas } = useTurmas();
  const today = todayInSaoPaulo();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [school, setSchool] = useState("");
  const [classId, setClassId] = useState("");
  const [selected, setSelected] = useState<string | null>(today);
  const [data, setData] = useState<DadosCalendario>({ aulas: [], progresso: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ turmaId: "", data: today, tipo: "FERIADO" as TipoExcecao, motivo: "", horarioInicio: "", horarioFim: "", dataOriginal: "" });
  const start = `${month}-01`;
  const next = new Date(`${start}T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1);
  const end = addDays(next.toISOString().slice(0, 10), -1);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${start}T12:00:00Z`));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setClassId(params.get("turmaId") ?? ""); setSchool(params.get("escolaId") ?? "");
    const date = params.get("data");
    if (isDate(date)) { setMonth(date.slice(0, 7)); setSelected(date); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ inicio: start, fim: end });
    if (school) query.set("escolaId", school);
    if (classId) query.set("turmaId", classId);
    setLoading(true); setError("");
    fetch(`/api/calendario?${query}`, { signal: controller.signal }).then(async res => {
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    }).catch(err => { if (err.name !== "AbortError") { setError(err.message); setData({ aulas: [], progresso: [] }); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [start, end, school, classId, revision]);
  const days = useMemo(() => {
    const offset = (new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7;
    return Array.from({ length: Math.ceil((Number(end.slice(8)) + offset) / 7) * 7 }, (_, i) => addDays(start, i - offset));
  }, [start, end]);
  const filteredClasses = turmas.filter(t => !school || t.escolaId === school);
  const visibleEvents = data.aulas.filter(a => !selected || a.data === selected);
  const refresh = useCallback(() => setRevision(r => r + 1), []);
  function moveMonth(direction: number) {
    const date = new Date(`${start}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + direction);
    setMonth(date.toISOString().slice(0, 7)); setSelected(null);
  }
  function openAdjustment(aula?: AulaCalendario) {
    const turmaId = aula?.turmaId ?? classId ?? "";
    const turma = turmas.find(t => t.id === turmaId);
    const schedule = turma?.horarios[0];
    setForm({ turmaId, data: aula?.data ?? selected ?? today, tipo: aula && aula.tipo !== "AULA" ? aula.tipo : aula ? "ALTERACAO" : "FERIADO", motivo: aula?.motivo ?? "", horarioInicio: aula?.horarioInicio ?? schedule?.horarioInicio ?? "", horarioFim: aula?.horarioFim ?? schedule?.horarioFim ?? "", dataOriginal: aula?.dataOriginal ?? "" });
    setOpen(true);
  }
  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/calendario/excecoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error);
      toast.success("Calendário atualizado."); setOpen(false); refresh();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }
  async function remove(aula: AulaCalendario) {
    if (!await confirm({ title: "Remover ajuste", description: `Remover o ajuste de ${formatDate(aula.data)}? Ao remover uma reposição, a data original volta ao calendário.`, confirmLabel: "Remover" })) return;
    try {
      const res = await fetch(`/api/calendario/excecoes?id=${aula.excecaoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Ajuste removido."); refresh();
    } catch (err) { toast.error((err as Error).message); }
  }
  return <div className="flex h-full flex-col">
    <PageHeader title="Calendário de aulas" actions={<><Button variant="secondary" onClick={() => router.push("/cronograma")}>Horários semanais</Button><Button onClick={() => openAdjustment()}><Plus size={16} /> Ajustar calendário</Button></>} />
    <div className="flex-1 space-y-5 overflow-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-60"><Select label="Escola" value={school} onChange={e => { setSchool(e.target.value); setClassId(""); }} options={[{ value: "", label: "Todas as escolas" }, ...escolas.map(e => ({ value: e.id, label: e.nome }))]} /></div>
        <div className="w-full sm:w-60"><Select label="Turma" value={classId} onChange={e => setClassId(e.target.value)} options={[{ value: "", label: "Todas as turmas" }, ...filteredClasses.map(t => ({ value: t.id, label: `${t.nome} · ${t.escolaNome}` }))]} /></div>
        <div className="ml-auto flex items-center gap-2"><Button variant="secondary" aria-label="Mês anterior" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></Button><span className="min-w-36 text-center text-sm font-bold capitalize">{monthLabel}</span><Button variant="secondary" aria-label="Próximo mês" onClick={() => moveMonth(1)}><ChevronRight size={16} /></Button><Button variant="secondary" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>Hoje</Button></div>
      </div>
      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<Button size="sm" variant="secondary" onClick={refresh} className="ml-3">Tentar novamente</Button></div> : loading ? <Spinner /> : <>
        <div className="grid gap-3 sm:grid-cols-3"><StatCard label="Aulas neste mês" value={data.aulas.filter(isTeachingDay).length} icon={<CalendarDays size={18} />} tone="accent" /><StatCard label="Chamadas registradas" value={data.aulas.filter(a => a.chamadaId).length} icon={<ClipboardCheck size={18} />} tone="green" /><StatCard label="Aulas passadas sem chamada" value={data.aulas.filter(a => a.status === "PENDENTE").length} icon={<ClipboardCheck size={18} />} tone="amber" /></div>
        {classId && data.progresso.map(p => <div key={p.turmaId} className="rounded-lg border border-[#d4e1e9] bg-white p-4"><p className="font-bold">{p.turmaNome} · {p.realizadas}{p.total != null ? ` de ${p.total}` : ""} aulas registradas</p><p className="mt-1 text-sm text-[#62798a]">{p.proxima ? `Próxima: aula ${p.proxima.numero}${p.total != null ? ` de ${p.total}` : ""} · ${formatDate(p.proxima.data)}` : "Sem próxima aula prevista"}{p.objetivo && p.total !== p.objetivo ? ` · Objetivo: ${p.objetivo} aulas` : ""}</p></div>)}
        <div className="overflow-hidden rounded-lg border border-[#d4e1e9] bg-white">
          <div className="grid grid-cols-7 bg-[#f3f7fa]">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => <div key={d} className="py-2 text-center text-xs font-bold text-[#62798a]">{d}</div>)}</div>
          <div className="grid grid-cols-7">{days.map(day => {
            const events = data.aulas.filter(a => a.data === day);
            return <button key={day} aria-label={`${formatDate(day)}, ${events.length} eventos`} aria-pressed={selected === day} onClick={() => setSelected(day === selected ? null : day)} className={`min-h-24 border-r border-t border-[#e3ebf1] p-1 text-left transition hover:bg-[#f3f7fa] sm:min-h-32 sm:p-2 ${day.slice(0, 7) !== month ? "bg-[#f8fafc] text-[#8ea0b0]" : ""} ${selected === day ? "bg-[#e8f1f6] ring-2 ring-inset ring-[#23638c]" : ""}`}>
              <span className={`inline-flex h-6 w-6 items-center justify-center text-xs font-bold ${day === today ? "rounded-full bg-[#23638c] text-white" : ""}`}>{Number(day.slice(8))}</span>
              <div className="mt-1 space-y-1">{events.slice(0, 2).map(a => <div key={a.chave} className={`truncate rounded px-1 py-0.5 text-[10px] sm:text-xs ${a.status === "REALIZADA" ? "bg-emerald-50 text-emerald-800" : a.status === "PENDENTE" ? "bg-amber-50 text-amber-800" : a.status === "CANCELADA" ? "bg-slate-100 text-slate-500 line-through" : "bg-blue-50 text-blue-800"}`}>{a.horarioInicio && <span className="hidden lg:inline">{a.horarioInicio} </span>}{a.turmaNome}</div>)}{events.length > 2 && <p className="text-[10px] text-[#62798a]">+{events.length - 2} eventos</p>}</div>
            </button>;
          })}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base">{selected ? `Eventos de ${formatDate(selected)}` : "Eventos do mês"}</h2>{selected && <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>Ver o mês inteiro</Button>}</div>
        {!visibleEvents.length ? <EmptyState icon={<CalendarDays size={22} />} title="Nenhuma aula nesta seleção" /> : <div className="space-y-3">{visibleEvents.map(a => <div key={a.chave} className="flex flex-col justify-between gap-3 rounded-lg border border-[#e3ebf1] bg-white p-4 sm:flex-row sm:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{a.turmaNome}</p><Badge variant={TONE[a.status]}>{STATUS[a.status]}</Badge>{a.tipo !== "AULA" && <Badge>{LABELS[a.tipo]}</Badge>}</div><p className="mt-1 text-sm text-[#62798a]">{formatDate(a.data)} · {a.horarioInicio ? `${a.horarioInicio}–${a.horarioFim}` : "Sem aula"} · {a.escolaNome}{a.numero != null ? ` · Aula ${a.numero}${a.total != null ? ` de ${a.total}` : ""}` : ""}</p>{a.motivo && <p className="mt-1 text-xs text-[#62798a]">{a.motivo}</p>}</div>
          <div className="flex flex-wrap gap-2">{isTeachingDay(a) && a.data <= today && <Button size="sm" variant={a.chamadaId ? "secondary" : "primary"} onClick={() => router.push(a.chamadaId ? `/chamada?chamadaId=${a.chamadaId}` : `/chamada?turmaId=${a.turmaId}&data=${a.data}`)}><ClipboardCheck size={14} />{a.chamadaId ? "Consultar chamada" : "Fazer chamada"}</Button>}{!a.chamadaId && <Button size="sm" variant="secondary" onClick={() => openAdjustment(a)}>Ajustar</Button>}{a.excecaoId && !a.chamadaId && <Button size="sm" variant="ghost" aria-label="Remover ajuste" onClick={() => remove(a)}><Trash2 size={14} /></Button>}</div>
        </div>)}</div>}
      </>}
    </div>
    <SidePanel title="Ajustar calendário" open={open} onClose={() => setOpen(false)} width="w-full sm:w-[28rem]">
      <div className="space-y-4">
        <Select label="Turma" value={form.turmaId} onChange={e => { const turma = turmas.find(t => t.id === e.target.value); setForm(old => ({ ...old, turmaId: e.target.value, horarioInicio: turma?.horarios[0]?.horarioInicio ?? "", horarioFim: turma?.horarios[0]?.horarioFim ?? "" })); }} options={[{ value: "", label: "Selecione" }, ...filteredClasses.filter(t => t.situacao === "ATIVA").map(t => ({ value: t.id, label: `${t.nome} · ${t.escolaNome}` }))]} />
        <Select label="Tipo de ajuste" value={form.tipo} onChange={e => setForm(old => ({ ...old, tipo: e.target.value as TipoExcecao }))} options={TYPES} />
        {form.tipo === "REPOSICAO" && <Input type="date" label="Data da aula original" value={form.dataOriginal} onChange={e => setForm(old => ({ ...old, dataOriginal: e.target.value }))} hint="A data original fica sem aula; a presença será registrada na reposição." />}
        <Input type="date" label={form.tipo === "REPOSICAO" ? "Nova data da aula" : "Data"} value={form.data} onChange={e => setForm(old => ({ ...old, data: e.target.value }))} />
        {!["FERIADO", "CANCELAMENTO"].includes(form.tipo) && <div className="grid grid-cols-2 gap-3"><Input label="Início" type="time" value={form.horarioInicio} onChange={e => setForm(old => ({ ...old, horarioInicio: e.target.value }))} /><Input label="Término" type="time" value={form.horarioFim} onChange={e => setForm(old => ({ ...old, horarioFim: e.target.value }))} /></div>}
        <Input label="Motivo / observação" maxLength={500} value={form.motivo} onChange={e => setForm(old => ({ ...old, motivo: e.target.value }))} placeholder="Ex.: feriado municipal, reunião da unidade" />
        <Button onClick={save} loading={saving} className="w-full justify-center">Salvar ajuste</Button>
      </div>
    </SidePanel>
  </div>;
}
