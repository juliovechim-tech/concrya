/**
 * @file lib/dosagem.ts
 * @description CORE MIX PRO — Motor de Dosagem IPT-EPUSP (Volumes Absolutos)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA DO MÉTODO IPT-EPUSP (Helene & Terzian, 1992)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O método de dosagem por volumes absolutos parte do princípio de que
 * 1 m³ de concreto adensado corresponde a exatamente 1000 litros de volume,
 * onde cada componente ocupa seu volume absoluto (real, sem vazios):
 *
 *   V_cim + V_água + V_areias + V_britas + V_aditivos + V_ar = 1000 L  … (Σ)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PIPELINE DE CÁLCULO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ETAPA 0 — Abrams   → fcj, a/c calibrado com NBR 6118
 * ETAPA 1 — k        → coeficiente volumétrico da pasta
 * ETAPA 2 — mc       → consumo de cimento (input do engenheiro)
 * ETAPA 3 — Pasta    → volumes (cimento, água, SP, SCM, ar)
 * ETAPA 4 — Extras   → fibras, compensadores, cristalizantes, pigmentos
 * ETAPA 5 — Agregados → distribuição areias/britas por fração
 * ETAPA 6 — Traço    → unitário e de campo (se umidades fornecidas)
 * ETAPA 7 — Checks   → verificações normativas
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1] Helene, P. & Terzian, P. (1992). Manual de Dosagem e Controle.
 *   [2] NBR 12655:2022 — Preparo, controle e recebimento do concreto.
 *   [3] NBR 6118:2023 — Projeto de estruturas de concreto.
 *   [4] ACI 211.1-91 — Standard Practice for Selecting Proportions.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  calcularDosagemAbrams,
  type PontoCalibracaoAbrams,
  type ResultadoAbrams,
  type TipoCimentoCebFip,
  PONTOS_CALIBRACAO_DENSUS_DEFAULT,
} from "./abrams";

import {
  CIMENTOS,
  AGREGADOS_MIUDOS,
  AGREGADOS_GRAUDOS,
  ADITIVOS,
  SCM_ADICOES,
  DENSIDADE_AGUA_TM3,
  VOLUME_1M3_LITROS,
  AR_APRISIONADO_PADRAO_FRACAO,
  getMaterialCatalog,
  type CimentoId,
  type AgregadoMiudoId,
  type AgregadoGraudoId,
  type AditivoId,
  type ScmId,
} from "./constants";

import { getLimitesNormativos } from "../types/materiais";
import type {
  LinhaComposicaoGenerica,
  ComposicaoM3Generica,
  TracoUnitarioGenerico,
  TracoCampoGenerico,
} from "../types/materiais";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE INPUT (GENÉRICO N MATERIAIS)
// ─────────────────────────────────────────────────────────────────────────────

/** Parâmetros de projeto fornecidos pelo engenheiro */
export interface InputsProjeto {
  fckMPa: number;
  desvioPadraoCampoMPa: number;
  fatorT: number;
  slumpMm: number;
  dmcMm: number;
  classeAgressividade: "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV";
}

/** Item de material selecionado com fração */
export interface MaterialItemInput {
  id: string;
  fracao: number; // 0–1, soma normalizada no grupo
}

/** Item de aditivo dosado por fração da massa de cimento */
export interface AditivoItemInput {
  id: string;
  fracaoCimento: number; // ex: 0.012 = 1.2%
}

/** Item de material dosado por kg/m³ */
export interface MaterialDosadoKgInput {
  id: string;
  kgM3: number;
}

/** Seleção de materiais genérica (N materiais por categoria) */
export interface InputsMateriais {
  cimentos: MaterialItemInput[];
  areias: MaterialItemInput[];
  britas: MaterialItemInput[];
  aditivosSp: AditivoItemInput[];
  scms: MaterialItemInput[];
  fibras: MaterialDosadoKgInput[];
  compensadores: MaterialDosadoKgInput[];
  cristalizantes: MaterialDosadoKgInput[];
  pigmentos: MaterialDosadoKgInput[];
}

