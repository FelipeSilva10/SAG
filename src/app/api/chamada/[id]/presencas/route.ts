import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { ChamadaPresenca } from "@/lib/types";
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
 
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { presencas } = await request.json() as { presencas: ChamadaPresenca[] };
  try {
    const session = getRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const owned = await sql`
      SELECT 1
      FROM chamadas
      WHERE id = ${id}::uuid
        AND (
          ${hasRole(session.actor, "ADMIN")}
          OR professor_id = ${session.actor.id}::uuid
        )
      LIMIT 1
    `;
    if (owned.length === 0) {
      return NextResponse.json(
        { error: "Chamada não encontrada ou não autorizada." },
        { status: 404 },
      );
    }

    for (const p of presencas) {
      if (!p.id) continue;
      await sql`
        UPDATE chamada_presencas SET presente = ${p.presente}
        WHERE id = ${p.id}::uuid
          AND chamada_id = ${id}::uuid
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/chamada/[id]/presencas]", error);
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}
