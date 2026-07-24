"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Trash2, Calendar, Clock, RefreshCw, X, ChevronDown,
} from "lucide-react";
import { useSessionStore } from "@/store/session";
import { Button, Input, Select, SidePanel, Spinner, Badge } from "@/components/ui";
import toast from "react-hot-toast";
import type { CronogramaAula, GrupoCronograma, Turma } from "@/lib/types";
import { ABREV_DIA, TIPO_LABEL, DIAS_SEMANA } from "@/lib/types";

// ── Tipos locais ────────────────────────────────────────────────────────────
interface Professor { id: string; nome: string; }

const TIPO_OPCOES = [
  { value: "AULA", label: "📚 Aula" },
  { value: "REUNIÃO", label: "📋 Reunião" },
  { value: "AULA_SUBSTITUTA", label: "🔄 Aula Substituta" },
];

const DIAS_LABELS: Record<string, string> = {
  SEGUNDA: "SEG", TERÇA: "TER", QUARTA: "QUA",
  QUINTA: "QUI", SEXTA: "SEX", SÁBADO: "SÁB",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function agruparSlots(slots: CronogramaAula[]): GrupoCronograma[] {
  const mapa = new Map<string, CronogramaAula[]>();
  for (const s of slots) {
    const chave = `${s.professorId}|${s.turmaId}|${s.horarioInicio}|${s.horarioFim}|${s.dataInicio}|${s.dataFim}|${s.tipo}`;
    const arr = mapa.get(chave) ?? [];
    arr.push(s);
    mapa.set(chave, arr);
  }
  const ORDEM = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
  return Array.from(mapa.values()).map((grupo) => {
    const ref = grupo[0];
    return {
      ids: grupo.map((g) => g.id),
      professorId: ref.professorId,
      professorNome: ref.professorNome,
      turmaId: ref.turmaId,
      turmaNome: ref.turmaNome,
      dias: grupo.map((g) => g.diaSemana).sort((a, b) => ORDEM.indexOf(a) - ORDEM.indexOf(b)),
      horarioInicio: ref.horarioInicio,
      horarioFim: ref.horarioFim,
      dataInicio: ref.dataInicio,
      dataFim: ref.dataFim,
      tipo: ref.tipo,
      criadoPor: ref.criadoPor,
    };
  });
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatarPeriodo(g: GrupoCronograma): string {
  if (!g.dataInicio && !g.dataFim) return "Sem período";
  return `${formatarData(g.dataInicio)} → ${formatarData(g.dataFim)}`;
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function CronogramaPage() {
  const { sessao, isAdmin } = useSessionStore();
  const admin = isAdmin();

  const [slots, setSlots] = useState<CronogramaAula[]>([]);
  const [loading, setLoading] = useState(true);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [filtroProfId, setFiltroProfId] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editando, setEditando] = useState<GrupoCronograma | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [profIdForm, setProfIdForm] = useState("");
  const [turmaIdForm, setTurmaIdForm] = useState("");
  const [turmasDispProfForm, setTurmasDispProfForm] = useState<Turma[]>([]);
  const [tipo, setTipo] = useState("AULA");
  const [diasSel, setDiasSel] = useState<Set<string>>(new Set());
  const [horIni, setHorIni] = useState("");
  const [horFim, setHorFim] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFimForm, setDataFimForm] = useState("");
  const [dataEspec, setDataEspec] = useState(new Date().toISOString().slice(0, 10));

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const url = admin
        ? "/api/cronograma"
        : `/api/cronograma?professorId=${sessao?.id}`;
      const res = await fetch(url);
      setSlots(await res.json());
    } catch { toast.error("Erro ao carregar cronograma."); }
    finally { setLoading(false); }
  }, [admin, sessao?.id]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!admin) return;
    fetch("/api/professores").then((r) => r.json()).then(setProfessores);
  }, [admin]);

  // Turmas do professor selecionado no form
  useEffect(() => {
    if (!profIdForm) { setTurmasDispProfForm([]); return; }
    fetch(`/api/turmas?professorId=${profIdForm}`)
      .then((r) => r.json()).then(setTurmasDispProfForm);
  }, [profIdForm]);

  // Turmas do professor logado (professor view)
  useEffect(() => {
    if (admin || !sessao?.id) return;
    fetch(`/api/turmas?professorId=${sessao.id}`).then((r) => r.json()).then(setTurmas);
  }, [admin, sessao?.id]);

  const grupos = useMemo(() => {
    const filtrado = filtroProfId
      ? slots.filter((s) => s.professorId === filtroProfId)
      : slots;
    return agruparSlots(filtrado);
  }, [slots, filtroProfId]);

  // Grade semanal (visão professor)
  const gradeSemanal = useMemo(() => {
    const grade: Record<string, CronogramaAula[]> = {};
    for (const dia of DIAS_SEMANA) grade[dia] = [];
    for (const s of slots) {
      if (grade[s.diaSemana]) grade[s.diaSemana].push(s);
    }
    return grade;
  }, [slots]);

  function abrirNovo() {
    setEditando(null);
    setProfIdForm(admin ? "" : (sessao?.id ?? ""));
    setTurmaIdForm("");
    setTipo("AULA");
    setDiasSel(new Set());
    setHorIni(""); setHorFim("");
    setDataIni(""); setDataFimForm("");
    setDataEspec(new Date().toISOString().slice(0, 10));
    setPanelOpen(true);
  }

  function abrirEditar(g: GrupoCronograma) {
    setEditando(g);
    setProfIdForm(g.professorId);
    setTurmaIdForm(g.turmaId);
    setTipo(g.tipo);
    setDiasSel(new Set(g.dias));
    setHorIni(g.horarioInicio); setHorFim(g.horarioFim);
    setDataIni(g.dataInicio ?? ""); setDataFimForm(g.dataFim ?? "");
    setDataEspec(g.dataInicio ?? new Date().toISOString().slice(0, 10));
    setPanelOpen(true);
  }

  async function handleExcluir(g: GrupoCronograma) {
    if (!confirm(`Remover ${g.dias.length} dia(s) deste horário?`)) return;
    try {
      await Promise.all(
        g.ids.map((id) =>
          fetch(`/api/cronograma/${id}`, { method: "DELETE" })
        )
      );
      toast.success("Horário removido.");
      carregar();
    } catch { toast.error("Erro ao remover."); }
  }

  async function handleSalvar() {
    const profId = admin ? profIdForm : sessao?.id;
    if (!profId || !turmaIdForm || !horIni || !horFim) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    if (!/\d{2}:\d{2}/.test(horIni) || !/\d{2}:\d{2}/.test(horFim)) {
      toast.error("Horário inválido. Use HH:mm."); return;
    }

    const isAula = tipo === "AULA";

    if (isAula && diasSel.size === 0) {
      toast.error("Selecione pelo menos um dia."); return;
    }
    if (isAula && (!dataIni || !dataFimForm)) {
      toast.error("Defina o período de início e fim."); return;
    }

    setSaving(true);
    try {
      // Se editando, remove os antigos primeiro
      if (editando) {
        await Promise.all(
          editando.ids.map((id) => fetch(`/api/cronograma/${id}`, { method: "DELETE" }))
        );
      }

      const diasParaSalvar = isAula ? Array.from(diasSel) : [obterDiaSemana(dataEspec)];
      const res = await Promise.all(
        diasParaSalvar.map((dia) =>
          fetch("/api/cronograma", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              professorId: profId,
              turmaId: turmaIdForm,
              diaSemana: dia,
              horarioInicio: horIni,
              horarioFim: horFim,
              tipo,
              dataInicio: isAula ? dataIni : dataEspec,
              dataFim: isAula ? dataFimForm : dataEspec,
              criadoPor: admin ? "ADMIN" : "PROFESSOR",
            }),
          })
        )
      );

      if (res.every((r) => r.ok)) {
        toast.success(`${diasParaSalvar.length} dia(s) salvo(s)!`);
        setPanelOpen(false);
        carregar();
      } else {
        toast.error("Erro ao salvar alguns horários.");
      }
    } catch { toast.error("Erro ao salvar."); }
    finally { setSaving(false); }
  }

  function toggleDia(dia: string) {
    setDiasSel((prev) => {
      const next = new Set(prev);
      next.has(dia) ? next.delete(dia) : next.add(dia);
      return next;
    });
  }

  function obterDiaSemana(dateStr: string): string {
    const dias = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
    return dias[new Date(dateStr + "T12:00:00").getDay()];
  }

  const isAula = tipo === "AULA";
  const turmasForm = admin ? turmasDispProfForm : turmas;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 px-4 py-4 bg-white border-b border-slate-200 sm:flex-row sm:items-center sm:flex-wrap sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Cronograma</h1>
            {!admin && (
              <p className="text-xs text-gray-400 mt-0.5">
                {slots.filter((s) => !["REUNIÃO", "AULA_SUBSTITUTA"].includes(s.tipo)).length} aulas regulares
              </p>
            )}
          </div>

          {admin && (
            <div className="w-full sm:w-56">
              <Select
                value={filtroProfId}
                onChange={(e) => setFiltroProfId(e.target.value)}
                options={[
                  { value: "", label: "Todos os professores" },
                  ...professores.map((p) => ({ value: p.id, label: p.nome })),
                ]}
              />
            </div>
          )}

          <div className="hidden sm:block sm:flex-1" />

          <button
            onClick={carregar}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            title="Atualizar"
          >
            <RefreshCw size={15} />
          </button>

          <Button onClick={abrirNovo} size="md" className="w-full sm:w-auto">
            <Plus size={14} />
            {admin ? "Novo Horário" : "Reunião / Substituta"}
          </Button>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="flex-1 overflow-auto p-4 space-y-6 sm:p-6">
            {/* Grade semanal (visão professor) */}
            {!admin && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Visão Semanal
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia}>
                      <div className="text-center py-2 text-xs font-bold text-white rounded-t-lg bg-gray-800">
                        {DIAS_LABELS[dia]}
                      </div>
                      <div className="border border-slate-200 rounded-b-md min-h-[80px] p-1.5 space-y-1 bg-[#f5f7f9]">
                        {(gradeSemanal[dia] ?? []).length === 0 ? (
                          <p className="text-center text-gray-300 text-xs pt-3">—</p>
                        ) : (
                          (gradeSemanal[dia] ?? []).map((s) => (
                            <div
                              key={s.id}
                              className={`rounded p-1.5 text-xs border ${
                                s.tipo === "REUNIÃO"
                                  ? "bg-purple-50 border-purple-200 text-purple-800"
                                  : s.tipo === "AULA_SUBSTITUTA"
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : "bg-blue-50 border-blue-200 text-blue-800"
                              }`}
                            >
                              <p className="font-bold truncate">{s.turmaNome}</p>
                              <p className="text-[10px] opacity-70">{s.horarioInicio}–{s.horarioFim}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabela de grupos */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                {admin ? "Todos os Horários" : "Lista Completa"}
              </p>
              {grupos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Calendar size={40} className="opacity-20 mb-2" />
                  <p className="text-sm">Nenhum horário cadastrado.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#f5f7f9]">
                      {admin && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Professor
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Turma
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Dias
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Horário
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Período
                      </th>
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((g, i) => (
                      <tr
                        key={i}
                        className={`border-b border-slate-100 hover:bg-[#f4f8fb] transition cursor-pointer ${
                          g.tipo !== "AULA" ? "bg-purple-50/30" : ""
                        }`}
                        onClick={() => abrirEditar(g)}
                      >
                        {admin && (
                          <td className="px-4 py-3 text-gray-700 font-medium">
                            {g.professorNome}
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-700">{g.turmaNome}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              g.tipo === "AULA"
                                ? "blue"
                                : g.tipo === "REUNIÃO"
                                ? "purple"
                                : "amber"
                            }
                          >
                            {TIPO_LABEL[g.tipo as keyof typeof TIPO_LABEL] ?? g.tipo}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {g.dias.map((d) => DIAS_LABELS[d] ?? d).join(" · ")}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-gray-400" />
                            {g.horarioInicio} – {g.horarioFim}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {formatarPeriodo(g)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExcluir(g); }}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Painel lateral */}
      <SidePanel
        title={editando ? "Editar Horário" : admin ? "Novo Horário" : "Evento Ocasional"}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      >
        <div className="space-y-4">
          {admin && (
            <Select
              label="Professor"
              value={profIdForm}
              onChange={(e) => setProfIdForm(e.target.value)}
              options={[
                { value: "", label: "Selecione..." },
                ...professores.map((p) => ({ value: p.id, label: p.nome })),
              ]}
              disabled={!!editando}
            />
          )}

          <Select
            label="Turma"
            value={turmaIdForm}
            onChange={(e) => setTurmaIdForm(e.target.value)}
            options={[
              { value: "", label: "Selecione a turma..." },
              ...turmasForm.map((t) => ({ value: t.id, label: t.nome })),
            ]}
            disabled={!!editando || (admin && !profIdForm)}
          />

          <Select
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            options={admin ? TIPO_OPCOES : TIPO_OPCOES.filter((o) => o.value !== "AULA")}
          />

          {isAula ? (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Dias da Semana
                </p>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((dia) => (
                    <button
                      key={dia}
                      onClick={() => toggleDia(dia)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        diasSel.has(dia)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      {DIAS_LABELS[dia]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Data início
                  </label>
                  <input
                    type="date"
                    value={dataIni}
                    onChange={(e) => setDataIni(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Data fim
                  </label>
                  <input
                    type="date"
                    value={dataFimForm}
                    onChange={(e) => setDataFimForm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Data do evento
              </label>
              <input
                type="date"
                value={dataEspec}
                onChange={(e) => setDataEspec(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Início"
              value={horIni}
              onChange={(e) => setHorIni(e.target.value)}
              placeholder="08:00"
            />
            <Input
              label="Fim"
              value={horFim}
              onChange={(e) => setHorFim(e.target.value)}
              placeholder="09:30"
            />
          </div>

          <p className="text-xs text-gray-400">Formato: HH:mm</p>

          <Button
            onClick={handleSalvar}
            loading={saving}
            className="w-full justify-center"
          >
            {editando ? "Salvar Alterações" : "Adicionar Horário"}
          </Button>

          {editando && (
            <Button
              variant="danger"
              onClick={() => { handleExcluir(editando); setPanelOpen(false); }}
              className="w-full justify-center"
            >
              <Trash2 size={13} />
              Excluir Horário
            </Button>
          )}
        </div>
      </SidePanel>
    </div>
  );
}
