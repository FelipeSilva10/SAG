import { NextRequest, NextResponse } from "next/server";
import { readTrustedPanelSession } from "@/lib/trusted-panel-session";
import { hasRole, type ValidatedPanelSession } from "@/lib/panel-session-core";
import type { Role } from "@/lib/types";

export {
  hasRole,
  ownsProfessorScope,
  resolveProfessorId,
} from "@/lib/panel-session-core";

export function getRequestSession(
  request: NextRequest,
): ValidatedPanelSession | null {
  return readTrustedPanelSession(request.headers);
}

// Lê e valida a sessão de uma vez; retorna a resposta de erro pronta quando
// a checagem falha, para o caller devolver com `return`.
export function requireSession(
  request: NextRequest,
): ValidatedPanelSession | NextResponse {
  const session = getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  return session;
}

export function requireRole(
  request: NextRequest,
  role: Role,
): ValidatedPanelSession | NextResponse {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  if (!hasRole(session.actor, role)) {
    return NextResponse.json(
      { error: "Seu perfil não tem permissão para esta operação." },
      { status: 403 },
    );
  }
  return session;
}
