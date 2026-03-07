"use client";

/**
 * @file components/DosagemTracoTeorico.tsx
 * @description CORE MIX PRO — Módulo 02: Traço Teórico
 *
 * UI para o endpoint calcularTracoTeorico (Lei de Abrams + IPT-EPUSP).
 * Estética: Precision Industrial Control Room (mesmo padrão do Motor de Empacotamento).
 */

import { useState } from "react";
import { useToast } from "./Toast";
import { gerarPdfTracoTeorico } from "../lib/relatorio-pdf";
import { exportCsv } from "../lib/export-csv";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Scatter,
  ScatterChart,
  ComposedChart,
  Legend,
  ReferenceArea,
} from "recharts";
import { trpc } from "../lib/trpc";

import {
  CIMENTOS,
  AGREGADOS_MIUDOS,
  AGREGADOS_GRAUDOS,
  ADITIVOS,
  SCM_ADICOES,
  FIBRAS,
  COMPENSADORES,
  CRISTALIZANTES,
  PIGMENTOS,
  CIMENTO_IDS,
  AGREGADO_MIUDO_IDS,
  AGREGADO_GRAUDO_IDS,
  ADITIVO_IDS,
  SCM_IDS,
  FIBRA_IDS,
  COMPENSADOR_IDS,
  CRISTALIZANTE_IDS,
  PIGMENTO_IDS,
} from "../lib/constants";

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
// TIPOS OUTPUT — espelham exatamente o retorno do router
// ─────────────────────────────────────────────────────────────────────────────

/** Linha genérica da composição 1m³ */
type LinhaComp = {
  categoria:    string;
  id:           string;
  descricao:    string;
  densidadeTm3: number;
  massaKgM3:    number;
  volumeLM3:    number;
  custoReaisM3: number;
  co2KgM3:      number;
};

