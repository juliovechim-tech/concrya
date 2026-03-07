// COMPENSA CORE — Tipos

/**
 * Tipos de agente expansivo (AE):
 * - tipo_k: Sulfoaluminato de calcio (Klein compound, C4A3S)
 *   Gera etringita primaria: C4A3S + 8CSH2 + 6CH + 74H → 3C6AS3H32
 * - tipo_m: Oxido de calcio (CaO livre)
 *   Gera portlandita: CaO + H2O → Ca(OH)2 (expansao volumetrica ~97%)
 * - tipo_g: Combinado (sulfoaluminato + calcio)
 * - tipo_s: Oxido de magnesio (MgO — Sorel)
 *   Gera brucita: MgO + H2O → Mg(OH)2
 */
export type TipoAE = "tipo_k" | "tipo_m" | "tipo_g" | "tipo_s"

export interface AgenteExpansivo {
  codigo: string
  nome: string
  fabricante: string
  tipo: TipoAE
  /** Densidade — g/cm3 */
  rho: number
  /** Dosagem minima recomendada — % sobre cimento */
  dosMinPct: number
  /** Dosagem maxima recomendada — % sobre cimento */
  dosMaxPct: number
  /** Dosagem referencia — % sobre cimento */
  dosRefPct: number
  /** Expansao restringida tipica a 7d — µε (ASTM C878) */
  expansao7dUe: number
  /** Expansao restringida tipica a 28d — µε */
  expansao28dUe: number
  /** Temperatura maxima de cura recomendada — °C */
  tempMaxCuraC: number
}

export interface ParamsExpansao {
  /** Tipo de agente expansivo */
  tipoAE: TipoAE
  /** Dosagem do AE — % sobre cimento */
  dosAePct: number
  /** Consumo de cimento — kg/m3 */
  cimentoKgM3: number
  /** Temperatura de cura — °C */
  tempCuraC: number
  /** Grau de restricao — 0 (livre) a 1 (totalmente restringido) */
  grauRestricao: number
  /** Idade — dias */
  idadeDias: number
}

export interface ParamsRetracao {
  /** a/c */
  ac: number
  /** Consumo de cimento — kg/m3 */
  cimentoKgM3: number
  /** Volume de pasta — L/m3 */
  volumePastaLM3: number
  /** Umidade relativa ambiente — % (30-100) */
  umidadeRelPct: number
  /** Espessura equivalente da peca — mm (V/S × 2) */
  espessuraEqMm: number
  /** Idade — dias */
  idadeDias: number
  /** Usa fibras? (reduz retracao em ~15-25%) */
  comFibras?: boolean
  /** Usa cura umida prolongada? (> 7 dias) */
  curaUmidaProlongada?: boolean
}
