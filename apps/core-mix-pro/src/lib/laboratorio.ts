/**
 * @file lib/laboratorio.ts
 * @description CORE MIX PRO — LIMS: Calculadora de Traços Piloto e Motor de
 *              Ensaios de Estado Fresco e Endurecido
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VISÃO DO MÓDULO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este módulo implementa a espinha dorsal do LIMS (Laboratory Information
 * Management System) de P&D de tecnologia de concreto. Ele cobre:
 *
 *   1. Dimensionamento de corpos de prova (geometria → volume → pesagem)
 *   2. Escalonamento do traço de 1 m³ para a betoneira piloto (litros reais)
 *   3. Tipagem completa de ensaios de estado fresco (CCV, CAA, UHPC, GRC)
 *   4. Tipagem completa de ensaios de estado endurecido (compressão, tração,
 *      módulo de elasticidade, resistência residual para concreto fibrado)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DIMENSIONAMENTO DE CORPOS DE PROVA
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Volume de um cilindro (NBR 5738: ∅10×20 cm e ∅15×30 cm):
 *   V_cil = π/4 × d² × h                                                  … (Vcil)
 *
 * Volume de um prisma retangular (NBR 12142: 15×15×50 cm):
 *   V_pri = l × w × h                                                      … (Vpri)
 *
 * Volume de um cubo (EN 12390: 15×15×15 cm):
 *   V_cub = a³                                                              … (Vcub)
 *
 * Volume total necessário (incluindo fator de perda):
 *   V_total = Σ(n_i × V_i) × (1 + f_perda)                                … (Vtot)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ESCALONAMENTO DO TRAÇO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Para converter o traço de referência (1 m³ = 1000 L) para a betoneira:
 *
 *   Fator de escala:
 *   f_esc = V_betoneira / 1000                                             … (fesc)
 *
 *   Massa de cada material na betoneira:
 *   m_i_bet = m_i_1m3 × f_esc                                             … (mbet)
 *
 *   Precisão de pesagem:
 *   - Cimento, agregados: arredondamento para 1 g
 *   - Água: arredondamento para 0.1 g (pipeta)
 *   - Aditivos líquidos: arredondamento para 0.01 g (seringa ou micropipeta)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ESTADO FRESCO — ENSAIOS NORMALIZADOS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * CCV (Concreto Convencional Vibrado):
 *   Slump (mm)         → NBR NM 67 / ASTM C143
 *   Massa específica   → NBR 9833 / ASTM C138   (kg/dm³ = kg/L)
 *   Teor de ar         → NBR 9833 / ASTM C231   (%)
 *
 * CAA (Concreto Auto-Adensável) — NBR 15823:
 *   Espalhamento (mm)  → Método do abatimento-espalhamento (slump-flow)
 *   T500 (s)          → Tempo para atingir Ø 500 mm — viscosidade
 *   Funil-V (s)       → NBR 15823-4 — viscosidade plástica aparente
 *   Caixa-L (H2/H1)   → NBR 15823-5 — habilidade passante (≥ 0.80 OK)
 *   Caixa-U (ΔH mm)   → Diferença de nível na caixa U
 *   Coluna de segregação → NBR 15823-6 — índice de segregação (%)
 *
 * CAD (Concreto de Alto Desempenho):
 *   Idem CAA + Viscosidade Marsh (s)
 *
 * UHPC / GRC (Ultra High Performance / Glass Reinforced):
 *   Mini-cone (mm)     → Espalhamento no mini-cone de Härätä
 *   Mini-cone T200 (s) → Tempo para Ø 200 mm
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ESTADO ENDURECIDO — ENSAIOS NORMALIZADOS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Resistência à compressão axial (fck, fcm):
 *   f_c = F / A                                                            … (fc)
 *   NBR 5739 / EN 12390-3
 *
 * Resistência à tração por compressão diametral (fct,sp):
 *   f_ct,sp = 2F / (π × d × h)                                            … (fctsp)
 *   NBR 7222 / EN 12390-6
 *
 * Módulo de Elasticidade (E_cs):
 *   E_cs = (σ_b − 0.5 × σ_a) / (ε_b − 0.00005)                          … (Ecs)
 *   NBR 8522 — Método B (dois pontos na curva σ-ε)
 *   σ_a = 0.5 MPa, σ_b = 0.30 × f_c
 *
 * Resistência à Flexão (fct,fl):
 *   f_ct,fl = F × L / (b × h²)     [prisma simples]                       … (fctfl)
 *   NBR 12142 / EN 12390-5
 *
 * Resistência Residual à Tração (fR1, fR2, fR3, fR4) — concreto fibrado:
 *   fR,i = 3 × F_i × L / (2 × b × h²)   [viga entalhada EN 14651]       … (fR)
 *   CMOD_i: 0.5, 1.5, 2.5, 3.5 mm — Crack Mouth Opening Displacement
 *   NBR 16935:2021 / EN 14651
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1] NBR 5738:2015 — Moldagem e cura de corpos de prova
 *   [2] NBR 5739:2018 — Ensaio de compressão de corpos de prova
 *   [3] NBR 7222:2011 — Resistência à tração por compressão diametral
 *   [4] NBR 8522:2021 — Módulo de elasticidade estático
 *   [5] NBR 12142:2010 — Resistência à tração na flexão
 *   [6] NBR 15823:2017 — Concreto auto-adensável (Partes 1–6)
 *   [7] NBR 16935:2021 — Concreto reforçado com fibras — resistência residual
 *   [8] EN 14651:2005  — Test method for metallic fibered concrete
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ResultadoDosagem } from "./dosagem";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES GEOMÉTRICAS — NBR 5738 / EN 12390
// ─────────────────────────────────────────────────────────────────────────────

const PI = Math.PI;

/**
 * Catálogo completo de geometrias normalizadas de corpos de prova.
 * Dimensões em cm. Normas de referência por grupo:
 *
 *   CILÍNDRICOS : NBR 5738:2015, ASTM C192, EN 12390-1
 *   PRISMÁTICOS : NBR 12142:2010, EN 14651:2005, EN 12390-5, ASTM C1609
 *   CÚBICOS     : EN 12390-3, NBR 7215 (argamassa)
 *   PLACAS GRC  : EN 1170-5, ASTM C947 (flexão 3/4 pontos)
 *   RETRAÇÃO    : ASTM C157 (prisma retração livre)
 */
