// NIVELIX CORE — Tipos
//
// Argamassa autonivelante de retracao compensada (RC) + acustica.
// Parceria: Chimica Edile (IT/US/BR/AR) + LIVELLARE.

/**
 * Classe de espalhamento (EN 13813 / NBR 15258):
 * - F1: espalhamento >= 140mm (baixa fluidez)
 * - F2: espalhamento >= 180mm (media)
 * - F3: espalhamento >= 220mm (alta — autonivelante padrao)
 * - F4: espalhamento >= 260mm (ultra-fluida)
 */
export type ClasseEspalhamento = "F1" | "F2" | "F3" | "F4"

/**
 * Classe de resistencia a compressao (EN 13813):
 * - C5..C80 em MPa
 */
export type ClasseResistencia = "C5" | "C7" | "C12" | "C16" | "C20" | "C25" | "C30" | "C35" | "C40" | "C50" | "C60" | "C80"

/**
 * Tipo de aplicacao do autonivelante
 */
export type TipoAplicacao =
  | "regularizacao"       // 3-10mm — regularizacao de substrato
  | "contrapiso"          // 10-50mm — contrapiso residencial/comercial
  | "contrapiso_acustico" // 20-60mm — com manta acustica
  | "piso_industrial"     // 10-30mm — sobre base de concreto
  | "revestimento"        // 2-5mm — camada final de desgaste

/**
 * Tipo de ligante principal
 */
export type TipoLigante =
  | "cimento_portland"    // base CP (convencional)
  | "csa"                 // sulfoaluminato de calcio (rapida pega)
  | "gesso_anidrita"      // base gesso/anidrita (interior)
  | "misto"               // cimento + gesso/CAC

/**
 * Parametros de entrada para formulacao autonivelante
 */
export interface ParamsFormulacao {
  /** Tipo de ligante */
  tipoLigante: TipoLigante
  /** Consumo de cimento/ligante — kg/m3 */
  ligKgM3: number
  /** Relacao agua/ligante */
  aLig: number
  /** Filler (calcario, quartzoso, etc.) — kg/m3 */
  fillerKgM3: number
  /** Areia fina (0-0.5mm) — kg/m3 */
  areiaFinaKgM3: number
  /** Areia media (0.5-2mm) — kg/m3 (opcional, 0 se nao usar) */
  areiaMediaKgM3?: number
  /** Dosagem de superplastificante — % sobre ligante */
  spPct: number
  /** Dosagem de agente expansivo — % sobre ligante (0 se nao compensado) */
  aePct: number
  /** Dosagem de VMA (agente modificador de viscosidade) — % sobre ligante */
  vmaPct?: number
  /** Polimero redispersavel (EVA/VAE) — % sobre ligante */
  polimeroPct?: number
  /** Densidade do ligante — g/cm3 */
  rhoLig: number
  /** Densidade do filler — g/cm3 */
  rhoFiller: number
  /** Densidade da areia fina — g/cm3 */
  rhoAreiaFina: number
  /** Densidade da areia media — g/cm3 */
  rhoAreiaMedia?: number
}

/**
 * Resultado da formulacao verificada
 */
export interface ResultadoFormulacao {
  /** Volume absoluto total — dm3/m3 (deve ser ~1000 ±10) */
  volumeAbsTotal: number
  /** Volume de pasta — dm3/m3 */
  volumePasta: number
  /** Volume de ar estimado — dm3/m3 */
  volumeAr: number
  /** Razao volumetrica pasta/agregado */
  razaoPastaAgregado: number
  /** Consumo de agua — kg/m3 (L/m3) */
  aguaKgM3: number
  /** Massa unitaria teorica — kg/m3 */
  massaUnitaria: number
  /** Classe de espalhamento esperada (estimativa) */
  classeEspalhamento: ClasseEspalhamento
  /** Conforme? (volume abs ~1000, pasta/agregado dentro da faixa) */
  conforme: boolean
  /** Diagnostico textual */
  diagnostico: string
}

/**
 * Parametros para calculo de consumo por m2
 */
export interface ParamsConsumo {
  /** Espessura media da camada — mm */
  espessuraMm: number
  /** Massa unitaria da argamassa — kg/m3 */
  massaUnitariaKgM3: number
  /** Area total — m2 */
  areaM2: number
  /** Perda estimada — % (desperdicio, recortes, etc.) */
  perdaPct?: number
  /** Irregularidade media do substrato — mm (adicional a espessura) */
  irregularidadeMm?: number
}

/**
 * Resultado de consumo
 */
export interface ResultadoConsumo {
  /** Espessura efetiva (media + irregularidade) — mm */
  espessuraEfetivaMm: number
  /** Volume total necessario — L */
  volumeTotalL: number
  /** Massa total necessaria — kg */
  massaTotalKg: number
  /** Consumo por m2 — kg/m2 */
  consumoKgM2: number
  /** Consumo por m2 — L/m2 */
  consumoLM2: number
  /** Numero de sacos de 25kg (arredondado para cima) */
  sacos25kg: number
  /** Numero de sacos de 50kg (arredondado para cima) */
  sacos50kg: number
}

/**
 * Parametros de entrada para reologia de autonivelante
 */
export interface ParamsReologia {
  /** Tensao de escoamento — Pa */
  tau0Pa: number
  /** Viscosidade plastica — Pa·s */
  muPas: number
  /** Densidade da argamassa — kg/m3 */
  rhoKgM3: number
}

/**
 * Resultado da avaliacao reologica
 */
export interface ResultadoReologia {
  /** Espalhamento estimado (mini-cone) — mm */
  espalhamentoMm: number
  /** T250 estimado (tempo para 250mm de espalhamento) — s */
  t250s: number | null
  /** Classe de espalhamento EN 13813 */
  classeEspalhamento: ClasseEspalhamento
  /** Autonivelante? (espalhamento >= 220mm e tau0 < 25 Pa) */
  autonivelante: boolean
  /** Diagnostico reologico */
  diagnostico: string
}

/**
 * Parametros de entrada para desempenho acustico
 */
export interface ParamsAcustica {
  /** Espessura do contrapiso autonivelante — mm */
  espessuraContrapisoMm: number
  /** Densidade do contrapiso — kg/m3 */
  rhoContrapisoKgM3: number
  /** Espessura da laje de concreto — mm */
  espessuraLajeMm: number
  /** Densidade da laje — kg/m3 (default: 2400) */
  rhoLajeKgM3?: number
  /** Usa manta acustica resiliente? */
  comMantaAcustica: boolean
  /** Rigidez dinamica da manta — MN/m3 (se aplicavel) */
  rigidezMantaMNm3?: number
  /** Espessura da manta — mm (se aplicavel) */
  espessuraMantaMm?: number
}

/**
 * Resultado do desempenho acustico
 */
export interface ResultadoAcustica {
  /** Massa superficial total (laje + contrapiso) — kg/m2 */
  massaSuperficialKgM2: number
  /** Rw estimado (isolamento ao ruido aereo — lei da massa) — dB */
  rwEstimadoDb: number
  /** Lnw estimado (ruido de impacto padrao sem manta) — dB */
  lnwSemMantaDb: number
  /** DeltaLw (reducao pelo piso flutuante, se com manta) — dB */
  deltaLwDb: number
  /** Lnw corrigido (com piso flutuante) — dB */
  lnwCorrigidoDb: number | null
  /** Atende NBR 15575? (Lnw <= 55 para unidades distintas) */
  atendeNbr15575: boolean
  /** Classe de desempenho NBR 15575 */
  classeDesempenho: "S" | "I" | "M" | "nao_atende"
  /** Diagnostico */
  diagnostico: string
}
