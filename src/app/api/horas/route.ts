// API route: /api/horas — equivalente ao listarRegistroHoras do ChamadaDAO.java
// Usa a view v_registro_horas já existente no banco

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { RegistroHoras } from "@/lib/types";
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
  const mes = searchParams.get("mes");    // "1" a "12" ou omitido
  const ano = searchParams.get("ano");    // "2025" ou omitido

  try {
    const rows = await sql`
      SELECT chamada_id, professor_id, professor_nome,
             turma_id, turma_nome, escola_nome,
             COALESCE(escola_tipo, 'PUBLICA') AS escola_tipo,
             data_aula::text AS data_aula,
             horario_inicio, horario_fim, tipo_aula,
             horas_ministradas, total_alunos, total_presentes, total_ausentes,
             COALESCE(presencas.alunos_presentes, '') AS alunos_presentes
      FROM v_registro_horas AS registro
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(perfis.nome, '; ' ORDER BY perfis.nome) AS alunos_presentes
        FROM chamada_presencas
        JOIN perfis ON perfis.id = chamada_presencas.aluno_id
        WHERE chamada_presencas.chamada_id = registro.chamada_id
          AND chamada_presencas.presente = true
      ) AS presencas ON true
      WHERE (${professorId}::uuid IS NULL OR professor_id = ${professorId}::uuid)
        AND (${mes ? Number(mes) : null}::int IS NULL OR mes = ${mes ? Number(mes) : null}::int)
        AND (${ano ? Number(ano) : null}::int IS NULL OR ano = ${ano ? Number(ano) : null}::int)
      ORDER BY data_aula DESC, professor_nome, horario_inicio
    `;

    const lista: RegistroHoras[] = rows.map((r) => ({
      chamadaId: r.chamada_id as string,
      professorId: r.professor_id as string,
      professorNome: r.professor_nome as string,
      turmaId: r.turma_id as string,
      turmaNome: r.turma_nome as string,
      escolaNome: r.escola_nome as string,
      escolaTipo: r.escola_tipo as "PUBLICA" | "PRIVADA",
      dataAula: r.data_aula as string,
      horarioInicio: r.horario_inicio as string,
      horarioFim: r.horario_fim as string,
      tipoAula: r.tipo_aula as "AULA" | "REUNIÃO" | "AULA_SUBSTITUTA",
      horasMinistradas: Number(r.horas_ministradas),
      totalAlunos: Number(r.total_alunos),
      totalPresentes: Number(r.total_presentes),
      totalAusentes: Number(r.total_ausentes),
      alunosPresentes: r.alunos_presentes as string,
    }));

    return NextResponse.json(lista);
  } catch (error) {
    console.error("[GET /api/horas]", error);
    return NextResponse.json({ error: "Erro ao buscar registro de horas." }, { status: 500 });
  }
}
