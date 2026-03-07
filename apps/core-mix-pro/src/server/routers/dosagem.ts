/**
 * @file server/routers/dosagem.ts
 * @description CORE MIX PRO — Sistema Nervoso: Roteador tRPC v11
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARQUITETURA — PIPELINE DO EMPACOTAMENTO AO PILOTO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   Frontend (React) — tRPC client com inferência de tipos end-to-end
 *       │
 *       ▼
 *   server/routers/dosagem.ts
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  1. otimizarMistura      empacotamento.ts (Andreasen/AIM/CPM/WLS)
 *   │  2. calcularTracoTeorico abrams.ts  +  dosagem.ts (IPT-EPUSP)
 *   │  3. escalonarPiloto      laboratorio.ts  (CPs + betoneira)
 *   │  4. compararTracos       comparativo.ts  (ranking multicritério)
 *   └──────────────────────────────────────────────────────────────┘
 *
 * GARANTIAS
 *   • Inputs validados por Zod — zero dados brutos chegam ao motor.
 *   • Outputs tipados pelos tipos de domínio — sem `any`.
 *   • Erros de domínio → TRPCError via executarCalculo().
 *   • Nomes de campo espelham exatamente os tipos de lib/*.ts.
 *
 * REFERÊNCIAS: NBR 6118:2023 | NBR 12655:2022 | AFGC 2013 | De Larrard 1999
 */

import { z } from "zod";
import { router, publicProc, executarCalculo } from "../trpc";

import {
  DadosProjetoInputSchema,
  SelecaoMateriaisInputSchema,
  ParametrosDosagemInputSchema,
} from "../../shared/schemas";

import {
  processarCurva,
  construirCurvaDePerfil,
  PARAMS_ANDREASEN_PADRAO,
  PARAMS_ANDREASEN_UHPC,
  PARAMS_ANDREASEN_CAD,
  PARAMS_EMPACOTAMENTO_PADRAO,
  PARAMS_EMPACOTAMENTO_UHPC,
} from "../../lib/granulometria";
import type {
  CurvaGranulometrica,
  DadoPeneira,
  ParamsAndreasen,
} from "../../lib/granulometria";

import { otimizarEmpacotamento } from "../../lib/empacotamento";
import type {
  ResultadoOtimizacao,
  ModeloCurvaReferencia,
  FuncaoObjetivoOtimizacao,
} from "../../lib/empacotamento";

import { PONTOS_CALIBRACAO_DENSUS_DEFAULT } from "../../lib/abrams";
import type { PontoCalibracaoAbrams } from "../../lib/abrams";

import { calcularDosagem } from "../../lib/dosagem";
import type {
  InputsProjeto,
  InputsMateriais,
  InputsComposicao,
  InputsUmidadeCampo,
  ResultadoDosagem,
} from "../../lib/dosagem";
import type { ComposicaoM3Generica } from "../../types/materiais";

import {
  dimensionarCorposDeProva,
  escalonarTracoParaPiloto,
} from "../../lib/laboratorio";
import type {
  LoteCp,
  GeometriaCpId,
  IdadeRompimento,
} from "../../lib/laboratorio";

import {
  compararTracos as compararTracosEngine,
  PESOS_RANKING_PADRAO,
} from "../../lib/comparativo";
import type {
  EntradaTraco,
  PesosRanking,
  ResultadoComparativo,
} from "../../lib/comparativo";

import {
  PERFIS_LASER_CIMENTICIO,
} from "../../lib/constants";

import {
  DADOS_GRANULO_DENSUS_DEFAULT,
} from "../../lib/granulometria";

import {
  executarEstudoParametrico,
  type VariavelParametrica,
} from "../../lib/parametrico";

import { calcularACI211 as calcularACI211Fn } from "../../lib/aci211";
import { calcularABCP as calcularABCPFn } from "../../lib/abcp";
import { gerarGrafico4Q as gerarGrafico4QFn } from "../../lib/ibracon4q";

// ═════════════════════════════════════════════════════════════════════════════
// SCHEMAS ZOD DE INPUT
// ═════════════════════════════════════════════════════════════════════════════

const DadoPeneiraZ = z.object({
  aberturaMMm:      z.number().positive(),
  massaRetidaG:     z.number().min(0),
  passanteLaserPct: z.number().min(0).max(100).optional(),
  origemLaser:      z.boolean().optional(),
});

const FonteCurvaZ = z.discriminatedUnion("origem", [
  z.object({
    origem:    z.literal("MEDICAO"),
    id:        z.string().min(1),
    descricao: z.string().min(1),
    dados:     z.array(DadoPeneiraZ).min(3),
  }),
  z.object({
    origem:    z.literal("CATALOGO"),
    id:        z.string().min(1),
    descricao: z.string().min(1),
    perfilId:  z.enum(["CP_V_ARI","MICROSILICA","METACAULIM","FILER_CALCARIO","CINZA_VOLANTE_F"] as const),
  }),
  z.object({
    origem:      z.literal("DENSUS_DEFAULT"),
    id:          z.string().min(1),
    descricao:   z.string().min(1),
    materialKey: z.enum(["M1","M2","G1","G2","G3"] as const),
  }),
]);

