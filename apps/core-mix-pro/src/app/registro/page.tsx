"use client";

/**
 * @file app/registro/page.tsx
 * @description Página de cadastro de novo usuário.
 */

import { useState } from "react";
import Link from "next/link";

export default function RegistroPage() {
  const [nome, setNome]             = useState("");
  const [email, setEmail]           = useState("");
  const [senha, setSenha]           = useState("");
  const [laboratorio, setLab]       = useState("");
  const [erro, setErro]             = useState<string | null>(null);
  const [sucesso, setSucesso]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha, laboratorio: laboratorio || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao criar conta.");
      } else {
        setSucesso(true);
      }
    } catch {
      setErro("Erro de rede.");
    }

    setLoading(false);
  };

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 font-mono">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 text-xl">
              ✓
            </span>
          </div>
          <p className="text-sm text-slate-200">Conta criada com sucesso!</p>
          <Link href="/login" className="mt-4 inline-block text-[11px] text-amber-500 hover:text-amber-400">
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 font-mono">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-bold text-slate-100 tracking-wide">Criar Conta</h1>
          <p className="text-[9px] text-slate-600 tracking-widest uppercase">Core Mix Pro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Nome completo"
              className="w-full rounded-sm border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Email</label>
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
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              placeholder="Minimo 6 caracteres"
              className="w-full rounded-sm border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Laboratorio (opcional)</label>
            <input
              type="text"
              value={laboratorio}
              onChange={(e) => setLab(e.target.value)}
              placeholder="Nome do laboratorio"
              className="w-full rounded-sm border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:border-amber-600 focus:outline-none"
            />
          </div>

          {erro && <p className="text-[10px] text-red-400">{erro}</p>}

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
            {loading ? "Criando..." : "Criar Conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-slate-600">
          Ja tem conta?{" "}
          <Link href="/login" className="text-amber-500 hover:text-amber-400">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
