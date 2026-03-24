// src/app/api/professores/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";

// PATCH /api/professores/[id] — Atualiza o professor
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { nome, email, senha } = await request.json();

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: "Campos incompletos." }, { status: 400 });
    }

    await sql`
      UPDATE perfis 
      SET nome = ${nome.trim()}, email = ${email.trim()}, senha = ${senha}
      WHERE id = ${id}::uuid AND role = 'teacher'
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/professores/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar professor." }, { status: 500 });
  }
}

// DELETE /api/professores/[id] — Deleta do Supabase Auth e do banco
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getSupabaseAdmin();

    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) {
      console.error("Erro no Auth:", authError);
      return NextResponse.json({ error: "Falha ao remover do Auth." }, { status: 500 });
    }

    await sql`DELETE FROM perfis WHERE id = ${id}::uuid`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/professores/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir professor." }, { status: 500 });
  }
}