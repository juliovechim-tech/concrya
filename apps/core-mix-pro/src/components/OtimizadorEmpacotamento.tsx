"use client";

/**
 * @file components/OtimizadorEmpacotamento.tsx
 * @description CORE MIX PRO — Motor de Empacotamento Granulométrico
 *
 * Estética: Precision Industrial Control Room
 * Dark-first, tipografia IBM Plex Mono, acento âmbar queimado (#D97706),
 * grid técnico com separadores de régua. Interface densa mas respirável —
 * cada pixel serve a um engenheiro lendo dados críticos.
 *
 * Requisitos: react-hook-form + zod + Recharts + tRPC v11
 */

import { useState, useCallback, useId } from "react";
import { useToast } from "./Toast";
import { gerarPdfEmpacotamento } from "../lib/relatorio-pdf";
import {
  useForm,
  useFieldArray,
  Controller,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from "recharts";
import { trpc } from "../lib/trpc";

// ─────────────────────────────────────────────────────────────────────────────
// PALETA & DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = {
  amber:    "#D97706",
  amberLt:  "#FCD34D",
  emerald:  "#059669",
  sky:      "#0284C7",
  rose:     "#DC2626",
  slate900: "#0F172A",
  slate800: "#1E293B",
  slate700: "#334155",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
  text:     "#CBD5E1",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DOMÍNIO — espelham exatamente o output do router
// ─────────────────────────────────────────────────────────────────────────────

type Metricas = {
  rmse:          number;
  rmseAtivo:     number | null;
  wls:           number | null;
  eficiencia:    number;
  phiEstimado:   number;
  teorVaziosPct: number;
  betaStarCPM:   number | null;
  teorVaziosCPM: number | null;
};

type Candidato = {
  proporcoes:          Record<string, number>;
  rmse:                number;
  rmseAtivo:           number | null;
  wls:                 number | null;
  eficiencia:          number;
  phiEstimado:         number;
  teorVaziosPct:       number;
  betaStarCPM:         number | null;
  moduloFinuraMistura: number;
  dmcMisturaMm:        number;
};

type OtimizacaoOutput = {
  algoritmo:       string;
  modeloCurva:     string;
  funcaoObjetivo:  string;
  nCombinacoes:    number;
  tempoExecucaoMs: number;
  proporcoes:      Record<string, number>;
  metricas:        Metricas;
  moduloFinuraMistura: number;
  dmcMisturaMm:        number;
  topCandidatos:   Candidato[];
  curvasReferencia: {
    peneiras:  number[];
    andreasen: number[];
    fuller:    number[];
    bolomey:   number[];
    bolomeyA:  number;
    aim:            number[] | null;
    rosinRammler:   number[] | null;
    pesosWLS:       number[] | null;
  };
  passanteMisturaOtima: { aberturaMm: number; passantePct: number }[];
  paramsAndreasenUsados: { q: number; dMinMm: number; dMaxMm: number };
  shilstone: {
    workabilityFactor: number;
    coarsenessFactor:  number;
    zona:              string;
    descricaoZona:     string;
  } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA ZOD DO FORMULÁRIO
// ─────────────────────────────────────────────────────────────────────────────

const MATERIAL_KEYS = ["M1", "M2", "G1", "G2", "G3"] as const;
const PERFIS_CAT    = ["CP_V_ARI", "MICROSILICA", "METACAULIM", "FILER_CALCARIO", "CINZA_VOLANTE_F"] as const;

type MaterialKey  = typeof MATERIAL_KEYS[number];
type PerfilCat    = typeof PERFIS_CAT[number];

const LABEL_MAT: Record<MaterialKey, string> = {
  M1: "Areia Natural Média",
  M2: "Areia Manufaturada 0-4",
  G1: "Brita 0 — Pedrisco",
  G2: "Brita 1",
  G3: "Brita 2",
};
const LABEL_PERF: Record<PerfilCat, string> = {
  CP_V_ARI:       "Cimento CP V-ARI RS",
  MICROSILICA:    "Microsílica Densificada",
  METACAULIM:     "Metacaulim HP",
  FILER_CALCARIO: "Fíler Calcário",
  CINZA_VOLANTE_F:"Cinza Volante Tipo F",
};

const MaterialZ = z.discriminatedUnion("origem", [
  z.object({
    origem:      z.literal("DENSUS_DEFAULT"),
    id:          z.string().min(1),
    descricao:   z.string().min(1),
    materialKey: z.enum(MATERIAL_KEYS),
    betaStar:    z.number().min(0.40).max(0.80).optional(),
  }),
  z.object({
    origem:    z.literal("CATALOGO"),
    id:        z.string().min(1),
    descricao: z.string().min(1),
    perfilId:  z.enum(PERFIS_CAT),
    betaStar:  z.number().min(0.40).max(0.80).optional(),
  }),
]);

const FormZ = z.object({
  materiais:      z.array(MaterialZ).min(2, "Mín. 2 materiais"),
  classeConcreto: z.enum(["CCV", "CAD", "UHPC"]),
  modelo:         z.enum(["ANDREASEN", "FULLER", "BOLOMEY", "AIM", "ROSIN_RAMMLER"]),
  funcaoObjetivo: z.enum(["RMSE", "RMSE_ATIVO", "WLS"]),
  algoritmo:      z.enum(["auto", "grid", "monte_carlo"]),
  passoGrid:      z.number().int().min(1).max(10),
  iteracoesMC:    z.number().int().min(1000).max(500_000),
  usarBetaStar:   z.boolean(),
  andreasenQ:     z.number().min(0.15).max(0.60).optional(),
  rosinD63Mm:     z.number().positive().optional(),
  rosinN:         z.number().min(0.3).max(3.0).optional(),
});

type FormValues = z.infer<typeof FormZ>;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type ChartPoint = {
  abertura:      number;
  andreasen:     number | null;
  fuller:        number | null;
  bolomey:       number | null;
  aim:           number | null;
  rosinRammler:  number | null;
  otima:         number | null;
  label:         string;
};

function buildChart(r: OtimizacaoOutput): ChartPoint[] {
  const { peneiras, andreasen, fuller, bolomey, aim, rosinRammler } = r.curvasReferencia;
  return peneiras.map((d, i) => ({
    abertura:      d,
    andreasen:     andreasen[i]       ?? null,
    fuller:        fuller[i]          ?? null,
    bolomey:       bolomey[i]        ?? null,
    aim:           aim?.[i]          ?? null,
    rosinRammler:  rosinRammler?.[i] ?? null,
    otima:         r.passanteMisturaOtima[i]?.passantePct ?? null,
    label:         d >= 1 ? String(d) : d >= 0.001 ? d.toFixed(d < 0.01 ? 4 : 3) : d.toExponential(0),
  }));
}

const n = (v: number | null | undefined, d = 4): string =>
  v == null ? "—" : v.toFixed(d);

// Ticks logarítmicos cuidadosamente selecionados para o eixo X
const LOG_TICKS = [
  0.0001, 0.0005, 0.001, 0.002, 0.005,
  0.01, 0.02, 0.05,
  0.075, 0.15, 0.3, 0.6,
  1.18, 2.36, 4.75,
  9.5, 19, 37.5,
];

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVOS UI
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
          error
            ? "border-red-600 focus:border-red-500"
            : "border-slate-700 focus:border-amber-600",
          p.className ?? "",
        ].join(" ")}
      />
      {error && <p className="mt-0.5 text-[9px] text-red-400">{error}</p>}
    </div>
  );
}

