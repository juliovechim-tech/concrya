"use client";

/**
 * @file components/Dashboard.tsx
 * @description CORE MIX PRO — Dashboard com métricas agregadas por projeto.
 * KPIs globais, gráficos de barras por projeto, e tabela de traços recentes.
 */

import { trpc } from "../lib/trpc";
import { exportCsv } from "../lib/export-csv";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

const n = (v: number | null | undefined, d = 2): string =>
  v == null ? "—" : v.toFixed(d);

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
  accent = "amber",
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: "amber" | "emerald" | "sky" | "rose";
}) {
  const colors = {
    amber: "text-amber-400 border-amber-600/30",
    emerald: "text-emerald-400 border-emerald-600/30",
    sky: "text-sky-400 border-sky-600/30",
    rose: "text-rose-400 border-rose-600/30",
  };
  return (
    <div className={`rounded border bg-slate-900/60 px-4 py-3 ${colors[accent]}`}>
      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">
        {label}
      </p>
      <p className={`text-xl font-bold ${colors[accent].split(" ")[0]}`}>
        {value}
        {unit && (
          <span className="ml-1 text-[9px] font-normal text-slate-500">{unit}</span>
        )}
      </p>
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] shadow-lg">
      <p className="mb-1 font-bold text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function Dashboard() {
  const stats = trpc.projeto.dashboardStats.useQuery();

  if (stats.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          <p className="font-mono text-[10px] text-slate-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="font-mono text-[11px] text-rose-400">
          Erro ao carregar dados: {stats.error.message}
        </p>
      </div>
    );
  }

  const data = stats.data!;

  // Dados para gráfico de barras — traços por projeto
  const barData = data.projetosResumo.map((p) => ({
    nome: p.nome.length > 14 ? p.nome.slice(0, 14) + "…" : p.nome,
    Tracos: p.totalTracos,
    Ensaios: p.totalEnsaios,
  }));

  // Dados para gráfico radar — médias por projeto (normalizado)
  const radarData = data.projetosResumo
    .filter((p) => p.totalTracos > 0)
    .map((p) => ({
      projeto: p.nome.length > 12 ? p.nome.slice(0, 12) + "…" : p.nome,
      "fck (MPa)": Math.round(p.avgFck),
      "Custo (R$)": Math.round(p.avgCusto),
      "CO₂ (kg)": Math.round(p.avgCo2),
    }));

  const hasData = data.totalTracos > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 font-mono">

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-600 text-[10px] font-bold text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="3" y="13" width="4" height="8" rx="0.5" />
              <rect x="10" y="9" width="4" height="12" rx="0.5" />
              <rect x="17" y="4" width="4" height="17" rx="0.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-wide">Dashboard</h1>
            <p className="text-[9px] text-slate-600">Métricas agregadas por projeto</p>
          </div>
        </div>

        {hasData && (
          <div className="flex gap-2">
            <button
              onClick={() => exportCsv(
                "dashboard-projetos.csv",
                { nome: "Projeto", responsavel: "Responsável", totalTracos: "Traços", totalEnsaios: "Ensaios", avgFck: "fck Médio (MPa)", avgCusto: "Custo Médio (R$/m³)", avgCo2: "CO₂ Médio (kg/m³)" },
                data.projetosResumo.map((p) => ({
                  nome: p.nome,
                  responsavel: p.responsavel ?? "",
                  totalTracos: p.totalTracos,
                  totalEnsaios: p.totalEnsaios,
                  avgFck: p.totalTracos > 0 ? Number(p.avgFck.toFixed(1)) : null,
                  avgCusto: p.totalTracos > 0 ? Number(p.avgCusto.toFixed(2)) : null,
                  avgCo2: p.totalTracos > 0 ? Number(p.avgCo2.toFixed(1)) : null,
                }))
              )}
              className="flex items-center gap-1.5 rounded-sm border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:border-emerald-600/50 hover:text-emerald-400 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              CSV Projetos
            </button>
            <button
              onClick={() => exportCsv(
                "dashboard-tracos.csv",
                { descricao: "Descrição", projetoNome: "Projeto", fckMPa: "fck (MPa)", acAdotado: "a/c", custoM3: "Custo (R$/m³)", co2KgM3: "CO₂ (kg/m³)", data: "Data" },
                data.ultimosTracos.map((t) => ({
                  descricao: t.descricao,
                  projetoNome: t.projetoNome,
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
              CSV Traços
            </button>
          </div>
        )}
      </div>

      {/* ─── KPI GRID ───────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="Projetos" value={String(data.totalProjetos)} accent="amber" />
        <KpiCard label="Traços" value={String(data.totalTracos)} accent="amber" />
        <KpiCard label="Ensaios" value={String(data.totalEnsaios)} accent="amber" />
        <KpiCard label="fck Médio" value={n(data.avgFckMPa, 1)} unit="MPa" accent="sky" />
        <KpiCard label="a/c Médio" value={n(data.avgAc, 3)} accent="sky" />
        <KpiCard label="Custo Médio" value={n(data.avgCustoM3, 2)} unit="R$/m³" accent="emerald" />
        <KpiCard label="CO₂ Médio" value={n(data.avgCo2KgM3, 1)} unit="kg/m³" accent="rose" />
      </div>

      {!hasData && (
        <div className="rounded border border-slate-800 bg-slate-900/40 py-16 text-center">
          <p className="text-[11px] text-slate-600 mb-2">Nenhum traço salvo ainda.</p>
          <p className="text-[10px] text-slate-700">
            Calcule um traço em{" "}
            <a href="/traco" className="text-amber-500 hover:text-amber-400">/traco</a>{" "}
            e salve para popular o dashboard.
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* ─── CHARTS ROW ──────────────────────────────────────────── */}
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Bar Chart — Traços & Ensaios por Projeto */}
            {barData.length > 0 && (
              <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Traços & Ensaios por Projeto
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} barCategoryGap="20%">
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="nome"
                      tick={{ fontSize: 9, fill: "#64748b", fontFamily: "IBM Plex Mono" }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 9, fill: "#64748b", fontFamily: "IBM Plex Mono" }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Tracos" name="Traços" fill="#d97706" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Ensaios" fill="#0284c7" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Radar Chart — Perfil médio por Projeto */}
            {radarData.length > 0 && radarData.length <= 6 && (
              <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Perfil Médio por Projeto
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis
                      dataKey="projeto"
                      tick={{ fontSize: 8, fill: "#94a3b8", fontFamily: "IBM Plex Mono" }}
                    />
                    <PolarRadiusAxis
                      tick={{ fontSize: 7, fill: "#475569" }}
                      axisLine={false}
                    />
                    <Radar name="fck (MPa)" dataKey="fck (MPa)" stroke="#d97706" fill="#d97706" fillOpacity={0.15} />
                    <Radar name="Custo (R$)" dataKey="Custo (R$)" stroke="#059669" fill="#059669" fillOpacity={0.1} />
                    <Radar name="CO₂ (kg)" dataKey="CO₂ (kg)" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} />
                    <Legend
                      wrapperStyle={{ fontSize: 9, fontFamily: "IBM Plex Mono" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Fallback: if too many projects for radar, show a second bar chart */}
            {radarData.length > 6 && (
              <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  fck Médio por Projeto (MPa)
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.projetosResumo.map((p) => ({
                    nome: p.nome.length > 14 ? p.nome.slice(0, 14) + "…" : p.nome,
                    fck: Math.round(p.avgFck * 10) / 10,
                  }))}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="nome"
                      tick={{ fontSize: 9, fill: "#64748b", fontFamily: "IBM Plex Mono" }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#64748b", fontFamily: "IBM Plex Mono" }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="fck" name="fck (MPa)" fill="#d97706" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ─── PROJETOS TABLE ──────────────────────────────────────── */}
          <div className="mb-8 rounded border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Resumo por Projeto
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                    <th className="px-3 py-2 text-left">Projeto</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-right">Traços</th>
                    <th className="px-3 py-2 text-right">Ensaios</th>
                    <th className="px-3 py-2 text-right">fck Médio</th>
                    <th className="px-3 py-2 text-right">Custo Médio</th>
                    <th className="px-3 py-2 text-right">CO₂ Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projetosResumo.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-bold text-slate-300">{p.nome}</td>
                      <td className="px-3 py-2 text-slate-500">{p.responsavel || "—"}</td>
                      <td className="px-3 py-2 text-right text-amber-400">{p.totalTracos}</td>
                      <td className="px-3 py-2 text-right text-sky-400">{p.totalEnsaios}</td>
                      <td className="px-3 py-2 text-right text-slate-200">
                        {p.totalTracos > 0 ? n(p.avgFck, 1) : "—"}
                        {p.totalTracos > 0 && <span className="ml-0.5 text-[8px] text-slate-500">MPa</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-400">
                        {p.totalTracos > 0 ? n(p.avgCusto, 2) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {p.totalTracos > 0 ? n(p.avgCo2, 1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── ÚLTIMOS TRAÇOS ──────────────────────────────────────── */}
          <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Últimos Traços Salvos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                    <th className="px-3 py-2 text-left">Descrição</th>
                    <th className="px-3 py-2 text-left">Projeto</th>
                    <th className="px-3 py-2 text-right">fck (MPa)</th>
                    <th className="px-3 py-2 text-right">a/c</th>
                    <th className="px-3 py-2 text-right">Custo (R$/m³)</th>
                    <th className="px-3 py-2 text-right">CO₂ (kg/m³)</th>
                    <th className="px-3 py-2 text-right">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimosTracos.map((t) => (
                    <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-3 py-2 text-slate-300">{t.descricao}</td>
                      <td className="px-3 py-2 text-slate-500">{t.projetoNome}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-400">{n(t.fckMPa, 0)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{n(t.acAdotado, 3)}</td>
                      <td className="px-3 py-2 text-right text-emerald-400">{n(t.custoM3, 2)}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{n(t.co2KgM3, 1)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">
                        {new Date(t.criadoEm).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
