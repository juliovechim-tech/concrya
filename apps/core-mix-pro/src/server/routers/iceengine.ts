/**
 * @file server/routers/iceengine.ts
 * @description ICEENGINE — Router tRPC v11
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   iceEngine.simular           mutation — Fourier 1D completo
 *   iceEngine.balancoGelo       mutation — Massa de gelo necessária
 *   iceEngine.balancoLN2        mutation — Massa de LN₂ necessária
 *   iceEngine.tLancamento       query   — Estimativa T lançamento
 *   iceEngine.propriedadesTermicas query — Lista propriedades padrão
 *
 * REFERÊNCIAS: ACI 207.1R-05 | ACI 207.4R | NBR 6118:2023
 */

import { z } from "zod";
import { router, publicProc, executarCalculo } from "../trpc";

import {
  executarIceEngine,
  calcularBalancoGelo,
  calcularBalancoLN2,
  estimarTLancamento,
  PROPRIEDADES_TERMICAS_DEFAULT,
} from "../../lib/iceengine";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────

const PropriedadesTermicasSchema = z.object({
  condutividade_WmC: z.number().min(0.5).max(5),
  densidade_kgm3: z.number().min(1800).max(3000),
  calorEspecifico_JkgC: z.number().min(500).max(1500),
});

const ParamsCalorSchema = z.object({
  Q_ef_kJkg: z.number().positive().max(600),
  consumoCimento_kgm3: z.number().positive().max(700),
  tau_h: z.number().positive().max(100),
  beta: z.number().positive().max(3),
  alphaMax: z.number().min(0.1).max(1),
});

const EntradaSimulacaoSchema = z.object({
  espessura_m: z.number().min(0.10).max(20),
  T_lancamento_C: z.number().min(5).max(50),
  T_ambiente_C: z.number().min(-10).max(50),
  propriedades: PropriedadesTermicasSchema,
  calor: ParamsCalorSchema,
  duracao_h: z.number().positive().max(720).default(168),
  nNos: z.number().int().min(5).max(101).default(21),
  condicaoContorno: z.enum(["exposta", "forma"]).default("exposta"),
  h_conveccao_Wm2C: z.number().positive().max(100).default(10),
});

const EntradaGeloSchema = z.object({
  volume_m3: z.number().positive(),
  consumoAgua_kgm3: z.number().positive().max(300),
  T_agua_C: z.number().min(0).max(50),
  T_alvo_C: z.number().min(5).max(35),
  T_agregados_C: z.number().min(0).max(60),
  T_cimento_C: z.number().min(10).max(80),
  consumoCimento_kgm3: z.number().positive().max(700),
  consumoAgregados_kgm3: z.number().positive().max(2200),
  cpAgregados_kJkgC: z.number().positive().default(0.84),
  cpCimento_kJkgC: z.number().positive().default(0.75),
});

const EntradaLN2Schema = z.object({
  volume_m3: z.number().positive(),
  densidadeConcreto_kgm3: z.number().min(1800).max(3000),
  cpConcreto_kJkgC: z.number().positive().max(2),
  T_atual_C: z.number().min(5).max(60),
  T_alvo_C: z.number().min(5).max(35),
});

const TLancamentoSchema = z.object({
  T_cimento: z.number().min(10).max(80),
  T_agua: z.number().min(0).max(50),
  T_agregados: z.number().min(0).max(60),
  consumoCimento: z.number().positive(),
  consumoAgua: z.number().positive(),
  consumoAgregados: z.number().positive(),
  cpCimento: z.number().positive().default(0.75),
  cpAgregados: z.number().positive().default(0.84),
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const iceEngineRouter = router({
  /**
   * Simulação Fourier 1D completa — curva térmica + conformidade ACI/NBR.
   */
  simular: publicProc
    .input(EntradaSimulacaoSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => executarIceEngine(input));
    }),

  /**
   * Balanço de gelo — massa de gelo para substituição parcial da água.
   */
  balancoGelo: publicProc
    .input(EntradaGeloSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => calcularBalancoGelo(input));
    }),

  /**
   * Balanço de LN₂ — massa e custo estimado de nitrogênio líquido.
   */
  balancoLN2: publicProc
    .input(EntradaLN2Schema)
    .mutation(({ input }) => {
      return executarCalculo(() => calcularBalancoLN2(input));
    }),

  /**
   * Estimativa de T de lançamento pela média ponderada (ACI 207.4R).
   */
  tLancamento: publicProc
    .input(TLancamentoSchema)
    .query(({ input }) => {
      return executarCalculo(() =>
        estimarTLancamento(
          input.T_cimento, input.T_agua, input.T_agregados,
          input.consumoCimento, input.consumoAgua, input.consumoAgregados,
          input.cpCimento, input.cpAgregados
        )
      );
    }),

  /**
   * Lista propriedades térmicas padrão por tipo de concreto.
   */
  propriedadesTermicas: publicProc.query(() => {
    return PROPRIEDADES_TERMICAS_DEFAULT;
  }),
});
