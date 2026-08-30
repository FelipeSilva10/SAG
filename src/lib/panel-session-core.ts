import type { Role, UsuarioSessao } from "@/lib/types";

export const PANEL_SESSION_COOKIE = "__Host-sag_session";
export const LEGACY_PANEL_SESSION_COOKIE = "sag_session";
export const PANEL_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const VALID_ROLES: Role[] = ["ADMIN", "TEACHER"];

function isValidRoleArray(value: unknown): value is Role[] {
  return (
    Array.isArray(value)
    && value.length > 0
    && value.every((role) => VALID_ROLES.includes(role as Role))
  );
}

export interface PanelSessionRpcRow {
  session_id: string;
  actor_id: string;
  actor_name: string;
  actor_roles: string[];
  must_change_password: boolean;
  session_expires_at: string;
}

export interface ValidatedPanelSession {
  sessionId: string;
  actor: UsuarioSessao;
  expiresAt: string;
}

export function isOpaqueToken(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_TOKEN_PATTERN.test(value);
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

export function generateOpaqueToken(
  randomValues: (target: Uint8Array) => Uint8Array = (target) =>
    crypto.getRandomValues(target),
): string {
  const bytes = randomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export function mapPanelSessionRow(
  value: unknown,
): ValidatedPanelSession | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<PanelSessionRpcRow>;
  if (
    typeof row.session_id !== "string"
    || typeof row.actor_id !== "string"
    || typeof row.actor_name !== "string"
    || !isValidRoleArray(row.actor_roles)
    || typeof row.must_change_password !== "boolean"
    || typeof row.session_expires_at !== "string"
    || !Number.isFinite(Date.parse(row.session_expires_at))
  ) {
    return null;
  }

  return {
    sessionId: row.session_id,
    actor: {
      id: row.actor_id,
      nome: row.actor_name,
      roles: row.actor_roles,
      mustChangeSenha: row.must_change_password,
    },
    expiresAt: row.session_expires_at,
  };
}

// Nunca compare `roles` diretamente — um usuário admin+professor tem os dois
// valores no array, e checagens como `roles[0] === "ADMIN"` dependeriam de
// uma ordem que não é garantida.
export function hasRole(actor: UsuarioSessao, role: Role): boolean {
  return actor.roles.includes(role);
}

export function ownsProfessorScope(
  session: ValidatedPanelSession,
  professorId: string,
): boolean {
  return hasRole(session.actor, "ADMIN") || session.actor.id === professorId;
}

export function resolveProfessorId(
  session: ValidatedPanelSession,
  requestedProfessorId: unknown,
): string | null {
  // Admin (mesmo que também seja professor) pode consultar qualquer
  // professor, ou nenhum, explicitamente. Quem só é professor está sempre
  // restrito ao próprio escopo, ignorando qualquer valor vindo do cliente.
  if (hasRole(session.actor, "ADMIN")) {
    return typeof requestedProfessorId === "string" && requestedProfessorId
      ? requestedProfessorId
      : null;
  }
  if (hasRole(session.actor, "TEACHER")) return session.actor.id;
  return null;
}
