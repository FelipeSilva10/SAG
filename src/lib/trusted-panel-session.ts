import type { ValidatedPanelSession } from "@/lib/panel-session-core";

const VALIDATED_HEADER = "x-sag-session-validated";
const SESSION_ID_HEADER = "x-sag-session-id";
const ACTOR_ID_HEADER = "x-sag-actor-id";
const ACTOR_NAME_HEADER = "x-sag-actor-name";
const ACTOR_ROLE_HEADER = "x-sag-actor-role";
const MUST_CHANGE_HEADER = "x-sag-must-change-password";
const EXPIRES_HEADER = "x-sag-session-expires-at";

const TRUSTED_HEADERS = [
  VALIDATED_HEADER,
  SESSION_ID_HEADER,
  ACTOR_ID_HEADER,
  ACTOR_NAME_HEADER,
  ACTOR_ROLE_HEADER,
  MUST_CHANGE_HEADER,
  EXPIRES_HEADER,
];

export function removeTrustedPanelSessionHeaders(headers: Headers): void {
  for (const name of TRUSTED_HEADERS) headers.delete(name);
}

export function writeTrustedPanelSessionHeaders(
  headers: Headers,
  session: ValidatedPanelSession,
): void {
  removeTrustedPanelSessionHeaders(headers);
  headers.set(VALIDATED_HEADER, "1");
  headers.set(SESSION_ID_HEADER, session.sessionId);
  headers.set(ACTOR_ID_HEADER, session.actor.id);
  headers.set(ACTOR_NAME_HEADER, encodeURIComponent(session.actor.nome));
  headers.set(ACTOR_ROLE_HEADER, session.actor.role);
  headers.set(
    MUST_CHANGE_HEADER,
    session.actor.mustChangeSenha ? "1" : "0",
  );
  headers.set(EXPIRES_HEADER, session.expiresAt);
}

export function readTrustedPanelSession(
  headers: Headers,
): ValidatedPanelSession | null {
  const role = headers.get(ACTOR_ROLE_HEADER);
  const expiresAt = headers.get(EXPIRES_HEADER);
  if (
    headers.get(VALIDATED_HEADER) !== "1"
    || (role !== "ADMIN" && role !== "TEACHER")
    || !expiresAt
    || !Number.isFinite(Date.parse(expiresAt))
  ) {
    return null;
  }

  const sessionId = headers.get(SESSION_ID_HEADER);
  const actorId = headers.get(ACTOR_ID_HEADER);
  const encodedName = headers.get(ACTOR_NAME_HEADER);
  if (!sessionId || !actorId || !encodedName) return null;

  let nome: string;
  try {
    nome = decodeURIComponent(encodedName);
  } catch {
    return null;
  }

  return {
    sessionId,
    actor: {
      id: actorId,
      nome,
      role,
      mustChangeSenha: headers.get(MUST_CHANGE_HEADER) === "1",
    },
    expiresAt,
  };
}
