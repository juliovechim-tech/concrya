"use client";

/**
 * @file components/PainelMicroEngine.tsx
 * @description Painel MicroEngine — Microestrutura + Durabilidade
 *
 * Seções:
 *   1. Inputs (a/c, idade, cimento, exposição)
 *   2. KPI Cards (X, fc, porosidade, ITZ)
 *   3. Composição volumétrica (barras)
 *   4. Perfil de cloretos C(x)
 *   5. Evolução de carbonatação x_c(t)
 *   6. Decisões de vida útil
 */

import { useState, useMemo } from "react";
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
  executarMicroEngine,
  M_ENVELHECIMENTO,
  KC_BASE,
  C_CRIT_CLORETOS,
  A_GEL_MPA,
  type ResultadoMicroEngine,
} from "../lib/microengine";

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
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(3) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE CIMENTO
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS_CIMENTO = [
  { value: "CP_V_ARI", label: "CP V-ARI" },
  { value: "CP_II_F",  label: "CP II-F" },
  { value: "CP_II_E",  label: "CP II-E" },
  { value: "CP_III",   label: "CP III" },
  { value: "CP_IV",    label: "CP IV" },
  { value: "LC3",      label: "LC3" },
];

const CLASSES_AGRESSIVIDADE = [
  { value: "I",   label: "I — Rural/Seco" },
  { value: "II",  label: "II — Urbano" },
  { value: "III", label: "III — Maritimo/Industrial" },
  { value: "IV",  label: "IV — Spray marinho/Quimico" },
];

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

