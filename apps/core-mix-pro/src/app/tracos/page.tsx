"use client";

/**
 * @file app/tracos/page.tsx
 * @description Listagem de traços salvos por projeto.
 * Usa sessão autenticada — userId vem do contexto tRPC (protectedProc).
 */

import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { exportCsv } from "../../lib/export-csv";

const n = (v: number | null | undefined, d = 2): string =>
  v == null ? "—" : v.toFixed(d);

export default function TracosPage() {
  const [projetoId, setProjetoId] = useState<string>("");

  const projetos = trpc.projeto.listarProjetos.useQuery();
  const tracos = trpc.projeto.listarTracos.useQuery(
    { projetoId },
    { enabled: !!projetoId }
  );

  const deletarMutation = trpc.projeto.deletarTraco.useMutation({
    onSuccess: () => tracos.refetch(),
  });

  return (
    <div className="mx-auto max-w-4xl p-8 font-mono">
      <div className="mb-8">
        <h1 className="text-lg font-bold text-slate-100 tracking-wide">Historico de Tracos</h1>
        <p className="text-[10px] text-slate-600">Tracos salvos organizados por projeto</p>
      </div>

      {/* Seletor de projeto */}
      <div className="mb-6">
        <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
          Projeto
        </label>
        <select
          value={projetoId}
          onChange={(e) => setProjetoId(e.target.value)}
          className="w-full max-w-sm rounded-sm border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-200 focus:border-amber-600 focus:outline-none"
        >
          <option value="">Selecione um projeto...</option>
          {projetos.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} ({p._count.tracos} tracos)
            </option>
          ))}
        </select>
      </div>

      {/* Lista de traços */}
      {projetoId && tracos.data && (
        <div>
          {tracos.data.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => exportCsv(
                  "tracos-historico.csv",
                  { descricao: "Descrição", fckMPa: "fck (MPa)", acAdotado: "a/c", custoM3: "Custo (R$/m³)", co2KgM3: "CO₂ (kg/m³)", data: "Data" },
                  tracos.data!.map((t) => ({
                    descricao: t.descricao,
                    fckMPa: Number(t.fckMPa.toFixed(1)),
                    acAdotado: Number(t.acAdotado.toFixed(3)),
                    custoM3: Number(t.custoM3.toFixed(2)),
                    co2KgM3: Number(t.co2KgM3.toFixed(1)),
                    data: new Date(t.criadoEm).toLocaleDateString("pt-BR"),
                  }))
                )}
                className="flex items-center gap-1.5 rounded-sm border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:border-emerald-600/50 hover:text-emerald-400 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Exportar CSV
              </button>
            </div>
          )}
          {tracos.data.length === 0 ? (
            <p className="py-12 text-center text-[11px] text-slate-600">
              Nenhum traco salvo neste projeto.
            </p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                  <th className="px-3 py-2 text-left">Descricao</th>
                  <th className="px-3 py-2 text-right">fck (MPa)</th>
                  <th className="px-3 py-2 text-right">a/c</th>
                  <th className="px-3 py-2 text-right">Custo (R$/m3)</th>
                  <th className="px-3 py-2 text-right">CO2 (kg/m3)</th>
                  <th className="px-3 py-2 text-right">Data</th>
                  <th className="px-3 py-2 text-center">Acao</th>
                </tr>
              </thead>
              <tbody>
                {tracos.data.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                    <td className="px-3 py-2 text-slate-300">{t.descricao}</td>
                    <td className="px-3 py-2 text-right font-bold text-amber-400">{n(t.fckMPa, 0)}</td>
                    <td className="px-3 py-2 text-right text-slate-200">{n(t.acAdotado, 3)}</td>
                    <td className="px-3 py-2 text-right text-slate-200">{n(t.custoM3, 2)}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{n(t.co2KgM3, 1)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {new Date(t.criadoEm).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => {
                          if (confirm("Deletar este traco?")) {
                            deletarMutation.mutate({ id: t.id });
                          }
                        }}
                        className="text-[10px] text-red-500 hover:text-red-400"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Empty state */}
      {!projetoId && projetos.data?.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-[11px] text-slate-600">
            Nenhum projeto encontrado. Calcule um traco em{" "}
            <a href="/traco" className="text-amber-500 hover:text-amber-400">/traco</a>{" "}
            e salve para iniciar.
          </p>
        </div>
      )}
    </div>
  );
}
