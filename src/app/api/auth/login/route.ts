// src/app/api/auth/login/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Estratégia de autenticação:
//   perfis.email identifica a conta; perfis_papeis define quais painéis ela
//   pode acessar (admin, teacher, ou ambos). Uma identidade não precisa mais
//   ser "só admin" ou "só professor" — os papéis de painel são independentes
//   de perfis.role (que continua descrevendo o tipo de conta para o Bloquin).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  clearPanelSessionCookies,
  createDirectPanelSession,
  getPanelSessionToken,
  revokePanelSessionToken,
  setPanelSessionCookie,
} from "@/lib/panel-session";

interface ProfRow {
  id: string;
  senha: string;
  access_status: string;
  temp_senha: string | null;
  temp_senha_expiry: string | null;
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { login, senha } = await request.json();

    if (!login?.trim() || !senha) {
      return NextResponse.json(
        { error: "Login e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const loginNorm = login.trim().toLowerCase();

    // Só identidades com pelo menos um papel de painel (admin ou teacher)
    // podem entrar no SAG — alunos continuam de fora, mesmo tendo email.
    const profRows = await sql`
      SELECT p.id, p.senha, p.access_status, p.temp_senha, p.temp_senha_expiry
      FROM perfis p
      WHERE LOWER(p.email) = ${loginNorm}
        AND EXISTS (
          SELECT 1 FROM perfis_papeis pp WHERE pp.perfil_id = p.id
        )
      LIMIT 1
    `;

    if (profRows.length === 0) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const prof = profRows[0] as ProfRow;

    if (prof.access_status !== "ATIVO") {
      return NextResponse.json(
        { error: "Conta suspensa ou bloqueada. Contate o administrador." },
        { status: 403 }
      );
    }

    // Compara senha — tenta senha normal primeiro, depois temp_senha
    const senhaOk = prof.senha === senha;
    const agora = new Date();
    const tempValida =
      prof.temp_senha !== null &&
      prof.temp_senha === senha &&
      prof.temp_senha_expiry !== null &&
      new Date(prof.temp_senha_expiry) > agora;

    if (!senhaOk && !tempValida) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    // A sessão opaca (RPC create_backoffice_session) resolve nome, papéis e
    // must_change_senha ao vivo a partir de perfis/perfis_papeis.
    const panelSession = await createDirectPanelSession(prof.id);
    const response = NextResponse.json(
      { sessao: panelSession.session.actor },
      { headers: { "Cache-Control": "no-store" } },
    );
    setPanelSessionCookie(response, panelSession.rawToken);

    return response;
  } catch (error) {
    console.error("[auth/login POST]", error);
    return NextResponse.json(
      { error: "Erro de conexão com o banco de dados." },
      { status: 500 }
    );
  }
}

// ── DELETE /api/auth/login → logout ──────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  await revokePanelSessionToken(
    getPanelSessionToken(request),
    "panel_logout",
  );
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearPanelSessionCookies(response);
  return response;
}
