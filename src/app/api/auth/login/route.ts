// ─────────────────────────────────────────────────────────────────────────────
// API route: POST /api/auth/login
// Equivalente ao AutenticacaoDAO.java
//
// Estratégia idêntica ao Java:
//  1. Tenta autenticar como Admin (tabela backoffice_admins)
//  2. Se não encontrar, tenta como Professor (tabela perfis, role='teacher')
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { UsuarioSessao } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { login, senha } = await request.json();

    if (!login || !senha) {
      return NextResponse.json(
        { error: "Login e senha são obrigatórios." },
        { status: 400 }
      );
    }

    let sessao: UsuarioSessao | null = null;

    // 1. Tenta admin
    const adminRows = await sql`
      SELECT id, nome
      FROM backoffice_admins
      WHERE login = ${login} AND senha = ${senha}
      LIMIT 1
    `;

    if (adminRows.length > 0) {
      sessao = {
        id: adminRows[0].id,
        nome: adminRows[0].nome,
        role: "ADMIN",
      };
    }

    // 2. Tenta professor
    if (!sessao) {
      const profRows = await sql`
        SELECT id, nome
        FROM perfis
        WHERE role = 'teacher'
          AND email = ${login}
          AND senha = ${senha}
        LIMIT 1
      `;

      if (profRows.length > 0) {
        sessao = {
          id: profRows[0].id,
          nome: profRows[0].nome,
          role: "TEACHER",
        };
      }
    }

    if (!sessao) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    // Seta cookie de sessão httpOnly
    const response = NextResponse.json({ sessao });
    response.cookies.set("sag_session", JSON.stringify(sessao), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Erro de conexão com o banco de dados." },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/login → logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("sag_session");
  return response;
}
