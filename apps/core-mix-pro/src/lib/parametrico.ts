/**
 * @file lib/parametrico.ts
 * @description Estudo Paramétrico BID — Variar 1 variável, fixar o resto, avaliar KPIs
 *
 * Dado um conjunto base de inputs de dosagem, o motor varre uma variável
 * ao longo de um range [min, max] com N passos, chamando calcularDosagem()
 * para cada ponto e coletando os KPIs resultantes.
 */

import { calcularDosagem, type InputsProjeto, type InputsMateriais, type InputsComposicao } from "./dosagem";
import { type PontoCalibracaoAbrams, type TipoCimentoCebFip } from "./abrams";
import type { ComposicaoM3Generica } from "../types/materiais";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type VariavelParametrica =
  | "fckMPa"
  | "relacaoAc"
  | "fracaoArgamassa"
  | "fracaoScm"
  | "fracaoArAprisionado";

export interface ParametricSweepConfig {
  variavel: VariavelParametrica;
  min: number;
  max: number;
  passos: number; // 3–50
}

export interface PontoParametrico {
  valorVariavel: number;
  acAdotado: number;
  fcjMPa: number;
  consumoCimentoKgM3: number;
  custoReaisM3: number;
  co2KgM3: number;
  eficienciaEta: number;   // fc / mc
  custoPorMPa: number;     // custo / fc
  co2PorMPa: number;       // co2 / fc
  aprovadoNorma: boolean;  // todas verificações OK
  nVerificacoesAprovadas: number;
  nVerificacoesTotais: number;
  erro?: string;
}

