// API route: /api/alunos — equivalente ao AlunoDAO.java

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { Aluno } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase";

const BASE_SELECT = sql`
  SELECT p.id, p.nome, p.email, p.senha, p.turma_id,
         COALESCE(t.nome, 'Sem Turma') AS turma_nome,
         COALESCE(e.nome, 'Sem Escola') AS escola_nome
  FROM perfis p
  LEFT JOIN turmas t ON p.turma_id = t.id
  LEFT JOIN escolas e ON t.escola_id = e.id
  WHERE p.role = 'student'
`;

function mapAluno(r: Record<string, unknown>): Aluno {
  return {
    id: r.id as string,
    nome: r.nome as string,
    email: r.email as string,
    senha: r.senha as string,
    turmaId: r.turma_id as string,
    turmaNome: r.turma_nome as string,
    escolaNome: r.escola_nome as string,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const professorId = searchParams.get("professorId");
  const turmaId = searchParams.get("turmaId");

  try {
    let rows;

    if (turmaId) {
      rows = await sql`
        SELECT p.id, p.nome, p.email, p.senha, p.turma_id,
               COALESCE(t.nome,'Sem Turma') AS turma_nome,
               COALESCE(e.nome,'Sem Escola') AS escola_nome
        FROM perfis p
        LEFT JOIN turmas t ON p.turma_id = t.id
        LEFT JOIN escolas e ON t.escola_id = e.id
        WHERE p.role = 'student' AND p.turma_id = ${turmaId}::uuid
        ORDER BY p.nome ASC
      `;
    } else if (professorId) {
      rows = await sql`
        SELECT p.id, p.nome, p.email, p.senha, p.turma_id,
               COALESCE(t.nome,'Sem Turma') AS turma_nome,
               COALESCE(e.nome,'Sem Escola') AS escola_nome
        FROM perfis p
        JOIN turmas t ON p.turma_id = t.id
        LEFT JOIN escolas e ON t.escola_id = e.id
        WHERE p.role = 'student' AND t.professor_id = ${professorId}::uuid
        ORDER BY p.nome ASC
      `;
    } else {
      rows = await sql`
        SELECT p.id, p.nome, p.email, p.senha, p.turma_id,
               COALESCE(t.nome,'Sem Turma') AS turma_nome,
               COALESCE(e.nome,'Sem Escola') AS escola_nome
        FROM perfis p
        LEFT JOIN turmas t ON p.turma_id = t.id
        LEFT JOIN escolas e ON t.escola_id = e.id
        WHERE p.role = 'student'
        ORDER BY p.nome ASC
      `;
    }

    return NextResponse.json(rows.map(mapAluno));
  } catch (error) {
    console.error("[GET /api/alunos]", error);
    return NextResponse.json({ error: "Erro ao buscar alunos." }, { status: 500 });
  }
}

// POST /api/alunos — cria usuário no Supabase Auth + insere em perfis
export async function POST(request: NextRequest) {
  try {
    const { nome, email, senha, turmaId } = await request.json();

    if (!nome?.trim() || !email?.trim() || !senha || !turmaId) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: "Senha mínima de 6 caracteres." }, { status: 400 });
    }

    // 1. Cria no Supabase Auth (equivalente ao SupabaseAuthDAO.criarUsuarioAuth)
    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "E-mail já cadastrado no sistema." },
        { status: 422 }
      );
    }

    const authId = authData.user.id;

    // 2. Insere em perfis
    try {
      await sql`
        INSERT INTO perfis (id, nome, email, senha, role, turma_id)
        VALUES (${authId}::uuid, ${nome.trim()}, ${email.trim()}, ${senha}, 'student', ${turmaId}::uuid)
        ON CONFLICT (id) DO UPDATE
          SET nome = EXCLUDED.nome, email = EXCLUDED.email,
              senha = EXCLUDED.senha, turma_id = EXCLUDED.turma_id
      `;
    } catch (dbError) {
      // Rollback: remove do Auth se o insert no banco falhou
      await admin.auth.admin.deleteUser(authId);
      throw dbError;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/alunos]", error);
    return NextResponse.json({ error: "Erro ao cadastrar aluno." }, { status: 500 });
  }
}
