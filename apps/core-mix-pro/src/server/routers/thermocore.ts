/**
 * @file server/routers/thermocore.ts
 * @description THERMOCORE — Router tRPC v11
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   thermocore.calcular          mutation — Integração completa a partir de payload MQTT
 *   thermocore.calibrar          mutation — Calibra Su/τ/β com CPs de ruptura
 *   thermocore.salvarLeitura     mutation — Persiste leitura Eletroterm no banco
 *   thermocore.criarMonitoramento mutation — Cria sessão de monitoramento
 *   thermocore.historico         query   — Série temporal de um monitoramento
 *   thermocore.listarMonitoramentos query — Lista monitoramentos ativos
 *   thermocore.statusDesforma    query   — Decisão ao vivo para o operador
 *   thermocore.curvaTeórica      query   — Gera curva fck(t_e) para gráficos
 *
 * REFERÊNCIAS: ASTM C1074-19 | CEB-FIP MC90 | NBR 6118:2023
 */

import { z } from "zod";
import { router, publicProc, executarCalculo } from "../trpc";

import {
  executarThermoCore,
  calibrarSuTauBeta,
  calcularTeDesforma,
  gerarCurvaMaturidade,
  predizFckTeCalibrado,
  EA_J_MOL,
  CALIBRACAO_DEFAULT,
  S_CEB_FIP,
  type ParamsCalibracao,
  type LeituraTemperatura,
} from "../../lib/thermocore";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────

const LeituraTemperaturaSchema = z.object({
  tempo_h: z.number().min(0),
  temperatura_C: z.number().min(-20).max(120),
});

const ParamsCalibracaoSchema = z.object({
  Su_MPa: z.number().positive().max(200),
  tau_h: z.number().positive().max(200),
  beta: z.number().positive().max(3),
  r2: z.number().min(0).max(1),
  nPontos: z.number().int().min(1),
});

const EntradaCalcularSchema = z.object({
  leituras: z.array(LeituraTemperaturaSchema).min(3),
  Ea_J_mol: z.number().positive().max(60000),
  calibracao: ParamsCalibracaoSchema,
  fck28_MPa: z.number().positive().max(200),
  s_ceb: z.number().min(0.1).max(0.5).optional(),
  relacaoAc: z.number().min(0.20).max(0.80).optional(),
  T_superficie_C: z.number().min(-20).max(120).optional(),
  te_min_obra_h: z.number().positive().optional(),
});

const PontoCalibracaoSchema = z.object({
  te_h: z.number().positive(),
  fck_MPa: z.number().positive(),
});

const EntradaCalibrarSchema = z.object({
  pontos: z.array(PontoCalibracaoSchema).min(3),
});

const CurvaTeóricaInputSchema = z.object({
  calibracao: ParamsCalibracaoSchema,
  fck28_MPa: z.number().positive().max(200),
  s: z.number().min(0.1).max(0.5).default(0.25),
  teMax_h: z.number().positive().max(8760).default(672),
  nPontos: z.number().int().min(10).max(500).default(100),
});

const StatusDesformaInputSchema = z.object({
  fckAlvo_MPa: z.number().positive(),
  calibracao: ParamsCalibracaoSchema,
});

// Schemas NEXUS integration
const CriarMonitoramentoSchema = z.object({
  deviceId: z.string().min(1),
  descricao: z.string().optional(),
  tipoCimento: z.string().default("CP_V_ARI"),
  fck28MPa: z.number().positive().max(200).default(40),
  relacaoAc: z.number().min(0.20).max(0.80).default(0.50),
  eaJMol: z.number().positive().max(60000).default(40000),
  calibracao: ParamsCalibracaoSchema,
});

const SalvarLeituraSchema = z.object({
  monitoramentoId: z.string(),
  tempoH: z.number().min(0),
  temperaturaC: z.number().min(-20).max(120),
  canais: z.object({
    ch2: z.number().optional(),
    ch3: z.number().optional(),
    ch4: z.number().optional(),
  }).optional(),
  timestampOriginal: z.string().optional(),
});

