import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getRequestSession } from "@/lib/request-authorization";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = getRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const deleted = await sql.begin(async (tx: any) => {
      const owned = session.actor.role === "ADMIN"
        ? await tx`
            SELECT id FROM chamadas
            WHERE id = ${id}::uuid
            FOR UPDATE
          `
        : await tx`
            SELECT id FROM chamadas
            WHERE id = ${id}::uuid
              AND professor_id = ${session.actor.id}::uuid
            FOR UPDATE
          `;
      if (owned.length === 0) return false;
      await tx`DELETE FROM chamada_presencas WHERE chamada_id = ${id}::uuid`;
      await tx`DELETE FROM chamadas WHERE id = ${id}::uuid`;
      return true;
    });
    if (!deleted) {
      return NextResponse.json(
        { error: "Chamada não encontrada ou não autorizada." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/chamada/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir chamada." }, { status: 500 });
  }
}
