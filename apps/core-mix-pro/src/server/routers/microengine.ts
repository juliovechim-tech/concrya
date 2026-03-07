/**
 * @file server/routers/microengine.ts
 * @description MICROENGINE — Router tRPC v11
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   microengine.analisar         mutation — Análise completa (Powers + ITZ + Fick + Carbonatação)
 *   microengine.composicao       query   — Composição volumétrica da pasta (Powers)
 *   microengine.fcGelSpace       query   — Resistência via gel-space ratio
 *   microengine.difusaoCloretos  query   — Perfil de cloretos (Fick 2ª Lei)
 *   microengine.carbonatacao     query   — Frente de carbonatação (Tuutti)
 *   microengine.mEnvelhecimento  query   — Expoentes de envelhecimento por cimento
 *   microengine.kcBase           query   — Coeficientes K_c por classe agressividade
 *
 * REFERÊNCIAS: Powers (1946/1958) | Fick/Crank (1975) | Tuutti (1982) | Scrivener (2004)
 */

import { z } from "zod";
import { router, publicProc, executarCalculo } from "../trpc";

import {
  executarMicroEngine,
  calcularComposicaoPasta,
  calcularFcGelSpace,
  gerarPerfilCloretos,
  calcularKcCarbonatacao,
  gerarEvolucaoCarbonatacao,
  profundidadeCarbonatacao,
  M_ENVELHECIMENTO,
  KC_BASE,
} from "../../lib/microengine";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────

const ExposicaoSchema = z.object({
  classeAgressividade: z.enum(["I", "II", "III", "IV"]),
  UR_pct: z.number().min(0).max(100).optional(),
  Cs_pct: z.number().min(0).max(5).optional(),
  CO2_pct: z.number().min(0).max(1).optional(),
  cobrimento_mm: z.number().positive().max(200),
});

const EntradaAnalisarSchema = z.object({
  relacaoAc: z.number().min(0.20).max(0.80),
  alpha: z.number().min(0).max(1).optional(),
  idade_dias: z.number().positive().max(36500).optional(),
  tipoCimento: z.string().optional(),
  V_agregado: z.number().min(0.40).max(0.85).optional(),
  dmax_mm: z.number().positive().max(100).optional(),
  m_envelhecimento: z.number().min(0).max(1).optional(),
  exposicao: ExposicaoSchema.optional(),
  vidaUtilProjeto_anos: z.number().positive().max(200).optional(),
});

const ComposicaoSchema = z.object({
  relacaoAc: z.number().min(0.20).max(0.80),
  alpha: z.number().min(0).max(1),
});

const FcGelSpaceSchema = z.object({
  gelSpaceRatio: z.number().min(0).max(1),
  A_MPa: z.number().positive().optional(),
  n: z.number().positive().optional(),
});

const DifusaoSchema = z.object({
  relacaoAc: z.number().min(0.20).max(0.80),
  m: z.number().min(0).max(1).default(0.30),
  t_anos: z.number().positive().max(200).default(50),
  Cs_pct: z.number().positive().max(5).default(0.6),
  xMax_mm: z.number().positive().max(500).default(100),
  nPontos: z.number().int().min(5).max(200).default(50),
});

const CarbonatacaoSchema = z.object({
  relacaoAc: z.number().min(0.20).max(0.80),
  classeAgressividade: z.enum(["I", "II", "III", "IV"]),
  tMax_anos: z.number().positive().max(200).default(100),
  nPontos: z.number().int().min(5).max(200).default(50),
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const microEngineRouter = router({
  /**
   * Análise completa — Powers + ITZ + Fick + Carbonatação.
   */
  analisar: publicProc
    .input(EntradaAnalisarSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => executarMicroEngine(input));
    }),

  /**
   * Composição volumétrica da pasta (Powers).
   */
  composicao: publicProc
    .input(ComposicaoSchema)
    .query(({ input }) => {
      return executarCalculo(() =>
        calcularComposicaoPasta(input.relacaoAc, input.alpha),
      );
    }),

  /**
   * Resistência estimada via gel-space ratio.
   */
  fcGelSpace: publicProc
    .input(FcGelSpaceSchema)
    .query(({ input }) => {
      return executarCalculo(() => ({
        fc_MPa: calcularFcGelSpace(input.gelSpaceRatio, input.A_MPa, input.n),
        gelSpaceRatio: input.gelSpaceRatio,
      }));
    }),

  /**
   * Perfil de cloretos (Fick 2ª Lei).
   */
  difusaoCloretos: publicProc
    .input(DifusaoSchema)
    .query(({ input }) => {
      return executarCalculo(() => {
        const { calcularD28 } = require("../../lib/microengine");
        const D28 = calcularD28(input.relacaoAc);
        return {
          D28_m2s: D28,
          perfil: gerarPerfilCloretos(
            D28, input.m, input.t_anos, input.Cs_pct,
            input.xMax_mm, input.nPontos,
          ),
        };
      });
    }),

  /**
   * Evolução de carbonatação.
   */
  carbonatacao: publicProc
    .input(CarbonatacaoSchema)
    .query(({ input }) => {
      return executarCalculo(() => {
        const Kc = calcularKcCarbonatacao(input.relacaoAc, input.classeAgressividade);
        return {
          Kc_mmRaizAno: Kc,
          evolucao: gerarEvolucaoCarbonatacao(Kc, input.tMax_anos, input.nPontos),
        };
      });
    }),

  /**
   * Expoentes de envelhecimento por tipo de cimento.
   */
  mEnvelhecimento: publicProc.query(() => M_ENVELHECIMENTO),

  /**
   * Coeficientes K_c base por classe de agressividade.
   */
  kcBase: publicProc.query(() => KC_BASE),
});
