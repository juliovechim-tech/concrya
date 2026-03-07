/**
 * @file server/routers/hydra4d.ts
 * @description HYDRA4D ENGINE — Router tRPC v11
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   hydra4d.processar     mutation — Pipeline completo: leituras → resultado
 *   hydra4d.calibrar      mutation — Calibra τ/β a partir de curva α(t) fornecida
 *   hydra4d.calcularEa    mutation — Ea via 2 ensaios em temperaturas diferentes
 *   hydra4d.cimentos      query   — Lista cimentos calibrados do banco
 *   hydra4d.aditivos      query   — Lista aditivos calibrados com retardo
 *   hydra4d.curvaTeórica  query   — Gera curva FHP teórica para parâmetros dados
 *
 * REFERÊNCIAS: NF EN 196-9 | ASTM C186 | ASTM C1074-19 | FHP (1977)
 */

import { z } from "zod";
import { router, publicProc, executarCalculo } from "../trpc";

import {
  executarHydra4D,
  calibrarFHP,
  calcularEaArrhenius,
  gerarCurvaTeóricaFHP,
  CIMENTOS_CALIBRADOS,
  ADITIVOS_CALIBRADOS,
  SCMS_CALIBRADOS,
} from "../../lib/hydra4d";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS ZOD — Validação de entrada
// ─────────────────────────────────────────────────────────────────────────────

const LeituraTermoparSchema = z.object({
  tempo_h: z.number().nonnegative(),
  temperatura_C: z.number().min(-20).max(200),
});

const EntradaEnsaioSchema = z.object({
  id: z.string().min(1),
  cimentoId: z.string().min(1),
  cimentoDescricao: z.string().min(1),
  relacaoAc: z.number().min(0.30).max(0.50),
  massaCimento_g: z.number().positive(),
  temperaturaAmbiente_C: z.number().min(5).max(50),
  leituras: z.array(LeituraTermoparSchema).min(10),
  qInfinito_kJkg: z.number().positive().optional(),
  coefPerdaTermica_WC: z.number().nonnegative().optional(),
  aditivo: z
    .object({
      produto: z.string().min(1),
      dosagem_percent: z.number().positive().max(5),
    })
    .optional(),
});

const CurvaAlphaSchema = z.array(
  z.object({
    tempo_h: z.number().positive(),
    alpha: z.number().min(0).max(1),
  })
).min(5);

const EaInputSchema = z.object({
  tau1_h: z.number().positive(),
  T1_C: z.number().min(5).max(80),
  tau2_h: z.number().positive(),
  T2_C: z.number().min(5).max(80),
});

const CurvaTeóricaInputSchema = z.object({
  tau_h: z.number().positive(),
  beta: z.number().positive(),
  alphaMax: z.number().min(0.1).max(1),
  qInfinito_kJkg: z.number().positive(),
  tMax_h: z.number().positive().default(72),
  nPontos: z.number().int().min(10).max(1000).default(200),
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const hydra4dRouter = router({
  /**
   * Pipeline completo: recebe leituras do termopar → retorna resultado Hydra4D.
   * Inclui: Q(t), α(t), dQ/dt, 5 fases, calibração FHP, detecção de pega.
   */
  processar: publicProc
    .input(EntradaEnsaioSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => executarHydra4D(input));
    }),

  /**
   * Calibra τ/β a partir de uma curva α(t) fornecida diretamente.
   * Útil quando o usuário já tem dados de α(t) de outro sistema.
   */
  calibrar: publicProc
    .input(
      z.object({
        curvaAlpha: CurvaAlphaSchema,
        alphaMax: z.number().min(0.1).max(1).optional(),
      })
    )
    .mutation(({ input }) => {
      return executarCalculo(() =>
        calibrarFHP(input.curvaAlpha, input.alphaMax)
      );
    }),

  /**
   * Calcula energia de ativação Ea a partir de 2 ensaios em
   * temperaturas diferentes (ASTM C1074 §7.2).
   */
  calcularEa: publicProc
    .input(EaInputSchema)
    .mutation(({ input }) => {
      return executarCalculo(() =>
        calcularEaArrhenius(input.tau1_h, input.T1_C, input.tau2_h, input.T2_C)
      );
    }),

  /**
   * Lista todos os cimentos calibrados do banco Hydra4D Engine DB v1.0.
   */
  cimentos: publicProc.query(() => {
    return Object.values(CIMENTOS_CALIBRADOS);
  }),

  /**
   * Lista todos os aditivos calibrados com efeito de retardo medido.
   */
  aditivos: publicProc.query(() => {
    return ADITIVOS_CALIBRADOS;
  }),

  /**
   * Lista SCMs calibrados com efeito no calor de hidratação.
   */
  scms: publicProc.query(() => {
    return SCMS_CALIBRADOS;
  }),

  /**
   * Gera curva teórica FHP α(t) e Q(t) para parâmetros fornecidos.
   * Útil para plotar curva de referência ou comparar com dados experimentais.
   */
  curvaTeórica: publicProc
    .input(CurvaTeóricaInputSchema)
    .query(({ input }) => {
      return gerarCurvaTeóricaFHP(
        {
          tau_h: input.tau_h,
          beta: input.beta,
          alphaMax: input.alphaMax,
          r2: 1,
          nPontos: 0,
        },
        input.qInfinito_kJkg,
        input.tMax_h,
        input.nPontos
      );
    }),
});