export const GEOMETRIAS_CP = {
  // ── CILÍNDRICOS ──────────────────────────────────────────────────────────

  /** Cilindro Ø10×20 cm — NBR 5738 (padrão nacional, DMC ≤ 25 mm) */
  CIL_10_20: { tipo: "cilindro" as const, diametro: 10, altura: 20,
    descricao: "Cilindro Ø10×20 cm (NBR 5738)" },

  /** Cilindro Ø15×30 cm — NBR 5738 (DMC até 38 mm, CAA, CAD) */
  CIL_15_30: { tipo: "cilindro" as const, diametro: 15, altura: 30,
    descricao: "Cilindro Ø15×30 cm (NBR 5738)" },

  /** Cilindro Ø5×10 cm — microconcreto, argamassa, UHPC (DMC ≤ 5 mm) */
  CIL_5_10: { tipo: "cilindro" as const, diametro: 5, altura: 10,
    descricao: "Cilindro Ø5×10 cm — microconcreto / UHPC" },

  /** Cilindro Ø7.5×15 cm — ASTM C39 (padrão norte-americano 3×6 in) */
  CIL_7P5_15: { tipo: "cilindro" as const, diametro: 7.5, altura: 15,
    descricao: "Cilindro Ø7.5×15 cm (ASTM C39 — 3×6 in)" },

  /** Mini-cone Hærät — UHPC/GRC espalhamento (Ø10×5 cm) */
  MINI_CONE: { tipo: "cilindro" as const, diametro: 10, altura: 5,
    descricao: "Mini-cone UHPC/GRC Ø10×5 cm" },

  // ── PRISMÁTICOS ──────────────────────────────────────────────────────────

  /** Prisma 4×4×16 cm — NBR 7215 / EN 196-1 (argamassa, fck pasta) */
  PRI_4_4_16: { tipo: "prisma" as const, comprimento: 16, largura: 4, altura: 4,
    descricao: "Prisma 4×4×16 cm (NBR 7215 / EN 196-1)" },

  /** Prisma 10×10×40 cm — EN 12390-5 / ASTM C78 (flexão 3 pontos, vão 30 cm) */
  PRI_10_10_40: { tipo: "prisma" as const, comprimento: 40, largura: 10, altura: 10,
    descricao: "Prisma 10×10×40 cm (EN 12390-5 / ASTM C78)" },

  /** Prisma 15×15×50 cm — NBR 12142 / EN 14651 (flexão e fibras) */
  PRI_15_15_50: { tipo: "prisma" as const, comprimento: 50, largura: 15, altura: 15,
    descricao: "Prisma 15×15×50 cm (NBR 12142 / ASTM C1609)" },

  /** Prisma entalhado 15×15×55 cm — EN 14651 / NBR 16935 (fR1…fR4, CMOD) */
  PRI_ENTALHE_15_15_55: { tipo: "prisma_entalhado" as const, comprimento: 55,
    largura: 15, altura: 15, entalheAlturaCm: 2.5,
    descricao: "Prisma entalhado 15×15×55 cm (EN 14651 — tração residual)" },

  /** Prisma retração 25×7.5×7.5 cm — ASTM C157 (retração livre) */
  PRI_RETRACAO_25: { tipo: "prisma" as const, comprimento: 25, largura: 7.5, altura: 7.5,
    descricao: "Prisma retração 25×7.5×7.5 cm (ASTM C157)" },

  /** Prisma retração 40×10×10 cm — BS 1881-112 (retração livre, concreto) */
  PRI_RETRACAO_40: { tipo: "prisma" as const, comprimento: 40, largura: 10, altura: 10,
    descricao: "Prisma retração 40×10×10 cm (BS 1881-112)" },

  // ── CÚBICOS ──────────────────────────────────────────────────────────────

  /** Cubo 4×4×4 cm — NBR 7215 (argamassa / pasta) */
  CUBO_4: { tipo: "cubo" as const, aresta: 4,
    descricao: "Cubo 4×4×4 cm (NBR 7215 — argamassa)" },

  /** Cubo 10×10×10 cm — EN 12390-3 (DMC ≤ 16 mm) */
  CUBO_10: { tipo: "cubo" as const, aresta: 10,
    descricao: "Cubo 10×10×10 cm (EN 12390-3)" },

  /** Cubo 15×15×15 cm — EN 12390-3 (padrão europeu, DMC ≤ 25 mm) */
  CUBO_15: { tipo: "cubo" as const, aresta: 15,
    descricao: "Cubo 15×15×15 cm (EN 12390-3)" },

  // ── PLACAS — GRC / PAINÉIS ───────────────────────────────────────────────

  /**
   * Placa GRC 60×25×1 cm — EN 1170-5 (flexão 4 pontos, painel GRC)
   * Vão = 40 cm, braços = 10 cm; ensaio de flexão em 4 pontos.
   */
  PLACA_GRC_4PT_60_25: { tipo: "placa" as const, comprimento: 60, largura: 25, espessura: 1.0,
    vaoMm: 400, nPontosFlexao: 4 as 4,
    descricao: "Placa GRC 60×25×1 cm — flexão 4 pontos (EN 1170-5)" },

  /**
   * Placa GRC 45×15×1 cm — ASTM C947 (flexão 3 pontos, painel GRC)
   * Vão = 40.6 cm (16 in); resistência à flexão de módulo de ruptura.
   */
  PLACA_GRC_3PT_45_15: { tipo: "placa" as const, comprimento: 45, largura: 15, espessura: 1.0,
    vaoMm: 406, nPontosFlexao: 3 as 3,
    descricao: "Placa GRC 45×15×1 cm — flexão 3 pontos (ASTM C947)" },
} as const;