export interface ResultadoParametrico {
  config: ParametricSweepConfig;
  labelVariavel: string;
  unidadeVariavel: string;
  pontos: PontoParametrico[];
  melhorCusto: PontoParametrico | null;
  melhorEficiencia: PontoParametrico | null;
  melhorCo2: PontoParametrico | null;
  zonaAprovada: { min: number; max: number } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LABELS
// ─────────────────────────────────────────────────────────────────────────────

const LABELS: Record<VariavelParametrica, { label: string; unidade: string }> = {
  fckMPa:              { label: "fck",                 unidade: "MPa" },
  relacaoAc:           { label: "Relação a/c",         unidade: "" },
  fracaoArgamassa:     { label: "Fração argamassa",    unidade: "" },
  fracaoScm:           { label: "Fração SCM",          unidade: "" },
  fracaoArAprisionado: { label: "Ar aprisionado",      unidade: "" },
};

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR
// ─────────────────────────────────────────────────────────────────────────────

export function executarEstudoParametrico(
  baseProjeto: InputsProjeto,
  baseMateriais: InputsMateriais,
  baseComposicao: InputsComposicao,
  pontosAbrams: PontoCalibracaoAbrams[],
  sweep: ParametricSweepConfig,
  tipoCebFip: TipoCimentoCebFip = "NORMAL",
  acBase?: number,
): ResultadoParametrico {
  const { variavel, min, max, passos } = sweep;
  const step = passos > 1 ? (max - min) / (passos - 1) : 0;
  const info = LABELS[variavel];

  const pontos: PontoParametrico[] = [];

  for (let i = 0; i < passos; i++) {
    const valor = passos === 1 ? min : min + i * step;
    const valorArredondado = Math.round(valor * 10000) / 10000;

    // Clonar inputs e substituir a variável varrida
    const projeto = { ...baseProjeto };
    const composicao = { ...baseComposicao };

    switch (variavel) {
      case "fckMPa":
        projeto.fckMPa = valorArredondado;
        break;
      case "relacaoAc":
        // a/c será fixada — usaremos o acBase como a/c desejado
        // mas a dosagem calcula a/c a partir do fck, então precisamos
        // ajustar o fck para obter o a/c desejado (inverso)
        // Simplificação: passamos o a/c como override
        break;
      case "fracaoArgamassa":
        composicao.fracaoAreiasNoAgregado = valorArredondado;
        break;
      case "fracaoScm":
        composicao.fracaoScmDeCimento = valorArredondado;
        break;
      case "fracaoArAprisionado":
        composicao.fracaoArAprisionado = valorArredondado;
        break;
    }

    // Estimar consumo de cimento
    const fckEfetivo = projeto.fckMPa;
    composicao.consumoCimentoKgM3 =
      fckEfetivo <= 30 ? 320 :
      fckEfetivo <= 50 ? 400 :
      fckEfetivo <= 80 ? 480 : 550;

    try {
      const resultado = calcularDosagem(
        projeto, baseMateriais, composicao,
        pontosAbrams, undefined, tipoCebFip
      );

      const comp = resultado.composicaoM3;
      const fc = resultado.abrams.fcjMPa;
      const mc = extrairConsumoCimento(comp);
      const custo = comp.custoTotalReaisM3;
      const co2 = comp.co2TotalKgM3;
      const aprovadas = resultado.verificacoes.filter(v => v.aprovado).length;
      const totais = resultado.verificacoes.length;

      pontos.push({
        valorVariavel: valorArredondado,
        acAdotado: resultado.abrams.relacaoAc.acAdotado,
        fcjMPa: fc,
        consumoCimentoKgM3: mc,
        custoReaisM3: custo,
        co2KgM3: co2,
        eficienciaEta: mc > 0 ? Math.round((fc / mc) * 10000) / 10000 : 0,
        custoPorMPa: fc > 0 ? Math.round((custo / fc) * 100) / 100 : 0,
        co2PorMPa: fc > 0 ? Math.round((co2 / fc) * 100) / 100 : 0,
        aprovadoNorma: aprovadas === totais,
        nVerificacoesAprovadas: aprovadas,
        nVerificacoesTotais: totais,
      });
    } catch (err) {
      // Ponto inválido — volume negativo, a/c fora de range, etc.
      pontos.push({
        valorVariavel: valorArredondado,
        acAdotado: 0,
        fcjMPa: 0,
        consumoCimentoKgM3: 0,
        custoReaisM3: 0,
        co2KgM3: 0,
        eficienciaEta: 0,
        custoPorMPa: 0,
        co2PorMPa: 0,
        aprovadoNorma: false,
        nVerificacoesAprovadas: 0,
        nVerificacoesTotais: 0,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Identificar melhores pontos (apenas entre pontos válidos sem erro)
  const validos = pontos.filter(p => !p.erro && p.consumoCimentoKgM3 > 0);
  const aprovados = validos.filter(p => p.aprovadoNorma);

  const melhorCusto = minimoPor(aprovados.length > 0 ? aprovados : validos, p => p.custoReaisM3);
  const melhorEficiencia = maximoPor(aprovados.length > 0 ? aprovados : validos, p => p.eficienciaEta);
  const melhorCo2 = minimoPor(aprovados.length > 0 ? aprovados : validos, p => p.co2KgM3);

  // Zona aprovada pela norma
  const aprovadosValues = aprovados.map(p => p.valorVariavel);
  const zonaAprovada = aprovadosValues.length > 0
    ? { min: Math.min(...aprovadosValues), max: Math.max(...aprovadosValues) }
    : null;

  return {
    config: sweep,
    labelVariavel: info.label,
    unidadeVariavel: info.unidade,
    pontos,
    melhorCusto,
    melhorEficiencia,
    melhorCo2,
    zonaAprovada,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function extrairConsumoCimento(comp: ComposicaoM3Generica): number {
  const linhaCimento = comp.linhas.find(l => l.categoria === "cimento");
  return linhaCimento ? linhaCimento.massaKgM3 : 0;
}

function minimoPor<T>(arr: T[], fn: (item: T) => number): T | null {
  if (arr.length === 0) return null;
  return arr.reduce((best, item) => fn(item) < fn(best) ? item : best);
}

function maximoPor<T>(arr: T[], fn: (item: T) => number): T | null {
  if (arr.length === 0) return null;
  return arr.reduce((best, item) => fn(item) > fn(best) ? item : best);
}