const OtimizarMisturaZ = z.object({
  fontes:             z.array(FonteCurvaZ).min(2).max(8),
  classeConcreto:     z.enum(["CCV","CAD","UHPC"]).default("CCV"),
  modelo:             z.enum(["ANDREASEN","FULLER","BOLOMEY","AIM","ROSIN_RAMMLER"] as const).default("ANDREASEN"),
  funcaoObjetivo:     z.enum(["RMSE","RMSE_ATIVO","WLS"] as const).default("RMSE"),
  andreasenCustom:    z.object({ q: z.number().min(0.15).max(0.60), dMinMm: z.number().positive(), dMaxMm: z.number().positive() }).optional(),
  aimCustom:          z.object({ q: z.number().min(0.15).max(0.60).default(0.25), dMaxMm: z.number().positive() }).optional(),
  rosinRammlerCustom: z.object({ d63Mm: z.number().positive(), n: z.number().min(0.3).max(3.0) }).optional(),
  algoritmo:          z.enum(["auto","grid","monte_carlo"]).default("auto"),
  passoGrid:          z.number().int().min(1).max(10).default(5),
  iteracoesMC:        z.number().int().min(1000).max(500_000).default(50_000),
  propMinimaPercent:  z.number().min(0).max(50).default(0),
  propMaximaPercent:  z.number().min(10).max(100).default(100),
  betaStarPorId:      z.record(z.string(), z.number().min(0.40).max(0.80)).optional(),
  limiarInteracaoCPM: z.number().min(0.001).max(0.1).default(0.01),
});

export type OtimizarMisturaInput = z.infer<typeof OtimizarMisturaZ>;

const TracoTeoricoZ = z.object({
  projeto:   DadosProjetoInputSchema,
  materiais: SelecaoMateriaisInputSchema,
  parametros: ParametrosDosagemInputSchema,
  proporcaoOtima: z.record(z.string(), z.number().min(0).max(1))
    .refine((p) => Math.abs(Object.values(p).reduce((a,b)=>a+b,0)-1)<0.02,
            { message: "Soma das fracoes deve ser 1 (+-0.02)" })
    .optional(),
  pontosAbrams: z.array(z.object({
    id:       z.string(),
    relacaoAc: z.number().min(0.20).max(1.00),
    fc28dMPa:  z.number().positive(),
    fc1dMPa:   z.number().positive().optional(),
    fc3dMPa:   z.number().positive().optional(),
    fc7dMPa:   z.number().positive().optional(),
    fc14dMPa:  z.number().positive().optional(),
    fc56dMPa:  z.number().positive().optional(),
    fc91dMPa:  z.number().positive().optional(),
  })).min(3).optional(),
  tipoCebFip:   z.enum(["NORMAL","ALTA_RESISTENCIA_INICIAL","LENTO"] as const).default("NORMAL"),
  umidadeCampo: z.object({
    agregados: z.array(z.object({
      id: z.string().min(1),
      umidadePercent: z.number().min(0).max(15),
    })).default([]),
  }).optional(),
});

export type TracoTeoricoInput = z.infer<typeof TracoTeoricoZ>;

// Geometrias exatas de GeometriaCpId (laboratorio.ts)
const GeometriaZ = z.enum([
  "CIL_10_20","CIL_15_30","CIL_5_10","CIL_7P5_15","MINI_CONE",
  "PRI_4_4_16","PRI_10_10_40","PRI_15_15_50",
  "PRI_ENTALHE_15_15_55","PRI_RETRACAO_25","PRI_RETRACAO_40",
  "CUBO_4","CUBO_10","CUBO_15",
  "PLACA_GRC_4PT_60_25","PLACA_GRC_3PT_45_15",
] as const satisfies readonly GeometriaCpId[]);

const IdadeRompimentoZ = z.enum([
  "12h","24h","3d","7d","14d","28d","56d","91d",
] as const satisfies readonly IdadeRompimento[]);

const EscalonarPilotoZ = z.object({
  composicaoM3: z.object({
    linhas: z.array(z.object({
      categoria: z.string(),
      id: z.string(),
      descricao: z.string(),
      massaKgM3: z.number(),
    })),
  }),
  lotesCp: z.array(z.object({
    geometria:        GeometriaZ,
    quantidade:       z.number().int().positive().max(100),
    idadesRompimento: z.array(IdadeRompimentoZ).min(1),
  })).min(1).max(20),
  fatorPerda:             z.number().min(0).max(0.50).default(0.20),
  volumeMinimoBetoneira:  z.number().positive().max(500).default(5),
});

export type EscalonarPilotoInput = z.infer<typeof EscalonarPilotoZ>;

const EntradaTracoZ = z.discriminatedUnion("tipo", [
  z.object({
    tipo:      z.literal("HISTORICO"),
    id:        z.string().min(1),
    descricao: z.string().min(1),
    mc:        z.number().positive(),
    fcmMPa:    z.number().positive(),
    fckMPa:    z.number().positive(),
    custoM3:   z.number().positive(),
    co2KgM3:   z.number().positive(),
    volumes: z.object({
      cimentoL:   z.number(),
      aguaL:      z.number(),
      areiasL:    z.number(),
      britasL:    z.number(),
      aditivoSpL: z.number().default(0),
    }).optional(),
  }),
  z.object({
    tipo:      z.literal("CALCULADO"),
    id:        z.string().min(1),
    descricao: z.string().min(1),
    abrams: z.object({
      fcjMPa:               z.number(),
      resistenciasPorIdade: z.object({ fc28dMPa: z.number() }),
      relacaoAc:            z.object({ acAdotado: z.number() }),
    }),
    composicaoM3: z.object({
      linhas: z.array(z.object({
        categoria: z.string(),
        id: z.string(),
        descricao: z.string(),
        densidadeTm3: z.number(),
        massaKgM3: z.number(),
        volumeLM3: z.number(),
        custoReaisM3: z.number(),
        co2KgM3: z.number(),
      })),
      custoTotalReaisM3: z.number(),
      co2TotalKgM3:      z.number(),
    }),
  }),
]);

