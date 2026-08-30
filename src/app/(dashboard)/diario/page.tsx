"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, BookOpen, RefreshCw } from "lucide-react";
import { useSessionStore } from "@/store/session";
import {
  Button,
  Input,
  Select,
  SidePanel,
  PageHeader,
  Table,
  type Column,
  EmptyState,
  useConfirmDialog,
} from "@/components/ui";
import toast from "react-hot-toast";
import type { DiarioAula, Turma } from "@/lib/types";

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.split("T")[0];
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function previewConteudo(c: string): string {
  if (!c || c.trim() === "") return "—";
  const linha = c.split("\n")[0].trim();
  return linha.length > 80 ? linha.slice(0, 77) + "..." : linha;
}

export default function DiarioPage() {
  const { sessao } = useSessionStore();
  const confirm = useConfirmDialog();
  const profId = sessao?.id ?? "";

  const [entradas, setEntradas] = useState<DiarioAula[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroTurmaId, setFiltroTurmaId] = useState("");
  const [busca, setBusca] = useState("");

  // Editor
  const [panelOpen, setPanelOpen] = useState(false);
  const [editando, setEditando] = useState<DiarioAula | null>(null);

  // Form state
  const [turmaIdForm, setTurmaIdForm] = useState("");
  const [dataForm, setDataForm] = useState(new Date().toISOString().slice(0, 10));
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [entradasRes, turmasRes] = await Promise.all([
        fetch(`/api/diario?professorId=${profId}`).then((r) => r.json()),
        fetch(`/api/turmas?professorId=${profId}`).then((r) => r.json()),
      ]);
      setEntradas(Array.isArray(entradasRes) ? entradasRes : []);
      setTurmas(Array.isArray(turmasRes) ? turmasRes : []);
    } catch { toast.error("Erro ao carregar diário."); }
    finally { setLoading(false); }
  }, [profId]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrado = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return entradas.filter((e) => {
      const passaTurma = !filtroTurmaId || e.turmaId === filtroTurmaId;
      const passaBusca = !t ||
        e.titulo.toLowerCase().includes(t) ||
        e.conteudo.toLowerCase().includes(t) ||
        e.observacoes.toLowerCase().includes(t) ||
        e.turmaNome.toLowerCase().includes(t);
      return passaTurma && passaBusca;
    });
  }, [entradas, filtroTurmaId, busca]);

  function abrirNovo() {
    setEditando(null);
    setTurmaIdForm("");
    setDataForm(new Date().toISOString().slice(0, 10));
    setTitulo(""); setConteudo(""); setObservacoes("");
    setPanelOpen(true);
  }

  function abrirEditar(entrada: DiarioAula) {
    setEditando(entrada);
    setTurmaIdForm(entrada.turmaId);
    setDataForm(entrada.dataAula?.split("T")[0] ?? "");
    setTitulo(entrada.titulo);
    setConteudo(entrada.conteudo);
    setObservacoes(entrada.observacoes);
    setPanelOpen(true);
  }

  async function handleSalvar() {
    if (!turmaIdForm || !dataForm) {
      toast.error("Selecione a turma e a data."); return;
    }
    if (!titulo.trim() && !conteudo.trim()) {
      toast.error("Preencha ao menos o título ou o conteúdo."); return;
    }

    setSaving(true);
    try {
      if (!editando) {
        const res = await fetch("/api/diario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professorId: profId,
            turmaId: turmaIdForm,
            dataAula: dataForm,
            titulo: titulo.trim(),
            conteudo: conteudo.trim(),
            observacoes: observacoes.trim(),
          }),
        });
        if (!res.ok) { toast.error("Erro ao salvar."); return; }
        toast.success("Entrada registrada no diário!");
      } else {
        const res = await fetch(`/api/diario/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataAula: dataForm,
            titulo: titulo.trim(),
            conteudo: conteudo.trim(),
            observacoes: observacoes.trim(),
          }),
        });
        if (!res.ok) { toast.error("Erro ao atualizar."); return; }
        toast.success("Entrada atualizada!");
      }
      setPanelOpen(false);
      carregar();
    } catch { toast.error("Erro ao salvar."); }
    finally { setSaving(false); }
  }

  async function handleExcluir(entrada: DiarioAula) {
    const ok = await confirm({
      title: "Excluir entrada do diário",
      description: `Excluir entrada de ${formatarData(entrada.dataAula)} — ${entrada.turmaNome}?`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await fetch(`/api/diario/${entrada.id}`, { method: "DELETE" });
      toast.success("Entrada excluída.");
      if (editando?.id === entrada.id) setPanelOpen(false);
      carregar();
    } catch { toast.error("Erro ao excluir."); }
  }

  const columns: Column<DiarioAula>[] = [
    {
      key: "dataAula",
      header: "Data",
      width: "w-28",
      render: (e) => (
        <span className="whitespace-nowrap font-semibold text-[#1f2d3a]">
          {formatarData(e.dataAula)}
        </span>
      ),
    },
    { key: "turmaNome", header: "Turma", width: "w-40" },
    {
      key: "titulo",
      header: "Título",
      render: (e) => e.titulo || <span className="text-[#8ea0b0]">—</span>,
    },
    {
      key: "conteudo",
      header: "Conteúdo",
      render: (e) => (
        <span className="text-xs text-[#62798a]">
          {previewConteudo(e.conteudo)}
          {e.observacoes.trim() !== "" && (
            <span className="ml-2 font-semibold text-amber-600">⚠ obs.</span>
          )}
        </span>
      ),
    },
    {
      key: "acoes",
      header: "",
      width: "w-16",
      render: (e) => (
        <button
          onClick={(ev) => { ev.stopPropagation(); handleExcluir(e); }}
          className="rounded p-1.5 text-[#8ea0b0] transition hover:bg-red-50 hover:text-red-600"
          aria-label="Excluir entrada"
        >
          <Trash2 size={13} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Diário de Aulas"
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Buscar título, conteúdo…"
          actions={
            <>
              <div className="w-full sm:w-48">
                <Select
                  value={filtroTurmaId}
                  onChange={(e) => setFiltroTurmaId(e.target.value)}
                  options={[
                    { value: "", label: "Todas as turmas" },
                    ...turmas.map((t) => ({ value: t.id, label: t.nome })),
                  ]}
                />
              </div>
              <button
                onClick={carregar}
                className="rounded-lg p-2 text-[#8ea0b0] transition hover:bg-[#f3f7fa] hover:text-[#45566a]"
                aria-label="Atualizar"
              >
                <RefreshCw size={15} />
              </button>
              <Button onClick={abrirNovo} size="md">
                <Plus size={14} /> Nova Entrada
              </Button>
            </>
          }
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {filtrado.length === 0 && !loading ? (
            <EmptyState icon={<BookOpen size={22} />} title="Nenhuma entrada no diário" />
          ) : (
            <Table<DiarioAula>
              columns={columns}
              data={filtrado}
              rowKey={(e) => e.id}
              loading={loading}
              onRowClick={abrirEditar}
              rowClassName={(e) => (e.observacoes.trim() !== "" ? "bg-amber-50/40" : "")}
              pageSize={20}
            />
          )}
        </div>
      </div>

      {/* Painel editor */}
      <SidePanel
        title={editando ? `Editar — ${formatarData(editando.dataAula)}` : "Nova Entrada"}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        width="w-96"
      >
        <div className="space-y-4">
          <Select
            label="Turma"
            value={turmaIdForm}
            onChange={(e) => setTurmaIdForm(e.target.value)}
            options={[
              { value: "", label: "Selecione a turma..." },
              ...turmas.map((t) => ({ value: t.id, label: `${t.nome} (${t.escolaNome})` })),
            ]}
          />

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#45566a]">
              Data da Aula
            </label>
            <input
              type="date"
              value={dataForm}
              onChange={(e) => setDataForm(e.target.value)}
              className="w-full rounded border border-[#d4e1e9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#23638c]/20"
            />
          </div>

          <Input
            label="Título / Tema da Aula"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Introdução a variáveis"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wide text-[#45566a]">
              Conteúdo Trabalhado
            </label>
            <p className="text-xs text-[#8ea0b0]">O que foi abordado, exercícios, recursos...</p>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={5}
              placeholder="Descreva o conteúdo da aula..."
              className="w-full resize-none rounded border border-[#d4e1e9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#23638c]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wide text-[#45566a]">
              Observações
            </label>
            <p className="text-xs text-[#8ea0b0]">Comportamento, dificuldades, destaques...</p>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Anotações livres sobre a aula ou alunos..."
              className="w-full resize-none rounded border border-[#d4e1e9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#23638c]/20"
            />
          </div>

          <Button
            onClick={handleSalvar}
            loading={saving}
            className="w-full justify-center"
          >
            {editando ? "Salvar Alterações" : "Salvar Entrada"}
          </Button>

          {editando && (
            <Button
              variant="danger"
              onClick={() => { handleExcluir(editando); setPanelOpen(false); }}
              className="w-full justify-center"
            >
              <Trash2 size={13} />
              Excluir Entrada
            </Button>
          )}
        </div>
      </SidePanel>
    </div>
  );
}
