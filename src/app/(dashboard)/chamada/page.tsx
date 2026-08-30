"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle, XCircle, RefreshCw, Plus, X,
  Users, AlertCircle,
} from "lucide-react";
import { useSessionStore } from "@/store/session";
import {
  Button,
  Select,
  Spinner,
  Badge,
  Table,
  type Column,
  EmptyState,
  useConfirmDialog,
} from "@/components/ui";
import toast from "react-hot-toast";
import type { Chamada, ChamadaPresenca, ResumoTurma, Turma, CronogramaAula } from "@/lib/types";

// ── Tipos ──────────────────────────────────────────────────────────────────
type Tela = "PREVIEW" | "FORM" | "HISTORICO";

interface PresencaLocal {
  alunoId: string;
  alunoNome: string;
  presente: boolean;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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

function presencaTone(pct: number): "green" | "amber" | "red" {
  if (pct >= 75) return "green";
  if (pct >= 50) return "amber";
  return "red";
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

  function marcarTodosDetalhe(presente: boolean) {
    setPresencasDetalhe((prev) => prev.map((p) => ({ ...p, presente })));
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

  const confirm = useConfirmDialog();

  async function excluirChamada(chamada: Chamada) {
    const ok = await confirm({
      title: "Excluir chamada",
      description: `Excluir a chamada de ${formatarData(chamada.dataAula)} — ${chamada.turmaNome}?`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
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
    <div className="flex h-full flex-col">
      {/* Sub-header com tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e3ebf1] bg-white px-4 py-3 sm:px-6">
        <h1 className="mr-2 text-lg font-extrabold text-[#1f2d3a] sm:mr-4">Chamada</h1>

        {(["PREVIEW", "HISTORICO"] as Tela[]).map((t) => (
          <Button
            key={t}
            onClick={() => setTela(t)}
            size="sm"
            variant={tela === t ? "primary" : "secondary"}
          >
            {t === "PREVIEW" ? "Turmas" : "Histórico"}
          </Button>
        ))}

        <div className="hidden sm:block sm:flex-1" />

        <button
          onClick={() => { if (tela === "PREVIEW") carregarPreview(); else carregarHistorico(); }}
          className="rounded-lg p-2 text-[#8ea0b0] transition hover:bg-[#f3f7fa] hover:text-[#45566a]"
          aria-label="Atualizar"
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
          onMarcarTodosDetalhe={marcarTodosDetalhe}
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
  resumos, slotAtual, onIniciarAtiva, onIniciarTurma,
}: {
  resumos: ResumoTurma[];
  slotAtual: CronogramaAula | null;
  onIniciarAtiva: () => void;
  onIniciarTurma: (id: string) => void;
}) {
  return (
    <div className="flex-1 space-y-6 overflow-auto p-4 sm:p-6">
      {/* Banner aula ativa */}
      {slotAtual && (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <div>
              <p className="text-sm font-bold text-emerald-800">Aula em andamento</p>
              <p className="text-xs text-emerald-700">
                {slotAtual.turmaNome} · {slotAtual.horarioInicio}–{slotAtual.horarioFim}
              </p>
            </div>
          </div>
          <Button onClick={onIniciarAtiva} size="sm" variant="success">
            Iniciar Chamada
          </Button>
        </div>
      )}

      {resumos.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="Nenhuma turma atribuída" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumos.map((r) => {
            const pct = r.mediaPresenca ?? 0;
            return (
              <div key={r.turmaId}
                className="space-y-3 rounded-lg border border-[#e3ebf1] bg-white p-5 shadow-card">
                <div>
                  <p className="font-bold text-[#1f2d3a]">{r.turmaNome}</p>
                  <p className="text-xs text-[#8ea0b0]">{r.escolaNome}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#62798a]">
                    <span>{r.totalChamadas} chamadas</span>
                    <span className="font-bold">{Math.round(pct)}% presença</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#eef2f7]">
                    <div
                      className={`h-1.5 rounded-full ${
                        pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#8ea0b0]">
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

interface FormTelaProps {
  turmas: Turma[];
  turmaId: string;
  setTurmaId: (v: string) => void;
  data: string;
  setData: (v: string) => void;
  onCarregar: () => void;
  loadingAlunos: boolean;
  presencas: PresencaLocal[];
  onToggle: (alunoId: string) => void;
  onTodos: () => void;
  onNenhum: () => void;
  slotForm: CronogramaAula | null;
  presentes: number;
  ausentes: number;
  onSalvar: () => void;
  saving: boolean;
  onVoltar: () => void;
}

function FormTela({
  turmas, turmaId, setTurmaId, data, setData,
  onCarregar, loadingAlunos, presencas, onToggle,
  onTodos, onNenhum, slotForm, presentes, ausentes,
  onSalvar, saving, onVoltar,
}: FormTelaProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Sub-header */}
      <div className="flex items-center gap-3 border-b border-[#e3ebf1] bg-[#f3f7fa] px-6 py-3">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1 text-sm font-bold text-[#23638c] hover:underline"
        >
          ← Voltar
        </button>
        <span className="text-[#c3d0da]">/</span>
        <span className="text-sm font-semibold text-[#45566a]">Nova Chamada</span>
      </div>

      {/* Seletor */}
      <div className="flex flex-col gap-3 border-b border-[#e3ebf1] bg-[#f3f7fa] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-6">
        <div className="w-full sm:w-56">
          <Select
            label="Turma"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            options={[
              { value: "", label: "Selecione..." },
              ...turmas.map((t) => ({ value: t.id, label: t.nome })),
            ]}
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#45566a]">
            Data
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="h-10 w-full rounded border border-[#d4e1e9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#23638c]/20 sm:w-auto"
          />
        </div>
        <Button onClick={onCarregar} variant="secondary" disabled={!turmaId || !data} className="w-full sm:w-auto">
          Carregar Alunos
        </Button>

        {slotForm && (
          <Badge variant="green">✓ {slotForm.horarioInicio}–{slotForm.horarioFim}</Badge>
        )}
      </div>

      {/* Tabela de presença */}
      <div className="flex-1 overflow-auto">
        {loadingAlunos ? (
          <Spinner />
        ) : presencas.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="Selecione uma turma e clique em Carregar Alunos" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e3ebf1] bg-[#f3f7fa]">
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#62798a]">
                  Aluno
                </th>
                <th className="w-32 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-[#62798a]">
                  Presente
                </th>
              </tr>
            </thead>
            <tbody>
              {presencas.map((p) => (
                <tr
                  key={p.alunoId}
                  className={`cursor-pointer border-b border-[#eef2f7] transition hover:bg-[#f3f7fa] ${
                    p.presente ? "" : "bg-red-50/30"
                  }`}
                  onClick={() => onToggle(p.alunoId)}
                >
                  <td className="px-6 py-3 font-semibold text-[#1f2d3a]">{p.alunoNome}</td>
                  <td className="px-4 py-3 text-center">
                    {p.presente ? (
                      <CheckCircle size={20} className="mx-auto text-emerald-500" />
                    ) : (
                      <XCircle size={20} className="mx-auto text-red-400" />
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
        <div className="flex flex-col gap-3 border-t border-[#e3ebf1] bg-white px-4 py-3 sm:flex-row sm:items-center sm:px-6">
          <button onClick={onTodos} className="text-xs font-bold text-[#23638c] hover:underline">
            Todos presentes
          </button>
          <button onClick={onNenhum} className="text-xs font-bold text-[#8ea0b0] hover:underline">
            Todos ausentes
          </button>
          <span className="text-xs text-[#62798a] sm:ml-auto">
            Presentes: <strong className="text-[#1f2d3a]">{presentes}</strong> / {presencas.length}
            {" · "}Ausentes: <strong className="text-[#1f2d3a]">{ausentes}</strong>
          </span>
          <Button onClick={onSalvar} loading={saving} variant="success" className="w-full sm:w-auto">
            Salvar Chamada
          </Button>
        </div>
      )}
    </div>
  );
}

interface HistoricoTelaProps {
  historico: Chamada[];
  detalhe: Chamada | null;
  presencasDetalhe: ChamadaPresenca[];
  onAbrirDetalhe: (c: Chamada) => void;
  onToggleDetalhe: (id: string | null) => void;
  onMarcarTodosDetalhe: (presente: boolean) => void;
  onSalvarEdicao: () => void;
  savingDetalhe: boolean;
  onExcluir: (c: Chamada) => void;
  onFecharDetalhe: () => void;
}

function HistoricoTela({
  historico, detalhe, presencasDetalhe, onAbrirDetalhe,
  onToggleDetalhe, onMarcarTodosDetalhe, onSalvarEdicao, savingDetalhe, onExcluir, onFecharDetalhe,
}: HistoricoTelaProps) {
  const presentesDetalhe = presencasDetalhe.filter((p) => p.presente).length;

  const [filtroTurmaId, setFiltroTurmaId] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAno, setFiltroAno] = useState("");

  const turmasDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of historico) mapa.set(c.turmaId, c.turmaNome);
    return Array.from(mapa.entries()).map(([id, nome]) => ({ value: id, label: nome }));
  }, [historico]);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(historico.map((c) => c.dataAula.slice(0, 4)));
    return Array.from(anos).sort((a, b) => b.localeCompare(a));
  }, [historico]);

  const historicoFiltrado = useMemo(() => {
    return historico.filter((c) => {
      const passaTurma = !filtroTurmaId || c.turmaId === filtroTurmaId;
      const passaMes = !filtroMes || c.dataAula.slice(5, 7) === filtroMes;
      const passaAno = !filtroAno || c.dataAula.slice(0, 4) === filtroAno;
      return passaTurma && passaMes && passaAno;
    });
  }, [historico, filtroTurmaId, filtroMes, filtroAno]);

  const columns: Column<Chamada>[] = [
    {
      key: "dataAula",
      header: "Data",
      render: (c) => <span className="font-semibold text-[#1f2d3a]">{formatarData(c.dataAula)}</span>,
    },
    { key: "turmaNome", header: "Turma" },
    {
      key: "horario",
      header: "Horário",
      render: (c) => <span className="font-mono text-xs text-[#62798a]">{c.horarioInicio}–{c.horarioFim}</span>,
    },
    {
      key: "presenca",
      header: "Presença",
      render: (c) => {
        const pct = c.totalAlunos > 0 ? Math.round((c.totalPresentes / c.totalAlunos) * 100) : 0;
        return (
          <Badge variant={presencaTone(pct)}>
            {c.totalPresentes}/{c.totalAlunos} ({pct}%)
          </Badge>
        );
      },
    },
    {
      key: "acoes",
      header: "",
      width: "w-20",
      render: (c) => (
        <button
          onClick={(e) => { e.stopPropagation(); onExcluir(c); }}
          className="text-xs font-semibold text-red-400 transition hover:text-red-600"
        >
          Apagar
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e3ebf1] bg-white px-4 py-3 sm:px-6">
        <div className="w-full sm:w-56">
          <Select
            value={filtroTurmaId}
            onChange={(e) => setFiltroTurmaId(e.target.value)}
            options={[{ value: "", label: "Todas as turmas" }, ...turmasDisponiveis]}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            options={[
              { value: "", label: "Todos os meses" },
              ...MESES.map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m })),
            ]}
          />
        </div>
        <div className="w-full sm:w-32">
          <Select
            value={filtroAno}
            onChange={(e) => setFiltroAno(e.target.value)}
            options={[{ value: "", label: "Todos os anos" }, ...anosDisponiveis.map((a) => ({ value: a, label: a }))]}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden lg:flex-row">
        {/* Lista */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {historicoFiltrado.length === 0 ? (
            <EmptyState icon={<AlertCircle size={22} />} title="Nenhuma chamada encontrada" />
          ) : (
            <Table<Chamada>
              columns={columns}
              data={historicoFiltrado}
              rowKey={(c) => c.id}
              onRowClick={onAbrirDetalhe}
              rowClassName={(c) => (detalhe?.id === c.id ? "bg-[#e8f1f6]" : "")}
              pageSize={15}
            />
          )}
        </div>

        {/* Painel de detalhe */}
        {detalhe && (
          <div className="flex max-h-[50vh] w-full flex-none flex-col border-t border-[#e3ebf1] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-[#e3ebf1] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-[#1f2d3a]">
                  {formatarData(detalhe.dataAula)} · {detalhe.turmaNome}
                </p>
                <p className="text-xs text-[#8ea0b0]">
                  {detalhe.horarioInicio}–{detalhe.horarioFim}
                </p>
              </div>
              <button onClick={onFecharDetalhe} className="text-[#8ea0b0] hover:text-[#45566a]" aria-label="Fechar detalhe">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 border-b border-[#e3ebf1] bg-[#f3f7fa] px-4 py-2">
              <button
                onClick={() => onMarcarTodosDetalhe(true)}
                className="text-xs font-bold text-[#23638c] hover:underline"
              >Todos ✓</button>
              <button
                onClick={() => onMarcarTodosDetalhe(false)}
                className="text-xs font-bold text-[#8ea0b0] hover:underline"
              >Todos ✗</button>
              <span className="ml-auto text-xs text-[#62798a]">{presentesDetalhe}/{presencasDetalhe.length}</span>
            </div>

            <div className="flex-1 overflow-auto">
              {presencasDetalhe.map((p) => (
                <div
                  key={p.id ?? p.alunoId}
                  onClick={() => onToggleDetalhe(p.id ?? p.alunoId)}
                  className={`flex cursor-pointer items-center justify-between border-b border-[#eef2f7] px-4 py-2.5 transition hover:bg-[#f3f7fa] ${
                    !p.presente ? "bg-red-50/30" : ""
                  }`}
                >
                  <span className="text-sm text-[#1f2d3a]">{p.alunoNome}</span>
                  {p.presente ? (
                    <CheckCircle size={16} className="text-emerald-500" />
                  ) : (
                    <XCircle size={16} className="text-red-400" />
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-[#e3ebf1] p-4">
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
    </div>
  );
}
