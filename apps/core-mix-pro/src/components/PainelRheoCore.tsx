"use client";

/**
 * @file components/PainelRheoCore.tsx
 * @description Painel de Reometria RheoCore — τ₀, μ_p, correlações, perda de trabalhabilidade
 *
 * Seções:
 *   1. Configuração da geometria (k_motor, raio, RPM)
 *   2. Modo simulação ou NEXUS
 *   3. KPI Cards (τ₀, μ_p, Slump, Flow, classe)
 *   4. Gráfico τ(t) — evolução temporal
 *   5. Gráfico η_ap(t) — viscosidade aparente
 *   6. Correlações empíricas e classificação
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
  executarRheoCore,
  GEOMETRIA_DEFAULT,
  FAIXAS_TAU0,
  type LeituraAmperagem,
  type ResultadoRheoCore,
  type ConfigGeometria,
  type ClasseReologica,
} from "../lib/rheocore";

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP
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
// GERADOR DE LEITURAS DEMO — perda de trabalhabilidade simulada
// ─────────────────────────────────────────────────────────────────────────────

function gerarLeiturasDemo(
  I_inicial: number,
  I_final: number,
  duracao_min: number,
  nPontos: number,
): LeituraAmperagem[] {
  const leituras: LeituraAmperagem[] = [];
  const dt = (duracao_min * 60) / (nPontos - 1);
  for (let i = 0; i < nPontos; i++) {
    const t = i * dt;
    const frac = t / (duracao_min * 60);
    // Crescimento exponencial suave (simulando pega)
    const I = I_inicial + (I_final - I_inicial) * (1 - Math.exp(-3 * frac));
    leituras.push({
      tempo_s: Math.round(t),
      amperagem_A: Math.round(I * 100) / 100,
    });
  }
  return leituras;
}

// ─────────────────────────────────────────────────────────────────────────────
// LABELS DE CLASSE
// ─────────────────────────────────────────────────────────────────────────────

const CLASSE_LABELS: Record<ClasseReologica, { label: string; color: string }> = {
  FLUIDO: { label: "Fluido / Graute",  color: "#06b6d4" }, // cyan
  UHPC:   { label: "UHPC",             color: "#8b5cf6" }, // violet
  CAA_3:  { label: "CAA SF3",          color: "#22c55e" }, // green
  CAA_2:  { label: "CAA SF2",          color: "#84cc16" }, // lime
  CAA_1:  { label: "CAA SF1",          color: "#eab308" }, // yellow
  CCV:    { label: "CCV (vibrado)",    color: "#f97316" }, // orange
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function NumInput({
  value, onChange, min, max, step,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min} max={max} step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-100 outline-none focus:border-amber-600"
    />
  );
}

function KpiCard({
  label, valor, unidade, destaque,
}: {
  label: string; valor: string | number; unidade: string; destaque?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${destaque ? "border-amber-600/50 bg-amber-950/30" : "border-slate-700 bg-slate-800/50"}`}>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`font-mono text-lg font-bold ${destaque ? "text-amber-400" : "text-slate-100"}`}>
        {valor}
        <span className="ml-1 text-[10px] font-normal text-slate-500">{unidade}</span>
      </p>
    </div>
  );
}

function CorrelacaoCard({
  label, valor, unidade, dominio,
}: {
  label: string; valor: number | null; unidade: string; dominio: string;
}) {
  return (
    <div className="rounded border border-slate-700 bg-slate-800/30 px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      {valor !== null ? (
        <p className="font-mono text-sm font-bold text-slate-100">
          {valor} <span className="text-[10px] font-normal text-slate-500">{unidade}</span>
        </p>
      ) : (
        <p className="text-[10px] italic text-slate-600">Fora do dominio</p>
      )}
      <p className="text-[8px] text-slate-600">{dominio}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function PainelRheoCore() {
  // Modo
  const [modo, setModo] = useState<"simulacao" | "nexus">("simulacao");

  // Geometria
  const [kMotor, setKMotor] = useState(GEOMETRIA_DEFAULT.k_motor_NmA);
  const [raioInt, setRaioInt] = useState(GEOMETRIA_DEFAULT.raio_int_m * 1000); // mm
  const [raioExt, setRaioExt] = useState(GEOMETRIA_DEFAULT.raio_ext_m * 1000); // mm
  const [altura, setAltura] = useState(GEOMETRIA_DEFAULT.altura_m * 1000);     // mm
  const [rpm, setRpm] = useState(GEOMETRIA_DEFAULT.rpm);

  // Simulação
  const [iInicial, setIInicial] = useState(2.0);
  const [iFinal, setIFinal] = useState(4.5);
  const [duracaoMin, setDuracaoMin] = useState(120);
  const [nPontos, setNPontos] = useState(20);

  // Resultado
  const [resultado, setResultado] = useState<ResultadoRheoCore | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // NEXUS Live
  const [nexusStatus, setNexusStatus] = useState<"offline" | "conectado" | "gravando">("offline");
  const [nexusLeituras, setNexusLeituras] = useState(0);
  const [liveAtivo, setLiveAtivo] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Geometria config
  const geometria: Partial<ConfigGeometria> = useMemo(() => ({
    k_motor_NmA: kMotor,
    raio_int_m: raioInt / 1000,
    raio_ext_m: raioExt / 1000,
    altura_m: altura / 1000,
    rpm,
  }), [kMotor, raioInt, raioExt, altura, rpm]);

  // ── Fetch NEXUS reologia ──
  const fetchNexus = useCallback(async () => {
    try {
      const res = await fetch("/api/nexus", { cache: "no-store" });
      if (!res.ok) { setNexusStatus("offline"); return; }
      const data = await res.json();

      if (data._gravando) setNexusStatus("gravando");
      else if (data._mqtt_conectado) setNexusStatus("conectado");
      else setNexusStatus("offline");

      const reo = data.reologia ?? [];
      setNexusLeituras(reo.length);

      if (reo.length < 3) return;

      const leituras: LeituraAmperagem[] = reo.map((p: any) => ({
        tempo_s: p.tempo_s ?? 0,
        amperagem_A: p.amperagem ?? 0,
      }));

      const result = executarRheoCore({ leituras, geometria });
      setResultado(result);
      setErro(null);
    } catch {
      setNexusStatus("offline");
    }
  }, [geometria]);

  // ── Polling NEXUS (3s) ──
  useEffect(() => {
    if (modo === "nexus" && liveAtivo) {
      fetchNexus();
      intervalRef.current = setInterval(fetchNexus, 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [modo, liveAtivo, fetchNexus]);

  // Processar (modo simulação)
  function processar() {
    setErro(null);
    try {
      const leituras = gerarLeiturasDemo(iInicial, iFinal, duracaoMin, nPontos);
      const result = executarRheoCore({ leituras, geometria });
      setResultado(result);
    } catch (e: any) {
      setErro(e.message ?? "Erro desconhecido");
      setResultado(null);
    }
  }

  // ── Dados dos gráficos ──
  const dadosTau = useMemo(() => {
    if (!resultado) return [];
    return resultado.evolucao.map((p) => ({
      tempo: p.tempo_min,
      tau: p.tau_Pa,
      eta: p.eta_ap_Pas,
      torque: p.torque_Nm,
    }));
  }, [resultado]);

  // Classe visual
  const classeInfo = resultado ? CLASSE_LABELS[resultado.classe] : null;

  // ── NEXUS status color ──
  const nexusColor = nexusStatus === "gravando"
    ? "bg-green-500" : nexusStatus === "conectado"
    ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight text-amber-500">
              RHEOCORE
            </h1>
            <p className="text-[10px] text-slate-500">
              Reometria Rotacional — ADS1115 Amperagem &rarr; Bingham &rarr; Correlacoes
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 rounded-lg border border-slate-700 p-0.5">
            <button
              onClick={() => setModo("simulacao")}
              className={`rounded px-3 py-1 font-mono text-[10px] transition ${
                modo === "simulacao"
                  ? "bg-amber-600 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Simulacao
            </button>
            <button
              onClick={() => setModo("nexus")}
              className={`rounded px-3 py-1 font-mono text-[10px] transition ${
                modo === "nexus"
                  ? "bg-amber-600 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              NEXUS
            </button>
          </div>
        </div>

        {/* NEXUS status bar */}
        {modo === "nexus" && (
          <div className="mb-4 flex items-center gap-3 rounded border border-slate-700 bg-slate-900 px-3 py-2">
            <div className={`h-2 w-2 rounded-full ${nexusColor}`} />
            <span className="font-mono text-[10px] text-slate-400">
              {nexusStatus === "gravando" ? "NEXUS gravando" : nexusStatus === "conectado" ? "NEXUS conectado" : "NEXUS offline"}
            </span>
            <span className="font-mono text-[10px] text-slate-600">
              {nexusLeituras} leituras reologia
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setLiveAtivo(!liveAtivo)}
              className={`rounded px-3 py-0.5 font-mono text-[10px] transition ${
                liveAtivo ? "bg-green-700 text-white" : "border border-slate-600 text-slate-400"
              }`}
            >
              {liveAtivo ? "LIVE ON" : "LIVE OFF"}
            </button>
          </div>
        )}

        {/* CONFIG + INPUTS */}
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <Field label="k_motor (N.m/A)">
            <NumInput value={kMotor} onChange={setKMotor} min={0.01} max={10} step={0.01} />
          </Field>
          <Field label="R_int (mm)">
            <NumInput value={raioInt} onChange={setRaioInt} min={5} max={200} step={1} />
          </Field>
          <Field label="R_ext (mm)">
            <NumInput value={raioExt} onChange={setRaioExt} min={10} max={500} step={1} />
          </Field>
          <Field label="Altura (mm)">
            <NumInput value={altura} onChange={setAltura} min={10} max={500} step={1} />
          </Field>
          <Field label="RPM">
            <NumInput value={rpm} onChange={setRpm} min={10} max={10000} step={10} />
          </Field>

          {modo === "simulacao" && (
            <>
              <Field label="I_inicial (A)">
                <NumInput value={iInicial} onChange={setIInicial} min={0} max={20} step={0.1} />
              </Field>
              <Field label="I_final (A)">
                <NumInput value={iFinal} onChange={setIFinal} min={0} max={20} step={0.1} />
              </Field>
              <Field label="Duracao (min)">
                <NumInput value={duracaoMin} onChange={setDuracaoMin} min={5} max={600} step={5} />
              </Field>
              <Field label="N pontos">
                <NumInput value={nPontos} onChange={setNPontos} min={5} max={200} step={1} />
              </Field>
            </>
          )}
        </div>

        {/* PROCESSAR BUTTON */}
        {modo === "simulacao" && (
          <button
            onClick={processar}
            className="mb-4 rounded bg-amber-600 px-6 py-2 font-mono text-[11px] font-bold text-white transition hover:bg-amber-500"
          >
            PROCESSAR
          </button>
        )}

        {/* ERRO */}
        {erro && (
          <div className="mb-4 rounded border border-red-800 bg-red-950/50 px-3 py-2 font-mono text-[10px] text-red-400">
            {erro}
          </div>
        )}

        {/* RESULTADOS */}
        {resultado && (
          <>
            {/* KPI CARDS */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <KpiCard
                label="Tensao Escoamento"
                valor={resultado.bingham.tau0_Pa.toFixed(1)}
                unidade="Pa"
                destaque
              />
              <KpiCard
                label="Viscosidade Plastica"
                valor={resultado.bingham.mu_p_Pas.toFixed(2)}
                unidade="Pa.s"
                destaque
              />
              <KpiCard
                label="Taxa Perda"
                valor={resultado.perda.taxaCrescimento_PaMin.toFixed(1)}
                unidade="Pa/min"
              />
              <KpiCard
                label="Variacao Total"
                valor={resultado.perda.variacaoRelativa_pct.toFixed(1)}
                unidade="%"
              />
              <KpiCard
                label="Tempo p/ dobra"
                valor={resultado.perda.tempoDobraTau_min?.toFixed(0) ?? "—"}
                unidade="min"
              />
              <div className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                <div className="text-center">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Classe</p>
                  <p
                    className="font-mono text-sm font-bold"
                    style={{ color: classeInfo?.color ?? "#94a3b8" }}
                  >
                    {classeInfo?.label ?? resultado.classe}
                  </p>
                </div>
              </div>
            </div>

            {/* CORRELAÇÕES */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <CorrelacaoCard
                label="Slump Estimado"
                valor={resultado.correlacoes.slump_mm}
                unidade="mm"
                dominio="Roussel 2006 | 50-1100 Pa"
              />
              <CorrelacaoCard
                label="Flow Estimado"
                valor={resultado.correlacoes.flow_mm}
                unidade="mm"
                dominio="Roussel & Coussot 2005 | SCC"
              />
              <CorrelacaoCard
                label="T500 Estimado"
                valor={resultado.correlacoes.t500_s}
                unidade="s"
                dominio="Wallevik 2006 | 10-80 Pa.s"
              />
              <CorrelacaoCard
                label="Marsh Estimado"
                valor={resultado.correlacoes.marsh_s}
                unidade="s"
                dominio="de Larrard 1998 | 0.5-30 Pa.s"
              />
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* τ(t) */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <h3 className="mb-2 font-mono text-[11px] font-bold text-slate-400">
                  Tensao de Cisalhamento — tau(t)
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dadosTau}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="tempo"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "Tempo (min)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#64748b" }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "tau (Pa)", angle: -90, position: "insideLeft", fontSize: 9, fill: "#64748b" }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={24}
                      wrapperStyle={{ fontSize: 9 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tau"
                      name="tau (Pa)"
                      stroke="#d97706"
                      dot={false}
                      strokeWidth={2}
                    />
                    {/* Faixa τ₀ CCV (500 Pa) */}
                    <ReferenceLine
                      y={500}
                      stroke="#f97316"
                      strokeDasharray="6 3"
                      label={{ value: "CCV 500Pa", position: "right", fontSize: 8, fill: "#f97316" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* η_ap(t) */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <h3 className="mb-2 font-mono text-[11px] font-bold text-slate-400">
                  Viscosidade Aparente — eta_ap(t)
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dadosTau}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="tempo"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "Tempo (min)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#64748b" }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "eta_ap (Pa.s)", angle: -90, position: "insideLeft", fontSize: 9, fill: "#64748b" }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={24}
                      wrapperStyle={{ fontSize: 9 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="eta"
                      name="eta_ap (Pa.s)"
                      stroke="#8b5cf6"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BINGHAM PARAMS + PERDA INFO */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <h3 className="mb-2 font-mono text-[11px] font-bold text-slate-400">
                  Parametros Bingham
                </h3>
                <div className="space-y-1 font-mono text-[10px]">
                  <p className="text-slate-300">
                    tau_0 = <span className="text-amber-400">{resultado.bingham.tau0_Pa.toFixed(2)} Pa</span>
                  </p>
                  <p className="text-slate-300">
                    mu_p = <span className="text-amber-400">{resultado.bingham.mu_p_Pas.toFixed(4)} Pa.s</span>
                  </p>
                  <p className="text-slate-300">
                    R2 = <span className={resultado.bingham.r2 > 0.9 ? "text-green-400" : resultado.bingham.r2 > 0 ? "text-amber-400" : "text-slate-600"}>
                      {resultado.bingham.r2 > 0 ? resultado.bingham.r2.toFixed(4) : "estimativa single-speed"}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Pontos: {resultado.bingham.nPontos}
                  </p>
                  {resultado.herschelBulkley && (
                    <>
                      <hr className="my-2 border-slate-700" />
                      <p className="text-[9px] uppercase text-slate-500">Herschel-Bulkley</p>
                      <p className="text-slate-300">
                        K = <span className="text-violet-400">{resultado.herschelBulkley.K_Pasn.toFixed(4)} Pa.s^n</span>
                      </p>
                      <p className="text-slate-300">
                        n = <span className={resultado.herschelBulkley.n < 1 ? "text-cyan-400" : "text-amber-400"}>
                          {resultado.herschelBulkley.n.toFixed(4)}
                        </span>
                        {resultado.herschelBulkley.n < 1 ? " (pseudoplastico)" : " (dilatante)"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <h3 className="mb-2 font-mono text-[11px] font-bold text-slate-400">
                  Perda de Trabalhabilidade
                </h3>
                <div className="space-y-1 font-mono text-[10px]">
                  <p className="text-slate-300">
                    tau_inicial = <span className="text-amber-400">{resultado.perda.tau_inicial_Pa.toFixed(1)} Pa</span>
                  </p>
                  <p className="text-slate-300">
                    tau_final = <span className="text-amber-400">{resultado.perda.tau_final_Pa.toFixed(1)} Pa</span>
                  </p>
                  <p className="text-slate-300">
                    Taxa = <span className={resultado.perda.taxaCrescimento_PaMin > 5 ? "text-red-400" : "text-green-400"}>
                      {resultado.perda.taxaCrescimento_PaMin.toFixed(2)} Pa/min
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Variacao = <span className="text-amber-400">{resultado.perda.variacaoRelativa_pct.toFixed(1)}%</span>
                  </p>
                  <p className="text-slate-300">
                    Tempo p/ dobra = <span className={
                      resultado.perda.tempoDobraTau_min
                        ? resultado.perda.tempoDobraTau_min < 60
                          ? "text-red-400"
                          : "text-green-400"
                        : "text-slate-600"
                    }>
                      {resultado.perda.tempoDobraTau_min
                        ? `${resultado.perda.tempoDobraTau_min.toFixed(0)} min`
                        : "—"}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    R2 reglin = <span className="text-slate-400">{resultado.perda.r2.toFixed(4)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Geometria resumo */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                `k=${resultado.geometria.k_motor_NmA} N.m/A`,
                `Ri=${(resultado.geometria.raio_int_m * 1000).toFixed(0)} mm`,
                `Re=${(resultado.geometria.raio_ext_m * 1000).toFixed(0)} mm`,
                `h=${(resultado.geometria.altura_m * 1000).toFixed(0)} mm`,
                `${resultado.geometria.rpm} RPM`,
              ].map((txt) => (
                <span
                  key={txt}
                  className="rounded border border-slate-700 bg-slate-800/50 px-2 py-0.5 font-mono text-[9px] text-slate-500"
                >
                  {txt}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
