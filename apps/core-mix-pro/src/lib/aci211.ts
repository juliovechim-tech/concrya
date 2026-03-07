/**
 * @file lib/aci211.ts
 * @description Motor de Dosagem ACI 211.1-91
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MÉTODO ACI 211.1 — Standard Practice for Selecting Proportions
 * for Normal, Heavyweight, and Mass Concrete
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Método tabelar americano — 9 etapas padronizadas:
 *   1. Escolha do slump
 *   2. Escolha do DMC do agregado graúdo
 *   3. Estimativa de água de amassamento + ar incorporado
 *   4. Determinação da relação a/c (por resistência e/ou durabilidade)
 *   5. Cálculo do consumo de cimento
 *   6. Estimativa de volume de agregado graúdo compactado (b/b₀)
 *   7. Estimativa de volume de agregado miúdo (por volume absoluto)
 *   8. Ajuste por umidade de campo
 *   9. Ajuste de betonada experimental
 *
 * Referências:
 *   [1] ACI 211.1-91 (Reapproved 2009).
 *   [2] ACI Committee 211. "Standard Practice for Selecting Proportions."
 *   [3] PCA "Design and Control of Concrete Mixtures" (16th Ed., 2016).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// TABELAS ACI 211.1
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tabela 6.3.3 — Água de amassamento aproximada (kg/m³)
 * Sem ar incorporado. Índices: [slumpFaixa][dmcMm]
 */
const AGUA_SEM_AR: Record<string, Record<number, number>> = {
  "25-50":   { 9.5: 207, 12.5: 199, 19: 190, 25: 179, 37.5: 166, 50: 154, 75: 130, 150: 113 },
  "75-100":  { 9.5: 228, 12.5: 216, 19: 205, 25: 193, 37.5: 181, 50: 169, 75: 145, 150: 124 },
  "150-175": { 9.5: 243, 12.5: 228, 19: 216, 25: 202, 37.5: 190, 50: 178, 75: 160, 150: 154 },
};
// Nota: para slump > 175, ACI recomenda SP ou redosagem

/**
 * Tabela 6.3.3 — Ar incorporado médio típico (%)
 * Sem aditivo incorporador de ar
 */
const AR_APRISIONADO_ACI: Record<number, number> = {
  9.5: 3.0, 12.5: 2.5, 19: 2.0, 25: 1.5, 37.5: 1.0, 50: 0.5, 75: 0.3, 150: 0.2,
};

/**
 * Tabela 6.3.4(a) — Relação a/c por resistência (fc28) sem ar incorporado
 * Interpolação linear entre pontos. fc28 em MPa, a/c adimensional.
 */
const AC_POR_RESISTENCIA: Array<{ fc28: number; ac: number }> = [
  { fc28: 45, ac: 0.38 },
  { fc28: 40, ac: 0.42 },
  { fc28: 35, ac: 0.47 },
  { fc28: 30, ac: 0.54 },
  { fc28: 25, ac: 0.61 },
  { fc28: 20, ac: 0.69 },
  { fc28: 15, ac: 0.79 },
];

/**
 * Tabela 6.3.6 — Volume de agregado graúdo compactado (b/b₀)
 * por DMC e módulo de finura da areia
 */
