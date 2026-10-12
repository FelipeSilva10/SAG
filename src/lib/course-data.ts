import sql from "@/lib/db";
import { buildCalendar } from "@/lib/course-calendar";
import type { Chamada, CronogramaAula, Escola, ExcecaoCalendario, Turma } from "@/lib/types";

export function mapSchool(row: Record<string, unknown>): Escola {
  return {
    id: row.id as string, nome: row.nome as string, status: row.status as string,
    tipo: (row.tipo ?? "PUBLICA") as Escola["tipo"], tipoLabel: row.tipo === "PRIVADA" ? "Privada" : "Pública",
    dataInicio: row.data_inicio as string | null, dataFim: row.data_fim as string | null,
    coordenador: (row.coordenador as string) ?? "", contato: (row.contato as string) ?? "",
  };
}

export function mapClass(row: Record<string, unknown>): Turma {
  return {
    id: row.id as string, escolaId: row.escola_id as string, nome: row.nome as string,
    anoLetivo: row.ano_letivo as string, escolaNome: row.escola_nome as string,
    professorId: row.professor_id as string | null, professorNome: (row.prof_nome as string) ?? "Sem professor",
    dataInicio: row.data_inicio as string | null, dataFim: row.data_fim as string | null,
    totalAulas: row.total_aulas == null ? null : Number(row.total_aulas),
    situacao: (row.situacao_curso ?? "ATIVA") as Turma["situacao"], horarios: [],
  };
}

export async function loadCourseData(scope: { professorId: string | null; escolaId?: string | null; turmaId?: string | null }) {
  const rows = await sql`
    select t.id, t.escola_id, t.nome, t.ano_letivo, t.professor_id,
      t.data_inicio::text, t.data_fim::text, t.total_aulas, t.situacao_curso,
      e.nome as escola_nome, p.nome as prof_nome
    from turmas t join escolas e on e.id = t.escola_id left join perfis p on p.id = t.professor_id
    where (${scope.professorId}::uuid is null or t.professor_id = ${scope.professorId}::uuid)
      and (${scope.escolaId ?? null}::uuid is null or t.escola_id = ${scope.escolaId ?? null}::uuid)
      and (${scope.turmaId ?? null}::uuid is null or t.id = ${scope.turmaId ?? null}::uuid)
    order by e.nome, t.nome
  `;
  const turmas = rows.map(mapClass);
  if (turmas.length === 0) return { turmas, escolas: [] as Escola[], slots: [] as CronogramaAula[], excecoes: [] as ExcecaoCalendario[], chamadas: [] as Chamada[] };
  const ids = turmas.map(t => t.id);
  const [schoolRows, slotRows, exceptionRows, callRows] = await Promise.all([
    sql`select id, nome, status, tipo, data_inicio::text, data_fim::text, coordenador, contato from escolas where id in ${sql([...new Set(turmas.map(t => t.escolaId))])}`,
    sql`select ca.*, ca.data_inicio::text as inicio, ca.data_fim::text as fim,
      to_char(ca.horario_inicio, 'HH24:MI') as inicio_hora, to_char(ca.horario_fim, 'HH24:MI') as fim_hora,
      p.nome as professor_nome, t.nome as turma_nome
      from cronograma_aulas ca join turmas t on t.id = ca.turma_id join perfis p on p.id = ca.professor_id where ca.turma_id in ${sql(ids)}`,
    sql`select id, turma_id, data::text, tipo, motivo, data_original::text,
      to_char(horario_inicio, 'HH24:MI') as horario_inicio, to_char(horario_fim, 'HH24:MI') as horario_fim
      from calendario_excecoes where turma_id in ${sql(ids)} order by data`,
    sql`select c.id, c.turma_id, c.professor_id, c.cronograma_id, c.data_aula::text,
      to_char(c.horario_inicio, 'HH24:MI') as horario_inicio, to_char(c.horario_fim, 'HH24:MI') as horario_fim,
      t.nome as turma_nome from chamadas c join turmas t on t.id = c.turma_id where c.turma_id in ${sql(ids)}`,
  ]);
  const escolas = schoolRows.map(mapSchool);
  const slots: CronogramaAula[] = slotRows.map(r => ({ id: r.id, professorId: r.professor_id, professorNome: r.professor_nome, turmaId: r.turma_id, turmaNome: r.turma_nome, diaSemana: r.dia_semana, horarioInicio: r.inicio_hora, horarioFim: r.fim_hora, tipo: r.tipo, dataInicio: r.inicio, dataFim: r.fim, criadoPor: r.criado_por }));
  for (const turma of turmas) turma.horarios = slots.filter(s => s.turmaId === turma.id && s.tipo !== "REUNIÃO").map(s => ({ id: s.id, diaSemana: s.diaSemana, horarioInicio: s.horarioInicio, horarioFim: s.horarioFim, dataInicio: s.dataInicio, dataFim: s.dataFim }));
  const excecoes: ExcecaoCalendario[] = exceptionRows.map(r => ({ id: r.id, turmaId: r.turma_id, data: r.data, tipo: r.tipo, motivo: r.motivo, horarioInicio: r.horario_inicio, horarioFim: r.horario_fim, dataOriginal: r.data_original }));
  const chamadas: Chamada[] = callRows.map(r => ({ id: r.id, turmaId: r.turma_id, turmaNome: r.turma_nome, professorId: r.professor_id, cronogramaId: r.cronograma_id, dataAula: r.data_aula, horarioInicio: r.horario_inicio, horarioFim: r.horario_fim, totalAlunos: 0, totalPresentes: 0 }));
  return { turmas, escolas, slots, excecoes, chamadas };
}

export async function loadCalendar(scope: Parameters<typeof loadCourseData>[0], inicio: string, fim: string) {
  return buildCalendar({ ...await loadCourseData(scope), inicio, fim });
}
