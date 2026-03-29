"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Trash2, Pencil, Users } from "lucide-react";
import { useTurmas } from "@/hooks/useTurmas";
import { useEscolas } from "@/hooks/useEscolas";
import { useSessionStore } from "@/store/session";
import { Button, Input, Select, SidePanel, Spinner } from "@/components/ui";
import type { Turma } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit";

export default function TurmasPage() {
  const { turmas, loading, fetchTurmas, criar, atualizar, excluir } = useTurmas();
  const { escolas } = useEscolas(); // Reutilizando as escolas para o select
  const { isAdmin } = useSessionStore();

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
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Turmas</h1>
            {!isAdmin() && <p className="text-xs text-gray-400 mt-0.5">Exibindo apenas suas turmas</p>}
          </div>

          {/* Filtro de Escola (Apenas Admin) */}
          {isAdmin() && (
            <div className="w-64 ml-4">
              <Select
                value={escolaFiltro}
                onChange={(e) => setEscolaFiltro(e.target.value)}
                options={[
                  { value: "", label: "Todas as escolas..." },
                  ...escolas.map((e) => ({ value: e.id, label: e.nome })),
                ]}
              />
            </div>
          )}

          <div className="flex-1" />

          {/* Barra de Busca */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar turma/prof..."
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Botão Nova Turma (Apenas Admin) */}
          {isAdmin() && (
            <Button onClick={abrirNova} size="md">
              <Plus size={14} /> Nova Turma
            </Button>
          )}
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <Spinner />
          ) : turmasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Users size={48} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhuma turma encontrada.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Turma</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Ano</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Escola</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Professor</th>
                  {isAdmin() && <th className="px-4 py-3 w-24" />}
                </tr>
              </thead>
              <tbody>
                {turmasFiltradas.map((turma) => (
                  <tr
                    key={turma.id}
                    onClick={() => abrirDetalhe(turma)}
                    className={`border-b border-gray-100 cursor-pointer transition hover:bg-blue-50 ${editTarget?.id === turma.id ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">{turma.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{turma.anoLetivo}</td>
                    <td className="px-4 py-3 text-gray-600">{turma.escolaNome}</td>
                    <td className="px-4 py-3 text-gray-600">{turma.professorNome}</td>
                    {isAdmin() && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => abrirDetalhe(turma)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleExcluir(turma)} disabled={deleting === turma.id} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-40">
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

      {/* Painel Lateral (Formulário/Detalhes) */}
      <SidePanel title={formMode === "new" ? "Nova Turma" : isAdmin() ? "Editar Turma" : "Detalhes da Turma"} open={panelOpen} onClose={fecharPanel}>
        <Input 
          label="Nome da Turma" 
          value={nome} 
          onChange={(e) => setNome(e.target.value)} 
          placeholder="Ex: 1º Ano A" 
          disabled={!isAdmin()} 
        />
        <Input 
          label="Ano Letivo" 
          value={anoLetivo} 
          onChange={(e) => setAnoLetivo(e.target.value)} 
          placeholder="Ex: 2026" 
          disabled={!isAdmin()} 
        />
        <Select 
          label="Escola" 
          value={escolaIdForm} 
          onChange={(e) => setEscolaIdForm(e.target.value)} 
          disabled={!isAdmin()}
          options={escolas.map((e) => ({ value: e.id, label: e.nome }))} 
        />
        
        {isAdmin() && (
          <Select 
            label="Professor" 
            value={professorIdForm} 
            onChange={(e) => setProfessorIdForm(e.target.value)} 
            options={[
              { value: "", label: "Sem professor atribuído" },
              ...professores.map((p) => ({ value: p.id, label: p.nome })),
            ]} 
          />
        )}

        {isAdmin() && (
          <div className="pt-4">
            <Button onClick={handleSalvar} loading={saving} className="w-full justify-center">
              {formMode === "new" ? "Cadastrar Turma" : "Salvar Alterações"}
            </Button>
            {formMode === "edit" && editTarget && (
              <div className="pt-2 border-t border-gray-100 mt-2">
                <Button variant="danger" onClick={() => handleExcluir(editTarget)} loading={deleting === editTarget.id} className="w-full justify-center">
                  <Trash2 size={13} /> Excluir Turma
                </Button>
              </div>
            )}
          </div>
        )}
      </SidePanel>
    </div>
  );
}