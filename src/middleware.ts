// ─────────────────────────────────────────────────────────────────────────────
// middleware.ts — equivalente ao controle de acesso do MainFX.java
//
// Regras:
//  - / e /login → públicas
//  - /dashboard/** → requer sessão ativa (cookie)
//  - Redireciona para /login se não autenticado
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas passam livremente
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verifica cookie de sessão (setado pela API de login)
  const sessionCookie = request.cookies.get("sag_session");

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    // Preserva a rota de destino para redirecionar depois do login
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplica o middleware a todas as rotas exceto assets estáticos
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
