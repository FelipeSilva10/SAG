"use client";

import { useState, useEffect, useCallback } from "react";
import type { Escola } from "@/lib/types";
import { useSessionStore } from "@/store/session";
import toast from "react-hot-toast";

export function useEscolas() {
  const { sessao, isAdmin } = useSessionStore();
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const url = isAdmin()
        ? "/api/escolas"
        : `/api/escolas?professorId=${sessao?.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEscolas(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erro ao carregar escolas.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sessao?.id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar(nome: string, tipo: string, extra?: Partial<Escola>) {
    const res = await fetch("/api/escolas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, tipo, ...extra }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    await carregar();
  }

  async function atualizar(id: string, nome: string, tipo: string, extra?: Partial<Escola>) {
    const res = await fetch(`/api/escolas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, tipo, ...extra }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    await carregar();
  }

  async function excluir(id: string) {
    const res = await fetch(`/api/escolas/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).error);
    await carregar();
  }

  return { escolas, loading, carregar, criar, atualizar, excluir };
}
