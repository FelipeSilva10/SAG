"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, School } from "lucide-react";
import { useEscolas } from "@/hooks/useEscolas";
import { useSessionStore } from "@/store/session";
import {
  Button,
  Input,
  Select,
  SidePanel,
  Badge,
  PageHeader,
  Table,
  type Column,
  EmptyState,
  useConfirmDialog,
} from "@/components/ui";
import type { Escola } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit";

export default function EscolasPage() {
  const { escolas, loading, criar, atualizar, excluir } = useEscolas();
  const { isAdmin } = useSessionStore();
  const confirm = useConfirmDialog();

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
    const ok = await confirm({
      title: "Excluir escola",
      description: `Excluir a escola "${escola.nome}"? Esta ação removerá todas as turmas vinculadas.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
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

  const columns: Column<Escola>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (e: Escola) => <span className="font-semibold text-[#1f2d3a]">{e.nome}</span>,
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (e: Escola) => (
        <Badge variant={e.tipo === "PRIVADA" ? "amber" : "blue"}>{e.tipoLabel}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (e: Escola) => (
        <Badge variant={e.status === "ativo" ? "green" : "gray"} dot>
          {e.status}
        </Badge>
      ),
    },
    ...(admin
      ? [
          {
            key: "acoes",
            header: "",
            width: "w-24",
            render: (e: Escola) => (
              <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                <button
                  onClick={() => abrirEditar(e)}
                  className="rounded p-1.5 text-[#8ea0b0] transition hover:bg-[#f3f7fa] hover:text-[#23638c]"
                  aria-label="Editar escola"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleExcluir(e)}
                  className="rounded p-1.5 text-[#8ea0b0] transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Excluir escola"
                >
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
          title="Escolas"
          subtitle={`${stats.total} escola${stats.total !== 1 ? "s" : ""} · ${stats.publicas} pública${stats.publicas !== 1 ? "s" : ""} · ${stats.privadas} privada${stats.privadas !== 1 ? "s" : ""}`}
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Buscar escola…"
          actions={
            admin && (
              <Button onClick={abrirNova} size="md">
                <Plus size={14} /> Nova Escola
              </Button>
            )
          }
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {escolasFiltradas.length === 0 && !loading ? (
            <EmptyState
              icon={<School size={22} />}
              title="Nenhuma escola encontrada"
              message={admin ? 'Clique em "Nova Escola" para começar.' : undefined}
            />
          ) : (
            <Table<Escola>
              columns={columns}
              data={escolasFiltradas}
              rowKey={(e) => e.id}
              loading={loading}
              onRowClick={admin ? abrirEditar : undefined}
              pageSize={20}
            />
          )}
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