type ResultadoTraco = {
  abrams: {
    fcjMPa: number;
    relacaoAc: {
      acCalculado:       number;
      acAdotado:         number;
      limitadoPelaNorma: boolean;
      avisoNorma:        string | null;
    };
    paramsRegressao: { A: number; B: number; r2: number; nPontos: number };
    fatoresMaturidade: {
      beta1d: number; beta3d: number; beta7d: number; beta14d: number;
      beta28d: number; beta56d: number; beta91d: number;
      modelo: string;
    };
    resistenciasPorIdade: {
      fc1dMPa: number; fc3dMPa: number; fc7dMPa: number; fc14dMPa: number;
      fc28dMPa: number; fc56dMPa: number; fc91dMPa: number;
    };
  };
  kPasta: number;
  composicaoM3: {
    linhas: LinhaComp[];
    volumeTotalLM3:    number;
    massaTotalKgM3:    number;
    custoTotalReaisM3: number;
    co2TotalKgM3:      number;
    fechamentoVolumeOk: boolean;
  };
  tracoUnitario: {
    cimento: 1;
    areias:  { id: string; valor: number }[];
    britas:  { id: string; valor: number }[];
    agua:    number;
    aditivoSp?: number;
    scm?:       number;
  };
  tracoCampo: {
    cimentoKgM3:        number;
    aguaBetoneiraMKgM3: number;
    agregados: {
      id: string;
      categoria: string;
      descricao: string;
      massaSecaKgM3:  number;
      massaCampoKgM3: number;
      temCorrecaoUmidade: boolean;
    }[];
    aditivoSpKgM3?: number;
    scmKgM3?:       number;
    ajusteAguaKgM3: number;
  } | null;
  verificacoes: Array<{
    parametro:       string;
    valorCalculado:  number | string;
    limiteNorma:     number | string;
    normaReferencia: string;
    aprovado:        boolean;
    mensagem:        string;
  }>;
  meta: {
    obra:                string;
    responsavelTecnico:  string | null;
    dataEstudo:          string | null;
    fckMPa:              number;
    classeAgressividade: string;
    norma:               string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA ZOD DO FORMULÁRIO
// ─────────────────────────────────────────────────────────────────────────────

const PontoAbZ = z.object({
  id:       z.string().min(1),
  relacaoAc: z.number().min(0.20).max(1.00),
  fc28dMPa:  z.number().positive(),
});

/** Item material com fração (cimentos, areias, britas, scms) */
const MaterialFracaoZ = z.object({
  id: z.string().min(1),
  fracao: z.number().min(0).max(1).default(1),
});

/** Item aditivo SP dosado por fração do cimento */
const AditivoSpFormZ = z.object({
  id: z.string().min(1),
  fracaoCimento: z.number().min(0).max(0.10).default(0.012),
});

/** Item dosado por kg/m³ (fibras, compensadores, cristalizantes, pigmentos) */
const MaterialKgFormZ = z.object({
  id: z.string().min(1),
  kgM3: z.number().min(0).max(200).default(0),
});

/** Umidade por agregado */
const UmidadeFormZ = z.object({
  id: z.string().min(1),
  label: z.string().default(""),
  umidadePercent: z.number().min(0).max(15).default(3),
});

const FormZ = z.object({
  // Projeto
  obra:                   z.string().min(1, "Nome da obra obrigatorio"),
  responsavelTecnico:     z.string().optional(),
  fckMPa:                 z.number().min(10).max(120),
  desvioPadraoCampoMPa:   z.number().min(0).max(10),
  fatorTStudent:          z.number().min(1.0).max(3.0),
  slumpMm:                z.number().min(0).max(260),
  dmcMm:                  z.number().positive(),
  classeAgressividade:    z.enum(["CAA-I", "CAA-II", "CAA-III", "CAA-IV"]),

  // Materiais (arrays genéricos)
  cimentos:       z.array(MaterialFracaoZ).min(1).max(3),
  areias:         z.array(MaterialFracaoZ).min(1).max(4),
  britas:         z.array(MaterialFracaoZ).min(1).max(4),
  aditivosSp:     z.array(AditivoSpFormZ).max(3),
  scms:           z.array(MaterialFracaoZ).max(4),
  fibras:         z.array(MaterialKgFormZ).max(3),
  compensadores:  z.array(MaterialKgFormZ).max(2),
  cristalizantes: z.array(MaterialKgFormZ).max(2),
  pigmentos:      z.array(MaterialKgFormZ).max(2),

  // Parametros
  relacaoAgua_Cimento:  z.number().min(0.25).max(0.75),
  fracaoScm:            z.number().min(0).max(0.70),
  fracaoArgamassa:      z.number().min(0.40).max(0.75),
  fracaoArAprisionado:  z.number().min(0).max(0.08),

  // Abrams
  usarPontosCustom:     z.boolean(),
  pontosAbrams:         z.array(PontoAbZ).optional(),
  tipoCebFip:           z.enum(["NORMAL", "ALTA_RESISTENCIA_INICIAL", "LENTO"]),

  // Umidade
  usarUmidade:          z.boolean(),
  umidades:             z.array(UmidadeFormZ),
});

type FormValues = z.infer<typeof FormZ>;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const n = (v: number | string | null | undefined, d = 2): string => {
  if (v == null) return "—";
  const num = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(num) ? "—" : num.toFixed(d);
};

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
  error,
  ...p
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <div>
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
      {error && <p className="mt-0.5 text-[9px] text-red-400">{error}</p>}
    </div>
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
}: {
  label:    string;
  value:    string;
  unit?:    string;
  sub?:     string;
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

// ─────────────────────────────────────────────────────────────────────────────
// RULER (separador de seções)
// ─────────────────────────────────────────────────────────────────────────────

function Ruler({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-5 pb-2">
      <div className="h-px flex-1 bg-slate-800" />
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</span>
      <div className="h-px flex-1 bg-slate-800" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

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

export function DosagemTracoTeorico() {
  const [resultado, setResultado] = useState<ResultadoTraco | null>(null);
  const [tab, setTab] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  // ─── Reverse mode: input fc → calculate a/c ─────────────────────────────
  const [modoReverso, setModoReverso] = useState(false);
  const [fcAlvoMPa, setFcAlvoMPa] = useState<number | "">("");
  const [acReverso, setAcReverso] = useState<number | null>(null);
  const [erroReverso, setErroReverso] = useState<string | null>(null);

  /** Calcula a/c inverso a partir da curva de Abrams do último resultado */
  const calcularReverso = (fcAlvo: number) => {
    if (!resultado) {
      setErroReverso("Calcule um traco primeiro para calibrar a curva");
      setAcReverso(null);
      return;
    }
    const { A, B } = resultado.abrams.paramsRegressao;
    if (fcAlvo <= 0 || fcAlvo > 150) {
      setErroReverso("fc deve estar entre 1 e 150 MPa");
      setAcReverso(null);
      return;
    }
    // Inversão: a/c = exp((ln(fc) - A) / B)
    const acCalc = Math.exp((Math.log(fcAlvo) - A) / B);
    if (acCalc < 0.20 || acCalc > 1.0) {
      setErroReverso(`a/c calculado (${acCalc.toFixed(3)}) fora do intervalo pratico 0.20–1.00`);
      setAcReverso(null);
      return;
    }
    setAcReverso(parseFloat(acCalc.toFixed(4)));
    setErroReverso(null);
  };

  // ─── Estudo paramétrico BID ──────────────────────────────────────────────
  const [parametricoAtivo, setParametricoAtivo] = useState(false);
  const [sweepVariavel, setSweepVariavel] = useState<string>("fckMPa");
  const [sweepMin, setSweepMin] = useState<number>(20);
  const [sweepMax, setSweepMax] = useState<number>(60);
  const [sweepPassos, setSweepPassos] = useState<number>(10);
  const [resultadoParametrico, setResultadoParametrico] = useState<{
    config: { variavel: string; min: number; max: number; passos: number };
    labelVariavel: string;
    unidadeVariavel: string;
    pontos: Array<{
      valorVariavel: number;
      acAdotado: number;
      fcjMPa: number;
      consumoCimentoKgM3: number;
      custoReaisM3: number;
      co2KgM3: number;
      eficienciaEta: number;
      custoPorMPa: number;
      co2PorMPa: number;
      aprovadoNorma: boolean;
      nVerificacoesAprovadas: number;
      nVerificacoesTotais: number;
      erro?: string;
    }>;
    melhorCusto: { valorVariavel: number; custoReaisM3: number } | null;
    melhorEficiencia: { valorVariavel: number; eficienciaEta: number } | null;
    melhorCo2: { valorVariavel: number; co2KgM3: number } | null;
    zonaAprovada: { min: number; max: number } | null;
  } | null>(null);

  const parametricoMutation = trpc.dosagem.estudoParametrico.useMutation({
    onSuccess: (data) => {
      setResultadoParametrico(data as typeof resultadoParametrico);
      toast("Estudo parametrico concluido", "success");
    },
    onError: (err) => toast(err.message ?? "Erro no estudo parametrico", "error"),
  });

  // ─── Metodos comparativos (ACI / ABCP / 4Q) ────────────────────────────
  const [metodoComparativoAtivo, setMetodoComparativoAtivo] = useState(false);
  const [resultadoACI, setResultadoACI] = useState<{
    metodo: "ACI 211.1"; aguaKgM3: number; arPercent: number; acAdotado: number;
    acResistencia: number; acDurabilidade: number | null; consumoCimentoKgM3: number;
    bb0: number; massaBritaKgM3: number; massaAreiaKgM3: number;
    volumes: { cimentoL: number; aguaL: number; arL: number; britaL: number; areiaL: number; totalL: number };
    tracoUnitario: { cimento: 1; areia: number; brita: number; ac: number };
    etapas: string[];
  } | null>(null);
  const [resultadoABCP, setResultadoABCP] = useState<{
    metodo: "ABCP"; fcjMPa: number; aguaKgM3: number; acResistencia: number;
    acDurabilidade: number; acAdotado: number; consumoCimentoKgM3: number;
    consumoMinimoNBR: number; cimentoCorrigido: boolean; vc: number;
    massaBritaKgM3: number; massaAreiaKgM3: number;
    volumes: { cimentoL: number; aguaL: number; arL: number; britaL: number; areiaL: number; totalL: number };
    tracoUnitario: { cimento: 1; areia: number; brita: number; ac: number };
    etapas: string[];
  } | null>(null);
  const [resultado4Q, setResultado4Q] = useState<{
    curva: Array<{ ac: number; fc: number; m: number; cc: number }>;
    pontoTrabalho: { ac: number; fc: number; m: number; cc: number } | null;
    limites: { fcMin: number; fcMax: number; acMin: number; acMax: number; mMin: number; mMax: number; ccMin: number; ccMax: number };
  } | null>(null);

  const aciMutation = trpc.dosagem.calcularACI211.useMutation({
    onSuccess: (data) => { setResultadoACI(data as typeof resultadoACI); toast("ACI 211.1 calculado", "success"); },
    onError: (err) => toast(err.message ?? "Erro ACI 211.1", "error"),
  });
  const abcpMutation = trpc.dosagem.calcularABCP.useMutation({
    onSuccess: (data) => { setResultadoABCP(data as typeof resultadoABCP); toast("ABCP calculado", "success"); },
    onError: (err) => toast(err.message ?? "Erro ABCP", "error"),
  });
  const grafico4QMutation = trpc.dosagem.gerarGrafico4Q.useMutation({
    onSuccess: (data) => { setResultado4Q(data as typeof resultado4Q); toast("Grafico 4Q gerado", "success"); },
    onError: (err) => toast(err.message ?? "Erro 4Q", "error"),
  });

  /** Executa comparativos ACI + ABCP + 4Q usando dados do form atual */
  const executarComparativos = () => {
    const v = getValues();
    const cim = Object.values(CIMENTOS).find((c) => c.id === v.cimentos?.[0]?.id);
    const areia = Object.values(AGREGADOS_MIUDOS).find((a) => a.id === v.areias?.[0]?.id);
    const brita = Object.values(AGREGADOS_GRAUDOS).find((g) => g.id === v.britas?.[0]?.id);
    if (!cim || !areia || !brita) { toast("Selecione cimento, areia e brita", "error"); return; }

    const fcjMPa = v.fckMPa + 1.65 * v.desvioPadraoCampoMPa;
    aciMutation.mutate({
      fcrMPa: fcjMPa, slumpMm: v.slumpMm, dmcMm: v.dmcMm,
      mfAreia: areia.moduloDeFinura, densidadeCimentoTm3: cim.densidadeTm3,
      densidadeAreiaTm3: areia.densidadeTm3, densidadeBritaTm3: brita.densidadeTm3,
      muCompactadaBritaTm3: brita.densidadeTm3 * 0.6, // estimar mu compactada
    });
    abcpMutation.mutate({
      fckMPa: v.fckMPa, sdMPa: v.desvioPadraoCampoMPa, slumpMm: v.slumpMm,
      dmcMm: v.dmcMm, mfAreia: areia.moduloDeFinura,
      densidadeCimentoTm3: cim.densidadeTm3, densidadeAreiaTm3: areia.densidadeTm3,
      densidadeBritaTm3: brita.densidadeTm3,
      muCompactadaBritaTm3: brita.densidadeTm3 * 0.6,
      classeAgressividade: v.classeAgressividade as "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV",
    });
    // 4Q graph — use Abrams params from last result if available, else defaults
    const A = resultado?.abrams?.paramsRegressao?.A ?? 4.55;
    const B = resultado?.abrams?.paramsRegressao?.B ?? -1.56;
    grafico4QMutation.mutate({
      abramsA: A, abramsB: B, abramsForm: "lnln",
      lyseK3: -2.0, lyseK4: 12.5,
      densidadeCimentoTm3: cim.densidadeTm3, densidadeAgregadoMedioTm3: areia.densidadeTm3,
      fckAlvoMPa: v.fckMPa, sdMPa: v.desvioPadraoCampoMPa,
    });
  };

  // ─── Save modal state ──────────────────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveProjetoId, setSaveProjetoId] = useState("");
  const [saveDescricao, setSaveDescricao] = useState("");
  const [saveNovoNome, setSaveNovoNome] = useState("");
  const [criandoProjeto, setCriandoProjeto] = useState(false);

  const projetos = trpc.projeto.listarProjetos.useQuery(undefined, {
    enabled: showSaveModal,
  });

  const criarProjetoMut = trpc.projeto.criarProjeto.useMutation({
    onSuccess: (novo) => {
      projetos.refetch();
      setSaveProjetoId(novo.id);
      setSaveNovoNome("");
      setCriandoProjeto(false);
      toast("Projeto criado", "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const salvarTracoMut = trpc.projeto.salvarTraco.useMutation({
    onSuccess: () => {
      setShowSaveModal(false);
      setSaveDescricao("");
      setSaveProjetoId("");
      toast("Traço salvo com sucesso!", "success");
    },
    onError: (err) => toast(err.message ?? "Erro ao salvar", "error"),
  });

  const mutation = trpc.dosagem.calcularTracoTeorico.useMutation({
    onSuccess: (data) => {
      setResultado(data as unknown as ResultadoTraco);
      // Salvar composicaoM3 no sessionStorage para /piloto
      try {
        sessionStorage.setItem(
          "coreMixPro:composicaoM3",
          JSON.stringify((data as unknown as ResultadoTraco).composicaoM3)
        );
      } catch { /* ignore */ }
      toast("Traço teórico calculado com sucesso", "success");
    },
    onError: (err) => {
      toast(err.message ?? "Erro no cálculo", "error");
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormZ),
    defaultValues: {
      obra:                   "",
      fckMPa:                 30,
      desvioPadraoCampoMPa:   4.0,
      fatorTStudent:          1.65,
      slumpMm:                100,
      dmcMm:                  19,
      classeAgressividade:    "CAA-II",
      cimentos:               [{ id: "CIM-2", fracao: 1 }],
      areias:                 [{ id: "M1", fracao: 1 }],
      britas:                 [{ id: "G1", fracao: 1 }],
      aditivosSp:             [],
      scms:                   [],
      fibras:                 [],
      compensadores:          [],
      cristalizantes:         [],
      pigmentos:              [],
      relacaoAgua_Cimento:    0.50,
      fracaoScm:              0,
      fracaoArgamassa:        0.55,
      fracaoArAprisionado:    0.02,
      usarPontosCustom:       false,
      pontosAbrams:           [
        { id: "P1", relacaoAc: 0.40, fc28dMPa: 52 },
        { id: "P2", relacaoAc: 0.50, fc28dMPa: 35 },
        { id: "P3", relacaoAc: 0.60, fc28dMPa: 25 },
      ],
      tipoCebFip:             "NORMAL",
      usarUmidade:            false,
      umidades:               [],
    },
  });

  const { fields: pontosFields, append: appendPonto, remove: removePonto } = useFieldArray({ control, name: "pontosAbrams" });
  const { fields: cimentosFields, append: appendCimento, remove: removeCimento } = useFieldArray({ control, name: "cimentos" });
  const { fields: areiasFields, append: appendAreia, remove: removeAreia } = useFieldArray({ control, name: "areias" });
  const { fields: britasFields, append: appendBrita, remove: removeBrita } = useFieldArray({ control, name: "britas" });
  const { fields: aditivosFields, append: appendAditivo, remove: removeAditivo } = useFieldArray({ control, name: "aditivosSp" });
  const { fields: scmsFields, append: appendScm, remove: removeScm } = useFieldArray({ control, name: "scms" });
  const { fields: fibrasFields, append: appendFibra, remove: removeFibra } = useFieldArray({ control, name: "fibras" });
  const { fields: compensadoresFields, append: appendCompensador, remove: removeCompensador } = useFieldArray({ control, name: "compensadores" });
  const { fields: cristalizantesFields, append: appendCristalizante, remove: removeCristalizante } = useFieldArray({ control, name: "cristalizantes" });
  const { fields: pigmentosFields, append: appendPigmento, remove: removePigmento } = useFieldArray({ control, name: "pigmentos" });
  const { fields: umidadesFields, append: appendUmidade, remove: removeUmidade } = useFieldArray({ control, name: "umidades" });

  const usarPontosCustom = watch("usarPontosCustom");
  const usarUmidade      = watch("usarUmidade");

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const payload: Parameters<typeof mutation.mutate>[0] = {
      projeto: {
        obra:                   data.obra,
        responsavelTecnico:     data.responsavelTecnico,
        fckMPa:                 data.fckMPa,
        desvioPadraoCampoMPa:   data.desvioPadraoCampoMPa,
        fatorTStudent:          data.fatorTStudent,
        slumpMm:                data.slumpMm,
        dmcMm:                  data.dmcMm,
        classeAgressividade:    data.classeAgressividade,
      },
      materiais: {
        cimentos:       data.cimentos.map(c => ({ id: c.id, fracao: c.fracao })),
        areias:         data.areias.map(a => ({ id: a.id, fracao: a.fracao })),
        britas:         data.britas.map(b => ({ id: b.id, fracao: b.fracao })),
        aditivosSp:     data.aditivosSp.map(a => ({ id: a.id, fracaoCimento: a.fracaoCimento })),
        scms:           data.scms.map(s => ({ id: s.id, fracao: s.fracao })),
        fibras:         data.fibras.map(f => ({ id: f.id, kgM3: f.kgM3 })),
        compensadores:  data.compensadores.map(c => ({ id: c.id, kgM3: c.kgM3 })),
        cristalizantes: data.cristalizantes.map(c => ({ id: c.id, kgM3: c.kgM3 })),
        pigmentos:      data.pigmentos.map(p => ({ id: p.id, kgM3: p.kgM3 })),
      },
      parametros: {
        relacaoAgua_Cimento:  data.relacaoAgua_Cimento,
        fracaoScm:            data.fracaoScm,
        fracaoArgamassa:      data.fracaoArgamassa,
        fracaoArAprisionado:  data.fracaoArAprisionado,
      },
      tipoCebFip: data.tipoCebFip,
    };

    if (data.usarPontosCustom && data.pontosAbrams && data.pontosAbrams.length >= 3) {
      payload.pontosAbrams = data.pontosAbrams;
    }

    if (data.usarUmidade && data.umidades.length > 0) {
      payload.umidadeCampo = {
        agregados: data.umidades.map(u => ({ id: u.id, umidadePercent: u.umidadePercent })),
      };
    }

    mutation.mutate(payload);
  };

  // ─── Dados para gráficos ────────────────────────────────────────────────

  // Pontos de calibração visíveis no gráfico
  const pontosCalibracaoVisiveis = resultado ? (
    getValues().usarPontosCustom && getValues().pontosAbrams
      ? getValues().pontosAbrams!.map(p => ({ ac: p.relacaoAc, fc: p.fc28dMPa }))
      : [] // pontos default não exibidos
  ) : [];

  const acAdotadoChart = resultado?.abrams.relacaoAc.acAdotado ?? 0.50;
  const fcjChart = resultado?.abrams.fcjMPa ?? 30;

  // Domínio dinâmico: centrado nos dados reais com padding
  const acMinChart = Math.max(0.25, Math.min(acAdotadoChart - 0.15, ...pontosCalibracaoVisiveis.map(p => p.ac)) - 0.05);
  const acMaxChart = Math.min(1.00, Math.max(acAdotadoChart + 0.20, ...pontosCalibracaoVisiveis.map(p => p.ac)) + 0.05);

  const abramsCurveData = resultado ? (() => {
    const { A, B } = resultado.abrams.paramsRegressao;
    const points = [];
    for (let ac = acMinChart; ac <= acMaxChart; ac += 0.005) {
      const fc = Math.exp(A + B * Math.log(ac));
      if (fc > 0 && fc < 200) {
        points.push({ ac: parseFloat(ac.toFixed(3)), fc });
      }
    }
    return points;
  })() : [];

  // Domínio Y dinâmico baseado nos dados visíveis
  const allFcValues = [
    ...abramsCurveData.map(p => p.fc),
    fcjChart,
    ...pontosCalibracaoVisiveis.map(p => p.fc),
  ];
  const fcMinChart = Math.max(0, Math.min(...allFcValues) - 5);
  const fcMaxChart = Math.max(...allFcValues) + 5;

  const idadeData = resultado ? [
    { idade: "1d",  fc: resultado.abrams.resistenciasPorIdade.fc1dMPa  },
    { idade: "3d",  fc: resultado.abrams.resistenciasPorIdade.fc3dMPa  },
    { idade: "7d",  fc: resultado.abrams.resistenciasPorIdade.fc7dMPa  },
    { idade: "14d", fc: resultado.abrams.resistenciasPorIdade.fc14dMPa },
    { idade: "28d", fc: resultado.abrams.resistenciasPorIdade.fc28dMPa },
    { idade: "56d", fc: resultado.abrams.resistenciasPorIdade.fc56dMPa },
    { idade: "91d", fc: resultado.abrams.resistenciasPorIdade.fc91dMPa },
  ] : [];

  // ─── Materiais da composição para tabela ────────────────────────────────

  const materiais = resultado
    ? resultado.composicaoM3.linhas.filter(l => l.massaKgM3 > 0 || l.volumeLM3 > 0)
    : [];

  // ─── Traço unitário formatado ───────────────────────────────────────────

  const tracoStr = resultado ? (() => {
    const t = resultado.tracoUnitario;
    const parts = [`1`];
    for (const a of t.areias) parts.push(n(a.valor, 2));
    for (const b of t.britas) parts.push(n(b.valor, 2));
    return parts.join(" : ") + ` : a/c ${n(t.agua, 2)}`;
  })() : "";

  // ─── RENDER ─────────────────────────────────────────────────────────────

  const TAB_NAMES = [
    "Composicao 1m3",
    "Curva Abrams",
    "Resistencias",
    "Verificacoes",
    "Traco Unitario",
    ...(resultado?.tracoCampo ? ["Traco Campo"] : []),
    ...(resultadoParametrico ? ["Parametrico"] : []),
    ...((resultadoACI || resultadoABCP) ? ["Comparativo"] : []),
    ...(resultado4Q ? ["4 Quadrantes"] : []),
  ];

  return (
    <div className="relative flex h-screen overflow-hidden font-mono">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── SIDEBAR ─────────────────────────────────────────────────── */}
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
              02
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-wide">Traco Teorico</h1>
              <p className="text-[9px] text-slate-600">Abrams + IPT-EPUSP + NBR 6118</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col px-5 pb-5">
          {/* ─── DADOS DO PROJETO ─────────────────────────────────── */}
          <Ruler label="Dados do Projeto" />

          <div className="space-y-2.5">
            <div>
              <Label>Obra / Cliente</Label>
              <Input {...register("obra")} placeholder="Nome da obra" error={errors.obra?.message} />
            </div>

            <div>
              <Label>Responsavel Tecnico</Label>
              <Input {...register("responsavelTecnico")} placeholder="Engenheiro" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>fck (MPa)</Label>
                <Input type="number" step="1" {...register("fckMPa", { valueAsNumber: true })}
                  error={errors.fckMPa?.message} />
              </div>
              <div>
                <Label>Desvio Padrao (MPa)</Label>
                <Input type="number" step="0.1" {...register("desvioPadraoCampoMPa", { valueAsNumber: true })}
                  error={errors.desvioPadraoCampoMPa?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Fator t Student</Label>
                <Input type="number" step="0.01" {...register("fatorTStudent", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Slump (mm)</Label>
                <Input type="number" step="10" {...register("slumpMm", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>DMC (mm)</Label>
                <Input type="number" step="0.5" {...register("dmcMm", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Classe Agress.</Label>
                <Select {...register("classeAgressividade")}>
                  <option value="CAA-I">CAA-I (Fraca)</option>
                  <option value="CAA-II">CAA-II (Moderada)</option>
                  <option value="CAA-III">CAA-III (Forte)</option>
                  <option value="CAA-IV">CAA-IV (Muito forte)</option>
                </Select>
              </div>
            </div>
          </div>

          {/* ─── SELECAO DE MATERIAIS ─────────────────────────────── */}
          <Ruler label="Materiais" />

          <div className="space-y-3">
            {/* CIMENTOS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Cimentos</Label>
                {cimentosFields.length < 3 && (
                  <button type="button" onClick={() => appendCimento({ id: CIMENTO_IDS[0], fracao: 0.5 })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {cimentosFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`cimentos.${i}.id`)} className="flex-1">
                    {CIMENTO_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {CIMENTOS[id].descricao}</option>
                    ))}
                  </Select>
                  {cimentosFields.length > 1 && (
                    <>
                      <Input type="number" step="0.01" {...register(`cimentos.${i}.fracao`, { valueAsNumber: true })}
                        className="!w-16" placeholder="Frac" />
                      <button type="button" onClick={() => removeCimento(i)}
                        className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* AREIAS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Areias</Label>
                {areiasFields.length < 4 && (
                  <button type="button" onClick={() => appendAreia({ id: AGREGADO_MIUDO_IDS[0], fracao: 0.5 })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {areiasFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`areias.${i}.id`)} className="flex-1">
                    {AGREGADO_MIUDO_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {AGREGADOS_MIUDOS[id].descricao}</option>
                    ))}
                  </Select>
                  {areiasFields.length > 1 && (
                    <>
                      <Input type="number" step="0.01" {...register(`areias.${i}.fracao`, { valueAsNumber: true })}
                        className="!w-16" placeholder="Frac" />
                      <button type="button" onClick={() => removeAreia(i)}
                        className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* BRITAS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Britas</Label>
                {britasFields.length < 4 && (
                  <button type="button" onClick={() => appendBrita({ id: AGREGADO_GRAUDO_IDS[0], fracao: 0.5 })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {britasFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`britas.${i}.id`)} className="flex-1">
                    {AGREGADO_GRAUDO_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {AGREGADOS_GRAUDOS[id].descricao}</option>
                    ))}
                  </Select>
                  {britasFields.length > 1 && (
                    <>
                      <Input type="number" step="0.01" {...register(`britas.${i}.fracao`, { valueAsNumber: true })}
                        className="!w-16" placeholder="Frac" />
                      <button type="button" onClick={() => removeBrita(i)}
                        className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* ADITIVOS SP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Aditivos SP</Label>
                {aditivosFields.length < 3 && (
                  <button type="button" onClick={() => appendAditivo({ id: ADITIVO_IDS[0], fracaoCimento: 0.012 })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {aditivosFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`aditivosSp.${i}.id`)} className="flex-1">
                    {ADITIVO_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {ADITIVOS[id].produto}</option>
                    ))}
                  </Select>
                  <Input type="number" step="0.001" {...register(`aditivosSp.${i}.fracaoCimento`, { valueAsNumber: true })}
                    className="!w-16" placeholder="%" />
                  <button type="button" onClick={() => removeAditivo(i)}
                    className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                </div>
              ))}
              {aditivosFields.length === 0 && (
                <p className="text-[9px] text-slate-600 italic">Nenhum aditivo selecionado</p>
              )}
            </div>

            {/* SCMs */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>SCMs / Adicoes</Label>
                {scmsFields.length < 4 && (
                  <button type="button" onClick={() => appendScm({ id: SCM_IDS[0], fracao: 1 })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {scmsFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`scms.${i}.id`)} className="flex-1">
                    {SCM_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {SCM_ADICOES[id].material}</option>
                    ))}
                  </Select>
                  {scmsFields.length > 1 && (
                    <Input type="number" step="0.01" {...register(`scms.${i}.fracao`, { valueAsNumber: true })}
                      className="!w-16" placeholder="Frac" />
                  )}
                  <button type="button" onClick={() => removeScm(i)}
                    className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                </div>
              ))}
              {scmsFields.length === 0 && (
                <p className="text-[9px] text-slate-600 italic">Nenhum SCM selecionado</p>
              )}
            </div>
          </div>

          {/* ─── MATERIAIS EXTRAS (colapsavel) ─────────────────────── */}
          <Ruler label="Materiais Extras" />

          <div className="space-y-3">
            {/* FIBRAS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Fibras</Label>
                {fibrasFields.length < 3 && FIBRA_IDS.length > 0 && (
                  <button type="button" onClick={() => appendFibra({ id: FIBRA_IDS[0], kgM3: Number(FIBRAS[FIBRA_IDS[0]].dosagemTipicaKgM3) })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {fibrasFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`fibras.${i}.id`)} className="flex-1">
                    {FIBRA_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {FIBRAS[id].descricao}</option>
                    ))}
                  </Select>
                  <Input type="number" step="0.1" {...register(`fibras.${i}.kgM3`, { valueAsNumber: true })}
                    className="!w-20" placeholder="kg/m3" />
                  <button type="button" onClick={() => removeFibra(i)}
                    className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                </div>
              ))}
            </div>

            {/* COMPENSADORES */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Compensadores</Label>
                {compensadoresFields.length < 2 && COMPENSADOR_IDS.length > 0 && (
                  <button type="button" onClick={() => appendCompensador({ id: COMPENSADOR_IDS[0], kgM3: 5 })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {compensadoresFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`compensadores.${i}.id`)} className="flex-1">
                    {COMPENSADOR_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {COMPENSADORES[id].descricao}</option>
                    ))}
                  </Select>
                  <Input type="number" step="0.1" {...register(`compensadores.${i}.kgM3`, { valueAsNumber: true })}
                    className="!w-20" placeholder="kg/m3" />
                  <button type="button" onClick={() => removeCompensador(i)}
                    className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                </div>
              ))}
            </div>

            {/* CRISTALIZANTES */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Cristalizantes</Label>
                {cristalizantesFields.length < 2 && CRISTALIZANTE_IDS.length > 0 && (
                  <button type="button" onClick={() => appendCristalizante({ id: CRISTALIZANTE_IDS[0], kgM3: 3 })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {cristalizantesFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`cristalizantes.${i}.id`)} className="flex-1">
                    {CRISTALIZANTE_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {CRISTALIZANTES[id].descricao}</option>
                    ))}
                  </Select>
                  <Input type="number" step="0.1" {...register(`cristalizantes.${i}.kgM3`, { valueAsNumber: true })}
                    className="!w-20" placeholder="kg/m3" />
                  <button type="button" onClick={() => removeCristalizante(i)}
                    className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                </div>
              ))}
            </div>

            {/* PIGMENTOS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Pigmentos</Label>
                {pigmentosFields.length < 2 && PIGMENTO_IDS.length > 0 && (
                  <button type="button" onClick={() => appendPigmento({ id: PIGMENTO_IDS[0], kgM3: 5 })}
                    className="text-[9px] text-amber-500 hover:text-amber-400">+ Adicionar</button>
                )}
              </div>
              {pigmentosFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-1.5 mb-1">
                  <Select {...register(`pigmentos.${i}.id`)} className="flex-1">
                    {PIGMENTO_IDS.map((id) => (
                      <option key={id} value={id}>{id} — {PIGMENTOS[id].descricao} ({PIGMENTOS[id].cor})</option>
                    ))}
                  </Select>
                  <Input type="number" step="0.1" {...register(`pigmentos.${i}.kgM3`, { valueAsNumber: true })}
                    className="!w-20" placeholder="kg/m3" />
                  <button type="button" onClick={() => removePigmento(i)}
                    className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                </div>
              ))}
            </div>
          </div>

          {/* ─── PARAMETROS DE DOSAGEM ────────────────────────────── */}
          <Ruler label="Parametros de Dosagem" />

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>a/c</Label>
                <Input type="number" step="0.01" {...register("relacaoAgua_Cimento", { valueAsNumber: true })}
                  error={errors.relacaoAgua_Cimento?.message} />
              </div>
              <div>
                <Label>Fracao SCM</Label>
                <Input type="number" step="0.01" {...register("fracaoScm", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Fracao Argamassa</Label>
                <Input type="number" step="0.01" {...register("fracaoArgamassa", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Ar Aprisionado</Label>
                <Input type="number" step="0.005" {...register("fracaoArAprisionado", { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          {/* ─── CALIBRACAO ABRAMS ────────────────────────────────── */}
          <Ruler label="Calibracao Abrams" />

          <div className="space-y-2.5">
            <div>
              <Label>Tipo CEB-FIP</Label>
              <Select {...register("tipoCebFip")}>
                <option value="NORMAL">Normal (s=0.25)</option>
                <option value="ALTA_RESISTENCIA_INICIAL">Alta Resist. Inicial (s=0.20)</option>
                <option value="LENTO">Lento (s=0.38)</option>
              </Select>
            </div>

            <Controller
              name="usarPontosCustom"
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Pontos customizados (min. 3)"
                />
              )}
            />

            {usarPontosCustom && (
              <div className="space-y-2 rounded border border-slate-800 p-3">
                {pontosFields.map((f, i) => (
                  <div key={f.id} className="flex items-end gap-2">
                    <div className="w-12">
                      <Label>ID</Label>
                      <Input {...register(`pontosAbrams.${i}.id`)} />
                    </div>
                    <div className="flex-1">
                      <Label>a/c</Label>
                      <Input type="number" step="0.01"
                        {...register(`pontosAbrams.${i}.relacaoAc`, { valueAsNumber: true })} />
                    </div>
                    <div className="flex-1">
                      <Label>fc28 (MPa)</Label>
                      <Input type="number" step="0.1"
                        {...register(`pontosAbrams.${i}.fc28dMPa`, { valueAsNumber: true })} />
                    </div>
                    <button type="button" onClick={() => removePonto(i)}
                      className="mb-0.5 text-[10px] text-red-500 hover:text-red-400">
                      X
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendPonto({ id: `P${pontosFields.length + 1}`, relacaoAc: 0.50, fc28dMPa: 30 })}
                  className="text-[10px] text-amber-500 hover:text-amber-400"
                >
                  + Adicionar Ponto
                </button>
              </div>
            )}
          </div>

          {/* ─── UMIDADE DE CAMPO ─────────────────────────────────── */}
          <Ruler label="Umidade de Campo" />

          <div className="space-y-2.5">
            <Controller
              name="usarUmidade"
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    if (v && umidadesFields.length === 0) {
                      // Auto-populate from selected areias + britas
                      const vals = getValues();
                      for (const a of vals.areias) {
                        const mat = AGREGADOS_MIUDOS[a.id as keyof typeof AGREGADOS_MIUDOS];
                        appendUmidade({ id: a.id, label: mat?.descricao ?? a.id, umidadePercent: mat?.umidadePercent ?? 3 });
                      }
                      for (const b of vals.britas) {
                        const mat = AGREGADOS_GRAUDOS[b.id as keyof typeof AGREGADOS_GRAUDOS];
                        appendUmidade({ id: b.id, label: mat?.descricao ?? b.id, umidadePercent: mat?.umidadePercent ?? 0 });
                      }
                    }
                  }}
                  label="Correcao de umidade"
                />
              )}
            />

            {usarUmidade && (
              <div className="space-y-1.5">
                {umidadesFields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-24 truncate">{f.label || f.id}</span>
                    <Input type="number" step="0.1"
                      {...register(`umidades.${i}.umidadePercent`, { valueAsNumber: true })}
                      className="!w-20" />
                    <span className="text-[9px] text-slate-600">%</span>
                    <button type="button" onClick={() => removeUmidade(i)}
                      className="text-[10px] text-red-500 hover:text-red-400 px-1">X</button>
                  </div>
                ))}
                {umidadesFields.length === 0 && (
                  <p className="text-[9px] text-slate-600 italic">Nenhum agregado para corrigir</p>
                )}
              </div>
            )}
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
                "Calcular Traco"
              )}
            </button>

            {mutation.isError && (
              <p className="mt-2 text-[10px] text-red-400">
                Erro: {mutation.error.message}
              </p>
            )}
          </div>

          {/* ─── MODO REVERSO ──────────────────────────────────────── */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <Ruler label="Modo Reverso" />
            <Toggle
              checked={modoReverso}
              onChange={setModoReverso}
              label="Calcular a/c para fc alvo"
            />
            {modoReverso && (
              <div className="mt-3 space-y-2">
                <Label>fc alvo (MPa)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min={1}
                    max={150}
                    value={fcAlvoMPa}
                    onChange={(e) => setFcAlvoMPa(e.target.value ? parseFloat(e.target.value) : "")}
                    placeholder="Ex: 40"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => typeof fcAlvoMPa === "number" && calcularReverso(fcAlvoMPa)}
                    disabled={!resultado || fcAlvoMPa === ""}
                    className="rounded bg-sky-700 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-sky-600 disabled:opacity-40 transition"
                  >
                    Inverter
                  </button>
                </div>
                {acReverso !== null && (
                  <div className="rounded border border-sky-800 bg-sky-900/20 p-3 space-y-2">
                    <p className="text-[9px] text-sky-400 uppercase tracking-wider">a/c necessario</p>
                    <p className="font-mono text-lg font-bold text-sky-300">{acReverso.toFixed(4)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setValue("relacaoAgua_Cimento", acReverso);
                        setModoReverso(false);
                      }}
                      className="w-full rounded bg-sky-800 py-1.5 text-[9px] font-bold text-sky-200 hover:bg-sky-700 transition"
                    >
                      Aplicar no formulario
                    </button>
                  </div>
                )}
                {erroReverso && (
                  <p className="text-[9px] text-red-400">{erroReverso}</p>
                )}
                {!resultado && (
                  <p className="text-[9px] text-slate-600 italic">
                    Calcule um traco primeiro para calibrar a curva de Abrams
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── ESTUDO PARAMETRICO BID ────────────────────────────── */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <Ruler label="Estudo Parametrico" />
            <Toggle
              checked={parametricoAtivo}
              onChange={setParametricoAtivo}
              label="Variar 1 parametro (BID)"
            />
            {parametricoAtivo && (
              <div className="mt-3 space-y-2">
                <div>
                  <Label>Variavel a variar</Label>
                  <Select value={sweepVariavel} onChange={(e) => setSweepVariavel(e.target.value)}>
                    <option value="fckMPa">fck (MPa)</option>
                    <option value="fracaoArgamassa">Fracao argamassa</option>
                    <option value="fracaoScm">Fracao SCM</option>
                    <option value="fracaoArAprisionado">Ar aprisionado</option>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Min</Label>
                    <Input type="number" step="1" value={sweepMin}
                      onChange={(e) => setSweepMin(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Max</Label>
                    <Input type="number" step="1" value={sweepMax}
                      onChange={(e) => setSweepMax(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Passos</Label>
                    <Input type="number" step="1" min={3} max={50} value={sweepPassos}
                      onChange={(e) => setSweepPassos(parseInt(e.target.value) || 10)} />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={parametricoMutation.isPending}
                  onClick={() => {
                    const data = getValues();
                    parametricoMutation.mutate({
                      projeto: {
                        obra: data.obra,
                        responsavelTecnico: data.responsavelTecnico,
                        fckMPa: data.fckMPa,
                        desvioPadraoCampoMPa: data.desvioPadraoCampoMPa,
                        fatorTStudent: data.fatorTStudent,
                        slumpMm: data.slumpMm,
                        dmcMm: data.dmcMm,
                        classeAgressividade: data.classeAgressividade,
                      },
                      materiais: {
                        cimentos: data.cimentos.map(c => ({ id: c.id, fracao: c.fracao })),
                        areias: data.areias.map(a => ({ id: a.id, fracao: a.fracao })),
                        britas: data.britas.map(b => ({ id: b.id, fracao: b.fracao })),
                        aditivosSp: data.aditivosSp.map(a => ({ id: a.id, fracaoCimento: a.fracaoCimento })),
                        scms: data.scms.map(s => ({ id: s.id, fracao: s.fracao })),
                        fibras: data.fibras.map(f => ({ id: f.id, kgM3: f.kgM3 })),
                        compensadores: data.compensadores.map(c => ({ id: c.id, kgM3: c.kgM3 })),
                        cristalizantes: data.cristalizantes.map(c => ({ id: c.id, kgM3: c.kgM3 })),
                        pigmentos: data.pigmentos.map(p => ({ id: p.id, kgM3: p.kgM3 })),
                      },
                      parametros: {
                        relacaoAgua_Cimento: data.relacaoAgua_Cimento,
                        fracaoScm: data.fracaoScm,
                        fracaoArgamassa: data.fracaoArgamassa,
                        fracaoArAprisionado: data.fracaoArAprisionado,
                      },
                      sweep: {
                        variavel: sweepVariavel as "fckMPa" | "fracaoArgamassa" | "fracaoScm" | "fracaoArAprisionado",
                        min: sweepMin,
                        max: sweepMax,
                        passos: sweepPassos,
                      },
                      pontosAbrams: data.usarPontosCustom && data.pontosAbrams && data.pontosAbrams.length >= 3
                        ? data.pontosAbrams : undefined,
                      tipoCebFip: data.tipoCebFip,
                    });
                  }}
                  className="w-full rounded bg-violet-700 py-2 text-[10px] font-bold text-white hover:bg-violet-600 disabled:opacity-40 transition"
                >
                  {parametricoMutation.isPending ? "Calculando BID..." : "Executar Estudo Parametrico"}
                </button>
              </div>
            )}
          </div>

          {/* ─── MÉTODOS COMPARATIVOS ─────────────────────────────── */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <Ruler label="Metodos Comparativos" />
            <Toggle
              checked={metodoComparativoAtivo}
              onChange={setMetodoComparativoAtivo}
              label="ACI 211.1 / ABCP / 4 Quadrantes"
            />
            {metodoComparativoAtivo && (
              <div className="mt-3 space-y-3">
                <p className="text-[8px] text-slate-600 leading-relaxed">
                  Calcula o mesmo traco pelos metodos ACI 211.1, ABCP e gera o grafico
                  de 4 quadrantes (IPT-EPUSP / IBRACON) para comparacao de metodologias.
                </p>
                <button
                  type="button"
                  onClick={executarComparativos}
                  disabled={aciMutation.isPending || abcpMutation.isPending || grafico4QMutation.isPending}
                  className="w-full rounded bg-emerald-700 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-600 disabled:opacity-40 transition"
                >
                  {(aciMutation.isPending || abcpMutation.isPending) ? "Calculando..." : "Comparar Metodos"}
                </button>
                {resultadoACI && resultadoABCP && (
                  <div className="grid grid-cols-2 gap-2 text-[8px]">
                    <div className="rounded border border-emerald-800 bg-emerald-900/20 p-2">
                      <p className="text-emerald-400 font-bold">ACI 211.1</p>
                      <p className="text-slate-400">a/c {resultadoACI.acAdotado}</p>
                      <p className="text-slate-400">C {resultadoACI.consumoCimentoKgM3} kg/m³</p>
                    </div>
                    <div className="rounded border border-sky-800 bg-sky-900/20 p-2">
                      <p className="text-sky-400 font-bold">ABCP</p>
                      <p className="text-slate-400">a/c {resultadoABCP.acAdotado}</p>
                      <p className="text-slate-400">C {resultadoABCP.consumoCimentoKgM3} kg/m³</p>
                    </div>
                  </div>
                )}
              </div>
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
          /* ─── EMPTY STATE ─────────────────────────────────────────── */
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-800">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={TOKEN.slate700} strokeWidth="1.5" />
                  <path d="M2 17l10 5 10-5" stroke={TOKEN.slate700} strokeWidth="1.5" />
                  <path d="M2 12l10 5 10-5" stroke={TOKEN.slate700} strokeWidth="1.5" />
                </svg>
              </div>
              <p className="text-[11px] text-slate-600">
                Preencha os dados e clique em <span className="text-amber-500">Calcular Traco</span>
              </p>
              <p className="mt-1 text-[9px] text-slate-700">
                Lei de Abrams + Metodo IPT-EPUSP + Verificacoes NBR 6118:2023
              </p>
            </div>
          </div>
        ) : (
          /* ─── RESULTADOS ──────────────────────────────────────────── */
          <div>
            {/* KPIs */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              <KpiCard
                label="Fcj"
                value={n(resultado.abrams.fcjMPa, 1)}
                unit="MPa"
                sub={`fck=${resultado.meta.fckMPa} + t*σ`}
                variant="amber"
              />
              <KpiCard
                label="a/c Adotado"
                value={n(resultado.abrams.relacaoAc.acAdotado, 3)}
                sub={resultado.abrams.relacaoAc.limitadoPelaNorma ? "Limitado pela norma" : "Livre"}
                variant={resultado.abrams.relacaoAc.limitadoPelaNorma ? "rose" : "emerald"}
              />
              <KpiCard
                label="Cimento"
                value={n(resultado.composicaoM3.linhas.find(l => l.categoria === "cimento")?.massaKgM3 ?? 0, 0)}
                unit="kg/m3"
                variant="sky"
              />
              <KpiCard
                label="Custo"
                value={n(resultado.composicaoM3.custoTotalReaisM3, 2)}
                unit="R$/m3"
                variant="emerald"
              />
              <KpiCard
                label="CO2"
                value={n(resultado.composicaoM3.co2TotalKgM3, 1)}
                unit="kg/m3"
                variant="slate"
              />
            </div>

            {/* Salvar + Export PDF + CSV */}
            <div className="mb-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSaveDescricao(`${resultado.meta.obra} — fck ${resultado.meta.fckMPa} MPa`);
                  setShowSaveModal(true);
                }}
                className="flex items-center gap-1.5 rounded-sm bg-amber-600 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white hover:bg-amber-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Salvar Traco
              </button>
              <button
                onClick={() => {
                  try {
                    gerarPdfTracoTeorico(resultado as any);
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
                  const rows = materiais.map((l) => ({
                    descricao: l.descricao,
                    massaKgM3: Number(l.massaKgM3.toFixed(1)),
                    volumeLM3: Number(l.volumeLM3.toFixed(1)),
                    custoReaisM3: Number(l.custoReaisM3.toFixed(2)),
                    co2KgM3: Number(l.co2KgM3.toFixed(2)),
                  }));
                  rows.push({
                    descricao: "TOTAL",
                    massaKgM3: Number(resultado.composicaoM3.massaTotalKgM3.toFixed(1)),
                    volumeLM3: Number(resultado.composicaoM3.volumeTotalLM3.toFixed(1)),
                    custoReaisM3: Number(resultado.composicaoM3.custoTotalReaisM3.toFixed(2)),
                    co2KgM3: Number(resultado.composicaoM3.co2TotalKgM3.toFixed(2)),
                  });
                  exportCsv("traco-teorico-1m3.csv", {
                    descricao: "Material",
                    massaKgM3: "Massa (kg/m³)",
                    volumeLM3: "Volume (L/m³)",
                    custoReaisM3: "Custo (R$/m³)",
                    co2KgM3: "CO₂ (kg/m³)",
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

            {/* Aviso de norma */}
            {resultado.abrams.relacaoAc.avisoNorma && (
              <div className="mb-4 rounded border border-amber-600/30 bg-amber-600/5 px-4 py-2">
                <p className="text-[10px] text-amber-400">{resultado.abrams.relacaoAc.avisoNorma}</p>
              </div>
            )}

            {/* Tabs */}
            <Tabs tabs={TAB_NAMES} active={tab} onChange={setTab} />

            {/* ─── TAB: COMPOSICAO 1M3 ────────────────────────────── */}
            {tab === 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2">Material</th>
                      <th className="px-3 py-2 text-right">Massa (kg/m3)</th>
                      <th className="px-3 py-2 text-right">Volume (L/m3)</th>
                      <th className="px-3 py-2 text-right">Custo (R$/m3)</th>
                      <th className="px-3 py-2 text-right">CO2 (kg/m3)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiais.map((l) => (
                      <tr key={`${l.categoria}-${l.id}`} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                        <td className="px-3 py-2 text-slate-300">{l.descricao}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-200">{n(l.massaKgM3, 1)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{n(l.volumeLM3, 1)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{n(l.custoReaisM3, 2)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{n(l.co2KgM3, 2)}</td>
                      </tr>
                    ))}
                    {/* Totais */}
                    <tr className="border-t-2 border-amber-600/30 font-bold">
                      <td className="px-3 py-2 text-amber-400">TOTAL</td>
                      <td className="px-3 py-2 text-right text-amber-400">{n(resultado.composicaoM3.massaTotalKgM3, 1)}</td>
                      <td className="px-3 py-2 text-right text-amber-400">{n(resultado.composicaoM3.volumeTotalLM3, 1)}</td>
                      <td className="px-3 py-2 text-right text-amber-400">{n(resultado.composicaoM3.custoTotalReaisM3, 2)}</td>
                      <td className="px-3 py-2 text-right text-amber-400">{n(resultado.composicaoM3.co2TotalKgM3, 2)}</td>
                    </tr>
                  </tbody>
                </table>
                {/* Fechamento volumétrico */}
                <div className="mt-3 flex items-center gap-2 px-3">
                  <span className={`h-2 w-2 rounded-full ${resultado.composicaoM3.fechamentoVolumeOk ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="text-[10px] text-slate-500">
                    Fechamento volumetrico: {n(resultado.composicaoM3.volumeTotalLM3, 1)} L/m3
                    {resultado.composicaoM3.fechamentoVolumeOk ? " (OK)" : " (FORA DE FAIXA)"}
                  </span>
                </div>
              </div>
            )}

            {/* ─── TAB: CURVA DE ABRAMS ───────────────────────────── */}
            {tab === 1 && (
              <div>
                {/* Equação de regressão */}
                <div className="mb-2 rounded border border-slate-800 bg-slate-900/60 px-4 py-2">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px]">
                    <span className="text-slate-400">
                      <span className="text-slate-600">Modelo:</span> ln(fc) = <span className="text-sky-400 font-bold">{n(resultado.abrams.paramsRegressao.A, 4)}</span> + (<span className="text-sky-400 font-bold">{n(resultado.abrams.paramsRegressao.B, 4)}</span>) × ln(a/c)
                    </span>
                    <span className="text-slate-400">
                      <span className="text-slate-600">R²</span> = <span className={resultado.abrams.paramsRegressao.r2 >= 0.95 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{n(resultado.abrams.paramsRegressao.r2, 4)}</span>
                    </span>
                    <span className="text-slate-500">{resultado.abrams.paramsRegressao.nPontos} pontos</span>
                  </div>
                </div>

                {/* Legenda */}
                <div className="mb-3 flex items-center gap-4 text-[9px] text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 bg-sky-500 rounded" /> Curva Abrams
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 border border-white" /> Ponto dosagem (a/c={n(resultado.abrams.relacaoAc.acAdotado, 3)}, Fcj={n(resultado.abrams.fcjMPa, 1)} MPa)
                  </span>
                  {pontosCalibracaoVisiveis.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full border-2 border-emerald-500" /> Calibração
                    </span>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={420}>
                  <ComposedChart data={abramsCurveData} margin={{ top: 15, right: 30, bottom: 40, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={TOKEN.slate800} strokeOpacity={0.5} />
                    <XAxis
                      dataKey="ac"
                      type="number"
                      domain={[parseFloat(acMinChart.toFixed(2)), parseFloat(acMaxChart.toFixed(2))]}
                      tickCount={10}
                      tick={{ fill: TOKEN.slate500, fontSize: 10, fontFamily: "monospace" }}
                      label={{ value: "Relação a/c", position: "bottom", offset: 15, fill: TOKEN.slate400, fontSize: 11, fontFamily: "monospace" }}
                    />
                    <YAxis
                      domain={[Math.floor(fcMinChart / 5) * 5, Math.ceil(fcMaxChart / 5) * 5]}
                      tick={{ fill: TOKEN.slate500, fontSize: 10, fontFamily: "monospace" }}
                      label={{ value: "fc (MPa)", angle: -90, position: "insideLeft", offset: -5, fill: TOKEN.slate400, fontSize: 11, fontFamily: "monospace" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,42,0.97)",
                        border: `1px solid ${TOKEN.slate700}`,
                        borderRadius: 4,
                        fontFamily: "monospace",
                        fontSize: 10,
                      }}
                      formatter={(v: number) => [`${v.toFixed(1)} MPa`, "fc"]}
                      labelFormatter={(v) => `a/c = ${Number(v).toFixed(3)}`}
                    />

                    {/* Linhas de referência — crosshairs no ponto dosagem */}
                    <ReferenceLine
                      x={resultado.abrams.relacaoAc.acAdotado}
                      stroke={TOKEN.amber}
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                    <ReferenceLine
                      y={resultado.abrams.fcjMPa}
                      stroke={TOKEN.amber}
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />

                    {/* Curva de Abrams — linha principal */}
                    <Line
                      type="monotone"
                      dataKey="fc"
                      stroke={TOKEN.sky}
                      strokeWidth={2.5}
                      dot={false}
                      name="Curva Abrams"
                      isAnimationActive={false}
                    />

                    {/* Ponto de dosagem */}
                    <Line
                      type="monotone"
                      data={[{
                        ac: resultado.abrams.relacaoAc.acAdotado,
                        fc: resultado.abrams.fcjMPa,
                      }]}
                      dataKey="fc"
                      stroke={TOKEN.amber}
                      strokeWidth={0}
                      dot={{ fill: TOKEN.amber, r: 7, stroke: "#fff", strokeWidth: 2 }}
                      name="Ponto dosagem"
                      isAnimationActive={false}
                    />

                    {/* Pontos de calibração */}
                    {pontosCalibracaoVisiveis.map((pt, idx) => (
                      <Line
                        key={`cal-${idx}`}
                        type="monotone"
                        data={[{ ac: pt.ac, fc: pt.fc }]}
                        dataKey="fc"
                        stroke="transparent"
                        strokeWidth={0}
                        dot={{ fill: "transparent", r: 5, stroke: TOKEN.emerald, strokeWidth: 2 }}
                        name={`P${idx + 1}`}
                        isAnimationActive={false}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ─── TAB: RESISTENCIAS POR IDADE ────────────────────── */}
            {tab === 2 && (
              <div>
                <div className="mb-4 text-[9px] text-slate-500">
                  Modelo maturidade: {resultado.abrams.fatoresMaturidade.modelo.toUpperCase()}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={idadeData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={TOKEN.slate800} />
                    <XAxis
                      dataKey="idade"
                      tick={{ fill: TOKEN.slate500, fontSize: 10, fontFamily: "monospace" }}
                    />
                    <YAxis
                      tick={{ fill: TOKEN.slate500, fontSize: 10, fontFamily: "monospace" }}
                      label={{ value: "fc (MPa)", angle: -90, position: "insideLeft", fill: TOKEN.slate500, fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,42,0.97)",
                        border: `1px solid ${TOKEN.slate700}`,
                        borderRadius: 4,
                        fontFamily: "monospace",
                        fontSize: 10,
                      }}
                      formatter={(v: number) => [`${v.toFixed(1)} MPa`]}
                    />
                    <Bar dataKey="fc" radius={[2, 2, 0, 0]}>
                      {idadeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.idade === "28d" ? TOKEN.amber : TOKEN.sky}
                          fillOpacity={entry.idade === "28d" ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Tabela de valores */}
                <table className="mt-4 w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2 text-left">Idade</th>
                      <th className="px-3 py-2 text-right">fc (MPa)</th>
                      <th className="px-3 py-2 text-right">Beta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["1d",  resultado.abrams.resistenciasPorIdade.fc1dMPa,  resultado.abrams.fatoresMaturidade.beta1d],
                      ["3d",  resultado.abrams.resistenciasPorIdade.fc3dMPa,  resultado.abrams.fatoresMaturidade.beta3d],
                      ["7d",  resultado.abrams.resistenciasPorIdade.fc7dMPa,  resultado.abrams.fatoresMaturidade.beta7d],
                      ["14d", resultado.abrams.resistenciasPorIdade.fc14dMPa, resultado.abrams.fatoresMaturidade.beta14d],
                      ["28d", resultado.abrams.resistenciasPorIdade.fc28dMPa, resultado.abrams.fatoresMaturidade.beta28d],
                      ["56d", resultado.abrams.resistenciasPorIdade.fc56dMPa, resultado.abrams.fatoresMaturidade.beta56d],
                      ["91d", resultado.abrams.resistenciasPorIdade.fc91dMPa, resultado.abrams.fatoresMaturidade.beta91d],
                    ] as [string, number, number][]).map(([idade, fc, beta]) => (
                      <tr key={idade} className={`border-b border-slate-800/50 ${idade === "28d" ? "bg-amber-600/5" : ""}`}>
                        <td className={`px-3 py-1.5 ${idade === "28d" ? "font-bold text-amber-400" : "text-slate-300"}`}>{idade}</td>
                        <td className={`px-3 py-1.5 text-right font-mono ${idade === "28d" ? "font-bold text-amber-400" : "text-slate-200"}`}>{n(fc, 1)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-500">{n(beta, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── TAB: VERIFICACOES NBR 6118 ─────────────────────── */}
            {tab === 3 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2 text-left">Parametro</th>
                      <th className="px-3 py-2 text-right">Calculado</th>
                      <th className="px-3 py-2 text-right">Limite</th>
                      <th className="px-3 py-2 text-left">Norma</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.verificacoes.map((v, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        <td className="px-3 py-2 text-slate-300">{v.parametro}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-200">{n(v.valorCalculado, 3)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-400">{n(v.limiteNorma, 3)}</td>
                        <td className="px-3 py-2 text-slate-500">{v.normaReferencia}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={[
                            "inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase",
                            v.aprovado
                              ? "bg-emerald-600/10 text-emerald-400"
                              : "bg-red-600/10 text-red-400",
                          ].join(" ")}>
                            {v.aprovado ? "Aprovado" : "Reprovado"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {resultado.verificacoes.length === 0 && (
                  <p className="py-8 text-center text-[11px] text-slate-600">Nenhuma verificacao disponivel.</p>
                )}
              </div>
            )}

            {/* ─── TAB: TRACO UNITARIO ────────────────────────────── */}
            {tab === 4 && (
              <div className="space-y-6">
                {/* Notação convencional */}
                <div className="rounded border border-amber-600/30 bg-amber-600/5 p-6">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Traco Unitario</p>
                  <p className="font-mono text-xl font-bold text-amber-400">{tracoStr}</p>
                  {resultado.tracoUnitario.aditivoSp && (
                    <p className="mt-2 text-[10px] text-slate-500">
                      + Aditivo SP: {n(resultado.tracoUnitario.aditivoSp, 4)} (fracao do cimento)
                    </p>
                  )}
                  {resultado.tracoUnitario.scm && (
                    <p className="text-[10px] text-slate-500">
                      + SCM: {n(resultado.tracoUnitario.scm, 4)} (fracao do cimento)
                    </p>
                  )}
                </div>

                {/* Detalhamento */}
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2 text-left">Componente</th>
                      <th className="px-3 py-2 text-right">Proporcao</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800/50">
                      <td className="px-3 py-1.5 text-slate-300">Cimento</td>
                      <td className="px-3 py-1.5 text-right font-bold text-amber-400">1.000</td>
                    </tr>
                    {resultado.tracoUnitario.areias.map((a) => (
                      <tr key={a.id} className="border-b border-slate-800/50">
                        <td className="px-3 py-1.5 text-slate-300">Areia ({a.id})</td>
                        <td className="px-3 py-1.5 text-right text-slate-200">{n(a.valor, 3)}</td>
                      </tr>
                    ))}
                    {resultado.tracoUnitario.britas.map((b) => (
                      <tr key={b.id} className="border-b border-slate-800/50">
                        <td className="px-3 py-1.5 text-slate-300">Brita ({b.id})</td>
                        <td className="px-3 py-1.5 text-right text-slate-200">{n(b.valor, 3)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-slate-800/50">
                      <td className="px-3 py-1.5 text-slate-300">Agua (a/c)</td>
                      <td className="px-3 py-1.5 text-right text-slate-200">{n(resultado.tracoUnitario.agua, 3)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Meta */}
                <div className="rounded border border-slate-800 p-4 text-[10px] text-slate-500 space-y-1">
                  <p>kPasta = {n(resultado.kPasta, 4)}</p>
                  <p>Obra: {resultado.meta.obra}</p>
                  <p>Norma: {resultado.meta.norma}</p>
                  <p>Classe: {resultado.meta.classeAgressividade}</p>
                </div>
              </div>
            )}

            {/* ─── TAB: TRACO CAMPO ───────────────────────────────── */}
            {tab === 5 && resultado.tracoCampo && (
              <div>
                <p className="mb-4 text-[10px] text-slate-500">
                  Traco corrigido para umidade de campo dos agregados miudos
                </p>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-3 py-2 text-left">Material</th>
                      <th className="px-3 py-2 text-right">Massa Seca (kg/m3)</th>
                      <th className="px-3 py-2 text-right">Massa Campo (kg/m3)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800/50">
                      <td className="px-3 py-1.5 text-slate-300">Cimento</td>
                      <td className="px-3 py-1.5 text-right text-slate-400">{n(resultado.tracoCampo.cimentoKgM3, 1)}</td>
                      <td className="px-3 py-1.5 text-right text-slate-200">{n(resultado.tracoCampo.cimentoKgM3, 1)}</td>
                    </tr>
                    <tr className="border-b border-slate-800/50">
                      <td className="px-3 py-1.5 text-slate-300">Agua na betoneira</td>
                      <td className="px-3 py-1.5 text-right text-slate-400">—</td>
                      <td className="px-3 py-1.5 text-right text-slate-200">{n(resultado.tracoCampo.aguaBetoneiraMKgM3, 1)}</td>
                    </tr>
                    {resultado.tracoCampo.agregados.map((ag, i) => (
                      <tr
                        key={`${ag.categoria}-${ag.id}-${i}`}
                        className={`border-b border-slate-800/50 ${ag.temCorrecaoUmidade ? "bg-amber-600/5" : ""}`}
                      >
                        <td className={`px-3 py-1.5 ${ag.temCorrecaoUmidade ? "text-amber-300" : "text-slate-300"}`}>
                          {ag.descricao} {ag.temCorrecaoUmidade && <span className="text-[9px] text-amber-500">(umida)</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-400">{n(ag.massaSecaKgM3, 1)}</td>
                        <td className={`px-3 py-1.5 text-right ${ag.temCorrecaoUmidade ? "font-bold text-amber-300" : "text-slate-200"}`}>
                          {n(ag.massaCampoKgM3, 1)}
                        </td>
                      </tr>
                    ))}
                    {resultado.tracoCampo.aditivoSpKgM3 != null && (
                      <tr className="border-b border-slate-800/50">
                        <td className="px-3 py-1.5 text-slate-300">Aditivo SP</td>
                        <td className="px-3 py-1.5 text-right text-slate-400">{n(resultado.tracoCampo.aditivoSpKgM3, 2)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-200">{n(resultado.tracoCampo.aditivoSpKgM3, 2)}</td>
                      </tr>
                    )}
                    {resultado.tracoCampo.scmKgM3 != null && (
                      <tr className="border-b border-slate-800/50">
                        <td className="px-3 py-1.5 text-slate-300">SCM / Adição</td>
                        <td className="px-3 py-1.5 text-right text-slate-400">{n(resultado.tracoCampo.scmKgM3, 1)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-200">{n(resultado.tracoCampo.scmKgM3, 1)}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-amber-600/30">
                      <td className="px-3 py-1.5 font-bold text-amber-400">Correcao agua</td>
                      <td className="px-3 py-1.5" />
                      <td className="px-3 py-1.5 text-right font-bold text-amber-400">{n(resultado.tracoCampo.ajusteAguaKgM3, 1)} kg/m3</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 text-[9px] text-slate-600">
                  Correcao de umidade aplicada somente nos agregados miudos (areias). Britas em massa seca.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: PARAMETRICO ─────────────────────────────────── */}
        {TAB_NAMES[tab] === "Parametrico" && resultadoParametrico && (
          <div className="p-6">
            <h3 className="mb-2 text-xs font-bold text-violet-400 uppercase tracking-wider">
              Estudo Parametrico — {resultadoParametrico.labelVariavel}
              {resultadoParametrico.unidadeVariavel && ` (${resultadoParametrico.unidadeVariavel})`}
            </h3>
            <p className="mb-4 text-[10px] text-slate-500">
              {resultadoParametrico.pontos.filter(p => !p.erro).length} pontos validos de {resultadoParametrico.config.passos}
              {resultadoParametrico.zonaAprovada && (
                <span className="ml-2 text-emerald-500">
                  Zona aprovada: {resultadoParametrico.zonaAprovada.min}–{resultadoParametrico.zonaAprovada.max}
                </span>
              )}
            </p>

            {/* KPIs do melhor ponto */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {resultadoParametrico.melhorCusto && (
                <div className="rounded border border-amber-800/30 bg-amber-900/10 p-3">
                  <p className="text-[8px] text-amber-500 uppercase tracking-wider">Menor Custo</p>
                  <p className="font-mono text-sm font-bold text-amber-300">
                    R$ {resultadoParametrico.melhorCusto.custoReaisM3.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-slate-500">
                    {resultadoParametrico.labelVariavel} = {resultadoParametrico.melhorCusto.valorVariavel}
                  </p>
                </div>
              )}
              {resultadoParametrico.melhorCo2 && (
                <div className="rounded border border-emerald-800/30 bg-emerald-900/10 p-3">
                  <p className="text-[8px] text-emerald-500 uppercase tracking-wider">Menor CO2</p>
                  <p className="font-mono text-sm font-bold text-emerald-300">
                    {resultadoParametrico.melhorCo2.co2KgM3.toFixed(1)} kg/m3
                  </p>
                  <p className="text-[8px] text-slate-500">
                    {resultadoParametrico.labelVariavel} = {resultadoParametrico.melhorCo2.valorVariavel}
                  </p>
                </div>
              )}
              {resultadoParametrico.melhorEficiencia && (
                <div className="rounded border border-sky-800/30 bg-sky-900/10 p-3">
                  <p className="text-[8px] text-sky-500 uppercase tracking-wider">Maior Eficiencia</p>
                  <p className="font-mono text-sm font-bold text-sky-300">
                    {resultadoParametrico.melhorEficiencia.eficienciaEta.toFixed(4)} MPa.m3/kg
                  </p>
                  <p className="text-[8px] text-slate-500">
                    {resultadoParametrico.labelVariavel} = {resultadoParametrico.melhorEficiencia.valorVariavel}
                  </p>
                </div>
              )}
            </div>

            {/* Gráfico multi-eixo */}
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={resultadoParametrico.pontos.filter(p => !p.erro)} margin={{ top: 10, right: 40, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="#1E293B" />
                <XAxis
                  dataKey="valorVariavel" type="number"
                  tick={{ fontSize: 9, fill: "#64748B" }}
                  label={{ value: resultadoParametrico.labelVariavel, position: "bottom", fontSize: 9, fill: "#64748B" }}
                />
                <YAxis yAxisId="custo" orientation="left"
                  tick={{ fontSize: 8, fill: "#D97706" }}
                  label={{ value: "R$/m3", angle: -90, position: "insideLeft", fontSize: 8, fill: "#D97706" }}
                />
                <YAxis yAxisId="co2" orientation="right"
                  tick={{ fontSize: 8, fill: "#059669" }}
                  label={{ value: "kg CO2/m3", angle: 90, position: "insideRight", fontSize: 8, fill: "#059669" }}
                />
                <Tooltip
                  contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 4, fontSize: 10 }}
                  formatter={(v: number, name: string) => [typeof v === "number" ? v.toFixed(2) : v, name]}
                />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {resultadoParametrico.zonaAprovada && (
                  <ReferenceArea
                    x1={resultadoParametrico.zonaAprovada.min}
                    x2={resultadoParametrico.zonaAprovada.max}
                    yAxisId="custo"
                    fill="#059669" fillOpacity={0.08}
                    label={{ value: "Aprovado", fontSize: 8, fill: "#059669" }}
                  />
                )}
                <Line yAxisId="custo" dataKey="custoReaisM3" name="Custo (R$/m3)"
                  stroke="#D97706" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="co2" dataKey="co2KgM3" name="CO2 (kg/m3)"
                  stroke="#059669" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="custo" dataKey="consumoCimentoKgM3" name="Cimento (kg/m3)"
                  stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Tabela de pontos */}
            <div className="mt-4 max-h-64 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-slate-800 text-[8px] uppercase tracking-wider text-slate-500">
                    <th className="px-2 py-1 text-left">{resultadoParametrico.labelVariavel}</th>
                    <th className="px-2 py-1 text-right">a/c</th>
                    <th className="px-2 py-1 text-right">fcj</th>
                    <th className="px-2 py-1 text-right">Cc</th>
                    <th className="px-2 py-1 text-right">Custo</th>
                    <th className="px-2 py-1 text-right">CO2</th>
                    <th className="px-2 py-1 text-right">eta</th>
                    <th className="px-2 py-1 text-center">Norma</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadoParametrico.pontos.map((p, i) => (
                    <tr key={i} className={`border-b border-slate-800/30 ${p.aprovadoNorma ? "" : "opacity-50"} ${p.erro ? "bg-red-900/10" : ""}`}>
                      <td className="px-2 py-1 text-slate-300 font-mono">{p.valorVariavel}</td>
                      <td className="px-2 py-1 text-right text-slate-400">{p.erro ? "—" : p.acAdotado.toFixed(3)}</td>
                      <td className="px-2 py-1 text-right text-slate-400">{p.erro ? "—" : p.fcjMPa.toFixed(1)}</td>
                      <td className="px-2 py-1 text-right text-slate-400">{p.erro ? "—" : p.consumoCimentoKgM3.toFixed(0)}</td>
                      <td className="px-2 py-1 text-right text-amber-400">{p.erro ? "—" : p.custoReaisM3.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right text-emerald-400">{p.erro ? "—" : p.co2KgM3.toFixed(1)}</td>
                      <td className="px-2 py-1 text-right text-sky-400">{p.erro ? "—" : p.eficienciaEta.toFixed(4)}</td>
                      <td className="px-2 py-1 text-center">
                        {p.erro ? <span className="text-red-400" title={p.erro}>ERR</span>
                          : p.aprovadoNorma ? <span className="text-emerald-400">OK</span>
                          : <span className="text-red-400">{p.nVerificacoesAprovadas}/{p.nVerificacoesTotais}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: COMPARATIVO (ACI × ABCP × IPT-EPUSP) ──────────── */}
        {TAB_NAMES[tab] === "Comparativo" && (resultadoACI || resultadoABCP) && (
          <div>
            <h3 className="mb-4 text-xs font-bold text-slate-200 tracking-wide">
              Comparativo de Metodos de Dosagem
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* IPT-EPUSP */}
              {resultado && (
                <div className="rounded border border-amber-800/30 bg-amber-900/10 p-4">
                  <p className="text-[10px] font-bold text-amber-400 mb-2">IPT-EPUSP (Abrams)</p>
                  <div className="space-y-1 text-[9px] text-slate-400">
                    <p>a/c: <span className="text-amber-300 font-bold">{resultado.abrams.relacaoAc.acAdotado.toFixed(3)}</span></p>
                    <p>Cimento: <span className="text-amber-300">{resultado.composicaoM3.linhas.find((l: LinhaComp) => l.categoria === "cimento")?.massaKgM3.toFixed(0) ?? "—"} kg/m³</span></p>
                    <p>fcj: <span className="text-amber-300">{resultado.abrams.fcjMPa.toFixed(1)} MPa</span></p>
                    <p>Traco: 1 : {resultado.tracoUnitario.areias.map((a: { id: string; valor: number }) => a.valor.toFixed(2)).join(" + ")} : {resultado.tracoUnitario.britas.map((b: { id: string; valor: number }) => b.valor.toFixed(2)).join(" + ")}</p>
                  </div>
                </div>
              )}

              {/* ACI 211.1 */}
              {resultadoACI && (
                <div className="rounded border border-emerald-800/30 bg-emerald-900/10 p-4">
                  <p className="text-[10px] font-bold text-emerald-400 mb-2">ACI 211.1</p>
                  <div className="space-y-1 text-[9px] text-slate-400">
                    <p>a/c: <span className="text-emerald-300 font-bold">{resultadoACI.acAdotado.toFixed(3)}</span></p>
                    <p>Cimento: <span className="text-emerald-300">{resultadoACI.consumoCimentoKgM3} kg/m³</span></p>
                    <p>Agua: <span className="text-emerald-300">{resultadoACI.aguaKgM3} kg/m³</span></p>
                    <p>Traco: 1 : {resultadoACI.tracoUnitario.areia} : {resultadoACI.tracoUnitario.brita}</p>
                  </div>
                  <details className="mt-2">
                    <summary className="text-[8px] text-emerald-600 cursor-pointer">Etapas ACI</summary>
                    <ul className="mt-1 space-y-0.5 text-[8px] text-slate-600">
                      {resultadoACI.etapas.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                </div>
              )}

              {/* ABCP */}
              {resultadoABCP && (
                <div className="rounded border border-sky-800/30 bg-sky-900/10 p-4">
                  <p className="text-[10px] font-bold text-sky-400 mb-2">ABCP</p>
                  <div className="space-y-1 text-[9px] text-slate-400">
                    <p>a/c: <span className="text-sky-300 font-bold">{resultadoABCP.acAdotado.toFixed(3)}</span></p>
                    <p>Cimento: <span className="text-sky-300">{resultadoABCP.consumoCimentoKgM3} kg/m³</span>
                      {resultadoABCP.cimentoCorrigido && <span className="text-red-400 ml-1">(corrigido NBR)</span>}
                    </p>
                    <p>Agua: <span className="text-sky-300">{resultadoABCP.aguaKgM3} kg/m³</span></p>
                    <p>fcj: <span className="text-sky-300">{resultadoABCP.fcjMPa} MPa</span></p>
                    <p>Traco: 1 : {resultadoABCP.tracoUnitario.areia} : {resultadoABCP.tracoUnitario.brita}</p>
                  </div>
                  <details className="mt-2">
                    <summary className="text-[8px] text-sky-600 cursor-pointer">Etapas ABCP</summary>
                    <ul className="mt-1 space-y-0.5 text-[8px] text-slate-600">
                      {resultadoABCP.etapas.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                </div>
              )}
            </div>

            {/* Tabela comparativa resumida */}
            {resultado && resultadoACI && resultadoABCP && (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[8px] uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2 text-left">Parametro</th>
                      <th className="px-3 py-2 text-right text-amber-500">IPT-EPUSP</th>
                      <th className="px-3 py-2 text-right text-emerald-500">ACI 211.1</th>
                      <th className="px-3 py-2 text-right text-sky-500">ABCP</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    <tr className="border-b border-slate-800/30">
                      <td className="px-3 py-1.5">a/c</td>
                      <td className="px-3 py-1.5 text-right font-mono text-amber-300">{resultado.abrams.relacaoAc.acAdotado.toFixed(3)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-300">{resultadoACI.acAdotado.toFixed(3)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-sky-300">{resultadoABCP.acAdotado.toFixed(3)}</td>
                    </tr>
                    <tr className="border-b border-slate-800/30">
                      <td className="px-3 py-1.5">Cimento (kg/m³)</td>
                      <td className="px-3 py-1.5 text-right font-mono text-amber-300">{resultado.composicaoM3.linhas.find((l: LinhaComp) => l.categoria === "cimento")?.massaKgM3.toFixed(0) ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-300">{resultadoACI.consumoCimentoKgM3}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-sky-300">{resultadoABCP.consumoCimentoKgM3}</td>
                    </tr>
                    <tr className="border-b border-slate-800/30">
                      <td className="px-3 py-1.5">Agua (kg/m³)</td>
                      <td className="px-3 py-1.5 text-right font-mono text-amber-300">{resultado.composicaoM3.linhas.find((l: LinhaComp) => l.categoria === "agua")?.massaKgM3.toFixed(0) ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-300">{resultadoACI.aguaKgM3}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-sky-300">{resultadoABCP.aguaKgM3}</td>
                    </tr>
                    <tr className="border-b border-slate-800/30">
                      <td className="px-3 py-1.5">Areia (kg/m³)</td>
                      <td className="px-3 py-1.5 text-right font-mono text-amber-300">—</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-300">{resultadoACI.massaAreiaKgM3}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-sky-300">{resultadoABCP.massaAreiaKgM3}</td>
                    </tr>
                    <tr className="border-b border-slate-800/30">
                      <td className="px-3 py-1.5">Brita (kg/m³)</td>
                      <td className="px-3 py-1.5 text-right font-mono text-amber-300">—</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-300">{resultadoACI.massaBritaKgM3}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-sky-300">{resultadoABCP.massaBritaKgM3}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5">Traco (1:a:p)</td>
                      <td className="px-3 py-1.5 text-right font-mono text-amber-300">Calc. acima</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-300">1:{resultadoACI.tracoUnitario.areia}:{resultadoACI.tracoUnitario.brita}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-sky-300">1:{resultadoABCP.tracoUnitario.areia}:{resultadoABCP.tracoUnitario.brita}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: 4 QUADRANTES (IPT-EPUSP / IBRACON) ────────────── */}
        {TAB_NAMES[tab] === "4 Quadrantes" && resultado4Q && (
          <div>
            <h3 className="mb-2 text-xs font-bold text-slate-200 tracking-wide">
              Grafico de 4 Quadrantes — IPT-EPUSP / IBRACON
            </h3>
            <p className="mb-4 text-[8px] text-slate-600">
              Q1: fc × a/c (Abrams) · Q2: m × a/c (Lyse) · Q3: Cc × m (Molinari) · Q4: fc × Cc (Resultante)
            </p>

            {/* Ponto de trabalho */}
            {resultado4Q.pontoTrabalho && (
              <div className="mb-4 rounded border border-amber-800/30 bg-amber-900/10 p-3 inline-flex gap-6 text-[9px]">
                <div><span className="text-slate-500">a/c =</span> <span className="text-amber-300 font-bold">{resultado4Q.pontoTrabalho.ac}</span></div>
                <div><span className="text-slate-500">fc =</span> <span className="text-amber-300 font-bold">{resultado4Q.pontoTrabalho.fc} MPa</span></div>
                <div><span className="text-slate-500">m =</span> <span className="text-amber-300 font-bold">{resultado4Q.pontoTrabalho.m}</span></div>
                <div><span className="text-slate-500">Cc =</span> <span className="text-amber-300 font-bold">{resultado4Q.pontoTrabalho.cc} kg/m³</span></div>
              </div>
            )}

            {/* 4 Quadrantes layout — 2×2 grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Q1 — fc × a/c (Abrams) */}
              <div className="rounded border border-slate-800 bg-slate-900/50 p-2">
                <p className="text-[8px] text-amber-500 font-bold mb-1">Q1: fc × a/c (Abrams)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={resultado4Q.curva} margin={{ top: 5, right: 15, bottom: 15, left: 5 }}>
                    <CartesianGrid strokeDasharray="2 6" stroke="#1E293B" />
                    <XAxis dataKey="ac" type="number" domain={[resultado4Q.limites.acMin, resultado4Q.limites.acMax]}
                      tick={{ fontSize: 8, fill: "#64748B" }}
                      label={{ value: "a/c", position: "bottom", fontSize: 8, fill: "#64748B" }} />
                    <YAxis domain={[resultado4Q.limites.fcMin, resultado4Q.limites.fcMax]}
                      tick={{ fontSize: 8, fill: "#64748B" }}
                      label={{ value: "fc (MPa)", angle: -90, position: "insideLeft", fontSize: 8, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", fontSize: 9 }} />
                    <Line dataKey="fc" stroke="#D97706" strokeWidth={2} dot={false} />
                    {resultado4Q.pontoTrabalho && (
                      <ReferenceLine x={resultado4Q.pontoTrabalho.ac} stroke="#EF4444" strokeDasharray="3 3" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Q2 — m × a/c (Lyse) */}
              <div className="rounded border border-slate-800 bg-slate-900/50 p-2">
                <p className="text-[8px] text-emerald-500 font-bold mb-1">Q2: m × a/c (Lyse)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={resultado4Q.curva} margin={{ top: 5, right: 15, bottom: 15, left: 5 }}>
                    <CartesianGrid strokeDasharray="2 6" stroke="#1E293B" />
                    <XAxis dataKey="ac" type="number" domain={[resultado4Q.limites.acMin, resultado4Q.limites.acMax]}
                      tick={{ fontSize: 8, fill: "#64748B" }}
                      label={{ value: "a/c", position: "bottom", fontSize: 8, fill: "#64748B" }} />
                    <YAxis domain={[resultado4Q.limites.mMin, resultado4Q.limites.mMax]}
                      tick={{ fontSize: 8, fill: "#64748B" }}
                      label={{ value: "m (kg/kg)", angle: -90, position: "insideLeft", fontSize: 8, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", fontSize: 9 }} />
                    <Line dataKey="m" stroke="#059669" strokeWidth={2} dot={false} />
                    {resultado4Q.pontoTrabalho && (
                      <ReferenceLine x={resultado4Q.pontoTrabalho.ac} stroke="#EF4444" strokeDasharray="3 3" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Q3 — Cc × m (Molinari) */}
              <div className="rounded border border-slate-800 bg-slate-900/50 p-2">
                <p className="text-[8px] text-sky-500 font-bold mb-1">Q3: Cc × m (Molinari)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={resultado4Q.curva} margin={{ top: 5, right: 15, bottom: 15, left: 5 }}>
                    <CartesianGrid strokeDasharray="2 6" stroke="#1E293B" />
                    <XAxis dataKey="m" type="number" domain={[resultado4Q.limites.mMin, resultado4Q.limites.mMax]}
                      tick={{ fontSize: 8, fill: "#64748B" }}
                      label={{ value: "m (kg/kg)", position: "bottom", fontSize: 8, fill: "#64748B" }}
                      reversed />
                    <YAxis domain={[resultado4Q.limites.ccMin, resultado4Q.limites.ccMax]}
                      tick={{ fontSize: 8, fill: "#64748B" }}
                      label={{ value: "Cc (kg/m³)", angle: -90, position: "insideLeft", fontSize: 8, fill: "#64748B" }}
                      orientation="right" />
                    <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", fontSize: 9 }} />
                    <Line dataKey="cc" stroke="#0284C7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Q4 — fc × Cc (Resultante) */}
              <div className="rounded border border-slate-800 bg-slate-900/50 p-2">
                <p className="text-[8px] text-violet-500 font-bold mb-1">Q4: fc × Cc (Resultante)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={resultado4Q.curva} margin={{ top: 5, right: 15, bottom: 15, left: 5 }}>
                    <CartesianGrid strokeDasharray="2 6" stroke="#1E293B" />
                    <XAxis dataKey="cc" type="number" domain={[resultado4Q.limites.ccMin, resultado4Q.limites.ccMax]}
                      tick={{ fontSize: 8, fill: "#64748B" }}
                      label={{ value: "Cc (kg/m³)", position: "bottom", fontSize: 8, fill: "#64748B" }} />
                    <YAxis domain={[resultado4Q.limites.fcMin, resultado4Q.limites.fcMax]}
                      tick={{ fontSize: 8, fill: "#64748B" }}
                      label={{ value: "fc (MPa)", angle: -90, position: "insideLeft", fontSize: 8, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", fontSize: 9 }} />
                    <Line dataKey="fc" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    {resultado4Q.pontoTrabalho && (
                      <ReferenceLine x={resultado4Q.pontoTrabalho.cc} stroke="#EF4444" strokeDasharray="3 3" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela de dados da curva */}
            <details className="mt-4">
              <summary className="text-[9px] text-slate-500 cursor-pointer hover:text-slate-300">Dados da curva ({resultado4Q.curva.length} pontos)</summary>
              <div className="mt-2 max-h-48 overflow-y-auto">
                <table className="w-full text-[9px]">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="border-b border-slate-800 text-[8px] uppercase tracking-wider text-slate-500">
                      <th className="px-2 py-1 text-right">a/c</th>
                      <th className="px-2 py-1 text-right">fc (MPa)</th>
                      <th className="px-2 py-1 text-right">m</th>
                      <th className="px-2 py-1 text-right">Cc (kg/m³)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado4Q.curva.map((p, i) => (
                      <tr key={i} className="border-b border-slate-800/20 text-slate-400">
                        <td className="px-2 py-0.5 text-right font-mono">{p.ac}</td>
                        <td className="px-2 py-0.5 text-right font-mono">{p.fc}</td>
                        <td className="px-2 py-0.5 text-right font-mono">{p.m}</td>
                        <td className="px-2 py-0.5 text-right font-mono">{p.cc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: SALVAR TRAÇO
      ═══════════════════════════════════════════════════════════════════ */}
      {showSaveModal && resultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded border border-slate-700 bg-slate-900 p-6 shadow-2xl font-mono">
            <h2 className="mb-4 text-sm font-bold text-slate-100 tracking-wide">Salvar Traco no Projeto</h2>

            {/* Descrição */}
            <div className="mb-4">
              <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Descricao *
              </label>
              <input
                value={saveDescricao}
                onChange={(e) => setSaveDescricao(e.target.value)}
                className="w-full rounded-sm border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 focus:border-amber-600 focus:outline-none"
              />
            </div>

            {/* Seleção de Projeto */}
            <div className="mb-4">
              <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Projeto *
              </label>
              {projetos.isLoading ? (
                <p className="text-[10px] text-slate-500">Carregando projetos...</p>
              ) : (
                <>
                  <select
                    value={saveProjetoId}
                    onChange={(e) => setSaveProjetoId(e.target.value)}
                    className="w-full rounded-sm border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="">Selecione um projeto...</option>
                    {projetos.data?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p._count.tracos} tracos)
                      </option>
                    ))}
                  </select>

                  {/* Criar novo projeto inline */}
                  {!criandoProjeto ? (
                    <button
                      onClick={() => setCriandoProjeto(true)}
                      className="mt-2 text-[10px] text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      + Criar novo projeto
                    </button>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={saveNovoNome}
                        onChange={(e) => setSaveNovoNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && saveNovoNome.trim()) {
                            criarProjetoMut.mutate({ nome: saveNovoNome.trim() });
                          }
                        }}
                        placeholder="Nome do novo projeto"
                        className="flex-1 rounded-sm border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-200 focus:border-amber-600 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (saveNovoNome.trim()) {
                            criarProjetoMut.mutate({ nome: saveNovoNome.trim() });
                          }
                        }}
                        disabled={!saveNovoNome.trim() || criarProjetoMut.isPending}
                        className="rounded-sm bg-amber-600 px-3 py-1.5 text-[9px] font-bold text-white hover:bg-amber-500 disabled:opacity-40 transition-colors"
                      >
                        {criarProjetoMut.isPending ? "..." : "Criar"}
                      </button>
                      <button
                        onClick={() => { setCriandoProjeto(false); setSaveNovoNome(""); }}
                        className="text-[10px] text-slate-500 hover:text-slate-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Resumo do traço */}
            <div className="mb-4 rounded border border-slate-800 bg-slate-950/60 px-3 py-2">
              <p className="text-[9px] text-slate-500 mb-1">Resumo do traco:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                <span className="text-slate-500">fck:</span>
                <span className="text-slate-200 text-right">{resultado.meta.fckMPa} MPa</span>
                <span className="text-slate-500">a/c:</span>
                <span className="text-slate-200 text-right">{resultado.abrams.relacaoAc.acAdotado.toFixed(3)}</span>
                <span className="text-slate-500">Custo:</span>
                <span className="text-emerald-400 text-right">R$ {resultado.composicaoM3.custoTotalReaisM3.toFixed(2)}/m3</span>
                <span className="text-slate-500">CO2:</span>
                <span className="text-slate-400 text-right">{resultado.composicaoM3.co2TotalKgM3.toFixed(1)} kg/m3</span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowSaveModal(false); setCriandoProjeto(false); }}
                className="rounded-sm border border-slate-700 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!saveProjetoId || !saveDescricao.trim()) return;
                  salvarTracoMut.mutate({
                    projetoId:  saveProjetoId,
                    descricao:  saveDescricao.trim(),
                    inputJson:  JSON.stringify(getValues()),
                    outputJson: JSON.stringify(resultado),
                    fckMPa:     resultado.meta.fckMPa,
                    acAdotado:  resultado.abrams.relacaoAc.acAdotado,
                    custoM3:    resultado.composicaoM3.custoTotalReaisM3,
                    co2KgM3:    resultado.composicaoM3.co2TotalKgM3,
                  });
                }}
                disabled={!saveProjetoId || !saveDescricao.trim() || salvarTracoMut.isPending}
                className="rounded-sm bg-amber-600 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {salvarTracoMut.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
