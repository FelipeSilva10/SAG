import { isDate } from "./course-calendar";
import type { HorarioTurma } from "./types";

export class CourseError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function uuid(value: unknown, label = "Identificador"): string {
  if (typeof value !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)) throw new CourseError(`${label} inválido.`);
  return value;
}

export function textField(value: unknown, label: string, required = true, max = 200): string {
  if (value == null && !required) return "";
  if (typeof value !== "string" || (required && !value.trim()) || value.trim().length > max) throw new CourseError(`${label} inválido.`);
  return value.trim();
}

export function dateField(value: unknown, label: string): string | null {
  if (value == null || value === "") return null;
  if (!isDate(value) || value < "2000-01-01" || value > "2100-12-31") throw new CourseError(`${label} inválida.`);
  return value;
}

export function period(start: string | null, end: string | null) {
  if (start && end && end < start) throw new CourseError("O término deve ser igual ou posterior ao início.");
  if (start && end && Number(end.slice(0, 4)) - Number(start.slice(0, 4)) > 10) throw new CourseError("O período pode ter no máximo 10 anos.");
}

export function schoolFields(body: Record<string, unknown>) {
  const tipo = body.tipo ?? "PUBLICA";
  if (tipo !== "PUBLICA" && tipo !== "PRIVADA") throw new CourseError("Tipo de escola inválido.");
  const dataInicio = dateField(body.dataInicio, "Data de início");
  const dataFim = dateField(body.dataFim, "Data de término");
  period(dataInicio, dataFim);
  return { nome: textField(body.nome, "Nome da escola"), tipo, dataInicio, dataFim,
    coordenador: textField(body.coordenador, "Coordenador", false), contato: textField(body.contato, "Contato", false) };
}

export function times(start: unknown, end: unknown): { horarioInicio: string; horarioFim: string } {
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (typeof start !== "string" || typeof end !== "string" || !valid.test(start) || !valid.test(end) || start >= end) throw new CourseError("Informe horários válidos, com término após o início.");
  return { horarioInicio: start, horarioFim: end };
}

export function classFields(body: Record<string, unknown>) {
  const dataInicio = dateField(body.dataInicio, "Data de início");
  const dataFim = dateField(body.dataFim, "Data de término");
  period(dataInicio, dataFim);
  const totalAulas = body.totalAulas == null || body.totalAulas === "" ? null : Number(body.totalAulas);
  if (totalAulas !== null && (!Number.isInteger(totalAulas) || totalAulas < 1 || totalAulas > 1000)) throw new CourseError("A quantidade de aulas deve ser um inteiro entre 1 e 1.000.");
  if (body.situacao != null && !["ATIVA", "ENCERRADA"].includes(String(body.situacao))) throw new CourseError("Situação inválida.");
  if (!Array.isArray(body.horarios) || body.horarios.length === 0 || body.horarios.length > 7) throw new CourseError("Defina ao menos um dia e horário de aula (até sete por turma).");
  const days = new Set<string>();
  const horarios: HorarioTurma[] = body.horarios.map((row: Record<string, unknown>) => {
    if (!row || !["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO"].includes(String(row.diaSemana)) || days.has(String(row.diaSemana))) throw new CourseError("Escolha dias válidos, sem repetir o mesmo dia da semana.");
    days.add(String(row.diaSemana));
    const start = dateField(row.dataInicio, "Início do horário");
    const end = dateField(row.dataFim, "Término do horário");
    period(start, end);
    return { id: row.id ? uuid(row.id) : undefined, diaSemana: row.diaSemana as HorarioTurma["diaSemana"], ...times(row.horarioInicio, row.horarioFim), dataInicio: start, dataFim: end };
  });
  return { escolaId: uuid(body.escolaId, "Escola"), nome: textField(body.nome, "Nome da turma"), anoLetivo: textField(body.anoLetivo, "Ano letivo", true, 30), professorId: uuid(body.professorId, "Professor"), dataInicio, dataFim, totalAulas, situacao: (body.situacao ?? "ATIVA") as "ATIVA" | "ENCERRADA", horarios };
}
