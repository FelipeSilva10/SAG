import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getRequestSession, hasRole } from "@/lib/request-authorization";
 
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { dataAula, titulo, conteudo, observacoes } = await request.json();
  try {
    const session = getRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const updated = hasRole(session.actor, "ADMIN")
      ? await sql`
          UPDATE diario_aulas
          SET data_aula = ${dataAula}::date,
              titulo = ${titulo ?? ""},
              conteudo = ${conteudo ?? ""},
              observacoes = ${observacoes ?? ""}
          WHERE id = ${id}::uuid
          RETURNING id
        `
      : await sql`
          UPDATE diario_aulas
          SET data_aula = ${dataAula}::date,
              titulo = ${titulo ?? ""},
              conteudo = ${conteudo ?? ""},
              observacoes = ${observacoes ?? ""}
          WHERE id = ${id}::uuid
            AND professor_id = ${session.actor.id}::uuid
          RETURNING id
        `;
    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Registro não encontrado ou não autorizado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/diario/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}
 
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

    const deleted = hasRole(session.actor, "ADMIN")
      ? await sql`
          DELETE FROM diario_aulas
          WHERE id = ${id}::uuid
          RETURNING id
        `
      : await sql`
          DELETE FROM diario_aulas
          WHERE id = ${id}::uuid
            AND professor_id = ${session.actor.id}::uuid
          RETURNING id
        `;
    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Registro não encontrado ou não autorizado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/diario/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir." }, { status: 500 });
  }
}
