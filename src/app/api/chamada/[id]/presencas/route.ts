import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { ChamadaPresenca } from "@/lib/types";
import { courseFailure } from "@/lib/course-api";
import { CourseError, uuid } from "@/lib/course-validation";
import { getRequestSession, hasRole } from "@/lib/request-authorization";
 
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = getRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const rows = await sql`
      SELECT cp.id, cp.chamada_id, cp.aluno_id, p.nome AS aluno_nome, cp.presente
      FROM chamada_presencas cp
      JOIN perfis p ON p.id = cp.aluno_id
      JOIN chamadas c ON c.id = cp.chamada_id
      WHERE cp.chamada_id = ${id}::uuid
        AND (
          ${hasRole(session.actor, "ADMIN")}
          OR c.professor_id = ${session.actor.id}::uuid
        )
      ORDER BY p.nome
    `;
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        chamadaId: r.chamada_id,
        alunoId: r.aluno_id,
        alunoNome: r.aluno_nome,
        presente: r.presente,
      }))
    );
  } catch (error) {
    console.error("[GET /api/chamada/[id]/presencas]", error);
    return NextResponse.json({ error: "Erro ao buscar presenças." }, { status: 500 });
  }
}
 
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  try {
    const id = uuid((await params).id);
    const { presencas } = await request.json() as { presencas: ChamadaPresenca[] };
    if (!Array.isArray(presencas) || !presencas.length) throw new CourseError("Presenças inválidas.");
    const ids = new Set<string>();
    for (const entry of presencas) {
      uuid(entry?.id, "Presença");
      if (typeof entry.presente !== "boolean" || ids.has(entry.id!)) throw new CourseError("Presenças inválidas ou repetidas.");
      ids.add(entry.id!);
    }
    await sql.begin(async tx => {
      const owned = await tx`select c.id from chamadas c where c.id = ${id}::uuid
        and (${hasRole(session.actor, "ADMIN")} or c.professor_id = ${session.actor.id}::uuid) for update`;
      if (!owned.length) throw new CourseError("Chamada não encontrada ou não autorizada.", 404);
      const existing = await tx`select id from chamada_presencas where chamada_id = ${id}::uuid`;
      if (existing.length !== ids.size || existing.some(p => !ids.has(p.id))) throw new CourseError("A lista de presenças mudou. Abra a chamada novamente.", 409);
      for (const p of presencas) await tx`update chamada_presencas set presente = ${p.presente} where id = ${p.id}::uuid and chamada_id = ${id}::uuid`;
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return courseFailure(error, "[PATCH presencas]"); }
}
