// API route: /api/professores — equivalente ao ProfessorDAO.java

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Professor } from "@/lib/types";

function mapProf(r: Record<string, unknown>): Professor {
  return {
    id: r.id as string,
    nome: r.nome as string,
    email: r.email as string,
    accessStatus: (r.access_status as string) ?? "ATIVO",
    entityStatus: (r.entity_status as string) ?? "ATIVO",
    mustChangeSenha: Boolean(r.must_change_senha),
  };
}

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, nome, email, access_status, entity_status, must_change_senha
      FROM perfis
      WHERE role = 'teacher'
      ORDER BY nome ASC
    `;
    return NextResponse.json(rows.map(mapProf));
  } catch (error) {
    console.error("[GET /api/professores]", error);
    return NextResponse.json({ error: "Erro ao buscar professores." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nome, email, senha } = await request.json();

    if (!nome?.trim() || !email?.trim() || !senha) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: "Senha mínima de 6 caracteres." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "E-mail já cadastrado." },
        { status: 422 }
      );
    }

    const authId = data.user.id;

    try {
      await sql`
        INSERT INTO perfis (id, nome, email, senha, role)
        VALUES (${authId}::uuid, ${nome.trim()}, ${email.trim()}, ${senha}, 'teacher')
        ON CONFLICT (id) DO UPDATE
          SET nome = EXCLUDED.nome, email = EXCLUDED.email, senha = EXCLUDED.senha
      `;
    } catch (dbError) {
      await admin.auth.admin.deleteUser(authId);
      throw dbError;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/professores]", error);
    return NextResponse.json({ error: "Erro ao cadastrar professor." }, { status: 500 });
  }
}
