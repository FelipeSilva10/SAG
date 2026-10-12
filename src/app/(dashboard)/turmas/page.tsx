"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ClipboardCheck, Plus, School, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useTurmas, type DadosTurma } from "@/hooks/useTurmas";
import { useEscolas } from "@/hooks/useEscolas";
import { useSessionStore } from "@/store/session";
import { Badge, Button, EmptyState, Input, PageHeader, Select, SidePanel, StatCard, Table, type Column, useConfirmDialog } from "@/components/ui";
import { ABREV_DIA, DIAS_SEMANA, type HorarioTurma, type ProgressoCurso, type Turma } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { todayInSaoPaulo } from "@/lib/course-calendar";

const emptySchedule = (): HorarioTurma => ({ diaSemana: "SEGUNDA", horarioInicio: "", horarioFim: "" });

export default function TurmasPage() {
  const { turmas, loading, salvar, excluir } = useTurmas();
  const { escolas } = useEscolas();
  const { sessao, isAdmin } = useSessionStore();
  const admin = isAdmin();
  const router = useRouter();
  const confirm = useConfirmDialog();
  const [busca, setBusca] = useState("");
  const [escolaFiltro, setEscolaFiltro] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [target, setTarget] = useState<Turma | null>(null);
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);
  const [progresso, setProgresso] = useState<ProgressoCurso[]>([]);
  const [form, setForm] = useState<DadosTurma>({ escolaId: "", nome: "", anoLetivo: todayInSaoPaulo().slice(0, 4), professorId: null, dataInicio: null, dataFim: null, totalAulas: null, situacao: "ATIVA", horarios: [emptySchedule()] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!admin) return;
    fetch("/api/professores").then(async res => {
      if (!res.ok) throw new Error("Erro ao buscar professores.");
      setProfessores(await res.json());
    }).catch(error => toast.error(error.message));
  }, [admin]);
  useEffect(() => {
    let active = true;
    fetch(`/api/calendario?inicio=${todayInSaoPaulo()}&fim=${todayInSaoPaulo()}`).then(async res => {
      if (!res.ok) return;
      const data = await res.json();
      if (active) setProgresso(data.progresso);
    }).catch(() => {});
    return () => { active = false; };
  }, [turmas]);

  const filtered = useMemo(() => turmas.filter(t => (!escolaFiltro || t.escolaId === escolaFiltro) && `${t.nome} ${t.escolaNome} ${t.professorNome}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))), [turmas, escolaFiltro, busca]);
  const change = <K extends keyof DadosTurma>(key: K, value: DadosTurma[K]) => setForm(old => ({ ...old, [key]: value }));
  function open(turma?: Turma) {
    setTarget(turma ?? null);
    const school = escolas.find(e => e.id === escolaFiltro) ?? escolas[0];
    setForm(turma ? { ...turma, horarios: turma.horarios.length ? turma.horarios.map(h => ({ ...h })) : [emptySchedule()] } : {
      escolaId: school?.id ?? "", nome: "", anoLetivo: todayInSaoPaulo().slice(0, 4),
      professorId: professores.some(p => p.id === sessao?.id) ? sessao!.id : null,
      dataInicio: school?.dataInicio && school.dataInicio > todayInSaoPaulo() ? school.dataInicio : todayInSaoPaulo(),
      dataFim: null, totalAulas: null, situacao: "ATIVA", horarios: [emptySchedule()],
    });
    setPanelOpen(true);
  }
  async function save() {
    setSaving(true);
    try { await salvar(form, target?.id); toast.success(target ? "Turma atualizada." : "Turma criada com seus horários."); setPanelOpen(false); }
    catch (error) { toast.error((error as Error).message); }
    finally { setSaving(false); }
  }
  async function remove(turma: Turma) {
    if (!await confirm({ title: "Excluir turma", description: `Excluir ${turma.nome}? Turmas com alunos ou chamadas devem ser encerradas para preservar o histórico.`, confirmLabel: "Excluir", danger: true })) return;
    try { await excluir(turma.id); toast.success("Turma excluída."); setPanelOpen(false); }
    catch (error) { toast.error((error as Error).message); }
  }
  const columns: Column<Turma>[] = [
    { key: "nome", header: "Turma", render: t => <div><p className="font-bold">{t.nome}</p><p className="mt-1 text-xs text-[#62798a]">{t.anoLetivo} · {t.professorNome}</p></div> },
    { key: "escolaNome", header: "Escola" },
    { key: "horarios", header: "Dias e horários", render: t => <div className="space-y-1">{t.horarios.length ? t.horarios.map((h, i) => <p key={h.id ?? i} className="text-xs">{ABREV_DIA[h.diaSemana]} · {h.horarioInicio}–{h.horarioFim}</p>) : "Definir horários"}</div> },
    { key: "periodo", header: "Período", render: t => <div className="text-xs"><p>{formatDate(t.dataInicio)}</p><p className="text-[#62798a]">{t.dataFim ? `Até ${formatDate(t.dataFim)}` : t.totalAulas ? `${t.totalAulas} aulas` : "Contínuo"}</p></div> },
    { key: "progresso", header: "Andamento", render: t => { const p = progresso.find(p => p.turmaId === t.id); return <div><Badge variant={t.situacao === "ENCERRADA" ? "gray" : "green"}>{t.situacao === "ENCERRADA" ? "Encerrada" : "Ativa"}</Badge>{p && <p className="mt-1 text-xs">{p.realizadas}{p.total != null ? ` de ${p.total}` : ""} aulas registradas{p.pendentes > 0 && <span className="block text-amber-700">{p.pendentes} sem chamada</span>}</p>}</div>; } },
    { key: "acoes", header: "", render: t => <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); router.push(`/calendario?turmaId=${t.id}`); }}><CalendarDays size={14} /> Calendário</Button> },
  ];
  return <div className="flex h-full">
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader title="Turmas e cursos" searchValue={busca} onSearchChange={setBusca} searchPlaceholder="Buscar turma, escola ou professor" actions={<><Select aria-label="Filtrar escola" value={escolaFiltro} onChange={e => setEscolaFiltro(e.target.value)} options={[{ value: "", label: "Todas as escolas" }, ...escolas.map(e => ({ value: e.id, label: e.nome }))]} />{admin && <Button onClick={() => open()}><Plus size={16} /> Nova turma</Button>}</>} />
      <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3"><StatCard label="Turmas ativas" value={turmas.filter(t => t.situacao === "ATIVA").length} icon={<Users size={18} />} tone="accent" /><StatCard label="Escolas atendidas" value={new Set(turmas.map(t => t.escolaId)).size} icon={<School size={18} />} tone="accent" /><StatCard label="Cursos encerrados" value={turmas.filter(t => t.situacao === "ENCERRADA").length} icon={<ClipboardCheck size={18} />} tone="green" /></div>
        {!filtered.length && !loading ? <EmptyState icon={<Users size={22} />} title="Nenhuma turma encontrada" /> : <Table columns={columns} data={filtered} rowKey={t => t.id} onRowClick={t => open(t)} loading={loading} pageSize={20} />}
      </div>
    </div>
    <SidePanel title={target ? admin ? "Editar turma" : "Detalhes da turma" : "Nova turma"} open={panelOpen} onClose={() => setPanelOpen(false)} width="w-full sm:w-[30rem]">
      <div className="space-y-4">
        <Input label="Nome da turma / curso" value={form.nome} onChange={e => change("nome", e.target.value)} disabled={!admin} placeholder="Ex.: Programação · manhã" />
        <div className="grid grid-cols-2 gap-3"><Input label="Ano letivo" value={form.anoLetivo} onChange={e => change("anoLetivo", e.target.value)} disabled={!admin} /><Select label="Situação" value={form.situacao} onChange={e => change("situacao", e.target.value as Turma["situacao"])} disabled={!admin} options={[{ value: "ATIVA", label: "Ativa" }, { value: "ENCERRADA", label: "Encerrada" }]} /></div>
        <Select label="Escola" value={form.escolaId} onChange={e => change("escolaId", e.target.value)} disabled={!admin} options={[{ value: "", label: "Selecione" }, ...escolas.map(e => ({ value: e.id, label: e.nome }))]} />
        {admin && <Select label="Professor responsável" value={form.professorId ?? ""} onChange={e => change("professorId", e.target.value || null)} options={[{ value: "", label: "Selecione" }, ...professores.map(p => ({ value: p.id, label: p.nome }))]} />}
        <div className="grid grid-cols-2 gap-3"><Input label="Início do curso" type="date" value={form.dataInicio ?? ""} onChange={e => change("dataInicio", e.target.value || null)} disabled={!admin} /><Input label="Término (opcional)" type="date" min={form.dataInicio ?? undefined} value={form.dataFim ?? ""} onChange={e => change("dataFim", e.target.value || null)} disabled={!admin} /></div>
        <Input label="Quantidade de aulas (opcional)" type="number" min={1} max={1000} value={form.totalAulas ?? ""} onChange={e => change("totalAulas", e.target.value ? Number(e.target.value) : null)} hint="Ex.: 22. Sem término e sem quantidade, o curso é contínuo." disabled={!admin} />
        <div className="space-y-3 border-t border-[#e3ebf1] pt-4">
          <p className="text-sm font-bold">Dias e horários de aula</p>
          {form.horarios.map((horario, index) => <div key={index} className="space-y-2 rounded-lg border border-[#e3ebf1] bg-[#f3f7fa] p-3">
            <div className="flex items-end gap-2"><div className="flex-1"><Select label="Dia" value={horario.diaSemana} disabled={!admin} onChange={e => change("horarios", form.horarios.map((h, i) => i === index ? { ...h, diaSemana: e.target.value as HorarioTurma["diaSemana"] } : h))} options={DIAS_SEMANA.filter(d => d === horario.diaSemana || !form.horarios.some(h => h.diaSemana === d)).map(d => ({ value: d, label: d.charAt(0) + d.slice(1).toLocaleLowerCase("pt-BR") }))} /></div>{admin && form.horarios.length > 1 && <Button variant="ghost" aria-label="Remover dia" onClick={() => change("horarios", form.horarios.filter((_, i) => i !== index))}><Trash2 size={15} /></Button>}</div>
            <div className="grid grid-cols-2 gap-2">{(["horarioInicio", "horarioFim"] as const).map(key => <Input key={key} type="time" label={key === "horarioInicio" ? "Início" : "Término"} disabled={!admin} value={horario[key]} onChange={e => change("horarios", form.horarios.map((h, i) => i === index ? { ...h, [key]: e.target.value } : h))} />)}</div>
            {(horario.dataInicio || horario.dataFim) && <p className="text-xs text-[#62798a]">Horário válido: {formatDate(horario.dataInicio)} a {formatDate(horario.dataFim)}. Ajuste esse período no cronograma.</p>}
          </div>)}
          {admin && form.horarios.length < 7 && <Button variant="secondary" size="sm" onClick={() => change("horarios", [...form.horarios, { ...emptySchedule(), diaSemana: DIAS_SEMANA.find(d => !form.horarios.some(h => h.diaSemana === d))! }])}><Plus size={14} /> Adicionar dia</Button>}
        </div>
        {target && <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => router.push(`/chamada?turmaId=${target.id}`)}><ClipboardCheck size={14} /> Chamada</Button><Button size="sm" variant="secondary" onClick={() => router.push(`/relatorios?escolaId=${target.escolaId}`)}>Relatório da escola</Button></div>}
        {admin && <Button onClick={save} loading={saving} className="w-full justify-center">{target ? "Salvar alterações" : "Criar turma"}</Button>}
        {admin && target && <Button variant="ghost" onClick={() => remove(target)} className="w-full justify-center text-red-600"><Trash2 size={14} /> Excluir turma sem alunos ou chamadas</Button>}
      </div>
    </SidePanel>
  </div>;
}
