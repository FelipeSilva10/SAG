import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { loadCourseData } from "@/lib/course-data";
import { classFields, uuid } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import { validateClassReferences, saveClassSchedules } from "@/lib/course-write";
import { requireSession, requireRole, resolveProfessorId } from "@/lib/request-authorization";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const params = request.nextUrl.searchParams;
    const escolaId = params.get("escolaId");
    const requestedProfessor = params.get("professorId");
    if (escolaId) uuid(escolaId, "Escola");
    if (requestedProfessor) uuid(requestedProfessor, "Professor");
    const data = await loadCourseData({ professorId: resolveProfessorId(session, requestedProfessor), escolaId });
    return NextResponse.json(data.turmas, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return courseFailure(error, "[GET turmas]"); }
}

export async function POST(request: NextRequest) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    // Compatibilidade com clientes antigos que enviavam só um horário.
    const fields = classFields({ ...body, horarios: body.horarios ?? [{ diaSemana: body.diaSemana, horarioInicio: body.horarioInicio, horarioFim: body.horarioFim }] });
    const id = await sql.begin(async tx => {
      await validateClassReferences(tx, fields);
      const [turma] = await tx`insert into turmas (escola_id, nome, ano_letivo, professor_id, data_inicio, data_fim, total_aulas, situacao_curso)
        values (${fields.escolaId}::uuid, ${fields.nome}, ${fields.anoLetivo}, ${fields.professorId}::uuid,
          ${fields.dataInicio}::date, ${fields.dataFim}::date, ${fields.totalAulas}, ${fields.situacao}) returning id`;
      await saveClassSchedules(tx, turma.id, fields);
      return turma.id;
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) { return courseFailure(error, "[POST turmas]"); }
}
