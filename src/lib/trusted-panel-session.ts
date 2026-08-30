import type { Role } from "@/lib/types";
import type { ValidatedPanelSession } from "@/lib/panel-session-core";

const VALIDATED_HEADER = "x-sag-session-validated";
const SESSION_ID_HEADER = "x-sag-session-id";
const ACTOR_ID_HEADER = "x-sag-actor-id";
const ACTOR_NAME_HEADER = "x-sag-actor-name";
const ACTOR_ROLES_HEADER = "x-sag-actor-roles";
const MUST_CHANGE_HEADER = "x-sag-must-change-password";
const EXPIRES_HEADER = "x-sag-session-expires-at";

const TRUSTED_HEADERS = [
  VALIDATED_HEADER,
  SESSION_ID_HEADER,
  ACTOR_ID_HEADER,
  ACTOR_NAME_HEADER,
  ACTOR_ROLES_HEADER,
  MUST_CHANGE_HEADER,
  EXPIRES_HEADER,
];

const VALID_ROLES: Role[] = ["ADMIN", "TEACHER"];

function isValidRoleArray(value: unknown): value is Role[] {
  return (
    Array.isArray(value)
    && value.length > 0
    && value.every((role) => VALID_ROLES.includes(role as Role))
  );
}

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
  headers.set(ACTOR_ROLES_HEADER, JSON.stringify(session.actor.roles));
  headers.set(
    MUST_CHANGE_HEADER,
    session.actor.mustChangeSenha ? "1" : "0",
  );
  headers.set(EXPIRES_HEADER, session.expiresAt);
}

export function readTrustedPanelSession(
  headers: Headers,
): ValidatedPanelSession | null {
  const rolesHeader = headers.get(ACTOR_ROLES_HEADER);
  const expiresAt = headers.get(EXPIRES_HEADER);
  if (
    headers.get(VALIDATED_HEADER) !== "1"
    || !rolesHeader
    || !expiresAt
    || !Number.isFinite(Date.parse(expiresAt))
  ) {
    return null;
  }

  let roles: unknown;
  try {
    roles = JSON.parse(rolesHeader);
  } catch {
    return null;
  }
  if (!isValidRoleArray(roles)) return null;

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
      roles,
      mustChangeSenha: headers.get(MUST_CHANGE_HEADER) === "1",
    },
    expiresAt,
  };
}
