/**
 * @file lib/export-csv.ts
 * @description Utilitário de exportação CSV — client-side, sem dependências externas.
 * Gera CSV com separador ponto-e-vírgula (padrão brasileiro para Excel).
 */

type Row = Record<string, string | number | null | undefined>;

/** Escapa campo CSV: se contém ; ou " ou \n, envolve em aspas */
function escapeField(val: string): string {
  if (val.includes(";") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Gera string CSV a partir de um array de objetos.
 * @param headers Map de { chaveObjeto: "Rótulo Coluna" }
 * @param rows Dados
 * @param separator Separador (padrão ";" para Excel BR)
 */
export function generateCsv(
  headers: Record<string, string>,
  rows: Row[],
  separator = ";"
): string {
  const keys = Object.keys(headers);
  const headerLine = keys.map((k) => escapeField(headers[k]!)).join(separator);
  const dataLines = rows.map((row) =>
    keys
      .map((k) => {
        const val = row[k];
        if (val == null) return "";
        return escapeField(String(val));
      })
      .join(separator)
  );
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Dispara download de um arquivo CSV no navegador.
 * @param filename Nome do arquivo (com .csv)
 * @param csvContent Conteúdo CSV
 */
export function downloadCsv(filename: string, csvContent: string): void {
  // BOM para UTF-8 (garante acentos no Excel)
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Shortcut: gera CSV e dispara download.
 */
export function exportCsv(
  filename: string,
  headers: Record<string, string>,
  rows: Row[]
): void {
  const csv = generateCsv(headers, rows);
  downloadCsv(filename, csv);
}
