"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle, XCircle, RefreshCw, Plus, ChevronRight, X,
  Clock, Users, TrendingUp, AlertCircle,
} from "lucide-react";
import { useSessionStore } from "@/store/session";
import { Button, Select, Spinner, Badge } from "@/components/ui";
import toast from "react-hot-toast";
import type { Chamada, ChamadaPresenca, ResumoTurma, Turma, CronogramaAula } from "@/lib/types";

// ── Tipos ──────────────────────────────────────────────────────────────────
type Tela = "PREVIEW" | "FORM" | "HISTORICO";

interface PresencaLocal {
  alunoId: string;
  alunoNome: string;
  presente: boolean;
}

function diaSemanaPortugues(date: Date): string {
  const dias = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
  return dias[date.getDay()];
}

function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ChamadaPage() {
  const { sessao } = useSessionStore();
  const profId = sessao?.id ?? "";

  const [tela, setTela] = useState<Tela>("PREVIEW");
  const [loading, setLoading] = useState(false);

  // Preview
  const [resumos, setResumos] = useState<ResumoTurma[]>([]);
  const [slotAtual, setSlotAtual] = useState<CronogramaAula | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  // Form
  const [turmaIdForm, setTurmaIdForm] = useState("");
  const [dataForm, setDataForm] = useState(hoje());
  const [presencas, setPresencas] = useState<PresencaLocal[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [slotForm, setSlotForm] = useState<CronogramaAula | null>(null);
  const [saving, setSaving] = useState(false);

  // Histórico
  const [historico, setHistorico] = useState<Chamada[]>([]);
  const [chamadaDetalhe, setChamadaDetalhe] = useState<Chamada | null>(null);
  const [presencasDetalhe, setPresencasDetalhe] = useState<ChamadaPresenca[]>([]);
  const [savingDetalhe, setSavingDetalhe] = useState(false);

  const carregarPreview = useCallback(async () => {
    setLoading(true);
    try {
      const [resumosRes, turmasRes, cronRes] = await Promise.all([
        fetch(`/api/chamada/resumo?professorId=${profId}`).then((r) => r.json()),
        fetch(`/api/turmas?professorId=${profId}`).then((r) => r.json()),
        fetch(`/api/cronograma?professorId=${profId}`).then((r) => r.json()),
      ]);
      setResumos(Array.isArray(resumosRes) ? resumosRes : []);
      setTurmas(Array.isArray(turmasRes) ? turmasRes : []);

      // Detectar aula ativa agora
      const agora = new Date();
      const diaAtual = diaSemanaPortugues(agora);
      const horaAtual = agora.toTimeString().slice(0, 5);
      const dataHoje = hoje();

      const slots: CronogramaAula[] = Array.isArray(cronRes) ? cronRes : [];
      const ativa = slots.find((s) => {
        return (
          s.diaSemana === diaAtual &&
          horaAtual >= s.horarioInicio &&
          horaAtual < s.horarioFim &&
          (s.dataInicio == null || dataHoje >= s.dataInicio) &&
          (s.dataFim == null || dataHoje <= s.dataFim)
        );
      }) ?? null;
      setSlotAtual(ativa);
    } catch { toast.error("Erro ao carregar dados."); }
    finally { setLoading(false); }
  }, [profId]);

  const carregarHistorico = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chamada?professorId=${profId}`);
      setHistorico(await res.json());
    } catch { toast.error("Erro ao carregar histórico."); }
    finally { setLoading(false); }
  }, [profId]);

  useEffect(() => {
    if (tela === "PREVIEW") carregarPreview();
    else if (tela === "HISTORICO") carregarHistorico();
  }, [tela, carregarPreview, carregarHistorico]);

  // Carregar alunos para a chamada
  async function carregarAlunos(turmaId: string, data: string) {
    if (!turmaId || !data) return;
    setLoadingAlunos(true);
    try {
      // Verificar duplicata
      const existe = await fetch(
        `/api/chamada/existe?professorId=${profId}&turmaId=${turmaId}&data=${data}`
      ).then((r) => r.json()).catch(() => ({ existe: false }));

      if (existe?.existe) {
        toast.error("Chamada já registrada para esta turma nesta data. Veja o Histórico.");
        setLoadingAlunos(false);
        return;
      }

      // Detectar slot do cronograma
      const diaSem = diaSemanaPortugues(new Date(data + "T12:00:00"));
      const cronRes = await fetch(`/api/cronograma?professorId=${profId}`).then((r) => r.json());
      const slots: CronogramaAula[] = Array.isArray(cronRes) ? cronRes : [];
      const slot = slots.find((s) => s.turmaId === turmaId && s.diaSemana === diaSem) ?? null;
      setSlotForm(slot);

      // Carregar alunos
      const alunosRes = await fetch(`/api/alunos?turmaId=${turmaId}`).then((r) => r.json());
      const alunos: { id: string; nome: string }[] = Array.isArray(alunosRes) ? alunosRes : [];

      if (alunos.length === 0) {
        toast.error("Nenhum aluno cadastrado nesta turma.");
        setLoadingAlunos(false);
        return;
      }

      setPresencas(alunos.map((a) => ({ alunoId: a.id, alunoNome: a.nome, presente: true })));
    } catch { toast.error("Erro ao carregar alunos."); }
    finally { setLoadingAlunos(false); }
  }

  function abrirFormManual(turmaId?: string, data?: string) {
    setPresencas([]);
    setSlotForm(null);
    setTurmaIdForm(turmaId ?? "");
    setDataForm(data ?? hoje());
    setTela("FORM");
    if (turmaId) carregarAlunos(turmaId, data ?? hoje());
  }

  function togglePresenca(alunoId: string) {
    setPresencas((prev) =>
      prev.map((p) => p.alunoId === alunoId ? { ...p, presente: !p.presente } : p)
    );
  }

  function marcarTodos(presente: boolean) {
    setPresencas((prev) => prev.map((p) => ({ ...p, presente })));
  }

  async function salvarChamada() {
    if (!turmaIdForm || !dataForm || presencas.length === 0) {
      toast.error("Selecione turma, data e carregue os alunos."); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/chamada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professorId: profId,
          turmaId: turmaIdForm,
          cronogramaId: slotForm?.id ?? null,
          dataAula: dataForm,
          horarioInicio: slotForm?.horarioInicio ?? "08:00",
          horarioFim: slotForm?.horarioFim ?? "09:00",
          presencas: presencas.map((p) => ({
            alunoId: p.alunoId,
            alunoNome: p.alunoNome,
            presente: p.presente,
            id: null,
            chamadaId: null,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Erro ao salvar chamada.");
        return;
      }
      const presentes = presencas.filter((p) => p.presente).length;
      toast.success(`Chamada salva! ${presentes}/${presencas.length} presentes.`);
      setPresencas([]);
      setTela("PREVIEW");
    } catch { toast.error("Erro ao salvar chamada."); }
    finally { setSaving(false); }
  }

  async function abrirDetalhe(chamada: Chamada) {
    setChamadaDetalhe(chamada);
    try {
      const res = await fetch(`/api/chamada/${chamada.id}/presencas`);
      setPresencasDetalhe(await res.json());
    } catch { toast.error("Erro ao carregar presenças."); }
  }

  async function salvarEdicao() {
    if (!chamadaDetalhe) return;
    setSavingDetalhe(true);
    try {
      const res = await fetch(`/api/chamada/${chamadaDetalhe.id}/presencas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presencas: presencasDetalhe }),
      });
      if (res.ok) {
        toast.success("Presenças atualizadas!");
        carregarHistorico();
      } else {
        toast.error("Erro ao atualizar.");
      }
    } catch { toast.error("Erro ao atualizar."); }
    finally { setSavingDetalhe(false); }
  }

  async function excluirChamada(chamada: Chamada) {
    if (!confirm("Excluir esta chamada?")) return;
    try {
      await fetch(`/api/chamada/${chamada.id}`, { method: "DELETE" });
      toast.success("Chamada excluída.");
      setChamadaDetalhe(null);
      carregarHistorico();
    } catch { toast.error("Erro ao excluir."); }
  }

  const presentes = presencas.filter((p) => p.presente).length;
  const ausentes = presencas.length - presentes;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header com tabs */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border-b border-slate-200 sm:px-6">
        <h1 className="mr-2 text-lg font-bold text-gray-900 sm:mr-4">Chamada</h1>

        {(["PREVIEW", "HISTORICO"] as Tela[]).map((t) => (
          <button
            key={t}
            onClick={() => setTela(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              tela === t
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "PREVIEW" ? "Turmas" : "Histórico"}
          </button>
        ))}

        <div className="hidden sm:block sm:flex-1" />

        <button
          onClick={() => { if (tela === "PREVIEW") carregarPreview(); else carregarHistorico(); }}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
        >
          <RefreshCw size={15} />
        </button>

        <Button onClick={() => abrirFormManual()} size="md" className="w-full sm:w-auto">
          <Plus size={14} /> Nova Chamada
        </Button>
      </div>

      {/* Conteúdo */}
      {loading && tela !== "FORM" ? (
        <Spinner />
      ) : tela === "PREVIEW" ? (
        <PreviewTela
          resumos={resumos}
          slotAtual={slotAtual}
          turmas={turmas}
          onIniciarAtiva={() => {
            if (slotAtual) abrirFormManual(slotAtual.turmaId, hoje());
          }}
          onIniciarTurma={(turmaId) => abrirFormManual(turmaId, hoje())}
        />
      ) : tela === "FORM" ? (
        <FormTela
          turmas={turmas}
          turmaId={turmaIdForm}
          setTurmaId={setTurmaIdForm}
          data={dataForm}
          setData={setDataForm}
          onCarregar={() => carregarAlunos(turmaIdForm, dataForm)}
          loadingAlunos={loadingAlunos}
          presencas={presencas}
          onToggle={togglePresenca}
          onTodos={() => marcarTodos(true)}
          onNenhum={() => marcarTodos(false)}
          slotForm={slotForm}
          presentes={presentes}
          ausentes={ausentes}
          onSalvar={salvarChamada}
          saving={saving}
          onVoltar={() => setTela("PREVIEW")}
        />
      ) : (
        <HistoricoTela
          historico={historico}
          detalhe={chamadaDetalhe}
          presencasDetalhe={presencasDetalhe}
          onAbrirDetalhe={abrirDetalhe}
          onToggleDetalhe={(id: string | null) => {
            setPresencasDetalhe((prev) =>
              prev.map((p) => p.id === id ? { ...p, presente: !p.presente } : p)
            );
          }}
          onSalvarEdicao={salvarEdicao}
          savingDetalhe={savingDetalhe}
          onExcluir={excluirChamada}
          onFecharDetalhe={() => setChamadaDetalhe(null)}
        />
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function PreviewTela({
  resumos, slotAtual, turmas, onIniciarAtiva, onIniciarTurma,
}: {
  resumos: ResumoTurma[];
  slotAtual: CronogramaAula | null;
  turmas: Turma[];
  onIniciarAtiva: () => void;
  onIniciarTurma: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-auto p-4 space-y-6 sm:p-6">
      {/* Banner aula ativa */}
      {slotAtual && (
        <div className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="font-bold text-green-800 text-sm">Aula em andamento</p>
              <p className="text-green-700 text-xs">
                {slotAtual.turmaNome} · {slotAtual.horarioInicio}–{slotAtual.horarioFim}
              </p>
            </div>
          </div>
          <Button onClick={onIniciarAtiva} size="sm"
            className="bg-green-600 hover:bg-green-700 text-white">
            Iniciar Chamada
          </Button>
        </div>
      )}

      {resumos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users size={40} className="opacity-20 mb-2" />
          <p className="text-sm">Nenhuma turma atribuída.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumos.map((r) => {
            const pct = r.mediaPresenca ?? 0;
            return (
              <div key={r.turmaId}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                <div>
                  <p className="font-bold text-gray-900">{r.turmaNome}</p>
                  <p className="text-xs text-gray-500">{r.escolaNome}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{r.totalChamadas} chamadas</span>
                    <span className="font-semibold">{Math.round(pct)}% presença</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Última: {r.ultimaChamada ? formatarData(r.ultimaChamada) : "Nenhuma ainda"}
                  </p>
                </div>
                <Button
                  onClick={() => onIniciarTurma(r.turmaId)}
                  size="sm"
                  className="w-full justify-center"
                >
                  Iniciar Chamada
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FormTela({
  turmas, turmaId, setTurmaId, data, setData,
  onCarregar, loadingAlunos, presencas, onToggle,
  onTodos, onNenhum, slotForm, presentes, ausentes,
  onSalvar, saving, onVoltar,
}: any) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-[#f5f7f9] border-b border-slate-200">
        <button
          onClick={onVoltar}
          className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
        >
          ← Voltar
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-sm font-medium text-gray-700">Nova Chamada</span>
      </div>

      {/* Seletor */}
      <div className="flex flex-col gap-3 px-4 py-3 bg-[#f5f7f9] border-b border-slate-200 sm:flex-row sm:items-end sm:flex-wrap sm:px-6">
        <div className="w-full sm:w-56">
          <Select
            label="Turma"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            options={[
              { value: "", label: "Selecione..." },
              ...turmas.map((t: Turma) => ({ value: t.id, label: t.nome })),
            ]}
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Data
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="h-10 w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#285a82]/20 sm:w-auto"
          />
        </div>
        <Button onClick={onCarregar} variant="secondary" disabled={!turmaId || !data} className="w-full sm:w-auto">
          Carregar Alunos
        </Button>

        {slotForm && (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
            ✓ {slotForm.horarioInicio}–{slotForm.horarioFim}
          </span>
        )}
      </div>

      {/* Tabela de presença */}
      <div className="flex-1 overflow-auto">
        {loadingAlunos ? (
          <Spinner />
        ) : presencas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Users size={40} className="opacity-20 mb-2" />
            <p className="text-sm">Selecione uma turma e clique em Carregar Alunos.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-[#f5f7f9]">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Aluno
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-32">
                  Presente
                </th>
              </tr>
            </thead>
            <tbody>
              {presencas.map((p: PresencaLocal) => (
                <tr
                  key={p.alunoId}
                  className={`border-b border-gray-100 transition cursor-pointer hover:bg-gray-50 ${
                    p.presente ? "" : "bg-red-50/30"
                  }`}
                  onClick={() => onToggle(p.alunoId)}
                >
                  <td className="px-6 py-3 font-medium text-gray-900">{p.alunoNome}</td>
                  <td className="px-4 py-3 text-center">
                    {p.presente ? (
                      <CheckCircle size={20} className="text-green-500 mx-auto" />
                    ) : (
                      <XCircle size={20} className="text-red-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rodapé */}
      {presencas.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:px-6">
          <button onClick={onTodos} className="text-xs text-blue-600 hover:underline font-medium">
            Todos presentes
          </button>
          <button onClick={onNenhum} className="text-xs text-gray-500 hover:underline font-medium">
            Todos ausentes
          </button>
          <span className="text-xs text-gray-500 sm:ml-auto">
            Presentes: <strong>{presentes}</strong> / {presencas.length}
            {" · "}Ausentes: <strong>{ausentes}</strong>
          </span>
          <Button onClick={onSalvar} loading={saving} className="w-full bg-green-600 hover:bg-green-700 text-white sm:w-auto">
            Salvar Chamada
          </Button>
        </div>
      )}
    </div>
  );
}

function HistoricoTela({
  historico, detalhe, presencasDetalhe, onAbrirDetalhe,
  onToggleDetalhe, onSalvarEdicao, savingDetalhe, onExcluir, onFecharDetalhe,
}: any) {
  const presentes = presencasDetalhe.filter((p: ChamadaPresenca) => p.presente).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Lista */}
      <div className="flex-1 overflow-auto">
        {historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <AlertCircle size={40} className="opacity-20 mb-2" />
            <p className="text-sm">Nenhuma chamada registrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Turma</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Horário</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Presença</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {historico.map((c: Chamada) => {
                const pct = c.totalAlunos > 0 ? Math.round((c.totalPresentes / c.totalAlunos) * 100) : 0;
                return (
                  <tr
                    key={c.id}
                    onClick={() => onAbrirDetalhe(c)}
                    className={`border-b border-slate-100 cursor-pointer transition hover:bg-[#f4f8fb] ${
                      detalhe?.id === c.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">{formatarData(c.dataAula)}</td>
                    <td className="px-4 py-3 text-gray-700">{c.turmaNome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {c.horarioInicio}–{c.horarioFim}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {c.totalPresentes}/{c.totalAlunos} ({pct}%)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); onExcluir(c); }}
                        className="text-xs text-red-400 hover:text-red-600 transition"
                      >
                        Apagar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Painel de detalhe */}
      {detalhe && (
        <div className="max-h-[50vh] w-full flex-none flex flex-col bg-white border-t border-gray-200 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {formatarData(detalhe.dataAula)} · {detalhe.turmaNome}
              </p>
              <p className="text-xs text-gray-500">
                {detalhe.horarioInicio}–{detalhe.horarioFim}
              </p>
            </div>
            <button onClick={onFecharDetalhe} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
            <button
              onClick={() => {/* todos */}}
              className="text-xs text-blue-600 hover:underline"
            >Todos ✓</button>
            <button
              onClick={() => {/* nenhum */}}
              className="text-xs text-gray-500 hover:underline"
            >Todos ✗</button>
            <span className="text-xs text-gray-500 ml-auto">{presentes}/{presencasDetalhe.length}</span>
          </div>

          <div className="flex-1 overflow-auto">
            {presencasDetalhe.map((p: ChamadaPresenca) => (
              <div
                key={p.id ?? p.alunoId}
                onClick={() => onToggleDetalhe(p.id ?? p.alunoId)}
                className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  !p.presente ? "bg-red-50/30" : ""
                }`}
              >
                <span className="text-sm text-gray-800">{p.alunoNome}</span>
                {p.presente ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-400" />
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100">
            <Button
              onClick={onSalvarEdicao}
              loading={savingDetalhe}
              className="w-full justify-center"
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
