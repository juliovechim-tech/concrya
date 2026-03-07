/**
 * @file server/routers/lifeengine.ts
 * @description LIFEENGINE — Router tRPC v11
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   lifeengine.analisar           mutation — Análise completa (MC + P_f + VPL)
 *   lifeengine.simular            mutation — Simulação Monte Carlo isolada
 *   lifeengine.vpl                query   — Calcula VPL de um cenário
 *   lifeengine.cenariosDefault    query   — Gera cenários VPL default
 *   lifeengine.custosIntervencao  query   — Custos típicos de intervenção
 *   lifeengine.constantes         query   — Constantes do modelo
 *
 * REFERÊNCIAS: Tuutti (1982) | Duracrete (2000) | fib MC2010 | EN 15978
 */

import { z } from "zod";
import { router, publicProc, executarCalculo } from "../trpc";

import {
  executarLifeEngine,
  simularMonteCarlo,
  calcularEstatisticas,
  gerarCurvaPf,
  gerarHistograma,
  calcularVPL,
  gerarCenariosDefault,
  BETA_ALVO,
  C_CRIT_DEFAULT,
  TAXA_DESCONTO_DEFAULT,
  CUSTOS_INTERVENCAO,
} from "../../lib/lifeengine";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────

const VariaveisEstocasticasSchema = z.object({
  D28_mean: z.number().positive().max(1e-9),
  D28_cov: z.number().min(0.01).max(1).optional(),
  Cs_mean: z.number().positive().max(5),
  Cs_cov: z.number().min(0.01).max(1).optional(),
  Ccrit_mean: z.number().positive().max(2).optional(),
  Ccrit_cov: z.number().min(0.01).max(1).optional(),
  cob_mean_mm: z.number().positive().max(200),
  cob_cov: z.number().min(0.01).max(0.5).optional(),
  cob_bias_mm: z.number().min(-20).max(10).optional(),
  m_mean: z.number().min(0.05).max(0.8),
  m_cov: z.number().min(0.01).max(0.5).optional(),
  Kc_mean: z.number().positive().max(20).optional(),
  Kc_cov: z.number().min(0.01).max(1).optional(),
});

const ParamsMonteCarloSchema = z.object({
  N: z.number().int().min(100).max(100000).optional(),
  seed: z.number().int().optional(),
  vidaProjeto_anos: z.number().positive().max(200).optional(),
  tPropagacao_anos: z.number().positive().max(30).optional(),
});

const IntervencaoSchema = z.object({
  descricao: z.string().min(1),
  idade_anos: z.number().positive().max(200),
  custo_Rm2: z.number().positive(),
});

const CenarioVPLSchema = z.object({
  nome: z.string().min(1),
  custoInicial_Rm2: z.number().min(0),
  intervencoes: z.array(IntervencaoSchema),
  taxaDesconto: z.number().min(0).max(0.99),
  horizonte_anos: z.number().positive().max(200),
});

const EntradaAnalisarSchema = z.object({
  variaveis: VariaveisEstocasticasSchema,
  monteCarlo: ParamsMonteCarloSchema.optional(),
  cenariosVPL: z.array(CenarioVPLSchema).optional(),
});

const EntradaSimularSchema = z.object({
  variaveis: VariaveisEstocasticasSchema,
  monteCarlo: ParamsMonteCarloSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const lifeEngineRouter = router({
  /**
   * Análise completa — Monte Carlo + P_f(t) + β(t) + histograma + VPL.
   */
  analisar: publicProc
    .input(EntradaAnalisarSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => executarLifeEngine(input));
    }),

  /**
   * Simulação Monte Carlo isolada — retorna estatísticas + curva P_f.
   */
  simular: publicProc
    .input(EntradaSimularSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => {
        const resultados = simularMonteCarlo(input.variaveis, input.monteCarlo);
        const vidaProjeto = input.monteCarlo?.vidaProjeto_anos ?? 50;
        const estatisticas = calcularEstatisticas(resultados, vidaProjeto);
        const curvaPf = gerarCurvaPf(resultados, Math.max(vidaProjeto * 2, 100));
        const histograma = gerarHistograma(resultados);
        return { estatisticas, curvaPf, histograma };
      });
    }),

  /**
   * Calcula VPL de um cenário custom.
   */
  vpl: publicProc
    .input(CenarioVPLSchema)
    .query(({ input }) => {
      return executarCalculo(() => calcularVPL(input));
    }),

  /**
   * Gera cenários VPL default a partir da vida útil média estimada.
   */
  cenariosDefault: publicProc
    .input(z.object({
      mediaVida_anos: z.number().positive().max(300),
      horizonte_anos: z.number().positive().max(200).optional(),
      taxaDesconto: z.number().min(0).max(0.99).optional(),
    }))
    .query(({ input }) => {
      return executarCalculo(() =>
        gerarCenariosDefault(
          input.mediaVida_anos,
          input.horizonte_anos,
          input.taxaDesconto,
        ),
      );
    }),

  /**
   * Custos típicos de intervenção — R$/m².
   */
  custosIntervencao: publicProc.query(() => CUSTOS_INTERVENCAO),

  /**
   * Constantes do modelo.
   */
  constantes: publicProc.query(() => ({
    BETA_ALVO,
    C_CRIT_DEFAULT,
    TAXA_DESCONTO_DEFAULT,
  })),
});
