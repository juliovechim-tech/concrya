/**
 * @file lib/relatorio-pdf.ts
 * @description Geração de relatórios PDF no padrão ABNT para Core Mix Pro.
 * Usa jsPDF + jspdf-autotable para layout tabular técnico.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

interface LinhaComposicao {
  descricao: string;
  massaKgM3: number;
  volumeLM3: number;
  custoReaisM3: number;
  co2KgM3: number;
}

interface VerificacaoTecnica {
  parametro: string;
  valorCalculado: number | string;
  limiteNorma: number | string;
  normaReferencia: string;
  aprovado: boolean;
}

interface TracoTeoricoData {
  meta: {
    obra?: string;
    responsavelTecnico?: string;
    dataEstudo?: string;
    fckMPa?: number;
    classeAgressividade?: string;
    norma?: string;
  };
  abrams: {
    fcjMPa: number;
    relacaoAc: { acAdotado: number; limitadoPelaNorma?: boolean };
    paramsRegressao: { A: number; B: number; r2: number };
    resistenciasPorIdade: Record<string, number>;
  };
  composicaoM3: {
    linhas: LinhaComposicao[];
    massaTotalKgM3: number;
    volumeTotalLM3: number;
    custoTotalReaisM3: number;
    co2TotalKgM3: number;
  };
  tracoUnitario: {
    cimento: 1;
    areias: { id: string; valor: number }[];
    britas: { id: string; valor: number }[];
    agua: number;
    aditivoSp?: number;
    scm?: number;
  };
  tracoCampo?: {
    cimentoKgM3: number;
    aguaBetoneiraMKgM3: number;
    agregados: { descricao: string; massaSecaKgM3: number; massaCampoKgM3: number; temCorrecaoUmidade: boolean }[];
    aditivoSpKgM3?: number;
    scmKgM3?: number;
    ajusteAguaKgM3: number;
  };
  verificacoes: VerificacaoTecnica[];
}

interface PesagemItem {
  descricao: string;
  massaKg1m3: number;
  massaKgBetoneira?: number;
  massaGrBetoneira: number;
  precisaoPesagem: string;
}

interface PilotoData {
  dimensionamentoCps: {
    lotes: {
      descricaoGeometria: string;
      quantidade: number;
      idadesRompimento: string[];
      volumeUnitarioDm3: number;
      volumeLoteSemPerdaL: number;
    }[];
    volumeTotalSemPerdaL: number;
    fatorPerda: number;
    volumeTotalComPerdaL: number;
    volumeBetoneira: number;
  };
  planilhaPesagem: {
    volumeBetoneira: number;
    fatorEscala: number;
    massaTotalBetoneira: number;
    planilha: PesagemItem[];
  };
  resumo: {
    totalCPs: number;
    volumeBetoneira: number;
    massaTotalKg: number;
  };
}

interface EmpacotamentoData {
  algoritmo: string;
  modeloCurva: string;
  funcaoObjetivo: string;
  nCombinacoes: number;
  tempoExecucaoMs: number;
  proporcoes: Record<string, number>;
  metricas: {
    rmse: number;
    eficiencia: number;
    teorVaziosPct?: number;
  };
  moduloFinuraMistura: number;
  dmcMisturaMm: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORES E CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const AMBER = [217, 119, 6] as const;    // #D97706
const SLATE_900 = [15, 23, 42] as const; // header bg
const SLATE_100 = [241, 245, 249] as const;
const WHITE = [255, 255, 255] as const;

const MARGIN = 20;
const PAGE_W = 210; // A4 mm
const CONTENT_W = PAGE_W - 2 * MARGIN;

function n(v: number | undefined | null, d = 2): string {
  return v != null ? v.toFixed(d) : "—";
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function addHeader(doc: jsPDF, titulo: string, subtitulo?: string) {
  const y = 15;
  // Amber bar
  doc.setFillColor(...AMBER);
  doc.rect(MARGIN, y, CONTENT_W, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("CORE MIX PRO", MARGIN + 4, y + 8);
  doc.setFontSize(9);
  doc.text(titulo, PAGE_W - MARGIN - 4, y + 8, { align: "right" });

  if (subtitulo) {
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(subtitulo, MARGIN + 4, y + 16);
  }
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Core Mix Pro · Densus Engine · Página ${i}/${pageCount}`,
      PAGE_W / 2,
      290,
      { align: "center" },
    );
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(MARGIN, 285, PAGE_W - MARGIN, 285);
  }
}

function sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AMBER);
  doc.text(text.toUpperCase(), MARGIN, y);
  doc.setDrawColor(...AMBER);
  doc.line(MARGIN, y + 1.5, MARGIN + CONTENT_W, y + 1.5);
  return y + 7;
}

function infoRow(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(label, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(value, MARGIN + 50, y);
  return y + 5;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 25;
  }
  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO 1: TRAÇO TEÓRICO
// ─────────────────────────────────────────────────────────────────────────────

export function gerarPdfTracoTeorico(data: TracoTeoricoData): void {
  const doc = new jsPDF("portrait", "mm", "a4");
  const meta = data.meta;

  addHeader(doc, "RELATÓRIO DE DOSAGEM", "Traço Teórico · Método IPT-EPUSP");

  // ── Dados do Projeto ──
  let y = 40;
  y = sectionTitle(doc, y, "Dados do Projeto");
  if (meta.obra) y = infoRow(doc, y, "Obra:", meta.obra);
  if (meta.responsavelTecnico) y = infoRow(doc, y, "Responsável:", meta.responsavelTecnico);
  if (meta.dataEstudo) y = infoRow(doc, y, "Data:", meta.dataEstudo);
  if (meta.fckMPa) y = infoRow(doc, y, "fck:", `${meta.fckMPa} MPa`);
  if (meta.classeAgressividade) y = infoRow(doc, y, "Classe Agress.:", meta.classeAgressividade);
  if (meta.norma) y = infoRow(doc, y, "Norma:", meta.norma);
  y += 3;

  // ── Resultados Abrams ──
  y = sectionTitle(doc, y, "Resultados — Lei de Abrams");
  y = infoRow(doc, y, "fcj (dosagem):", `${n(data.abrams.fcjMPa, 1)} MPa`);
  y = infoRow(doc, y, "a/c adotado:", n(data.abrams.relacaoAc.acAdotado, 3));
  if (data.abrams.relacaoAc.limitadoPelaNorma) {
    y = infoRow(doc, y, "Aviso:", "a/c limitado pela norma");
  }
  y = infoRow(doc, y, "Regressão r²:", n(data.abrams.paramsRegressao.r2, 4));
  y += 3;

  // ── Resistências por Idade ──
  const idades = data.abrams.resistenciasPorIdade;
  const idadeKeys = Object.keys(idades).filter((k) => idades[k] > 0);
  if (idadeKeys.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = sectionTitle(doc, y, "Resistências por Idade");
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Idade", "fc (MPa)"]],
      body: idadeKeys.map((k) => [
        k.replace("fc", "").replace("dMPa", "d"),
        n(idades[k], 1),
      ]),
      styles: { fontSize: 8, font: "helvetica", cellPadding: 2 },
      headStyles: { fillColor: [...SLATE_900], textColor: [...WHITE], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Composição 1m³ ──
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, y, "Composição para 1 m³");

  const comp = data.composicaoM3;
  const linhas = comp.linhas.filter(l => l.massaKgM3 > 0 || l.volumeLM3 > 0);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Material", "Massa (kg)", "Volume (L)", "Custo (R$)", "CO₂ (kg)"]],
    body: [
      ...linhas.map((l) => [l.descricao, n(l.massaKgM3, 1), n(l.volumeLM3, 1), n(l.custoReaisM3, 2), n(l.co2KgM3, 1)]),
      [
        { content: "TOTAL", styles: { fontStyle: "bold" as const } },
        { content: n(comp.massaTotalKgM3, 1), styles: { fontStyle: "bold" as const } },
        { content: n(comp.volumeTotalLM3, 1), styles: { fontStyle: "bold" as const } },
        { content: n(comp.custoTotalReaisM3, 2), styles: { fontStyle: "bold" as const } },
        { content: n(comp.co2TotalKgM3, 1), styles: { fontStyle: "bold" as const } },
      ],
    ],
    styles: { fontSize: 8, font: "helvetica", cellPadding: 2 },
    headStyles: { fillColor: [...SLATE_900], textColor: [...WHITE], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "grid",
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Traço Unitário ──
  y = checkPageBreak(doc, y, 15);
  y = sectionTitle(doc, y, "Traço Unitário");
  const tu = data.tracoUnitario;
  const parts: string[] = ["1"];
  for (const a of tu.areias) parts.push(n(a.valor, 2));
  for (const b of tu.britas) parts.push(n(b.valor, 2));
  const tracoStr = parts.join(" : ") + ` : a/c ${n(tu.agua, 2)}`;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(tracoStr, MARGIN, y);
  y += 8;

  // ── Traço de Campo ──
  if (data.tracoCampo) {
    y = checkPageBreak(doc, y, 30);
    y = sectionTitle(doc, y, "Traço de Campo (Umidade Corrigida)");
    const tc = data.tracoCampo;
    const campoRows: [string, string, string][] = [
      ["Cimento", n(tc.cimentoKgM3, 1), n(tc.cimentoKgM3, 1)],
      ["Água betoneira", "—", n(tc.aguaBetoneiraMKgM3, 1)],
      ...tc.agregados.map((ag): [string, string, string] => [
        ag.descricao + (ag.temCorrecaoUmidade ? " (úmida)" : ""),
        n(ag.massaSecaKgM3, 1),
        n(ag.massaCampoKgM3, 1),
      ]),
      ...(tc.aditivoSpKgM3 != null ? [["Aditivo SP", n(tc.aditivoSpKgM3, 2), n(tc.aditivoSpKgM3, 2)] as [string, string, string]] : []),
      ...(tc.scmKgM3 != null ? [["SCM", n(tc.scmKgM3, 1), n(tc.scmKgM3, 1)] as [string, string, string]] : []),
      ["Correção água", "", n(tc.ajusteAguaKgM3, 1)],
    ];
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Material", "Massa Seca (kg/m³)", "Massa Campo (kg/m³)"]],
      body: campoRows,
      styles: { fontSize: 8, font: "helvetica", cellPadding: 2 },
      headStyles: { fillColor: [...SLATE_900], textColor: [...WHITE], fontStyle: "bold" },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Verificações NBR 6118 ──
  if (data.verificacoes?.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = sectionTitle(doc, y, "Verificações Normativas");
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Parâmetro", "Calculado", "Limite", "Norma", "Status"]],
      body: data.verificacoes.map((v) => [
        v.parametro,
        String(v.valorCalculado),
        String(v.limiteNorma),
        v.normaReferencia,
        v.aprovado ? "✓ OK" : "✕ NC",
      ]),
      styles: { fontSize: 7.5, font: "helvetica", cellPadding: 2 },
      headStyles: { fillColor: [...SLATE_900], textColor: [...WHITE], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "grid",
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 4) {
          const val = data.cell.raw as string;
          data.cell.styles.textColor = val.includes("OK") ? [5, 150, 105] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  addFooter(doc);
  doc.save(`CoreMixPro_Traco_${meta.obra?.replace(/\s/g, "_") || "relatorio"}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO 2: ESCALONAMENTO PILOTO
// ─────────────────────────────────────────────────────────────────────────────

export function gerarPdfPiloto(data: PilotoData): void {
  const doc = new jsPDF("portrait", "mm", "a4");

  addHeader(doc, "PLANILHA DE PESAGEM", "Escalonamento Piloto · Dimensionamento CPs");

  // ── Resumo ──
  let y = 40;
  y = sectionTitle(doc, y, "Resumo");
  y = infoRow(doc, y, "Total CPs:", String(data.resumo.totalCPs));
  y = infoRow(doc, y, "Volume Betoneira:", `${n(data.planilhaPesagem.volumeBetoneira, 1)} L`);
  y = infoRow(doc, y, "Fator de Escala:", n(data.planilhaPesagem.fatorEscala, 6));
  y = infoRow(doc, y, "Massa Total:", `${n(data.resumo.massaTotalKg, 1)} kg`);
  y = infoRow(doc, y, "Fator de Perda:", `${n(data.dimensionamentoCps.fatorPerda * 100, 0)}%`);
  y += 3;

  // ── Dimensionamento CPs ──
  if (data.dimensionamentoCps.lotes.length > 0) {
    y = sectionTitle(doc, y, "Dimensionamento de Corpos de Prova");
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Geometria", "Qtd", "Idades", "Vol. Unit. (dm³)", "Vol. Lote (L)"]],
      body: data.dimensionamentoCps.lotes.map((l) => [
        l.descricaoGeometria,
        String(l.quantidade),
        l.idadesRompimento.join(", "),
        n(l.volumeUnitarioDm3, 3),
        n(l.volumeLoteSemPerdaL, 2),
      ]),
      styles: { fontSize: 8, font: "helvetica", cellPadding: 2 },
      headStyles: { fillColor: [...SLATE_900], textColor: [...WHITE], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Planilha de Pesagem ──
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, y, "Planilha de Pesagem");
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Material", "Massa 1m³ (kg)", "Massa Betoneira (g)", "Precisão"]],
    body: data.planilhaPesagem.planilha.map((p) => [
      p.descricao,
      n(p.massaKg1m3, 1),
      n(p.massaGrBetoneira, 1),
      p.precisaoPesagem,
    ]),
    styles: { fontSize: 8, font: "helvetica", cellPadding: 2 },
    headStyles: { fillColor: [...SLATE_900], textColor: [...WHITE], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "grid",
  });

  addFooter(doc);
  doc.save("CoreMixPro_Piloto_Pesagem.pdf");
}

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO 3: EMPACOTAMENTO
// ─────────────────────────────────────────────────────────────────────────────

export function gerarPdfEmpacotamento(data: EmpacotamentoData): void {
  const doc = new jsPDF("portrait", "mm", "a4");

  addHeader(doc, "RELATÓRIO DE EMPACOTAMENTO", "Otimização Granulométrica");

  // ── Parâmetros ──
  let y = 40;
  y = sectionTitle(doc, y, "Parâmetros da Otimização");
  y = infoRow(doc, y, "Modelo:", data.modeloCurva);
  y = infoRow(doc, y, "Algoritmo:", data.algoritmo);
  y = infoRow(doc, y, "Função Objetivo:", data.funcaoObjetivo);
  y = infoRow(doc, y, "Combinações:", data.nCombinacoes.toLocaleString("pt-BR"));
  y = infoRow(doc, y, "Tempo:", `${data.tempoExecucaoMs} ms`);
  y += 3;

  // ── Métricas ──
  y = sectionTitle(doc, y, "Métricas do Resultado");
  y = infoRow(doc, y, "RMSE:", n(data.metricas.rmse, 4));
  y = infoRow(doc, y, "Eficiência:", n(data.metricas.eficiencia, 4));
  y = infoRow(doc, y, "DMC Mistura:", `${n(data.dmcMisturaMm, 2)} mm`);
  y = infoRow(doc, y, "Módulo Finura:", n(data.moduloFinuraMistura, 3));
  if (data.metricas.teorVaziosPct != null) {
    y = infoRow(doc, y, "Teor de Vazios:", `${n(data.metricas.teorVaziosPct, 1)}%`);
  }
  y += 3;

  // ── Proporções Ótimas ──
  y = sectionTitle(doc, y, "Proporções Ótimas");
  const propEntries = Object.entries(data.proporcoes);
  if (propEntries.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Material", "Proporção (%)"]],
      body: propEntries.map(([k, v]) => [k, n(v, 1)]),
      styles: { fontSize: 8, font: "helvetica", cellPadding: 2 },
      headStyles: { fillColor: [...SLATE_900], textColor: [...WHITE], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "grid",
    });
  }

  addFooter(doc);
  doc.save("CoreMixPro_Empacotamento.pdf");
}
