// src/app/api/alunos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";

// PATCH /api/alunos/[id] — Atualiza o aluno
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { nome, email, senha, turmaId } = await request.json();

    if (!nome || !email || !senha || !turmaId) {
      return NextResponse.json({ error: "Campos incompletos." }, { status: 400 });
    }

    // Atualiza no banco
    await sql`
      UPDATE perfis 
      SET nome = ${nome.trim()}, email = ${email.trim()}, senha = ${senha}, turma_id = ${turmaId}::uuid
      WHERE id = ${id}::uuid
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/alunos/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar aluno." }, { status: 500 });
  }
}

// DELETE /api/alunos/[id] — Deleta do Supabase Auth e do banco
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getSupabaseAdmin();

    // 1. Deleta do Supabase Auth (igual ao SupabaseAuthDAO.deletarUsuarioAuth)
    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) {
      console.error("Erro no Auth:", authError);
      return NextResponse.json({ error: "Falha ao remover do Auth." }, { status: 500 });
    }

    // 2. Deleta da tabela (caso não tenha deleção em cascata configurada)
    await sql`DELETE FROM perfis WHERE id = ${id}::uuid`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/alunos/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir aluno." }, { status: 500 });
  }
}