const CompararTracosZ = z.object({
  tracos: z.array(EntradaTracoZ).min(2).max(10),
  pesos:  z.object({
    custo:      z.number().min(0).max(1).default(0.40),
    co2:        z.number().min(0).max(1).default(0.30),
    eficiencia: z.number().min(0).max(1).default(0.30),
  }).optional(),
});

export type CompararTracosInput = z.infer<typeof CompararTracosZ>;

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═════════════════════════════════════════════════════════════════════════════

function _resolverFonte(fonte: z.infer<typeof FonteCurvaZ>): CurvaGranulometrica {
  if (fonte.origem === "MEDICAO") {
    const dados: DadoPeneira[] = fonte.dados.map((d) => ({
      aberturaMMm: d.aberturaMMm, massaRetidaG: d.massaRetidaG,
      passanteLaserPct: d.passanteLaserPct, origemLaser: d.origemLaser,
    }));
    return processarCurva(fonte.id, fonte.descricao, dados);
  }
  if (fonte.origem === "CATALOGO") {
    const perfil = PERFIS_LASER_CIMENTICIO[fonte.perfilId];
    if (!perfil) throw new Error(`Perfil '${fonte.perfilId}' nao encontrado no catalogo.`);
    return construirCurvaDePerfil(fonte.id, fonte.descricao, perfil.passantes);
  }
  // DENSUS_DEFAULT
  const padrao = DADOS_GRANULO_DENSUS_DEFAULT[fonte.materialKey];
  if (!padrao) throw new Error(`Material padrao '${fonte.materialKey}' nao encontrado.`);
  const dados: DadoPeneira[] = padrao.peneiras.map((p) => ({
    aberturaMMm: p.aberturaMMm, massaRetidaG: p.massaRetidaG,
  }));
  return processarCurva(fonte.id, fonte.descricao, dados);
}

function _resolverParamsAndreasen(
  classeConcreto: "CCV"|"CAD"|"UHPC",
  dMaxMm: number,
  custom?: { q: number; dMinMm: number; dMaxMm: number }
): ParamsAndreasen {
  if (custom) return { q: custom.q, dMinMm: custom.dMinMm, dMaxMm: custom.dMaxMm };
  const base = classeConcreto === "UHPC" ? PARAMS_ANDREASEN_UHPC
             : classeConcreto === "CAD"  ? PARAMS_ANDREASEN_CAD
             : PARAMS_ANDREASEN_PADRAO;
  return { ...base, dMaxMm };
}

