"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { useProfessores } from "@/hooks/useProfessores";
import { useSessionStore } from "@/store/session";
import {
  Badge,
  Button,
  Input,
  SidePanel,
  Spinner,
  PageHeader,
  Table,
  type Column,
  EmptyState,
  useConfirmDialog,
} from "@/components/ui";
import type { Professor, Turma } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit";

export default function ProfessoresPage() {
  const { professores, loading, criar, atualizar, excluir } = useProfessores();
  const { isAdmin } = useSessionStore();
  const confirm = useConfirmDialog();
  const admin = isAdmin();

  const [busca, setBusca] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("new");
  const [editTarget, setEditTarget] = useState<Professor | null>(null);

  // Estados Form
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);

  // Turmas atribuídas (Para a edição)
  const [turmasAtribuidas, setTurmasAtribuidas] = useState<Turma[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  const professoresFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return professores;
    return professores.filter(
      (p) => p.nome.toLowerCase().includes(t) || p.email.toLowerCase().includes(t)
    );
  }, [professores, busca]);

  function abrirNovo() {
    setFormMode("new");
    setEditTarget(null);
    setNome("");
    setEmail("");
    setSenha("");
    setTurmasAtribuidas([]);
    setPanelOpen(true);
  }

  function abrirDetalhe(prof: Professor) {
    setFormMode("edit");
    setEditTarget(prof);
    setNome(prof.nome);
    setEmail(prof.email);
    // A API não devolve senhas. Em edição, campo vazio significa manter a atual.
    setSenha("");
    setPanelOpen(true);
    buscarTurmasDoProfessor(prof.id);
  }

  async function buscarTurmasDoProfessor(profId: string) {
    setLoadingTurmas(true);
    try {
      const res = await fetch(`/api/turmas?professorId=${profId}`);
      if (res.ok) setTurmasAtribuidas(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTurmas(false);
    }
  }

  async function handleSalvar() {
    if (!nome.trim() || !email.trim() || (formMode === "new" && !senha)) {
      toast.error(formMode === "new" ? "Preencha nome, e-mail e senha inicial." : "Preencha nome e e-mail.");
      return;
    }
    if (senha && senha.length < 6) return toast.error("Senha mínima de 6 caracteres.");

    setSaving(true);
    try {
      if (formMode === "new") {
        await criar({ nome, email, senha });
        toast.success("Professor cadastrado com sucesso!");
      } else if (editTarget) {
        await atualizar(editTarget.id, { nome, email, senha });
        toast.success("Professor atualizado!");
      }
      setPanelOpen(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(prof: Professor) {
    const ok = await confirm({
      title: "Excluir professor",
      description: `Excluir o professor "${prof.nome}"? Esta ação removerá os vínculos com suas turmas.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await excluir(prof.id);
      toast.success("Professor removido.");
      if (editTarget?.id === prof.id) setPanelOpen(false);
    } catch {
      toast.error("Erro ao excluir professor.");
    }
  }

  const columns: Column<Professor>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (p) => <span className="font-semibold text-[#1f2d3a]">{p.nome}</span>,
    },
    { key: "email", header: "E-mail" },
    ...(admin
      ? [
          {
            key: "situacao",
            header: "Situação",
            render: (p: Professor) => (
              <Badge variant={p.accessStatus === "ATIVO" ? "green" : "red"} dot>
                {p.mustChangeSenha ? "Troca pendente" : p.accessStatus === "ATIVO" ? "Acesso ativo" : "Acesso suspenso"}
              </Badge>
            ),
          },
          {
            key: "acoes",
            header: "",
            width: "w-24",
            render: (p: Professor) => (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => abrirDetalhe(p)} className="rounded p-1.5 text-[#8ea0b0] transition hover:bg-[#f3f7fa] hover:text-[#23638c]" aria-label="Editar professor">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleExcluir(p)} className="rounded p-1.5 text-[#8ea0b0] transition hover:bg-red-50 hover:text-red-600" aria-label="Excluir professor">
                  <Trash2 size={13} />
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
          title="Professores"
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Buscar por nome ou e-mail…"
          actions={
            admin && (
              <Button onClick={abrirNovo} size="md">
                <Plus size={14} /> Novo Professor
              </Button>
            )
          }
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {professoresFiltrados.length === 0 && !loading ? (
            <EmptyState icon={<Users size={22} />} title="Nenhum professor encontrado" />
          ) : (
            <Table<Professor>
              columns={columns}
              data={professoresFiltrados}
              rowKey={(p) => p.id}
              loading={loading}
              onRowClick={admin ? abrirDetalhe : undefined}
              pageSize={20}
            />
          )}
        </div>
      </div>

      {/* Painel Lateral */}
      <SidePanel
        title={formMode === "new" ? "Novo Professor" : `Editar: ${editTarget?.nome ?? ""}`}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      >
        <div className="space-y-4">
          <Input label="Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} disabled={!admin} />
          <Input label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!admin || formMode === "edit"} />

          {admin && (
          <Input label={formMode === "new" ? "Senha inicial" : "Nova senha (opcional)"} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder={formMode === "new" ? "Mínimo de 6 caracteres" : "Deixe em branco para manter"} hint={formMode === "edit" ? "A senha atual nunca é exibida." : undefined} />
          )}

          {admin && (
            <div className="pt-2">
              <Button onClick={handleSalvar} loading={saving} className="w-full justify-center">
                {formMode === "new" ? "Cadastrar Professor" : "Salvar Alterações"}
              </Button>
            </div>
          )}

          {/* Subtabela de Turmas Atribuídas (Aparece apenas na Edição) */}
          {formMode === "edit" && (
            <div className="mt-4 border-t border-[#e3ebf1] pt-6">
              <h3 className="mb-3 text-sm font-bold text-[#1f2d3a]">Turmas deste Professor</h3>

              {loadingTurmas ? (
                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
              ) : turmasAtribuidas.length === 0 ? (
                <div className="rounded-lg border border-[#e3ebf1] bg-[#f3f7fa] p-4 text-center text-xs text-[#8ea0b0]">
                  Sem turmas atribuídas no momento.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[#e3ebf1]">
                  <table className="w-full text-xs">
                    <thead className="border-b border-[#e3ebf1] bg-[#f3f7fa]">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-[#62798a]">Turma</th>
                        <th className="px-3 py-2 text-left font-bold text-[#62798a]">Escola</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turmasAtribuidas.map((t) => (
                        <tr key={t.id} className="border-b border-[#eef2f7] last:border-0 hover:bg-[#f3f7fa]">
                          <td className="px-3 py-2 font-semibold text-[#1f2d3a]">{t.nome}</td>
                          <td className="px-3 py-2 text-[#62798a]">{t.escolaNome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </SidePanel>
    </div>
  );
}
