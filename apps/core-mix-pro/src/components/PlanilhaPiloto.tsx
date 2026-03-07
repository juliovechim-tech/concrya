"use client";

/**
 * @file components/PlanilhaPiloto.tsx
 * @description CORE MIX PRO — Módulo 03: Escalonamento Piloto
 *
 * UI para o endpoint escalonarPiloto (laboratorio.ts).
 * Converte traço 1m³ em planilha de pesagem para betoneira de laboratório.
 */

import { useState, useEffect } from "react";
import { useToast } from "./Toast";
import { gerarPdfPiloto } from "../lib/relatorio-pdf";
import { exportCsv } from "../lib/export-csv";
import {
  useForm,
  useFieldArray,
  Controller,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "../lib/trpc";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = {
  amber:    "#D97706",
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
// GEOMETRIAS (espelha GeometriaCpId de laboratorio.ts)
// ─────────────────────────────────────────────────────────────────────────────

const GEOMETRIAS = [
  { id: "CIL_10_20",            label: "Cilindro 10x20 cm" },
  { id: "CIL_15_30",            label: "Cilindro 15x30 cm" },
  { id: "CIL_5_10",             label: "Cilindro 5x10 cm" },
  { id: "CIL_7P5_15",           label: "Cilindro 7,5x15 cm" },
  { id: "MINI_CONE",            label: "Mini Cone" },
  { id: "PRI_4_4_16",           label: "Prisma 4x4x16 cm" },
  { id: "PRI_10_10_40",         label: "Prisma 10x10x40 cm" },
  { id: "PRI_15_15_50",         label: "Prisma 15x15x50 cm" },
  { id: "PRI_ENTALHE_15_15_55", label: "Prisma Entalhe 15x15x55 cm" },
  { id: "PRI_RETRACAO_25",      label: "Prisma Retracao 25 mm" },
  { id: "PRI_RETRACAO_40",      label: "Prisma Retracao 40 mm" },
  { id: "CUBO_4",               label: "Cubo 4 cm" },
  { id: "CUBO_10",              label: "Cubo 10 cm" },
  { id: "CUBO_15",              label: "Cubo 15 cm" },
  { id: "PLACA_GRC_4PT_60_25",  label: "Placa GRC 4pt 60x25" },
  { id: "PLACA_GRC_3PT_45_15",  label: "Placa GRC 3pt 45x15" },
] as const;

const IDADES = ["12h", "24h", "3d", "7d", "14d", "28d", "56d", "91d"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

type PlanilhaItem = {
  descricao:        string;
  massaKg1m3:       number;
  massaKgBetoneira: number;
  massaGrBetoneira: number;
  precisaoPesagem:  string;
};

type LoteDim = {
  geometria:           string;
  descricaoGeometria:  string;
  quantidade:          number;
  idadesRompimento:    string[];
  volumeUnitarioDm3:   number;
  volumeLoteSemPerdaL: number;
};

type ResultadoPiloto = {
  dimensionamentoCps: {
    lotes:                LoteDim[];
    volumeTotalSemPerdaL: number;
    fatorPerda:           number;
    volumeTotalComPerdaL: number;
    volumeBetoneira:      number;
  };
  planilhaPesagem: {
    volumeBetoneira:     number;
    fatorEscala:         number;
    massaTotalBetoneira: number;
    materiais:           PlanilhaItem[];
  };
  resumo: {
    totalCPs:        number;
    volumeBetoneira: number;
    massaTotalKg:    number;
    avisoVolume:     string | null;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// FORM SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const MatCompZ = z.object({
  descricao: z.string().min(1),
  massaKgM3: z.number().min(0),
});

const LoteZ = z.object({
  geometria:        z.string().min(1),
  quantidade:       z.number().int().positive().max(100),
  idadesRompimento: z.array(z.string()).min(1),
});

const FormZ = z.object({
  // Composicao M3
  cimento:   MatCompZ,
  agua:      MatCompZ,
  areia1:    MatCompZ,
  areia2:    MatCompZ.optional(),
  brita1:    MatCompZ,
  brita2:    MatCompZ.optional(),
  aditivoSp: MatCompZ.optional(),
  scm:       MatCompZ.optional(),

  // Lotes de CPs
  lotesCp:              z.array(LoteZ).min(1),
  fatorPerda:           z.number().min(0).max(0.50),
  volumeMinimoBetoneira: z.number().positive().max(500),

  // Toggles
  usarAreia2:    z.boolean(),
  usarBrita2:    z.boolean(),
  usarAditivoSp: z.boolean(),
  usarScm:       z.boolean(),
});

type FormValues = z.infer<typeof FormZ>;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const n = (v: number | null | undefined, d = 2): string =>
  v == null ? "—" : v.toFixed(d);

/** Formata massa automaticamente: >= 1000g mostra em kg, < 1000g mostra em g */
const fmtMassa = (gramas: number): { valor: string; unidade: string } => {
  if (gramas >= 1000) {
    return { valor: (gramas / 1000).toFixed(2), unidade: "kg" };
  }
  return { valor: gramas.toFixed(1), unidade: "g" };
};

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
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-left">
      <span className={[
        "relative inline-flex h-4 w-7 flex-shrink-0 rounded-full border transition-colors",
        checked ? "border-amber-600 bg-amber-600" : "border-slate-600 bg-slate-800",
      ].join(" ")}>
        <span className={[
          "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-3" : "translate-x-0.5",
        ].join(" ")} />
      </span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </button>
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

export function PlanilhaPiloto() {
  const [resultado, setResultado] = useState<ResultadoPiloto | null>(null);
  const [tab, setTab] = useState(0);
  const [importado, setImportado] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const mutation = trpc.dosagem.escalonarPiloto.useMutation({
    onSuccess: (data) => {
      setResultado(data as unknown as ResultadoPiloto);
      toast("Escalonamento piloto calculado", "success");
    },
    onError: (err) => {
      toast(err.message ?? "Erro no escalonamento", "error");
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormZ),
    defaultValues: {
      cimento:   { descricao: "Cimento",   massaKgM3: 400 },
      agua:      { descricao: "Agua",      massaKgM3: 200 },
      areia1:    { descricao: "Areia 1",   massaKgM3: 650 },
      brita1:    { descricao: "Brita 1",   massaKgM3: 1050 },
      lotesCp:   [{ geometria: "CIL_10_20", quantidade: 5, idadesRompimento: ["7d", "28d"] }],
      fatorPerda:           0.20,
      volumeMinimoBetoneira: 5,
      usarAreia2:    false,
      usarBrita2:    false,
      usarAditivoSp: false,
      usarScm:       false,
    },
  });

  const { fields: loteFields, append: appendLote, remove: removeLote } = useFieldArray({
    control,
    name: "lotesCp",
  });

  const usarAreia2    = watch("usarAreia2");
  const usarBrita2    = watch("usarBrita2");
  const usarAditivoSp = watch("usarAditivoSp");
  const usarScm       = watch("usarScm");

  // Tentar importar do sessionStorage (formato genérico linhas[])
  const importarDoTraco = () => {
    try {
      const raw = sessionStorage.getItem("coreMixPro:composicaoM3");
      if (!raw) return;
      const comp = JSON.parse(raw);
      const linhas: { categoria: string; descricao: string; massaKgM3: number }[] = comp.linhas ?? [];
      if (linhas.length === 0) return;

      // Helper: find first or Nth line by category
      const findCat = (cat: string, idx = 0) => linhas.filter(l => l.categoria === cat)[idx];

      const cim = findCat("cimento");
      if (cim) { setValue("cimento.descricao", cim.descricao); setValue("cimento.massaKgM3", cim.massaKgM3); }
      const agua = findCat("agua");
      if (agua) { setValue("agua.descricao", agua.descricao); setValue("agua.massaKgM3", agua.massaKgM3); }

      const areias = linhas.filter(l => l.categoria === "areia");
      if (areias[0]) { setValue("areia1.descricao", areias[0].descricao); setValue("areia1.massaKgM3", areias[0].massaKgM3); }
      if (areias[1]) { setValue("usarAreia2", true); setValue("areia2", { descricao: areias[1].descricao, massaKgM3: areias[1].massaKgM3 }); }

      const britas = linhas.filter(l => l.categoria === "brita");
      if (britas[0]) { setValue("brita1.descricao", britas[0].descricao); setValue("brita1.massaKgM3", britas[0].massaKgM3); }
      if (britas[1]) { setValue("usarBrita2", true); setValue("brita2", { descricao: britas[1].descricao, massaKgM3: britas[1].massaKgM3 }); }

      const sp = findCat("aditivoSp");
      if (sp) { setValue("usarAditivoSp", true); setValue("aditivoSp", { descricao: sp.descricao, massaKgM3: sp.massaKgM3 }); }
      const scm = findCat("scm");
      if (scm) { setValue("usarScm", true); setValue("scm", { descricao: scm.descricao, massaKgM3: scm.massaKgM3 }); }

      setImportado(true);
    } catch { /* ignore */ }
  };

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const linhas: { categoria: string; id: string; descricao: string; massaKgM3: number }[] = [
      { categoria: "cimento", id: "cim", descricao: data.cimento.descricao, massaKgM3: data.cimento.massaKgM3 },
      { categoria: "agua", id: "agua", descricao: data.agua.descricao, massaKgM3: data.agua.massaKgM3 },
      { categoria: "areia", id: "areia1", descricao: data.areia1.descricao, massaKgM3: data.areia1.massaKgM3 },
      ...(data.usarAreia2 && data.areia2 ? [{ categoria: "areia", id: "areia2", descricao: data.areia2.descricao, massaKgM3: data.areia2.massaKgM3 }] : []),
      { categoria: "brita", id: "brita1", descricao: data.brita1.descricao, massaKgM3: data.brita1.massaKgM3 },
      ...(data.usarBrita2 && data.brita2 ? [{ categoria: "brita", id: "brita2", descricao: data.brita2.descricao, massaKgM3: data.brita2.massaKgM3 }] : []),
      ...(data.usarAditivoSp && data.aditivoSp ? [{ categoria: "aditivoSp", id: "sp", descricao: data.aditivoSp.descricao, massaKgM3: data.aditivoSp.massaKgM3 }] : []),
      ...(data.usarScm && data.scm ? [{ categoria: "scm", id: "scm", descricao: data.scm.descricao, massaKgM3: data.scm.massaKgM3 }] : []),
    ];

    mutation.mutate({
      composicaoM3: { linhas } as any,
      lotesCp: data.lotesCp.map((l) => ({
        geometria:        l.geometria as any,
        quantidade:       l.quantidade,
        idadesRompimento: l.idadesRompimento as any[],
      })),
      fatorPerda:            data.fatorPerda,
      volumeMinimoBetoneira: data.volumeMinimoBetoneira,
    });
  };

  // Planilha items for table
  const planilhaItems = resultado ? resultado.planilhaPesagem.materiais : [];

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
              03
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-wide">Escalonamento Piloto</h1>
              <p className="text-[9px] text-slate-600">Planilha de pesagem + dimensionamento CPs</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col px-5 pb-5">
          {/* ─── COMPOSICAO DE REFERENCIA ─────────────────────────── */}
          <Ruler label="Composicao de Referencia" />

          <button
            type="button"
            onClick={importarDoTraco}
            className={[
              "mb-3 w-full rounded py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition",
              importado
                ? "bg-emerald-600/10 text-emerald-400 border border-emerald-600/30"
                : "bg-sky-600/10 text-sky-400 border border-sky-600/30 hover:bg-sky-600/20",
            ].join(" ")}
          >
            {importado ? "Importado do Traco" : "Importar do Traco Calculado"}
          </button>

          <div className="space-y-2">
            {/* Cimento */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>Cimento</Label>
                <Input {...register("cimento.descricao")} />
              </div>
              <div>
                <Label>kg/m3</Label>
                <Input type="number" step="any" {...register("cimento.massaKgM3", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Agua */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>Agua</Label>
                <Input {...register("agua.descricao")} />
              </div>
              <div>
                <Label>kg/m3</Label>
                <Input type="number" step="any" {...register("agua.massaKgM3", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Areia 1 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>Areia 1</Label>
                <Input {...register("areia1.descricao")} />
              </div>
              <div>
                <Label>kg/m3</Label>
                <Input type="number" step="any" {...register("areia1.massaKgM3", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Brita 1 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>Brita 1</Label>
                <Input {...register("brita1.descricao")} />
              </div>
              <div>
                <Label>kg/m3</Label>
                <Input type="number" step="any" {...register("brita1.massaKgM3", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Opcionais */}
            <div className="space-y-2 pt-2">
              <Controller name="usarAreia2" control={control}
                render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Areia 2" />} />
              {usarAreia2 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Input {...register("areia2.descricao")} placeholder="Areia 2" /></div>
                  <div><Input type="number" step="any" {...register("areia2.massaKgM3", { valueAsNumber: true })} /></div>
                </div>
              )}

              <Controller name="usarBrita2" control={control}
                render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Brita 2" />} />
              {usarBrita2 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Input {...register("brita2.descricao")} placeholder="Brita 2" /></div>
                  <div><Input type="number" step="any" {...register("brita2.massaKgM3", { valueAsNumber: true })} /></div>
                </div>
              )}

              <Controller name="usarAditivoSp" control={control}
                render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Aditivo SP" />} />
              {usarAditivoSp && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Input {...register("aditivoSp.descricao")} placeholder="Aditivo SP" /></div>
                  <div><Input type="number" step="0.1" {...register("aditivoSp.massaKgM3", { valueAsNumber: true })} /></div>
                </div>
              )}

              <Controller name="usarScm" control={control}
                render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="SCM" />} />
              {usarScm && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Input {...register("scm.descricao")} placeholder="SCM" /></div>
                  <div><Input type="number" step="any" {...register("scm.massaKgM3", { valueAsNumber: true })} /></div>
                </div>
              )}
            </div>
          </div>

          {/* ─── CORPOS DE PROVA ──────────────────────────────────── */}
          <Ruler label="Corpos de Prova" />

          <div className="space-y-3">
            {loteFields.map((f, i) => (
              <div key={f.id} className="rounded border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-slate-500">Lote {i + 1}</span>
                  {loteFields.length > 1 && (
                    <button type="button" onClick={() => removeLote(i)}
                      className="text-[10px] text-red-500 hover:text-red-400">X</button>
                  )}
                </div>

                <div>
                  <Label>Geometria</Label>
                  <Select {...register(`lotesCp.${i}.geometria`)}>
                    {GEOMETRIAS.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" step="1" {...register(`lotesCp.${i}.quantidade`, { valueAsNumber: true })} />
                </div>

                <div>
                  <Label>Idades de Rompimento</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {IDADES.map((idade) => (
                      <label key={idade} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          value={idade}
                          {...register(`lotesCp.${i}.idadesRompimento`)}
                          className="h-3 w-3 rounded-sm border-slate-600 bg-slate-900 text-amber-600 focus:ring-0"
                        />
                        <span className="text-[10px] text-slate-400">{idade}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => appendLote({ geometria: "CIL_10_20", quantidade: 3, idadesRompimento: ["28d"] })}
              className="w-full rounded border border-dashed border-slate-700 py-1.5 text-[10px] text-amber-500 hover:border-amber-600 hover:text-amber-400 transition"
            >
              + Adicionar Lote
            </button>
          </div>

          {/* ─── PARAMETROS ───────────────────────────────────────── */}
          <Ruler label="Parametros" />

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Fator Perda (%)</Label>
                <Input type="number" step="any"
                  {...register("fatorPerda", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Vol. Min. Beton. (L)</Label>
                <Input type="number" step="any"
                  {...register("volumeMinimoBetoneira", { valueAsNumber: true })} />
              </div>
            </div>
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
                  Calculando...
                </span>
              ) : (
                "Escalonar Piloto"
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
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke={TOKEN.slate700} strokeWidth="1.5" />
                  <path d="M4 10h16M10 4v16" stroke={TOKEN.slate700} strokeWidth="1.5" />
                </svg>
              </div>
              <p className="text-[11px] text-slate-600">
                Configure a composicao e clique em <span className="text-amber-500">Escalonar Piloto</span>
              </p>
              <p className="mt-1 text-[9px] text-slate-700">
                Planilha de pesagem em gramas + dimensionamento de CPs
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <KpiCard
                label="Total CPs"
                value={String(resultado.resumo.totalCPs)}
                unit="unid."
                variant="amber"
              />
              <KpiCard
                label="Volume Betoneira"
                value={n(resultado.resumo.volumeBetoneira, 1)}
                unit="L"
                variant="sky"
              />
              <KpiCard
                label="Massa Total"
                value={n(resultado.resumo.massaTotalKg, 1)}
                unit="kg"
                variant="emerald"
              />
              <KpiCard
                label="Fator Escala"
                value={n(resultado.planilhaPesagem.fatorEscala, 6)}
                sub="L_bet / 1000"
                variant="slate"
              />
            </div>

            {/* Aviso */}
            {resultado.resumo.avisoVolume && (
              <div className="mb-4 rounded border border-amber-600/30 bg-amber-600/5 px-4 py-2">
                <p className="text-[10px] text-amber-400">{resultado.resumo.avisoVolume}</p>
              </div>
            )}

            {/* Export PDF + CSV */}
            <div className="mb-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  try {
                    gerarPdfPiloto(resultado as any);
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
              <button
                onClick={() => {
                  const rows = planilhaItems.map((item) => ({
                    descricao: item.descricao,
                    massaKg1m3: Number(item.massaKg1m3.toFixed(1)),
                    massaGrBetoneira: Number(item.massaGrBetoneira.toFixed(1)),
                    precisaoPesagem: item.precisaoPesagem,
                  }));
                  exportCsv("planilha-piloto.csv", {
                    descricao: "Material",
                    massaKg1m3: "Massa 1m³ (kg)",
                    massaGrBetoneira: "Massa Betoneira (g)",
                    precisaoPesagem: "Precisão",
                  }, rows);
                  toast("CSV exportado com sucesso", "success");
                }}
                className="flex items-center gap-1.5 rounded-sm border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:border-emerald-600/50 hover:text-emerald-400 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Exportar CSV
              </button>
            </div>

            <Tabs tabs={["Planilha Pesagem", "Dimensionamento CPs", "Resumo"]} active={tab} onChange={setTab} />

            {/* ─── TAB: PLANILHA DE PESAGEM ──────────────────────── */}
            {tab === 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500">
                    Volume betoneira: {n(resultado.planilhaPesagem.volumeBetoneira, 1)} L
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="rounded border border-slate-700 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:border-amber-600 hover:text-amber-400 transition print:hidden"
                  >
                    Imprimir
                  </button>
                </div>

                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2 text-left">Material</th>
                      <th className="px-3 py-2 text-right">Massa 1m3 (kg)</th>
                      <th className="px-3 py-2 text-right">Massa Betoneira</th>
                      <th className="px-3 py-2 text-right">Precisao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planilhaItems.map((item, i) => {
                      const m = fmtMassa(item.massaGrBetoneira);
                      return (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                          <td className="px-3 py-2 text-slate-300">{item.descricao}</td>
                          <td className="px-3 py-2 text-right text-slate-400">{n(item.massaKg1m3, 1)}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-200">
                            {m.valor} <span className="text-[9px] text-slate-500">{m.unidade}</span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500">{item.precisaoPesagem}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-amber-600/30 font-bold">
                      <td className="px-3 py-2 text-amber-400">TOTAL</td>
                      <td className="px-3 py-2 text-right text-amber-400">—</td>
                      <td className="px-3 py-2 text-right text-amber-400">
                        {(() => { const t = fmtMassa(resultado.planilhaPesagem.massaTotalBetoneira * 1000); return `${t.valor} ${t.unidade}`; })()}
                      </td>
                      <td className="px-3 py-2" />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── TAB: DIMENSIONAMENTO CPS ──────────────────────── */}
            {tab === 1 && (
              <div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2 text-left">Geometria</th>
                      <th className="px-3 py-2 text-right">Qtd.</th>
                      <th className="px-3 py-2 text-left">Idades</th>
                      <th className="px-3 py-2 text-right">Vol. Unit. (dm3)</th>
                      <th className="px-3 py-2 text-right">Vol. Lote (L)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.dimensionamentoCps.lotes.map((l, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        <td className="px-3 py-2 text-slate-300">{l.descricaoGeometria}</td>
                        <td className="px-3 py-2 text-right text-slate-200">{l.quantidade}</td>
                        <td className="px-3 py-2 text-slate-400">{l.idadesRompimento.join(", ")}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{n(l.volumeUnitarioDm3, 4)}</td>
                        <td className="px-3 py-2 text-right text-slate-200">{n(l.volumeLoteSemPerdaL, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 space-y-1 px-3 text-[10px] text-slate-500">
                  <p>Volume total s/ perda: {n(resultado.dimensionamentoCps.volumeTotalSemPerdaL, 2)} L</p>
                  <p>Fator perda: {n(resultado.dimensionamentoCps.fatorPerda * 100, 0)}%</p>
                  <p>Volume total c/ perda: {n(resultado.dimensionamentoCps.volumeTotalComPerdaL, 2)} L</p>
                  <p className="font-bold text-slate-300">Volume betoneira: {n(resultado.dimensionamentoCps.volumeBetoneira, 2)} L</p>
                </div>
              </div>
            )}

            {/* ─── TAB: RESUMO ───────────────────────────────────── */}
            {tab === 2 && (
              <div className="space-y-4">
                <div className="rounded border border-slate-800 p-5 space-y-2 text-[11px]">
                  <p className="text-slate-300">Total de corpos de prova: <span className="font-bold text-amber-400">{resultado.resumo.totalCPs}</span></p>
                  <p className="text-slate-300">Volume da betoneira: <span className="font-bold text-sky-400">{n(resultado.resumo.volumeBetoneira, 1)} L</span></p>
                  <p className="text-slate-300">Massa total: <span className="font-bold text-emerald-400">{n(resultado.resumo.massaTotalKg, 1)} kg</span></p>
                  <p className="text-slate-300">Fator de escala: <span className="font-bold text-slate-200">{n(resultado.planilhaPesagem.fatorEscala, 6)}</span></p>
                </div>

                {resultado.resumo.avisoVolume && (
                  <div className="rounded border border-amber-600/30 bg-amber-600/5 p-4">
                    <p className="text-[10px] text-amber-400">{resultado.resumo.avisoVolume}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