function _adaptarEntrada(t: z.infer<typeof EntradaTracoZ>): EntradaTraco {
  if (t.tipo === "HISTORICO") {
    const vols = t.volumes;
    const comp: ComposicaoM3Generica | undefined = vols ? {
      linhas: [
        { categoria: "cimento", id: "cim", descricao: "Cimento", densidadeTm3: 3.10, massaKgM3: t.mc, volumeLM3: vols.cimentoL, custoReaisM3: 0, co2KgM3: 0 },
        { categoria: "agua", id: "agua", descricao: "Agua", densidadeTm3: 1.00, massaKgM3: 0, volumeLM3: vols.aguaL, custoReaisM3: 0, co2KgM3: 0 },
        { categoria: "areia", id: "areia", descricao: "Areia", densidadeTm3: 2.62, massaKgM3: 0, volumeLM3: vols.areiasL, custoReaisM3: 0, co2KgM3: 0 },
        { categoria: "brita", id: "brita", descricao: "Brita", densidadeTm3: 2.68, massaKgM3: 0, volumeLM3: vols.britasL, custoReaisM3: 0, co2KgM3: 0 },
        ...(vols.aditivoSpL > 0 ? [{ categoria: "aditivoSp" as const, id: "sp", descricao: "SP", densidadeTm3: 1.06, massaKgM3: 0, volumeLM3: vols.aditivoSpL, custoReaisM3: 0, co2KgM3: 0 }] : []),
      ],
      volumeTotalLM3: 1000, massaTotalKgM3: 2400,
      custoTotalReaisM3: t.custoM3, co2TotalKgM3: t.co2KgM3, fechamentoVolumeOk: true,
    } : undefined;
    return { id: t.id, descricao: t.descricao, mc: t.mc, fcmMPa: t.fcmMPa,
             fckMPa: t.fckMPa, custoM3: t.custoM3, co2KgM3: t.co2KgM3, composicaoM3: comp };
  }
  // CALCULADO — composicaoM3 already has linhas[] format
  const comp = t.composicaoM3;
  const domComp: ComposicaoM3Generica = {
    linhas: comp.linhas.map(l => ({
      categoria: l.categoria as ComposicaoM3Generica["linhas"][0]["categoria"],
      id: l.id, descricao: l.descricao, densidadeTm3: l.densidadeTm3,
      massaKgM3: l.massaKgM3, volumeLM3: l.volumeLM3,
      custoReaisM3: l.custoReaisM3, co2KgM3: l.co2KgM3,
    })),
    volumeTotalLM3: 1000, massaTotalKgM3: 2400,
    custoTotalReaisM3: comp.custoTotalReaisM3, co2TotalKgM3: comp.co2TotalKgM3, fechamentoVolumeOk: true,
  };
  const cimLinha = comp.linhas.find(l => l.categoria === "cimento");
  return {
    id: t.id, descricao: t.descricao,
    mc:       cimLinha?.massaKgM3 ?? 0,
    fcmMPa:   t.abrams.resistenciasPorIdade.fc28dMPa,
    fckMPa:   t.abrams.fcjMPa,
    custoM3:  comp.custoTotalReaisM3,
    co2KgM3:  comp.co2TotalKgM3,
    composicaoM3: domComp,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// ROTEADOR tRPC
// ═════════════════════════════════════════════════════════════════════════════

export const dosagemRouter = router({

  /**
   * ENDPOINT 1 — otimizarMistura
   * Motor: empacotamento.ts
   * Saida: proporcao ideal + RMSE/WLS/beta* + curvas de referencia para plotagem
   */
  otimizarMistura: publicProc
    .input(OtimizarMisturaZ)
    .mutation(async ({ input }) => {
      return executarCalculo(() => {
        const curvas: CurvaGranulometrica[] = input.fontes.map(_resolverFonte);
        const dMaxMm = Math.max(...curvas.map((c) => c.dimensaoMaximaCaracteristicaMm));
        const paramsAnd = _resolverParamsAndreasen(input.classeConcreto, dMaxMm, input.andreasenCustom);
        const paramsAIM = input.aimCustom
          ? { q: input.aimCustom.q, dMaxMm: input.aimCustom.dMaxMm }
          : input.modelo === "AIM" ? { q: paramsAnd.q, dMaxMm } : undefined;
        const paramsRosinRammler = input.rosinRammlerCustom
          ? { d63Mm: input.rosinRammlerCustom.d63Mm, n: input.rosinRammlerCustom.n }
          : input.modelo === "ROSIN_RAMMLER" ? { d63Mm: dMaxMm * 0.63, n: 1.0 } : undefined;
        const paramsEmpacot = input.classeConcreto === "UHPC" ? PARAMS_EMPACOTAMENTO_UHPC : PARAMS_EMPACOTAMENTO_PADRAO;
        const paramsCPM = input.betaStarPorId
          ? { betaStarPorId: input.betaStarPorId, limiarInteracao: input.limiarInteracaoCPM }
          : undefined;

        const res: ResultadoOtimizacao = otimizarEmpacotamento(
          curvas, paramsAnd, paramsEmpacot,
          {
            algoritmo:      input.algoritmo,
            passoGrid:      input.passoGrid,
            iteracoesMC:    input.iteracoesMC,
            modelo:         input.modelo as ModeloCurvaReferencia,
            paramsAIM,
            paramsRosinRammler,
            funcaoObjetivo: input.funcaoObjetivo as FuncaoObjetivoOtimizacao,
            paramsCPM,
          }
        );

        const peneiras = res.curvasReferencia.peneiras;
        const passanteMisturaOtima = peneiras.map((d) => ({
          aberturaMm:  d,
          passantePct: res.composicaoOtima.curvaMistura.passantesPorAbertura[String(d)] ?? 0,
        }));

        const o = res.otimo;
        return {
          algoritmo:       res.algoritmo,
          modeloCurva:     res.modeloCurva,
          funcaoObjetivo:  res.funcaoObjetivo,
          nCombinacoes:    res.nCombinacoes,
          tempoExecucaoMs: res.tempoExecucaoMs,
          proporcoes:      o.proporcoes,
          metricas: {
            rmse:          o.rmse,
            rmseAtivo:     o.rmseAtivo    ?? null,
            wls:           o.wls          ?? null,
            eficiencia:    o.eficiencia,
            phiEstimado:   o.phiEstimado,
            teorVaziosPct: o.teorVaziosPct,
            betaStarCPM:   o.betaStarCPM  ?? null,
            teorVaziosCPM: o.teorVaziosCPM ?? null,
          },
          moduloFinuraMistura: o.moduloFinuraMistura,
          dmcMisturaMm:        o.dmcMisturaMm,
          topCandidatos: res.topCandidatos.map((c) => ({
            proporcoes:          c.proporcoes,
            rmse:                c.rmse,
            rmseAtivo:           c.rmseAtivo    ?? null,
            wls:                 c.wls          ?? null,
            eficiencia:          c.eficiencia,
            phiEstimado:         c.phiEstimado,
            teorVaziosPct:       c.teorVaziosPct,
            betaStarCPM:         c.betaStarCPM  ?? null,
            moduloFinuraMistura: c.moduloFinuraMistura,
            dmcMisturaMm:        c.dmcMisturaMm,
          })),
          curvasReferencia: {
            peneiras:  res.curvasReferencia.peneiras,
            andreasen: res.curvasReferencia.andreasen,
            fuller:    res.curvasReferencia.fuller,
            bolomey:   res.curvasReferencia.bolomey,
            bolomeyA:  res.curvasReferencia.bolomeyA,
            aim:       res.curvasReferencia.aim       ?? null,
            pesosWLS:  res.curvasReferencia.pesosWLS  ?? null,
          },
          passanteMisturaOtima,
          paramsAndreasenUsados: { q: paramsAnd.q, dMinMm: paramsAnd.dMinMm, dMaxMm: paramsAnd.dMaxMm },
          shilstone: res.shilstone ?? null,
          tarantula: res.tarantula ?? null,
        };
      });
    }),

  /**
   * ENDPOINT 2 — calcularTracoTeorico
   * Motor: abrams.ts (a/c) + dosagem.ts (volumes IPT-EPUSP)
   * Saida: traco 1 m3 + resistencias por idade + verificacoes NBR 6118
   */
  calcularTracoTeorico: publicProc
    .input(TracoTeoricoZ)
    .mutation(async ({ input }) => {
      return executarCalculo(() => {
        const { projeto, materiais, parametros, proporcaoOtima, tipoCebFip } = input;

        const inputsProjeto: InputsProjeto = {
          fckMPa:               projeto.fckMPa,
          desvioPadraoCampoMPa: projeto.desvioPadraoCampoMPa,
          fatorT:               projeto.fatorTStudent,
          slumpMm:              projeto.slumpMm,
          dmcMm:                projeto.dmcMm,
          classeAgressividade:  projeto.classeAgressividade,
        };

        // Map new array-based input to InputsMateriais
        const inputsMateriais: InputsMateriais = {
          cimentos:      materiais.cimentos,
          areias:        materiais.areias,
          britas:        materiais.britas,
          aditivosSp:    materiais.aditivosSp ?? [],
          scms:          materiais.scms ?? [],
          fibras:        materiais.fibras ?? [],
          compensadores: materiais.compensadores ?? [],
          cristalizantes: materiais.cristalizantes ?? [],
          pigmentos:     materiais.pigmentos ?? [],
        };

        // Calculate aggregate fractions from proporcaoOtima or defaults
        let fracaoAreias = parametros.fracaoArgamassa;

        if (proporcaoOtima) {
          const idsAreia = materiais.areias.map(a => a.id);
          const somaAreias = idsAreia.reduce((s, id) => s + (proporcaoOtima[id] ?? 0), 0);
          const somaTotal  = Object.values(proporcaoOtima).reduce((a, b) => a + b, 0);
          if (somaTotal > 0 && somaAreias > 0) {
            fracaoAreias = somaAreias / somaTotal;
          }
        }

        // Compute total SP fraction from all aditivos
        const fracaoTotalSp = (materiais.aditivosSp ?? []).reduce((s, a) => s + a.fracaoCimento, 0);

        // Compute total SCM fraction
        const fracaoTotalScm = parametros.fracaoScm;

        const mcEstimado =
          projeto.fckMPa <= 30 ? 320 :
          projeto.fckMPa <= 50 ? 400 :
          projeto.fckMPa <= 80 ? 480 : 550;

        const inputsComposicao: InputsComposicao = {
          consumoCimentoKgM3:       mcEstimado,
          fracaoAreiasNoAgregado:   fracaoAreias,
          fracaoScmDeCimento:       fracaoTotalScm,
          fracaoArAprisionado:      parametros.fracaoArAprisionado,
        };

        const pontosAbrams: PontoCalibracaoAbrams[] =
          (input.pontosAbrams ?? []).length >= 3
            ? input.pontosAbrams!.map((p) => ({
                id: p.id, relacaoAc: p.relacaoAc, fc28dMPa: p.fc28dMPa,
                fc1dMPa: p.fc1dMPa, fc3dMPa: p.fc3dMPa, fc7dMPa: p.fc7dMPa,
                fc14dMPa: p.fc14dMPa, fc56dMPa: p.fc56dMPa, fc91dMPa: p.fc91dMPa,
              }))
            : PONTOS_CALIBRACAO_DENSUS_DEFAULT;

        const umidadeCampo: InputsUmidadeCampo | undefined = input.umidadeCampo
          ? { agregados: input.umidadeCampo.agregados }
          : undefined;

        const dosagem: ResultadoDosagem = calcularDosagem(
          inputsProjeto, inputsMateriais, inputsComposicao,
          pontosAbrams, umidadeCampo, tipoCebFip
        );

        const { abrams, kPasta, composicaoM3, tracoUnitario, tracoCampo, verificacoes } = dosagem;

        return {
          abrams: {
            fcjMPa: abrams.fcjMPa,
            relacaoAc: {
              acCalculado:       abrams.relacaoAc.acCalculado,
              acAdotado:         abrams.relacaoAc.acAdotado,
              limitadoPelaNorma: abrams.relacaoAc.limitadoPelaNorma,
              avisoNorma:        abrams.relacaoAc.avisoNorma ?? null,
            },
            paramsRegressao: {
              A:       abrams.paramsRegressao.A,
              B:       abrams.paramsRegressao.B,
              r2:      abrams.paramsRegressao.r2,
              nPontos: abrams.paramsRegressao.nPontos,
            },
            fatoresMaturidade: {
              beta1d:  abrams.fatoresMaturidade.beta1d,
              beta3d:  abrams.fatoresMaturidade.beta3d,
              beta7d:  abrams.fatoresMaturidade.beta7d,
              beta14d: abrams.fatoresMaturidade.beta14d,
              beta28d: abrams.fatoresMaturidade.beta28d,
              beta56d: abrams.fatoresMaturidade.beta56d,
              beta91d: abrams.fatoresMaturidade.beta91d,
              modelo:  abrams.fatoresMaturidade.modelo,
            },
            resistenciasPorIdade: {
              fc1dMPa:  abrams.resistenciasPorIdade.fc1dMPa,
              fc3dMPa:  abrams.resistenciasPorIdade.fc3dMPa,
              fc7dMPa:  abrams.resistenciasPorIdade.fc7dMPa,
              fc14dMPa: abrams.resistenciasPorIdade.fc14dMPa,
              fc28dMPa: abrams.resistenciasPorIdade.fc28dMPa,
              fc56dMPa: abrams.resistenciasPorIdade.fc56dMPa,
              fc91dMPa: abrams.resistenciasPorIdade.fc91dMPa,
            },
          },
          kPasta,
          composicaoM3,
          tracoUnitario,
          tracoCampo: tracoCampo ?? null,
          verificacoes: verificacoes.map((v) => ({
            parametro:       v.parametro,
            valorCalculado:  v.valorCalculado,
            limiteNorma:     v.limiteNorma,
            normaReferencia: v.normaReferencia,
            aprovado:        v.aprovado,
            mensagem:        v.mensagem,
          })),
          meta: {
            obra:                projeto.obra,
            responsavelTecnico:  projeto.responsavelTecnico ?? null,
            dataEstudo:          projeto.dataEstudo         ?? null,
            fckMPa:              projeto.fckMPa,
            classeAgressividade: projeto.classeAgressividade,
            norma:               projeto.norma,
          },
        };
      });
    }),

  /**
   * ENDPOINT 3 — escalonarPiloto
   * Motor: laboratorio.ts
   * Saida: planilha de pesagem (gramas) + dimensionamento dos CPs
   */
  escalonarPiloto: publicProc
    .input(EscalonarPilotoZ)
    .mutation(async ({ input }) => {
      return executarCalculo(() => {
        const lotesCp: LoteCp[] = input.lotesCp.map((l) => ({
          geometria:        l.geometria as GeometriaCpId,
          quantidade:       l.quantidade,
          idadesRompimento: l.idadesRompimento as IdadeRompimento[],
        }));

        const dimCps = dimensionarCorposDeProva(lotesCp, input.fatorPerda);
        const volumeBetoneira = Math.max(dimCps.volumeBetoneira, input.volumeMinimoBetoneira);

        const c = input.composicaoM3;
        const dosagemMinima: ResultadoDosagem = {
          abrams: {
            fcjMPa: 0,
            relacaoAc: {
              acCalculado: 0, acAdotado: 0, limitadoPelaNorma: false,
              limitesNormativos: { classeAgressividade: "CAA-II", acMaximo: 0.60, fckMinMPa: 25, cobrimentoMinMm: 30 },
            },
            paramsRegressao: { A: 0, B: 0, r2: 0, nPontos: 0 },
            fatoresMaturidade: {
              beta1d: 0, beta3d: 0, beta7d: 0, beta14d: 0,
              beta28d: 1.0, beta56d: 0, beta91d: 0, modelo: "ceb-fip",
            },
            resistenciasPorIdade: {
              fc1dMPa: 0, fc3dMPa: 0, fc7dMPa: 0, fc14dMPa: 0,
              fc28dMPa: 0, fc56dMPa: 0, fc91dMPa: 0,
            },
          },
          kPasta: 0,
          composicaoM3: {
            linhas: c.linhas.map(l => ({
              categoria: l.categoria as ComposicaoM3Generica["linhas"][0]["categoria"],
              id: l.id,
              descricao: l.descricao,
              densidadeTm3: 0,
              massaKgM3: l.massaKgM3,
              volumeLM3: 0,
              custoReaisM3: 0,
              co2KgM3: 0,
            })),
            volumeTotalLM3: 1000, massaTotalKgM3: 2400,
            custoTotalReaisM3: 0, co2TotalKgM3: 0, fechamentoVolumeOk: true,
          },
          tracoUnitario: { cimento: 1, areias: [], britas: [], agua: 0 },
          verificacoes: [],
        };

        const planilha = escalonarTracoParaPiloto(dosagemMinima, volumeBetoneira);
        const totalCPs = lotesCp.reduce((a, l) => a + l.quantidade, 0);
        const avisoVolume = volumeBetoneira > dimCps.volumeBetoneira
          ? `Volume minimo (${input.volumeMinimoBetoneira} L) aplicado — calculado era ${dimCps.volumeBetoneira} L.`
          : null;

        return {
          dimensionamentoCps: {
            lotes: dimCps.lotes.map((l) => ({
              geometria:           l.geometria,
              descricaoGeometria:  l.descricaoGeometria,
              quantidade:          l.quantidade,
              idadesRompimento:    l.idadesRompimento,
              volumeUnitarioDm3:   l.volumeUnitarioDm3,
              volumeLoteSemPerdaL: l.volumeLoteSemPerdaL,
            })),
            volumeTotalSemPerdaL: dimCps.volumeTotalSemPerdaL,
            fatorPerda:           dimCps.fatorPerda,
            volumeTotalComPerdaL: dimCps.volumeTotalComPerdaL,
            volumeBetoneira,
          },
          planilhaPesagem: {
            volumeBetoneira:     planilha.volumeBetoneira,
            fatorEscala:         planilha.fatorEscala,
            massaTotalBetoneira: planilha.massaTotalBetoneira,
            materiais:           planilha.materiais,
          },
          resumo: { totalCPs, volumeBetoneira, massaTotalKg: planilha.massaTotalBetoneira, avisoVolume },
        };
      });
    }),

  /**
   * ENDPOINT 4 — compararTracos
   * Motor: comparativo.ts
   * Saida: ranking multicritério + score composto + matriz de deltas pairwise
   */
  compararTracos: publicProc
    .input(CompararTracosZ)
    .mutation(async ({ input }) => {
      return executarCalculo(() => {
        const tracosEntrada: EntradaTraco[] = input.tracos.map(_adaptarEntrada);
        const pesos: PesosRanking = input.pesos
          ? { custo: input.pesos.custo, co2: input.pesos.co2, eficiencia: input.pesos.eficiencia }
          : PESOS_RANKING_PADRAO;

        const res: ResultadoComparativo = compararTracosEngine(tracosEntrada, pesos);

        return {
          kpis: res.kpis.map((k) => ({
            idTraco:               k.idTraco,
            descricao:             k.descricao,
            consumoCimentoKgM3:    k.consumoCimentoKgM3,
            fcmMPa:                k.fcmMPa,
            fckMPa:                k.fckMPa,
            fcmRealMPa:            k.fcmRealMPa ?? null,
            eficienciaCimentoEta:  k.eficienciaCimentoEta,
            cimentoPorResistencia: k.cimentoPorResistencia,
            custoM3:               k.custoM3,
            custoPorMPa:           k.custoPorMPa,
            co2KgM3:               k.co2KgM3,
            co2PorMPa:             k.co2PorMPa,
            volumetricos: {
              teorPastaGammaPct:      k.volumetricos.teorPastaGammaPct,
              teorArgamassaAlphaPct:  k.volumetricos.teorArgamassaAlphaPct,
              teorGraudo:             k.volumetricos.teorGraudo,
              relacaoAgregatoCimento: k.volumetricos.relacaoAgregatoCimento,
              fracaoAreiaBetaM:       k.volumetricos.fracaoAreiaBetaM,
              relacaoAguaCimento:     k.volumetricos.relacaoAguaCimento,
            },
          })),
          ranking: res.ranking.map((r) => ({
            idTraco:       r.kpi.idTraco,
            descricao:     r.kpi.descricao,
            posicao:       r.posicaoRanking,
            scoreComposto: r.scoreComposto,
            scores: {
              custo:      r.scoresIndividuais.custo,
              co2:        r.scoresIndividuais.co2,
              eficiencia: r.scoresIndividuais.eficiencia,
            },
          })),
          destaques: {
            melhorScore:     res.ranking[0]?.kpi.idTraco ?? "",
            menorCusto:      res.menorCusto,
            menorCo2:        res.menorCo2,
            maiorEficiencia: res.maiorEficiencia,
          },
          pesosUsados: {
            custo:      res.pesosUsados.custo,
            co2:        res.pesosUsados.co2,
            eficiencia: res.pesosUsados.eficiencia,
          },
          matrizDeltas: res.matrizDeltas.map((par) => ({
            idTracoA: par.idTracoA,
            idTracoB: par.idTracoB,
            vencedor: par.vencedor,
            deltas:   par.deltas.map((d) => ({
              kpi:      d.kpi,
              unidade:  d.unidade,
              valorA:   d.valorA,
              valorB:   d.valorB,
              delta:    d.delta,
              deltaPct: d.deltaPct,
              aVenceu:  d.aVenceu,
            })),
          })),
          resumo: res.resumo,
        };
      });
    }),

  // ────────────────────────────────────────────────────────────────────────
  // 5. ESTUDO PARAMÉTRICO (BID)
  // ────────────────────────────────────────────────────────────────────────

  estudoParametrico: publicProc
    .input(z.object({
      projeto:     DadosProjetoInputSchema,
      materiais:   SelecaoMateriaisInputSchema,
      parametros:  ParametrosDosagemInputSchema,
      sweep: z.object({
        variavel: z.enum(["fckMPa", "relacaoAc", "fracaoArgamassa", "fracaoScm", "fracaoArAprisionado"]),
        min:      z.number(),
        max:      z.number(),
        passos:   z.number().int().min(3).max(50).default(10),
      }),
      pontosAbrams: z.array(z.object({
        id: z.string(), relacaoAc: z.number(), fc28dMPa: z.number(),
        fc1dMPa: z.number().optional(), fc3dMPa: z.number().optional(),
        fc7dMPa: z.number().optional(), fc14dMPa: z.number().optional(),
        fc56dMPa: z.number().optional(), fc91dMPa: z.number().optional(),
      })).optional(),
      tipoCebFip: z.enum(["NORMAL", "ALTA_RESISTENCIA_INICIAL", "LENTO"]).default("NORMAL"),
    }))
    .mutation(async ({ input }) => {
      return executarCalculo(() => {
        const { projeto, materiais, parametros, sweep, tipoCebFip } = input;

        const inputsProjeto: InputsProjeto = {
          fckMPa: projeto.fckMPa,
          desvioPadraoCampoMPa: projeto.desvioPadraoCampoMPa,
          fatorT: projeto.fatorTStudent,
          slumpMm: projeto.slumpMm,
          dmcMm: projeto.dmcMm,
          classeAgressividade: projeto.classeAgressividade as "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV",
        };

        const inputsMateriais: InputsMateriais = {
          cimentos:      materiais.cimentos,
          areias:        materiais.areias,
          britas:        materiais.britas,
          aditivosSp:    materiais.aditivosSp ?? [],
          scms:          materiais.scms ?? [],
          fibras:        materiais.fibras ?? [],
          compensadores: materiais.compensadores ?? [],
          cristalizantes: materiais.cristalizantes ?? [],
          pigmentos:     materiais.pigmentos ?? [],
        };

        const mcEstimado =
          projeto.fckMPa <= 30 ? 320 :
          projeto.fckMPa <= 50 ? 400 :
          projeto.fckMPa <= 80 ? 480 : 550;

        const inputsComposicao: InputsComposicao = {
          consumoCimentoKgM3:     mcEstimado,
          fracaoAreiasNoAgregado: parametros.fracaoArgamassa,
          fracaoScmDeCimento:     parametros.fracaoScm,
          fracaoArAprisionado:    parametros.fracaoArAprisionado,
        };

        const pontosAbrams: PontoCalibracaoAbrams[] =
          (input.pontosAbrams ?? []).length >= 3
            ? input.pontosAbrams!.map((p) => ({
                id: p.id, relacaoAc: p.relacaoAc, fc28dMPa: p.fc28dMPa,
                fc1dMPa: p.fc1dMPa, fc3dMPa: p.fc3dMPa, fc7dMPa: p.fc7dMPa,
                fc14dMPa: p.fc14dMPa, fc56dMPa: p.fc56dMPa, fc91dMPa: p.fc91dMPa,
              }))
            : PONTOS_CALIBRACAO_DENSUS_DEFAULT;

        const resultado = executarEstudoParametrico(
          inputsProjeto,
          inputsMateriais,
          inputsComposicao,
          pontosAbrams,
          {
            variavel: sweep.variavel as VariavelParametrica,
            min: sweep.min,
            max: sweep.max,
            passos: sweep.passos,
          },
          tipoCebFip,
        );

        return resultado;
      });
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DOSAGEM ACI 211.1
  // ═══════════════════════════════════════════════════════════════════════════

  calcularACI211: publicProc
    .input(z.object({
      fcrMPa: z.number().min(5).max(80),
      slumpMm: z.number().min(10).max(250),
      dmcMm: z.number().min(4.75).max(150),
      mfAreia: z.number().min(1.5).max(4.0),
      densidadeCimentoTm3: z.number().min(2.5).max(3.5),
      densidadeAreiaTm3: z.number().min(2.3).max(3.0),
      densidadeBritaTm3: z.number().min(2.3).max(3.2),
      muCompactadaBritaTm3: z.number().min(1.0).max(2.0),
      acMaxDurabilidade: z.number().min(0.2).max(1.0).optional(),
      arIncorporado: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      return executarCalculo(() => {
        return calcularACI211Fn(input);
      });
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. DOSAGEM ABCP
  // ═══════════════════════════════════════════════════════════════════════════

  calcularABCP: publicProc
    .input(z.object({
      fckMPa: z.number().min(5).max(80),
      sdMPa: z.number().min(1).max(15),
      slumpMm: z.number().min(10).max(250),
      dmcMm: z.number().min(4.75).max(150),
      mfAreia: z.number().min(1.5).max(4.0),
      densidadeCimentoTm3: z.number().min(2.5).max(3.5),
      densidadeAreiaTm3: z.number().min(2.3).max(3.0),
      densidadeBritaTm3: z.number().min(2.3).max(3.2),
      muCompactadaBritaTm3: z.number().min(1.0).max(2.0),
      classeAgressividade: z.enum(["CAA-I", "CAA-II", "CAA-III", "CAA-IV"]),
    }))
    .mutation(({ input }) => {
      return executarCalculo(() => {
        return calcularABCPFn(input);
      });
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. GRÁFICO 4 QUADRANTES — IPT-EPUSP / IBRACON
  // ═══════════════════════════════════════════════════════════════════════════

  gerarGrafico4Q: publicProc
    .input(z.object({
      abramsA: z.number(),
      abramsB: z.number(),
      abramsForm: z.enum(["lnln", "exponencial"]).default("lnln"),
      lyseK3: z.number().default(-2.0),
      lyseK4: z.number().default(12.5),
      densidadeCimentoTm3: z.number().min(2.5).max(3.5).default(3.06),
      densidadeAgregadoMedioTm3: z.number().min(2.3).max(3.0).default(2.65),
      fckAlvoMPa: z.number().min(5).max(120).optional(),
      sdMPa: z.number().min(1).max(15).optional(),
      fatorT: z.number().optional(),
      acMin: z.number().min(0.1).max(0.8).optional(),
      acMax: z.number().min(0.3).max(1.2).optional(),
      nPontos: z.number().min(5).max(100).optional(),
    }))
    .mutation(({ input }) => {
      return executarCalculo(() => {
        return gerarGrafico4QFn({
          params: {
            abramsA: input.abramsA,
            abramsB: input.abramsB,
            abramsForm: input.abramsForm,
            lyseK3: input.lyseK3,
            lyseK4: input.lyseK4,
            densidadeCimentoTm3: input.densidadeCimentoTm3,
            densidadeAgregadoMedioTm3: input.densidadeAgregadoMedioTm3,
          },
          fckAlvoMPa: input.fckAlvoMPa,
          sdMPa: input.sdMPa,
          fatorT: input.fatorT,
          acMin: input.acMin,
          acMax: input.acMax,
          nPontos: input.nPontos,
        });
      });
    }),

}); // ── fim dosagemRouter

export type DosagemRouter = typeof dosagemRouter;
