import { getSupabaseAdmin } from "@/lib/supabase";
import {
  isOpaqueToken,
  mapPanelSessionRow,
  sha256Hex,
  type ValidatedPanelSession,
} from "@/lib/panel-session-core";

export async function validatePanelSessionToken(
  rawToken: string | null | undefined,
): Promise<ValidatedPanelSession | null> {
  if (!isOpaqueToken(rawToken)) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("validate_backoffice_session", {
    p_panel_session_token_hash: await sha256Hex(rawToken),
  });
  if (error) return null;

  const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
  return mapPanelSessionRow(row);
}
