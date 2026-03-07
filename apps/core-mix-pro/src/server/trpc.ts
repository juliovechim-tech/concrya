/**
 * @file server/trpc.ts
 * @description CORE MIX PRO — Inicialização do tRPC v11
 *
 * Exporta:
 *   - `t`          : instância tRPC com contexto tipado
 *   - `router`     : helper para criar sub-roteadores
 *   - `publicProc` : procedure pública (sem autenticação — LIMS interno)
 *   - `middleware`  : helper de middleware tipado
 *
 * Contexto atual é minimal (sem sessão — sistema LIMS local).
 * Para adicionar auth: estender `Context` com { session, userId, orgId }.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "./db";
import type { PrismaClient } from "@prisma/client";
import { auth } from "../auth";

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTO
// ─────────────────────────────────────────────────────────────────────────────

export interface Context {
  /** Identificador da requisição para rastreabilidade de logs */
  requestId: string;
  /** Timestamp ISO da requisição */
  timestamp: string;
  /** Prisma client para persistência */
  prisma: PrismaClient;
  /** ID do usuário autenticado (null se não logado) */
  userId: string | null;
}

export async function createContext(): Promise<Context> {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = (session?.user as any)?.id ?? null;
  } catch {
    // sem sessão — endpoints públicos continuam funcionando
  }
  return {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    prisma,
    userId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO tRPC
// ─────────────────────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  /**
   * Transformador de erros: mapeia erros de domínio tipados para TRPCError
   * com códigos HTTP semânticos.
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        domainError: error.cause instanceof Error
          ? { name: error.cause.name, message: error.cause.message }
          : null,
      },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS EXPORTADOS
// ─────────────────────────────────────────────────────────────────────────────

export const router     = t.router;
export const middleware = t.middleware;

/** Middleware de logging por requisição */
const logMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  const status = result.ok ? "OK" : "ERR";
  console.info(`[tRPC] ${status} ${type.toUpperCase()} ${path} — ${durationMs}ms [${ctx.requestId}]`);
  return result;
});

/** Procedure pública com logging automático */
export const publicProc = t.procedure.use(logMiddleware);

/** Middleware de autenticação */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Login necessario.",
    });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/** Procedure protegida (exige sessão autenticada) */
export const protectedProc = t.procedure.use(logMiddleware).use(isAuthed);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Wrapping de erros de domínio → TRPCError
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa uma função de cálculo de domínio e converte erros tipados
 * para TRPCError com códigos HTTP semânticos adequados.
 *
 * Mapeamento:
 *   *Error de inputs inválidos → BAD_REQUEST (400)
 *   *Error de dados insuficientes → PRECONDITION_FAILED (412)
 *   *Error inesperado → INTERNAL_SERVER_ERROR (500)
 */
export function executarCalculo<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (!(err instanceof Error)) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro inesperado no motor de cálculo.",
        cause: err,
      });
    }

    // Erros de input / validação de domínio
    const inputErrors = [
      "DosagemVolumeNegativoError",
      "DosagemConsumoCimentoError",
      "EmpacotamentoPassoInvalidoError",
      "LabVolumeInvalidoError",
      "LabFatorPerdaInvalidoError",
      "ComparativoTracosInsuficientesError",
      "ComparativoAcVariacaoInsuficienteError",
      "GranuloFracaoInvalidaError",
      "GranuloPeneirasIncompativeisError",
      "Hydra4DRelacaoAcForaFaixaError",
      "IceEngineEspessuraInvalidaError",
      "ThermoCoreRelacaoAcInvalidaError",
      "RheoCoreParametroInvalidoError",
      "MicroEngineParametroInvalidoError",
      "LifeEngineParametroInvalidoError",
    ];

    // Erros de pré-condição (dados insuficientes)
    const precondErrors = [
      "AbramsCurvaInsuficienteError",
      "AbramsRelacaoAcInvalidaError",
      "AbramsR2BaixoError",
      "GranuloMassaZeroError",
      "EmpacotamentoSemAgregadosError",
      "ComparativoNPontosInsuficientesError",
      "Hydra4DLeiturasInsuficientesError",
      "Hydra4DCalibracaoFalhouError",
      "IceEngineInstabilidadeError",
      "IceEngineGeloExcessivoError",
      "ThermoCoreLeiturasInsuficientesError",
      "ThermoCoreCalibraçãoInvalidaError",
      "RheoCoreLeituraInsuficienteError",
      "RheoCoreAjusteError",
      "MicroEngineForaFaixaError",
      "LifeEngineSimulacaoError",
    ];

    if (inputErrors.includes(err.name)) {
      throw new TRPCError({ code: "BAD_REQUEST",          message: err.message, cause: err });
    }
    if (precondErrors.includes(err.name)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED",  message: err.message, cause: err });
    }

    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message, cause: err });
  }
}
