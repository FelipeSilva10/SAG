import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { mapSchool } from "@/lib/course-data";
import { schoolFields } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import { requireSession, requireRole, resolveProfessorId } from "@/lib/request-authorization";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const professorId = resolveProfessorId(session, request.nextUrl.searchParams.get("professorId"));
    const rows = await sql`select e.id, e.nome, e.status, e.tipo, e.data_inicio::text, e.data_fim::text, e.coordenador, e.contato
      from escolas e where (${professorId}::uuid is null or exists (select 1 from turmas t where t.escola_id = e.id and t.professor_id = ${professorId}::uuid)) order by e.nome`;
    return NextResponse.json(rows.map(mapSchool));
  } catch (error) { return courseFailure(error, "[GET escolas]"); }
}

export async function POST(request: NextRequest) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  try {
    const f = schoolFields(await request.json());
    await sql`insert into escolas (nome, tipo, data_inicio, data_fim, coordenador, contato)
      values (${f.nome}, ${f.tipo}, ${f.dataInicio}::date, ${f.dataFim}::date, ${f.coordenador}, ${f.contato})`;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return courseFailure(error, "[POST escolas]"); }
}
