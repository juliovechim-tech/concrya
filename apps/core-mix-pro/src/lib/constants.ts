/**
 * @file constants.ts
 * @description CORE MIX PRO — Constantes de materiais extraídas da aba DADOS
 *              do Densus Engine (planilha matriz de engenharia).
 *
 * REGRA DE OURO: Este arquivo é somente leitura em produção.
 * Todos os valores aqui refletem o banco de dados de materiais cadastrados.
 * Inputs editáveis do usuário ficam nos schemas (shared/schemas.ts).
 *
 * Referências normativas:
 *   - NBR 5733 / 5736 / 5737 / 5738 (cimentos brasileiros)
 *   - NBR 7211 (agregados para concreto)
 *   - NBR 11768 (aditivos químicos)
 *   - NBR 15894 / 12653 (adições minerais — SCM)
 */

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 1 — CIMENTOS
// Fonte: aba DADOS, linhas CIM-1 a CIM-4
// ─────────────────────────────────────────────────────────────────────────────

export type CimentoId = "CIM-1" | "CIM-2" | "CIM-3" | "CIM-4";

export interface CimentoConstante {
  /** Identificador único (ex: CIM-1) */
  id: CimentoId;
  /** Nome comercial ou descrição técnica */
  descricao: string;
  /** Classificação normativa (Pozolânico, Alta Resist., etc.) */
  tipo: string;
  /** Massa específica real — t/m³ (tipicamente 3.00–3.15) */
  densidadeTm3: number;
  /** Preço de referência — R$/t (atualizar por obra/região) */
  precoReaisPorTonelada: number;
  /** Resistência à compressão característica aos 28 dias — MPa */
  resistenciaCaracteristica28dMPa: number;
  /** Finura Blaine — cm²/g (área superficial específica) */
  blaineCm2g: number;
  /** Emissão de CO₂ na produção — kg CO₂ / t de cimento */
  emissaoCO2kgPorTonelada: number;
  /** Fornecedor de referência */
  fornecedor: string;
}

