/**
 * @file lib/abcp.ts
 * @description Motor de Dosagem ABCP (Associação Brasileira de Cimento Portland)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MÉTODO ABCP — Dosagem de Concreto de Cimento Portland
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Método tabelar brasileiro baseado no ACI 211.1, adaptado para:
 *   - Cimentos brasileiros (CP I a CP V)
 *   - Agregados nacionais
 *   - Normas NBR 6118 e NBR 12655
 *
 * Etapas:
 *   1. Fixar sd e fator t → fcj = fck + 1.65 × sd
 *   2. Determinar a/c pela curva de Abrams (tabela ABCP) ou calibrada
 *   3. Limitar a/c pela classe de agressividade (NBR 6118)
 *   4. Estimar água de amassamento (tabela ABCP)
 *   5. Calcular consumo de cimento C = água / (a/c)
 *   6. Verificar consumo mínimo (NBR 12655)
 *   7. Calcular volume de agregado graúdo (Vc)
 *   8. Calcular volume e massa de areia (fechamento 1000 L)
 *
 * Referências:
 *   [1] Rodrigues, P.P.F. "Dosagem dos Concretos de Cimento Portland". ABCP, 1984.
 *   [2] Mehta, P.K. & Monteiro, P.J.M. "Concrete". 4th Ed., 2014.
 *   [3] NBR 6118:2023 — Projeto de estruturas de concreto.
 *   [4] NBR 12655:2022 — Preparo e controle de concreto.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// TABELAS ABCP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tabela — Água de amassamento aproximada (kg/m³) — sem ar incorporado
 * Índices: [slumpFaixa][dmcMm]
 * Fonte: Rodrigues (1984), Tab. 4
 */
const AGUA_ABCP: Record<string, Record<number, number>> = {
  "40-60":   { 9.5: 220, 19: 195, 25: 187, 32: 177, 38: 170 },
  "60-80":   { 9.5: 228, 19: 203, 25: 195, 32: 185, 38: 178 },
  "80-100":  { 9.5: 236, 19: 211, 25: 200, 32: 192, 38: 184 },
  "100-120": { 9.5: 244, 19: 219, 25: 208, 32: 198, 38: 190 },
  "120-160": { 9.5: 252, 19: 227, 25: 216, 32: 205, 38: 197 },
  "160-200": { 9.5: 260, 19: 235, 25: 224, 32: 213, 38: 204 },
};

/**
 * Tabela — Relação a/c por resistência (curva ABCP para CP de resistência 32+ MPa)
 * fcj em MPa → a/c
 * Fonte: ABCP, gráfico de dosagem (interpolação linear entre pontos)
 */
const AC_ABCP_RESISTENCIA: Array<{ fcj: number; ac: number }> = [
  { fcj: 50, ac: 0.33 },
  { fcj: 45, ac: 0.37 },
  { fcj: 40, ac: 0.42 },
  { fcj: 35, ac: 0.47 },
  { fcj: 30, ac: 0.52 },
  { fcj: 25, ac: 0.58 },
  { fcj: 20, ac: 0.65 },
  { fcj: 15, ac: 0.75 },
  { fcj: 10, ac: 0.88 },
];

/**
 * a/c máximo por classe de agressividade — NBR 6118:2023 Tab 7.1
 */
const AC_MAX_DURABILIDADE: Record<string, number> = {
  "CAA-I":   0.65,
  "CAA-II":  0.60,
  "CAA-III": 0.55,
  "CAA-IV":  0.45,
};

/**
 * Consumo mínimo de cimento — NBR 12655:2022 Tab 4
 */
const CONSUMO_MINIMO: Record<string, number> = {
  "CAA-I":   260,
  "CAA-II":  280,
  "CAA-III": 320,
  "CAA-IV":  360,
};

/**
 * Volume de agregado graúdo compactado por DMC e MF da areia
 * Fonte: ABCP, Tab. 5 (análoga a ACI 211.1 Tab 6.3.6)
 */
