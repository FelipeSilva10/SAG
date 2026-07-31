// ─────────────────────────────────────────────────────────────────────────────
// API route: /api/escolas
// Equivalente ao EscolasDAO.java
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { Escola } from "@/lib/types";
import {
  getRequestSession,
  resolveProfessorId,
} from "@/lib/request-authorization";

// GET /api/escolas?professorId=xxx  (omitir para admin → todas)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const session = getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const professorId = resolveProfessorId(
    session,
    searchParams.get("professorId"),
  );

  try {
    let rows;

    if (professorId) {
      // Escolas das turmas do professor (equivalente a listarPorProfessor)
      rows = await sql`
        SELECT DISTINCT e.id, e.nome, e.status, COALESCE(e.tipo, 'PUBLICA') AS tipo
        FROM escolas e
        JOIN turmas t ON t.escola_id = e.id
        WHERE t.professor_id = ${professorId}::uuid
        ORDER BY e.nome ASC
      `;
    } else {
      // Todas as escolas (admin)
      rows = await sql`
        SELECT id, nome, status, COALESCE(tipo, 'PUBLICA') AS tipo
        FROM escolas
        ORDER BY nome ASC
      `;
    }

    const escolas: Escola[] = rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      status: r.status,
      tipo: r.tipo,
      tipoLabel: r.tipo === "PRIVADA" ? "Privada" : "Pública",
    }));

    return NextResponse.json(escolas);
  } catch (error) {
    console.error("[GET /api/escolas]", error);
    return NextResponse.json({ error: "Erro ao buscar escolas." }, { status: 500 });
  }
}

// POST /api/escolas — criar escola
export async function POST(request: NextRequest) {
  try {
    const { nome, tipo = "PUBLICA" } = await request.json();

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    await sql`
      INSERT INTO escolas (nome, status, tipo)
      VALUES (${nome.trim()}, 'ativo', ${tipo})
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/escolas]", error);
    return NextResponse.json({ error: "Erro ao criar escola." }, { status: 500 });
  }
}
