import { NextRequest, NextResponse } from "next/server";
import {
  exchangeAdminHandoff,
  setPanelSessionCookie,
} from "@/lib/panel-session";
import { isOpaqueToken } from "@/lib/panel-session-core";

export const runtime = "nodejs";

function requestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProtocol
    ?? request.nextUrl.protocol.replace(/:$/u, "");

  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem não autorizada." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isOpaqueToken(body.code)) {
    return NextResponse.json(
      { error: "Código inválido ou expirado." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const exchanged = await exchangeAdminHandoff(body.code);
    if (!exchanged) {
      return NextResponse.json(
        { error: "Código inválido, expirado ou já utilizado." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const response = NextResponse.json(
      { sessao: exchanged.session.actor },
      { headers: { "Cache-Control": "no-store" } },
    );
    setPanelSessionCookie(response, exchanged.rawToken);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Não foi possível concluir a autenticação." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
