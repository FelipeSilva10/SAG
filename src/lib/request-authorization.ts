import type { NextRequest } from "next/server";
import { readTrustedPanelSession } from "@/lib/trusted-panel-session";
import type { ValidatedPanelSession } from "@/lib/panel-session-core";

export { resolveProfessorId } from "@/lib/panel-session-core";

export function getRequestSession(
  request: NextRequest,
): ValidatedPanelSession | null {
  return readTrustedPanelSession(request.headers);
}

export function ownsProfessorScope(
  session: ValidatedPanelSession,
  professorId: string,
): boolean {
  return session.actor.role === "ADMIN" || session.actor.id === professorId;
}
