"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Trash2, Pencil, Users, School, UserRound, CalendarDays, SearchX } from "lucide-react";
import { useTurmas } from "@/hooks/useTurmas";
import { useEscolas } from "@/hooks/useEscolas";
import { useSessionStore } from "@/store/session";
import { Badge, Button, EmptyState, Input, Select, SidePanel, Spinner } from "@/components/ui";
import type { Turma } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit";

export default function TurmasPage() {
  const { turmas, loading, fetchTurmas, criar, atualizar, excluir } = useTurmas();
  const { escolas } = useEscolas(); // Reutilizando as escolas para o select
  const { isAdmin } = useSessionStore();
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
    setPanelOpen(true);
  }

  function abrirDetalhe(turma: Turma) {
    setFormMode("edit");
    setEditTarget(turma);
    setNome(turma.nome);
    setAnoLetivo(turma.anoLetivo);
    setEscolaIdForm(turma.escolaId);
    setProfessorIdForm(turma.professorId || "");
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
    setSaving(true);
    try {
      const profId = professorIdForm === "" ? null : professorIdForm;
      if (formMode === "new") {
        await criar(escolaIdForm, nome.trim(), anoLetivo.trim(), profId);
        toast.success("Turma cadastrada com sucesso!");
      } else if (editTarget) {
        await atualizar(editTarget.id, escolaIdForm, nome.trim(), anoLetivo.trim(), profId);
        toast.success("Turma atualizada!");
      }
      fecharPanel();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(turma: Turma) {
    if (!confirm(`Excluir a turma "${turma.nome}"?`)) return;
    setDeleting(turma.id);
    try {
      await excluir(turma.id);
      toast.success("Turma removida.");
      if (editTarget?.id === turma.id) fecharPanel();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir turma.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Gestão acadêmica</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Turmas</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Organize as turmas por escola, ano letivo e professor responsável.
            {!admin && " Aqui estão apenas as turmas vinculadas a você."}
          </p>
        </div>
        {admin && (
          <Button onClick={abrirNova} size="md" className="self-start sm:self-auto">
            <Plus size={16} /> Nova turma
          </Button>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total de turmas" value={turmas.length} icon={<Users size={18} />} tone="indigo" />
        <SummaryCard label="Escolas atendidas" value={escolasComTurma} icon={<School size={18} />} tone="sky" />
        <SummaryCard label="Sem professor" value={turmasSemProfessor} icon={<UserRound size={18} />} tone={turmasSemProfessor ? "amber" : "green"} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lista de turmas</h2>
              <p className="mt-1 text-xs text-slate-500">
                {turmasFiltradas.length} resultado{turmasFiltradas.length === 1 ? "" : "s"} encontrado{turmasFiltradas.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
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
              <div className="relative w-full sm:w-72">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar turma, escola ou professor"
                  aria-label="Buscar turmas"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-10"><Spinner text="Carregando turmas..." /></div>
        ) : turmasFiltradas.length === 0 ? (
          <EmptyState
            icon={<SearchX size={22} />}
            title={busca || escolaFiltro ? "Nenhuma turma encontrada" : "Você ainda não tem turmas"}
            message={busca || escolaFiltro ? "Tente remover os filtros ou buscar por outro termo." : "Cadastre a primeira turma para começar a organizar a operação."}
            action={admin && !busca && !escolaFiltro ? <Button size="sm" onClick={abrirNova}><Plus size={14} /> Nova turma</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Turma</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Escola</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Professor responsável</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Status</th>
                  {admin && <th className="w-24 px-4 py-3.5" aria-label="Ações" />}
                </tr>
              </thead>
              <tbody>
                {turmasFiltradas.map((turma) => (
                  <tr
                    key={turma.id}
                    onClick={() => abrirDetalhe(turma)}
                    className={`group cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/40 ${editTarget?.id === turma.id ? "bg-indigo-50/60" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Users size={16} /></div>
                        <div>
                          <p className="font-bold text-slate-800">{turma.nome}</p>
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={12} /> Ano letivo {turma.anoLetivo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-slate-600"><School size={15} className="text-slate-400" /><span>{turma.escolaNome}</span></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-slate-600"><UserRound size={15} className="text-slate-400" /><span>{turma.professorNome || "Nenhum professor"}</span></div>
                    </td>
                    <td className="px-4 py-4"><Badge variant={turma.professorId ? "green" : "amber"} dot>{turma.professorId ? "Atribuída" : "Pendente"}</Badge></td>
                    {admin && (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => abrirDetalhe(turma)} aria-label={`Editar ${turma.nome}`} title="Editar turma" className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-100 hover:text-indigo-600"><Pencil size={15} /></button>
                          <button type="button" onClick={() => handleExcluir(turma)} disabled={deleting === turma.id} aria-label={`Excluir ${turma.nome}`} title="Excluir turma" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SidePanel
        title={formMode === "new" ? "Nova turma" : admin ? "Editar turma" : "Detalhes da turma"}
        subtitle={formMode === "new" ? "Preencha os dados para criar o vínculo." : "Confira ou atualize as informações cadastradas."}
        open={panelOpen}
        onClose={fecharPanel}
        width="w-80 sm:w-[26rem]"
      >
        <div className="rounded-xl bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-800">
          {admin ? "Uma turma precisa estar vinculada a uma escola. O professor pode ser atribuído agora ou depois." : "Você está visualizando os dados da turma. Somente administradores podem editar vínculos."}
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Informações básicas</p>
          <div className="space-y-4">
            <Input label="Nome da turma" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: 1º Ano A" disabled={!admin} />
            <Input label="Ano letivo" value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)} placeholder="Ex.: 2026" inputMode="numeric" disabled={!admin} />
            <Select label="Escola" value={escolaIdForm} onChange={(e) => setEscolaIdForm(e.target.value)} disabled={!admin} options={escolas.map((e) => ({ value: e.id, label: e.nome }))} />
            {admin && <Select label="Professor responsável" value={professorIdForm} onChange={(e) => setProfessorIdForm(e.target.value)} options={[{ value: "", label: "Ainda não atribuir" }, ...professores.map((p) => ({ value: p.id, label: p.nome }))]} />}
          </div>
        </div>
        {admin && (
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <Button onClick={handleSalvar} loading={saving} className="w-full justify-center">{formMode === "new" ? "Criar turma" : "Salvar alterações"}</Button>
            {formMode === "edit" && editTarget && <Button variant="ghost" onClick={() => handleExcluir(editTarget)} loading={deleting === editTarget.id} className="w-full justify-center text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 size={14} /> Excluir turma</Button>}
          </div>
        )}
      </SidePanel>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "indigo" | "sky" | "amber" | "green";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}
