"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ClipboardCheck, FileDown, Plus, RefreshCw, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, EmptyState, Input, Select, SidePanel, Spinner, Table, type Column, useConfirmDialog } from "@/components/ui";
import { todayInSaoPaulo, timeInSaoPaulo, isTeachingDay } from "@/lib/course-calendar";
import { formatDate } from "@/lib/utils";
import type { AulaCalendario, Chamada, ChamadaPresenca, DadosCalendario, ProgressoCurso, ResumoTurma, Turma } from "@/lib/types";

type Screen = "TURMAS" | "FORM" | "HISTORICO";
type Presence = { alunoId: string; alunoNome: string; presente: boolean };
async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os dados.");
  return data;
}

export default function ChamadaPage() {
  const router = useRouter();
  const confirm = useConfirmDialog();
  const today = todayInSaoPaulo();
  const [screen, setScreen] = useState<Screen>("TURMAS");
  const [classes, setClasses] = useState<Turma[]>([]);
  const [summaries, setSummaries] = useState<ResumoTurma[]>([]);
  const [progress, setProgress] = useState<ProgressoCurso[]>([]);
  const [todayLessons, setTodayLessons] = useState<AulaCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today);
  const [lesson, setLesson] = useState<AulaCalendario | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Chamada[]>([]);
  const [historyClass, setHistoryClass] = useState("");
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [detail, setDetail] = useState<Chamada | null>(null);
  const [detailPresences, setDetailPresences] = useState<ChamadaPresenca[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const loadSequence = useRef(0);
  const detailSequence = useRef(0);
  const initialNavigation = useRef(false);

  const loadPreview = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [classData, summaryData, calendar] = await Promise.all([
        readJson<Turma[]>("/api/turmas"), readJson<ResumoTurma[]>("/api/chamada/resumo"),
        readJson<DadosCalendario>(`/api/calendario?inicio=${today}&fim=${today}`),
      ]);
      setClasses(classData); setSummaries(summaryData); setProgress(calendar.progresso); setTodayLessons(calendar.aulas.filter(isTeachingDay));
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [today]);
  const loadHistory = useCallback(async () => {
    setLoading(true); setError("");
    try { const rows = await readJson<Chamada[]>("/api/chamada"); setHistory(rows); return rows; }
    catch (err) { setError((err as Error).message); return []; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPreview(); }, [loadPreview]);
  useEffect(() => { if (screen === "HISTORICO") loadHistory(); }, [screen, loadHistory]);

  const loadStudents = useCallback(async (turmaId: string, data: string) => {
    const sequence = ++loadSequence.current;
    setPresences([]); setLesson(null);
    if (!turmaId || !data) return;
    if (data > today) { toast.error("Escolha uma data até hoje."); return; }
    setLoadingStudents(true);
    try {
      const [calendar, students] = await Promise.all([
        readJson<DadosCalendario>(`/api/calendario?turmaId=${turmaId}&inicio=${data}&fim=${data}`),
        readJson<{ id: string; nome: string; entityStatus: string }[]>(`/api/alunos?turmaId=${turmaId}`),
      ]);
      if (sequence !== loadSequence.current) return;
      const aula = calendar.aulas.find(a => a.turmaId === turmaId && a.data === data);
      if (!aula || !isTeachingDay(aula)) throw new Error("Não há aula nesta data. Consulte o calendário para cadastrar uma reposição ou aula extra.");
      if (aula.chamadaId) throw new Error("Esta aula já tem chamada. Consulte ou edite no histórico.");
      const active = students.filter(s => s.entityStatus === "ATIVO");
      if (!active.length) throw new Error("Cadastre alunos ativos nesta turma antes de fazer a chamada.");
      setLesson(aula); setPresences(active.map(s => ({ alunoId: s.id, alunoNome: s.nome, presente: true })));
    } catch (err) { if (sequence === loadSequence.current) toast.error((err as Error).message); }
    finally { if (sequence === loadSequence.current) setLoadingStudents(false); }
  }, [today]);
  const openForm = useCallback((turmaId = "", data = today) => {
    setClassId(turmaId); setDate(data); setScreen("FORM"); setError("");
    loadStudents(turmaId, data);
  }, [loadStudents, today]);
  const openDetail = useCallback(async (call: Chamada) => {
    const sequence = ++detailSequence.current;
    setDetail(call); setDetailPresences([]); setLoadingDetail(true);
    try {
      const rows = await readJson<ChamadaPresenca[]>(`/api/chamada/${call.id}/presencas`);
      if (sequence === detailSequence.current) setDetailPresences(rows);
    } catch (err) { if (sequence === detailSequence.current) toast.error((err as Error).message); }
    finally { if (sequence === detailSequence.current) setLoadingDetail(false); }
  }, []);
  useEffect(() => {
    if (loading || !classes.length || initialNavigation.current) return;
    initialNavigation.current = true;
    const params = new URLSearchParams(window.location.search);
    const requestedCall = params.get("chamadaId");
    if (requestedCall) {
      setScreen("HISTORICO");
      readJson<Chamada[]>("/api/chamada").then(rows => { setHistory(rows); const call = rows.find(c => c.id === requestedCall); if (call) openDetail(call); }).catch(err => toast.error(err.message));
    } else if (params.get("turmaId")) openForm(params.get("turmaId")!, params.get("data") || today);
  }, [loading, classes, openDetail, openForm, today]);

  function resetRoster() { loadSequence.current++; setPresences([]); setLesson(null); setLoadingStudents(false); }
  async function saveCall() {
    if (!lesson || lesson.turmaId !== classId || lesson.data !== date || !presences.length) return;
    setSaving(true);
    try {
      await readJson("/api/chamada", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turmaId: classId, dataAula: date, presencas: presences }) });
      toast.success(`Chamada salva: ${presences.filter(p => p.presente).length}/${presences.length} presentes.`);
      resetRoster(); setScreen("TURMAS"); await loadPreview();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }
  async function saveDetail() {
    if (!detail || !detailPresences.length) return;
    setSavingDetail(true);
    try {
      await readJson(`/api/chamada/${detail.id}/presencas`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ presencas: detailPresences }) });
      toast.success("Presenças atualizadas.");
      setDetail(old => old ? { ...old, totalPresentes: detailPresences.filter(p => p.presente).length } : old);
      await loadHistory();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSavingDetail(false); }
  }
  async function deleteCall(call: Chamada) {
    if (!await confirm({ title: "Excluir chamada", description: `Excluir o registro de ${formatDate(call.dataAula)} de ${call.turmaNome}? As presenças desta aula serão removidas do relatório.`, confirmLabel: "Excluir", danger: true })) return;
    try {
      await readJson(`/api/chamada/${call.id}`, { method: "DELETE" });
      toast.success("Chamada excluída."); setDetail(null); await loadHistory();
    } catch (err) { toast.error((err as Error).message); }
  }
  const present = presences.filter(p => p.presente).length;
  const activeLessons = todayLessons.filter(a => !a.chamadaId && a.horarioInicio! <= timeInSaoPaulo() && a.horarioFim! > timeInSaoPaulo());
  const historyFiltered = history.filter(c => (!historyClass || c.turmaId === historyClass) && (!historyStart || c.dataAula >= historyStart) && (!historyEnd || c.dataAula <= historyEnd));
  const columns: Column<Chamada>[] = [
    { key: "dataAula", header: "Data", render: c => formatDate(c.dataAula) },
    { key: "turmaNome", header: "Turma", render: c => <div><p className="font-semibold">{c.turmaNome}</p><p className="text-xs text-[#62798a]">{classes.find(t => t.id === c.turmaId)?.escolaNome}</p></div> },
    { key: "hora", header: "Horário", render: c => `${c.horarioInicio}–${c.horarioFim}` },
    { key: "presenca", header: "Presença", render: c => <Badge variant={c.totalAlunos && c.totalPresentes / c.totalAlunos >= 0.75 ? "green" : "amber"}>{c.totalPresentes}/{c.totalAlunos}</Badge> },
    { key: "acoes", header: "", render: c => <Button size="sm" variant="ghost" onClick={event => { event.stopPropagation(); deleteCall(c); }} className="text-red-600">Excluir</Button> },
  ];
  return <div className="flex h-full flex-col">
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e3ebf1] bg-white px-4 py-3 sm:px-6"><h1 className="mr-3 text-lg font-extrabold">Chamada</h1>{(["TURMAS", "HISTORICO"] as const).map(s => <Button key={s} size="sm" variant={screen === s ? "primary" : "secondary"} onClick={() => { setScreen(s); if (s === "TURMAS") loadPreview(); }}>{s === "TURMAS" ? "Turmas" : "Histórico"}</Button>)}<div className="flex-1" /><Button size="sm" variant="secondary" onClick={() => router.push("/relatorios")}><FileDown size={14} /> Relatório</Button><Button size="sm" variant="secondary" aria-label="Atualizar" onClick={() => screen === "HISTORICO" ? loadHistory() : loadPreview()}><RefreshCw size={14} /></Button><Button size="sm" onClick={() => openForm()}><Plus size={14} /> Nova chamada</Button></div>
    {error && <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {loading && screen !== "FORM" ? <Spinner /> : screen === "TURMAS" ? <div className="flex-1 space-y-5 overflow-auto p-4 sm:p-6">
      {activeLessons.map(a => <div key={a.chave} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"><div><p className="font-bold text-emerald-800">Aula em andamento · {a.turmaNome}</p><p className="text-sm text-emerald-700">Aula {a.numero}{a.total != null ? ` de ${a.total}` : ""} · {a.horarioInicio}–{a.horarioFim}</p></div><Button size="sm" variant="success" onClick={() => openForm(a.turmaId, today)}>Fazer chamada</Button></div>)}
      {!summaries.length ? <EmptyState icon={<Users size={22} />} title="Nenhuma turma disponível" /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{summaries.map(summary => {
        const p = progress.find(p => p.turmaId === summary.turmaId);
        const t = classes.find(t => t.id === summary.turmaId);
        const todayClass = todayLessons.find(a => a.turmaId === summary.turmaId);
        return <div key={summary.turmaId} className="space-y-3 rounded-lg border border-[#e3ebf1] bg-white p-5"><div className="flex justify-between gap-2"><div><h2 className="text-base">{summary.turmaNome}</h2><p className="text-xs text-[#62798a]">{summary.escolaNome}</p></div>{t?.situacao === "ENCERRADA" && <Badge>Encerrada</Badge>}</div><div className="text-sm"><p className="font-semibold">{p?.realizadas ?? summary.totalChamadas}{p?.total != null ? ` de ${p.total}` : ""} aulas registradas</p><p className="mt-1 text-xs text-[#62798a]">{summary.totalChamadas ? `${summary.mediaPresenca}% de presença média` : "Sem chamada registrada"}</p>{p?.proxima && <p className="mt-2 text-xs text-[#45566a]">Próxima: aula {p.proxima.numero}{p.total != null ? ` de ${p.total}` : ""} · {formatDate(p.proxima.data)}</p>}{!!p?.pendentes && <p className="mt-1 text-xs text-amber-700">{p.pendentes} aulas passadas sem chamada</p>}</div>{todayClass && !todayClass.chamadaId ? <Button size="sm" className="w-full justify-center" onClick={() => openForm(summary.turmaId, today)}>Fazer chamada de hoje</Button> : todayClass?.chamadaId ? <Badge variant="green"><CheckCircle size={12} /> Chamada de hoje registrada</Badge> : <p className="text-xs text-[#62798a]">Sem aula hoje</p>}<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => router.push(`/calendario?turmaId=${summary.turmaId}`)}>Calendário</Button><Button size="sm" variant="secondary" onClick={() => { setHistoryClass(summary.turmaId); setScreen("HISTORICO"); }}>Histórico</Button></div></div>;
      })}</div>}
    </div> : screen === "FORM" ? <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 border-b border-[#e3ebf1] bg-[#f3f7fa] p-4 sm:px-6"><div className="w-full sm:w-72"><Select label="Turma" disabled={saving} value={classId} onChange={e => { resetRoster(); setClassId(e.target.value); }} options={[{ value: "", label: "Selecione" }, ...classes.map(t => ({ value: t.id, label: `${t.nome} · ${t.escolaNome}` }))]} /></div><Input label="Data" type="date" max={today} value={date} disabled={saving} onChange={e => { resetRoster(); setDate(e.target.value); }} /><Button variant="secondary" onClick={() => loadStudents(classId, date)} disabled={!classId || !date || saving} loading={loadingStudents}>Carregar alunos</Button><Button variant="secondary" onClick={() => router.push(`/calendario?turmaId=${classId}&data=${date}`)}>Ver calendário</Button></div>
      {lesson && <div className="border-b border-[#e3ebf1] bg-white px-6 py-3 text-sm font-semibold">Aula {lesson.numero}{lesson.total != null ? ` de ${lesson.total}` : ""} · {lesson.horarioInicio}–{lesson.horarioFim}{lesson.tipo === "REPOSICAO" ? " · Reposição" : ""}{lesson.motivo && <span className="ml-2 font-normal text-[#62798a]">{lesson.motivo}</span>}</div>}
      <div className="flex-1 overflow-auto">{loadingStudents ? <Spinner /> : !presences.length ? <EmptyState icon={<ClipboardCheck size={22} />} title="Selecione a turma e a data da aula" message="Carregue os alunos para registrar a presença." /> : <div className="divide-y divide-[#e3ebf1] bg-white">{presences.map(p => <label key={p.alunoId} className={`flex cursor-pointer items-center justify-between gap-4 px-6 py-4 hover:bg-[#f3f7fa] ${!p.presente ? "bg-red-50/40" : ""}`}><span className="text-sm font-semibold">{p.alunoNome}</span><span className="flex items-center gap-3 text-sm"><span className={p.presente ? "text-emerald-700" : "text-red-600"}>{p.presente ? "Presente" : "Ausente"}</span><input type="checkbox" checked={p.presente} disabled={saving} onChange={() => setPresences(old => old.map(entry => entry.alunoId === p.alunoId ? { ...entry, presente: !entry.presente } : entry))} className="h-5 w-5 accent-[#23638c]" /></span></label>)}</div>}</div>
      {!!presences.length && <div className="flex flex-wrap items-center gap-3 border-t border-[#e3ebf1] bg-white p-4"><Button size="sm" variant="secondary" disabled={saving} onClick={() => setPresences(old => old.map(p => ({ ...p, presente: true })))}>Todos presentes</Button><Button size="sm" variant="secondary" disabled={saving} onClick={() => setPresences(old => old.map(p => ({ ...p, presente: false })))}>Todos ausentes</Button><span className="text-sm sm:ml-auto">{present}/{presences.length} presentes · {presences.length - present} ausentes</span><Button variant="success" loading={saving} onClick={saveCall}>Salvar chamada</Button></div>}
    </div> : <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-6"><div className="flex flex-wrap items-end gap-3"><div className="w-full sm:w-72"><Select label="Turma" value={historyClass} onChange={e => setHistoryClass(e.target.value)} options={[{ value: "", label: "Todas as turmas" }, ...[...new Map([...classes.map(t => [t.id, `${t.nome} · ${t.escolaNome}`] as const), ...history.map(c => [c.turmaId, c.turmaNome] as const)]).entries()].map(([value, label]) => ({ value, label }))]} /></div><Input label="De" type="date" value={historyStart} onChange={e => setHistoryStart(e.target.value)} /><Input label="Até" type="date" value={historyEnd} onChange={e => setHistoryEnd(e.target.value)} /></div>{historyFiltered.length ? <Table columns={columns} data={historyFiltered} rowKey={c => c.id} onRowClick={openDetail} pageSize={20} /> : <EmptyState title="Nenhuma chamada nesta seleção" />}</div>}
    <SidePanel title={detail ? `${detail.turmaNome} · ${formatDate(detail.dataAula)}` : "Presenças"} open={!!detail} onClose={() => { detailSequence.current++; setDetail(null); }} width="w-full sm:w-[28rem]">
      {loadingDetail ? <Spinner /> : <div className="space-y-4"><p className="text-sm text-[#62798a]">{detail?.horarioInicio}–{detail?.horarioFim} · {detailPresences.filter(p => p.presente).length}/{detailPresences.length} presentes</p><div className="space-y-2">{detailPresences.map(p => <label key={p.id!} className="flex cursor-pointer items-center justify-between gap-3 rounded border border-[#e3ebf1] p-3 text-sm"><span>{p.alunoNome}</span><input type="checkbox" className="h-5 w-5 accent-[#23638c]" disabled={savingDetail} checked={p.presente} onChange={() => setDetailPresences(old => old.map(entry => entry.id === p.id ? { ...entry, presente: !entry.presente } : entry))} /></label>)}</div><Button className="w-full justify-center" onClick={saveDetail} loading={savingDetail} disabled={!detailPresences.length}>Salvar alterações</Button></div>}
    </SidePanel>
  </div>;
}
