"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Plus, Trash2, BookOpen, RefreshCw } from "lucide-react";
import { useSessionStore } from "@/store/session";
import { Button, Input, Select, SidePanel, Spinner } from "@/components/ui";
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
    if (!confirm(`Excluir entrada de ${formatarData(entrada.dataAula)} — ${entrada.turmaNome}?`)) return;
    try {
      await fetch(`/api/diario/${entrada.id}`, { method: "DELETE" });
      toast.success("Entrada excluída.");
      if (editando?.id === entrada.id) setPanelOpen(false);
      carregar();
    } catch { toast.error("Erro ao excluir."); }
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 px-4 py-4 bg-white border-b border-slate-200 sm:flex-row sm:items-center sm:flex-wrap sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Diário de Aulas</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Registre o conteúdo e observações de cada aula
            </p>
          </div>

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

          <div className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar título, conteúdo..."
              className="w-full pl-8 pr-4 py-2 text-sm border border-slate-300 rounded-md sm:w-56 focus:outline-none focus:ring-2 focus:ring-[#285a82]/20 bg-white"
            />
          </div>

          <div className="hidden sm:block sm:flex-1" />

          <button
            onClick={carregar}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <RefreshCw size={15} />
          </button>

          <Button onClick={abrirNovo} size="md" className="w-full sm:w-auto">
            <Plus size={14} /> Nova Entrada
          </Button>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <Spinner />
          ) : filtrado.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <BookOpen size={48} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhuma entrada no diário.</p>
              <p className="text-xs">Clique em "Nova Entrada" para começar.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f5f7f9]">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-28">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-40">Turma</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Conteúdo</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {filtrado.map((entrada) => {
                  const temObs = entrada.observacoes && entrada.observacoes.trim() !== "";
                  return (
                    <tr
                      key={entrada.id}
                      onClick={() => abrirEditar(entrada)}
                      className={`border-b border-slate-100 cursor-pointer transition hover:bg-[#f4f8fb] ${
                        temObs ? "bg-amber-50/40" : ""
                      } ${editando?.id === entrada.id ? "bg-blue-50" : ""}`}
                    >
                      <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {formatarData(entrada.dataAula)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{entrada.turmaNome}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {entrada.titulo || <span className="text-gray-400 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {previewConteudo(entrada.conteudo)}
                        {temObs && (
                          <span className="ml-2 text-amber-600 font-semibold">⚠ obs.</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExcluir(entrada); }}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-2 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-400">
            {filtrado.length} entrada{filtrado.length !== 1 ? "s" : ""}
            {busca && ` para "${busca}"`}
            {" · "}
            <span className="text-amber-600">⚠ Linha em destaque = entrada com observações</span>
          </p>
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
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Data da Aula
            </label>
            <input
              type="date"
              value={dataForm}
              onChange={(e) => setDataForm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Input
            label="Título / Tema da Aula"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Introdução a variáveis"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Conteúdo Trabalhado
            </label>
            <p className="text-xs text-gray-400">O que foi abordado, exercícios, recursos...</p>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={5}
              placeholder="Descreva o conteúdo da aula..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Observações
            </label>
            <p className="text-xs text-gray-400">Comportamento, dificuldades, destaques...</p>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Anotações livres sobre a aula ou alunos..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
