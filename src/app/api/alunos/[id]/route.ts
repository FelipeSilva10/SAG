import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/request-authorization";
import { CourseError, textField, uuid } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import { studentEmail } from "@/lib/student-account";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  let passwordChanged = false;
  try {
    const id = uuid((await params).id);
    const body = await request.json();
    const nome = textField(body.nome, "Nome do aluno");
    const email = studentEmail(body.email);
    const turmaId = uuid(body.turmaId, "Turma");
    const senha = body.senha;
    if (senha && (typeof senha !== "string" || senha.length < 6 || senha.length > 128)) throw new CourseError("A senha deve ter de 6 a 128 caracteres.");
    const [current] = await sql`select id, email, entity_status from perfis where id = ${id}::uuid and role = 'student'`;
    if (!current) throw new CourseError("Aluno não encontrado.", 404);
    const entityStatus = body.entityStatus ?? current.entity_status;
    if (!["ATIVO", "INATIVO", "ENCERRADO"].includes(entityStatus)) throw new CourseError("Situação da matrícula inválida.");
    if (email !== current.email?.toLowerCase()) throw new CourseError("O login desta conta é fixo. Altere apenas nome, senha ou turma.");
    const [destination] = await sql`select id, situacao_curso from turmas where id = ${turmaId}::uuid`;
    if (!destination) throw new CourseError("Turma não encontrada.");
    if (senha) {
      const { error } = await getSupabaseAdmin().auth.admin.updateUserById(id, { password: senha });
      if (error) throw new CourseError(error.message, 422);
      passwordChanged = true;
    }
    await sql.begin(async tx => {
      const [student] = await tx`select turma_id from perfis where id = ${id}::uuid and role = 'student' for update`;
      if (!student) throw new CourseError("Aluno não encontrado.", 404);
      await tx`update perfis set nome = ${nome}, turma_id = ${turmaId}::uuid, entity_status = ${entityStatus}::entity_status,
        senha = case when ${passwordChanged} then null else senha end, updated_at = now() where id = ${id}::uuid`;
      // Retira apenas o vínculo principal anterior; outras participações são preservadas.
      if (student.turma_id && student.turma_id !== turmaId) await tx`delete from membros_turma where utilizador_id = ${id}::uuid and turma_id = ${student.turma_id}::uuid`;
      await tx`insert into membros_turma (turma_id, utilizador_id) values (${turmaId}::uuid, ${id}::uuid) on conflict do nothing`;
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (passwordChanged) return NextResponse.json({ error: "A senha foi atualizada no Bloquin, mas os dados do aluno não puderam ser salvos. Recarregue e salve os dados novamente." }, { status: 500 });
    return courseFailure(error, "[PATCH aluno]");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireRole(request, "ADMIN");
  if (session instanceof NextResponse) return session;
  try {
    const id = uuid((await params).id);
    const [student] = await sql`select id from perfis where id = ${id}::uuid and role = 'student'`;
    if (!student) throw new CourseError("Aluno não encontrado.", 404);
    const recorded = await sql`select 1 from chamada_presencas where aluno_id = ${id}::uuid limit 1`;
    if (recorded.length) throw new CourseError("Este aluno tem presenças registradas. Mantenha a conta para preservar os relatórios do curso.", 409);
    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id);
    if (error) throw new CourseError("Não foi possível remover a conta do Bloquin.", 422);
    await sql`delete from perfis where id = ${id}::uuid and role = 'student'`;
    return NextResponse.json({ ok: true });
  } catch (error) { return courseFailure(error, "[DELETE aluno]"); }
}
