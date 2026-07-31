import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  getRequestSession,
  resolveProfessorId,
} from "@/lib/request-authorization";
 
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
 
  if (!professorId) {
    return NextResponse.json({ error: "professorId obrigatório." }, { status: 400 });
  }
 
  try {
    const rows = await sql`
      SELECT
        t.id AS turma_id,
        t.nome AS turma_nome,
        e.nome AS escola_nome,
        COUNT(DISTINCT c.id) AS total_chamadas,
        MAX(c.data_aula::text) AS ultima_chamada,
        ROUND(
          100.0 * COUNT(cp.id) FILTER (WHERE cp.presente)::numeric
          / NULLIF(COUNT(cp.id), 0), 1
        ) AS media_presenca
      FROM turmas t
      JOIN escolas e ON e.id = t.escola_id
      LEFT JOIN chamadas c ON c.turma_id = t.id AND c.professor_id = ${professorId}::uuid
      LEFT JOIN chamada_presencas cp ON cp.chamada_id = c.id
      WHERE t.professor_id = ${professorId}::uuid
      GROUP BY t.id, t.nome, e.nome
      ORDER BY t.nome
    `;
 
    return NextResponse.json(
      rows.map((r) => ({
        turmaId: r.turma_id,
        turmaNome: r.turma_nome,
        escolaNome: r.escola_nome,
        totalChamadas: Number(r.total_chamadas),
        ultimaChamada: r.ultima_chamada ?? null,
        mediaPresenca: Number(r.media_presenca ?? 0),
      }))
    );
  } catch (error) {
    console.error("[GET /api/chamada/resumo]", error);
    return NextResponse.json({ error: "Erro ao buscar resumo." }, { status: 500 });
  }
}
