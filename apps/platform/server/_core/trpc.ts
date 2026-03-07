import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Middleware que verifica se o usuário tem o nível de plano mínimo necessário.
 * Uso: protectedProcedure.use(requirePlano("tecnico"))
 */
type NivelPlano = "gratuito" | "tecnico" | "avancado" | "cientifico";

const NIVEL_ORDEM: NivelPlano[] = ["gratuito", "tecnico", "avancado", "cientifico"];

export function requirePlano(nivelMinimo: NivelPlano) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Admin sempre tem acesso total
    if (ctx.user.role === "admin") {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    // Buscar licença do usuário no banco
    const { getDb } = await import("../db");
    const { licencas } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    const licencaResult = await db.select().from(licencas)
      .where(eq(licencas.userId, ctx.user.id))
      .limit(1);

    let nivelAtual: NivelPlano = "gratuito";

    if (licencaResult.length > 0) {
      const licenca = licencaResult[0];
      const ativa = licenca.status === "ativa";
      const naoExpirada = !licenca.dataExpiracao || new Date(licenca.dataExpiracao) > new Date();

      if (ativa && naoExpirada) {
        const nivelMap: Record<string, NivelPlano> = {
          basico: "gratuito",
          tecnico: "tecnico",
          avancado: "avancado",
          cientifico: "cientifico",
          completo: "cientifico",
        };
        nivelAtual = nivelMap[licenca.nivel] || "gratuito";
      }
    }

    const ordemAtual = NIVEL_ORDEM.indexOf(nivelAtual);
    const ordemMinimo = NIVEL_ORDEM.indexOf(nivelMinimo);

    if (ordemAtual < ordemMinimo) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Esta funcionalidade requer o plano ${nivelMinimo}. Seu plano atual: ${nivelAtual}.`,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}
