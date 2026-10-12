// API route: /api/chamada — equivalente ao ChamadaDAO.java

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { Chamada, ChamadaPresenca } from "@/lib/types";
import { loadCalendar } from "@/lib/course-data";
import { isTeachingDay, todayInSaoPaulo } from "@/lib/course-calendar";
import { CourseError, dateField, times, uuid } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import {
  getRequestSession,
  hasRole,
  resolveProfessorId,
} from "@/lib/request-authorization";

// GET /api/chamada?professorId=xxx
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
      WHERE (${professorId}::uuid IS NULL OR c.professor_id = ${professorId}::uuid)
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

// Um registro por turma e data, com todos os alunos atuais e transação completa.
export async function POST(request: NextRequest) {
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  try {
    const body = await request.json();
    const turmaId = uuid(body.turmaId, "Turma");
    const dataAula = dateField(body.dataAula, "Data da aula");
    if (!dataAula) throw new CourseError("Informe a data da aula.");
    if (dataAula > todayInSaoPaulo()) throw new CourseError("A chamada só pode ser registrada até a data de hoje.");
    if (!Array.isArray(body.presencas) || !body.presencas.length || body.presencas.length > 2000) throw new CourseError("Carregue os alunos antes de salvar a chamada.");
    const seen = new Set<string>();
    const presencas: { alunoId: string; presente: boolean }[] = body.presencas.map((p: ChamadaPresenca) => {
      const alunoId = uuid(p?.alunoId, "Aluno");
      if (typeof p.presente !== "boolean" || seen.has(alunoId)) throw new CourseError("Presenças inválidas ou aluno repetido.");
      seen.add(alunoId);
      return { alunoId, presente: p.presente };
    });
    const id = await sql.begin(async tx => {
      const [turma] = await tx`select id, professor_id from turmas where id = ${turmaId}::uuid
        and (${hasRole(session.actor, "ADMIN")} or professor_id = ${session.actor.id}::uuid) for update`;
      if (!turma) throw new CourseError("Turma não encontrada ou não autorizada.", 404);
      if (!turma.professor_id) throw new CourseError("Atribua um professor à turma.");
      const [existing] = await tx`select id from chamadas where turma_id = ${turmaId}::uuid and data_aula = ${dataAula}::date`;
      if (existing) throw new CourseError("Chamada já registrada para esta turma e data. Consulte o histórico.", 409);
      const calendar = await loadCalendar({ professorId: null, turmaId }, dataAula, dataAula);
      const aula = calendar.aulas.find(a => a.data === dataAula);
      if (!aula || !isTeachingDay(aula)) throw new CourseError("Não há aula nesta data. Confira o calendário ou cadastre uma aula extra/reposição.", 409);
      const horario = times(aula.horarioInicio, aula.horarioFim);
      const students = await tx`select id from perfis where turma_id = ${turmaId}::uuid and role = 'student' and entity_status = 'ATIVO'`;
      if (students.length !== seen.size || students.some(s => !seen.has(s.id))) throw new CourseError("A lista de alunos mudou ou contém alunos de outra turma. Carregue os alunos novamente.", 409);
      const [call] = await tx`insert into chamadas (professor_id, turma_id, cronograma_id, data_aula, horario_inicio, horario_fim)
        values (${turma.professor_id}::uuid, ${turmaId}::uuid, ${aula.cronogramaId}::uuid, ${dataAula}::date,
          ${horario.horarioInicio}::time, ${horario.horarioFim}::time) returning id`;
      const records = presencas.map(p => ({ chamada_id: call.id, aluno_id: p.alunoId, presente: p.presente }));
      await tx`insert into chamada_presencas ${tx(records, 'chamada_id', 'aluno_id', 'presente')}`;
      return call.id;
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) { return courseFailure(error, "[POST chamada]"); }
}
