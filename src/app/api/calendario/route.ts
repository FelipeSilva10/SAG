import { NextRequest, NextResponse } from "next/server";
import { loadCalendar } from "@/lib/course-data";
import { addDays, todayInSaoPaulo } from "@/lib/course-calendar";
import { dateField, period, uuid } from "@/lib/course-validation";
import { courseFailure } from "@/lib/course-api";
import { requireSession, resolveProfessorId } from "@/lib/request-authorization";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const query = request.nextUrl.searchParams;
    const inicio = dateField(query.get("inicio"), "Início") ?? addDays(todayInSaoPaulo(), -15);
    const fim = dateField(query.get("fim"), "Término") ?? addDays(todayInSaoPaulo(), 45);
    period(inicio, fim);
    const escolaId = query.get("escolaId") || null;
    const turmaId = query.get("turmaId") || null;
    const professorId = resolveProfessorId(session, query.get("professorId"));
    if (escolaId) uuid(escolaId, "Escola");
    if (turmaId) uuid(turmaId, "Turma");
    if (professorId) uuid(professorId, "Professor");
    return NextResponse.json(await loadCalendar({ professorId, escolaId, turmaId }, inicio, fim), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return courseFailure(error, "[GET calendario]"); }
}
