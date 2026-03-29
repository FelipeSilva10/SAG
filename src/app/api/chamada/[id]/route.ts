import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
 
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await (sql.begin as Function)(async (tx: any) => {
    await tx`DELETE FROM chamada_presencas WHERE chamada_id = ${id}::uuid`;
    await tx`DELETE FROM chamadas WHERE id = ${id}::uuid`;
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/chamada/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir chamada." }, { status: 500 });
  }
}