function Select({
  children,
  ...p
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...p}
      className={[
        "w-full rounded-sm border border-slate-700 bg-slate-900 px-2.5 py-1.5",
        "font-mono text-[11px] text-slate-200",
        "transition-colors focus:border-amber-600 focus:outline-none",
        p.className ?? "",
      ].join(" ")}
    >
      {children}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-left"
    >
      <span
        className={[
          "relative inline-flex h-4 w-7 flex-shrink-0 rounded-full border transition-colors",
          checked ? "border-amber-600 bg-amber-600" : "border-slate-600 bg-slate-800",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-3" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────

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
  formula,
}: {
  label:    string;
  value:    string;
  unit?:    string;
  sub?:     string;
  variant?: KpiVariant;
  formula?: React.ReactNode;
}) {
  const s = KPI_STYLES[variant];
  return (
    <div className={`relative rounded-sm border border-slate-800 ${s.bg} p-3`}>
      {/* Bar accent */}
      <div className={`absolute left-0 top-0 h-full w-0.5 ${s.bar}`} />
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      {formula && <p className="font-mono text-[9px] italic text-slate-600">{formula}</p>}
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-lg font-bold ${s.val}`}>{value}</span>
        {unit && <span className="font-mono text-[10px] text-slate-500">{unit}</span>}
      </div>
      {sub && <p className="font-mono text-[9px] text-slate-600">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP DO GRÁFICO
// ─────────────────────────────────────────────────────────────────────────────

const CURVE_COLORS: Record<string, string> = {
  andreasen:     TOKEN.sky,
  fuller:        TOKEN.slate500,
  bolomey:       TOKEN.emerald,
  aim:           "#7C3AED",
  rosinRammler:  "#EA580C",
  otima:         TOKEN.amber,
};
const CURVE_NAMES: Record<string, string> = {
  andreasen:     "AFD (Andreasen-Funk-Dinger)",
  fuller:        "Fuller-Thompson",
  bolomey:       "Bolomey",
  aim:           "AIM (Shilstone)",
  rosinRammler:  "Rosin-Rammler",
  otima:         "Mistura Ótima",
};

function GranuloTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const ab = Number(label);
  const abLabel = ab < 0.001 ? ab.toExponential(1) + " mm"
                : ab < 1    ? ab.toFixed(4) + " mm"
                : ab + " mm";
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.97)",
        border: "1px solid #334155",
        borderRadius: 4,
        padding: "10px 14px",
        fontFamily: "monospace",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <p style={{ color: TOKEN.amber, fontSize: 10, marginBottom: 6, letterSpacing: "0.1em" }}>
        ◆ {abLabel}
      </p>
      {payload
        .filter((p) => p.value != null)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .map((p) => (
          <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{
              display: "inline-block",
              width: 8, height: 8,
              borderRadius: "50%",
              background: CURVE_COLORS[p.dataKey as string] ?? "#fff",
            }} />
            <span style={{ color: "#94A3B8", fontSize: 10 }}>
              {CURVE_NAMES[p.dataKey as string] ?? p.dataKey}:{" "}
              <span style={{ color: "#E2E8F0", fontWeight: "bold" }}>
                {typeof p.value === "number" ? p.value.toFixed(1) : p.value}%
              </span>
            </span>
          </div>
        ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="relative inline-flex h-4 w-4">
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-slate-700 border-t-amber-500" />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "grafico" | "proporcoes" | "candidatos";

export function OtimizadorEmpacotamento() {
  const [resultado, setResultado] = useState<OtimizacaoOutput | null>(null);
  const [tab, setTab] = useState<Tab>("grafico");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const formId = useId();

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormZ),
    defaultValues: {
      materiais: [
        { origem: "DENSUS_DEFAULT", id: "M1",  descricao: "Areia Natural",   materialKey: "M1" },
        { origem: "DENSUS_DEFAULT", id: "G1",  descricao: "Brita 0",         materialKey: "G1" },
        { origem: "CATALOGO",      id: "CIM", descricao: "Cimento CP V-ARI", perfilId: "CP_V_ARI" },
      ],
      classeConcreto:  "CCV",
      modelo:          "ANDREASEN",
      funcaoObjetivo:  "RMSE",
      algoritmo:       "auto",
      passoGrid:       5,
      iteracoesMC:     50_000,
      usarBetaStar:    false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "materiais" });

  const watchMateriais    = watch("materiais");
  const watchUsarBetaStar = watch("usarBetaStar");
  const watchModelo       = watch("modelo");
  const watchAlgoritmo    = watch("algoritmo");
  const watchClasse       = watch("classeConcreto");

  const mutation = trpc.dosagem.otimizarMistura.useMutation({
    onSuccess: (data) => {
      setResultado(data as unknown as OtimizacaoOutput);
      setTab("grafico");
      toast(`Otimização concluída · ${(data as any).nCombinacoes?.toLocaleString("pt-BR") ?? ""} combinações`, "success");
    },
    onError: (err) => {
      toast(err.message ?? "Erro no cálculo", "error");
    },
  });

  const onSubmit: SubmitHandler<FormValues> = useCallback(
    (values) => {
      const fontes = values.materiais.map((m) =>
        m.origem === "DENSUS_DEFAULT"
          ? { origem: "DENSUS_DEFAULT" as const, id: m.id, descricao: m.descricao, materialKey: m.materialKey }
          : { origem: "CATALOGO" as const,      id: m.id, descricao: m.descricao, perfilId: m.perfilId }
      );

      const betaStarPorId = values.usarBetaStar
        ? Object.fromEntries(
            values.materiais
              .filter((m) => m.betaStar != null)
              .map((m) => [m.id, m.betaStar as number])
          )
        : undefined;

      const andreasenCustom = values.andreasenQ
        ? { q: values.andreasenQ, dMinMm: watchClasse === "UHPC" ? 0.0001 : 0.075, dMaxMm: 50 }
        : undefined;

      const rosinRammlerCustom = (values.rosinD63Mm && values.rosinN)
        ? { d63Mm: values.rosinD63Mm, n: values.rosinN }
        : undefined;

      mutation.mutate({
        fontes,
        classeConcreto:    values.classeConcreto,
        modelo:            values.modelo,
        funcaoObjetivo:    values.funcaoObjetivo,
        algoritmo:         values.algoritmo,
        passoGrid:         values.passoGrid,
        iteracoesMC:       values.iteracoesMC,
        limiarInteracaoCPM: 0.01,
        propMinimaPercent:  0,
        propMaximaPercent:  100,
        betaStarPorId,
        andreasenCustom,
        rosinRammlerCustom,
      });
    },
    [mutation, watchClasse]
  );

  const chartData = resultado ? buildChart(resultado) : [];

  // Qual curva de referência é a "alvo" para o modelo selecionado
  const alvoKey: keyof ChartPoint =
    watchModelo === "FULLER" ? "fuller" :
    watchModelo === "BOLOMEY" ? "bolomey" :
    watchModelo === "AIM" ? "aim" :
    watchModelo === "ROSIN_RAMMLER" ? "rosinRammler" : "andreasen";

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative flex h-screen overflow-hidden bg-slate-950 text-slate-300"
      style={{ fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR — PAINEL DE CONTROLE
      ═══════════════════════════════════════════════════════════════════ */}
      <aside className={[
        "flex flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950",
        "transition-transform duration-300 ease-in-out",
        "absolute inset-y-0 left-0 z-40 w-80 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}>

        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-600 text-[10px] font-bold text-white">
              01
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-wide">Motor de Empacotamento</h1>
              <p className="text-[9px] text-slate-600">AFD · Fuller-Thompson · CPM · AIM · Rosin-Rammler · WLS</p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form
          id={formId}
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex-1 space-y-5 px-5 py-4">

            {/* ── SEÇÃO: MATERIAIS ──────────────────────────────────── */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600">
                  Composição
                </span>
                <span className="text-[9px] text-slate-600">{fields.length} mat.</span>
              </div>

              <div className="space-y-2">
                {fields.map((field, idx) => {
                  const origem = watchMateriais[idx]?.origem ?? "DENSUS_DEFAULT";
                  return (
                    <div
                      key={field.id}
                      className="rounded-sm border border-slate-800 bg-slate-900/40 p-3"
                    >
                      {/* Header do material */}
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500">
                          [{idx + 1}] MATERIAL
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="rounded px-1.5 py-0.5 text-[9px] text-slate-600
                            transition hover:bg-red-900/40 hover:text-red-400"
                        >
                          ✕ remover
                        </button>
                      </div>

                      {/* Origem */}
                      <div className="mb-2">
                        <Label>Fonte</Label>
                        <Controller
                          control={control}
                          name={`materiais.${idx}.origem` as const}
                          render={({ field: f }) => (
                            <Select {...f}>
                              <option value="DENSUS_DEFAULT">Padrão Densus</option>
                              <option value="CATALOGO">Catálogo Laser</option>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Seleção específica */}
                      {origem === "DENSUS_DEFAULT" ? (
                        <div className="mb-2">
                          <Label>Agregado</Label>
                          <Controller
                            control={control}
                            name={`materiais.${idx}.materialKey` as const}
                            render={({ field: f }) => (
                              <Select {...f}>
                                {MATERIAL_KEYS.map((k) => (
                                  <option key={k} value={k}>
                                    {k} — {LABEL_MAT[k]}
                                  </option>
                                ))}
                              </Select>
                            )}
                          />
                        </div>
                      ) : (
                        <div className="mb-2">
                          <Label>Perfil Laser</Label>
                          <Controller
                            control={control}
                            name={`materiais.${idx}.perfilId` as const}
                            render={({ field: f }) => (
                              <Select {...f}>
                                {PERFIS_CAT.map((p) => (
                                  <option key={p} value={p}>
                                    {LABEL_PERF[p]}
                                  </option>
                                ))}
                              </Select>
                            )}
                          />
                        </div>
                      )}

                      {/* ID + Rótulo */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>ID</Label>
                          <Input
                            {...register(`materiais.${idx}.id` as const)}
                            placeholder="ex: M1"
                            error={(errors.materiais?.[idx] as any)?.id?.message}
                          />
                        </div>
                        <div>
                          <Label>Rótulo</Label>
                          <Input
                            {...register(`materiais.${idx}.descricao` as const)}
                            placeholder="ex: Areia"
                            error={(errors.materiais?.[idx] as any)?.descricao?.message}
                          />
                        </div>
                      </div>

                      {/* β* (condicional) */}
                      {watchUsarBetaStar && (
                        <div className="mt-2">
                          <Label>β* CPM [0.40–0.80]</Label>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0.565"
                            {...register(`materiais.${idx}.betaStar` as const, { valueAsNumber: true })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Adicionar material */}
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    append({
                      origem: "DENSUS_DEFAULT",
                      id: crypto.randomUUID(),
                      descricao: "",
                      materialKey: "M1",
                    })
                  }
                  className="rounded-sm border border-dashed border-slate-700 py-1.5
                    text-[9px] font-bold uppercase tracking-wider text-slate-500
                    transition hover:border-amber-700 hover:text-amber-500"
                >
                  + Agregado
                </button>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      origem: "CATALOGO",
                      id: crypto.randomUUID(),
                      descricao: "",
                      perfilId: "CP_V_ARI",
                    })
                  }
                  className="rounded-sm border border-dashed border-slate-700 py-1.5
                    text-[9px] font-bold uppercase tracking-wider text-slate-500
                    transition hover:border-amber-700 hover:text-amber-500"
                >
                  + Cim./Pó
                </button>
              </div>
              {errors.materiais?.message && (
                <p className="mt-1 text-[9px] text-red-400">{errors.materiais.message}</p>
              )}
            </section>

            {/* ── SEÇÃO: MODELO ─────────────────────────────────────── */}
            <section>
              <div className="mb-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600">
                  Modelo & Otimização
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Classe</Label>
                  <Select {...register("classeConcreto")}>
                    <option value="CCV">CCV — Convencional</option>
                    <option value="CAD">CAD — Alta Resistência</option>
                    <option value="UHPC">UHPC — Ultra-HP</option>
                  </Select>
                </div>
                <div>
                  <Label>Curva Alvo</Label>
                  <Select {...register("modelo")}>
                    <option value="ANDREASEN">Andreasen-Funk-Dinger (AFD)</option>
                    <option value="FULLER">Fuller-Thompson (1907)</option>
                    <option value="BOLOMEY">Bolomey (1935)</option>
                    <option value="AIM">AIM (Shilstone)</option>
                  </Select>
                  <p className="mt-1 text-[8px] text-slate-600">
                    AFD = Andreasen modificado com D_min (Funk &amp; Dinger 1994).
                    Fuller = caso especial q=0.5, D_min=0.
                  </p>
                </div>
                <div>
                  <Label>Função Objetivo</Label>
                  <Select {...register("funcaoObjetivo")}>
                    <option value="RMSE">RMSE</option>
                    <option value="RMSE_ATIVO">RMSE Ativo</option>
                    <option value="WLS">WLS log-pond.</option>
                  </Select>
                </div>
                <div>
                  <Label>Algoritmo</Label>
                  <Select {...register("algoritmo")}>
                    <option value="auto">Auto</option>
                    <option value="grid">Grid Search</option>
                    <option value="monte_carlo">Monte Carlo</option>
                  </Select>
                </div>
              </div>
            </section>

            {/* ── SEÇÃO: AVANÇADO ───────────────────────────────────── */}
            <section>
              <div className="mb-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600">
                  Avançado
                </span>
              </div>
              <div className="space-y-2">
                {watchAlgoritmo !== "monte_carlo" && (
                  <div>
                    <Label>Passo Grid (%)</Label>
                    <Input
                      type="number" min={1} max={10}
                      {...register("passoGrid", { valueAsNumber: true })}
                    />
                  </div>
                )}
                {watchAlgoritmo !== "grid" && (
                  <div>
                    <Label>Iterações Monte Carlo</Label>
                    <Input
                      type="number" step={5000}
                      {...register("iteracoesMC", { valueAsNumber: true })}
                    />
                  </div>
                )}
                <div>
                  <Label>q Andreasen personalizado</Label>
                  <Input
                    type="number" step={0.01} placeholder={"auto (classe)"}
                    {...register("andreasenQ", { valueAsNumber: true })}
                  />
                </div>
                {watchModelo === "ROSIN_RAMMLER" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>D63 (mm)</Label>
                      <Input
                        type="number" step={0.1} placeholder="auto"
                        {...register("rosinD63Mm", { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label>n (modulo)</Label>
                      <Input
                        type="number" step={0.05} placeholder="1.0"
                        {...register("rosinN", { valueAsNumber: true })}
                      />
                    </div>
                    <p className="col-span-2 text-[8px] text-slate-600">
                      D63 = tamanho a 63.2% passante (mm). n = modulo de distribuicao (0.8-1.5 tipico).
                    </p>
                  </div>
                )}
                <Controller
                  control={control}
                  name="usarBetaStar"
                  render={({ field: f }) => (
                    <Toggle
                      checked={f.value}
                      onChange={f.onChange}
                      label="Ativar β* por material (CPM diagnóstico)"
                    />
                  )}
                />
              </div>
            </section>
          </div>

          {/* Rodapé sticky */}
          <div className="border-t border-slate-800 p-5 space-y-2">
            <button
              type="submit"
              form={formId}
              disabled={mutation.isPending}
              className={[
                "flex w-full items-center justify-center gap-2.5 rounded-sm py-3",
                "text-[10px] font-bold uppercase tracking-[0.15em] transition",
                "active:scale-[0.98] disabled:opacity-50",
                mutation.isPending
                  ? "bg-amber-800 text-amber-300 cursor-wait"
                  : "bg-amber-600 text-slate-950 hover:bg-amber-500",
              ].join(" ")}
            >
              {mutation.isPending ? (
                <>
                  <Spinner />
                  <span>Computando...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                      fill="currentColor" />
                  </svg>
                  <span>Otimizar Mistura</span>
                </>
              )}
            </button>

            {mutation.isError && (
              <p className="text-[9px] text-red-400 text-center">
                ✕ {mutation.error?.message ?? "Erro no servidor"}
              </p>
            )}
            {resultado && !mutation.isPending && (
              <div className="flex justify-between text-[9px] text-slate-600">
                <span>✓ {resultado.nCombinacoes.toLocaleString("pt-BR")} combinações</span>
                <span>{resultado.tempoExecucaoMs} ms</span>
              </div>
            )}
          </div>
        </form>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          ÁREA PRINCIPAL — RESULTADOS
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-950">

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

        {/* Header */}
        <header className="flex items-start justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-200">
              Análise de Empacotamento Granulométrico
            </h2>
            {resultado ? (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                {[
                  ["Modelo", resultado.modeloCurva],
                  ["Algoritmo", resultado.algoritmo],
                  ["FO", resultado.funcaoObjetivo],
                  ["D_max", `${resultado.dmcMisturaMm.toFixed(2)} mm`],
                  ["MF", resultado.moduloFinuraMistura.toFixed(3)],
                  resultado.shilstone ? ["Shilstone", `${resultado.shilstone.zona} (WF=${resultado.shilstone.workabilityFactor.toFixed(1)}, CF=${resultado.shilstone.coarsenessFactor.toFixed(1)})`] : null,
                ]
                .filter((x): x is string[] => x != null)
                .map(([k, v]) => (
                  <span key={k} className="text-[9px] text-slate-600">
                    <span className="text-slate-500">{k}: </span>
                    <span className="text-amber-500 font-bold">{v}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[9px] text-slate-700">
                Configure a composição e execute a otimização
              </p>
            )}
          </div>

          {mutation.isPending && (
            <div className="flex items-center gap-2 rounded-sm border border-amber-800/50
              bg-amber-900/20 px-3 py-1.5">
              <Spinner />
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                Processando
              </span>
            </div>
          )}
        </header>

        {/* ── ESTADO VAZIO ────────────────────────────────────────────── */}
        {!resultado && !mutation.isPending && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border border-slate-800 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border border-slate-700 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-amber-600/30" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-600/60 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Aguardando parâmetros
              </p>
              <p className="mt-1 text-[9px] text-slate-700">
                Configure os materiais e clique em Otimizar Mistura
              </p>
            </div>
          </div>
        )}

        {/* ── LOADING ─────────────────────────────────────────────────── */}
        {mutation.isPending && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-slate-800 border-t-amber-600" />
              <div className="absolute inset-3 animate-spin rounded-full border-2 border-slate-800 border-t-amber-400"
                style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
              <div className="absolute inset-6 rounded-full bg-amber-600/20" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                Otimizando partículas
              </p>
              <p className="text-[9px] text-slate-600">Avaliando combinações granulométricas...</p>
            </div>
          </div>
        )}

        {/* ── RESULTADOS ──────────────────────────────────────────────── */}
        {resultado && !mutation.isPending && (
          <div className="flex flex-1 flex-col overflow-hidden">

            {/* KPI ROW */}
            <div className="grid grid-cols-4 gap-3 border-b border-slate-800 p-5">
              <KpiCard
                label="β* CPM"
                formula="Emp. virtual (De Larrard 1999)"
                value={n(resultado.metricas.betaStarCPM, 4)}
                sub={resultado.metricas.teorVaziosCPM != null
                  ? `Vazios CPM: ${n(resultado.metricas.teorVaziosCPM, 2)}%`
                  : "Ativar β* por material"}
                variant="amber"
              />
              <KpiCard
                label="RMSE"
                formula="√(Σ(P_ideal − P_otim)²/n)"
                value={n(resultado.metricas.rmse, 5)}
                sub={resultado.metricas.rmseAtivo != null
                  ? `RMSE Ativo: ${n(resultado.metricas.rmseAtivo, 5)}`
                  : "Desvio da curva ideal"}
                variant="sky"
              />
              <KpiCard
                label={resultado.metricas.wls != null ? "WLS" : "Teor de Vazios"}
                formula={resultado.metricas.wls != null ? "Σ w_i·(P_i − P̂_i)²" : "1 − φ estimado"}
                value={resultado.metricas.wls != null
                  ? n(resultado.metricas.wls, 5)
                  : `${n(resultado.metricas.teorVaziosPct, 2)}%`}
                sub={resultado.metricas.wls != null
                  ? "Erro ponderado (least-squares)"
                  : `φ = ${n(resultado.metricas.phiEstimado, 3)}`}
                variant="emerald"
              />
              <KpiCard
                label="Eficiência η"
                formula="fcm/mc — frac. aproveitamento"
                value={n(resultado.metricas.eficiencia, 4)}
                sub={`${resultado.nCombinacoes.toLocaleString("pt-BR")} combinações em ${resultado.tempoExecucaoMs}ms`}
                variant="rose"
              />
            </div>

            {/* Export PDF */}
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => {
                  try {
                    gerarPdfEmpacotamento(resultado as any);
                    toast("PDF exportado com sucesso", "success");
                  } catch (e: any) {
                    toast(e.message ?? "Erro ao gerar PDF", "error");
                  }
                }}
                className="flex items-center gap-1.5 rounded-sm border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:border-amber-600/50 hover:text-amber-400 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" />
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                Exportar PDF
              </button>
            </div>

            {/* TABS */}
            <div className="flex border-b border-slate-800">
              {([
                ["grafico",     "Gráfico Granulométrico"],
                ["proporcoes",  "Proporções & Propriedades"],
                ["candidatos",  ],
              ] as [Tab, string][]).map(([t, lbl]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={[
                    "border-b-2 px-5 py-3 text-[9px] font-bold uppercase tracking-[0.15em] transition",
                    tab === t
                      ? "border-amber-600 text-amber-400"
                      : "border-transparent text-slate-600 hover:text-slate-400",
                  ].join(" ")}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* ── TAB: GRÁFICO ──────────────────────────────────────── */}
            {tab === "grafico" && (
              <div className="flex flex-1 flex-col overflow-y-auto p-5">

                {/* Legenda manual */}
                <div className="mb-3 flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3"
                      stroke={TOKEN.amber} strokeWidth="2.5"/></svg>
                    <span className="text-[9px] text-slate-400">Mistura Ótima</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3"
                      stroke={TOKEN.sky} strokeWidth="1.5" strokeDasharray="4 2"/></svg>
                    <span className="text-[9px] text-slate-400">Curva Alvo ({watchModelo})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3"
                      stroke="#334155" strokeWidth="1" strokeDasharray="2 3"/></svg>
                    <span className="text-[9px] text-slate-600">Fuller-Thompson (ref.)</span>
                  </div>
                  <div className="ml-auto text-[9px] text-slate-700">
                    Eixo X em escala logarítmica · 0.0001 mm → 50 mm
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={380}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 4, right: 20, bottom: 36, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="1 4"
                      stroke="#1E293B"
                      horizontal
                      vertical
                    />
                    <XAxis
                      dataKey="abertura"
                      type="number"
                      scale="log"
                      domain={[0.0001, 50]}
                      allowDataOverflow
                      ticks={LOG_TICKS}
                      tickFormatter={(v) =>
                        v >= 1   ? String(v) :
                        v >= 0.01 ? v.toFixed(v < 0.1 ? 3 : 2) :
                        v >= 0.001 ? v.toFixed(4) :
                        v.toExponential(0)
                      }
                      tick={{ fontSize: 8, fill: "#475569", fontFamily: "monospace" }}
                      label={{
                        value: "Abertura de peneira (mm) — escala log",
                        position: "insideBottom",
                        offset: -24,
                        fontSize: 9,
                        fill: "#475569",
                        fontFamily: "monospace",
                      }}
                      minTickGap={6}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickCount={11}
                      tick={{ fontSize: 8, fill: "#475569", fontFamily: "monospace" }}
                      tickFormatter={(v) => `${v}`}
                      width={30}
                      label={{
                        value: "% passante",
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        fontSize: 9,
                        fill: "#475569",
                        fontFamily: "monospace",
                      }}
                    />
                    <Tooltip content={<GranuloTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />

                    {/* Fuller sempre como referência de fundo */}
                    {alvoKey !== "fuller" && (
                      <Line dataKey="fuller" name="Fuller" dot={false} connectNulls
                        stroke="#334155" strokeWidth={1} strokeDasharray="2 4" isAnimationActive={false} />
                    )}
                    {/* Bolomey se for alvo */}
                    {alvoKey === "bolomey" && (
                      <Line dataKey="bolomey" name="Bolomey" dot={false} connectNulls
                        stroke={TOKEN.sky} strokeWidth={1.5} strokeDasharray="5 3" isAnimationActive={false} />
                    )}
                    {/* AIM se for alvo */}
                    {alvoKey === "aim" && resultado.curvasReferencia.aim && (
                      <Line dataKey="aim" name="AIM" dot={false} connectNulls
                        stroke={TOKEN.sky} strokeWidth={1.5} strokeDasharray="5 3" isAnimationActive={false} />
                    )}
                    {/* Andreasen se for alvo */}
                    {alvoKey === "andreasen" && (
                      <Line dataKey="andreasen" name="Andreasen" dot={false} connectNulls
                        stroke={TOKEN.sky} strokeWidth={1.5} strokeDasharray="5 3" isAnimationActive={false} />
                    )}
                    {/* Fuller como alvo */}
                    {alvoKey === "fuller" && (
                      <Line dataKey="fuller" name="Fuller-Thompson" dot={false} connectNulls
                        stroke={TOKEN.sky} strokeWidth={1.5} strokeDasharray="5 3" isAnimationActive={false} />
                    )}
                    {/* Rosin-Rammler como alvo */}
                    {alvoKey === "rosinRammler" && resultado.curvasReferencia.rosinRammler && (
                      <Line dataKey="rosinRammler" name="Rosin-Rammler" dot={false} connectNulls
                        stroke={TOKEN.sky} strokeWidth={1.5} strokeDasharray="5 3" isAnimationActive={false} />
                    )}

                    {/* Mistura ótima — protagonista */}
                    <Line
                      dataKey="otima"
                      name="Mistura Ótima"
                      dot={false}
                      connectNulls
                      stroke={TOKEN.amber}
                      strokeWidth={2.5}
                      isAnimationActive
                      animationDuration={800}
                      animationEasing="ease-out"
                    />

                    {/* Linhas de referência granulométrica */}
                    <ReferenceLine x={0.075} stroke="#1E293B" strokeDasharray="1 3"
                      label={{ value: "75μm", fontSize: 7, fill: "#334155", position: "insideTopRight" }} />
                    <ReferenceLine x={4.75} stroke="#1E293B" strokeDasharray="1 3"
                      label={{ value: "4.75mm", fontSize: 7, fill: "#334155", position: "insideTopRight" }} />
                  </LineChart>
                </ResponsiveContainer>

                {/* Parâmetros Andreasen + Shilstone */}
                <div className="mt-3 flex flex-wrap gap-4 rounded-sm border border-slate-800
                  bg-slate-900/30 px-4 py-2.5">
                  {[
                    ["q",      resultado.paramsAndreasenUsados.q.toFixed(2)],
                    ["D_min",  ],
                    ["D_max", `${resultado.dmcMisturaMm.toFixed(2)} mm`],
                    resultado.shilstone ? ["Shilstone WF", resultado.shilstone.workabilityFactor.toFixed(1)] : null,
                    resultado.shilstone ? ["CF",           resultado.shilstone.coarsenessFactor.toFixed(1)]  : null,
                    resultado.shilstone ? ["Zona",         resultado.shilstone.zona]                         : null,
                  ].filter((x): x is string[] => x != null).map(([k, v]) => (
                    <span key={k} className="text-[9px]">
                      <span className="text-slate-600">{k} = </span>
                      <span className="text-amber-400 font-bold">{v}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: PROPORÇÕES & PROPRIEDADES ──────────────────── */}
            {tab === "proporcoes" && (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Barras de proporção */}
                  <div>
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                      Proporções ótimas
                    </p>
                    <div className="space-y-3">
                      {Object.entries(resultado.proporcoes)
                        .sort(([, a], [, b]) => b - a)
                        .map(([id, frac], i) => {
                          const pct = frac * 100;
                          const colors = [TOKEN.amber, TOKEN.sky, TOKEN.emerald, "#7C3AED", TOKEN.rose, TOKEN.slate500];
                          const color = colors[i % colors.length];
                          return (
                            <div key={id}>
                              <div className="mb-1 flex justify-between">
                                <span className="text-[10px] font-bold" style={{ color }}>
                                  {id}
                                </span>
                                <span className="font-mono text-[10px] text-slate-300">
                                  {pct.toFixed(2)} %
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, background: color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Tabela de propriedades */}
                  <div className="rounded-sm border border-slate-800">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/60">
                          <th className="px-4 py-2 text-left text-[9px] font-bold uppercase
                            tracking-[0.15em] text-slate-500">
                            Propriedade
                          </th>
                          <th className="px-4 py-2 text-right text-[9px] font-bold uppercase
                            tracking-[0.15em] text-slate-500">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {[
                          ["RMSE",               n(resultado.metricas.rmse, 5)],
                          ["RMSE Ativo",          n(resultado.metricas.rmseAtivo, 5)],
                          ["WLS",                 n(resultado.metricas.wls, 5)],
                          ["β* CPM",              n(resultado.metricas.betaStarCPM, 4)],
                          ["φ estimado",           n(resultado.metricas.phiEstimado, 4)],
                          ["Teor vazios (Andreason)", `${n(resultado.metricas.teorVaziosPct, 2)}%`],
                          ["Teor vazios (CPM)",   resultado.metricas.teorVaziosCPM != null ? `${n(resultado.metricas.teorVaziosCPM, 2)}%` : "—"],
                          ["Eficiência η",         n(resultado.metricas.eficiencia, 4)],
                          ["Módulo de Finura",     n(resultado.moduloFinuraMistura, 3)],
                          ["D_max mistura",        `${n(resultado.dmcMisturaMm, 2)} mm`],
                          ["Combinações aval.",    resultado.nCombinacoes.toLocaleString("pt-BR")],
                          ["Tempo execução",       `${resultado.tempoExecucaoMs} ms`],
                        ].map(([prop, val]) => (
                          <tr key={prop} className="hover:bg-slate-900/40 transition-colors">
                            <td className="px-4 py-2 text-slate-500">{prop}</td>
                            <td className="px-4 py-2 text-right font-bold text-amber-400">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: CANDIDATOS ───────────────────────────────────── */}
            {tab === "candidatos" && (
              <div className="flex-1 overflow-auto p-5">
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Top {resultado.topCandidatos.length} candidatos — ordenados por função objetivo
                </p>
                <div className="rounded-sm border border-slate-800 overflow-x-auto">
                  <table className="w-full text-[10px] whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60">
                        {["#", "RMSE", "RMSE Ativo", "WLS", "β* CPM", "Vazios %", "MF", "Proporções"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-[9px] font-bold
                            uppercase tracking-[0.12em] text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {resultado.topCandidatos.map((c, i) => (
                        <tr
                          key={i}
                          className={[
                            "transition-colors hover:bg-slate-900/60",
                            i === 0 ? "bg-amber-600/5" : "",
                          ].join(" ")}
                        >
                          <td className="px-3 py-2">
                            {i === 0
                              ? <span className="font-bold text-amber-400">★</span>
                              : <span className="text-slate-700">{i + 1}</span>
                            }
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-200">{n(c.rmse, 5)}</td>
                          <td className="px-3 py-2 text-slate-500">{n(c.rmseAtivo, 5)}</td>
                          <td className="px-3 py-2 text-slate-500">{n(c.wls, 5)}</td>
                          <td className="px-3 py-2 text-slate-500">{n(c.betaStarCPM, 4)}</td>
                          <td className="px-3 py-2 text-slate-500">{n(c.teorVaziosPct, 2)}</td>
                          <td className="px-3 py-2 text-slate-500">{n(c.moduloFinuraMistura, 3)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(c.proporcoes)
                                .sort(([, a], [, b]) => b - a)
                                .map(([id, frac]) => (
                                  <span key={id}
                                    className="rounded-sm bg-slate-800 px-1.5 py-0.5
                                      text-[9px] font-bold text-slate-300">
                                    {id}: {(frac * 100).toFixed(1)}%
                                  </span>
                                ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

export default OtimizadorEmpacotamento;
