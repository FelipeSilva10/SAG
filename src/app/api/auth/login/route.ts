// src/app/api/auth/login/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Estratégia de autenticação:
//  1. Tenta Admin     → tabela backoffice_admins (campo `login`)
//  2. Tenta Professor → tabela perfis, role='teacher' (campo `email`)
//
// BUG CORRIGIDO: a query anterior usava `OR login = ...` na tabela perfis,
// mas essa tabela não possui coluna `login` — apenas `email`.
// Isso causava um erro SQL em todo login de professor.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { UsuarioSessao } from "@/lib/types";
import {
  clearPanelSessionCookies,
  createDirectPanelSession,
  getPanelSessionToken,
  revokePanelSessionToken,
  setPanelSessionCookie,
} from "@/lib/panel-session";

interface ProfRow {
  id: string;
  nome: string;
  senha: string;
  access_status: string;
  must_change_senha: boolean;
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
    let sessao: UsuarioSessao | null = null;

    // ── 1. Tenta Admin (backoffice_admins.login) ──────────────────────────────
    const adminRows = await sql`
      SELECT id, nome
      FROM backoffice_admins
      WHERE LOWER(login) = ${loginNorm}
        AND senha = ${senha}
      LIMIT 1
    `;

    if (adminRows.length > 0) {
      sessao = {
        id:   adminRows[0].id as string,
        nome: adminRows[0].nome as string,
        role: "ADMIN",
      };
    }

    // ── 2. Tenta Professor (perfis.email) ─────────────────────────────────────
    // A tabela `perfis` NÃO possui coluna `login` — apenas `email`.
    // O professor digita o e-mail completo ou só o prefixo; aqui buscamos
    // pelo e-mail exato para evitar ambiguidades.
    if (!sessao) {
      const profRows = await sql`
        SELECT id, nome, senha, access_status,
               must_change_senha, temp_senha, temp_senha_expiry
        FROM perfis
        WHERE role = 'teacher'
          AND LOWER(email) = ${loginNorm}
        LIMIT 1
      `;

      if (profRows.length > 0) {
        const prof = profRows[0] as ProfRow;

        // Verifica bloqueio / suspensão
        if (prof.access_status !== "ATIVO") {
          return NextResponse.json(
            { error: "Conta suspensa ou bloqueada. Contate o administrador." },
            { status: 403 }
          );
        }

        // Compara senha — tenta senha normal primeiro, depois temp_senha
        const senhaOk = prof.senha === senha;
        const agora   = new Date();
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

        sessao = {
          id:              prof.id,
          nome:            prof.nome,
          role:            "TEACHER",
          mustChangeSenha: prof.must_change_senha || tempValida,
        };
      }
    }

    // ── 3. Nenhum match ───────────────────────────────────────────────────────
    if (!sessao) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    // ── 4. Cria sessão opaca, persistida somente como SHA-256 ──────────────────
    const panelSession = await createDirectPanelSession(sessao);
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
