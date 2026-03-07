// Densus Engine — Lei de Abrams e inversão a/c

/**
 * Lei de Abrams (forma exponencial):
 * fc = A / B^(a/c)
 */
export function calcAbrams(ac: number, A: number, B: number): number {
  return A / Math.pow(B, ac)
}

/**
 * Lei de Abrams (forma potência):
 * fc = A × (a/c)^(-B)
 */
export function calcAbramsPotencia(ac: number, A: number, B: number): number {
  return A * Math.pow(ac, -B)
}

/**
 * Inverso da Lei de Abrams — dado fc alvo, retorna a/c necessário
 * Forma exponencial: a/c = log(A/fc) / log(B)
 * Forma potência:    a/c = (fc/A)^(-1/B)
 */
export function calcAcInverso(
  fcAlvo: number,
  A: number,
  B: number,
  forma: "exponencial" | "potencia" = "exponencial"
): number {
  if (forma === "potencia") {
    return Math.pow(fcAlvo / A, -1 / B)
  }
  return Math.log(A / fcAlvo) / Math.log(B)
}
