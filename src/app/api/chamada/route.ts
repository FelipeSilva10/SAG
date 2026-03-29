// API route: /api/chamada — equivalente ao ChamadaDAO.java

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { Chamada, ChamadaPresenca } from "@/lib/types";

// GET /api/chamada?professorId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const professorId = searchParams.get("professorId");

  if (!professorId) {
    return NextResponse.json({ error: "professorId é obrigatório." }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT c.id, c.professor_id, c.turma_id, t.nome AS turma_nome,
             c.cronograma_id,
             c.data_aula::text AS data_aula,
             TO_CHAR(c.horario_inicio, 'HH24:MI') AS horario_inicio,
             TO_CHAR(c.horario_fim,    'HH24:MI') AS horario_fim,
             COUNT(cp.id)                                         AS total_alunos,
             COUNT(cp.id) FILTER (WHERE cp.presente)             AS total_presentes
      FROM chamadas c
      JOIN turmas t ON t.id = c.turma_id
      LEFT JOIN chamada_presencas cp ON cp.chamada_id = c.id
      WHERE c.professor_id = ${professorId}::uuid
      GROUP BY c.id, t.nome
      ORDER BY c.data_aula DESC, c.horario_inicio
    `;

    const chamadas: Chamada[] = rows.map((r) => ({
      id: r.id as string,
      professorId: r.professor_id as string,
      turmaId: r.turma_id as string,
      turmaNome: r.turma_nome as string,
      cronogramaId: r.cronograma_id as string | null,
      dataAula: r.data_aula as string,
      horarioInicio: r.horario_inicio as string,
      horarioFim: r.horario_fim as string,
      totalAlunos: Number(r.total_alunos),
      totalPresentes: Number(r.total_presentes),
    }));

    return NextResponse.json(chamadas);
  } catch (error) {
    console.error("[GET /api/chamada]", error);
    return NextResponse.json({ error: "Erro ao buscar chamadas." }, { status: 500 });
  }
}

// POST /api/chamada — abre nova chamada com presenças (transação)
export async function POST(request: NextRequest) {
  try {
    const { professorId, turmaId, cronogramaId, dataAula, horarioInicio, horarioFim, presencas } =
      await request.json() as {
        professorId: string;
        turmaId: string;
        cronogramaId: string | null;
        dataAula: string;
        horarioInicio: string;
        horarioFim: string;
        presencas: ChamadaPresenca[];
      };

    // Verifica duplicata
    const existe = await sql`
      SELECT 1 FROM chamadas
      WHERE professor_id = ${professorId}::uuid
        AND turma_id = ${turmaId}::uuid
        AND data_aula = ${dataAula}::date
      LIMIT 1
    `;

    if (existe.length > 0) {
      return NextResponse.json(
        { error: "Chamada já registrada para esta turma nesta data." },
        { status: 409 }
      );
    }

// Insere chamada e presenças em transação
    await sql.begin(async (tx: any) => {
      const [chamada] = await tx`
        INSERT INTO chamadas
          (professor_id, turma_id, cronograma_id, data_aula, horario_inicio, horario_fim)
        VALUES (
          ${professorId}::uuid,
          ${turmaId}::uuid,
          ${cronogramaId ?? null}::uuid,
          ${dataAula}::date,
          ${horarioInicio}::time,
          ${horarioFim}::time
        )
        RETURNING id
      `;

      const chamadaId = chamada.id as string;

      for (const p of presencas) {
        await tx`
          INSERT INTO chamada_presencas (chamada_id, aluno_id, presente)
          VALUES (${chamadaId}::uuid, ${p.alunoId}::uuid, ${p.presente})
          ON CONFLICT (chamada_id, aluno_id) DO UPDATE SET presente = EXCLUDED.presente
        `;
      }

      return chamadaId;
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/chamada]", error);
    return NextResponse.json({ error: "Erro ao salvar chamada." }, { status: 500 });
  }
}