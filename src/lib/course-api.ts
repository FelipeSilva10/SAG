import { NextResponse } from "next/server";
import { CourseError } from "@/lib/course-validation";

export function courseFailure(error: unknown, context: string) {
  if (error instanceof CourseError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ error: "Já existe um registro para esta turma e data." }, { status: 409 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  console.error(context, error);
  return NextResponse.json({ error: "Não foi possível concluir a operação." }, { status: 500 });
}
