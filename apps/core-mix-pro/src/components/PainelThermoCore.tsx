"use client";

/**
 * @file components/PainelThermoCore.tsx
 * @description Painel de monitoramento ThermoCore — Maturidade, fck(t) e Desforma
 *
 * Seções:
 *   1. Configuração (Ea, calibração, fck28, tipo cimento)
 *   2. Entrada de leituras (manual ou simulação)
 *   3. KPI Cards (te, fck, maturidade, desforma)
 *   4. Gráfico T(t) — temperatura ao longo do tempo
 *   5. Gráfico fck(t_e) — resistência × idade equivalente
 *   6. Badge de decisão de desforma
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";

import {
  executarThermoCore,
  gerarCurvaMaturidade,
  EA_J_MOL,
  CALIBRACAO_DEFAULT,
  S_CEB_FIP,
  T_DATUM_CELSIUS,
  LIMITE_DELTA_T_C,
  LIMITE_T_NUCLEO_C,
  type TipoCimento,
  type LeituraTemperatura,
  type ResultadoThermoCore,
  type ParamsCalibracao,
} from "../lib/thermocore";

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP CUSTOMIZADO
// ─────────────────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] shadow-lg">
      <p className="mb-1 font-bold text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GERADOR DE LEITURAS DEMO (simulação de cura realista)
// ─────────────────────────────────────────────────────────────────────────────

function gerarLeiturasDemo(
  T_lanc: number,
  T_pico: number,
  T_final: number,
  duracao_h: number,
): LeituraTemperatura[] {
  const leituras: LeituraTemperatura[] = [];
  const t_pico = duracao_h * 0.15;

  for (let t = 0; t <= duracao_h; t += 1) {
    let T: number;
    if (t <= t_pico) {
      T = T_lanc + (T_pico - T_lanc) * Math.pow(t / t_pico, 0.8);
    } else {
      const frac = (t - t_pico) / (duracao_h - t_pico);
      T = T_pico - (T_pico - T_final) * (1 - Math.exp(-3 * frac));
    }
    leituras.push({ tempo_h: t, temperatura_C: Math.round(T * 10) / 10 });
  }
  return leituras;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE CIMENTO PARA SELECT
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS_CIMENTO: { value: string; label: string }[] = [
  { value: "CP_V_ARI", label: "CP V-ARI" },
  { value: "CP_II_F",  label: "CP II-F" },
  { value: "CP_II_E",  label: "CP II-E" },
  { value: "CP_III",   label: "CP III" },
  { value: "CP_IV",    label: "CP IV" },
  { value: "LC3",      label: "LC³" },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function PainelThermoCore() {
  // Modo: "simulacao" ou "nexus"
  const [modo, setModo] = useState<"simulacao" | "nexus">("simulacao");

  // Config
  const [tipoCimento, setTipoCimento] = useState("CP_V_ARI");
  const [fck28, setFck28] = useState(40);
  const [relacaoAc, setRelacaoAc] = useState(0.50);
  const [tSuperficie, setTSuperficie] = useState<number | null>(null);
  const [canalNexus, setCanalNexus] = useState<"ch1" | "ch2" | "ch3" | "ch4">("ch1");

  // Simulação
  const [tLanc, setTLanc] = useState(25);
  const [tPico, setTPico] = useState(65);
  const [tFinal, setTFinal] = useState(30);
  const [duracao, setDuracao] = useState(168);

  // Resultado
  const [resultado, setResultado] = useState<ResultadoThermoCore | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // NEXUS Live
  const [nexusStatus, setNexusStatus] = useState<"offline" | "conectado" | "gravando">("offline");
  const [nexusLeituras, setNexusLeituras] = useState(0);
  const [liveAtivo, setLiveAtivo] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derivados
  const Ea = EA_J_MOL[tipoCimento as TipoCimento] ?? 40000;
  const cal = CALIBRACAO_DEFAULT[tipoCimento] ?? CALIBRACAO_DEFAULT.CP_V_ARI;
  const sCeb = tipoCimento.includes("V") || tipoCimento.includes("LC3")
    ? S_CEB_FIP.R.s
    : tipoCimento.includes("III") || tipoCimento.includes("IV")
    ? S_CEB_FIP.S.s
    : S_CEB_FIP.N.s;

  // ── Fetch NEXUS e processa ThermoCore ──
  const fetchNexus = useCallback(async () => {
    try {
      const res = await fetch("/api/nexus", { cache: "no-store" });
      if (!res.ok) {
        setNexusStatus("offline");
        return;
      }
      const data = await res.json();

      // Status
      if (data._gravando) setNexusStatus("gravando");
      else if (data._mqtt_conectado) setNexusStatus("conectado");
      else setNexusStatus("offline");

      // Converter maturidade do NEXUS para LeituraTemperatura[]
      const mat = data.maturidade ?? [];
      setNexusLeituras(mat.length);

      if (mat.length < 3) return;

      const leituras: LeituraTemperatura[] = mat.map((p: any) => ({
        tempo_h: p.tempo_h,
        temperatura_C: p[canalNexus] ?? p.ch1 ?? 0,
      }));

      const result = executarThermoCore({
        leituras,
        Ea_J_mol: Ea,
        calibracao: cal,
        fck28_MPa: fck28,
        s_ceb: sCeb,
        relacaoAc,
        T_superficie_C: tSuperficie ?? undefined,
      });
      setResultado(result);
      setErro(null);
    } catch {
      setNexusStatus("offline");
    }
  }, [Ea, cal, fck28, sCeb, relacaoAc, tSuperficie, canalNexus]);

  // ── Polling NEXUS (3s) ──
  useEffect(() => {
    if (modo === "nexus" && liveAtivo) {
      fetchNexus(); // imediato
      intervalRef.current = setInterval(fetchNexus, 3000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [modo, liveAtivo, fetchNexus]);

  // Processar (modo simulação)
  function processar() {
    setErro(null);
    try {
      const leituras = gerarLeiturasDemo(tLanc, tPico, tFinal, duracao);
      const result = executarThermoCore({
        leituras,
        Ea_J_mol: Ea,
        calibracao: cal,
        fck28_MPa: fck28,
        s_ceb: sCeb,
        relacaoAc,
        T_superficie_C: tSuperficie ?? undefined,
      });
      setResultado(result);
    } catch (e: any) {
      setErro(e.message ?? "Erro desconhecido");
    }
  }

  // Curva teórica (para sobreposição)
  const curvaTeórica = useMemo(() => {
    return gerarCurvaMaturidade(cal, fck28, sCeb, 672, 50);
  }, [cal, fck28, sCeb]);

  // Dados para gráfico T(t)
  const dadosTemperatura = resultado?.curva.map((p) => ({
    t: p.tempo_h,
    "T concreto (°C)": p.temperatura_C,
  })) ?? [];

  // Dados para gráfico fck(te)
  const dadosFck = resultado?.curva
    .filter((p) => p.te_h > 0)
    .map((p) => ({
      te: Number(p.te_h.toFixed(1)),
      "fck calibrado": p.fck_pred_MPa,
      "fck CEB-FIP": p.fck_ceb_MPa,
    })) ?? [];

  const des = resultado?.desforma;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 font-mono">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-500">
            ThermoCore — Maturidade ao Vivo
          </h1>
          <p className="mt-1 text-[9px] text-slate-600">
            Nurse-Saul + Arrhenius + FHP | ASTM C1074-19 | CEB-FIP MC90
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => { setModo("simulacao"); setLiveAtivo(false); }}
            className={`rounded px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] transition ${
              modo === "simulacao"
                ? "bg-amber-600/20 text-amber-400 border border-amber-600/30"
                : "text-slate-600 border border-slate-800 hover:text-slate-400"
            }`}
          >
            Simulação
          </button>
          <button
            onClick={() => setModo("nexus")}
            className={`rounded px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] transition ${
              modo === "nexus"
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                : "text-slate-600 border border-slate-800 hover:text-slate-400"
            }`}
          >
            NEXUS Live
          </button>
        </div>
      </div>

      {/* ── NEXUS Status Bar ── */}
      {modo === "nexus" && (
        <div className="mb-6 flex items-center gap-4 rounded border border-slate-800 bg-slate-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${
              nexusStatus === "gravando" ? "bg-red-500 animate-pulse" :
              nexusStatus === "conectado" ? "bg-emerald-500" : "bg-slate-600"
            }`} />
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
              {nexusStatus === "gravando" ? "GRAVANDO" :
               nexusStatus === "conectado" ? "MQTT OK" : "OFFLINE"}
            </span>
          </div>
          <span className="text-[9px] text-slate-600">
            {nexusLeituras} leituras
          </span>
          <div className="flex items-center gap-2">
            <Field label="Canal">
              <select
                value={canalNexus}
                onChange={(e) => setCanalNexus(e.target.value as any)}
                className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[9px] text-slate-200 focus:border-amber-600 focus:outline-none"
              >
                <option value="ch1">CH1 (Tipo K)</option>
                <option value="ch2">CH2 (Tipo K)</option>
                <option value="ch3">CH3 (Tipo K)</option>
                <option value="ch4">CH4 (Tipo K)</option>
              </select>
            </Field>
          </div>
          <button
            onClick={() => setLiveAtivo(!liveAtivo)}
            className={`ml-auto rounded px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] transition ${
              liveAtivo
                ? "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30"
                : "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30"
            }`}
          >
            {liveAtivo ? "Parar Polling" : "Iniciar Polling"}
          </button>
        </div>
      )}

      {/* ── Config ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Field label="Tipo Cimento">
          <select
            value={tipoCimento}
            onChange={(e) => setTipoCimento(e.target.value)}
            className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-200 focus:border-amber-600 focus:outline-none"
          >
            {TIPOS_CIMENTO.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="fck₂₈ (MPa)">
          <NumInput value={fck28} onChange={setFck28} min={15} max={120} step={5} />
        </Field>

        <Field label="a/c">
          <NumInput value={relacaoAc} onChange={setRelacaoAc} min={0.20} max={0.80} step={0.01} />
        </Field>

        <Field label="Ea (J/mol)">
          <div className="rounded border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-[10px] text-slate-400">
            {Ea.toLocaleString()}
          </div>
        </Field>
      </div>

      {/* ── Simulação inputs (só no modo simulação) ── */}
      {modo === "simulacao" && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Field label="T lançamento (°C)">
              <NumInput value={tLanc} onChange={setTLanc} min={5} max={45} />
            </Field>
            <Field label="T pico (°C)">
              <NumInput value={tPico} onChange={setTPico} min={30} max={90} />
            </Field>
            <Field label="T final (°C)">
              <NumInput value={tFinal} onChange={setTFinal} min={10} max={50} />
            </Field>
            <Field label="Duração (h)">
              <NumInput value={duracao} onChange={setDuracao} min={24} max={720} step={24} />
            </Field>
            <Field label="T superfície (°C)">
              <NumInput
                value={tSuperficie ?? 0}
                onChange={(v) => setTSuperficie(v === 0 ? null : v)}
                min={0}
                max={60}
              />
            </Field>
          </div>

          <button
            onClick={processar}
            className="mb-8 rounded border border-amber-600/30 bg-amber-600/10 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400 transition hover:bg-amber-600/20"
          >
            Processar Maturidade
          </button>
        </>
      )}

      {erro && (
        <div className="mb-6 rounded border border-rose-800 bg-rose-900/20 px-4 py-3 text-[10px] text-rose-300">
          {erro}
        </div>
      )}

      {/* ── KPI Cards ── */}
      {resultado && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard
              label="Idade Equiv. (t_e)"
              value={`${resultado.te_final_h.toFixed(1)} h`}
              accent="amber"
            />
            <KpiCard
              label="fck Predito"
              value={`${resultado.fck_final_MPa.toFixed(1)} MPa`}
              accent="emerald"
            />
            <KpiCard
              label="Maturidade N-S"
              value={`${resultado.maturidade_final_Ch.toFixed(0)} °C·h`}
              accent="sky"
            />
            <KpiCard
              label="α_max (Powers)"
              value={resultado.alphaMax.toFixed(3)}
              accent="violet"
            />
            <KpiCard
              label="Desforma"
              value={des?.liberado ? "LIBERADA" : "BLOQUEADA"}
              accent={des?.liberado ? "emerald" : "rose"}
            />
          </div>

          {/* ── Desforma Detalhes ── */}
          {des && (
            <div className="mb-8 rounded border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Critério de Desforma — ACI 207.1R + NBR 6118
              </h3>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <CriterioBadge
                  label={`fck ≥ 70% fck₂₈ (${des.detalhes.fck_alvo_MPa} MPa)`}
                  ok={des.condicao_resistencia}
                  detail={`${des.detalhes.fck_pred_MPa.toFixed(1)} MPa`}
                />
                <CriterioBadge
                  label={`ΔT ≤ ${LIMITE_DELTA_T_C}°C`}
                  ok={des.condicao_deltaT}
                  detail={des.detalhes.deltaT_C != null ? `${des.detalhes.deltaT_C.toFixed(1)}°C` : "N/D"}
                />
                <CriterioBadge
                  label={`T núcleo ≤ ${LIMITE_T_NUCLEO_C}°C`}
                  ok={des.condicao_T_nucleo}
                  detail={`${des.detalhes.T_nucleo_C.toFixed(1)}°C`}
                />
                <CriterioBadge
                  label="t_e ≥ t_e_min"
                  ok={des.condicao_te_min}
                  detail={des.detalhes.te_min_h != null ? `${des.detalhes.te_h.toFixed(1)} / ${des.detalhes.te_min_h} h` : "Sem restrição"}
                />
              </div>
            </div>
          )}

          {/* ── Gráfico T(t) ── */}
          <div className="mb-8 rounded border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Temperatura × Tempo
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dadosTemperatura}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 9, fill: "#64748b", fontFamily: "IBM Plex Mono" }}
                  label={{ value: "Tempo (h)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#475569" }}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  label={{ value: "°C", angle: -90, position: "insideLeft", fontSize: 9, fill: "#475569" }}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={LIMITE_T_NUCLEO_C} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "70°C NBR", fill: "#ef4444", fontSize: 8 }} />
                <Line
                  type="monotone"
                  dataKey="T concreto (°C)"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Gráfico fck(te) ── */}
          <div className="mb-8 rounded border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Resistência × Idade Equivalente
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dadosFck}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis
                  dataKey="te"
                  tick={{ fontSize: 9, fill: "#64748b", fontFamily: "IBM Plex Mono" }}
                  label={{ value: "t_e (h)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#475569" }}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  label={{ value: "MPa", angle: -90, position: "insideLeft", fontSize: 9, fill: "#475569" }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 9, fontFamily: "IBM Plex Mono" }} />
                <ReferenceLine
                  y={fck28 * 0.70}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: `70% fck₂₈ = ${(fck28 * 0.70).toFixed(0)} MPa`, fill: "#f59e0b", fontSize: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="fck calibrado"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="fck calibrado (Su/τ/β)"
                />
                <Line
                  type="monotone"
                  dataKey="fck CEB-FIP"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="fck CEB-FIP MC90"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Calibração utilizada ── */}
          <div className="rounded border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Parâmetros de Cálculo
            </h3>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
              <ParamBadge label="Su" value={`${cal.Su_MPa} MPa`} />
              <ParamBadge label="τ" value={`${cal.tau_h} h`} />
              <ParamBadge label="β" value={cal.beta.toFixed(2)} />
              <ParamBadge label="Ea" value={`${Ea / 1000} kJ/mol`} />
              <ParamBadge label="s (CEB)" value={sCeb.toFixed(2)} />
              <ParamBadge label="T₀ (N-S)" value={`${T_DATUM_CELSIUS}°C`} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[8px] font-bold uppercase tracking-[0.15em] text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-200 focus:border-amber-600 focus:outline-none"
    />
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "amber" | "emerald" | "sky" | "rose" | "violet";
}) {
  const colors: Record<string, string> = {
    amber:   "border-amber-600/30 text-amber-400",
    emerald: "border-emerald-600/30 text-emerald-400",
    sky:     "border-sky-600/30 text-sky-400",
    rose:    "border-rose-600/30 text-rose-400",
    violet:  "border-violet-600/30 text-violet-400",
  };
  return (
    <div className={`rounded border bg-slate-900/50 px-3 py-2.5 ${colors[accent]?.split(" ")[0] ?? ""}`}>
      <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-600">{label}</p>
      <p className={`mt-0.5 text-[13px] font-bold ${colors[accent]?.split(" ")[1] ?? "text-slate-200"}`}>
        {value}
      </p>
    </div>
  );
}

function CriterioBadge({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div
      className={`rounded border px-3 py-2 ${
        ok
          ? "border-emerald-800/50 bg-emerald-900/10"
          : "border-rose-800/50 bg-rose-900/10"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
        <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-500">
          {ok ? "OK" : "FALHA"}
        </span>
      </div>
      <p className="mt-1 text-[9px] text-slate-400">{label}</p>
      <p className={`text-[10px] font-bold ${ok ? "text-emerald-400" : "text-rose-400"}`}>{detail}</p>
    </div>
  );
}

function ParamBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/30 px-2 py-1.5 text-center">
      <p className="text-[7px] font-bold uppercase tracking-[0.15em] text-slate-600">{label}</p>
      <p className="text-[10px] font-bold text-slate-300">{value}</p>
    </div>
  );
}
