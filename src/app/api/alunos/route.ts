// API route: /api/alunos — equivalente ao AlunoDAO.java

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { courseFailure } from "@/lib/course-api";
import { CourseError, textField, uuid } from "@/lib/course-validation";
import { studentEmail } from "@/lib/student-account";
import type { Aluno } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  getRequestSession,
  hasRole,
  resolveProfessorId,
  requireRole,
} from "@/lib/request-authorization";

const BASE_SELECT = sql`
  SELECT p.id, p.nome, p.email, p.turma_id,
         p.access_status, p.entity_status, p.must_change_senha,
         COALESCE(t.nome, 'Sem Turma') AS turma_nome,
         e.id AS escola_id, COALESCE(e.nome, 'Sem Escola') AS escola_nome
  FROM perfis p
  LEFT JOIN turmas t ON p.turma_id = t.id
  LEFT JOIN escolas e ON t.escola_id = e.id
  WHERE p.role = 'student'
`;

function mapAluno(r: Record<string, unknown>): Aluno {
  return {
    id: r.id as string,
    nome: r.nome as string,
    email: r.email as string,
    turmaId: r.turma_id as string,
    turmaNome: r.turma_nome as string,
    escolaNome: r.escola_nome as string,
    escolaId: r.escola_id as string | null,
    accessStatus: (r.access_status as string) ?? "ATIVO",
    entityStatus: (r.entity_status as string) ?? "ATIVO",
    mustChangeSenha: Boolean(r.must_change_senha),
  };
}

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

  try {
    let rows;

    if (!hasRole(session.actor, "ADMIN")) {
      rows = await sql`
        SELECT p.id, p.nome, p.email, p.turma_id,
               p.access_status, p.entity_status, p.must_change_senha,
               COALESCE(t.nome,'Sem Turma') AS turma_nome,
               e.id AS escola_id, COALESCE(e.nome,'Sem Escola') AS escola_nome
        FROM perfis p
        JOIN turmas t ON p.turma_id = t.id
        LEFT JOIN escolas e ON t.escola_id = e.id
        WHERE p.role = 'student'
          AND t.professor_id = ${professorId}::uuid
          AND (${turmaId}::uuid IS NULL OR p.turma_id = ${turmaId}::uuid)
        ORDER BY p.nome ASC
      `;
    } else if (turmaId) {
      rows = await sql`
        SELECT p.id, p.nome, p.email, p.turma_id,
               p.access_status, p.entity_status, p.must_change_senha,
               COALESCE(t.nome,'Sem Turma') AS turma_nome,
               e.id AS escola_id, COALESCE(e.nome,'Sem Escola') AS escola_nome
        FROM perfis p
        LEFT JOIN turmas t ON p.turma_id = t.id
        LEFT JOIN escolas e ON t.escola_id = e.id
        WHERE p.role = 'student' AND p.turma_id = ${turmaId}::uuid
        ORDER BY p.nome ASC
      `;
    } else if (professorId) {
      rows = await sql`
        SELECT p.id, p.nome, p.email, p.turma_id,
               p.access_status, p.entity_status, p.must_change_senha,
               COALESCE(t.nome,'Sem Turma') AS turma_nome,
               e.id AS escola_id, COALESCE(e.nome,'Sem Escola') AS escola_nome
        FROM perfis p
        JOIN turmas t ON p.turma_id = t.id
        LEFT JOIN escolas e ON t.escola_id = e.id
        WHERE p.role = 'student' AND t.professor_id = ${professorId}::uuid
        ORDER BY p.nome ASC
      `;
    } else {
      rows = await sql`
        SELECT p.id, p.nome, p.email, p.turma_id,
               p.access_status, p.entity_status, p.must_change_senha,
               COALESCE(t.nome,'Sem Turma') AS turma_nome,
               e.id AS escola_id, COALESCE(e.nome,'Sem Escola') AS escola_nome
        FROM perfis p
        LEFT JOIN turmas t ON p.turma_id = t.id
        LEFT JOIN escolas e ON t.escola_id = e.id
        WHERE p.role = 'student'
        ORDER BY p.nome ASC
      `;
    }

    return NextResponse.json(rows.map(mapAluno));
  } catch (error) {
    console.error("[GET /api/alunos]", error);
    return NextResponse.json({ error: "Erro ao buscar alunos." }, { status: 500 });
  }
}

// O mesmo Supabase Auth usado pelo Bloquin recebe a senha; ela não é salva em perfis.
export async function POST(request: NextRequest) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    const nome = textField(body.nome, "Nome do aluno");
    const email = studentEmail(body.email);
    const turmaId = uuid(body.turmaId, "Turma");
    const senha = body.senha;
    if (typeof senha !== "string" || senha.length < 6 || senha.length > 128) throw new CourseError("A senha deve ter de 6 a 128 caracteres.");
    const [turma] = await sql`select id, situacao_curso from turmas where id = ${turmaId}::uuid`;
    if (!turma || turma.situacao_curso !== "ATIVA") throw new CourseError("Escolha uma turma ativa.");
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Não foi possível criar a conta." }, { status: 422 });
    const id = data.user.id;
    try {
      await sql.begin(async tx => {
        await tx`insert into perfis (id, nome, email, role, turma_id)
          values (${id}::uuid, ${nome}, ${email}, 'student', ${turmaId}::uuid)
          on conflict (id) do update set nome = excluded.nome, email = excluded.email, role = 'student', turma_id = excluded.turma_id`;
        await tx`insert into membros_turma (turma_id, utilizador_id) values (${turmaId}::uuid, ${id}::uuid) on conflict do nothing`;
      });
    } catch (dbError) {
      await admin.auth.admin.deleteUser(id);
      throw dbError;
    }
    return NextResponse.json({ ok: true, id, email }, { status: 201 });
  } catch (error) { return courseFailure(error, "[POST aluno]"); }
}
