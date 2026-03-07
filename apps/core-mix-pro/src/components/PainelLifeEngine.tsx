"use client";

/**
 * @file components/PainelLifeEngine.tsx
 * @description Painel LifeEngine — Vida Util Probabilistica + VPL
 *
 * Secoes:
 *   1. Inputs (variaveis estocasticas + Monte Carlo)
 *   2. KPI Cards (media, P5/P50/P95, Pf, beta, conformidade)
 *   3. Curva Pf(t) + beta(t)
 *   4. Histograma de vida util
 *   5. Comparativo VPL cenarios
 */

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
  Cell,
} from "recharts";

import {
  executarLifeEngine,
  BETA_ALVO,
  C_CRIT_DEFAULT,
  TAXA_DESCONTO_DEFAULT,
  CUSTOS_INTERVENCAO,
  type ResultadoLifeEngine,
} from "../lib/lifeengine";

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
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(4) : p.value}
        </p>
      ))}
    </div>
  );
}

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
  label, valor, unidade, destaque, cor,
}: {
  label: string; valor: string | number; unidade: string; destaque?: boolean; cor?: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${destaque ? "border-amber-600/50 bg-amber-950/30" : "border-slate-700 bg-slate-800/50"}`}>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`font-mono text-lg font-bold ${cor ?? (destaque ? "text-amber-400" : "text-slate-100")}`}>
        {valor}
        <span className="ml-1 text-[10px] font-normal text-slate-500">{unidade}</span>
      </p>
    </div>
  );
}

function ConformidadeBadge({ conforme, beta }: { conforme: boolean; beta: number }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${conforme ? "border-green-800 bg-green-950/30" : "border-red-800 bg-red-950/30"}`}>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">Conformidade fib MC2010</p>
      <p className={`font-mono text-lg font-bold ${conforme ? "text-green-400" : "text-red-400"}`}>
        {conforme ? "CONFORME" : "NAO CONFORME"}
      </p>
      <p className="text-[8px] text-slate-600">
        beta = {beta} {conforme ? ">=" : "<"} {BETA_ALVO} (alvo RC2)
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function PainelLifeEngine() {
  // Variaveis estocasticas
  const [D28_mean, setD28Mean] = useState(5e-12);
  const [D28_cov, setD28Cov] = useState(0.25);
  const [Cs_mean, setCsMean] = useState(0.6);
  const [Cs_cov, setCsCov] = useState(0.20);
  const [cob_mean_mm, setCobMean] = useState(40);
  const [cob_cov, setCobCov] = useState(0.12);
  const [cob_bias_mm, setCobBias] = useState(-2);
  const [m_mean, setMMean] = useState(0.30);
  const [m_cov, setMCov] = useState(0.10);
  const [Kc_mean, setKcMean] = useState(4.0);
  const [Kc_cov, setKcCov] = useState(0.20);
  const [comCarbonatacao, setComCarbonatacao] = useState(true);

  // Params Monte Carlo
  const [N, setN] = useState(5000);
  const [seed, setSeed] = useState(42);
  const [vidaProjeto, setVidaProjeto] = useState(50);
  const [tPropagacao, setTPropagacao] = useState(10);

  // Resultado
  const [resultado, setResultado] = useState<ResultadoLifeEngine | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  function processar() {
    setErro(null);
    setProcessando(true);
    try {
      const r = executarLifeEngine({
        variaveis: {
          D28_mean,
          D28_cov,
          Cs_mean,
          Cs_cov,
          cob_mean_mm,
          cob_cov,
          cob_bias_mm,
          m_mean,
          m_cov,
          Kc_mean: comCarbonatacao ? Kc_mean : undefined,
          Kc_cov: comCarbonatacao ? Kc_cov : undefined,
        },
        monteCarlo: { N, seed, vidaProjeto_anos: vidaProjeto, tPropagacao_anos: tPropagacao },
      });
      setResultado(r);
    } catch (e: any) {
      setErro(e.message ?? "Erro desconhecido");
    } finally {
      setProcessando(false);
    }
  }

  const est = resultado?.estatisticas;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <h1 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-amber-500">
          LifeEngine
        </h1>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Vida Util Probabilistica | Tuutti (1982) + Monte Carlo + VPL
        </p>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* ─────────────── INPUTS ─────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Coluna 1 — Cloretos */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Difusao — Cloretos
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Field label="D28 medio (m2/s)">
                <NumInput value={D28_mean} onChange={setD28Mean} min={1e-14} max={1e-9} step={1e-12} />
              </Field>
              <Field label="CoV D28">
                <NumInput value={D28_cov} onChange={setD28Cov} min={0.05} max={1} step={0.05} />
              </Field>
              <Field label="Cs medio (%)">
                <NumInput value={Cs_mean} onChange={setCsMean} min={0.1} max={5} step={0.1} />
              </Field>
              <Field label="CoV Cs">
                <NumInput value={Cs_cov} onChange={setCsCov} min={0.05} max={1} step={0.05} />
              </Field>
              <Field label="m medio (envelh.)">
                <NumInput value={m_mean} onChange={setMMean} min={0.05} max={0.8} step={0.05} />
              </Field>
              <Field label="CoV m">
                <NumInput value={m_cov} onChange={setMCov} min={0.05} max={0.5} step={0.05} />
              </Field>
            </div>
          </div>

          {/* Coluna 2 — Cobrimento + Carbonatacao */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cobrimento + Carbonatacao
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cobrimento medio (mm)">
                <NumInput value={cob_mean_mm} onChange={setCobMean} min={10} max={200} step={5} />
              </Field>
              <Field label="CoV cobrimento">
                <NumInput value={cob_cov} onChange={setCobCov} min={0.05} max={0.5} step={0.05} />
              </Field>
              <Field label="Bias cobrimento (mm)">
                <NumInput value={cob_bias_mm} onChange={setCobBias} min={-20} max={10} step={1} />
              </Field>
              <Field label="">
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={comCarbonatacao}
                    onChange={(e) => setComCarbonatacao(e.target.checked)}
                    className="accent-amber-600"
                  />
                  <span className="text-[10px] text-slate-400">Incluir carbonatacao</span>
                </label>
              </Field>
            </div>
            {comCarbonatacao && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kc medio (mm/raiz(ano))">
                  <NumInput value={Kc_mean} onChange={setKcMean} min={0.5} max={20} step={0.5} />
                </Field>
                <Field label="CoV Kc">
                  <NumInput value={Kc_cov} onChange={setKcCov} min={0.05} max={1} step={0.05} />
                </Field>
              </div>
            )}
          </div>

          {/* Coluna 3 — Monte Carlo */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Monte Carlo + Projeto
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Field label="N simulacoes">
                <NumInput value={N} onChange={setN} min={100} max={100000} step={500} />
              </Field>
              <Field label="Seed (RNG)">
                <NumInput value={seed} onChange={setSeed} min={1} max={999999} step={1} />
              </Field>
              <Field label="Vida projeto (anos)">
                <NumInput value={vidaProjeto} onChange={setVidaProjeto} min={10} max={200} step={5} />
              </Field>
              <Field label="t propagacao (anos)">
                <NumInput value={tPropagacao} onChange={setTPropagacao} min={1} max={30} step={1} />
              </Field>
            </div>

            <button
              onClick={processar}
              disabled={processando}
              className="mt-2 w-full rounded bg-amber-600 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              {processando ? "Processando..." : "Executar Analise"}
            </button>
          </div>
        </div>

        {/* ERRO */}
        {erro && (
          <div className="rounded border border-red-800 bg-red-950/40 px-4 py-2 text-[11px] text-red-400">
            {erro}
          </div>
        )}

        {/* ─────────────── RESULTADOS ─────────────── */}
        {est && resultado && (
          <>
            {/* KPI CARDS */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <KpiCard label="Media" valor={est.media_anos} unidade="anos" destaque />
              <KpiCard label="P5" valor={est.p5_anos} unidade="anos" />
              <KpiCard label="P50 (mediana)" valor={est.p50_anos} unidade="anos" />
              <KpiCard label="P95" valor={est.p95_anos} unidade="anos" />
              <KpiCard label="Desvio padrao" valor={est.desvio_anos} unidade="anos" />
              <KpiCard
                label="Pf (projeto)"
                valor={(est.Pf_projeto * 100).toFixed(2)}
                unidade="%"
                cor={est.Pf_projeto > 0.067 ? "text-red-400" : "text-green-400"}
              />
              <ConformidadeBadge conforme={est.conforme} beta={est.beta_projeto} />
            </div>

            {/* GRAFICOS */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Curva Pf(t) */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Curva Pf(t) — Probabilidade de Falha
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={resultado.curvaPf}>
                    <CartesianGrid stroke="#1e293b" />
                    <XAxis
                      dataKey="idade_anos"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "Idade (anos)", fontSize: 9, fill: "#64748b", position: "insideBottom", offset: -2 }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "Pf", fontSize: 9, fill: "#64748b", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <ReferenceLine y={0.067} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "Pf alvo (6.7%)", fontSize: 8, fill: "#ef4444" }} />
                    <ReferenceLine x={vidaProjeto} stroke="#f59e0b" strokeDasharray="6 3" label={{ value: `VP ${vidaProjeto}a`, fontSize: 8, fill: "#f59e0b" }} />
                    <Line type="monotone" dataKey="Pf_combinada" name="Pf combinada" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Pf_cloretos" name="Pf cloretos" stroke="#3b82f6" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Pf_carbonatacao" name="Pf carbonat." stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Curva beta(t) */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Indice de Confiabilidade beta(t)
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={resultado.curvaPf}>
                    <CartesianGrid stroke="#1e293b" />
                    <XAxis
                      dataKey="idade_anos"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "Idade (anos)", fontSize: 9, fill: "#64748b", position: "insideBottom", offset: -2 }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "beta", fontSize: 9, fill: "#64748b", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={BETA_ALVO} stroke="#ef4444" strokeDasharray="6 3" label={{ value: `beta alvo = ${BETA_ALVO}`, fontSize: 8, fill: "#ef4444" }} />
                    <ReferenceLine x={vidaProjeto} stroke="#f59e0b" strokeDasharray="6 3" />
                    <Line type="monotone" dataKey="beta" name="beta" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Histograma */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Histograma — Distribuicao de Vida Util
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={resultado.histograma}>
                    <CartesianGrid stroke="#1e293b" />
                    <XAxis
                      dataKey="faixa"
                      tick={{ fontSize: 8, fill: "#64748b" }}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      label={{ value: "Faixa (anos)", fontSize: 9, fill: "#64748b", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "Contagem", fontSize: 9, fill: "#64748b", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="contagem" name="Contagem" fill="#f59e0b" radius={[2, 2, 0, 0]}>
                      {resultado.histograma.map((_, i) => (
                        <Cell key={i} fill={i < Math.ceil(resultado.histograma.length * 0.3) ? "#ef4444" : "#f59e0b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* VPL Cenarios */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  VPL — Custo do Ciclo de Vida (R$/m2)
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={resultado.vpl.map((v) => ({
                      nome: v.nome.split(" — ")[0],
                      "Custo Inicial": v.custoInicial_Rm2,
                      "VP Intervencoes": v.vpIntervencoes_Rm2,
                      VPL: v.vpl_Rm2,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid stroke="#1e293b" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      label={{ value: "R$/m2", fontSize: 9, fill: "#64748b", position: "insideBottom", offset: -2 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      width={80}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="Custo Inicial" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="VP Intervencoes" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>

                {/* Tabela detalhada VPL */}
                <div className="mt-3 space-y-1">
                  {resultado.vpl.map((v, i) => (
                    <div key={i} className="flex items-center justify-between rounded border border-slate-700/50 px-3 py-1.5 text-[10px]">
                      <span className="text-slate-400 truncate max-w-[200px]">{v.nome}</span>
                      <span className="font-mono font-bold text-amber-400">
                        R$ {v.vpl_Rm2.toFixed(2)}/m2
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PARAMETROS UTILIZADOS */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Parametros da Simulacao
              </h3>
              <div className="flex flex-wrap gap-4 text-[10px] text-slate-500">
                <span>N = {resultado.params.N.toLocaleString()}</span>
                <span>seed = {resultado.params.seed}</span>
                <span>Vida projeto = {resultado.params.vidaProjeto_anos} anos</span>
                <span>t propagacao = {resultado.params.tPropagacao_anos} anos</span>
                <span>beta alvo = {BETA_ALVO} (fib MC2010 RC2)</span>
                <span>C_crit = {C_CRIT_DEFAULT}%</span>
                <span>Taxa desconto = {(TAXA_DESCONTO_DEFAULT * 100).toFixed(1)}% a.a.</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
