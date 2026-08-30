import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireRole } from "@/lib/request-authorization";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    const { escolaId, nome, anoLetivo, professorId } = await request.json();

    await sql`
      UPDATE turmas
      SET escola_id = ${escolaId}::uuid,
          nome = ${nome},
          ano_letivo = ${anoLetivo},
          professor_id = ${professorId || null}::uuid,
          updated_at = now()
      WHERE id = ${id}::uuid
    `;

    if (professorId) {
      await sql`
        INSERT INTO escola_professores (professor_id, escola_id)
        VALUES (${professorId}::uuid, ${escolaId}::uuid)
        ON CONFLICT (professor_id, escola_id) DO NOTHING
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/turmas/:id]", error);
    return NextResponse.json({ error: "Erro ao atualizar turma." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    await sql`DELETE FROM turmas WHERE id = ${id}::uuid`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/turmas/:id]", error);
    return NextResponse.json({ error: "Erro ao excluir turma." }, { status: 500 });
  }
}
