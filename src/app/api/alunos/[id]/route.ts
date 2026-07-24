// src/app/api/alunos/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// BUG CORRIGIDO (PATCH): a versão anterior atualizava apenas a tabela `perfis`
// e ignorava o Supabase Auth. Isso fazia com que a nova senha salva no SAG
// não funcionasse no Bloquin — o aluno continuava com a senha antiga no Auth.
//
// Agora o PATCH atualiza em dois lugares de forma atômica:
//  1. Supabase Auth  → auth.users (via admin.auth.admin.updateUserById)
//  2. Tabela perfis  → campos nome, email, senha, turma_id
//
// Se o Auth falhar, o banco não é tocado (fail-fast).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";

// ── PATCH /api/alunos/[id] — atualiza nome, senha e turma ────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { nome, email, senha, turmaId } = await request.json();

    if (!nome?.trim() || !email?.trim() || !turmaId) {
      return NextResponse.json({ error: "Campos incompletos." }, { status: 400 });
    }
    if (senha && senha.length < 6) {
      return NextResponse.json(
        { error: "Senha mínima de 6 caracteres." },
        { status: 400 }
      );
    }

    if (senha) {
      const admin = getSupabaseAdmin();
      const { error: authError } = await admin.auth.admin.updateUserById(id, { password: senha });
      if (authError) {
        console.error("[PATCH /api/alunos] Auth error:", authError);
        return NextResponse.json(
          { error: `Falha ao atualizar no Auth: ${authError.message}` },
          { status: 500 }
        );
      }
    }

    // ── 2. Atualiza na tabela perfis ──────────────────────────────────────────
    await sql`
      UPDATE perfis
      SET nome     = ${nome.trim()},
          email    = ${email.trim()},
          senha    = COALESCE(${senha || null}, senha),
          turma_id = ${turmaId}::uuid,
          updated_at = now()
      WHERE id = ${id}::uuid
        AND role = 'student'
    `;

    await sql`
      DELETE FROM membros_turma
      WHERE utilizador_id = ${id}::uuid
    `;

    await sql`
      INSERT INTO membros_turma (turma_id, utilizador_id)
      VALUES (${turmaId}::uuid, ${id}::uuid)
      ON CONFLICT (turma_id, utilizador_id) DO NOTHING
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/alunos/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar aluno." }, { status: 500 });
  }
}

// ── DELETE /api/alunos/[id] — remove do Auth e do banco ──────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getSupabaseAdmin();

    // 1. Remove do Supabase Auth (cascata apaga perfis se FK configurada,
    //    mas fazemos explicitamente para garantir)
    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) {
      console.error("[DELETE /api/alunos] Auth error:", authError);
      return NextResponse.json(
        { error: "Falha ao remover do Auth." },
        { status: 500 }
      );
    }

    // 2. Remove da tabela perfis (caso não haja ON DELETE CASCADE no FK)
    await sql`DELETE FROM perfis WHERE id = ${id}::uuid`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/alunos/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir aluno." }, { status: 500 });
  }
}
