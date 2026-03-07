"use client";

/**
 * @file app/login/page.tsx
 * @description Página de login — mesmo dark theme industrial.
 */

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [erro, setErro]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password: senha,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setErro("Email ou senha invalidos.");
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 font-mono">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-amber-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="2" fill="white" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-wider">
              CORE MIX PRO
            </h1>
          </div>
          <p className="text-[9px] text-slate-600 tracking-widest uppercase">
            Sistema LIMS de Engenharia de Concreto
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="engenheiro@lab.com"
              className="w-full rounded-sm border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-sm border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:border-amber-600 focus:outline-none"
            />
          </div>

          {erro && (
            <p className="text-[10px] text-red-400">{erro}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={[
              "w-full rounded py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] transition",
              loading
                ? "cursor-wait bg-slate-800 text-slate-600"
                : "bg-amber-600 text-white hover:bg-amber-500",
            ].join(" ")}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-slate-600">
          Nao tem conta?{" "}
          <Link href="/registro" className="text-amber-500 hover:text-amber-400">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
