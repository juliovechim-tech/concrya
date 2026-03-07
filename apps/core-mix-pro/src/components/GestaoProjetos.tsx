"use client";

/**
 * @file components/GestaoProjetos.tsx
 * @description CORE MIX PRO — Gestão de Projetos (CRUD completo).
 * Criar, editar, deletar projetos com listagem e contadores.
 */

import { useState } from "react";
import { trpc } from "../lib/trpc";
import { useToast } from "./Toast";

export function GestaoProjetos() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // ─── State ───────────────────────────────────────────────────────────────
  const [novoNome, setNovoNome] = useState("");
  const [novoResp, setNovoResp] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editResp, setEditResp] = useState("");

  // ─── Queries & Mutations ─────────────────────────────────────────────────
  const projetos = trpc.projeto.listarProjetos.useQuery();

  const criarMutation = trpc.projeto.criarProjeto.useMutation({
    onSuccess: () => {
      utils.projeto.listarProjetos.invalidate();
      setNovoNome("");
      setNovoResp("");
      toast("Projeto criado com sucesso", "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const editarMutation = trpc.projeto.editarProjeto.useMutation({
    onSuccess: () => {
      utils.projeto.listarProjetos.invalidate();
      setEditId(null);
      toast("Projeto atualizado", "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const deletarMutation = trpc.projeto.deletarProjeto.useMutation({
    onSuccess: () => {
      utils.projeto.listarProjetos.invalidate();
      toast("Projeto removido", "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleCriar = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    criarMutation.mutate({ nome, responsavel: novoResp.trim() || undefined });
  };

  const handleEditar = (id: string) => {
    const nome = editNome.trim();
    if (!nome) return;
    editarMutation.mutate({ id, nome, responsavel: editResp.trim() || undefined });
  };

  const handleDeletar = (id: string, nome: string) => {
    if (!confirm(`Deletar projeto "${nome}"?\nTodos os traços e ensaios serão removidos permanentemente.`)) return;
    deletarMutation.mutate({ id });
  };

  const startEdit = (p: { id: string; nome: string; responsavel: string | null }) => {
    setEditId(p.id);
    setEditNome(p.nome);
    setEditResp(p.responsavel ?? "");
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-6 py-8 font-mono">

      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 tracking-wide">Gestao de Projetos</h1>
          <p className="text-[9px] text-slate-600">Criar, editar e gerenciar projetos</p>
        </div>
      </div>

      {/* ─── FORM: NOVO PROJETO ─────────────────────────────────────── */}
      <div className="mb-8 rounded border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
          Novo Projeto
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Nome *
            </label>
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriar()}
              placeholder="Ex: Obra Edificio Central"
              className="w-full rounded-sm border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-200 placeholder:text-slate-700 focus:border-amber-600 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Responsavel
            </label>
            <input
              value={novoResp}
              onChange={(e) => setNovoResp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriar()}
              placeholder="Ex: Eng. Joao Silva"
              className="w-full rounded-sm border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-200 placeholder:text-slate-700 focus:border-amber-600 focus:outline-none"
            />
          </div>
          <button
            onClick={handleCriar}
            disabled={!novoNome.trim() || criarMutation.isPending}
            className="flex items-center gap-1.5 rounded-sm bg-amber-600 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {criarMutation.isPending ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>

      {/* ─── LOADING ────────────────────────────────────────────────── */}
      {projetos.isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        </div>
      )}

      {/* ─── EMPTY STATE ────────────────────────────────────────────── */}
      {projetos.data?.length === 0 && (
        <div className="rounded border border-slate-800 bg-slate-900/40 py-16 text-center">
          <p className="text-[11px] text-slate-600 mb-1">Nenhum projeto criado.</p>
          <p className="text-[10px] text-slate-700">
            Use o formulario acima para criar seu primeiro projeto.
          </p>
        </div>
      )}

      {/* ─── TABELA DE PROJETOS ─────────────────────────────────────── */}
      {projetos.data && projetos.data.length > 0 && (
        <div className="rounded border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Projetos ({projetos.data.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                  <th className="px-4 py-2 text-left">Nome</th>
                  <th className="px-4 py-2 text-left">Responsavel</th>
                  <th className="px-4 py-2 text-right">Tracos</th>
                  <th className="px-4 py-2 text-right">Ensaios</th>
                  <th className="px-4 py-2 text-right">Criado em</th>
                  <th className="px-4 py-2 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {projetos.data.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    {editId === p.id ? (
                      /* ── MODO EDIÇÃO ───────────────────────────── */
                      <>
                        <td className="px-4 py-2">
                          <input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleEditar(p.id)}
                            className="w-full rounded-sm border border-amber-600/50 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-200 focus:outline-none"
                            autoFocus
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={editResp}
                            onChange={(e) => setEditResp(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleEditar(p.id)}
                            className="w-full rounded-sm border border-amber-600/50 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-200 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-amber-400">{p._count.tracos}</td>
                        <td className="px-4 py-2 text-right text-sky-400">{p._count.ensaios}</td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditar(p.id)}
                              disabled={!editNome.trim() || editarMutation.isPending}
                              className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="text-[10px] text-slate-500 hover:text-slate-400"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      /* ── MODO VISUALIZAÇÃO ─────────────────────── */
                      <>
                        <td className="px-4 py-2 font-bold text-slate-300">{p.nome}</td>
                        <td className="px-4 py-2 text-slate-500">{p.responsavel || "—"}</td>
                        <td className="px-4 py-2 text-right text-amber-400">{p._count.tracos}</td>
                        <td className="px-4 py-2 text-right text-sky-400">{p._count.ensaios}</td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => startEdit(p)}
                              className="text-[10px] text-slate-400 hover:text-amber-400 transition-colors"
                              title="Editar"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeletar(p.id, p.nome)}
                              disabled={deletarMutation.isPending}
                              className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-40"
                              title="Deletar"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
