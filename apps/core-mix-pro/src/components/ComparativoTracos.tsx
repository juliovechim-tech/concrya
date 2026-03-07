"use client";

/**
 * @file components/ComparativoTracos.tsx
 * @description CORE MIX PRO — Módulo 04: Comparação Multicritério de Traços
 *
 * UI para o endpoint compararTracos (comparativo.ts).
 * Ranking por custo, CO₂ e eficiência η com gráfico radar e matriz de deltas.
 */

import { useState } from "react";
import { useToast } from "./Toast";
import {
  useForm,
  useFieldArray,
  Controller,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "../lib/trpc";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = {
  amber:    "#D97706",
  emerald:  "#059669",
  sky:      "#0284C7",
  rose:     "#DC2626",
  violet:   "#7C3AED",
  cyan:     "#0891B2",
  orange:   "#EA580C",
  lime:     "#65A30D",
  fuchsia:  "#C026D3",
  teal:     "#0D9488",
  slate900: "#0F172A",
  slate800: "#1E293B",
  slate700: "#334155",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
} as const;

const CHART_COLORS = [
  TOKEN.amber, TOKEN.sky, TOKEN.emerald, TOKEN.rose,
  TOKEN.violet, TOKEN.cyan, TOKEN.orange, TOKEN.lime,
  TOKEN.fuchsia, TOKEN.teal,
];

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT TYPES (mirrors comparativo.ts)
// ─────────────────────────────────────────────────────────────────────────────

type KpiTraco = {
  idTraco: string;
  descricao: string;
  consumoCimentoKgM3: number;
  fcmMPa: number;
  fckMPa: number;
  eficienciaCimentoEta: number;
  cimentoPorResistencia: number;
  custoM3: number;
  custoPorMPa: number;
  co2KgM3: number;
  co2PorMPa: number;
  volumetricos: Record<string, unknown>;
};

type CandidatoRanking = {
  idTraco: string;
  descricao: string;
  posicao: number;
  scoreComposto: number;
  scores: {
    custo: number;
    co2: number;
    eficiencia: number;
  };
};

type DeltaKpi = {
  kpi: string;
  unidade: string;
  valorA: number;
  valorB: number;
  delta: number;
  deltaPct: number;
  aVenceu: boolean;
};

type ComparacaoPar = {
  idTracoA: string;
  idTracoB: string;
  vencedor: string;
  deltas: DeltaKpi[];
};

type ResultadoComparativo = {
  kpis: KpiTraco[];
  ranking: CandidatoRanking[];
  destaques: {
    melhorScore: string;
    menorCusto: string;
    menorCo2: string;
    maiorEficiencia: string;
  };
  pesosUsados: { custo: number; co2: number; eficiencia: number };
  matrizDeltas: ComparacaoPar[];
  resumo: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// FORM SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const TracoInputZ = z.object({
  tipo: z.enum(["HISTORICO", "CALCULADO_MANUAL"]),
  id: z.string().min(1),
  descricao: z.string().min(1),
  // Campos HISTORICO
  mc: z.number().positive().optional(),
  fcmMPa: z.number().positive().optional(),
  fckMPa: z.number().positive().optional(),
  custoM3: z.number().positive().optional(),
  co2KgM3: z.number().positive().optional(),
});

const FormZ = z.object({
  tracos: z.array(TracoInputZ).min(2, "Minimo 2 tracos").max(10),
  pesoCusto: z.number().min(0).max(1),
  pesoCo2: z.number().min(0).max(1),
  pesoEficiencia: z.number().min(0).max(1),
});

type FormValues = z.infer<typeof FormZ>;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const n = (v: number | null | undefined, d = 2): string =>
  v == null ? "—" : v.toFixed(d);

const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;

// ─────────────────────────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
      {children}
    </label>
  );
}

