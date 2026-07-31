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
  const turmaId = searchParams.get("turmaId");
  const data = searchParams.get("data");
 
  if (!professorId || !turmaId || !data) {
    return NextResponse.json({ existe: false });
  }
 
  try {
    const rows = await sql`
      SELECT 1 FROM chamadas
      WHERE professor_id = ${professorId}::uuid
        AND turma_id = ${turmaId}::uuid
        AND data_aula = ${data}::date
      LIMIT 1
    `;
    return NextResponse.json({ existe: rows.length > 0 });
  } catch {
    return NextResponse.json({ existe: false });
  }
}
