import { NextResponse, type NextRequest } from "next/server";
import {
  hasRole,
  LEGACY_PANEL_SESSION_COOKIE,
  PANEL_SESSION_COOKIE,
} from "@/lib/panel-session-core";
import { validatePanelSessionToken } from "@/lib/panel-session-validation";
import {
  removeTrustedPanelSessionHeaders,
  writeTrustedPanelSessionHeaders,
} from "@/lib/trusted-panel-session";

const PUBLIC_PATHS = [
  "/login",
  "/auto-login",
  "/api/auth/login",
  "/api/auth/handoff",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function unauthorizedResponse(request: NextRequest): NextResponse {
  const response = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json(
      { error: "Sessão inválida ou expirada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
    : NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(request.nextUrl.pathname)}`,
        request.url,
      ),
    );
  response.cookies.delete(PANEL_SESSION_COOKIE);
  response.cookies.delete(LEGACY_PANEL_SESSION_COOKIE);
  return response;
}

function forbiddenResponse(request: NextRequest): NextResponse {
  return request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json(
      { error: "Seu perfil não tem permissão para esta operação." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    )
    : NextResponse.redirect(new URL("/dashboard", request.url));
}

function isAdminOnlyRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (pathname === "/professores" || pathname.startsWith("/professores/")) {
    return true;
  }
  if (pathname.startsWith("/api/professores")) return true;
  return (
    request.method !== "GET"
    && (
      pathname.startsWith("/api/escolas")
      || pathname.startsWith("/api/turmas")
      || pathname.startsWith("/api/alunos")
    )
  );
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  removeTrustedPanelSessionHeaders(requestHeaders);

  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const rawToken = request.cookies.get(PANEL_SESSION_COOKIE)?.value;
  const session = await validatePanelSessionToken(rawToken);
  if (!session) return unauthorizedResponse(request);

  if (!hasRole(session.actor, "ADMIN") && isAdminOnlyRequest(request)) {
    return forbiddenResponse(request);
  }

  writeTrustedPanelSessionHeaders(requestHeaders, session);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
