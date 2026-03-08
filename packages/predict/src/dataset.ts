import type { AmostraConcreto } from "./types"

// Constantes de Abrams por tipo de cimento (literatura brasileira)
// fc28 = k1 / k2^(a/c) — Ref: Mehta & Monteiro, Petrucci
const CIMENTOS: Record<string, { k1: number; k2: number }> = {
  "CP V ARI": { k1: 150, k2: 14 },
  "CP II-F":  { k1: 130, k2: 14 },
  "CP II-E":  { k1: 125, k2: 14 },
  "CP IV":    { k1: 110, k2: 14 },
}

// Fatores de correção por idade (base = 28 dias)
const FATOR_IDADE: Record<number, number> = {
  7:  0.65,
  14: 0.85,
  28: 1.00,
  56: 1.10,
}

// PRNG determinístico (Mulberry32) para reprodutibilidade
function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box-Muller para ruído gaussiano
function gaussiano(rand: () => number, media: number, desvio: number): number {
  const u1 = rand()
  const u2 = rand()
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2)
  return media + z * desvio
}

function gerarDataset(): AmostraConcreto[] {
  const rand = mulberry32(42)
  const amostras: AmostraConcreto[] = []

  const acRange = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]
  const tipos = Object.keys(CIMENTOS)
  const idades = [7, 14, 28]
  const silicaRange = [0, 0.08, 0.10]
  const slumpRange = [60, 100, 160, 220]

  for (const ac of acRange) {
    for (const tipo of tipos) {
      for (const idade of idades) {
        for (const silica of silicaRange) {
          // Selecionar slump aleatório para diversificar
          const slump = slumpRange[Math.floor(rand() * slumpRange.length)]!

          const { k1, k2 } = CIMENTOS[tipo]!

          // Lei de Abrams base: fc28 = k1 / k2^ac
          let fc28 = k1 / Math.pow(k2, ac)

          // Fator sílica ativa (+15% por 10% de adição, proporcional)
          if (silica > 0) {
            fc28 *= 1 + (silica / 0.10) * 0.15
          }

          // Fator idade
          const fatorIdade = FATOR_IDADE[idade] ?? 1.0
          let fc = fc28 * fatorIdade

          // Consumo de cimento estimado (relação inversa com a/c)
          const agua = slump <= 100 ? 170 : slump <= 160 ? 185 : 200
          const consumoCimento = Math.round(agua / ac)

          // Ruído gaussiano ±8%
          fc = gaussiano(rand, fc, fc * 0.08)
          fc = Math.max(5, Math.round(fc * 10) / 10)

          amostras.push({
            ac,
            consumoCimento,
            cimentoType: tipo,
            slump: slump as number,
            idadeDias: idade,
            silicaAtiva: silica > 0 ? silica : undefined,
            fcMedido: fc,
          })
        }
      }
    }
  }

  // Retornar exatamente 200 amostras (truncar ou completar)
  return amostras.slice(0, 200)
}

export const DATASET: AmostraConcreto[] = gerarDataset()
