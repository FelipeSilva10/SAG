// API route: /api/diario — equivalente ao DiarioDAO.java

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { DiarioAula } from "@/lib/types";
import {
  getRequestSession,
  resolveProfessorId,
} from "@/lib/request-authorization";

function mapDiario(r: Record<string, unknown>): DiarioAula {
  return {
    id: r.id as string,
    professorId: r.professor_id as string,
    turmaId: r.turma_id as string,
    turmaNome: r.turma_nome as string,
    escolaNome: r.escola_nome as string,
    dataAula: (r.data_aula as string).split("T")[0], // ISO date
    titulo: (r.titulo as string) ?? "",
    conteudo: (r.conteudo as string) ?? "",
    observacoes: (r.observacoes as string) ?? "",
  };
}

const BASE = `
  SELECT d.id, d.professor_id,
         d.turma_id, t.nome AS turma_nome, e.nome AS escola_nome,
         d.data_aula::text AS data_aula, d.titulo, d.conteudo, d.observacoes
  FROM diario_aulas d
  JOIN turmas  t ON t.id = d.turma_id
  JOIN escolas e ON e.id = t.escola_id
`;

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
  const turmaId = searchParams.get("turmaId");

  if (!professorId) {
    return NextResponse.json({ error: "professorId é obrigatório." }, { status: 400 });
  }

  try {
    let rows;
    if (turmaId) {
      rows = await sql`
        SELECT d.id, d.professor_id,
               d.turma_id, t.nome AS turma_nome, e.nome AS escola_nome,
               d.data_aula::text AS data_aula, d.titulo, d.conteudo, d.observacoes
        FROM diario_aulas d
        JOIN turmas  t ON t.id = d.turma_id
        JOIN escolas e ON e.id = t.escola_id
        WHERE d.professor_id = ${professorId}::uuid AND d.turma_id = ${turmaId}::uuid
        ORDER BY d.data_aula DESC, d.created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT d.id, d.professor_id,
               d.turma_id, t.nome AS turma_nome, e.nome AS escola_nome,
               d.data_aula::text AS data_aula, d.titulo, d.conteudo, d.observacoes
        FROM diario_aulas d
        JOIN turmas  t ON t.id = d.turma_id
        JOIN escolas e ON e.id = t.escola_id
        WHERE d.professor_id = ${professorId}::uuid
        ORDER BY d.data_aula DESC, d.created_at DESC
      `;
    }
    return NextResponse.json(rows.map(mapDiario));
  } catch (error) {
    console.error("[GET /api/diario]", error);
    return NextResponse.json({ error: "Erro ao buscar diário." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const {
      professorId: requestedProfessorId,
      turmaId,
      dataAula,
      titulo,
      conteudo,
      observacoes,
    } = await request.json();
    const professorId = resolveProfessorId(session, requestedProfessorId);

    if (!professorId || !turmaId || !dataAula) {
      return NextResponse.json({ error: "professorId, turmaId e dataAula são obrigatórios." }, { status: 400 });
    }

    if (session.actor.role === "TEACHER") {
      const ownedClass = await sql`
        SELECT 1
        FROM turmas
        WHERE id = ${turmaId}::uuid
          AND professor_id = ${session.actor.id}::uuid
        LIMIT 1
      `;
      if (ownedClass.length === 0) {
        return NextResponse.json(
          { error: "Turma não autorizada." },
          { status: 403 },
        );
      }
    }

    const [row] = await sql`
      INSERT INTO diario_aulas (professor_id, turma_id, data_aula, titulo, conteudo, observacoes)
      VALUES (${professorId}::uuid, ${turmaId}::uuid, ${dataAula}::date,
              ${titulo ?? ""}, ${conteudo ?? ""}, ${observacoes ?? ""})
      RETURNING id
    `;

    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/diario]", error);
    return NextResponse.json({ error: "Erro ao criar entrada no diário." }, { status: 500 });
  }
}
