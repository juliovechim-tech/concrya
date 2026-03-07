/**
 * @file auth.ts
 * @description CORE MIX PRO — Configuração NextAuth v5
 *
 * Estratégia: JWT-only com Credentials provider (email/senha).
 * Sem tabelas Account/Session — apenas o model User no Prisma.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "./server/db";

// bcryptjs será importado dinamicamente no authorize para evitar erros em edge runtime

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",  type: "email" },
        password: { label: "Senha",  type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        // Import bcryptjs dynamically
        const bcrypt = await import("bcryptjs");
        const valid = await bcrypt.compare(parsed.data.password, user.senhaHash);
        if (!valid) return null;

        return {
          id:    user.id,
          name:  user.nome,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        (session.user as any).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
