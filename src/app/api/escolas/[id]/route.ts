import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { uuid, CourseError, schoolFields } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import { requireRole } from "@/lib/request-authorization";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  try {
    const id = uuid((await params).id);
    const f = schoolFields(await request.json());
    const updated = await sql`update escolas set nome = ${f.nome}, tipo = ${f.tipo}, data_inicio = ${f.dataInicio}::date,
      data_fim = ${f.dataFim}::date, coordenador = ${f.coordenador}, contato = ${f.contato}, updated_at = now() where id = ${id}::uuid returning id`;
    if (!updated.length) throw new CourseError("Escola não encontrada.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) { return courseFailure(error, "[PATCH escola]"); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  try {
    const id = uuid((await params).id);
    await sql.begin(async tx => {
      const [escola] = await tx`select id from escolas where id = ${id}::uuid for update`;
      if (!escola) throw new CourseError("Escola não encontrada.", 404);
      const classes = await tx`select 1 from turmas where escola_id = ${id}::uuid limit 1`;
      if (classes.length) throw new CourseError("Esta escola tem turmas vinculadas. Preserve os cursos e os relatórios; apenas escolas sem turmas podem ser excluídas.", 409);
      await tx`delete from escolas where id = ${id}::uuid`;
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return courseFailure(error, "[DELETE escola]"); }
}
