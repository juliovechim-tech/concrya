/**
 * @file types/materiais.ts
 * @description CORE MIX PRO — Tipos de domínio de engenharia de concreto.
 *              Interfaces TypeScript puras (sem Zod) para uso em funções
 *              matemáticas, algoritmos e camada de domínio.
 *
 * HIERARQUIA:
 *   constants.ts  →  dados brutos do banco de materiais
 *   schemas.ts    →  validação Zod de I/O (tRPC boundary)
 *   types/materiais.ts  →  tipos de domínio para lógica de cálculo
 */

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIAS DE MATERIAIS — sistema genérico N materiais
// ─────────────────────────────────────────────────────────────────────────────

/** Todas as categorias de materiais suportadas pelo sistema */
export type CategoriaId =
  | "cimento"
  | "areia"
  | "brita"
  | "aditivoSp"
  | "scm"
  | "fibra"
  | "compensador"
  | "cristalizante"
  | "pigmento";

/** Item de material selecionado pelo usuário com fração no grupo */
export interface MaterialItemSelecionado {
  id: string;
  /** Fração deste material no total da categoria (0–1, soma = 1 no grupo) */
  fracao: number;
}

/** Resultado de um material na composição de 1 m³ */
export interface LinhaComposicaoGenerica {
  categoria: CategoriaId | "agua" | "ar";
  id: string;
  descricao: string;
  densidadeTm3: number;
  massaKgM3: number;
  volumeLM3: number;
  custoReaisM3: number;
  co2KgM3: number;
}

/** Composição completa genérica para 1 m³ */
export interface ComposicaoM3Generica {
  linhas: LinhaComposicaoGenerica[];
  volumeTotalLM3: number;
  massaTotalKgM3: number;
  custoTotalReaisM3: number;
  co2TotalKgM3: number;
  fechamentoVolumeOk: boolean;
}

/** Traço unitário genérico (1 parte de cimento) */
export interface TracoUnitarioGenerico {
  cimento: 1;
  areias: { id: string; valor: number }[];
  britas: { id: string; valor: number }[];
  agua: number;
  aditivoSp?: number;
  scm?: number;
}

/** Traço de campo genérico */
export interface TracoCampoGenerico {
  cimentoKgM3: number;
  aguaBetoneiraMKgM3: number;
  agregados: {
    id: string;
    categoria: "areia" | "brita";
    descricao: string;
    massaSecaKgM3: number;
    massaCampoKgM3: number;
    temCorrecaoUmidade: boolean;
  }[];
  aditivoSpKgM3?: number;
  scmKgM3?: number;
  ajusteAguaKgM3: number;
}

