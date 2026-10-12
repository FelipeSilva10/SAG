import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { classFields, CourseError, uuid } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import { saveClassSchedules, validateClassReferences } from "@/lib/course-write";
import { requireRole } from "@/lib/request-authorization";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  try {
    const id = uuid((await params).id);
    const fields = classFields(await request.json());
    await sql.begin(async tx => {
      const [existing] = await tx`select id, escola_id from turmas where id = ${id}::uuid for update`;
      if (!existing) throw new CourseError("Turma não encontrada.", 404);
      if (existing.escola_id !== fields.escolaId) {
        const history = await tx`select 1 from chamadas where turma_id = ${id}::uuid limit 1`;
        if (history.length) throw new CourseError("Esta turma já tem chamadas. Mantenha a escola para preservar o relatório histórico.", 409);
      }
      await validateClassReferences(tx, fields);
      await tx`update turmas set escola_id = ${fields.escolaId}::uuid, nome = ${fields.nome}, ano_letivo = ${fields.anoLetivo},
        professor_id = ${fields.professorId}::uuid, data_inicio = ${fields.dataInicio}::date, data_fim = ${fields.dataFim}::date,
        total_aulas = ${fields.totalAulas}, situacao_curso = ${fields.situacao}, updated_at = now() where id = ${id}::uuid`;
      await saveClassSchedules(tx, id, fields);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return courseFailure(error, "[PATCH turma]"); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  try {
    const id = uuid((await params).id);
    await sql.begin(async tx => {
      const [turma] = await tx`select id from turmas where id = ${id}::uuid for update`;
      if (!turma) throw new CourseError("Turma não encontrada.", 404);
      const links = await tx`select 1 from chamadas where turma_id = ${id}::uuid
        union all select 1 from membros_turma where turma_id = ${id}::uuid
        union all select 1 from perfis where turma_id = ${id}::uuid limit 1`;
      if (links.length) throw new CourseError("A turma tem alunos ou chamadas. Encerre o curso para conservar o histórico.", 409);
      await tx`delete from turmas where id = ${id}::uuid`;
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return courseFailure(error, "[DELETE turma]"); }
}
