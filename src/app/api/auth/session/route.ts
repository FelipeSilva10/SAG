import { NextRequest, NextResponse } from "next/server";
import {
  clearPanelSessionCookies,
  getPanelSessionToken,
  validatePanelSessionToken,
} from "@/lib/panel-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await validatePanelSessionToken(getPanelSessionToken(request));
  if (!session) {
    const response = NextResponse.json(
      { error: "Sessão inválida ou expirada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    clearPanelSessionCookies(response);
    return response;
  }

  return NextResponse.json(
    { sessao: session.actor, expiresAt: session.expiresAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
