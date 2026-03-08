// NIVELIX CORE — Input tipado para argamassa autonivelante RC
//
// Argamassa NUNCA tem brita. Tem fíler, múltiplas areias,
// adição mineral, fibra, superplastificante, ar incorporado.
// Ref: EN 13813 · NBR 15823 · Roussel (2005)

export interface NivelixInput {
  /** Tipo de cimento — CP V ARI | CP II-F | CP II-Z etc. */
  cimentoType: string
  /** Resistência alvo 28d — MPa */
  fck: number
  /** Relação água/cimento */
  ac: number
  /** Consumo de cimento — kg/m³ */
  consumoCimento: number
  /** Consumo de água — L/m³ */
  consumoAgua: number

  /** Areia fina (d50 < 0.3mm) — kg/m³ */
  consumoAreiaFina: number
  /** Areia média (d50 0.3–0.6mm) — kg/m³ */
  consumoAreiaMedia?: number
  /** Fíler calcário — kg/m³ */
  consumoFiller?: number

  /** Tipo de agente expansivo CRC */
  agenteExpansivo: "CSA-K" | "CSA-G" | "ETTRINGITA" | "NENHUM"
  /** Teor do agente expansivo — kg/m³ */
  teorAgente: number

  /** Tipo de adição mineral */
  adicaoMineral?: "SILICA_ATIVA" | "METACAULIM" | "NENHUMA"
  /** Teor da adição mineral — kg/m³ */
  teorAdicaoMineral?: number

  /** Contém fibra polimérica? */
  temFibra: boolean
  /** Tipo de fibra */
  tipoFibra?: "PP" | "PVA"
  /** Teor de fibra — kg/m³ */
  teorFibra?: number

  /** Superplastificante — % sobre cimento */
  superplastificante?: number
  /** Incorporador de ar — % sobre cimento */
  incorporadorAr?: number

  /** Espalhamento alvo — mm (classe FA NBR 15823) */
  espalhamentoAlvo: number
}