export const CIMENTOS: Record<CimentoId, CimentoConstante> = {
  "CIM-1": {
    id: "CIM-1",
    descricao: "CP IV-32 RS",
    tipo: "Pozolânico",
    densidadeTm3: 3.02,
    precoReaisPorTonelada: 440,
    resistenciaCaracteristica28dMPa: 32,
    blaineCm2g: 4200,
    emissaoCO2kgPorTonelada: 450,
    fornecedor: "Votorantim",
  },
  "CIM-2": {
    id: "CIM-2",
    descricao: "CP V-ARI RS",
    tipo: "Alta Resist.",
    densidadeTm3: 3.10,
    precoReaisPorTonelada: 520,
    resistenciaCaracteristica28dMPa: 38,
    blaineCm2g: 4800,
    emissaoCO2kgPorTonelada: 900,
    fornecedor: "Holcim",
  },
  "CIM-3": {
    id: "CIM-3",
    descricao: "CP II-F-32",
    tipo: "Composto",
    densidadeTm3: 3.00,
    precoReaisPorTonelada: 390,
    resistenciaCaracteristica28dMPa: 32,
    blaineCm2g: 3800,
    emissaoCO2kgPorTonelada: 700,
    fornecedor: "Itambé",
  },
  "CIM-4": {
    id: "CIM-4",
    descricao: "CP III-40 RS",
    tipo: "Alto Forno",
    densidadeTm3: 2.98,
    precoReaisPorTonelada: 460,
    resistenciaCaracteristica28dMPa: 40,
    blaineCm2g: 4500,
    emissaoCO2kgPorTonelada: 380,
    fornecedor: "InterCimento",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 2 — AGREGADOS MIÚDOS (Areia Natural e Manufaturada)
// Fonte: aba DADOS, linhas M1 a M2
// ─────────────────────────────────────────────────────────────────────────────

export type AgregadoMiudoId = "M1" | "M2";

export interface AgregadoMiudoConstante {
  id: AgregadoMiudoId;
  descricao: string;
  /** Natural | Manufaturada */
  tipo: string;
  /** Massa específica real — t/m³ */
  densidadeTm3: number;
  /** Dimensão máxima característica — mm (NBR 7211) */
  dmaxMm: number;
  /** Módulo de finura — adimensional (NBR NM 248) */
  moduloDeFinura: number;
  /** Absorção de água — % em massa */
  absorcaoPercent: number;
  /** Umidade superficial de referência — % em massa */
  umidadePercent: number;
  /** Custo de referência — R$/t */
  custoReaisPorTonelada: number;
}

export const AGREGADOS_MIUDOS: Record<AgregadoMiudoId, AgregadoMiudoConstante> = {
  M1: {
    id: "M1",
    descricao: "Areia Natural Média",
    tipo: "Natural",
    densidadeTm3: 2.62,
    dmaxMm: 4.75,
    moduloDeFinura: 2.4,
    absorcaoPercent: 0.5,
    umidadePercent: 3.2,
    custoReaisPorTonelada: 85,
  },
  M2: {
    id: "M2",
    descricao: "Areia Manufaturada 0-4",
    tipo: "Manufaturada",
    densidadeTm3: 2.65,
    dmaxMm: 4.75,
    moduloDeFinura: 3.1,
    absorcaoPercent: 1.2,
    umidadePercent: 0.8,
    custoReaisPorTonelada: 110,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 3 — AGREGADOS GRAÚDOS (Brita / Seixo)
// Fonte: aba DADOS, linhas G1 a G3
// ─────────────────────────────────────────────────────────────────────────────

export type AgregadoGraudoId = "G1" | "G2" | "G3";

export interface AgregadoGraudoConstante {
  id: AgregadoGraudoId;
  descricao: string;
  /** Calcário | Granito | Basalto | etc. */
  tipo: string;
  /** Massa específica real — t/m³ */
  densidadeTm3: number;
  /** Dimensão máxima característica — mm (NBR 7211) */
  dmaxMm: number;
  /** Módulo de finura — adimensional */
  moduloDeFinura: number;
  /** Absorção de água — % em massa */
  absorcaoPercent: number;
  /** Umidade superficial de referência — % em massa */
  umidadePercent: number;
  /** Custo de referência — R$/t */
  custoReaisPorTonelada: number;
}

export const AGREGADOS_GRAUDOS: Record<AgregadoGraudoId, AgregadoGraudoConstante> = {
  G1: {
    id: "G1",
    descricao: "Brita 0 (pedrisco)",
    tipo: "Calcário",
    densidadeTm3: 2.68,
    dmaxMm: 12.5,
    moduloDeFinura: 6.2,
    absorcaoPercent: 1.1,
    umidadePercent: 0.2,
    custoReaisPorTonelada: 75,
  },
  G2: {
    id: "G2",
    descricao: "Brita 1",
    tipo: "Calcário",
    densidadeTm3: 2.68,
    dmaxMm: 25.0,
    moduloDeFinura: 6.8,
    absorcaoPercent: 0.9,
    umidadePercent: 0.1,
    custoReaisPorTonelada: 72,
  },
  G3: {
    id: "G3",
    descricao: "Brita 2",
    tipo: "Granito",
    densidadeTm3: 2.70,
    dmaxMm: 37.5,
    moduloDeFinura: 7.1,
    absorcaoPercent: 0.7,
    umidadePercent: 0.1,
    custoReaisPorTonelada: 78,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 4 — ADITIVOS QUÍMICOS (SP, VMA, Incorporador de Ar)
// Fonte: aba DADOS, linhas AD-1 a AD-5
// ─────────────────────────────────────────────────────────────────────────────

export type AditivoId = "AD-1" | "AD-2" | "AD-3" | "AD-4" | "AD-5";

export interface AditivoConstante {
  id: AditivoId;
  produto: string;
  /** SP-PCE (policarboxilato) | SP-LS (lignossulfonato) | VMA | etc. */
  tipo: string;
  /** Massa específica da solução — g/cm³ (= kg/L) */
  densidadeGcm3: number;
  /** Preço — R$/kg */
  precoReaisPorKg: number;
  /**
   * Dosagem típica — fração da massa de cimento (adimensional)
   * Exemplo: 0.008 = 0,8% da massa de cimento
   */
  dosagemFracaoCimento: number;
  /**
   * Redução de água proporcionada — fração (adimensional)
   * Exemplo: 0.20 = reduz 20% da água de amassamento
   */
  reducaoAguaFracao: number;
  /** Emissão de CO₂ — kg CO₂ / t de aditivo */
  emissaoCO2kgPorTonelada: number;
  fabricante: string;
}

export const ADITIVOS: Record<AditivoId, AditivoConstante> = {
  "AD-1": {
    id: "AD-1",
    produto: "MasterGlenium 51",
    tipo: "SP-PCE",
    densidadeGcm3: 1.06,
    precoReaisPorKg: 9.50,
    dosagemFracaoCimento: 0.008,
    reducaoAguaFracao: 0.20,
    emissaoCO2kgPorTonelada: 300,
    fabricante: "BASF",
  },
  "AD-2": {
    id: "AD-2",
    produto: "Sika ViscoCrete 3535",
    tipo: "SP-PCE",
    densidadeGcm3: 1.07,
    precoReaisPorKg: 8.80,
    dosagemFracaoCimento: 0.007,
    reducaoAguaFracao: 0.18,
    emissaoCO2kgPorTonelada: 280,
    fabricante: "Sika",
  },
  "AD-3": {
    id: "AD-3",
    produto: "MC-Powerflow 3200",
    tipo: "SP-PCE",
    densidadeGcm3: 1.08,
    precoReaisPorKg: 10.20,
    dosagemFracaoCimento: 0.009,
    reducaoAguaFracao: 0.22,
    emissaoCO2kgPorTonelada: 320,
    fabricante: "MC Bauchemie",
  },
  "AD-4": {
    id: "AD-4",
    produto: "Fosroc SP430",
    tipo: "SP-PCE",
    densidadeGcm3: 1.06,
    precoReaisPorKg: 8.70,
    dosagemFracaoCimento: 0.008,
    reducaoAguaFracao: 0.19,
    emissaoCO2kgPorTonelada: 300,
    fabricante: "Fosroc",
  },
  "AD-5": {
    id: "AD-5",
    produto: "Redutor Lignossulfonato",
    tipo: "SP-LS",
    densidadeGcm3: 1.20,
    precoReaisPorKg: 3.50,
    dosagemFracaoCimento: 0.003,
    reducaoAguaFracao: 0.08,
    emissaoCO2kgPorTonelada: 150,
    fabricante: "Genérico",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 5 — ADIÇÕES MINERAIS / SCM
// (Supplementary Cementitious Materials)
// Fonte: aba DADOS, linhas SCM-1 a SCM-4
// ─────────────────────────────────────────────────────────────────────────────

export type ScmId = "SCM-1" | "SCM-2" | "SCM-3" | "SCM-4";

export interface ScmConstante {
  id: ScmId;
  material: string;
  /** Silica Fume | Fly Ash | Metacaulim | Escória */
  tipo: string;
  /** Massa específica real — t/m³ */
  densidadeTm3: number;
  /** Preço — R$/t */
  precoReaisPorTonelada: number;
  /**
   * Fator k de eficiência (NBR 12655 / EN 206)
   * Representa equivalência cimentícia em relação ao CP
   * Sílica Ativa: 2.5 | Fly Ash: 1.2 | Metacaulim: 1.8 | Escória: 1.0
   */
  fatorK: number;
  /** Emissão de CO₂ — kg CO₂ / t de SCM */
  emissaoCO2kgPorTonelada: number;
  /**
   * Área superficial BET — m²/g
   * Relevante para reatividade pozolânica e demanda de água
   */
  areaBetM2g: number;
  fornecedor: string;
}

export const SCM_ADICOES: Record<ScmId, ScmConstante> = {
  "SCM-1": {
    id: "SCM-1",
    material: "Sílica Ativa Densificada",
    tipo: "Silica Fume",
    densidadeTm3: 2.20,
    precoReaisPorTonelada: 2800,
    fatorK: 2.5,
    emissaoCO2kgPorTonelada: 80,
    areaBetM2g: 15,
    fornecedor: "Dow/Elkem",
  },
  "SCM-2": {
    id: "SCM-2",
    material: "Cinza Volante F",
    tipo: "Fly Ash",
    densidadeTm3: 2.30,
    precoReaisPorTonelada: 350,
    fatorK: 1.2,
    emissaoCO2kgPorTonelada: 30,
    areaBetM2g: 0.5,
    fornecedor: "Engie",
  },
  "SCM-3": {
    id: "SCM-3",
    material: "Metacaulim HRM",
    tipo: "Metacaulim",
    densidadeTm3: 2.50,
    precoReaisPorTonelada: 900,
    fatorK: 1.8,
    emissaoCO2kgPorTonelada: 60,
    areaBetM2g: 12,
    fornecedor: "Metacaulim Brasil",
  },
  "SCM-4": {
    id: "SCM-4",
    material: "Escória GGBS",
    tipo: "Escória",
    densidadeTm3: 2.90,
    precoReaisPorTonelada: 280,
    fatorK: 1.0,
    emissaoCO2kgPorTonelada: 25,
    areaBetM2g: 1.2,
    fornecedor: "Votorantim",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 5B — FIBRAS
// ─────────────────────────────────────────────────────────────────────────────

export interface FibraConstante {
  id: string;
  descricao: string;
  tipo: string;
  densidadeTm3: number;
  precoReaisPorKg: number;
  /** Dosagem típica — kg/m³ de concreto */
  dosagemTipicaKgM3: number;
  emissaoCO2kgPorTonelada: number;
}

export const FIBRAS: Record<string, FibraConstante> = {
  "FIB-1": {
    id: "FIB-1",
    descricao: "Fibra de Polipropileno Micro (12mm)",
    tipo: "Polipropileno",
    densidadeTm3: 0.91,
    precoReaisPorKg: 18.00,
    dosagemTipicaKgM3: 0.6,
    emissaoCO2kgPorTonelada: 3600,
  },
  "FIB-2": {
    id: "FIB-2",
    descricao: "Fibra de Aço Dramix (35mm)",
    tipo: "Aço",
    densidadeTm3: 7.85,
    precoReaisPorKg: 8.50,
    dosagemTipicaKgM3: 25,
    emissaoCO2kgPorTonelada: 1800,
  },
  "FIB-3": {
    id: "FIB-3",
    descricao: "Fibra de Vidro AR (12mm)",
    tipo: "Vidro",
    densidadeTm3: 2.68,
    precoReaisPorKg: 22.00,
    dosagemTipicaKgM3: 1.2,
    emissaoCO2kgPorTonelada: 2500,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 5C — COMPENSADORES DE RETRAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

export interface CompensadorConstante {
  id: string;
  descricao: string;
  densidadeTm3: number;
  precoReaisPorKg: number;
  /** Dosagem típica — % da massa de cimento */
  dosagemTipicaFracao: number;
  emissaoCO2kgPorTonelada: number;
}

export const COMPENSADORES: Record<string, CompensadorConstante> = {
  "COMP-1": {
    id: "COMP-1",
    descricao: "SRA (Shrinkage Reducing Admixture)",
    densidadeTm3: 0.95,
    precoReaisPorKg: 25.00,
    dosagemTipicaFracao: 0.015,
    emissaoCO2kgPorTonelada: 500,
  },
  "COMP-2": {
    id: "COMP-2",
    descricao: "Expansor à base de CaO-MgO",
    densidadeTm3: 3.10,
    precoReaisPorKg: 4.50,
    dosagemTipicaFracao: 0.08,
    emissaoCO2kgPorTonelada: 850,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 5D — CRISTALIZANTES
// ─────────────────────────────────────────────────────────────────────────────

export interface CristalizanteConstante {
  id: string;
  descricao: string;
  densidadeTm3: number;
  precoReaisPorKg: number;
  /** Dosagem típica — % da massa de cimento */
  dosagemTipicaFracao: number;
  emissaoCO2kgPorTonelada: number;
}

export const CRISTALIZANTES: Record<string, CristalizanteConstante> = {
  "CRIST-1": {
    id: "CRIST-1",
    descricao: "Penetron Admix",
    densidadeTm3: 1.30,
    precoReaisPorKg: 45.00,
    dosagemTipicaFracao: 0.008,
    emissaoCO2kgPorTonelada: 200,
  },
  "CRIST-2": {
    id: "CRIST-2",
    descricao: "Xypex Admix C-1000NF",
    densidadeTm3: 1.35,
    precoReaisPorKg: 42.00,
    dosagemTipicaFracao: 0.01,
    emissaoCO2kgPorTonelada: 180,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 5E — PIGMENTOS
// ─────────────────────────────────────────────────────────────────────────────

export interface PigmentoConstante {
  id: string;
  descricao: string;
  cor: string;
  densidadeTm3: number;
  precoReaisPorKg: number;
  /** Dosagem típica — % da massa de cimento */
  dosagemTipicaFracao: number;
  emissaoCO2kgPorTonelada: number;
}

export const PIGMENTOS: Record<string, PigmentoConstante> = {
  "PIG-1": {
    id: "PIG-1",
    descricao: "Óxido de Ferro Vermelho",
    cor: "Vermelho",
    densidadeTm3: 5.10,
    precoReaisPorKg: 6.00,
    dosagemTipicaFracao: 0.05,
    emissaoCO2kgPorTonelada: 600,
  },
  "PIG-2": {
    id: "PIG-2",
    descricao: "Óxido de Ferro Amarelo",
    cor: "Amarelo",
    densidadeTm3: 4.00,
    precoReaisPorKg: 7.50,
    dosagemTipicaFracao: 0.03,
    emissaoCO2kgPorTonelada: 550,
  },
  "PIG-3": {
    id: "PIG-3",
    descricao: "Óxido de Ferro Preto",
    cor: "Preto",
    densidadeTm3: 4.80,
    precoReaisPorKg: 8.00,
    dosagemTipicaFracao: 0.04,
    emissaoCO2kgPorTonelada: 580,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 5F — LOOKUP GENÉRICO POR ID (qualquer categoria)
// ─────────────────────────────────────────────────────────────────────────────

import type { CategoriaId } from "../types/materiais";

/** Dados mínimos de qualquer material do catálogo */
export interface MaterialCatalogEntry {
  id: string;
  categoria: CategoriaId;
  descricao: string;
  densidadeTm3: number;
  custoReaisPorTonelada: number;
  emissaoCO2kgPorTonelada: number;
  /** Para agregados */
  absorcaoPercent?: number;
  umidadePercent?: number;
  /** Para aditivos (preço por kg em vez de por tonelada) */
  precoReaisPorKg?: number;
  densidadeGcm3?: number;
}

/** Busca qualquer material do catálogo pelo ID */
export function getMaterialCatalog(id: string): MaterialCatalogEntry | null {
  // Cimentos
  if (id in CIMENTOS) {
    const c = CIMENTOS[id as CimentoId];
    return { id: c.id, categoria: "cimento", descricao: c.descricao, densidadeTm3: c.densidadeTm3, custoReaisPorTonelada: c.precoReaisPorTonelada, emissaoCO2kgPorTonelada: c.emissaoCO2kgPorTonelada };
  }
  // Areias
  if (id in AGREGADOS_MIUDOS) {
    const a = AGREGADOS_MIUDOS[id as AgregadoMiudoId];
    return { id: a.id, categoria: "areia", descricao: a.descricao, densidadeTm3: a.densidadeTm3, custoReaisPorTonelada: a.custoReaisPorTonelada, emissaoCO2kgPorTonelada: 0, absorcaoPercent: a.absorcaoPercent, umidadePercent: a.umidadePercent };
  }
  // Britas
  if (id in AGREGADOS_GRAUDOS) {
    const g = AGREGADOS_GRAUDOS[id as AgregadoGraudoId];
    return { id: g.id, categoria: "brita", descricao: g.descricao, densidadeTm3: g.densidadeTm3, custoReaisPorTonelada: g.custoReaisPorTonelada, emissaoCO2kgPorTonelada: 0, absorcaoPercent: g.absorcaoPercent, umidadePercent: g.umidadePercent };
  }
  // Aditivos
  if (id in ADITIVOS) {
    const ad = ADITIVOS[id as AditivoId];
    return { id: ad.id, categoria: "aditivoSp", descricao: ad.produto, densidadeTm3: ad.densidadeGcm3, custoReaisPorTonelada: ad.precoReaisPorKg * 1000, emissaoCO2kgPorTonelada: ad.emissaoCO2kgPorTonelada, precoReaisPorKg: ad.precoReaisPorKg, densidadeGcm3: ad.densidadeGcm3 };
  }
  // SCMs
  if (id in SCM_ADICOES) {
    const s = SCM_ADICOES[id as ScmId];
    return { id: s.id, categoria: "scm", descricao: s.material, densidadeTm3: s.densidadeTm3, custoReaisPorTonelada: s.precoReaisPorTonelada, emissaoCO2kgPorTonelada: s.emissaoCO2kgPorTonelada };
  }
  // Fibras
  if (id in FIBRAS) {
    const f = FIBRAS[id];
    return { id: f.id, categoria: "fibra", descricao: f.descricao, densidadeTm3: f.densidadeTm3, custoReaisPorTonelada: f.precoReaisPorKg * 1000, emissaoCO2kgPorTonelada: f.emissaoCO2kgPorTonelada, precoReaisPorKg: f.precoReaisPorKg };
  }
  // Compensadores
  if (id in COMPENSADORES) {
    const co = COMPENSADORES[id];
    return { id: co.id, categoria: "compensador", descricao: co.descricao, densidadeTm3: co.densidadeTm3, custoReaisPorTonelada: co.precoReaisPorKg * 1000, emissaoCO2kgPorTonelada: co.emissaoCO2kgPorTonelada, precoReaisPorKg: co.precoReaisPorKg };
  }
  // Cristalizantes
  if (id in CRISTALIZANTES) {
    const cr = CRISTALIZANTES[id];
    return { id: cr.id, categoria: "cristalizante", descricao: cr.descricao, densidadeTm3: cr.densidadeTm3, custoReaisPorTonelada: cr.precoReaisPorKg * 1000, emissaoCO2kgPorTonelada: cr.emissaoCO2kgPorTonelada, precoReaisPorKg: cr.precoReaisPorKg };
  }
  // Pigmentos
  if (id in PIGMENTOS) {
    const p = PIGMENTOS[id];
    return { id: p.id, categoria: "pigmento", descricao: p.descricao, densidadeTm3: p.densidadeTm3, custoReaisPorTonelada: p.precoReaisPorKg * 1000, emissaoCO2kgPorTonelada: p.emissaoCO2kgPorTonelada, precoReaisPorKg: p.precoReaisPorKg };
  }
  return null;
}

/** Lista todos os materiais de uma categoria */
export function listarMateriaisPorCategoria(cat: CategoriaId): MaterialCatalogEntry[] {
  switch (cat) {
    case "cimento": return Object.values(CIMENTOS).map(c => getMaterialCatalog(c.id)!);
    case "areia": return Object.values(AGREGADOS_MIUDOS).map(a => getMaterialCatalog(a.id)!);
    case "brita": return Object.values(AGREGADOS_GRAUDOS).map(g => getMaterialCatalog(g.id)!);
    case "aditivoSp": return Object.values(ADITIVOS).map(a => getMaterialCatalog(a.id)!);
    case "scm": return Object.values(SCM_ADICOES).map(s => getMaterialCatalog(s.id)!);
    case "fibra": return Object.values(FIBRAS).map(f => getMaterialCatalog(f.id)!);
    case "compensador": return Object.values(COMPENSADORES).map(c => getMaterialCatalog(c.id)!);
    case "cristalizante": return Object.values(CRISTALIZANTES).map(c => getMaterialCatalog(c.id)!);
    case "pigmento": return Object.values(PIGMENTOS).map(p => getMaterialCatalog(p.id)!);
    default: return [];
  }
}

export const FIBRA_IDS = Object.keys(FIBRAS);
export const COMPENSADOR_IDS = Object.keys(COMPENSADORES);
export const CRISTALIZANTE_IDS = Object.keys(CRISTALIZANTES);
export const PIGMENTO_IDS = Object.keys(PIGMENTOS);

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 6 — SÉRIES DE PENEIRAS E GRANULOMETRIA A LASER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Série granulométrica estendida para análise a laser (UHPC / materiais cimentícios).
 *
 * Cobertura: 50 mm → 0,0001 mm (0,1 µm) — 5,7 décadas logarítmicas.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Faixa         │ Método          │ Material típico                  │
 * ├───────────────┼─────────────────┼──────────────────────────────────┤
 * │ 50 → 0.075 mm │ Peneiramento    │ Agregados: areias, britas        │
 * │ 0.075 → 0.05  │ Transição       │ Finos: pó de pedra, microfíler   │
 * │ 0.020 → 0.005 │ Laser / Sedim.  │ Cimento (d₅₀ ≈ 10–15 µm)        │
 * │ 0.005 → 0.002 │ Laser           │ Metacaulim (d₅₀ ≈ 2–4 µm)       │
 * │ 0.001 → 0.0001│ Laser / BET     │ Microsílica (d₅₀ ≈ 0.1–0.3 µm)  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Normas de referência para granulometria a laser:
 *   ISO 13320:2020 — Particle size analysis — Laser diffraction methods
 *   ASTM E2651      — Guide for powder particle size analysis
 *   EN 725-5:1994   — Fine ceramics — particle size analysis
 */
export const SERIE_LASER_MM = [
  // ── Série convencional (peneiramento, NBR NM 248 / ASTM C136) ──────────
  50, 37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18,
  0.6, 0.3, 0.15, 0.075,
  // ── Faixa de transição (peneira fina / sedimentação) ───────────────────
  0.050,   // 50 µm  — limite superior da análise a laser
  // ── Faixa cimento (granulometria a laser, ISO 13320) ──────────────────
  0.020,   // 20 µm
  0.010,   // 10 µm  — d₅₀ típico do cimento Portland CP-V
  0.005,   //  5 µm
  // ── Faixa metacaulim / cinza volante ──────────────────────────────────
  0.002,   //  2 µm
  // ── Faixa microsílica (sílica ativa) ─────────────────────────────────
  0.001,   //  1 µm
  0.0005,  //  0.5 µm  — d₉₀ típico da microsílica densificada
  0.0002,  //  0.2 µm
  0.0001,  //  0.1 µm  — ponto mínimo (D_min CPM / Andreasen UHPC)
] as const;

/** Tipo: qualquer abertura válida na série laser */
export type AberturaLaserMM = typeof SERIE_LASER_MM[number];

/** Número total de pontos na série laser (22) */
export const N_PONTOS_LASER = SERIE_LASER_MM.length as 22;

/**
 * Subconjunto convencional da série laser (peneiramento NBR NM 248).
 * Compatível com o array SERIE_COMPLETA_MM de granulometria.ts.
 */
export const SERIE_CONVENCIONAL_MM = [
  50, 37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18,
  0.6, 0.3, 0.15, 0.075,
] as const satisfies readonly number[];

/**
 * Faixas exclusivamente ultra-finas (análise a laser apenas).
 * Peneiras onde massaRetidaG não se aplica — usar % passante diretamente.
 */
export const SERIE_ULTRAFINA_MM = [
  0.050, 0.020, 0.010, 0.005, 0.002, 0.001, 0.0005, 0.0002, 0.0001,
] as const;

/**
 * Diâmetros representativos de cada INTERVALO da série laser.
 * d_rep = √(D_sup × D_inf)  — média geométrica do intervalo.
 * Usado no CPM (De Larrard) para indexar as classes de partículas.
 *
 * Cada entrada corresponde ao intervalo (SERIE_LASER_MM[i+1], SERIE_LASER_MM[i]).
 * Array com (N_PONTOS_LASER − 1) = 21 entradas.
 */
export const DIAMETROS_REPRESENTATIVOS_CPM: ReadonlyArray<{
  /** Abertura superior do intervalo — mm */
  dSupMm: number;
  /** Abertura inferior do intervalo — mm */
  dInfMm: number;
  /** Diâmetro representativo = √(dSup × dInf) — mm */
  dRepMm: number;
  /** Índice da classe na série laser (0 = mais grossa) */
  indice: number;
}> = SERIE_LASER_MM.slice(0, -1).map((dSup, i) => ({
  dSupMm: dSup,
  dInfMm: SERIE_LASER_MM[i + 1],
  dRepMm: Math.sqrt(dSup * SERIE_LASER_MM[i + 1]),
  indice: i,
}));

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 6B — PARÂMETROS CPM: EMPACOTAMENTO VIRTUAL (β*) POR MATERIAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Empacotamento virtual β* de cada material (monofracional, sem interação).
 *
 * Definição (De Larrard 1999):
 *   β*_i = máximo empacotamento atingível da classe i isolada,
 *   considerando a forma das partículas (esfericidade) e textura superficial.
 *
 * Valores de referência (literatura + BETONLAB Pro):
 *
 * | Material                 | β*         | Fonte                        |
 * |--------------------------|------------|------------------------------|
 * | Microsílica (amorfa)     | 0.53–0.60  | De Larrard (1999), p. 42     |
 * | Metacaulim               | 0.50–0.56  | Sedran & De Larrard (2000)   |
 * | Cimento Portland         | 0.52–0.58  | De Larrard (1999), Tabela 3  |
 * | Fíler de calcário        | 0.55–0.62  | Müller et al. (2015)         |
 * | Areia natural            | 0.60–0.68  | De Larrard (1999), p. 45     |
 * | Areia de britagem        | 0.55–0.65  | De Larrard (1999), p. 45     |
 * | Brita cúbica (calcário)  | 0.60–0.66  | De Larrard (1999), p. 50     |
 * | Brita alongada (granito) | 0.55–0.62  | De Larrard (1999), p. 50     |
 *
 * NOTA: β* deve ser medido em laboratório (ensaio AASHTO T19 compactado).
 * Os valores abaixo são DEFAULTS para uso quando medição não está disponível.
 */
export const BETA_STAR_CPM_DEFAULTS = {
  /** Microsílica amorfa (sílica ativa) — formato esférico vítreo */
  microsilica:       0.565,
  /** Metacaulim HRM (calcinação flash, plaquetas lamelares) */
  metacaulim:        0.530,
  /** Cimento Portland (anidro, partículas angulosas) */
  cimento:           0.552,
  /** Fíler de calcário moído (partículas sub-angulosas) */
  filerCalcario:     0.578,
  /** Cinza volante classe F (esferas ocas) */
  cinzaVolante:      0.590,
  /** Escória GGBS moída (partículas vítreas angulosas) */
  escoriaGGBS:       0.555,
  /** Areia natural (grãos sub-arredondados) */
  areianatural:      0.640,
  /** Areia de britagem (grãos angulosos) */
  areiaBritagem:     0.610,
  /** Brita calcário cúbica (grãos sub-cúbicos) */
  britaCalcario:     0.630,
  /** Brita granito (grãos angulosos e irregulares) */
  britaGranito:      0.600,
} as const;

/** Limiar mínimo de razão de diâmetro para interação CPM.
 *
 * Para d_j/d_i < CPM_LIMIAR_INTERACAO, a classe j é tratada como
 * "enchimento de vazios" sem gerar afrouxamento ou efeito de parede
 * na classe i. Isso evita singularidades numéricas ao cruzar décadas
 * de escala (ex: microsílica 0.2µm vs. areia 400µm → razão = 0.0005).
 *
 * Valor adotado: 0.01 (1%)
 * Referência: Sedran & De Larrard, "RENE-LCPC" software documentation (2002).
 */
export const CPM_LIMIAR_INTERACAO = 0.01 as const;

/** Coeficiente de afrouxamento — expoente (De Larrard Eq. 3.5): (1 − d_i/d_j)^1.02 */
export const CPM_EXP_AFROUXAMENTO = 1.02 as const;

/** Coeficiente de parede — expoente (De Larrard Eq. 3.6): (1 − d_j/d_i)^1.50 */
export const CPM_EXP_PAREDE = 1.50 as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 6C — PARÂMETROS ANDREASEN PARA DIFERENTES CLASSES DE CONCRETO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parâmetros padrão de Andreasen Modificado (Dinger-Funk 1994) por classe.
 *
 * P(D) = (D^q − D_min^q) / (D_max^q − D_min^q) × 100              … (And)
 *
 * | Classe       | q     | D_min (mm) | Referência                      |
 * |--------------|-------|------------|----------------------------------|
 * | Convencional | 0.45  | 0.075      | Andreasen & Andersen (1930)     |
 * | CAD          | 0.37  | 0.010      | Müller et al. (2015)            |
 * | UHPC         | 0.25  | 0.0001     | AFGC (2013), fib MC2010 UHPFRC  |
 * | Argamassa    | 0.40  | 0.010      | De Larrard (1999), p. 78        |
 */
export const ANDREASEN_PARAMS_POR_CLASSE = {
  CCV:  { q: 0.45, dMinMm: 0.075,  descricao: "Concreto Convencional Vibrado" },
  CAD:  { q: 0.37, dMinMm: 0.010,  descricao: "Concreto de Alto Desempenho" },
  UHPC: { q: 0.25, dMinMm: 0.0001, descricao: "Ultra High Performance Concrete (AFGC 2013)" },
  ARG:  { q: 0.40, dMinMm: 0.010,  descricao: "Argamassa / GRC" },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 7 — CONSTANTES FÍSICAS DO SISTEMA
// ─────────────────────────────────────────────────────────────────────────────

/** Massa específica da água — t/m³ (referência: 20°C, 1 atm) */
export const DENSIDADE_AGUA_TM3 = 1.000 as const;

/** Volume de 1 m³ em litros (para verificações de traço absoluto) */
export const VOLUME_1M3_LITROS = 1000 as const;

/** Teor de ar aprisionado padrão para concreto vibrado — fração (adimensional) */
export const AR_APRISIONADO_PADRAO_FRACAO = 0.02 as const;

/** Fator t de Student para 1,65σ (nível de confiança 95% — NBR 12655) */
export const FATOR_T_STUDENT_95 = 1.65 as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 7 — LOOKUP HELPERS
// Funções utilitárias para acessar constantes por ID
// ─────────────────────────────────────────────────────────────────────────────

/** Retorna dados do cimento pelo ID ou lança erro tipado */
export function getCimento(id: CimentoId): CimentoConstante {
  return CIMENTOS[id];
}

/** Retorna dados do agregado miúdo pelo ID */
export function getAgregadoMiudo(id: AgregadoMiudoId): AgregadoMiudoConstante {
  return AGREGADOS_MIUDOS[id];
}

/** Retorna dados do agregado graúdo pelo ID */
export function getAgregadoGraudo(id: AgregadoGraudoId): AgregadoGraudoConstante {
  return AGREGADOS_GRAUDOS[id];
}

/** Retorna dados do aditivo pelo ID */
export function getAditivo(id: AditivoId): AditivoConstante {
  return ADITIVOS[id];
}

/** Retorna dados da adição mineral (SCM) pelo ID */
export function getScm(id: ScmId): ScmConstante {
  return SCM_ADICOES[id];
}

/** Lista todos os IDs de cimentos disponíveis */
export const CIMENTO_IDS = Object.keys(CIMENTOS) as CimentoId[];
export const AGREGADO_MIUDO_IDS = Object.keys(AGREGADOS_MIUDOS) as AgregadoMiudoId[];
export const AGREGADO_GRAUDO_IDS = Object.keys(AGREGADOS_GRAUDOS) as AgregadoGraudoId[];
export const ADITIVO_IDS = Object.keys(ADITIVOS) as AditivoId[];
export const SCM_IDS = Object.keys(SCM_ADICOES) as ScmId[];

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 8 — PERFIS GRANULOMÉTRICOS PADRÃO (LASER) PARA MATERIAIS CIMENTÍCIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perfis de % passante na série laser para materiais cimentícios padrão.
 * Usados como FALLBACK quando o usuário não informa a curva laser do material.
 *
 * Fonte: literatura técnica e boletins técnicos dos fabricantes.
 * Todos os valores referentes à faixa 0–0.075mm são obtidos por
 * difração a laser (ISO 13320:2020).
 */
export const PERFIS_LASER_CIMENTICIO = {
  /**
   * CP V-ARI RS (Blaine ≈ 4800 cm²/g, d₅₀ ≈ 10–12 µm)
   * Referência: boletim Holcim Brasil + Densus Engine
   */
  CP_V_ARI: {
    id: "CP_V_ARI",
    descricao: "Cimento CP V-ARI RS",
    passantes: {
      "50": 100, "37.5": 100, "25": 100, "19": 100, "12.5": 100,
      "9.5": 100, "4.75": 100, "2.36": 100, "1.18": 100,
      "0.6": 100, "0.3": 100, "0.15": 100, "0.075": 100,
      "0.05": 100, "0.02": 96, "0.01": 80, "0.005": 58,
      "0.002": 33, "0.001": 16, "0.0005": 6, "0.0002": 1, "0.0001": 0,
    } as Record<string, number>,
  },

  /**
   * Microsílica Densificada — Elkem Microsilica 940D (d₅₀ ≈ 0.15 µm)
   * Referência: Elkem Materials (2023), TDS SF940D
   */
  MICROSILICA: {
    id: "MICROSILICA",
    descricao: "Microsílica Densificada (d₅₀ ≈ 0.15 µm)",
    passantes: {
      "50": 100, "37.5": 100, "25": 100, "19": 100, "12.5": 100,
      "9.5": 100, "4.75": 100, "2.36": 100, "1.18": 100,
      "0.6": 100, "0.3": 100, "0.15": 100, "0.075": 100,
      "0.05": 100, "0.02": 100, "0.01": 100, "0.005": 99,
      "0.002": 95, "0.001": 74, "0.0005": 38, "0.0002": 9, "0.0001": 0,
    } as Record<string, number>,
  },

  /**
   * Metacaulim HRM — Metacaulim do Brasil (d₅₀ ≈ 1.5 µm)
   * Referência: Metacaulim Brasil (2023), boletim técnico HRM
   */
  METACAULIM: {
    id: "METACAULIM",
    descricao: "Metacaulim HRM (d₅₀ ≈ 1.5 µm)",
    passantes: {
      "50": 100, "37.5": 100, "25": 100, "19": 100, "12.5": 100,
      "9.5": 100, "4.75": 100, "2.36": 100, "1.18": 100,
      "0.6": 100, "0.3": 100, "0.15": 100, "0.075": 100,
      "0.05": 100, "0.02": 99, "0.01": 95, "0.005": 82,
      "0.002": 54, "0.001": 28, "0.0005": 10, "0.0002": 2, "0.0001": 0,
    } as Record<string, number>,
  },

  /**
   * Fíler de calcário moído (d₅₀ ≈ 8 µm, Blaine ≈ 3500 cm²/g)
   * Referência: Votorantim — Votolit C (boletim técnico 2023)
   */
  FILER_CALCARIO: {
    id: "FILER_CALCARIO",
    descricao: "Fíler de Calcário Moído (d₅₀ ≈ 8 µm)",
    passantes: {
      "50": 100, "37.5": 100, "25": 100, "19": 100, "12.5": 100,
      "9.5": 100, "4.75": 100, "2.36": 100, "1.18": 100,
      "0.6": 100, "0.3": 100, "0.15": 100, "0.075": 100,
      "0.05": 100, "0.02": 97, "0.01": 85, "0.005": 65,
      "0.002": 40, "0.001": 20, "0.0005": 8, "0.0002": 2, "0.0001": 0,
    } as Record<string, number>,
  },

  /**
   * Cinza Volante Classe F (ASTM C618 Classe F, d₅₀ ≈ 12–20 µm)
   * Referência: ANEEL/Engie — boletim de caracterização (2022)
   */
  CINZA_VOLANTE_F: {
    id: "CINZA_VOLANTE_F",
    descricao: "Cinza Volante Classe F (d₅₀ ≈ 15 µm)",
    passantes: {
      "50": 100, "37.5": 100, "25": 100, "19": 100, "12.5": 100,
      "9.5": 100, "4.75": 100, "2.36": 100, "1.18": 100,
      "0.6": 100, "0.3": 100, "0.15": 100, "0.075": 100,
      "0.05": 100, "0.02": 90, "0.01": 70, "0.005": 45,
      "0.002": 22, "0.001": 10, "0.0005": 4, "0.0002": 1, "0.0001": 0,
    } as Record<string, number>,
  },
} as const;
