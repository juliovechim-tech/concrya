import * as XLSX from 'xlsx';

export const exportarFichaDosagem = (dados: any) => {
  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Dados para a planilha
  const ws_data = [
    ["CONCRYA TECHNOLOGIES - FICHA DE DOSAGEM"],
    [""],
    ["DATA:", new Date().toLocaleDateString()],
    ["VOLUME DA MASSADA:", `${dados.volume} Litros`],
    [""],
    ["MATERIAL", "QUANTIDADE (kg)", "CUSTO (R$)"],
    ["Cimento", dados.cimento, dados.custoCimento],
    ["Areia", dados.areia, dados.custoAreia],
    ["Brita", dados.brita, dados.custoBrita],
    ["Água", dados.agua, dados.custoAgua],
    ["Aditivo", dados.aditivo, dados.custoAditivo],
    [""],
    ["TOTAL", "", dados.custoTotal],
    [""],
    ["OBSERVAÇÕES:"],
    ["Traço calculado via aplicativo CONCRYA Technologies"],
    ["concrya.com.br"]
  ];

  // Criar worksheet
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 30 }, // Material
    { wch: 20 }, // Quantidade
    { wch: 20 }  // Custo
  ];

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, "Ficha de Dosagem");

  // Gerar arquivo e download
  XLSX.writeFile(wb, `Ficha_Dosagem_${new Date().getTime()}.xlsx`);
};

export const exportarRelatorioEnsaios = (ensaios: any[]) => {
  const wb = XLSX.utils.book_new();

  const ws_data = [
    ["CONCRYA TECHNOLOGIES - RELATÓRIO DE ENSAIOS"],
    [""],
    ["IDADE (DIAS)", "CP 1 (MPa)", "CP 2 (MPa)", "MÉDIA (MPa)"],
    ...ensaios.map(e => [e.idade, e.cp1, e.cp2, e.resistencia]),
    [""],
    ["Gerado em:", new Date().toLocaleDateString()]
  ];

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, ws, "Ensaios");
  XLSX.writeFile(wb, `Relatorio_Ensaios_${new Date().getTime()}.xlsx`);
};

export const exportarCSV = (dados: any[], nomeArquivo: string) => {
  // Converter dados para CSV
  const csvContent = dados.map(row => row.join(";")).join("\n");
  
  // Criar Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Criar link de download
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${nomeArquivo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportarFichaDosagemCSV = (dados: any) => {
  const ws_data = [
    ["CONCRYA TECHNOLOGIES - FICHA DE DOSAGEM"],
    [""],
    ["DATA", new Date().toLocaleDateString()],
    ["VOLUME DA MASSADA", `${dados.volume} Litros`],
    [""],
    ["MATERIAL", "QUANTIDADE (kg)", "CUSTO (R$)"],
    ["Cimento", dados.cimento, dados.custoCimento],
    ["Areia", dados.areia, dados.custoAreia],
    ["Brita", dados.brita, dados.custoBrita],
    ["Agua", dados.agua, dados.custoAgua],
    ["Aditivo", dados.aditivo, dados.custoAditivo],
    [""],
    ["TOTAL", "", dados.custoTotal],
    [""],
    ["OBSERVACOES"],
    ["Traco calculado via aplicativo CONCRYA Technologies"],
    ["concrya.com.br"]
  ];
  
  exportarCSV(ws_data, `Ficha_Dosagem_${new Date().getTime()}`);
};

export const exportarRelatorioEnsaiosCSV = (ensaios: any[]) => {
  const ws_data = [
    ["CONCRYA TECHNOLOGIES - RELATORIO DE ENSAIOS"],
    [""],
    ["IDADE (DIAS)", "CP 1 (MPa)", "CP 2 (MPa)", "MEDIA (MPa)"],
    ...ensaios.map(e => [e.idade, e.cp1, e.cp2, e.resistencia]),
    [""],
    ["Gerado em:", new Date().toLocaleDateString()]
  ];
  
  exportarCSV(ws_data, `Relatorio_Ensaios_${new Date().getTime()}`);
};