function Input({
  error,
  ...p
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        {...p}
        className={[
          "w-full rounded-sm border bg-slate-900 px-2.5 py-1.5",
          "font-mono text-[11px] text-slate-200 placeholder-slate-600",
          "transition-colors focus:outline-none",
          error ? "border-red-600" : "border-slate-700 focus:border-amber-600",
          p.className ?? "",
        ].join(" ")}
      />
      {error && <p className="mt-0.5 text-[9px] text-red-400">{error}</p>}
    </div>
  );
}

function Ruler({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-5 pb-2">
      <div className="h-px flex-1 bg-slate-800" />
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</span>
      <div className="h-px flex-1 bg-slate-800" />
    </div>
  );
}

type KpiVariant = "amber" | "emerald" | "sky" | "rose" | "slate";

const KPI_STYLES: Record<KpiVariant, { bar: string; val: string; bg: string }> = {
  amber:   { bar: "bg-amber-600",   val: "text-amber-400",   bg: "bg-amber-600/5"  },
  emerald: { bar: "bg-emerald-600", val: "text-emerald-400", bg: "bg-emerald-600/5" },
  sky:     { bar: "bg-sky-600",     val: "text-sky-400",     bg: "bg-sky-600/5"    },
  rose:    { bar: "bg-rose-600",    val: "text-rose-400",    bg: "bg-rose-600/5"   },
  slate:   { bar: "bg-slate-600",   val: "text-slate-300",   bg: "bg-slate-800"    },
};

