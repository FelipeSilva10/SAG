import type { UsuarioSessao } from "@/lib/types";

export const PANEL_SESSION_COOKIE = "__Host-sag_session";
export const LEGACY_PANEL_SESSION_COOKIE = "sag_session";
export const PANEL_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export interface PanelSessionRpcRow {
  session_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: "ADMIN" | "TEACHER";
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
    || (row.actor_role !== "ADMIN" && row.actor_role !== "TEACHER")
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
      role: row.actor_role,
      mustChangeSenha: row.must_change_password,
    },
    expiresAt: row.session_expires_at,
  };
}

export function resolveProfessorId(
  session: ValidatedPanelSession,
  requestedProfessorId: unknown,
): string | null {
  if (session.actor.role === "TEACHER") return session.actor.id;
  return typeof requestedProfessorId === "string" && requestedProfessorId
    ? requestedProfessorId
    : null;
}