const BB0_TABLE: Record<number, Record<string, number>> = {
  9.5:  { "2.40": 0.50, "2.60": 0.48, "2.80": 0.46, "3.00": 0.44 },
  12.5: { "2.40": 0.59, "2.60": 0.57, "2.80": 0.55, "3.00": 0.53 },
  19:   { "2.40": 0.66, "2.60": 0.64, "2.80": 0.62, "3.00": 0.60 },
  25:   { "2.40": 0.71, "2.60": 0.69, "2.80": 0.67, "3.00": 0.65 },
  37.5: { "2.40": 0.75, "2.60": 0.73, "2.80": 0.71, "3.00": 0.69 },
  50:   { "2.40": 0.78, "2.60": 0.76, "2.80": 0.74, "3.00": 0.72 },
  75:   { "2.40": 0.82, "2.60": 0.80, "2.80": 0.78, "3.00": 0.76 },
  150:  { "2.40": 0.87, "2.60": 0.85, "2.80": 0.83, "3.00": 0.81 },
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface InputACI211 {
  /** Resistência média de dosagem alvo — MPa (fcj ou fcr) */
  fcrMPa: number;
  /** Slump desejado — mm */
  slumpMm: number;
  /** DMC do agregado graúdo — mm */
  dmcMm: number;
  /** Módulo de finura do agregado miúdo */
  mfAreia: number;
  /** Massa específica do cimento — t/m³ */
  densidadeCimentoTm3: number;
  /** Massa específica do agregado miúdo — t/m³ */
  densidadeAreiaTm3: number;
  /** Massa específica do agregado graúdo — t/m³ */
  densidadeBritaTm3: number;
  /** Massa unitária compactada do graúdo — t/m³ */
  muCompactadaBritaTm3: number;
  /** Relação a/c máxima por durabilidade (opcional) */
  acMaxDurabilidade?: number;
  /** Usar ar incorporado? */
  arIncorporado?: boolean;
}

export interface ResultadoACI211 {
  metodo: "ACI 211.1";
  /** Água de amassamento estimada — kg/m³ */
  aguaKgM3: number;
  /** Ar aprisionado — % */
  arPercent: number;
  /** Relação a/c adotada */
  acAdotado: number;
  /** a/c por resistência (tabela) */
  acResistencia: number;
  /** a/c por durabilidade (se fornecido) */
  acDurabilidade: number | null;
  /** Consumo de cimento — kg/m³ */
  consumoCimentoKgM3: number;
  /** Volume de graúdo compactado (b/b₀) */
  bb0: number;
  /** Massa de graúdo — kg/m³ */
  massaBritaKgM3: number;
  /** Massa de areia — kg/m³ */
  massaAreiaKgM3: number;
  /** Resumo de volumes absolutos (L) */
  volumes: {
    cimentoL: number;
    aguaL: number;
    arL: number;
    britaL: number;
    areiaL: number;
    totalL: number;
  };
  /** Traço unitário em massa (1 : a : p) */
  tracoUnitario: { cimento: 1; areia: number; brita: number; ac: number };
  etapas: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Interpolar linearmente em tabela ordenada decrescente de fc28 */
function interpolarAcPorResistencia(fcr: number): number {
  if (fcr >= AC_POR_RESISTENCIA[0].fc28) return AC_POR_RESISTENCIA[0].ac;
  if (fcr <= AC_POR_RESISTENCIA[AC_POR_RESISTENCIA.length - 1].fc28)
    return AC_POR_RESISTENCIA[AC_POR_RESISTENCIA.length - 1].ac;

  for (let i = 0; i < AC_POR_RESISTENCIA.length - 1; i++) {
    const hi = AC_POR_RESISTENCIA[i];
    const lo = AC_POR_RESISTENCIA[i + 1];
    if (fcr <= hi.fc28 && fcr >= lo.fc28) {
      const t = (fcr - lo.fc28) / (hi.fc28 - lo.fc28);
      return lo.ac + t * (hi.ac - lo.ac);
    }
  }
  return 0.50; // fallback
}

/** Encontrar DMC mais próximo nas tabelas */
function dmcMaisProximo(dmc: number): number {
  const chaves = [9.5, 12.5, 19, 25, 37.5, 50, 75, 150];
  let melhor = chaves[0];
  let menorDiff = Math.abs(dmc - melhor);
  for (const k of chaves) {
    const diff = Math.abs(dmc - k);
    if (diff < menorDiff) { melhor = k; menorDiff = diff; }
  }
  return melhor;
}

/** Interpolar b/b₀ por MF da areia */
function interpolarBb0(dmc: number, mf: number): number {
  const row = BB0_TABLE[dmc];
  if (!row) return 0.62; // fallback
  const mfs = Object.keys(row).map(Number).sort((a, b) => a - b);
  if (mf <= mfs[0]) return row[mfs[0].toFixed(2)];
  if (mf >= mfs[mfs.length - 1]) return row[mfs[mfs.length - 1].toFixed(2)];
  for (let i = 0; i < mfs.length - 1; i++) {
    if (mf >= mfs[i] && mf <= mfs[i + 1]) {
      const t = (mf - mfs[i]) / (mfs[i + 1] - mfs[i]);
      return row[mfs[i].toFixed(2)] + t * (row[mfs[i + 1].toFixed(2)] - row[mfs[i].toFixed(2)]);
    }
  }
  return 0.62;
}

/** Estimar água de amassamento para slump e DMC */
function estimarAgua(slumpMm: number, dmcKey: number): number {
  // Determinar faixa de slump
  let faixa: string;
  if (slumpMm <= 50) faixa = "25-50";
  else if (slumpMm <= 100) faixa = "75-100";
  else faixa = "150-175";

  const row = AGUA_SEM_AR[faixa];
  if (!row) return 195;
  return row[dmcKey] ?? 195;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function calcularACI211(input: InputACI211): ResultadoACI211 {
  const etapas: string[] = [];
  const dmcKey = dmcMaisProximo(input.dmcMm);

  // ETAPA 1 — Slump já fornecido pelo input
  etapas.push(`Etapa 1: Slump alvo = ${input.slumpMm} mm`);

  // ETAPA 2 — DMC
  etapas.push(`Etapa 2: DMC agregado graúdo = ${input.dmcMm} mm (tabela: ${dmcKey} mm)`);

  // ETAPA 3 — Água de amassamento + ar
  const aguaKgM3 = estimarAgua(input.slumpMm, dmcKey);
  const arPercent = AR_APRISIONADO_ACI[dmcKey] ?? 2.0;
  etapas.push(`Etapa 3: Água = ${aguaKgM3} kg/m³, Ar aprisionado = ${arPercent}%`);

  // ETAPA 4 — Relação a/c
  const acResistencia = interpolarAcPorResistencia(input.fcrMPa);
  const acDurabilidade = input.acMaxDurabilidade ?? null;
  const acAdotado = acDurabilidade !== null
    ? Math.min(acResistencia, acDurabilidade)
    : acResistencia;
  etapas.push(
    `Etapa 4: a/c por resistência = ${r2(acResistencia)}, ` +
    `a/c por durabilidade = ${acDurabilidade !== null ? r2(acDurabilidade) : "N/A"}, ` +
    `a/c adotado = ${r2(acAdotado)}`
  );

  // ETAPA 5 — Consumo de cimento
  const consumoCimentoKgM3 = r1(aguaKgM3 / acAdotado);
  etapas.push(`Etapa 5: Consumo de cimento = ${aguaKgM3} / ${r2(acAdotado)} = ${consumoCimentoKgM3} kg/m³`);

  // ETAPA 6 — Volume de agregado graúdo (b/b₀)
  const bb0 = interpolarBb0(dmcKey, input.mfAreia);
  const massaBritaKgM3 = r1(bb0 * input.muCompactadaBritaTm3 * 1000);
  etapas.push(`Etapa 6: b/b₀ = ${r2(bb0)}, Massa graúdo = ${massaBritaKgM3} kg/m³`);

  // ETAPA 7 — Volume de areia (por volumes absolutos)
  const volCimento = consumoCimentoKgM3 / (input.densidadeCimentoTm3 * 1000);
  const volAgua    = aguaKgM3 / 1000;
  const volAr      = arPercent / 100;
  const volBrita   = massaBritaKgM3 / (input.densidadeBritaTm3 * 1000);
  const volAreia   = 1.0 - volCimento - volAgua - volAr - volBrita;
  const massaAreiaKgM3 = r1(volAreia * input.densidadeAreiaTm3 * 1000);
  etapas.push(
    `Etapa 7: Volume areia = ${r2(volAreia * 1000)} L/m³, Massa areia = ${massaAreiaKgM3} kg/m³`
  );

  // Volumes em litros
  const volumes = {
    cimentoL: r1(volCimento * 1000),
    aguaL:    r1(volAgua * 1000),
    arL:      r1(volAr * 1000),
    britaL:   r1(volBrita * 1000),
    areiaL:   r1(volAreia * 1000),
    totalL:   r1((volCimento + volAgua + volAr + volBrita + volAreia) * 1000),
  };

  // Traço unitário
  const tracoUnitario = {
    cimento: 1 as const,
    areia: r2(massaAreiaKgM3 / consumoCimentoKgM3),
    brita: r2(massaBritaKgM3 / consumoCimentoKgM3),
    ac:    r2(acAdotado),
  };

  return {
    metodo: "ACI 211.1",
    aguaKgM3,
    arPercent,
    acAdotado: r2(acAdotado),
    acResistencia: r2(acResistencia),
    acDurabilidade: acDurabilidade !== null ? r2(acDurabilidade) : null,
    consumoCimentoKgM3,
    bb0: r2(bb0),
    massaBritaKgM3,
    massaAreiaKgM3,
    volumes,
    tracoUnitario,
    etapas,
  };
}
