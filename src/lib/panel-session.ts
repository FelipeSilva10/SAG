import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  generateOpaqueToken,
  isOpaqueToken,
  LEGACY_PANEL_SESSION_COOKIE,
  mapPanelSessionRow,
  PANEL_SESSION_COOKIE,
  PANEL_SESSION_MAX_AGE_SECONDS,
  sha256Hex,
  type ValidatedPanelSession,
} from "@/lib/panel-session-core";
import { validatePanelSessionToken } from "@/lib/panel-session-validation";

export { validatePanelSessionToken } from "@/lib/panel-session-validation";

const HANDOFF_PURPOSE = "admin_panel_login";
const HANDOFF_AUDIENCE = "sag";

export const panelSessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  maxAge: PANEL_SESSION_MAX_AGE_SECONDS,
  path: "/",
};

function firstRpcRow(data: unknown): unknown {
  return Array.isArray(data) && data.length === 1 ? data[0] : null;
}

async function createSessionFromRpc(
  rpcName: "consume_admin_panel_handoff" | "create_backoffice_session",
  parameters: Record<string, string>,
): Promise<{ rawToken: string; session: ValidatedPanelSession } | null> {
  const rawToken = generateOpaqueToken();
  const tokenHash = await sha256Hex(rawToken);
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc(rpcName, {
    ...parameters,
    p_panel_session_token_hash: tokenHash,
  });
  if (error) throw error;

  const session = mapPanelSessionRow(firstRpcRow(data));
  return session ? { rawToken, session } : null;
}

export async function exchangeAdminHandoff(
  code: string,
): Promise<{ rawToken: string; session: ValidatedPanelSession } | null> {
  if (!isOpaqueToken(code)) return null;

  return createSessionFromRpc("consume_admin_panel_handoff", {
    p_code_hash: await sha256Hex(code),
    p_purpose: HANDOFF_PURPOSE,
    p_audience: HANDOFF_AUDIENCE,
  });
}

export async function createDirectPanelSession(
  actorId: string,
): Promise<{ rawToken: string; session: ValidatedPanelSession }> {
  const result = await createSessionFromRpc("create_backoffice_session", {
    p_actor_id: actorId,
  });
  if (!result) throw new Error("panel_session_creation_failed");
  return result;
}

export async function getCurrentPanelSession(): Promise<ValidatedPanelSession | null> {
  const cookieStore = await cookies();
  return validatePanelSessionToken(
    cookieStore.get(PANEL_SESSION_COOKIE)?.value,
  );
}

export function getPanelSessionToken(request: NextRequest): string | null {
  return request.cookies.get(PANEL_SESSION_COOKIE)?.value ?? null;
}

export async function revokePanelSessionToken(
  rawToken: string | null | undefined,
  reason = "logout",
): Promise<boolean> {
  if (!isOpaqueToken(rawToken)) return false;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("revoke_backoffice_session", {
    p_panel_session_token_hash: await sha256Hex(rawToken),
    p_reason: reason,
  });
  return !error && data === true;
}

export function setPanelSessionCookie(
  response: NextResponse,
  rawToken: string,
): void {
  response.cookies.set(
    PANEL_SESSION_COOKIE,
    rawToken,
    panelSessionCookieOptions,
  );
  response.cookies.delete(LEGACY_PANEL_SESSION_COOKIE);
}

export function clearPanelSessionCookies(response: NextResponse): void {
  response.cookies.delete(PANEL_SESSION_COOKIE);
  response.cookies.delete(LEGACY_PANEL_SESSION_COOKIE);
}
