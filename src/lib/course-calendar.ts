import type { AulaCalendario, Chamada, CronogramaAula, DadosCalendario, Escola, ExcecaoCalendario, Turma } from "./types";

const WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

// Datas letivas são datas civis; UTC serve apenas para a aritmética, sem conversão de fuso.
export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function todayInSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}-${parts.find(p => p.type === "day")!.value}`;
}

export function timeInSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

export function isTeachingDay(aula: AulaCalendario): boolean {
  return aula.tipo !== "FERIADO" && aula.tipo !== "CANCELAMENTO";
}

function firstDate(values: (string | null | undefined)[]): string | null {
  const dates = values.filter((d): d is string => !!d).sort();
  return dates[0] ?? null;
}

export function buildCalendar(input: {
  turmas: Turma[];
  escolas: Escola[];
  slots: CronogramaAula[];
  excecoes: ExcecaoCalendario[];
  chamadas: Chamada[];
  inicio: string;
  fim: string;
  hoje?: string;
}): DadosCalendario {
  const today = input.hoje ?? todayInSaoPaulo();
  const all: AulaCalendario[] = [];
  const progresso: DadosCalendario["progresso"] = [];
  for (const turma of input.turmas) {
    const escola = input.escolas.find(e => e.id === turma.escolaId);
    const slots = input.slots.filter(s => s.turmaId === turma.id && s.tipo !== "REUNIÃO");
    const exceptions = input.excecoes.filter(e => e.turmaId === turma.id);
    const calls = input.chamadas.filter(c => c.turmaId === turma.id);
    const yearStart = /^\d{4}$/.test(turma.anoLetivo) ? `${turma.anoLetivo}-01-01` : input.inicio;
    const start = turma.dataInicio ?? escola?.dataInicio ?? firstDate([...slots.map(s => s.dataInicio), ...calls.map(c => c.dataAula)]) ?? yearStart;
    const end = firstDate([turma.dataFim, escola?.dataFim]);
    const target = turma.totalAulas;
    // Um objetivo sem data final permite calcular as próximas aulas além do mês exibido.
    const horizon = end ?? (target ? addDays(start, 3660) : [input.fim, today].sort().at(-1)!);
    const byDate = new Map<string, AulaCalendario>();
    const base = (date: string): AulaCalendario => ({
      chave: `${turma.id}:${date}`, turmaId: turma.id, turmaNome: turma.nome,
      escolaId: turma.escolaId, escolaNome: turma.escolaNome,
      professorId: turma.professorId, professorNome: turma.professorNome,
      data: date, horarioInicio: null, horarioFim: null, tipo: "AULA", motivo: "", dataOriginal: null,
      cronogramaId: null, excecaoId: null, chamadaId: null, numero: null, total: null,
      status: date < today ? "PENDENTE" : "AGENDADA",
    });
    for (let date = start; date <= horizon; date = addDays(date, 1)) {
      const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
      const slot = slots.filter(s => s.diaSemana === weekday && (!s.dataInicio || date >= s.dataInicio) && (!s.dataFim || date <= s.dataFim)).sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio))[0];
      if (slot) byDate.set(date, { ...base(date), horarioInicio: slot.horarioInicio, horarioFim: slot.horarioFim, cronogramaId: slot.id });
    }
    for (const exception of exceptions) {
      // Reposições podem acontecer depois do encerramento previsto do curso.
      const previous = byDate.get(exception.data) ?? base(exception.data);
      byDate.set(exception.data, {
        ...previous, tipo: exception.tipo, motivo: exception.motivo, excecaoId: exception.id,
        dataOriginal: exception.dataOriginal,
        horarioInicio: exception.horarioInicio ?? previous.horarioInicio,
        horarioFim: exception.horarioFim ?? previous.horarioFim,
        status: ["FERIADO", "CANCELAMENTO"].includes(exception.tipo) ? "CANCELADA" : previous.status,
      });
    }
    for (const exception of exceptions.filter(e => e.tipo === "REPOSICAO" && e.dataOriginal)) {
      const source = byDate.get(exception.dataOriginal!);
      if (source) byDate.set(exception.dataOriginal!, { ...source, tipo: "CANCELAMENTO", motivo: `Reposta em ${exception.data.split("-").reverse().join("/")}. ${exception.motivo}`, excecaoId: exception.id, status: "CANCELADA" });
    }
    // A chamada é o histórico realizado, mesmo se o horário recorrente for editado depois.
    for (const call of calls) {
      const previous = byDate.get(call.dataAula) ?? base(call.dataAula);
      byDate.set(call.dataAula, { ...previous, tipo: isTeachingDay(previous) ? previous.tipo : "AULA", horarioInicio: call.horarioInicio, horarioFim: call.horarioFim, cronogramaId: call.cronogramaId, chamadaId: call.id, professorId: call.professorId, status: "REALIZADA" });
    }
    let events = [...byDate.values()].sort((a, b) => a.data.localeCompare(b.data));
    if (target && !end) {
      const replacements = events.filter(e => e.tipo === "REPOSICAO").length;
      const regularBudget = Math.max(0, target - replacements);
      let count = 0;
      events = events.filter(event => {
        if (!isTeachingDay(event)) return count < regularBudget;
        if (event.tipo === "REPOSICAO" || event.tipo === "EXTRA") return true;
        count++;
        return count <= regularBudget || !!event.chamadaId;
      });
    }
    // Cursos encerrados conservam o histórico e não criam pendências futuras.
    if (turma.situacao === "ENCERRADA") events = events.filter(e => e.data <= today || e.chamadaId);
    const lessons = events.filter(isTeachingDay);
    const finite = !!end || !!target || turma.situacao === "ENCERRADA";
    const total = finite ? lessons.length : null;
    let number = 0;
    for (const event of events) {
      if (isTeachingDay(event)) event.numero = ++number;
      event.total = total;
    }
    progresso.push({
      turmaId: turma.id, turmaNome: turma.nome, escolaNome: turma.escolaNome,
      realizadas: lessons.filter(e => e.chamadaId).length,
      pendentes: lessons.filter(e => e.status === "PENDENTE").length,
      total, objetivo: target,
      proxima: lessons.find(e => e.data >= today && !e.chamadaId) ?? null,
    });
    all.push(...events.filter(e => e.data >= input.inicio && e.data <= input.fim));
  }
  return { aulas: all.sort((a, b) => a.data.localeCompare(b.data) || (a.horarioInicio ?? "").localeCompare(b.horarioInicio ?? "") || a.turmaNome.localeCompare(b.turmaNome)), progresso };
}