/** Proporções e parâmetros de composição */
export interface InputsComposicao {
  consumoCimentoKgM3: number;
  fracaoAreiasNoAgregado: number;
  fracaoScmDeCimento: number;
  fracaoArAprisionado: number;
}

/** Umidade de campo por agregado */
export interface UmidadeAgregadoInput {
  id: string;
  umidadePercent: number;
}

/** Umidades de campo medidas em obra */
export interface InputsUmidadeCampo {
  agregados: UmidadeAgregadoInput[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

// Re-export dos tipos genéricos de materiais.ts
export type { LinhaComposicaoGenerica, ComposicaoM3Generica, TracoUnitarioGenerico, TracoCampoGenerico };

/** Resultado de uma verificação técnica normativa */
export interface VerificacaoTecnica {
  parametro: string;
  valorCalculado: number | string;
  limiteNorma: number | string;
  normaReferencia: string;
  aprovado: boolean;
  mensagem: string;
}

/** Resultado completo do motor de dosagem */
export interface ResultadoDosagem {
  abrams: ResultadoAbrams;
  kPasta: number;
  composicaoM3: ComposicaoM3Generica;
  tracoUnitario: TracoUnitarioGenerico;
  tracoCampo?: TracoCampoGenerico;
  verificacoes: VerificacaoTecnica[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class DosagemVolumeNegativoError extends Error {
  constructor(componente: string, volume: number) {
    super(
      `Volume de '${componente}' resultou em ${volume.toFixed(1)} L (negativo). ` +
      `Reduza o consumo de cimento ou a relação a/c.`
    );
    this.name = "DosagemVolumeNegativoError";
  }
}

export class DosagemConsumoCimentoError extends Error {
  constructor(mc: number) {
    super(
      `Consumo de cimento ${mc} kg/m³ fora do intervalo válido [150, 600]. ` +
      `Verifique os parâmetros de entrada.`
    );
    this.name = "DosagemConsumoCimentoError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const TOLERANCIA_VOLUME_L = 20;
const MC_MIN_KG_M3 = 150;
const MC_MAX_KG_M3 = 600;

const CONSUMO_MINIMO_CIMENTO: Record<string, number> = {
  "CAA-I":   260,
  "CAA-II":  280,
  "CAA-III": 320,
  "CAA-IV":  360,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

/** Normaliza frações de um array para que somem 1 */
function normalizarFracoes(items: MaterialItemInput[]): MaterialItemInput[] {
  const soma = items.reduce((s, i) => s + i.fracao, 0);
  if (soma === 0 || items.length === 0) return items;
  return items.map(i => ({ ...i, fracao: i.fracao / soma }));
}

/** Resolve material do banco antigo por ID e categoria */
function resolverCimento(id: string) {
  return CIMENTOS[id as CimentoId];
}
function resolverAreia(id: string) {
  return AGREGADOS_MIUDOS[id as AgregadoMiudoId];
}
function resolverBrita(id: string) {
  return AGREGADOS_GRAUDOS[id as AgregadoGraudoId];
}
function resolverAditivo(id: string) {
  return ADITIVOS[id as AditivoId];
}
function resolverScm(id: string) {
  return SCM_ADICOES[id as ScmId];
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 1 — COEFICIENTE VOLUMÉTRICO DA PASTA
// ─────────────────────────────────────────────────────────────────────────────

export function calcularCoeficienteKPasta(
  relacaoAc: number,
  densidadeCimentoKgL: number,
  fracaoAditivoSp: number = 0,
  densidadeSpKgL: number = 1.0
): number {
  const kCimento  = 1 / densidadeCimentoKgL;
  const kAgua     = relacaoAc / DENSIDADE_AGUA_TM3;
  const kAditivo  = fracaoAditivoSp / densidadeSpKgL;
  return kCimento + kAgua + kAditivo;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 2 — CONSUMO DE CIMENTO E VOLUMES DA PASTA
// ─────────────────────────────────────────────────────────────────────────────

export function calcularConsumoCimento(mc: number, relacaoAc: number, k: number, fracaoAditivoSp: number, densidadeSpKgL: number, fracaoScm: number, densidadeCimentoKgL: number, fracaoAr: number = AR_APRISIONADO_PADRAO_FRACAO): {
  massaAguaKg:     number;
  massaSpKg:       number;
  massaScmKg:      number;
  volumeCimentoL:  number;
  volumeAguaL:     number;
  volumeSpL:       number;
  volumeScmL:      number;
  volumeArL:       number;
  volumePastaL:    number;
  volumeDisponivel: number;
} {
  if (mc < MC_MIN_KG_M3 || mc > MC_MAX_KG_M3) {
    throw new DosagemConsumoCimentoError(mc);
  }

  const massaAguaKg    = relacaoAc * mc;
  const massaSpKg      = fracaoAditivoSp * mc;
  const massaScmKg     = fracaoScm * mc;

  const volumeCimentoL = mc / densidadeCimentoKgL;
  const volumeAguaL    = massaAguaKg / DENSIDADE_AGUA_TM3;
  const volumeSpL      = massaSpKg / densidadeSpKgL;
  const volumeScmL     = 0; // resolvido externamente com densidade específica

  const volumeArL      = fracaoAr * VOLUME_1M3_LITROS;
  const volumePastaL   = k * mc + volumeArL;
  const volumeDisponivel = VOLUME_1M3_LITROS - volumePastaL;

  if (volumeDisponivel < 0) {
    throw new DosagemVolumeNegativoError("agregados", volumeDisponivel);
  }

  return {
    massaAguaKg, massaSpKg, massaScmKg,
    volumeCimentoL, volumeAguaL, volumeSpL, volumeScmL,
    volumeArL, volumePastaL, volumeDisponivel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 3 — VOLUME E MASSAS DOS AGREGADOS (GENÉRICO N MATERIAIS)
// ─────────────────────────────────────────────────────────────────────────────

interface AgregadoCalc {
  id: string;
  fracao: number;
  densidadeTm3: number;
  descricao: string;
}

interface AgregadoResult {
  id: string;
  descricao: string;
  densidadeTm3: number;
  volumeL: number;
  massaKg: number;
}

/**
 * Distribui volume disponível entre areias e britas, cada grupo com N materiais.
 * Frações são normalizadas internamente.
 */
export function calcularVolumeAgregadosGenerico(
  volumeDisponivelL: number,
  fracaoAreiasNoAgregado: number,
  areias: AgregadoCalc[],
  britas: AgregadoCalc[]
): { areias: AgregadoResult[]; britas: AgregadoResult[] } {
  const volumeAreiasL = fracaoAreiasNoAgregado * volumeDisponivelL;
  const volumeBritasL = (1 - fracaoAreiasNoAgregado) * volumeDisponivelL;

  const distribuir = (items: AgregadoCalc[], volumeTotal: number): AgregadoResult[] => {
    const somaFracoes = items.reduce((s, i) => s + i.fracao, 0);
    return items.map(item => {
      const fracNorm = somaFracoes > 0 ? item.fracao / somaFracoes : 1 / items.length;
      const vol = fracNorm * volumeTotal;
      const massa = vol * item.densidadeTm3;
      return {
        id: item.id,
        descricao: item.descricao,
        densidadeTm3: item.densidadeTm3,
        volumeL: vol,
        massaKg: massa,
      };
    });
  };

  return {
    areias: distribuir(areias, volumeAreiasL),
    britas: distribuir(britas, volumeBritasL),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 4 — VERIFICAÇÕES TÉCNICAS NBR 6118:2023 / NBR 12655:2022
// ─────────────────────────────────────────────────────────────────────────────

export function verificacoesNormativas(
  acAdotado:           number,
  consumoCimentoKgM3:  number,
  fracaoArgamassa:     number,
  slumpMm:             number,
  custoReaisM3:        number,
  co2KgM3:             number,
  fckMPa:              number,
  classeAgressividade: "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV"
): VerificacaoTecnica[] {
  const limites = getLimitesNormativos(classeAgressividade);
  const mcMin   = CONSUMO_MINIMO_CIMENTO[classeAgressividade] ?? 280;

  const checks: VerificacaoTecnica[] = [];

  // 1. Relação a/c máxima
  const acOk = acAdotado <= limites.acMaximo;
  checks.push({
    parametro: "Relação a/c máxima",
    valorCalculado: acAdotado,
    limiteNorma: limites.acMaximo,
    normaReferencia: "NBR 6118:2023 Tab. 7.1",
    aprovado: acOk,
    mensagem: acOk
      ? `a/c = ${acAdotado.toFixed(2)} ≤ ${limites.acMaximo.toFixed(2)} ✅`
      : `a/c = ${acAdotado.toFixed(2)} > ${limites.acMaximo.toFixed(2)} — REPROVADO ❌`,
  });

  // 2. Consumo mínimo de cimento
  const mcOk = consumoCimentoKgM3 >= mcMin;
  checks.push({
    parametro: "Consumo mínimo de cimento",
    valorCalculado: consumoCimentoKgM3,
    limiteNorma: mcMin,
    normaReferencia: "NBR 12655:2022 Tab. 4",
    aprovado: mcOk,
    mensagem: mcOk
      ? `${consumoCimentoKgM3.toFixed(0)} kg/m³ ≥ ${mcMin} kg/m³ ✅`
      : `${consumoCimentoKgM3.toFixed(0)} kg/m³ < ${mcMin} kg/m³ — REPROVADO ❌`,
  });

  // 3. fck mínimo
  const fckOk = fckMPa >= limites.fckMinMPa;
  checks.push({
    parametro: "fck mínimo para a CAA",
    valorCalculado: fckMPa,
    limiteNorma: limites.fckMinMPa,
    normaReferencia: "NBR 6118:2023 Tab. 7.1",
    aprovado: fckOk,
    mensagem: fckOk
      ? `fck = ${fckMPa} MPa ≥ ${limites.fckMinMPa} MPa ✅`
      : `fck = ${fckMPa} MPa < ${limites.fckMinMPa} MPa — REPROVADO ❌`,
  });

  // 4. Fração de argamassa
  const argOk = fracaoArgamassa >= 0.45 && fracaoArgamassa <= 0.70;
  const argPct = (fracaoArgamassa * 100).toFixed(0);
  checks.push({
    parametro: "Fração de argamassa (β_m)",
    valorCalculado: `${argPct}%`,
    limiteNorma: "45–70%",
    normaReferencia: "IPT-EPUSP / Helene & Terzian 1992",
    aprovado: argOk,
    mensagem: argOk
      ? `β_m = ${argPct}% dentro do intervalo 45–70% ✅`
      : `β_m = ${argPct}% fora do intervalo 45–70% — revisar ⚠️`,
  });

  // 5. Slump
  const slumpOk = slumpMm >= 50 && slumpMm <= 220;
  checks.push({
    parametro: "Abatimento (Slump)",
    valorCalculado: slumpMm,
    limiteNorma: "50–220 mm",
    normaReferencia: "NBR NM 67 / NBR 6118:2023 Tab. 8.1",
    aprovado: slumpOk,
    mensagem: slumpOk
      ? `Slump = ${slumpMm} mm — trabalhabilidade adequada ✅`
      : `Slump = ${slumpMm} mm fora do intervalo usual — verificar ⚠️`,
  });

  // 6. CO₂
  const co2Ok = co2KgM3 <= 350;
  checks.push({
    parametro: "Emissão de CO₂",
    valorCalculado: co2KgM3,
    limiteNorma: 350,
    normaReferencia: "Referência: Densus Engine / sustentabilidade",
    aprovado: co2Ok,
    mensagem: co2Ok
      ? `CO₂ = ${co2KgM3.toFixed(0)} kg/m³ ≤ 350 kg/m³ ✅`
      : `CO₂ = ${co2KgM3.toFixed(0)} kg/m³ > 350 — considerar SCM ⚠️`,
  });

  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 5 — ORQUESTRADOR PRINCIPAL (GENÉRICO N MATERIAIS)
// ─────────────────────────────────────────────────────────────────────────────

export function calcularDosagem(
  projeto:      InputsProjeto,
  materiais:    InputsMateriais,
  composicao:   InputsComposicao,
  pontosAbrams: PontoCalibracaoAbrams[] = PONTOS_CALIBRACAO_DENSUS_DEFAULT,
  umidadeCampo?: InputsUmidadeCampo,
  tipoCebFip:   TipoCimentoCebFip = "NORMAL"
): ResultadoDosagem {
  // ── ETAPA 0: Motor de Abrams ────────────────────────────────────────────
  const resultadoAbrams = calcularDosagemAbrams(
    projeto.fckMPa,
    projeto.desvioPadraoCampoMPa,
    projeto.fatorT,
    projeto.classeAgressividade,
    pontosAbrams,
    tipoCebFip
  );

  const acAdotado = resultadoAbrams.relacaoAc.acAdotado;

  // ── Resolve cimentos (blend ponderado) ────────────────────────────────
  const cimentosNorm = normalizarFracoes(materiais.cimentos);
  const cimentosResolvidos = cimentosNorm.map(c => ({
    ...c,
    dados: resolverCimento(c.id),
  }));

  // Densidade ponderada do blend de cimentos
  const densidadeCimentoBlend = cimentosResolvidos.reduce(
    (s, c) => s + c.fracao * c.dados.densidadeTm3, 0
  );

  // ── Resolve aditivos SP ───────────────────────────────────────────────
  const fracaoTotalSp = materiais.aditivosSp.reduce((s, a) => s + a.fracaoCimento, 0);
  // Pegar a densidade do primeiro aditivo ou default 1.0
  const primeiroAditivo = materiais.aditivosSp.length > 0
    ? resolverAditivo(materiais.aditivosSp[0].id)
    : null;
  const densidadeSpKgL = primeiroAditivo ? primeiroAditivo.densidadeGcm3 : 1.0;

  // ── ETAPA 1: Coeficiente k ────────────────────────────────────────────
  const kPasta = calcularCoeficienteKPasta(
    acAdotado,
    densidadeCimentoBlend,
    fracaoTotalSp,
    densidadeSpKgL
  );

  // ── ETAPA 2/3: Pasta ──────────────────────────────────────────────────
  const mc = composicao.consumoCimentoKgM3;
  const pasta = calcularConsumoCimento(
    mc,
    acAdotado,
    kPasta,
    fracaoTotalSp,
    densidadeSpKgL,
    composicao.fracaoScmDeCimento,
    densidadeCimentoBlend,
    composicao.fracaoArAprisionado
  );

  // ── Resolve SCMs ──────────────────────────────────────────────────────
  const scmsNorm = normalizarFracoes(materiais.scms);
  const massaScmTotalKg = pasta.massaScmKg;
  const scmsResolvidos = scmsNorm.map(s => {
    const dados = resolverScm(s.id);
    const massa = massaScmTotalKg * s.fracao;
    return { ...s, dados, massaKg: massa, volumeL: massa / dados.densidadeTm3 };
  });
  const volumeScmTotalL = scmsResolvidos.reduce((s, scm) => s + scm.volumeL, 0);

  // ── ETAPA 4: Materiais extras (fibras, compensadores, etc.) ───────────
  // Cada um dosado por kg/m³, desconta volume disponível
  const resolverExtras = (items: MaterialDosadoKgInput[]) =>
    items.map(item => {
      const cat = getMaterialCatalog(item.id);
      const dens = cat?.densidadeTm3 ?? 1.0;
      return {
        ...item,
        descricao: cat?.descricao ?? item.id,
        densidadeTm3: dens,
        volumeL: item.kgM3 / dens,
        custoReaisM3: cat?.precoReaisPorKg ? item.kgM3 * cat.precoReaisPorKg : 0,
        co2KgM3: cat ? item.kgM3 * cat.emissaoCO2kgPorTonelada / 1000 : 0,
      };
    });

  const fibrasCalc = resolverExtras(materiais.fibras);
  const compensadoresCalc = resolverExtras(materiais.compensadores);
  const cristalizantesCalc = resolverExtras(materiais.cristalizantes);
  const pigmentosCalc = resolverExtras(materiais.pigmentos);

  const volumeExtrasL =
    fibrasCalc.reduce((s, f) => s + f.volumeL, 0) +
    compensadoresCalc.reduce((s, c) => s + c.volumeL, 0) +
    cristalizantesCalc.reduce((s, c) => s + c.volumeL, 0) +
    pigmentosCalc.reduce((s, p) => s + p.volumeL, 0);

  // ── Volume disponível efetivo (desconta SCM + extras) ─────────────────
  const volumeDisponivelEfetivo = pasta.volumeDisponivel - volumeScmTotalL - volumeExtrasL;

  if (volumeDisponivelEfetivo < 0) {
    throw new DosagemVolumeNegativoError("agregados (após SCM + extras)", volumeDisponivelEfetivo);
  }

  // ── ETAPA 5: Agregados (N areias + N britas) ─────────────────────────
  const areiasNorm = normalizarFracoes(materiais.areias);
  const britasNorm = normalizarFracoes(materiais.britas);

  const areiasCalc: AgregadoCalc[] = areiasNorm.map(a => {
    const dados = resolverAreia(a.id);
    return { id: a.id, fracao: a.fracao, densidadeTm3: dados.densidadeTm3, descricao: dados.descricao };
  });
  const britasCalc: AgregadoCalc[] = britasNorm.map(b => {
    const dados = resolverBrita(b.id);
    return { id: b.id, fracao: b.fracao, densidadeTm3: dados.densidadeTm3, descricao: dados.descricao };
  });

  const agregados = calcularVolumeAgregadosGenerico(
    volumeDisponivelEfetivo,
    composicao.fracaoAreiasNoAgregado,
    areiasCalc,
    britasCalc
  );

  // ── ETAPA 6: Montar composição ────────────────────────────────────────
  const _custo = (massaKg: number, precoPorTon: number) => massaKg * precoPorTon / 1000;
  const _co2 = (massaKg: number, co2PorTon: number) => massaKg * co2PorTon / 1000;

  const linhas: LinhaComposicaoGenerica[] = [];

  // Cimentos
  for (const c of cimentosResolvidos) {
    const massaKg = mc * c.fracao;
    linhas.push({
      categoria: "cimento", id: c.id, descricao: c.dados.descricao,
      densidadeTm3: c.dados.densidadeTm3,
      massaKgM3: r1(massaKg),
      volumeLM3: r1(massaKg / c.dados.densidadeTm3),
      custoReaisM3: r2(_custo(massaKg, c.dados.precoReaisPorTonelada)),
      co2KgM3: r1(_co2(massaKg, c.dados.emissaoCO2kgPorTonelada)),
    });
  }

  // Água
  linhas.push({
    categoria: "agua", id: "agua", descricao: "Água potável",
    densidadeTm3: DENSIDADE_AGUA_TM3,
    massaKgM3: r1(pasta.massaAguaKg),
    volumeLM3: r1(pasta.volumeAguaL),
    custoReaisM3: 0, co2KgM3: 0,
  });

  // Areias
  for (const a of agregados.areias) {
    const areiaConst = resolverAreia(a.id);
    linhas.push({
      categoria: "areia", id: a.id, descricao: a.descricao,
      densidadeTm3: a.densidadeTm3,
      massaKgM3: r1(a.massaKg),
      volumeLM3: r1(a.volumeL),
      custoReaisM3: r2(_custo(a.massaKg, areiaConst.custoReaisPorTonelada)),
      co2KgM3: 0,
    });
  }

  // Britas
  for (const b of agregados.britas) {
    const britaConst = resolverBrita(b.id);
    linhas.push({
      categoria: "brita", id: b.id, descricao: b.descricao,
      densidadeTm3: b.densidadeTm3,
      massaKgM3: r1(b.massaKg),
      volumeLM3: r1(b.volumeL),
      custoReaisM3: r2(_custo(b.massaKg, britaConst.custoReaisPorTonelada)),
      co2KgM3: 0,
    });
  }

  // Aditivos SP
  for (const ad of materiais.aditivosSp) {
    const dados = resolverAditivo(ad.id);
    const massaKg = ad.fracaoCimento * mc;
    linhas.push({
      categoria: "aditivoSp", id: ad.id, descricao: dados.produto,
      densidadeTm3: dados.densidadeGcm3,
      massaKgM3: r1(massaKg),
      volumeLM3: r1(massaKg / dados.densidadeGcm3),
      custoReaisM3: r2(massaKg * dados.precoReaisPorKg),
      co2KgM3: r1(_co2(massaKg, dados.emissaoCO2kgPorTonelada)),
    });
  }

  // SCMs
  for (const s of scmsResolvidos) {
    linhas.push({
      categoria: "scm", id: s.id, descricao: s.dados.material,
      densidadeTm3: s.dados.densidadeTm3,
      massaKgM3: r1(s.massaKg),
      volumeLM3: r1(s.volumeL),
      custoReaisM3: r2(_custo(s.massaKg, s.dados.precoReaisPorTonelada)),
      co2KgM3: r1(_co2(s.massaKg, s.dados.emissaoCO2kgPorTonelada)),
    });
  }

  // Fibras
  for (const f of fibrasCalc) {
    linhas.push({
      categoria: "fibra", id: f.id, descricao: f.descricao,
      densidadeTm3: f.densidadeTm3,
      massaKgM3: r1(f.kgM3), volumeLM3: r1(f.volumeL),
      custoReaisM3: r2(f.custoReaisM3), co2KgM3: r1(f.co2KgM3),
    });
  }

  // Compensadores
  for (const c of compensadoresCalc) {
    linhas.push({
      categoria: "compensador", id: c.id, descricao: c.descricao,
      densidadeTm3: c.densidadeTm3,
      massaKgM3: r1(c.kgM3), volumeLM3: r1(c.volumeL),
      custoReaisM3: r2(c.custoReaisM3), co2KgM3: r1(c.co2KgM3),
    });
  }

  // Cristalizantes
  for (const c of cristalizantesCalc) {
    linhas.push({
      categoria: "cristalizante", id: c.id, descricao: c.descricao,
      densidadeTm3: c.densidadeTm3,
      massaKgM3: r1(c.kgM3), volumeLM3: r1(c.volumeL),
      custoReaisM3: r2(c.custoReaisM3), co2KgM3: r1(c.co2KgM3),
    });
  }

  // Pigmentos
  for (const p of pigmentosCalc) {
    linhas.push({
      categoria: "pigmento", id: p.id, descricao: p.descricao,
      densidadeTm3: p.densidadeTm3,
      massaKgM3: r1(p.kgM3), volumeLM3: r1(p.volumeL),
      custoReaisM3: r2(p.custoReaisM3), co2KgM3: r1(p.co2KgM3),
    });
  }

  // Ar aprisionado
  linhas.push({
    categoria: "ar", id: "ar", descricao: "Ar aprisionado",
    densidadeTm3: 0, massaKgM3: 0,
    volumeLM3: r1(pasta.volumeArL),
    custoReaisM3: 0, co2KgM3: 0,
  });

  // Totais
  const volumeTotal = linhas.reduce((s, l) => s + l.volumeLM3, 0);
  const massaTotal = linhas.reduce((s, l) => s + l.massaKgM3, 0);
  const custoTotal = linhas.reduce((s, l) => s + l.custoReaisM3, 0);
  const co2Total = linhas.reduce((s, l) => s + l.co2KgM3, 0);

  const composicaoM3: ComposicaoM3Generica = {
    linhas,
    volumeTotalLM3: r1(volumeTotal),
    massaTotalKgM3: r1(massaTotal),
    custoTotalReaisM3: r2(custoTotal),
    co2TotalKgM3: r1(co2Total),
    fechamentoVolumeOk: Math.abs(volumeTotal - VOLUME_1M3_LITROS) <= TOLERANCIA_VOLUME_L,
  };

  // ── Traço unitário ────────────────────────────────────────────────────
  const tracoUnitario: TracoUnitarioGenerico = {
    cimento: 1,
    areias: agregados.areias.map(a => ({ id: a.id, valor: r4(a.massaKg / mc) })),
    britas: agregados.britas.map(b => ({ id: b.id, valor: r4(b.massaKg / mc) })),
    agua: r4(acAdotado),
    aditivoSp: fracaoTotalSp > 0 ? r4(fracaoTotalSp) : undefined,
    scm: composicao.fracaoScmDeCimento > 0 ? r4(composicao.fracaoScmDeCimento) : undefined,
  };

  // ── Traço de campo (opcional) ─────────────────────────────────────────
  let tracoCampo: TracoCampoGenerico | undefined;
  if (umidadeCampo && umidadeCampo.agregados.length > 0) {
    const umidadeMap = new Map(umidadeCampo.agregados.map(a => [a.id, a.umidadePercent]));

    let ajusteTotalAgua = 0;
    const agregadosCampo: TracoCampoGenerico["agregados"] = [];

    // Areias — com correção de umidade
    for (const a of agregados.areias) {
      const areiaConst = resolverAreia(a.id);
      const umidade = umidadeMap.get(a.id) ?? areiaConst.umidadePercent;
      const aguaLivre = a.massaKg * (umidade - areiaConst.absorcaoPercent) / 100;
      ajusteTotalAgua += aguaLivre;
      const massaCampo = a.massaKg * (1 + umidade / 100);
      agregadosCampo.push({
        id: a.id, categoria: "areia", descricao: a.descricao,
        massaSecaKgM3: r1(a.massaKg),
        massaCampoKgM3: r1(massaCampo),
        temCorrecaoUmidade: true,
      });
    }

    // Britas — sem correção de umidade (seca)
    for (const b of agregados.britas) {
      const britaConst = resolverBrita(b.id);
      const umidade = umidadeMap.get(b.id) ?? 0;
      // Britas: umidade tipicamente negligenciável, não corrigimos
      agregadosCampo.push({
        id: b.id, categoria: "brita", descricao: b.descricao,
        massaSecaKgM3: r1(b.massaKg),
        massaCampoKgM3: r1(b.massaKg), // britas: massa seca = massa campo
        temCorrecaoUmidade: false,
      });
    }

    tracoCampo = {
      cimentoKgM3: r1(mc),
      aguaBetoneiraMKgM3: r2(pasta.massaAguaKg - ajusteTotalAgua),
      agregados: agregadosCampo,
      aditivoSpKgM3: fracaoTotalSp > 0 ? r1(pasta.massaSpKg) : undefined,
      scmKgM3: composicao.fracaoScmDeCimento > 0 ? r1(massaScmTotalKg) : undefined,
      ajusteAguaKgM3: r2(ajusteTotalAgua),
    };
  }

  // ── Verificações normativas ───────────────────────────────────────────
  const verificacoes = verificacoesNormativas(
    acAdotado,
    mc,
    composicao.fracaoAreiasNoAgregado,
    projeto.slumpMm,
    custoTotal,
    co2Total,
    projeto.fckMPa,
    projeto.classeAgressividade
  );

  return {
    abrams: resultadoAbrams,
    kPasta: Math.round(kPasta * 100000) / 100000,
    composicaoM3,
    tracoUnitario,
    tracoCampo,
    verificacoes,
  };
}
