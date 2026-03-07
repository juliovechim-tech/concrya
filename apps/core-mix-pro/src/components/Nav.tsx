"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/",          label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projetos",  label: "Projetos" },
  { href: "/dosagem",   label: "Empacotamento" },
  { href: "/traco",     label: "Traco Teorico" },
  { href: "/piloto",    label: "Piloto" },
  { href: "/comparar",  label: "Comparar" },
  { href: "/tracos",      label: "Historico" },
  { href: "/thermocore",  label: "ThermoCore" },
  { href: "/rheocore",     label: "RheoCore" },
  { href: "/microengine",  label: "MicroEngine" },
  { href: "/lifeengine",   label: "LifeEngine" },
] as const;

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="flex items-stretch border-b border-slate-800 bg-slate-950 print:hidden">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 border-r border-slate-800 hover:bg-slate-900 transition-colors"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-amber-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Core Mix Pro
          </span>
        </Link>

        {/* Desktop links — hidden below lg */}
        <div className="hidden lg:flex items-stretch">
          {NAV_ITEMS.filter((i) => i.href !== "/").map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] transition border-b-2",
                path === href
                  ? "border-amber-600 text-amber-400"
                  : "border-transparent text-slate-600 hover:text-slate-400",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden ml-auto flex items-center justify-center px-4 py-2.5 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Menu"
        >
          {open ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden border-b border-slate-800 bg-slate-950 print:hidden">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={[
                "flex items-center gap-3 border-b border-slate-800/50 px-5 py-3",
                "font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
                path === href
                  ? "text-amber-400 bg-amber-600/5"
                  : "text-slate-600 hover:text-slate-400 hover:bg-slate-900",
              ].join(" ")}
            >
              {path === href && (
                <span className="h-1 w-1 rounded-full bg-amber-600" />
              )}
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
