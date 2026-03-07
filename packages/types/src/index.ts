// @concrya/types — Tipos TypeScript compartilhados do ecossistema CONCRYA

// ── Materiais ───────────────────────────────────────────────────

export interface Cimento {
  codigo: string
  nome: string
  tipo: string
  fabricante: string
  fabrica?: string
  rhoCimento: number       // g/cm³
  blaine?: number          // cm²/g
  r1d?: number             // MPa
  r3d?: number
  r7d?: number
  r28d?: number
  c3aEstimado?: number     // %
  so3?: number             // %
  familia: "CCV" | "CAA" | "UHPC" | "SEMIDRY"
  origem?: "ensaio_real" | "literatura"
  fonte?: string
  dataRef?: string
  ativo: boolean
}

export interface AgregadoGraudo {
  codigo: string
  nome: string
  tipo: "brita0" | "brita1" | "pedrisco" | "brita4"
  litologia: Litologia
  origem: string
  dmc: number              // mm
  mf?: number
  rhoDry?: number          // g/cm³
  rhoSss?: number
  rhoAparente?: number
  muSolto?: number         // kg/dm³
  muCompactado?: number
  absorcao?: number        // %
  materialPulv?: number    // %
  curvaGranulo?: Record<string, number>
  statusNBR: "ok" | "warn" | "fail"
  fonte?: string
  ativo: boolean
}

export interface AgregadoMiudo {
  codigo: string
  nome: string
  tipo: "natural" | "artificial" | "po_pedra"
  litologia: Litologia
  origem: string
  dmc: number              // mm
  mf: number
  rhoDry?: number          // g/cm³
  rhoSss?: number
  muSolto?: number
  muCompactado?: number
  absorcao?: number        // %
  materialPulv?: number    // %
  curvaGranulo?: Record<string, number>
  statusMF: "ok" | "warn" | "fail"
  fonte?: string
  ativo: boolean
}

export interface Aditivo {
  codigo: string
  nome: string
  fabricante: string
  tipo: "SP" | "VMA" | "AR" | "AC" | "RE"
  classe?: string
  baseQuimica?: string
  rhoDensidade?: number    // g/cm³
  dosMin?: number          // %
  dosMax?: number
  dosRef?: number
  unidadeDose?: "%" | "L/100kg"
  sistemaAlvo: "CCV" | "CAA" | "UHPC" | "SEMIDRY"
  compatSCM?: "sim" | "parcial" | "restrita"
  impactoPega?: "acelera" | "retarda" | "neutro"
  fonte?: string
  ativo: boolean
}

export interface Adicao {
  codigo: string
  nome: string
  tipo: "metacaulim" | "silica_ativa" | "cinza_f" | "escoria" | "filler"
  tipoFuncional?: "inerte" | "pozzolanica" | "latente_hidraulica"
  estado?: "po" | "dispersao_aquosa"
  fabricante?: string
  rhoDensidade?: number
  blaine?: number
  sio2?: number            // %
  al2o3?: number           // %
  areaEspecifica?: number  // m²/g (BET)
  reatividade?: "alta" | "media" | "inerte"
  teorSolidos?: number     // %
  teorAgua?: number        // %
  dosRef?: number
  fonte?: string
  ativo: boolean
}

export interface Fibra {
  codigo: string
  nome: string
  tipo: "aco" | "pp_micro" | "pp_macro" | "pva" | "vidro_ar" | "basalto" | "frp"
  fabricante?: string
  comprimento?: number     // mm
  diametro?: number        // mm
  fatorForma?: number      // l/d
  resistTracao?: number    // MPa
  moduloElastico?: number  // GPa
  fr1?: number             // MPa
  fr4?: number             // MPa
  dosagemTipica?: number   // kg/m³
  fonte?: string
  ativo: boolean
}

// ── Família de Traço ────────────────────────────────────────────

export interface FamiliaTraco {
  codigo: string
  nome: string
  descricao?: string
  cimentoCodigo: string
  sistemaConcreto: "CCV" | "CAA" | "UHPC" | "SEMIDRY"
  abramsA: number
  abramsB: number
  abramsR2?: number
  abramsForm: "exponencial" | "potencia"
  acMin: number
  acMax: number
  fc28Ref: number          // MPa
  slumpRef?: number        // mm
  notas?: string
  fonte?: string
}

// ── Enums e utilitários ─────────────────────────────────────────

export type Litologia =
  | "basalto"
  | "diabasio"
  | "granitico"
  | "gnaisse"
  | "calcario"
  | "arenito"
  | "seixo"
  | "quartzo"

export type SistemaConcreto = "CCV" | "CAA" | "UHPC" | "SEMIDRY"

export type ClasseAgressividade = "I" | "II" | "III" | "IV"

// ── Unidades SI (referência) ────────────────────────────────────
// kg, m³, MPa, kg/dm³, µε (microstrain), Pa·s