export type GeometriaCpId = keyof typeof GEOMETRIAS_CP;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — CORPOS DE PROVA
// ─────────────────────────────────────────────────────────────────────────────

/** Idade de rompimento normalizada */
export type IdadeRompimento = "12h" | "24h" | "3d" | "7d" | "14d" | "28d" | "56d" | "91d";

/** Lote de corpos de prova para uma determinada idade */
export interface LoteCp {
  geometria:        GeometriaCpId;
  quantidade:       number;
  idadesRompimento: IdadeRompimento[];
}

/** Dimensionamento calculado de um lote de CPs */
export interface DimensionamentoCp {
  geometria:           GeometriaCpId;
  descricaoGeometria:  string;
  quantidade:          number;
  idadesRompimento:    IdadeRompimento[];
  /** Volume de um único CP — dm³ (= litros) */
  volumeUnitarioDm3:   number;
  /** Volume total do lote (sem perda) — L */
  volumeLoteSemPerdaL: number;
}

/** Resultado do dimensionamento completo de todos os lotes */
export interface ResultadoDimensionamentoCps {
  lotes:                   DimensionamentoCp[];
  /** Volume total sem fator de perda — L */
  volumeTotalSemPerdaL:    number;
  /** Fator de perda aplicado (ex: 0.20 = 20%) */
  fatorPerda:              number;
  /** Volume total com fator de perda — L */
  volumeTotalComPerdaL:    number;
  /** Volume arredondado para a betoneira (múltiplo de 5 L) — L */
  volumeBetoneira:         number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — PESAGEM DA BETONEIRA PILOTO
// ─────────────────────────────────────────────────────────────────────────────

/** Massa de um material na betoneira com precisão de pesagem adequada */
export interface PesagemMaterial {
  descricao:          string;
  massaKg1m3:         number;
  /** Massa escalonada para a betoneira — kg */
  massaKgBetoneira:   number;
  /** Massa escalonada — g (para aditivos e adições em pequenas quantidades) */
  massaGrBetoneira:   number;
  /** Precisão de pesagem recomendada */
  precisaoPesagem:    "1g" | "0.1g" | "0.01g";
}

/** Planilha de pesagem completa para a betoneira piloto (genérica N materiais) */
export interface PlanilhaPesagem {
  /** Volume da betoneira — L */
  volumeBetoneira:       number;
  /** Fator de escala = V_bet / 1000 */
  fatorEscala:           number;
  /** Massa total na betoneira — kg */
  massaTotalBetoneira:   number;
  /** Lista plana de pesagens — todas as linhas da composição */
  materiais:             PesagemMaterial[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — ESTADO FRESCO
// ─────────────────────────────────────────────────────────────────────────────

/** Classificação do concreto para determinação do conjunto de ensaios */
export type ClassificacaoConcreto =
  | "CCV"   // Concreto Convencional Vibrado
  | "CAA"   // Concreto Auto-Adensável (NBR 15823)
  | "CAD"   // Concreto de Alto Desempenho
  | "UHPC"  // Ultra High Performance Concrete
  | "GRC"   // Glass/Fibre Reinforced Concrete
  | "CPisos" // Concreto para pisos
  | "CGR";  // Concreto com Graúdo Reciclado

/** Resultado do Slump (abatimento do tronco de cone) — NBR NM 67 */
export interface ResultadoSlump {
  /** Abatimento medido — mm */
  abatimentoMm:        number;
  /** Classificação S (S1–S5) conforme NBR 6118 */
  classeConsistencia:  "S1" | "S2" | "S3" | "S4" | "S5";
  /** Aprovação para o slump especificado */
  aprovado:            boolean;
  slumpEspecificadoMm: number;
  toleranciaMm:        number;
}

/** Ensaios de estado fresco — Concreto Convencional Vibrado (CCV) — NBR 9833/NM 67 */
export interface EnsaioFrescoCCV {
  classificacao:    "CCV";
  /** Data/hora do ensaio */
  dataHora:         string;
  /** Temperatura do concreto — °C */
  temperaturaCelsius?: number;
  slump:            ResultadoSlump;
  /** Massa específica medida — kg/dm³ (= kg/L) */
  massaEspecificaKgDm3?:  number;
  /** Teor de ar pelo método pressométrico — % */
  teorArPercent?:         number;
  /** Temperatura do ar ambiente — °C */
  temperaturaAmbienteCelsius?: number;
  /** Observações livres */
  observacoes?:     string;
}

/** Ensaios de estado fresco — CAA (NBR 15823) */
export interface EnsaioFrescoCAA {
  classificacao:    "CAA";
  dataHora:         string;
  temperaturaCelsius?: number;
  /**
   * Espalhamento — mm (NBR 15823-2)
   * Classes: SF1 (550–650), SF2 (660–750), SF3 (760–850)
   */
  espalhamentoMm:       number;
  classeEspalhamento:   "SF1" | "SF2" | "SF3";
  /**
   * T500 — tempo para atingir Ø500 mm no ensaio de espalhamento — s
   * Classes: VS1 (< 2s = baixa viscosidade), VS2 (≥ 2s = alta viscosidade)
   */
  t500Segundos?:        number;
  classeViscosidade?:   "VS1" | "VS2";
  /**
   * Funil-V — NBR 15823-4 — s
   * Classes: VF1 (< 8s), VF2 (9–25s)
   */
  funilVSegundos?:      number;
  classeFunilV?:        "VF1" | "VF2";
  /**
   * Caixa-L — razão H2/H1 — NBR 15823-5
   * Exigência mínima: ≥ 0.80
   * Classes: PA1 (2 barras), PA2 (3 barras)
   */
  caixaLRazao?:         number;
  classeCaixaL?:        "PA1" | "PA2";
  caixaLAprovado?:      boolean;
  /**
   * Caixa-U — diferença de nível ΔH — mm (alternativa à caixa-L)
   * Exigência: ΔH ≤ 30 mm
   */
  caixaUDeltaHMm?:      number;
  /**
   * Índice de segregação — % — NBR 15823-6
   * Classes: SR1 (≤ 10%), SR2 (≤ 15%)
   */
  indiceSegregacaoPercent?: number;
  classeSegreg?:           "SR1" | "SR2";
  massaEspecificaKgDm3?:   number;
  teorArPercent?:           number;
  observacoes?:             string;
}

/** Ensaios de estado fresco — UHPC / GRC — mini-cone de Hærät */
export interface EnsaioFrescoUHPC {
  classificacao:        "UHPC" | "GRC";
  dataHora:             string;
  temperaturaCelsius?:  number;
  /**
   * Espalhamento no mini-cone — mm
   * UHPC alvo típico: ≥ 250 mm (sem vibração)
   */
  espalhamentoMiniConeMm:   number;
  /**
   * T200 — tempo para atingir Ø 200 mm no mini-cone — s
   * Indicador de viscosidade plástica
   */
  t200Segundos?:            number;
  /** Viscosidade Marsh — s (funil de Marsh Ø 10mm) */
  viscosidadeMarshSegundos?: number;
  massaEspecificaKgDm3?:    number;
  /** Teor de ar para UHPC (deve ser < 2%) */
  teorArPercent?:            number;
  observacoes?:              string;
}

/** União discriminada de todos os ensaios de estado fresco */
export type EnsaioFresco = EnsaioFrescoCCV | EnsaioFrescoCAA | EnsaioFrescoUHPC;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — ESTADO ENDURECIDO
// ─────────────────────────────────────────────────────────────────────────────

/** Resultado de um ensaio de compressão axial — NBR 5739 */
export interface ResultadoCompressao {
  /** Identificação do CP */
  idCp:              string;
  geometria:         GeometriaCpId;
  idadeRompimento:   IdadeRompimento;
  /** Carga de ruptura — kN */
  cargaRupturaKN:    number;
  /** Área da seção transversal — cm² */
  areaSecaoCm2:      number;
  /** Resistência à compressão axial — MPa */
  fcMPa:             number;
  /** Modo de ruptura (NBR 5739 Fig. 2): 1–6 */
  modoRuptura?:      1 | 2 | 3 | 4 | 5 | 6;
  /** Aprovado para a resistência especificada? */
  aprovado?:         boolean;
  fckEspecificadoMPa?: number;
}

/** Resultado de ensaio de tração por compressão diametral — NBR 7222 */
export interface ResultadoTracaoDiametral {
  idCp:              string;
  geometria:         GeometriaCpId;
  idadeRompimento:   IdadeRompimento;
  cargaRupturaKN:    number;
  diametroCm:        number;
  alturaCm:          number;
  /**
   * fct,sp = 2F / (π × d × h)                                            … (fctsp)
   * Resultado em MPa
   */
  fctSpMPa:          number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO DE ELASTICIDADE — ESTÁTICO E DINÂMICO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Módulo de Elasticidade Estático (E_cs) — NBR 8522:2021 Método B
 *
 * Determinado a partir da curva σ-ε em ensaio de compressão axial com
 * dois ciclos de carga: pré-carga e carga de referência.
 *
 *   σ_b = 0.30 × fc    (nível superior de carga)
 *   σ_a = 0.50 MPa     (pré-carregamento)
 *   E_cs = (σ_b − σ_a) / (ε_b − ε_a)                                   … (Ecs)
 *   Simplificado: ε_a ≈ 0.00005 (NBR 8522 convenção)
 *
 * Correlação empírica NBR 6118:2023 (Eq. 8.18):
 *   E_ci = α_i × 5600 × √fc    (módulo tangente inicial)
 *   E_cs = α_e × E_ci           (α_e ≈ 0.85, tipo B)
 */
export interface ResultadoModuloEstatico {
  idCp:                 string;
  geometria:            GeometriaCpId;
  idadeRompimento:      IdadeRompimento;
  metodo:               "NBR_8522_B" | "ASTM_C469" | "EN_12390_13";
  /** Resistência à compressão do CP usado no ensaio — MPa */
  fcReferencialMPa:     number;
  /** σ_b = 0.30 × fc — tensão nível superior — MPa */
  sigmaBMPa:            number;
  /** ε_b — deformação no ponto B — mm/m (‰) */
  epsilonBMmM:          number;
  /**
   * E_cs = (σ_b − 0.5) / (ε_b − 0.00005)   [MPa]  → convertido para GPa … (Ecs)
   */
  ecsGPa:               number;
  /** Correlação teórica NBR 6118:2023 — GPa */
  ecsTeorico?:          number;
  /** Coeficiente de Poisson ν medido (se extensômetro circunferencial usado) */
  coefPoisson?:         number;
}

/**
 * Módulo de Elasticidade Dinâmico (E_d) — métodos não-destrutivos
 *
 * Dois métodos principais:
 *
 * A) ULTRASSOM (NBR 8802 / ASTM C597):
 *   E_d = ρ × V_P² × (1+ν)(1-2ν) / (1-ν)                              … (EdUS)
 *   onde ρ = densidade do CP (kg/m³), V_P = velocidade de pulso longitudinal (m/s)
 *   ν = coeficiente de Poisson (default 0.20 para concreto)
 *
 * B) FREQUÊNCIA DE RESSONÂNCIA (ASTM C215 / NBR 8972):
 *   E_d = C_f × n² × m × f²                                             … (EdFR)
 *   onde f = frequência de ressonância longitudinal (Hz),
 *         m = massa do CP (kg),
 *         n = fator geométrico do CP,
 *         C_f = constante do aparelho
 *
 *   Para prismas: E_d = 4 × L × m × f² / (b × h)   [ASTM C215 Eq. A1] … (EdPri)
 *
 * Relação típica: E_d ≈ (1.05–1.30) × E_cs (E_d sempre maior por ausência de fluência)
 */
export interface ResultadoModuloDinamico {
  idCp:                 string;
  geometria:            GeometriaCpId;
  idadeRompimento:      IdadeRompimento;
  metodo:               "ULTRASSOM" | "FREQ_RESSONANCIA";
  /** Densidade medida do CP — kg/m³ */
  densidadeKgM3:        number;

  // ── Método Ultrassom ────────────────────────────────────────────────────
  /**
   * Velocidade do pulso longitudinal — m/s
   * NBR 8802 classificação: > 4500 m/s (excelente) | 3500–4500 (bom)
   */
  velocidadePulsoMs?:   number;
  /** Coeficiente de Poisson assumido (default 0.20) */
  coefPoisson?:         number;
  /**
   * E_d ultrassom = ρ × V_P² × (1+ν)(1-2ν)/(1-ν)  [Pa] → GPa           … (EdUS)
   */
  edUltrasonGPa?:       number;
  /** Classificação da qualidade pelo ultrassom (NBR 8802) */
  classificacaoUS?:     "EXCELENTE" | "BOM" | "REGULAR" | "RUIM" | "MUITO_RUIM";

  // ── Método Frequência de Ressonância ─────────────────────────────────
  /** Frequência de ressonância longitudinal medida — Hz */
  freqRessonanciaHz?:   number;
  /** Massa do CP — kg */
  massaKg?:             number;
  /**
   * E_d ressonância = 4 × L × m × f² / (b × h)    [Pa] → GPa            … (EdPri)
   * Válido para prismas. Para cilindros: E_d = (2πfL)² × ρ / 10^9
   */
  edRessonanciaGPa?:    number;

  // ── Consolidado ─────────────────────────────────────────────────────────
  /** Módulo dinâmico consolidado (ultrassom ou ressonância, o que estiver disponível) */
  edConsolidadoGPa:     number;
  /** Razão E_d / E_cs (estimada via correlação; E_cs não medido neste ensaio) */
  razaoEdEcs?:          number;
}

/** Union discriminada do módulo de elasticidade (estático ou dinâmico) */
export type ResultadoModuloElasticidade =
  | (ResultadoModuloEstatico & { tipoEnsaio: "ESTATICO" })
  | (ResultadoModuloDinamico & { tipoEnsaio: "DINAMICO" });

// ─────────────────────────────────────────────────────────────────────────────
// FLEXÃO — 3 PONTOS E 4 PONTOS
// ─────────────────────────────────────────────────────────────────────────────
export interface ResultadoFlexao {
  idCp:              string;
  geometria:         GeometriaCpId;
  idadeRompimento:   IdadeRompimento;
  cargaRupturaKN:    number;
  vanCm:             number;    // vão de ensaio — cm
  larguraCm:         number;
  alturaCm:          number;
  /**
   * fct,fl = F × L / (b × h²)                                             … (fctfl)
   * Resultado em MPa
   */
  fctFlMPa:          number;
}

/**
 * Resistência residual à tração do concreto fibrado — EN 14651 / NBR 16935
 *
 * Ensaio em viga entalhada com CMOD (Crack Mouth Opening Displacement).
 * Os pontos fR1…fR4 correspondem a CMOD = 0.5, 1.5, 2.5, 3.5 mm.
 *
 * fR,i = 3 × F_i × L / (2 × b × h_sp²)                                  … (fR)
 * h_sp = altura líquida (altura − profundidade do entalhe)
 */
export interface ResultadoResistenciaResidual {
  idCp:              string;
  geometria:         "PRI_ENTALHE_15_15_55";
  idadeRompimento:   IdadeRompimento;
  /** Altura líquida acima do entalhe — mm */
  hSpMm:             number;
  vaoMm:             number;

  /** Carga no CMOD = 0.5 mm — kN */
  f1KN:              number;
  /** Carga no CMOD = 1.5 mm — kN */
  f2KN:              number;
  /** Carga no CMOD = 2.5 mm — kN */
  f3KN:              number;
  /** Carga no CMOD = 3.5 mm — kN */
  f4KN:              number;

  /** fR1 — MPa (pós-fissura inicial) */
  fR1MPa:            number;
  /** fR2 — MPa */
  fR2MPa:            number;
  /** fR3 — MPa (estado limite de serviço — ELS) */
  fR3MPa:            number;
  /** fR4 — MPa (estado limite último — ELU) */
  fR4MPa:            number;

  /**
   * Classe de desempenho do concreto fibrado (fib MC 2010 / EN 14651):
   * [fR1k/fctm] × [fR3k/fR1k]
   * Ex: "2.5a" = fR1k ≥ 2.5 MPa, fR3k/fR1k ≥ 0.5 (classe a)
   */
  classeDesempenho?: string;
}

/** Resultado completo de ensaios endurecidos para um CP ou lote */
export interface ResultadosEndurecidos {
  idTraco:            string;
  idadeRompimento:    IdadeRompimento;
  compressao?:        ResultadoCompressao[];
  tracaoDiametral?:   ResultadoTracaoDiametral[];
  moduloElasticidade?: ResultadoModuloElasticidade[];
  flexao?:            ResultadoFlexao[];
  resistenciaResidual?: ResultadoResistenciaResidual[];
}

/** Estatísticas descritivas de um conjunto de resultados */
export interface EstatisticasLote {
  n:            number;
  media:        number;
  desvioPadrao: number;
  /** Coeficiente de variação — % */
  cv:           number;
  minimo:       number;
  maximo:       number;
  /** Resistência característica estimada = média − 1.65σ (ou Bolomey) */
  fck:          number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — PILOTO COMPLETO
// ─────────────────────────────────────────────────────────────────────────────

/** Registro completo de um ensaio piloto (estado fresco + endurecido) */
export interface RegistroPiloto {
  /** Identificador único do traço piloto */
  id:                   string;
  /** Descrição do traço (ex: "C30 - CP IV-32 - a/c=0.55") */
  descricao:            string;
  /** Data do ensaio */
  dataEnsaio:           string;
  /** Responsável técnico */
  responsavel:          string;
  /** Traço de dosagem de referência (saída de calcularDosagem) */
  tracoDosagem?:        ResultadoDosagem;
  /** Pesagem realizada na betoneira */
  planilhaPesagem?:     PlanilhaPesagem;
  /** Resultado dos ensaios de estado fresco */
  estadoFresco?:        EnsaioFresco;
  /** Resultados dos ensaios de estado endurecido por idade */
  estadoEndurecido:     ResultadosEndurecidos[];
  /** Observações gerais */
  observacoes?:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class LabVolumeInvalidoError extends Error {
  constructor(volume: number) {
    super(`Volume ${volume} L inválido para dimensionamento. Deve ser > 0.`);
    this.name = "LabVolumeInvalidoError";
  }
}

export class LabFatorPerdaInvalidoError extends Error {
  constructor(fator: number) {
    super(`Fator de perda ${fator} inválido. Deve estar em [0, 1].`);
    this.name = "LabFatorPerdaInvalidoError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 1 — VOLUME DE UM CORPO DE PROVA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o volume de um único corpo de prova a partir da geometria normalizada.
 *
 * Equações:
 *   Cilindro: V = π/4 × d² × h                                           … (Vcil)
 *   Prisma:   V = l × w × h                                               … (Vpri)
 *   Cubo:     V = a³                                                      … (Vcub)
 *
 * @param geometriaId  ID da geometria (chave de GEOMETRIAS_CP)
 * @returns            Volume em dm³ (= litros), já que dimensões em cm → cm³/1000
 *
 * @example
 * calcularVolumeCP("CIL_10_20") // → 1.5708 L
 * calcularVolumeCP("PRI_15_15_50") // → 11.25 L
 */
export function calcularVolumeCP(geometriaId: GeometriaCpId): number {
  const geo = GEOMETRIAS_CP[geometriaId];

  let volumeCm3: number;

  if (geo.tipo === "cilindro") {
    // V_cil = π/4 × d² × h                                               … (Vcil)
    volumeCm3 = (PI / 4) * geo.diametro ** 2 * geo.altura;
  } else if (geo.tipo === "cubo") {
    // V_cub = a³                                                           … (Vcub)
    volumeCm3 = geo.aresta ** 3;
  } else if (geo.tipo === "placa") {
    // V_plc = comprimento × largura × espessura                           … (Vplc)
    volumeCm3 = geo.comprimento * geo.largura * geo.espessura;
  } else {
    // prisma ou prisma_entalhado — volume bruto (entalhe ≈ 1.5% negligenciável)
    // V_pri = l × w × h                                                   … (Vpri)
    volumeCm3 = geo.comprimento * geo.largura * geo.altura;
  }

  // 1 dm³ = 1000 cm³ → volume em litros
  return _r4(volumeCm3 / 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 2 — DIMENSIONAMENTO COMPLETO DE CPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dimensiona o volume de concreto necessário para um conjunto de lotes de CPs.
 *
 *   V_total = Σ(n_i × V_i) × (1 + f_perda)                              … (Vtot)
 *
 * O volume final é arredondado para o múltiplo de 5 L imediatamente acima
 * para facilitar o escalonamento do traço de laboratório.
 *
 * @param lotes        Lista de lotes a confeccionar
 * @param fatorPerda   Fator de perda (0.20 = 20%) — inclui ensaios de estado fresco
 * @returns            ResultadoDimensionamentoCps
 *
 * @throws LabFatorPerdaInvalidoError se fatorPerda ∉ [0, 1]
 */
export function dimensionarCorposDeProva(
  lotes:      LoteCp[],
  fatorPerda: number = 0.20
): ResultadoDimensionamentoCps {
  if (fatorPerda < 0 || fatorPerda > 1) {
    throw new LabFatorPerdaInvalidoError(fatorPerda);
  }

  const lotesCalculados: DimensionamentoCp[] = lotes.map((lote) => {
    const vUnit = calcularVolumeCP(lote.geometria);
    const vLote = _r4(lote.quantidade * vUnit);

    return {
      geometria:           lote.geometria,
      descricaoGeometria:  GEOMETRIAS_CP[lote.geometria].descricao,
      quantidade:          lote.quantidade,
      idadesRompimento:    lote.idadesRompimento,
      volumeUnitarioDm3:   vUnit,
      volumeLoteSemPerdaL: vLote,
    };
  });

  const vSemPerda = _r2(lotesCalculados.reduce((a, l) => a + l.volumeLoteSemPerdaL, 0));
  const vComPerda = _r2(vSemPerda * (1 + fatorPerda));
  // Arredonda para múltiplo de 5 L (mínimo: 5 L)
  const vBetoneira = Math.max(5, Math.ceil(vComPerda / 5) * 5);

  return {
    lotes:                lotesCalculados,
    volumeTotalSemPerdaL: vSemPerda,
    fatorPerda,
    volumeTotalComPerdaL: vComPerda,
    volumeBetoneira:      vBetoneira,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 3 — ESCALONAMENTO DO TRAÇO PARA A BETONEIRA PILOTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte o traço de dosagem de 1 m³ para a pesagem exata da betoneira piloto.
 *
 *   f_esc = V_betoneira / 1000                                            … (fesc)
 *   m_i   = m_i_1m3 × f_esc                                              … (mbet)
 *
 * Precisões de pesagem aplicadas:
 *   Cimento, agregados, SCM  → arredondamento para 1 g  (balança 0.1 g)
 *   Água                     → arredondamento para 0.1 g (proveta graduada)
 *   Aditivo SP líquido       → arredondamento para 0.01 g (seringa/micropipeta)
 *
 * @param dosagem          Resultado da função calcularDosagem (lib/dosagem.ts)
 * @param volumeBetoneira  Volume total desejado na betoneira — L
 * @returns                PlanilhaPesagem completa
 *
 * @throws LabVolumeInvalidoError se volumeBetoneira ≤ 0
 */
export function escalonarTracoParaPiloto(
  dosagem:         ResultadoDosagem,
  volumeBetoneira: number
): PlanilhaPesagem {
  if (volumeBetoneira <= 0) throw new LabVolumeInvalidoError(volumeBetoneira);

  const fesc = volumeBetoneira / 1000;       // fator de escala: (5)
  const comp = dosagem.composicaoM3;

  // Determinar precisão de pesagem por categoria
  const _precisao = (cat: string): PesagemMaterial["precisaoPesagem"] => {
    if (cat === "agua") return "0.1g";
    if (cat === "aditivoSp") return "0.01g";
    return "1g"; // cimento, areia, brita, scm, fibra, compensador, cristalizante, pigmento
  };

  const _material = (
    descricao:  string,
    massaKg1m3: number,
    precisao:   PesagemMaterial["precisaoPesagem"]
  ): PesagemMaterial => {
    const massBet = massaKg1m3 * fesc;
    return {
      descricao,
      massaKg1m3:       _r3(massaKg1m3),
      massaKgBetoneira: precisao === "1g"   ? _r3(massBet)
                      : precisao === "0.1g" ? _r4(massBet)
                      :                       Math.round(massBet * 100000) / 100000,
      massaGrBetoneira: precisao === "0.01g"
        ? Math.round(massBet * 1000 * 100) / 100
        : Math.round(massBet * 1000 * 10) / 10,
      precisaoPesagem: precisao,
    };
  };

  // Iterar todas as linhas da composição genérica (exceto ar aprisionado)
  const materiais: PesagemMaterial[] = comp.linhas
    .filter(l => l.categoria !== "ar" && l.massaKgM3 > 0)
    .map(l => _material(l.descricao, l.massaKgM3, _precisao(l.categoria)));

  const massaTotal = _r3(materiais.reduce((a, m) => a + m.massaKgBetoneira, 0));

  return {
    volumeBetoneira,
    fatorEscala:         _r5(fesc),
    massaTotalBetoneira: massaTotal,
    materiais,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 4 — CÁLCULO DA RESISTÊNCIA À TRAÇÃO DIAMETRAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a resistência à tração por compressão diametral (splitting tensile).
 *
 *   fct,sp = 2F / (π × d × h)                                            … (fctsp)
 *
 * F em kN → convertido para N internamente antes de dividir por mm²
 *
 * @param cargaKN    Carga de ruptura — kN
 * @param diametroCm Diâmetro do cilindro — cm
 * @param alturaCm   Altura do cilindro — cm
 * @returns          fct,sp em MPa
 */
export function calcularTracaoDiametral(
  cargaKN:    number,
  diametroCm: number,
  alturaCm:   number
): number {
  // Convert: kN → N; cm → mm
  const F_N  = cargaKN * 1000;
  const d_mm = diametroCm * 10;
  const h_mm = alturaCm * 10;
  // fct,sp = 2F / (π × d × h)   [N/mm² = MPa]
  return _r2((2 * F_N) / (PI * d_mm * h_mm));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 5 — MÓDULO DE ELASTICIDADE ESTÁTICO (NBR 8522 Método B)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o módulo de elasticidade secante (E_cs) conforme NBR 8522:2021.
 *
 *   σ_b = 0.30 × fc    (ponto superior)
 *   σ_a = 0.50 MPa     (pré-carregamento)
 *   E_cs = (σ_b − σ_a) / (ε_b − ε_a)
 *
 * Simplificação (ε_a ≈ 0.00005 por convenção):
 *   E_cs = (σ_b − 0.5) / (ε_b − 0.00005)                                … (Ecs)
 *
 * Correlação empírica NBR 6118:2023 (cimento Portland):
 *   E_ci = α_i × 5600 × √fc    (E_ci = tangente inicial)
 *   E_cs = α_e × E_ci           (α_e ≈ 0.85 para concreto tipo B)
 *
 * @param fcMPa       Resistência à compressão do CP — MPa
 * @param epsilonB    Deformação no ponto B (ε_b) — mm/m (‰) — valor positivo
 * @param alphaCimento Coeficiente do tipo de cimento (default: 1.0 para CP I/II)
 * @returns           { ecsGPa (medido), ecsTeorico (NBR 6118 correlação) }
 */
export function calcularModuloElasticidade(
  fcMPa:         number,
  epsilonB:      number,
  alphaCimento:  number = 1.0
): { sigmaBMPa: number; ecsGPa: number; ecsTeorico: number } {
  const sigmaA = 0.5;                    // MPa (pré-carga)
  const sigmaB = _r2(0.30 * fcMPa);     // MPa (30% da resistência)
  const epsA   = 0.00005;               // deformação convencionada no pré-carga

  // E_cs em MPa; converter para GPa dividindo por 1000
  const ecsMPa  = (sigmaB - sigmaA) / (epsilonB / 1000 - epsA);
  const ecsGPa  = _r2(ecsMPa / 1000);

  // Correlação NBR 6118:2023 Eq. (8.18)
  const eciMPa  = alphaCimento * 5600 * Math.sqrt(fcMPa);
  const ecsTeoricoGPa = _r2(0.85 * eciMPa / 1000);

  return { sigmaBMPa: sigmaB, ecsGPa, ecsTeorico: ecsTeoricoGPa };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 6 — RESISTÊNCIA RESIDUAL (fR1…fR4) — EN 14651 / NBR 16935
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula as quatro resistências residuais à tração do concreto fibrado a partir
 * das cargas na curva F-CMOD em viga entalhada.
 *
 *   fR,i = 3 × F_i × l / (2 × b × h_sp²)                               … (fR)
 *
 * onde:
 *   l    = vão de ensaio (500 mm para prisma 15×15×55)
 *   b    = largura da seção (150 mm)
 *   h_sp = altura líquida acima do entalhe (125 mm quando entalhe = 25 mm)
 *
 * Classificação de desempenho (EN 14651 / fib MC 2010):
 *   Nível de desempenho: fR1k / fctm (a = ≥ 0.5, b = ≥ 0.7, c = ≥ 1.0, d = ≥ 1.3)
 *   Tenacidade:          fR3k / fR1k (a = ≥ 0.5, b = ≥ 0.7, c = ≥ 0.9, d = ≥ 1.1)
 *
 * @param cargas  [F1kN, F2kN, F3kN, F4kN] — cargas nos CMOD = 0.5, 1.5, 2.5, 3.5 mm
 * @param vaoMm   Vão de ensaio — mm (default: 500)
 * @param larguraMm Largura da viga — mm (default: 150)
 * @param hSpMm   Altura líquida — mm (default: 125)
 */
export function calcularResistenciasResiduais(
  cargas:    [number, number, number, number],
  vaoMm:     number = 500,
  larguraMm: number = 150,
  hSpMm:     number = 125
): { fR1MPa: number; fR2MPa: number; fR3MPa: number; fR4MPa: number } {
  const _fr = (cargaKN: number) =>
    _r2((3 * cargaKN * 1000 * vaoMm) / (2 * larguraMm * hSpMm * hSpMm));

  return {
    fR1MPa: _fr(cargas[0]),
    fR2MPa: _fr(cargas[1]),
    fR3MPa: _fr(cargas[2]),
    fR4MPa: _fr(cargas[3]),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 7 — ESTATÍSTICAS DO LOTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula estatísticas descritivas de um lote de resultados de resistência.
 *
 *   Média:   x̄ = Σxi / n
 *   Desvio:  s = √[Σ(xi − x̄)² / (n − 1)]
 *   CV:      s / x̄ × 100  [%]
 *   fck:     x̄ − 1.65 × s   (estimativa característica 5% − NBR 12655)
 *
 * @param valores  Array de resistências medidas — MPa
 */
export function calcularEstatisticasLote(valores: number[]): EstatisticasLote {
  const n = valores.length;
  if (n === 0) return { n: 0, media: 0, desvioPadrao: 0, cv: 0, minimo: 0, maximo: 0, fck: 0 };

  const media = valores.reduce((a, b) => a + b, 0) / n;
  const variancia = n > 1
    ? valores.reduce((a, v) => a + (v - media) ** 2, 0) / (n - 1)
    : 0;
  const s   = Math.sqrt(variancia);
  const cv  = media > 0 ? _r2(s / media * 100) : 0;
  const fck = _r2(media - 1.65 * s);

  return {
    n,
    media:        _r2(media),
    desvioPadrao: _r2(s),
    cv,
    minimo:       _r2(Math.min(...valores)),
    maximo:       _r2(Math.max(...valores)),
    fck:          Math.max(0, fck),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 8 — CLASSIFICAÇÃO DO SLUMP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifica o abatimento medido conforme NBR 6118:2023 Tabela 8.1.
 *
 * S1: 10–40 mm  | S2: 50–90 mm | S3: 100–150 mm
 * S4: 160–210 mm | S5: ≥ 220 mm
 *
 * @param abatimentoMm      Abatimento medido — mm
 * @param slumpEspecificado Slump de projeto — mm
 * @param toleranciaMm      Tolerância de medição (default: ±10 mm)
 */
export function classificarSlump(
  abatimentoMm:      number,
  slumpEspecificado: number,
  toleranciaMm:      number = 10
): ResultadoSlump {
  let classeConsistencia: ResultadoSlump["classeConsistencia"];

  if (abatimentoMm <= 40)       classeConsistencia = "S1";
  else if (abatimentoMm <= 90)  classeConsistencia = "S2";
  else if (abatimentoMm <= 150) classeConsistencia = "S3";
  else if (abatimentoMm <= 210) classeConsistencia = "S4";
  else                           classeConsistencia = "S5";

  return {
    abatimentoMm,
    classeConsistencia,
    aprovado:            Math.abs(abatimentoMm - slumpEspecificado) <= toleranciaMm,
    slumpEspecificadoMm: slumpEspecificado,
    toleranciaMm,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 9 — ÍNDICES DE GANHO DE RESISTÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

/** Índices de evolução da resistência por idade */
export interface IndicesGanhoResistencia {
  /** R7/R28 — referência: 0.65–0.75 para CP V-ARI / 0.60–0.70 para CP II */
  r7_r28:  number | null;
  /** R28/R7 — inverso */
  r28_r7:  number | null;
  /** R91/R28 — desenvolvimento tardio: 1.10–1.25 */
  r91_r28: number | null;
  /** fck atendido na idade de 28 dias? */
  fck28Atendido:     boolean;
  fck28Especificado: number;
}

/**
 * Calcula os índices de ganho de resistência a partir dos resultados
 * médios medidos em diferentes idades.
 */
export function calcularIndicesGanhoResistencia(
  resultadosPorIdade: Partial<Record<IdadeRompimento, number>>,
  fckEspecificado:    number
): IndicesGanhoResistencia {
  const r7  = resultadosPorIdade["7d"]  ?? null;
  const r28 = resultadosPorIdade["28d"] ?? null;
  const r91 = resultadosPorIdade["91d"] ?? null;

  return {
    r7_r28:            r7 && r28 ? _r3(r7 / r28) : null,
    r28_r7:            r7 && r28 ? _r3(r28 / r7) : null,
    r91_r28:           r28 && r91 ? _r3(r91 / r28) : null,
    fck28Atendido:     r28 !== null && r28 >= fckEspecificado,
    fck28Especificado: fckEspecificado,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function _r2(v: number): number { return Math.round(v * 100) / 100; }
function _r3(v: number): number { return Math.round(v * 1000) / 1000; }
function _r4(v: number): number { return Math.round(v * 10000) / 10000; }
function _r5(v: number): number { return Math.round(v * 100000) / 100000; }
