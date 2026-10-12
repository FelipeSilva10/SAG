import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { loadCalendar } from "@/lib/course-data";
import { isTeachingDay } from "@/lib/course-calendar";
import { CourseError, dateField, textField, times, uuid } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import { requireSession, hasRole } from "@/lib/request-authorization";

export async function POST(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    const turmaId = uuid(body.turmaId, "Turma");
    const data = dateField(body.data, "Data");
    if (!data) throw new CourseError("Informe a data.");
    if (!["FERIADO", "CANCELAMENTO", "REPOSICAO", "EXTRA", "ALTERACAO"].includes(body.tipo)) throw new CourseError("Tipo de ajuste inválido.");
    const motivo = textField(body.motivo, "Motivo", true, 500);
    const blocked = ["FERIADO", "CANCELAMENTO"].includes(body.tipo);
    const horario = blocked ? { horarioInicio: null, horarioFim: null } : times(body.horarioInicio, body.horarioFim);
    const dataOriginal = body.tipo === "REPOSICAO" ? dateField(body.dataOriginal, "Data original") : null;
    if (body.tipo === "REPOSICAO" && (!dataOriginal || dataOriginal === data)) throw new CourseError("A reposição precisa de uma data original diferente da nova data.");
    await sql.begin(async tx => {
      const [turma] = await tx`select id, situacao_curso from turmas where id = ${turmaId}::uuid
        and (${hasRole(session.actor, "ADMIN")} or professor_id = ${session.actor.id}::uuid) for update`;
      if (!turma) throw new CourseError("Turma não encontrada ou não autorizada.", 404);
      if (turma.situacao_curso === "ENCERRADA") throw new CourseError("Reabra o curso antes de alterar seu calendário.", 409);
      const recorded = await tx`select 1 from chamadas where turma_id = ${turmaId}::uuid
        and (data_aula = ${data}::date or data_aula = ${dataOriginal}::date) limit 1`;
      if (recorded.length) throw new CourseError("Esta aula já tem chamada. Ajuste as presenças no histórico antes de alterar o calendário.", 409);
      const [current] = await tx`select id from calendario_excecoes where turma_id = ${turmaId}::uuid and data = ${data}::date`;
      const related = await tx`select id from calendario_excecoes where turma_id = ${turmaId}::uuid
        and (data_original = ${data}::date or data = ${dataOriginal}::date and tipo = 'REPOSICAO')`;
      if (related.length) throw new CourseError("Esta data já faz parte de outra reposição. Remova o ajuste anterior antes de alterá-la.", 409);
      const range = [data, dataOriginal].filter((d): d is string => !!d).sort();
      const calendar = await loadCalendar({ professorId: null, turmaId }, range[0], range.at(-1)!);
      const destination = calendar.aulas.find(a => a.data === data);
      if (!current && ["REPOSICAO", "EXTRA"].includes(body.tipo) && destination && isTeachingDay(destination)) throw new CourseError("Já existe aula nesta data. Use Alterar horário ou escolha outro dia.");
      if (body.tipo === "ALTERACAO" && (!destination || !isTeachingDay(destination))) throw new CourseError("Não há aula para alterar nesta data. Cadastre uma aula extra.");
      if (dataOriginal && !calendar.aulas.some(a => a.data === dataOriginal && (a.cronogramaId || a.tipo === "EXTRA" || a.tipo === "ALTERACAO"))) throw new CourseError("Não há aula na data original. Confira o calendário.");
      await tx`insert into calendario_excecoes (turma_id, data, tipo, motivo, horario_inicio, horario_fim, data_original, criado_por)
        values (${turmaId}::uuid, ${data}::date, ${body.tipo}, ${motivo}, ${horario.horarioInicio}::time, ${horario.horarioFim}::time, ${dataOriginal}::date, ${session.actor.id}::uuid)
        on conflict (turma_id, data) do update set tipo = excluded.tipo, motivo = excluded.motivo,
          horario_inicio = excluded.horario_inicio, horario_fim = excluded.horario_fim,
          data_original = excluded.data_original, criado_por = excluded.criado_por`;
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return courseFailure(error, "[POST excecao]"); }
}

export async function DELETE(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const id = uuid(request.nextUrl.searchParams.get("id"));
    await sql.begin(async tx => {
      const [exception] = await tx`select ce.* from calendario_excecoes ce join turmas t on t.id = ce.turma_id
        where ce.id = ${id}::uuid and (${hasRole(session.actor, "ADMIN")} or t.professor_id = ${session.actor.id}::uuid) for update of t`;
      if (!exception) throw new CourseError("Ajuste não encontrado ou não autorizado.", 404);
      const recorded = await tx`select 1 from chamadas where turma_id = ${exception.turma_id}::uuid and data_aula = ${exception.data}::date limit 1`;
      if (recorded.length) throw new CourseError("O ajuste já tem chamada registrada e faz parte do histórico.", 409);
      await tx`delete from calendario_excecoes where id = ${id}::uuid`;
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return courseFailure(error, "[DELETE excecao]"); }
}
