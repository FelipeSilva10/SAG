"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Trash2, Pencil, Users } from "lucide-react";
import { useProfessores } from "@/hooks/useProfessores";
import { useSessionStore } from "@/store/session";
import { Button, Input, SidePanel, Spinner } from "@/components/ui";
import type { Professor, Turma } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit";

export default function ProfessoresPage() {
  const { professores, loading, criar, atualizar, excluir } = useProfessores();
  const { isAdmin } = useSessionStore();

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
    setSenha(prof.senha);
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
    if (!nome.trim() || !email.trim() || !senha) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (senha.length < 6) return toast.error("Senha mínima de 6 caracteres.");

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
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(prof: Professor) {
    if (!confirm(`Excluir o professor "${prof.nome}"? Esta ação removerá os vínculos com suas turmas.`)) return;
    try {
      await excluir(prof.id);
      toast.success("Professor removido.");
      if (editTarget?.id === prof.id) setPanelOpen(false);
    } catch (err: any) {
      toast.error("Erro ao excluir professor.");
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">Professores</h1>
          
          <div className="flex-1" />

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {isAdmin() && (
            <Button onClick={abrirNovo} size="md">
              <Plus size={14} /> Novo Professor
            </Button>
          )}
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <Spinner />
          ) : professoresFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Users size={48} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhum professor encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">E-mail</th>
                  {isAdmin() && <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Senha</th>}
                  {isAdmin() && <th className="px-4 py-3 w-24" />}
                </tr>
              </thead>
              <tbody>
                {professoresFiltrados.map((prof) => (
                  <tr
                    key={prof.id}
                    onClick={() => isAdmin() ? abrirDetalhe(prof) : undefined}
                    className={`border-b border-gray-100 transition 
                      ${isAdmin() ? "cursor-pointer hover:bg-blue-50" : ""}
                      ${editTarget?.id === prof.id ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">{prof.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{prof.email}</td>
                    {isAdmin() && <td className="px-4 py-3 text-gray-500 font-mono text-xs">{prof.senha}</td>}
                    {isAdmin() && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => abrirDetalhe(prof)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleExcluir(prof)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
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
          <Input label="Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} disabled={!isAdmin()} />
          <Input label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isAdmin() || formMode === "edit"} />
          
          {isAdmin() && (
            <Input label="Senha" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Min. 6 caracteres" />
          )}

          {isAdmin() && (
            <div className="pt-2">
              <Button onClick={handleSalvar} loading={saving} className="w-full justify-center">
                {formMode === "new" ? "Cadastrar Professor" : "Salvar Alterações"}
              </Button>
            </div>
          )}

          {/* Subtabela de Turmas Atribuídas (Aparece apenas na Edição) */}
          {formMode === "edit" && (
            <div className="pt-6 border-t border-gray-100 mt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Turmas deste Professor</h3>
              
              {loadingTurmas ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : turmasAtribuidas.length === 0 ? (
                <div className="text-xs text-gray-400 p-4 border border-gray-100 rounded-lg text-center bg-gray-50">
                  Sem turmas atribuídas no momento.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Turma</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Escola</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turmasAtribuidas.map((t) => (
                        <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{t.nome}</td>
                          <td className="px-3 py-2 text-gray-500">{t.escolaNome}</td>
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