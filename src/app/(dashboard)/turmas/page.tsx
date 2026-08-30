"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Pencil, Users, School, UserRound, CalendarDays, SearchX } from "lucide-react";
import { useTurmas } from "@/hooks/useTurmas";
import { useEscolas } from "@/hooks/useEscolas";
import { useSessionStore } from "@/store/session";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  SidePanel,
  PageHeader,
  StatCard,
  Table,
  type Column,
  useConfirmDialog,
} from "@/components/ui";
import type { Turma } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit";

const DIAS_SEMANA_OPCOES = [
  { value: "SEGUNDA", label: "Segunda-feira" },
  { value: "TERÇA", label: "Terça-feira" },
  { value: "QUARTA", label: "Quarta-feira" },
  { value: "QUINTA", label: "Quinta-feira" },
  { value: "SEXTA", label: "Sexta-feira" },
  { value: "SÁBADO", label: "Sábado" },
];

export default function TurmasPage() {
  const { turmas, loading, fetchTurmas, criar, atualizar, excluir } = useTurmas();
  const { escolas } = useEscolas(); // Reutilizando as escolas para o select
  const { isAdmin } = useSessionStore();
  const confirm = useConfirmDialog();
  const admin = isAdmin();

  const [busca, setBusca] = useState("");
  const [escolaFiltro, setEscolaFiltro] = useState<string>("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("new");
  const [editTarget, setEditTarget] = useState<Turma | null>(null);

  // Estado dos Professores (Buscado apenas se for Admin)
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);

  // Estados do Form
  const [nome, setNome] = useState("");
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString());
  const [escolaIdForm, setEscolaIdForm] = useState("");
  const [professorIdForm, setProfessorIdForm] = useState("");
  const [diaSemanaForm, setDiaSemanaForm] = useState("SEGUNDA");
  const [horarioInicioForm, setHorarioInicioForm] = useState("");
  const [horarioFimForm, setHorarioFimForm] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Busca lista de professores para o ComboBox (apenas admin)
  useEffect(() => {
    if (isAdmin()) {
      fetch("/api/professores")
        .then((res) => res.json())
        .then(setProfessores)
        .catch(console.error);
    }
  }, [isAdmin]);

  // Recarrega lista de turmas se o Admin mudar o filtro de escola lá no cabeçalho
  useEffect(() => {
    if (isAdmin()) fetchTurmas(escolaFiltro);
  }, [escolaFiltro, isAdmin, fetchTurmas]);

  // Filtro na tabela (Equivalente ao FilteredList do Java)
  const turmasFiltradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return turmas;
    return turmas.filter(
      (turma) =>
        turma.nome.toLowerCase().includes(t) ||
        turma.escolaNome.toLowerCase().includes(t) ||
        turma.professorNome.toLowerCase().includes(t)
    );
  }, [turmas, busca]);

  const escolasComTurma = new Set(turmas.map((turma) => turma.escolaId)).size;
  const turmasSemProfessor = turmas.filter((turma) => !turma.professorId).length;

  function abrirNova() {
    setFormMode("new");
    setEditTarget(null);
    setNome("");
    setAnoLetivo(new Date().getFullYear().toString());
    setEscolaIdForm(escolaFiltro || (escolas.length > 0 ? escolas[0].id : ""));
    setProfessorIdForm("");
    setDiaSemanaForm("SEGUNDA");
    setHorarioInicioForm("");
    setHorarioFimForm("");
    setPanelOpen(true);
  }

  function abrirDetalhe(turma: Turma) {
    setFormMode("edit");
    setEditTarget(turma);
    setNome(turma.nome);
    setAnoLetivo(turma.anoLetivo);
    setEscolaIdForm(turma.escolaId);
    setProfessorIdForm(turma.professorId || "");
    setDiaSemanaForm("SEGUNDA");
    setHorarioInicioForm("");
    setHorarioFimForm("");
    setPanelOpen(true);
  }

  function fecharPanel() {
    setPanelOpen(false);
    setEditTarget(null);
  }

  async function handleSalvar() {
    if (!nome.trim() || !anoLetivo.trim() || !escolaIdForm) {
      toast.error("Preencha nome, ano letivo e escola.");
      return;
    }
    if (formMode === "new" && (!professorIdForm || !horarioInicioForm || !horarioFimForm)) {
      toast.error("Informe o professor e o horário da turma.");
      return;
    }
    if (formMode === "new" && horarioInicioForm >= horarioFimForm) {
      toast.error("O horário de término deve ser posterior ao de início.");
      return;
    }
    setSaving(true);
    try {
      if (formMode === "new") {
        await criar(escolaIdForm, nome.trim(), anoLetivo.trim(), professorIdForm, {
          diaSemana: diaSemanaForm,
          horarioInicio: horarioInicioForm,
          horarioFim: horarioFimForm,
        });
        toast.success("Turma cadastrada com sucesso!");
      } else if (editTarget) {
        const profId = professorIdForm === "" ? null : professorIdForm;
        await atualizar(editTarget.id, escolaIdForm, nome.trim(), anoLetivo.trim(), profId);
        toast.success("Turma atualizada!");
      }
      fecharPanel();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(turma: Turma) {
    const ok = await confirm({
      title: "Excluir turma",
      description: `Excluir a turma "${turma.nome}"?`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    setDeleting(turma.id);
    try {
      await excluir(turma.id);
      toast.success("Turma removida.");
      if (editTarget?.id === turma.id) fecharPanel();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao excluir turma.");
    } finally {
      setDeleting(null);
    }
  }

  const columns: Column<Turma>[] = [
    {
      key: "nome",
      header: "Turma",
      render: (turma) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-[#e8f1f6] text-[#23638c]">
            <Users size={16} />
          </div>
          <div>
            <p className="font-bold text-[#1f2d3a]">{turma.nome}</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-[#8ea0b0]">
              <CalendarDays size={12} /> Ano letivo {turma.anoLetivo}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "escolaNome",
      header: "Escola",
      render: (turma) => (
        <div className="flex items-center gap-2 text-[#45566a]">
          <School size={15} className="text-[#8ea0b0]" />
          <span>{turma.escolaNome}</span>
        </div>
      ),
    },
    {
      key: "professorNome",
      header: "Professor responsável",
      render: (turma) => (
        <div className="flex items-center gap-2 text-[#45566a]">
          <UserRound size={15} className="text-[#8ea0b0]" />
          <span>{turma.professorNome || "Nenhum professor"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (turma) => (
        <Badge variant={turma.professorId ? "green" : "amber"} dot>
          {turma.professorId ? "Atribuída" : "Pendente"}
        </Badge>
      ),
    },
    ...(admin
      ? [
          {
            key: "acoes",
            header: "",
            width: "w-24",
            render: (turma: Turma) => (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => abrirDetalhe(turma)}
                  aria-label={`Editar ${turma.nome}`}
                  className="rounded-md p-2 text-[#8ea0b0] transition hover:bg-[#e8f1f6] hover:text-[#23638c]"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleExcluir(turma)}
                  disabled={deleting === turma.id}
                  aria-label={`Excluir ${turma.nome}`}
                  className="rounded-lg p-2 text-[#8ea0b0] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Turmas"
          subtitle={admin ? "Organize as turmas por escola, ano letivo e professor responsável." : "Turmas vinculadas a você."}
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Buscar turma, escola ou professor"
          actions={
            <>
              {admin && (
                <div className="w-full sm:w-56">
                  <Select
                    aria-label="Filtrar por escola"
                    value={escolaFiltro}
                    onChange={(e) => setEscolaFiltro(e.target.value)}
                    options={[
                      { value: "", label: "Todas as escolas" },
                      ...escolas.map((e) => ({ value: e.id, label: e.nome })),
                    ]}
                  />
                </div>
              )}
              {admin && (
                <Button onClick={abrirNova} size="md">
                  <Plus size={16} /> Nova turma
                </Button>
              )}
            </>
          }
        />

        <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total de turmas" value={turmas.length} icon={<Users size={18} />} tone="accent" />
            <StatCard label="Escolas atendidas" value={escolasComTurma} icon={<School size={18} />} tone="accent" />
            <StatCard label="Sem professor" value={turmasSemProfessor} icon={<UserRound size={18} />} tone={turmasSemProfessor ? "amber" : "green"} />
          </div>

          {turmasFiltradas.length === 0 && !loading ? (
            <EmptyState
              icon={<SearchX size={22} />}
              title={busca || escolaFiltro ? "Nenhuma turma encontrada" : "Você ainda não tem turmas"}
              message={busca || escolaFiltro ? "Tente remover os filtros ou buscar por outro termo." : "Cadastre a primeira turma para começar a organizar a operação."}
              action={admin && !busca && !escolaFiltro ? <Button size="sm" onClick={abrirNova}><Plus size={14} /> Nova turma</Button> : undefined}
            />
          ) : (
            <Table<Turma>
              columns={columns}
              data={turmasFiltradas}
              rowKey={(t) => t.id}
              loading={loading}
              onRowClick={abrirDetalhe}
              rowClassName={(t) => (editTarget?.id === t.id ? "bg-[#e8f1f6]" : "")}
              pageSize={20}
            />
          )}
        </div>
      </div>

      <SidePanel
        title={formMode === "new" ? "Nova turma" : admin ? "Editar turma" : "Detalhes da turma"}
        subtitle={formMode === "new" ? "Preencha os dados para criar o vínculo." : "Confira ou atualize as informações cadastradas."}
        open={panelOpen}
        onClose={fecharPanel}
        width="w-80 sm:w-[26rem]"
      >
        <div className="rounded-md border border-[#d4e1e9] bg-[#f3f7fa] px-4 py-3 text-xs leading-relaxed text-[#1a4b6b]">
          {admin
            ? formMode === "new"
              ? "Defina o professor e o horário para que a turma já seja criada com seu cronograma."
              : "Atualize os vínculos da turma. Os horários podem ser gerenciados no Cronograma."
            : "Você está visualizando os dados da turma. Somente administradores podem editar vínculos."}
        </div>
        <div className="border-t border-[#e3ebf1] pt-4">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#62798a]">Informações básicas</p>
          <div className="space-y-4">
            <Input label="Nome da turma" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: 1º Ano A" disabled={!admin} />
            <Input label="Ano letivo" value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)} placeholder="Ex.: 2026" inputMode="numeric" disabled={!admin} />
            <Select label="Escola" value={escolaIdForm} onChange={(e) => setEscolaIdForm(e.target.value)} disabled={!admin} options={escolas.map((e) => ({ value: e.id, label: e.nome }))} />
            {admin && <Select label="Professor responsável" value={professorIdForm} onChange={(e) => setProfessorIdForm(e.target.value)} options={[{ value: "", label: formMode === "new" ? "Selecione o professor" : "Ainda não atribuir" }, ...professores.map((p) => ({ value: p.id, label: p.nome }))]} />}
            {admin && formMode === "new" && (
              <>
                <Select label="Dia da semana" value={diaSemanaForm} onChange={(e) => setDiaSemanaForm(e.target.value)} options={DIAS_SEMANA_OPCOES} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Horário de início" type="time" value={horarioInicioForm} onChange={(e) => setHorarioInicioForm(e.target.value)} />
                  <Input label="Horário de término" type="time" value={horarioFimForm} onChange={(e) => setHorarioFimForm(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>
        {admin && (
          <div className="space-y-3 border-t border-[#e3ebf1] pt-5">
            <Button onClick={handleSalvar} loading={saving} className="w-full justify-center">{formMode === "new" ? "Criar turma" : "Salvar alterações"}</Button>
            {formMode === "edit" && editTarget && <Button variant="ghost" onClick={() => handleExcluir(editTarget)} loading={deleting === editTarget.id} className="w-full justify-center text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 size={14} /> Excluir turma</Button>}
          </div>
        )}
      </SidePanel>
    </div>
  );
}