const SalvarLeiturasBatchSchema = z.object({
  monitoramentoId: z.string(),
  leituras: z.array(z.object({
    tempoH: z.number().min(0),
    temperaturaC: z.number().min(-20).max(120),
    canais: z.object({
      ch2: z.number().optional(),
      ch3: z.number().optional(),
      ch4: z.number().optional(),
    }).optional(),
    timestampOriginal: z.string().optional(),
  })).min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const thermoCoreRouter = router({
  /**
   * Integração completa — processa série temporal e retorna curva + desforma.
   */
  calcular: publicProc
    .input(EntradaCalcularSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => executarThermoCore(input));
    }),

  /**
   * Calibra Su/τ/β a partir de corpos-de-prova rompidos.
   */
  calibrar: publicProc
    .input(EntradaCalibrarSchema)
    .mutation(({ input }) => {
      return executarCalculo(() => calibrarSuTauBeta(input.pontos));
    }),

  /**
   * Gera curva teórica fck(t_e) para sobreposição nos gráficos.
   */
  curvaTeórica: publicProc
    .input(CurvaTeóricaInputSchema)
    .query(({ input }) => {
      return executarCalculo(() =>
        gerarCurvaMaturidade(
          input.calibracao,
          input.fck28_MPa,
          input.s,
          input.teMax_h,
          input.nPontos,
        )
      );
    }),

  /**
   * Retorna t_e necessária para atingir fck alvo (decisão de desforma).
   */
  statusDesforma: publicProc
    .input(StatusDesformaInputSchema)
    .query(({ input }) => {
      return executarCalculo(() => {
        const te_necessaria = calcularTeDesforma(input.fckAlvo_MPa, input.calibracao);
        return {
          te_necessaria_h: te_necessaria,
          fckAlvo_MPa: input.fckAlvo_MPa,
          Su_MPa: input.calibracao.Su_MPa,
          atingivel: input.fckAlvo_MPa < input.calibracao.Su_MPa,
        };
      });
    }),

  /**
   * Lista energias de ativação default por tipo de cimento.
   */
  energiasAtivacao: publicProc.query(() => EA_J_MOL),

  /**
   * Lista calibrações default por tipo de cimento.
   */
  calibracoesDefault: publicProc.query(() => CALIBRACAO_DEFAULT),

  /**
   * Lista coeficientes CEB-FIP por classe de endurecimento.
   */
  coeficientesCebFip: publicProc.query(() => S_CEB_FIP),

  // ─────────────────────────────────────────────────────────────────────────
  // NEXUS INTEGRATION — Persistência + Monitoramento ao Vivo
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Cria sessão de monitoramento (vincula deviceId + parâmetros de cálculo).
   */
  criarMonitoramento: publicProc
    .input(CriarMonitoramentoSchema)
    .mutation(async ({ input, ctx }) => {
      const mon = await ctx.prisma.monitoramentoTC.create({
        data: {
          deviceId: input.deviceId,
          descricao: input.descricao,
          tipoCimento: input.tipoCimento,
          fck28MPa: input.fck28MPa,
          relacaoAc: input.relacaoAc,
          eaJMol: input.eaJMol,
          calibracaoJson: JSON.stringify(input.calibracao),
        },
      });
      return { id: mon.id, deviceId: mon.deviceId, status: mon.status };
    }),

  /**
   * Salva uma leitura individual do Eletroterm.
   */
  salvarLeitura: publicProc
    .input(SalvarLeituraSchema)
    .mutation(async ({ input, ctx }) => {
      const leitura = await ctx.prisma.leituraTC.create({
        data: {
          monitoramentoId: input.monitoramentoId,
          tempoH: input.tempoH,
          temperaturaC: input.temperaturaC,
          canaisJson: input.canais ? JSON.stringify(input.canais) : null,
          timestampOriginal: input.timestampOriginal,
        },
      });
      return { id: leitura.id, tempoH: leitura.tempoH };
    }),

  /**
   * Salva leituras em batch (importação de dados NEXUS acumulados).
   */
  salvarLeiturasBatch: publicProc
    .input(SalvarLeiturasBatchSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.prisma.leituraTC.createMany({
        data: input.leituras.map((l) => ({
          monitoramentoId: input.monitoramentoId,
          tempoH: l.tempoH,
          temperaturaC: l.temperaturaC,
          canaisJson: l.canais ? JSON.stringify(l.canais) : null,
          timestampOriginal: l.timestampOriginal,
        })),
      });
      return { count: result.count };
    }),

  /**
   * Lista monitoramentos (filtro por status).
   */
  listarMonitoramentos: publicProc
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const where = input?.status ? { status: input.status } : {};
      const mons = await ctx.prisma.monitoramentoTC.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        include: { _count: { select: { leituras: true } } },
      });
      return mons.map((m) => ({
        id: m.id,
        deviceId: m.deviceId,
        descricao: m.descricao,
        tipoCimento: m.tipoCimento,
        fck28MPa: m.fck28MPa,
        status: m.status,
        totalLeituras: m._count.leituras,
        criadoEm: m.criadoEm.toISOString(),
      }));
    }),

  /**
   * Histórico de leituras de um monitoramento + processamento ThermoCore.
   */
  historico: publicProc
    .input(z.object({ monitoramentoId: z.string() }))
    .query(async ({ input, ctx }) => {
      const mon = await ctx.prisma.monitoramentoTC.findUniqueOrThrow({
        where: { id: input.monitoramentoId },
      });

      const leituras = await ctx.prisma.leituraTC.findMany({
        where: { monitoramentoId: input.monitoramentoId },
        orderBy: { tempoH: "asc" },
      });

      if (leituras.length < 3) {
        return {
          monitoramento: {
            id: mon.id,
            deviceId: mon.deviceId,
            descricao: mon.descricao,
            tipoCimento: mon.tipoCimento,
            fck28MPa: mon.fck28MPa,
            status: mon.status,
          },
          leituras: leituras.map((l) => ({
            tempoH: l.tempoH,
            temperaturaC: l.temperaturaC,
          })),
          resultado: null,
        };
      }

      const cal: ParamsCalibracao = JSON.parse(mon.calibracaoJson);
      const leiturasTC: LeituraTemperatura[] = leituras.map((l) => ({
        tempo_h: l.tempoH,
        temperatura_C: l.temperaturaC,
      }));

      const resultado = executarThermoCore({
        leituras: leiturasTC,
        Ea_J_mol: mon.eaJMol,
        calibracao: cal,
        fck28_MPa: mon.fck28MPa,
        relacaoAc: mon.relacaoAc,
      });

      return {
        monitoramento: {
          id: mon.id,
          deviceId: mon.deviceId,
          descricao: mon.descricao,
          tipoCimento: mon.tipoCimento,
          fck28MPa: mon.fck28MPa,
          status: mon.status,
        },
        leituras: leituras.map((l) => ({
          tempoH: l.tempoH,
          temperaturaC: l.temperaturaC,
        })),
        resultado,
      };
    }),
});