const VC_ABCP: Record<number, Record<string, number>> = {
  9.5:  { "2.20": 0.53, "2.40": 0.51, "2.60": 0.49, "2.80": 0.47, "3.00": 0.45 },
  19:   { "2.20": 0.68, "2.40": 0.66, "2.60": 0.64, "2.80": 0.62, "3.00": 0.60 },
  25:   { "2.20": 0.73, "2.40": 0.71, "2.60": 0.69, "2.80": 0.67, "3.00": 0.65 },
  32:   { "2.20": 0.77, "2.40": 0.75, "2.60": 0.73, "2.80": 0.71, "3.00": 0.69 },
  38:   { "2.20": 0.80, "2.40": 0.78, "2.60": 0.76, "2.80": 0.74, "3.00": 0.72 },
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface InputABCP {
  /** fck alvo — MPa */
  fckMPa: number;
  /** Desvio padrão de campo — MPa */
  sdMPa: number;
  /** Slump desejado — mm */
  slumpMm: number;
  /** DMC do agregado graúdo — mm */
  dmcMm: number;
  /** MF da areia */
  mfAreia: number;
  /** Massa específica do cimento — t/m³ */
  densidadeCimentoTm3: number;
  /** Massa específica da areia — t/m³ */
  densidadeAreiaTm3: number;
  /** Massa específica da brita — t/m³ */
  densidadeBritaTm3: number;
  /** Massa unitária compactada do graúdo — t/m³ */
  muCompactadaBritaTm3: number;
  /** Classe de agressividade — NBR 6118 */
  classeAgressividade: "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV";
}

export interface ResultadoABCP {
  metodo: "ABCP";
  /** fcj calculado — MPa */
  fcjMPa: number;
  /** Água de amassamento — kg/m³ */
  aguaKgM3: number;
  /** a/c por resistência */
  acResistencia: number;
  /** a/c máximo por durabilidade */
  acDurabilidade: number;
  /** a/c adotado (mínimo dos dois) */
  acAdotado: number;
  /** Consumo de cimento — kg/m³ */
  consumoCimentoKgM3: number;
  /** Consumo mínimo NBR — kg/m³ */
  consumoMinimoNBR: number;
  /** Cimento foi corrigido pelo mínimo? */
  cimentoCorrigido: boolean;
  /** Volume compactado de brita (Vc) */
  vc: number;
  /** Massa de brita — kg/m³ */
  massaBritaKgM3: number;
  /** Massa de areia — kg/m³ */
  massaAreiaKgM3: number;
  /** Volumes absolutos */
  volumes: {
    cimentoL: number;
    aguaL: number;
    arL: number;
    britaL: number;
    areiaL: number;
    totalL: number;
  };
  /** Traço unitário em massa */
  tracoUnitario: { cimento: 1; areia: number; brita: number; ac: number };
  etapas: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

function interpolarAcResistencia(fcj: number): number {
  const tab = AC_ABCP_RESISTENCIA;
  if (fcj >= tab[0].fcj) return tab[0].ac;
  if (fcj <= tab[tab.length - 1].fcj) return tab[tab.length - 1].ac;
  for (let i = 0; i < tab.length - 1; i++) {
    if (fcj <= tab[i].fcj && fcj >= tab[i + 1].fcj) {
      const t = (fcj - tab[i + 1].fcj) / (tab[i].fcj - tab[i + 1].fcj);
      return tab[i + 1].ac + t * (tab[i].ac - tab[i + 1].ac);
    }
  }
  return 0.50;
}

function dmcMaisProximoABCP(dmc: number): number {
  const chaves = [9.5, 19, 25, 32, 38];
  let melhor = chaves[0];
  let diff = Math.abs(dmc - melhor);
  for (const k of chaves) {
    if (Math.abs(dmc - k) < diff) { melhor = k; diff = Math.abs(dmc - k); }
  }
  return melhor;
}

function estimarAguaABCP(slumpMm: number, dmcKey: number): number {
  const faixas: Array<{ min: number; max: number; key: string }> = [
    { min: 0,   max: 60,  key: "40-60" },
    { min: 60,  max: 80,  key: "60-80" },
    { min: 80,  max: 100, key: "80-100" },
    { min: 100, max: 120, key: "100-120" },
    { min: 120, max: 160, key: "120-160" },
    { min: 160, max: 250, key: "160-200" },
  ];
  const faixa = faixas.find(f => slumpMm >= f.min && slumpMm < f.max) ?? faixas[2];
  const row = AGUA_ABCP[faixa.key];
  return row?.[dmcKey] ?? 200;
}

function interpolarVc(dmcKey: number, mf: number): number {
  const row = VC_ABCP[dmcKey];
  if (!row) return 0.62;
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

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function calcularABCP(input: InputABCP): ResultadoABCP {
  const etapas: string[] = [];
  const dmcKey = dmcMaisProximoABCP(input.dmcMm);

  // ETAPA 1 — fcj = fck + 1.65 × sd
  const fcjMPa = r1(input.fckMPa + 1.65 * input.sdMPa);
  etapas.push(`Etapa 1: fcj = ${input.fckMPa} + 1.65 × ${input.sdMPa} = ${fcjMPa} MPa`);

  // ETAPA 2 — a/c por resistência
  const acResistencia = interpolarAcResistencia(fcjMPa);
  etapas.push(`Etapa 2: a/c por resistência (Tab. ABCP) = ${r2(acResistencia)}`);

  // ETAPA 3 — a/c por durabilidade
  const acDurabilidade = AC_MAX_DURABILIDADE[input.classeAgressividade] ?? 0.65;
  const acAdotado = Math.min(acResistencia, acDurabilidade);
  etapas.push(
    `Etapa 3: a/c por durabilidade (${input.classeAgressividade}) = ${r2(acDurabilidade)}, ` +
    `a/c adotado = ${r2(acAdotado)}`
  );

  // ETAPA 4 — Água de amassamento
  const aguaKgM3 = estimarAguaABCP(input.slumpMm, dmcKey);
  etapas.push(`Etapa 4: Água = ${aguaKgM3} kg/m³ (slump ${input.slumpMm}mm, DMC ${dmcKey}mm)`);

  // ETAPA 5 — Consumo de cimento
  let consumoCimentoKgM3 = r1(aguaKgM3 / acAdotado);
  const consumoMinimoNBR = CONSUMO_MINIMO[input.classeAgressividade] ?? 280;
  let cimentoCorrigido = false;
  etapas.push(`Etapa 5: C = ${aguaKgM3} / ${r2(acAdotado)} = ${consumoCimentoKgM3} kg/m³`);

  // ETAPA 6 — Verificar mínimo
  if (consumoCimentoKgM3 < consumoMinimoNBR) {
    cimentoCorrigido = true;
    consumoCimentoKgM3 = consumoMinimoNBR;
    etapas.push(`Etapa 6: Consumo corrigido para mínimo NBR = ${consumoMinimoNBR} kg/m³`);
  } else {
    etapas.push(`Etapa 6: Consumo OK ≥ ${consumoMinimoNBR} kg/m³`);
  }

  // ETAPA 7 — Volume de agregado graúdo
  const vc = interpolarVc(dmcKey, input.mfAreia);
  const massaBritaKgM3 = r1(vc * input.muCompactadaBritaTm3 * 1000);
  etapas.push(`Etapa 7: Vc = ${r2(vc)}, Massa brita = ${massaBritaKgM3} kg/m³`);

  // ETAPA 8 — Volume de areia (fechamento 1000 L)
  const arPercent = 1.5; // ar aprisionado estimado ABCP
  const volCimento = consumoCimentoKgM3 / (input.densidadeCimentoTm3 * 1000);
  const volAgua    = aguaKgM3 / 1000;
  const volAr      = arPercent / 100;
  const volBrita   = massaBritaKgM3 / (input.densidadeBritaTm3 * 1000);
  const volAreia   = 1.0 - volCimento - volAgua - volAr - volBrita;
  const massaAreiaKgM3 = r1(volAreia * input.densidadeAreiaTm3 * 1000);
  etapas.push(`Etapa 8: Areia = ${massaAreiaKgM3} kg/m³ (fechamento volumétrico)`);

  const volumes = {
    cimentoL: r1(volCimento * 1000),
    aguaL:    r1(volAgua * 1000),
    arL:      r1(volAr * 1000),
    britaL:   r1(volBrita * 1000),
    areiaL:   r1(volAreia * 1000),
    totalL:   r1((volCimento + volAgua + volAr + volBrita + volAreia) * 1000),
  };

  const tracoUnitario = {
    cimento: 1 as const,
    areia: r2(massaAreiaKgM3 / consumoCimentoKgM3),
    brita: r2(massaBritaKgM3 / consumoCimentoKgM3),
    ac: r2(acAdotado),
  };

  return {
    metodo: "ABCP",
    fcjMPa,
    aguaKgM3,
    acResistencia: r2(acResistencia),
    acDurabilidade: r2(acDurabilidade),
    acAdotado: r2(acAdotado),
    consumoCimentoKgM3,
    consumoMinimoNBR,
    cimentoCorrigido,
    vc: r2(vc),
    massaBritaKgM3,
    massaAreiaKgM3,
    volumes,
    tracoUnitario,
    etapas,
  };
}