function KpiCard({
  label,
  value,
  unit,
  sub,
  variant = "amber",
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  variant?: KpiVariant;
}) {
  const s = KPI_STYLES[variant];
  return (
    <div className={`relative overflow-hidden rounded border border-slate-800 px-4 py-3 ${s.bg}`}>
      <div className={`absolute left-0 top-0 h-full w-1 ${s.bar}`} />
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-lg font-bold ${s.val}`}>{value}</span>
        {unit && <span className="font-mono text-[10px] text-slate-500">{unit}</span>}
      </div>
      {sub && <p className="font-mono text-[9px] text-slate-600">{sub}</p>}
    </div>
  );
}

function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex gap-0.5 border-b border-slate-800 mb-4">
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          className={[
            "px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition border-b-2",
            active === i
              ? "border-amber-600 text-amber-400"
              : "border-transparent text-slate-600 hover:text-slate-400",
          ].join(" ")}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function ComparativoTracos() {
  const [resultado, setResultado] = useState<ResultadoComparativo | null>(null);
  const [tab, setTab] = useState(0);
  const [parSelecionado, setParSelecionado] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const mutation = trpc.dosagem.compararTracos.useMutation({
    onSuccess: (data) => {
      setResultado(data as unknown as ResultadoComparativo);
      toast("Comparação concluída", "success");
    },
    onError: (err) => {
      toast(err.message ?? "Erro na comparação", "error");
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormZ),
    defaultValues: {
      tracos: [
        { tipo: "HISTORICO", id: "T1", descricao: "Traco 1", mc: 350, fcmMPa: 38, fckMPa: 30, custoM3: 420, co2KgM3: 280 },
        { tipo: "HISTORICO", id: "T2", descricao: "Traco 2", mc: 300, fcmMPa: 35, fckMPa: 25, custoM3: 380, co2KgM3: 240 },
      ],
      pesoCusto: 0.40,
      pesoCo2: 0.30,
      pesoEficiencia: 0.30,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "tracos" });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const tracos = data.tracos.map((t) => ({
      tipo: "HISTORICO" as const,
      id: t.id,
      descricao: t.descricao,
      mc: t.mc!,
      fcmMPa: t.fcmMPa!,
      fckMPa: t.fckMPa!,
      custoM3: t.custoM3!,
      co2KgM3: t.co2KgM3!,
    }));

    mutation.mutate({
      tracos,
      pesos: {
        custo: data.pesoCusto,
        co2: data.pesoCo2,
        eficiencia: data.pesoEficiencia,
      },
    });
  };

  // Build radar data from ranking scores
  const radarData = resultado
    ? [
        { metric: "Custo", ...Object.fromEntries(resultado.ranking.map((r) => [r.idTraco, r.scores.custo * 100])) },
        { metric: "CO₂", ...Object.fromEntries(resultado.ranking.map((r) => [r.idTraco, r.scores.co2 * 100])) },
        { metric: "Eficiência η", ...Object.fromEntries(resultado.ranking.map((r) => [r.idTraco, r.scores.eficiencia * 100])) },
      ]
    : [];

  // Build bar chart data for composite score
  const barData = resultado
    ? resultado.ranking.map((r) => ({
        name: r.descricao.length > 20 ? r.descricao.slice(0, 18) + "…" : r.descricao,
        score: +(r.scoreComposto * 100).toFixed(1),
        id: r.idTraco,
      }))
    : [];

  return (
    <div className="relative flex h-screen overflow-hidden font-mono">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={[
        "flex flex-shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950",
        "transition-transform duration-300 ease-in-out",
        "absolute inset-y-0 left-0 z-40 w-[360px] lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}>
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-600 text-[10px] font-bold text-white">
              04
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-wide">Comparacao de Tracos</h1>
              <p className="text-[9px] text-slate-600">Ranking multicriterio: custo · CO2 · eficiencia</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col px-5 pb-5">
          {/* ─── TRACOS ─────────────────────────────────────────── */}
          <Ruler label="Tracos para Comparar" />

          <div className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.id} className="rounded border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-slate-500">
                    Traco {i + 1}
                    <span className="ml-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </span>
                  {fields.length > 2 && (
                    <button type="button" onClick={() => remove(i)}
                      className="text-[10px] text-red-500 hover:text-red-400">X</button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>ID</Label>
                    <Input {...register(`tracos.${i}.id`)} placeholder="T1" />
                  </div>
                  <div>
                    <Label>Descricao</Label>
                    <Input {...register(`tracos.${i}.descricao`)} placeholder="C30 CP IV" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <Label>mc (kg/m3)</Label>
                    <Input type="number" step="any" {...register(`tracos.${i}.mc`, { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label>fcm (MPa)</Label>
                    <Input type="number" step="any" {...register(`tracos.${i}.fcmMPa`, { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label>fck (MPa)</Label>
                    <Input type="number" step="any" {...register(`tracos.${i}.fckMPa`, { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Custo (R$/m3)</Label>
                    <Input type="number" step="any" {...register(`tracos.${i}.custoM3`, { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label>CO2 (kg/m3)</Label>
                    <Input type="number" step="any" {...register(`tracos.${i}.co2KgM3`, { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            ))}

            {fields.length < 10 && (
              <button
                type="button"
                onClick={() => append({
                  tipo: "HISTORICO",
                  id: `T${fields.length + 1}`,
                  descricao: `Traco ${fields.length + 1}`,
                  mc: 320,
                  fcmMPa: 35,
                  fckMPa: 25,
                  custoM3: 400,
                  co2KgM3: 250,
                })}
                className="w-full rounded border border-dashed border-slate-700 py-1.5 text-[10px] text-amber-500 hover:border-amber-600 hover:text-amber-400 transition"
              >
                + Adicionar Traco
              </button>
            )}
          </div>

          {errors.tracos?.message && (
            <p className="mt-1 text-[9px] text-red-400">{errors.tracos.message}</p>
          )}

          {/* ─── PESOS ──────────────────────────────────────────── */}
          <Ruler label="Pesos dos Criterios" />

          <div className="space-y-2">
            <div>
              <Label>Custo ({pct(watch("pesoCusto"))})</Label>
              <input
                type="range"
                min="0" max="1" step="0.05"
                {...register("pesoCusto", { valueAsNumber: true })}
                className="w-full accent-amber-600"
              />
            </div>
            <div>
              <Label>CO2 ({pct(watch("pesoCo2"))})</Label>
              <input
                type="range"
                min="0" max="1" step="0.05"
                {...register("pesoCo2", { valueAsNumber: true })}
                className="w-full accent-emerald-600"
              />
            </div>
            <div>
              <Label>Eficiencia ({pct(watch("pesoEficiencia"))})</Label>
              <input
                type="range"
                min="0" max="1" step="0.05"
                {...register("pesoEficiencia", { valueAsNumber: true })}
                className="w-full accent-sky-600"
              />
            </div>
            <p className="text-[9px] text-slate-600">
              Pesos sao normalizados automaticamente (soma = 100%)
            </p>
          </div>

          {/* ─── SUBMIT ──────────────────────────────────────────── */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={mutation.isPending}
              className={[
                "w-full rounded py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition",
                mutation.isPending
                  ? "cursor-wait bg-slate-800 text-slate-600"
                  : "bg-amber-600 text-white hover:bg-amber-500 active:bg-amber-700",
              ].join(" ")}
            >
              {mutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-amber-400" />
                  Analisando...
                </span>
              ) : (
                "Comparar Tracos"
              )}
            </button>

            {mutation.isError && (
              <p className="mt-2 text-[10px] text-red-400">Erro: {mutation.error.message}</p>
            )}
          </div>
        </form>
      </aside>

      {/* ─── MAIN ────────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-y-auto bg-slate-950">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="font-mono text-[9px] uppercase tracking-[0.15em]">Parametros</span>
        </button>

        <div className="flex-1 overflow-y-auto p-6">
        {!resultado ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-800">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12h4l3-9 4 18 3-9h4" stroke={TOKEN.slate700} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[11px] text-slate-600">
                Adicione tracos e clique em <span className="text-amber-500">Comparar Tracos</span>
              </p>
              <p className="mt-1 text-[9px] text-slate-700">
                Ranking multicriterio: custo · CO2 · eficiencia
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* DESTAQUES KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <KpiCard
                label="Melhor Score"
                value={resultado.ranking[0]?.descricao ?? "—"}
                sub={`Score: ${n(resultado.ranking[0]?.scoreComposto * 100, 1)}%`}
                variant="amber"
              />
              <KpiCard
                label="Menor Custo"
                value={resultado.kpis.find((k) => k.idTraco === resultado.destaques.menorCusto)?.descricao ?? "—"}
                sub={`R$ ${n(resultado.kpis.find((k) => k.idTraco === resultado.destaques.menorCusto)?.custoM3, 2)}/m3`}
                variant="emerald"
              />
              <KpiCard
                label="Menor CO2"
                value={resultado.kpis.find((k) => k.idTraco === resultado.destaques.menorCo2)?.descricao ?? "—"}
                sub={`${n(resultado.kpis.find((k) => k.idTraco === resultado.destaques.menorCo2)?.co2KgM3, 1)} kg/m3`}
                variant="sky"
              />
              <KpiCard
                label="Maior Eficiencia"
                value={resultado.kpis.find((k) => k.idTraco === resultado.destaques.maiorEficiencia)?.descricao ?? "—"}
                sub={`η = ${n(resultado.kpis.find((k) => k.idTraco === resultado.destaques.maiorEficiencia)?.eficienciaCimentoEta, 4)}`}
                variant="rose"
              />
            </div>

            <Tabs
              tabs={["Ranking", "Radar", "KPIs Detalhados", "Comparacao Par-a-Par"]}
              active={tab}
              onChange={setTab}
            />

            {/* ─── TAB: RANKING ──────────────────────────────────── */}
            {tab === 0 && (
              <div className="space-y-6">
                {/* Score bar chart */}
                <div className="rounded border border-slate-800 p-4">
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    Score Composto (pesos: custo {pct(resultado.pesosUsados.custo)} · CO2 {pct(resultado.pesosUsados.co2)} · η {pct(resultado.pesosUsados.eficiencia)})
                  </p>
                  <ResponsiveContainer width="100%" height={Math.max(180, barData.length * 50)}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: "#64748B", fontFamily: "monospace" }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "monospace" }} />
                      <Tooltip
                        contentStyle={{ background: "#0F172A", border: "1px solid #334155", fontSize: 11, fontFamily: "monospace" }}
                        formatter={(v: number) => [`${v}%`, "Score"]}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {barData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ranking table */}
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2 text-center">#</th>
                      <th className="px-3 py-2 text-left">Traco</th>
                      <th className="px-3 py-2 text-right">Score</th>
                      <th className="px-3 py-2 text-right">Custo</th>
                      <th className="px-3 py-2 text-right">CO2</th>
                      <th className="px-3 py-2 text-right">Eficiencia</th>
                      <th className="px-3 py-2 text-right">Custo (R$/m3)</th>
                      <th className="px-3 py-2 text-right">CO2 (kg/m3)</th>
                      <th className="px-3 py-2 text-right">η</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.ranking.map((r, i) => {
                      const kpi = resultado.kpis.find((k) => k.idTraco === r.idTraco);
                      return (
                      <tr key={r.idTraco} className={[
                        "border-b border-slate-800/50",
                        i === 0 ? "bg-amber-600/5" : "hover:bg-slate-900/50",
                      ].join(" ")}>
                        <td className="px-3 py-2 text-center">
                          <span className={[
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                            i === 0 ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400",
                          ].join(" ")}>
                            {r.posicao}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-slate-200 font-bold">{r.descricao}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-amber-400">{n(r.scoreComposto * 100, 1)}%</td>
                        <td className="px-3 py-2 text-right text-slate-400">{pct(r.scores.custo)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{pct(r.scores.co2)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{pct(r.scores.eficiencia)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{n(kpi?.custoM3 ?? 0, 2)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{n(kpi?.co2KgM3 ?? 0, 1)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{n(kpi?.eficienciaCimentoEta ?? 0, 4)}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── TAB: RADAR ────────────────────────────────────── */}
            {tab === 1 && (
              <div className="rounded border border-slate-800 p-4">
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Perfil Multicriterio (scores normalizados 0-100)
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <PolarGrid stroke="#1E293B" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "monospace" }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 8, fill: "#475569", fontFamily: "monospace" }}
                      axisLine={false}
                    />
                    {resultado.ranking.map((r, i) => (
                      <Radar
                        key={r.idTraco}
                        name={r.descricao}
                        dataKey={r.idTraco}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend
                      wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ─── TAB: KPIs DETALHADOS ──────────────────────────── */}
            {tab === 2 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2 text-left">KPI</th>
                      {resultado.kpis.map((k, i) => (
                        <th key={k.idTraco} className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            {k.descricao}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Cimento (kg/m3)", key: "consumoCimentoKgM3", d: 1 },
                      { label: "fcm (MPa)", key: "fcmMPa", d: 1 },
                      { label: "fck (MPa)", key: "fckMPa", d: 1 },
                      { label: "η (MPa·m3/kg)", key: "eficienciaCimentoEta", d: 4 },
                      { label: "mc/fcm (kg/MPa)", key: "cimentoPorResistencia", d: 2 },
                      { label: "Custo (R$/m3)", key: "custoM3", d: 2 },
                      { label: "R$/MPa", key: "custoPorMPa", d: 2 },
                      { label: "CO2 (kg/m3)", key: "co2KgM3", d: 1 },
                      { label: "CO2/MPa", key: "co2PorMPa", d: 2 },
                    ].map((row) => {
                      const vals = resultado.kpis.map((k) => (k as any)[row.key] as number);
                      const best = row.key === "eficienciaCimentoEta" || row.key === "fcmMPa" || row.key === "fckMPa"
                        ? Math.max(...vals)
                        : Math.min(...vals);
                      return (
                        <tr key={row.key} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                          <td className="px-3 py-2 text-slate-400">{row.label}</td>
                          {resultado.kpis.map((k) => {
                            const v = (k as any)[row.key] as number;
                            const isBest = v === best;
                            return (
                              <td key={k.idTraco} className={[
                                "px-3 py-2 text-right",
                                isBest ? "font-bold text-amber-400" : "text-slate-300",
                              ].join(" ")}>
                                {n(v, row.d)}
                                {isBest && " ★"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── TAB: COMPARACAO PAR-A-PAR ─────────────────────── */}
            {tab === 3 && resultado.matrizDeltas.length > 0 && (
              <div className="space-y-4">
                {/* Selector */}
                <div className="flex gap-2 flex-wrap">
                  {resultado.matrizDeltas.map((par, i) => {
                    const descA = resultado.kpis.find((k) => k.idTraco === par.idTracoA)?.descricao ?? par.idTracoA;
                    const descB = resultado.kpis.find((k) => k.idTraco === par.idTracoB)?.descricao ?? par.idTracoB;
                    return (
                      <button
                        key={i}
                        onClick={() => setParSelecionado(i)}
                        className={[
                          "rounded px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition",
                          parSelecionado === i
                            ? "bg-amber-600 text-white"
                            : "border border-slate-700 text-slate-400 hover:border-amber-600/50",
                        ].join(" ")}
                      >
                        {descA} vs {descB}
                      </button>
                    );
                  })}
                </div>

                {/* Delta table */}
                {(() => {
                  const par = resultado.matrizDeltas[parSelecionado];
                  if (!par) return null;
                  const descA = resultado.kpis.find((k) => k.idTraco === par.idTracoA)?.descricao ?? par.idTracoA;
                  const descB = resultado.kpis.find((k) => k.idTraco === par.idTracoB)?.descricao ?? par.idTracoB;
                  const vencedorDesc = resultado.kpis.find((k) => k.idTraco === par.vencedor)?.descricao ?? par.vencedor;

                  return (
                    <div>
                      <div className="mb-3 rounded border border-amber-600/20 bg-amber-600/5 px-4 py-2">
                        <p className="text-[10px] text-amber-400">
                          Vencedor: <span className="font-bold">{vencedorDesc}</span>
                        </p>
                      </div>

                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                            <th className="px-3 py-2 text-left">KPI</th>
                            <th className="px-3 py-2 text-right">{descA}</th>
                            <th className="px-3 py-2 text-right">{descB}</th>
                            <th className="px-3 py-2 text-right">Delta</th>
                            <th className="px-3 py-2 text-right">Delta %</th>
                            <th className="px-3 py-2 text-center">Melhor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {par.deltas.map((d) => (
                            <tr key={d.kpi} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                              <td className="px-3 py-2 text-slate-400">{d.kpi} <span className="text-slate-600">({d.unidade})</span></td>
                              <td className={`px-3 py-2 text-right ${d.aVenceu ? "font-bold text-amber-400" : "text-slate-300"}`}>
                                {n(d.valorA, 2)}
                              </td>
                              <td className={`px-3 py-2 text-right ${!d.aVenceu ? "font-bold text-amber-400" : "text-slate-300"}`}>
                                {n(d.valorB, 2)}
                              </td>
                              <td className={`px-3 py-2 text-right ${d.delta < 0 ? "text-emerald-400" : d.delta > 0 ? "text-rose-400" : "text-slate-500"}`}>
                                {d.delta > 0 ? "+" : ""}{n(d.delta, 2)}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-400">
                                {d.deltaPct > 0 ? "+" : ""}{n(d.deltaPct, 1)}%
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`text-[9px] font-bold ${d.aVenceu ? "text-amber-400" : "text-sky-400"}`}>
                                  {d.aVenceu ? "A" : "B"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
