// middleware.ts
// Protege rotas: exige login pra rotas privadas e papel ADMIN pra /admin.

import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Rotas que NÃO exigem login (qualquer um pode acessar)
const PUBLIC_PATHS = ["/login", "/definir-senha"];

// Rotas que exigem papel ADMIN
const ADMIN_PATHS = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Endpoints internos do NextAuth devem passar
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  // 1. Rota pública: deixa passar
  if (isPublic) return NextResponse.next();

  // 2. Não logado em rota privada → manda pro login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Rota admin com usuário comum → manda pra home
  if (isAdminPath && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

// Aplica o middleware em tudo, exceto assets estáticos
export const config = {
  matcher: [
    /*
     * Pula:
     * - _next/static (assets)
     * - _next/image (otimização de imagem)
     * - favicon.ico
     * - arquivos com extensão (.svg, .png, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};