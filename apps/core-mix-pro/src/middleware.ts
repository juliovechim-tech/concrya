/**
 * @file middleware.ts
 * @description Proteção de rotas — redireciona para /login se não autenticado.
 *
 * Rotas públicas: /login, /registro, /api/auth/*
 * Todas as demais exigem sessão JWT válida.
 */

export { auth as middleware } from "./auth";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api/auth (NextAuth endpoints)
     * - _next (Next.js internals)
     * - Static files
     * - login / registro (auth pages)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|registro).*)",
  ],
};
