/**
 * @file server/routers/rheocore.ts
 * @description RHEOCORE — Router tRPC v11
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   rheocore.processar        mutation — Análise completa (leituras ADS1115 → Bingham + correlações)
 *   rheocore.ajustarBingham   mutation — Ajuste Bingham a partir de pontos multi-velocidade
 *   rheocore.ajustarHB        mutation — Ajuste Herschel-Bulkley
 *   rheocore.correlacoes      query   — Correlações empíricas (Slump, Flow, T500, Marsh)
 *   rheocore.classificar      query   — Classificação reológica
 *   rheocore.geometriaDefault query   — Geometria default (Bosch GSR 120-LI + balde 20L)
 *   rheocore.faixasTau0       query   — Faixas de τ₀ por classe reológica
 *
 * REFERÊNCIAS: Bingham (1922) | Herschel-Bulkley (1926) | Roussel (2006) | Tattersall & Banfill (1983)
 */

import { z } from "zod";
import { router, publicProc, executarCalculo } from "../trpc";

import {
  executarRheoCore,
  ajustarBingham,
  ajustarHerschelBulkley,
  calcularCorrelacoes,
  classificar,
  GEOMETRIA_DEFAULT,
  FAIXAS_TAU0,
  RHO_CONCRETO_KGM3,
} from "../../lib/rheocore";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────

const LeituraAmperagemSchema = z.object({
  tempo_s: z.number().min(0),
  amperagem_A: z.number().min(0).max(50),
});

const ConfigGeometriaSchema = z.object({
  k_motor_NmA: z.number().positive().max(10).optional(),
  raio_int_m: z.number().positive().max(1).optional(),
  raio_ext_m: z.number().positive().max(1).optional(),
  altura_m: z.number().positive().max(2).optional(),
  rpm: z.number().positive().max(10000).optional(),
});

const PontoReologicoSchema = z.object({
  gamma_dot_1s: z.number().positive(),
  tau_Pa: z.number().positive(),
});

const EntradaProcessarSchema = z.object({
  leituras: z.array(LeituraAmperagemSchema).min(3),
  geometria: ConfigGeometriaSchema.optional(),
  pontosMultiVel: z.array(PontoReologicoSchema).min(3).optional(),
  rho_kgm3: z.number().positive().max(5000).optional(),
});

const EntradaAjusteBinghamSchema = z.object({
  pontos: z.array(PontoReologicoSchema).min(3),
});

const EntradaAjusteHBSchema = z.object({
  pontos: z.array(PontoReologicoSchema).min(4),
});

const EntradaCorrelacoesSchema = z.object({
  tau0_Pa: z.number().min(0),
  mu_p_Pas: z.number().min(0),
  rho_kgm3: z.number().positive().max(5000).optional(),
});

const EntradaClassificarSchema = z.object({
  tau0_Pa: z.number().min(0),
  n_hb: z.number().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const rheoCoreRouter = router({
  /**
   * Análise completa — leituras ADS1115 → evolução τ(t) + Bingham + correlações.
   */
  processar: publicProc
    .input(EntradaProcessarSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => executarRheoCore(input));
    }),

  /**
   * Ajuste Bingham a partir de pontos multi-velocidade {γ̇, τ}.
   */
  ajustarBingham: publicProc
    .input(EntradaAjusteBinghamSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => ajustarBingham(input.pontos));
    }),

  /**
   * Ajuste Herschel-Bulkley a partir de pontos multi-velocidade {γ̇, τ}.
   */
  ajustarHB: publicProc
    .input(EntradaAjusteHBSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => ajustarHerschelBulkley(input.pontos));
    }),

  /**
   * Calcula correlações empíricas (Slump, Flow, T500, Marsh).
   */
  correlacoes: publicProc
    .input(EntradaCorrelacoesSchema)
    .query(({ input }) => {
      return executarCalculo(() =>
        calcularCorrelacoes(input.tau0_Pa, input.mu_p_Pas, input.rho_kgm3),
      );
    }),

  /**
   * Classifica o concreto por τ₀ (+ opcional n HB).
   */
  classificar: publicProc
    .input(EntradaClassificarSchema)
    .query(({ input }) => {
      return executarCalculo(() => ({
        classe: classificar(input.tau0_Pa, input.n_hb),
        tau0_Pa: input.tau0_Pa,
      }));
    }),

  /**
   * Retorna geometria default (Bosch GSR 120-LI + balde 20L).
   */
  geometriaDefault: publicProc.query(() => GEOMETRIA_DEFAULT),

  /**
   * Retorna faixas de τ₀ por classe reológica.
   */
  faixasTau0: publicProc.query(() => FAIXAS_TAU0),
});
