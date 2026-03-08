import { describe, it, expect } from "vitest";
import { runVerticalPipeline, runPipeline } from "./pipeline";

describe("Validacao cientifica e2e — ABESC demo", () => {
  // ─────────────────────────────────────────────────────────
  // CASO 1: Compensa vertical — CP V ARI 350 kg/m³, a/c 0.45, CSA-K 25 kg/m³
  // ─────────────────────────────────────────────────────────
  it("CASO 1: Compensa vertical — retração compensada com CSA-K", () => {
    const input = {
      vertical: "compensa" as const,
      data: {
        cimentoType: "CP V ARI",
        fck: 35,
        ac: 0.45,
        slump: 200,
        consumoCimento: 350,
        consumoAgua: 157.5,
        consumoAreia: 750,
        consumoBrita: 950,
        agenteExpansivo: "CSA-K" as const,
        teorAgente: 25,
      },
    };

    const packet = runVerticalPipeline(input);

    // compensa
    expect(packet.compensa).toBeDefined();
    expect(typeof packet.compensa!.balancoCRC).toBe("number");
    expect(packet.compensa!.expansaoEsperada).toBeGreaterThan(0);
    expect(packet.compensa!.retracaoEstimada).toBeLessThan(0);
    expect(typeof packet.compensa!.retracaoEstimada).toBe("number");
    expect(["OK", "RISCO", "CRITICO"]).toContain(packet.compensa!.status);
    expect(typeof packet.compensa!.agenteExpansivo).toBe("string");
    expect(Math.round(packet.compensa!.teorAgente)).toBe(25);

    // ecorisk
    expect(packet.ecorisk).toBeDefined();
    expect(packet.ecorisk!.score).toBeGreaterThanOrEqual(0);
    expect(packet.ecorisk!.score).toBeLessThanOrEqual(100);
    expect(["BAIXO", "MEDIO", "ALTO", "CRITICO"]).toContain(
      packet.ecorisk!.nivel
    );

    // aion
    expect(packet.aion).toBeDefined();
    expect(packet.aion!.fcPredito).toBeGreaterThan(0);
    expect(packet.aion!.confianca).toBeGreaterThanOrEqual(0);
    expect(packet.aion!.confianca).toBeLessThanOrEqual(1);

    // nivelix
    expect(packet.nivelix).toBeDefined();

    // mix
    expect(packet.mix.consumoCimento).toBe(350);
    expect(packet.mix.ac).toBe(0.45);
  });

  // ─────────────────────────────────────────────────────────
  // CASO 2: Densus vertical — Fuller dmax 19mm
  // ─────────────────────────────────────────────────────────
  it("CASO 2: Densus vertical — empacotamento Fuller dmax 19mm", () => {
    const input = {
      vertical: "densus" as const,
      data: {
        cimentoType: "CP V ARI",
        fck: 35,
        ac: 0.45,
        slump: 200,
        consumoCimento: 350,
        consumoAgua: 157.5,
        consumoAreia: 750,
        consumoBrita: 950,
        metodoGranulometria: "Fuller" as const,
        dmax: 19,
        precos: { cimento: 0.5, areia: 0.08, brita: 0.1 },
      },
    };

    const packet = runVerticalPipeline(input);

    // densus
    expect(packet.densus).toBeDefined();
    expect(packet.densus!.tracaoUnitario.cimento).toBe(1);
    expect(packet.densus!.tracaoUnitario.areia).toBeGreaterThan(0);
    expect(packet.densus!.tracaoUnitario.brita).toBeGreaterThan(0);

    // volumes — soma ~1000 dm³/m³ (ar entranhado reduz, tolerancia ±100)
    expect(packet.densus!.volumes.total).toBeGreaterThanOrEqual(900);
    expect(packet.densus!.volumes.total).toBeLessThanOrEqual(1050);

    // granulometria
    expect(packet.densus!.granulometria.metodo).toBe("Fuller");
    expect(packet.densus!.granulometria.curva.length).toBeGreaterThan(0);

    // custo
    expect(packet.densus!.custo).toBeDefined();
    expect(packet.densus!.custo!.total).toBeGreaterThan(0);

    // aion
    expect(packet.aion).toBeDefined();

    // ecorisk
    expect(packet.ecorisk).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────
  // CASO 3: Nivelix vertical — argamassa autonivelante
  // ─────────────────────────────────────────────────────────
  it("CASO 3: Nivelix vertical — argamassa autonivelante com fibra PP", () => {
    const input = {
      vertical: "nivelix" as const,
      data: {
        cimentoType: "CP V ARI",
        fck: 40,
        ac: 0.4,
        consumoCimento: 450,
        consumoAgua: 180,
        consumoAreiaFina: 700,
        consumoAreiaMedia: 200,
        consumoFiller: 100,
        agenteExpansivo: "CSA-K" as const,
        teorAgente: 20,
        adicaoMineral: "SILICA_ATIVA" as const,
        teorAdicaoMineral: 30,
        temFibra: true,
        tipoFibra: "PP" as const,
        teorFibra: 1.5,
        superplastificante: 0.8,
        incorporadorAr: 0.05,
        espalhamentoAlvo: 220,
      },
    };

    const packet = runVerticalPipeline(input);

    // nivelix
    expect(packet.nivelix).toBeDefined();
    expect(packet.nivelix!.espalhamento).toBeGreaterThanOrEqual(50);
    expect(packet.nivelix!.espalhamento).toBeLessThanOrEqual(350);
    expect(packet.nivelix!.viscosidadePlastica).toBeGreaterThan(0);
    expect(packet.nivelix!.tensaoEscoamento).toBeGreaterThanOrEqual(0);

    // modulo acustico — temFibra=true, deve ter valor
    expect(packet.nivelix!.moduloAcustico).toBeDefined();

    // status
    expect(["OK", "RISCO", "CRITICO"]).toContain(packet.nivelix!.status);

    // compensa (tem CSA-K)
    expect(packet.compensa).toBeDefined();

    // aion
    expect(packet.aion).toBeDefined();

    // ecorisk
    expect(packet.ecorisk).toBeDefined();

    // argamassa nao tem brita
    expect(packet.mix.consumoBrita).toBe(0);
  });

  // ─────────────────────────────────────────────────────────
  // CASO 4: Ecorisk vertical — avaliacao de risco
  // ─────────────────────────────────────────────────────────
  it("CASO 4: Ecorisk vertical — avaliacao completa de risco", () => {
    const input = {
      vertical: "ecorisk" as const,
      data: {
        tipoMaterial: "CONCRETO" as const,
        cimentoType: "CP V ARI",
        fck: 35,
        ac: 0.45,
        slump: 200,
        consumoCimento: 350,
        consumoAgua: 157.5,
        consumoAreia: 750,
        consumoBrita: 950,
        agenteExpansivo: "CSA-K" as const,
        teorAgente: 25,
      },
    };

    const packet = runVerticalPipeline(input);

    // ecorisk
    expect(packet.ecorisk).toBeDefined();
    expect(packet.ecorisk!.score).toBeGreaterThanOrEqual(0);
    expect(packet.ecorisk!.score).toBeLessThanOrEqual(100);
    expect(["BAIXO", "MEDIO", "ALTO", "CRITICO"]).toContain(
      packet.ecorisk!.nivel
    );
    expect(Array.isArray(packet.ecorisk!.fatores)).toBe(true);
    expect(Array.isArray(packet.ecorisk!.recomendacoes)).toBe(true);
    expect(packet.ecorisk!.recomendacoes.length).toBeGreaterThan(0);

    // aion
    expect(packet.aion).toBeDefined();

    // compensa (tem CSA-K)
    expect(packet.compensa).toBeDefined();
  });
});
