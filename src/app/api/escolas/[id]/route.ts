import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireRole } from "@/lib/request-authorization";

// PATCH /api/escolas/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    const { nome, tipo } = await request.json();

    await sql`
      UPDATE escolas
      SET nome = ${nome}, tipo = ${tipo ?? "PUBLICA"}
      WHERE id = ${id}::uuid
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/escolas/:id]", error);
    return NextResponse.json({ error: "Erro ao atualizar escola." }, { status: 500 });
  }
}

// DELETE /api/escolas/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    await sql`DELETE FROM escolas WHERE id = ${id}::uuid`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/escolas/:id]", error);
    return NextResponse.json(
      { error: "Erro ao excluir. Verifique vínculos com turmas." },
      { status: 500 }
    );
  }
}
