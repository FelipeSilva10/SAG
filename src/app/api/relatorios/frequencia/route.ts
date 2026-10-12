import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { loadCourseData } from "@/lib/course-data";
import { buildCalendar, todayInSaoPaulo } from "@/lib/course-calendar";
import { CourseError, dateField, period, uuid } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import { attendanceCsv, consolidateAttendance } from "@/lib/attendance-report";
import { attendancePdf } from "@/lib/attendance-pdf";
import { requireSession, resolveProfessorId } from "@/lib/request-authorization";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const query = request.nextUrl.searchParams;
    const escolaId = uuid(query.get("escolaId"), "Escola");
    const professorId = resolveProfessorId(session, null);
    const data = await loadCourseData({ professorId, escolaId });
    // Professores só recebem escolas que contêm turmas de sua responsabilidade.
    if (!data.escolas.length) throw new CourseError("Escola sem turmas acessíveis.", 404);
    const escola = data.escolas[0];
    const defaults = [escola.dataInicio, ...data.turmas.map(t => t.dataInicio), ...data.chamadas.map(c => c.dataAula)].filter((d): d is string => !!d).sort();
    const inicio = dateField(query.get("inicio"), "Início") ?? defaults[0] ?? `${todayInSaoPaulo().slice(0, 4)}-01-01`;
    const fim = dateField(query.get("fim"), "Término") ?? escola.dataFim ?? todayInSaoPaulo();
    period(inicio, fim);
    const ids = data.turmas.map(t => t.id);
    const [students, entries] = await Promise.all([
      sql`select id, nome from perfis where role = 'student' and turma_id in ${sql(ids)} order by nome`,
      sql`select cp.chamada_id, cp.aluno_id, p.nome as aluno_nome, c.data_aula::text as data, cp.presente
        from chamada_presencas cp join chamadas c on c.id = cp.chamada_id join perfis p on p.id = cp.aluno_id
        where c.turma_id in ${sql(ids)} and c.data_aula between ${inicio}::date and ${fim}::date`,
    ]);
    const calendar = buildCalendar({ ...data, inicio, fim });
    const report = consolidateAttendance({ escola: escola.nome, inicio, fim,
      alunos: students.map(s => ({ id: s.id, nome: s.nome })),
      presencas: entries.map(p => ({ chamadaId: p.chamada_id, alunoId: p.aluno_id, alunoNome: p.aluno_nome, data: p.data, presente: p.presente })),
      chamadas: data.chamadas.filter(c => c.dataAula >= inicio && c.dataAula <= fim).map(c => ({ id: c.id, data: c.dataAula })),
      aulasPendentes: calendar.aulas.filter(a => a.status === "PENDENTE").length,
    });
    const headers = { "Cache-Control": "no-store" };
    if (query.get("formato") === "csv") return new NextResponse(attendanceCsv(report), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="frequencia-${inicio}-${fim}.csv"` } });
    if (query.get("formato") === "pdf") {
      const pdf = await attendancePdf(report);
      return new NextResponse(new Uint8Array(pdf), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="frequencia-${inicio}-${fim}.pdf"` } });
    }
    return NextResponse.json(report, { headers });
  } catch (error) { return courseFailure(error, "[GET relatorio frequencia]"); }
}