/** Helper: buscar linhas por categoria */
export function linhasPorCategoria(
  comp: ComposicaoM3Generica,
  cat: CategoriaId | "agua" | "ar"
): LinhaComposicaoGenerica[] {
  return comp.linhas.filter((l) => l.categoria === cat);
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL BASE — propriedades físicas comuns a qualquer material
// ─────────────────────────────────────────────────────────────────────────────

export interface MaterialBase {
  id: string;
  descricao: string;
  /** Massa específica real — t/m³ */
  densidadeTm3: number;
  /** Custo de referência — R$/t */
  custoReaisPorTonelada: number;
  /** Emissão de CO₂ — kg CO₂ / t de material */
  emissaoCO2kgPorTonelada: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIGANTE — Cimento + SCM tratados como sistema aglomerante
// ─────────────────────────────────────────────────────────────────────────────

export interface Cimento extends MaterialBase {
  tipo: "CP I" | "CP II-E" | "CP II-F" | "CP II-Z" | "CP III" | "CP IV" | "CP V-ARI";
  /** Resistência característica garantida pelo fabricante aos 28d — MPa */
  resistenciaCaracteristica28dMPa: number;
  /** Área superficial específica Blaine — cm²/g */
  blaineCm2g: number;
}

export interface ScmMaterial extends MaterialBase {
  tipo: "Silica Fume" | "Fly Ash" | "Metacaulim" | "Escória" | "Outro";
  /**
   * Fator de eficiência k (NBR 12655 / EN 206-1)
   * Representa equivalência cimentícia: k=2.5 para sílica ativa
   */
  fatorK: number;
  /** Área superficial BET — m²/g */
  areaBetM2g: number;
}

/**
 * Sistema aglomerante composto: cimento + SCM opcional
 * Parâmetro de entrada para cálculo do volume de pasta
 */
export interface SistemaAglomerante {
  cimento: Cimento;
  massaCimentoKgM3: number;
  scm?: ScmMaterial;
  massaScmKgM3?: number;
  /** a/c efetivo (relação água / (cimento + k × scm)) */
  relacaoAcEfetivo: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREGADOS — Miúdo e Graúdo com propriedades granulométricas
// ─────────────────────────────────────────────────────────────────────────────

export interface Agregado extends MaterialBase {
  /** Dimensão máxima característica — mm */
  dmaxMm: number;
  /** Módulo de finura — adimensional */
  moduloDeFinura: number;
  /** Absorção de água — % em massa */
  absorcaoPercent: number;
  /** Umidade de campo medida — % em massa */
  umidadeCampoPercent: number;
}

export interface AgregadoMiudo extends Agregado {
  categoria: "miudo";
  /** Natural | Manufaturada | Reciclada */
  origem: string;
}

export interface AgregadoGraudo extends Agregado {
  categoria: "graudo";
  /** Calcário | Granito | Basalto | Seixo | Reciclado */
  petrografia: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADITIVO — Superplastificante e outros
// ─────────────────────────────────────────────────────────────────────────────

export interface Aditivo extends MaterialBase {
  /** SP-PCE | SP-LS | VMA | IA (incorporador de ar) | Retardador | Acelerador */
  tipo: string;
  /** Massa específica da solução — g/cm³ */
  densidadeGcm3: number;
  /** Dosagem típica — fração da massa de cimento */
  dosagemFracaoCimento: number;
  /** Redução de água proporcionada — fração */
  reducaoAguaFracao: number;
  precoReaisPorKg: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSIÇÃO — Resultado do traço para 1 m³
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponenteTraco {
  material: MaterialBase;
  /** Massa no traço — kg/m³ */
  massaKgM3: number;
  /** Volume absoluto — L/m³ */
  volumeLM3: number;
  /** Custo — R$/m³ */
  custoReaisM3: number;
  /** CO₂ — kg/m³ */
  co2KgM3: number;
}

export interface TracoAbsoluto {
  cimento: ComponenteTraco;
  agua: ComponenteTraco;
  areias: ComponenteTraco[];
  britas: ComponenteTraco[];
  aditivos: ComponenteTraco[];
  scm?: ComponenteTraco;
  /** Volume total (deve ser ≈ 1000 L/m³) */
  volumeTotalLM3: number;
  massaTotalKgM3: number;
  custoTotalReaisM3: number;
  co2TotalKgM3: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARÂMETROS DA LEI DE ABRAMS
// Modelo de regressão: ln(Fc) = A + B × ln(a/c)
// ─────────────────────────────────────────────────────────────────────────────

export interface ParamsAbrams {
  /** Intercepto da regressão ln-ln */
  A: number;
  /** Inclinação (deve ser negativo) */
  B: number;
  /** R² da regressão */
  r2: number;
}

export interface PontoCalibracaoAbrams {
  relacaoAc: number;
  fc28dMPa: number;
  fc1dMPa?: number;
  fc3dMPa?: number;
  fc7dMPa?: number;
  fc56dMPa?: number;
  fc91dMPa?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTO DE DOSAGEM — agrupa todo o estado necessário para os cálculos
// ─────────────────────────────────────────────────────────────────────────────

export interface ContextoDosagem {
  /** Parâmetros de projeto (fck, σ, slump, DMC, CAA) */
  projeto: {
    fckMPa: number;
    desvioPadraoCampoMPa: number;
    fatorT: number;
    slumpMm: number;
    dmcMm: number;
    classeAgressividade: "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV";
  };
  /** Parâmetros da curva de Abrams calibrada para o cimento em uso */
  curvaAbrams: ParamsAbrams;
  /** Relação a/c adotada (pode ser diferente do calculado) */
  relacaoAcAdotado: number;
  /** Proporções de mistura (argamassa, areias, britas, SCM) */
  proporcoes: {
    fracaoArgamassa: number;
    fracaoAreia1: number;
    fracaoBrita0: number;
    fracaoScm: number;
    fracaoAditivoSp: number;
    fracaoArAprisionado: number;
  };
  /** Materiais selecionados */
  materiais: {
    cimento: Cimento;
    scm?: ScmMaterial;
    areia1: AgregadoMiudo;
    areia2?: AgregadoMiudo;
    graudo1: AgregadoGraudo;
    graudo2?: AgregadoGraudo;
    aditivoSp?: Aditivo;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIMITES NORMATIVOS — NBR 6118:2023 Tabela 7.1
// Máximos de a/c e mínimos de fck por classe de agressividade
// ─────────────────────────────────────────────────────────────────────────────

export interface LimitesNormativos {
  classeAgressividade: "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV";
  acMaximo: number;
  fckMinMPa: number;
  cobrimentoMinMm: number;
}

export const LIMITES_NBR6118_2023: LimitesNormativos[] = [
  { classeAgressividade: "CAA-I",   acMaximo: 0.65, fckMinMPa: 20, cobrimentoMinMm: 25 },
  { classeAgressividade: "CAA-II",  acMaximo: 0.60, fckMinMPa: 25, cobrimentoMinMm: 30 },
  { classeAgressividade: "CAA-III", acMaximo: 0.55, fckMinMPa: 30, cobrimentoMinMm: 40 },
  { classeAgressividade: "CAA-IV",  acMaximo: 0.45, fckMinMPa: 40, cobrimentoMinMm: 50 },
];

/** Retorna os limites normativos para uma dada CAA */
export function getLimitesNormativos(
  caa: "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV"
): LimitesNormativos {
  return LIMITES_NBR6118_2023.find((l) => l.classeAgressividade === caa)!;
}