function VidaUtilBadge({
  label, tempoDesp, vidaProjeto,
}: {
  label: string; tempoDesp: number | null; vidaProjeto: number;
}) {
  const ok = tempoDesp === null || tempoDesp >= vidaProjeto;
  return (
    <div className={`rounded border px-3 py-2 ${ok ? "border-green-800 bg-green-950/30" : "border-red-800 bg-red-950/30"}`}>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`font-mono text-sm font-bold ${ok ? "text-green-400" : "text-red-400"}`}>
        {tempoDesp !== null ? `${tempoDesp} anos` : "> 200 anos"}
      </p>
      <p className="text-[8px] text-slate-600">
        {ok ? `OK (projeto: ${vidaProjeto} anos)` : `INSUFICIENTE (projeto: ${vidaProjeto} anos)`}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function PainelMicroEngine() {
  // Inputs
  const [relacaoAc, setRelacaoAc] = useState(0.50);
  const [idadeDias, setIdadeDias] = useState(28);
  const [tipoCimento, setTipoCimento] = useState("CP_V_ARI");
  const [vAgregado, setVAgregado] = useState(0.70);
  const [dmaxMm, setDmaxMm] = useState(19);
  const [vidaUtil, setVidaUtil] = useState(50);

  // Exposição
  const [comExposicao, setComExposicao] = useState(true);
  const [classeAgressividade, setClasseAgressividade] = useState<"I" | "II" | "III" | "IV">("II");
  const [cobrimentoMm, setCobrimentoMm] = useState(35);
  const [csPct, setCsPct] = useState(0.6);

  // Resultado
  const [resultado, setResultado] = useState<ResultadoMicroEngine | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function processar() {
    setErro(null);
    try {
      const r = executarMicroEngine({
        relacaoAc,
        idade_dias: idadeDias,
        tipoCimento,
        V_agregado: vAgregado,
        dmax_mm: dmaxMm,
        vidaUtilProjeto_anos: vidaUtil,
        exposicao: comExposicao
          ? { classeAgressividade, cobrimento_mm: cobrimentoMm, Cs_pct: csPct }
          : undefined,
      });
      setResultado(r);
    } catch (e: any) {
      setErro(e.message ?? "Erro desconhecido");
      setResultado(null);
    }
  }

  // Dados composição (barras)
  const dadosComposicao = useMemo(() => {
    if (!resultado) return [];
    const c = resultado.composicao;
    return [
      { nome: "Cim. nao-hid.", valor: c.V_naoHid, cor: "#64748b" },
      { nome: "Gel (C-S-H+)", valor: c.V_gel, cor: "#22c55e" },
      { nome: "Poros capil.", valor: c.V_capilares, cor: "#ef4444" },
    ];
  }, [resultado]);

  // Perfil cloretos
  const dadosCloretos = useMemo(() => {
    if (!resultado?.cloretos) return [];
    return resultado.cloretos.perfil;
  }, [resultado]);

  // Evolução carbonatação
  const dadosCarb = useMemo(() => {
    if (!resultado?.carbonatacao) return [];
    return resultado.carbonatacao.evolucao;
  }, [resultado]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="font-mono text-xl font-bold tracking-tight text-amber-500">
            MICROENGINE
          </h1>
          <p className="text-[10px] text-slate-500">
            Microestrutura — Powers Gel-Space Ratio &middot; ITZ &middot; Difusao Fick &middot; Carbonatacao
          </p>
        </div>

        {/* INPUTS */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <Field label="a/c">
            <NumInput value={relacaoAc} onChange={setRelacaoAc} min={0.20} max={0.80} step={0.01} />
          </Field>
          <Field label="Idade (dias)">
            <NumInput value={idadeDias} onChange={setIdadeDias} min={1} max={36500} step={1} />
          </Field>
          <Field label="Tipo Cimento">
            <select
              value={tipoCimento}
              onChange={(e) => setTipoCimento(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-100 outline-none focus:border-amber-600"
            >
              {TIPOS_CIMENTO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="V_agregado">
            <NumInput value={vAgregado} onChange={setVAgregado} min={0.40} max={0.85} step={0.01} />
          </Field>
          <Field label="d_max (mm)">
            <NumInput value={dmaxMm} onChange={setDmaxMm} min={4.75} max={100} step={0.25} />
          </Field>
          <Field label="Vida Util (anos)">
            <NumInput value={vidaUtil} onChange={setVidaUtil} min={10} max={200} step={5} />
          </Field>
        </div>

        {/* EXPOSIÇÃO */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-[10px] text-slate-400">
            <input
              type="checkbox"
              checked={comExposicao}
              onChange={(e) => setComExposicao(e.target.checked)}
              className="accent-amber-600"
            />
            Incluir analise de durabilidade (cloretos + carbonatacao)
          </label>
          {comExposicao && (
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Classe Agressividade">
                <select
                  value={classeAgressividade}
                  onChange={(e) => setClasseAgressividade(e.target.value as any)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-100 outline-none focus:border-amber-600"
                >
                  {CLASSES_AGRESSIVIDADE.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cobrimento (mm)">
                <NumInput value={cobrimentoMm} onChange={setCobrimentoMm} min={15} max={100} step={5} />
              </Field>
              <Field label="Cs cloretos (%)">
                <NumInput value={csPct} onChange={setCsPct} min={0.1} max={5} step={0.1} />
              </Field>
            </div>
          )}
        </div>

        <button
          onClick={processar}
          className="mb-4 rounded bg-amber-600 px-6 py-2 font-mono text-[11px] font-bold text-white transition hover:bg-amber-500"
        >
          ANALISAR
        </button>

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
                label="Gel-Space Ratio"
                valor={resultado.composicao.gelSpaceRatio.toFixed(3)}
                unidade="X"
                destaque
              />
              <KpiCard
                label="fc (Powers)"
                valor={resultado.fcGelSpace_MPa.toFixed(1)}
                unidade="MPa"
                destaque
              />
              <KpiCard
                label="Porosidade Capilar"
                valor={(resultado.composicao.porosidadeCapilar * 100).toFixed(1)}
                unidade="%"
                cor={resultado.composicao.porosidadeCapilar > 0.15 ? "text-red-400" : "text-green-400"}
              />
              <KpiCard
                label="Alpha (grau hid.)"
                valor={resultado.params.alpha.toFixed(3)}
                unidade=""
              />
              <KpiCard
                label="ITZ Porosidade"
                valor={(resultado.itz.porosidade_ITZ * 100).toFixed(1)}
                unidade="%"
              />
              <KpiCard
                label="m envelhec."
                valor={resultado.params.m_envelhecimento.toFixed(2)}
                unidade=""
              />
            </div>

            {/* VIDA ÚTIL BADGES */}
            {resultado.cloretos && resultado.carbonatacao && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                <VidaUtilBadge
                  label="Cloretos — Despassivacao"
                  tempoDesp={resultado.cloretos.tempoDespassivacao_anos}
                  vidaProjeto={vidaUtil}
                />
                <VidaUtilBadge
                  label="Carbonatacao — Despassivacao"
                  tempoDesp={resultado.carbonatacao.tempoDespassivacao_anos}
                  vidaProjeto={vidaUtil}
                />
                <div className="rounded border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Coef. Difusao D28</p>
                  <p className="font-mono text-sm font-bold text-slate-100">
                    {resultado.cloretos.D28_m2s.toExponential(2)} <span className="text-[10px] text-slate-500">m2/s</span>
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">K_c carbonatacao</p>
                  <p className="font-mono text-sm font-bold text-slate-100">
                    {resultado.carbonatacao.Kc_mmRaizAno.toFixed(2)} <span className="text-[10px] text-slate-500">mm/raiz(ano)</span>
                  </p>
                </div>
              </div>
            )}

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Composição volumétrica */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <h3 className="mb-2 font-mono text-[11px] font-bold text-slate-400">
                  Composicao Volumetrica da Pasta (Powers)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dadosComposicao} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} domain={[0, "auto"]} />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      width={90}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="valor" name="Fracao vol.">
                      {dadosComposicao.map((d, i) => (
                        <Cell key={i} fill={d.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ITZ info */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <h3 className="mb-2 font-mono text-[11px] font-bold text-slate-400">
                  ITZ — Zona de Transicao Interfacial
                </h3>
                <div className="space-y-2 font-mono text-[10px]">
                  <p className="text-slate-300">
                    Espessura: <span className="text-amber-400">{resultado.itz.espessura_um} um</span>
                  </p>
                  <p className="text-slate-300">
                    Porosidade ITZ: <span className="text-amber-400">{(resultado.itz.porosidade_ITZ * 100).toFixed(1)}%</span>
                    <span className="text-slate-600"> (bulk: {(resultado.composicao.porosidadeCapilar * 100).toFixed(1)}%)</span>
                  </p>
                  <p className="text-slate-300">
                    Fator difusao: <span className="text-amber-400">{resultado.itz.fatorDifusao.toFixed(2)}x</span>
                  </p>
                  <p className="text-slate-300">
                    Vol. relativo ITZ: <span className="text-amber-400">{(resultado.itz.volumeRelativo * 100).toFixed(1)}%</span>
                  </p>
                  <hr className="border-slate-700" />
                  <p className="text-[9px] text-slate-500">
                    Ref: Scrivener et al. (2004) Cem. Concr. Res. 34(9)
                  </p>
                </div>
              </div>
            </div>

            {/* Gráficos de durabilidade */}
            {resultado.cloretos && resultado.carbonatacao && (
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Perfil de cloretos */}
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <h3 className="mb-2 font-mono text-[11px] font-bold text-slate-400">
                    Perfil de Cloretos C(x) — {vidaUtil} anos
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={dadosCloretos}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="x_mm"
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        label={{ value: "Profundidade (mm)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#64748b" }}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        label={{ value: "C (%mc)", angle: -90, position: "insideLeft", fontSize: 9, fill: "#64748b" }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 9 }} />
                      <Line
                        type="monotone"
                        dataKey="C_pct"
                        name="C cloretos (%)"
                        stroke="#06b6d4"
                        dot={false}
                        strokeWidth={2}
                      />
                      <ReferenceLine
                        y={C_CRIT_CLORETOS}
                        stroke="#ef4444"
                        strokeDasharray="6 3"
                        label={{ value: `C_crit ${C_CRIT_CLORETOS}%`, position: "right", fontSize: 8, fill: "#ef4444" }}
                      />
                      <ReferenceLine
                        x={cobrimentoMm}
                        stroke="#eab308"
                        strokeDasharray="6 3"
                        label={{ value: `cob ${cobrimentoMm}mm`, position: "top", fontSize: 8, fill: "#eab308" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Evolução de carbonatação */}
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <h3 className="mb-2 font-mono text-[11px] font-bold text-slate-400">
                    Carbonatacao x_c(t) — Tuutti (1982)
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={dadosCarb}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="idade_anos"
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        label={{ value: "Idade (anos)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#64748b" }}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        label={{ value: "x_c (mm)", angle: -90, position: "insideLeft", fontSize: 9, fill: "#64748b" }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 9 }} />
                      <Line
                        type="monotone"
                        dataKey="xc_mm"
                        name="x_c (mm)"
                        stroke="#f97316"
                        dot={false}
                        strokeWidth={2}
                      />
                      <ReferenceLine
                        y={cobrimentoMm}
                        stroke="#ef4444"
                        strokeDasharray="6 3"
                        label={{ value: `cob ${cobrimentoMm}mm`, position: "right", fontSize: 8, fill: "#ef4444" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Parâmetros resumo */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                `a/c=${resultado.params.relacaoAc}`,
                `alpha=${resultado.params.alpha}`,
                `idade=${resultado.params.idade_dias}d`,
                `m=${resultado.params.m_envelhecimento}`,
                `V_ag=${vAgregado}`,
                `dmax=${dmaxMm}mm`,
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
