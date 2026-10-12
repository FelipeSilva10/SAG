import type { TransactionSql } from "postgres";
import { classFields, CourseError } from "@/lib/course-validation";

type ClassFields = ReturnType<typeof classFields>;

export async function validateClassReferences(tx: TransactionSql, f: ClassFields) {
  const [escola] = await tx`select id, data_inicio::text, data_fim::text from escolas where id = ${f.escolaId}::uuid`;
  if (!escola) throw new CourseError("Escola não encontrada.");
  if (f.dataInicio && escola.data_inicio && f.dataInicio < escola.data_inicio) throw new CourseError("O início da turma deve estar dentro do período da escola.");
  if ((f.dataFim && escola.data_fim && f.dataFim > escola.data_fim) || (f.dataInicio && escola.data_fim && f.dataInicio > escola.data_fim)) throw new CourseError("O período da turma ultrapassa o término da escola.");
  const [professor] = await tx`select p.id from perfis p where p.id = ${f.professorId}::uuid
    and (p.role = 'teacher' or exists (select 1 from perfis_papeis pp where pp.perfil_id = p.id and pp.papel = 'teacher'))`;
  if (!professor) throw new CourseError("Professor não encontrado.");
}

export async function saveClassSchedules(tx: TransactionSql, id: string, f: ClassFields) {
  await tx`insert into escola_professores (professor_id, escola_id) values (${f.professorId}::uuid, ${f.escolaId}::uuid) on conflict do nothing`;
  const existing = await tx`select id from cronograma_aulas where turma_id = ${id}::uuid and tipo <> 'REUNIÃO'`;
  const existingIds = new Set(existing.map(s => s.id as string));
  const kept = new Set<string>();
  for (const horario of f.horarios) {
    if (horario.id) {
      if (!existingIds.has(horario.id) || kept.has(horario.id)) throw new CourseError("Horário não pertence a esta turma ou está repetido.");
      await tx`update cronograma_aulas set professor_id = ${f.professorId}::uuid, dia_semana = ${horario.diaSemana},
        horario_inicio = ${horario.horarioInicio}::time, horario_fim = ${horario.horarioFim}::time,
        data_inicio = ${horario.dataInicio ?? null}::date, data_fim = ${horario.dataFim ?? null}::date where id = ${horario.id}::uuid`;
      kept.add(horario.id);
    } else {
      await tx`insert into cronograma_aulas (professor_id, turma_id, dia_semana, horario_inicio, horario_fim, data_inicio, data_fim, tipo, criado_por)
        values (${f.professorId}::uuid, ${id}::uuid, ${horario.diaSemana}, ${horario.horarioInicio}::time, ${horario.horarioFim}::time,
          ${horario.dataInicio ?? null}::date, ${horario.dataFim ?? null}::date, 'AULA', 'ADMIN')`;
    }
  }
  for (const previous of existingIds) {
    if (!kept.has(previous)) await tx`delete from cronograma_aulas where id = ${previous}::uuid`;
  }
}
