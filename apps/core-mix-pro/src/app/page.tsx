import Link from "next/link";

/**
 * @file app/page.tsx
 * @description Home page — navegação para os módulos do LIMS.
 */

const MODULES = [
  {
    href: "/dosagem",
    code: "01",
    title: "Motor de Empacotamento",
    description: "Otimização granulométrica para curvas-alvo",
    tags: ["Andreasen", "CPM · AIM", "Monte Carlo"],
    status: "online" as const,
  },
  {
    href: "/traco",
    code: "02",
    title: "Traço Teórico",
    description: "Dosagem racional por volumes absolutos",
    tags: ["Lei de Abrams", "IPT-EPUSP", "NBR 6118"],
    status: "online" as const,
  },
  {
    href: "/piloto",
    code: "03",
    title: "Escalonamento Piloto",
    description: "Planilha de pesagem para betoneira",
    tags: ["Dimensionamento CPs", "Pesagem g", "Betoneira"],
    status: "online" as const,
  },
  {
    href: "/comparar",
    code: "04",
    title: "Comparação de Traços",
    description: "Ranking multicritério técnico-econômico",
    tags: ["Multicritério", "CO₂", "Custo"],
    status: "online" as const,
  },
];

const STATS = [
  { value: "04", label: "Módulos Ativos" },
  { value: "06", label: "Modelos Granulom." },
  { value: "16", label: "Geometrias CP" },
  { value: "NBR", label: "Normas Integradas" },
];

const NORMS = ["NBR 6118:2023", "NBR 12655:2022", "CEB-FIP MC2010", "AFGC 2013"];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-950 font-mono">

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center pt-16 pb-8 px-6 sm:pt-20 sm:pb-10">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-amber-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="2" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-wider">
            CORE MIX PRO
          </h1>
        </div>
        <p className="text-[10px] text-slate-600 tracking-[0.25em] uppercase mb-5">
          Sistema LIMS de Engenharia de Concreto
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {NORMS.map((n) => (
            <span
              key={n}
              className="rounded-sm border border-slate-800 bg-slate-900 px-2 py-0.5 text-[8px] text-slate-600"
            >
              {n}
            </span>
          ))}
        </div>
      </section>

      {/* ─── STATS BAR ───────────────────────────────────────────────── */}
      <div className="border-y border-slate-800 bg-slate-900/40 py-4">
        <div className="mx-auto grid max-w-3xl grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-1">
              <span className="text-lg font-bold text-amber-500">{s.value}</span>
              <span className="text-[8px] uppercase tracking-[0.15em] text-slate-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MODULE GRID ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 py-10">
        {MODULES.map((m) => (
          <Link
            key={m.code}
            href={m.href}
            className={[
              "group relative flex flex-col gap-3 rounded border p-5 transition overflow-hidden",
              m.status === "online"
                ? "border-slate-700 hover:border-amber-600/60 hover:bg-amber-600/5"
                : "pointer-events-none border-slate-800 opacity-40",
            ].join(" ")}
          >
            {/* Background decorative number */}
            <span className="absolute -bottom-3 -right-1 text-6xl font-bold text-slate-800/30 select-none group-hover:text-amber-600/10 transition">
              {m.code}
            </span>

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-600 text-[10px] font-bold text-white">
                  {m.code}
                </div>
                <h2 className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition">
                  {m.title}
                </h2>
              </div>
              {m.status === "online" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>

            {/* Description */}
            <p className="text-[9px] text-slate-500 leading-relaxed relative z-10">
              {m.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 relative z-10">
              {m.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-slate-800 px-1.5 py-0.5 text-[8px] text-slate-600 group-hover:border-amber-600/30 group-hover:text-slate-500 transition"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-slate-800 py-6 text-center">
        <p className="text-[9px] text-slate-800 tracking-wider">
          Densus Engine · CORE MIX PRO v1.0
        </p>
      </footer>
    </main>
  );
}
