"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Trash2, Pencil, School } from "lucide-react";
import { useEscolas } from "@/hooks/useEscolas";
import { useSessionStore } from "@/store/session";
import { Button, Input, Select, SidePanel, Spinner, Badge } from "@/components/ui";
import type { Escola } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit";

export default function EscolasPage() {
  const { escolas, loading, criar, atualizar, excluir } = useEscolas();
  const { isAdmin } = useSessionStore();

  const admin = useMemo(() => isAdmin(), [isAdmin]);

  const [busca, setBusca] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("new");
  const [editTarget, setEditTarget] = useState<Escola | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"PUBLICA" | "PRIVADA">("PUBLICA");
  const [saving, setSaving] = useState(false);

  const escolasFiltradas = useMemo(() => {
    const normalize = (v: string) =>
      v
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();

    const t = normalize(busca.trim());

    if (!t) return escolas;

    return escolas.filter((e) =>
      normalize(e.nome).includes(t) ||
      normalize(e.tipoLabel).includes(t) ||
      normalize(e.status).includes(t)
    );
  }, [escolas, busca]);

  const stats = useMemo(() => {
    let publicas = 0;
    let privadas = 0;

    for (const escola of escolas) {
      if (escola.tipo === "PUBLICA") publicas++;
      else privadas++;
    }

    return {
      total: escolas.length,
      publicas,
      privadas,
    };
  }, [escolas]);

  function abrirNova() {
    setFormMode("new");
    setEditTarget(null);
    setNome("");
    setTipo("PUBLICA");
    setPanelOpen(true);
  }

  function abrirEditar(escola: Escola) {
    setFormMode("edit");
    setEditTarget(escola);
    setNome(escola.nome);
    setTipo(escola.tipo);
    setPanelOpen(true);
  }

  async function handleSalvar() {
    if (!nome.trim()) {
      toast.error("Nome da escola é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      if (formMode === "new") {
        await criar(nome.trim(), tipo);
        toast.success("Escola cadastrada com sucesso!");
      } else if (editTarget) {
        await atualizar(editTarget.id, nome.trim(), tipo);
        toast.success("Escola atualizada!");
      }
      setPanelOpen(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(escola: Escola) {
    if (
      !confirm(
        `Excluir a escola "${escola.nome}"? Esta ação removerá todas as turmas vinculadas.`
      )
    )
      return;
    try {
      await excluir(escola.id);
      toast.success("Escola removida.");
      if (editTarget?.id === escola.id) setPanelOpen(false);
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          "Erro ao excluir escola. Verifique se há turmas vinculadas."
      );
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-3 px-4 py-4 bg-white border-b border-slate-200 sm:flex-row sm:items-center sm:flex-wrap sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Escolas</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.total} escola{stats.total !== 1 ? "s" : ""} &middot;{" "}
              {stats.publicas} pública{stats.publicas !== 1 ? "s" : ""} &middot;{" "}
              {stats.privadas} privada{stats.privadas !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="hidden sm:block sm:flex-1" />

          <div className="relative w-full sm:w-auto">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar escola..."
              className="w-full pl-8 pr-4 py-2 text-sm border border-slate-300 rounded-md sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#285a82]/20 bg-white"
            />
          </div>

          {admin && (
            <Button onClick={abrirNova} size="md" className="w-full sm:w-auto">
              <Plus size={14} /> Nova Escola
            </Button>
          )}
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <Spinner />
          ) : escolasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <School size={48} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhuma escola encontrada.</p>
              {admin && (
                <p className="text-xs">
                  Clique em &ldquo;Nova Escola&rdquo; para começar.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f5f7f9]">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  {admin && <th className="px-4 py-3 w-24" />}
                </tr>
              </thead>
              <tbody>
                {escolasFiltradas.map((escola) => (
                  <tr
                    key={escola.id}
                    onClick={() => (admin ? abrirEditar(escola) : undefined)}
                    className={`border-b border-gray-100 transition ${
                      admin ? "cursor-pointer hover:bg-[#f4f8fb]" : ""
                    } ${editTarget?.id === escola.id ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {escola.nome}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={escola.tipo === "PRIVADA" ? "amber" : "blue"}>
                        {escola.tipoLabel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={escola.status === "ativo" ? "green" : "gray"}
                        dot
                      >
                        {escola.status}
                      </Badge>
                    </td>
                    {admin && (
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => abrirEditar(escola)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleExcluir(escola)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                          >
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

        {/* Rodapé com contador */}
        <div className="px-6 py-2 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-400">
            {escolasFiltradas.length} resultado
            {escolasFiltradas.length !== 1 ? "s" : ""}
            {busca && ` para "${busca}"`}
          </p>
        </div>
      </div>

      {/* Painel Lateral */}
      <SidePanel
        title={formMode === "new" ? "Nova Escola" : "Editar Escola"}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      >
        <div className="space-y-4">
          <Input
            label="Nome da Escola"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: E.M. Santos Dumont"
            autoFocus
          />
          <Select
            label="Tipo"
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as "PUBLICA" | "PRIVADA")
            }
            options={[
              { value: "PUBLICA", label: "Pública" },
              { value: "PRIVADA", label: "Privada" },
            ]}
          />

          <div className="pt-2">
            <Button
              onClick={handleSalvar}
              loading={saving}
              className="w-full justify-center"
            >
              {formMode === "new" ? "Cadastrar Escola" : "Salvar Alterações"}
            </Button>
          </div>

          {formMode === "edit" && editTarget && (
            <Button
              variant="danger"
              onClick={() => {
                handleExcluir(editTarget);
                setPanelOpen(false);
              }}
              className="w-full justify-center"
            >
              <Trash2 size={13} />
              Excluir Escola
            </Button>
          )}
        </div>
      </SidePanel>
    </div>
  );
}
