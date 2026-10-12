// src/hooks/useAlunos.ts
import { useState, useCallback, useEffect } from "react";
import { useSessionStore } from "@/store/session";
import type { Aluno } from "@/lib/types";

export function useAlunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessao, isAdmin } = useSessionStore();

  const fetchAlunos = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/alunos";
      if (!isAdmin() && sessao?.id) {
        url += `?professorId=${sessao.id}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar alunos");
      setAlunos(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sessao]);

  useEffect(() => {
    fetchAlunos();
  }, [fetchAlunos]);

  const criar = async (dados: { nome: string; email: string; senha: string; turmaId: string; entityStatus?: string }, recarregar = true) => {
    const res = await fetch("/api/alunos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao criar aluno");
    }
    const result = await res.json() as { id: string; email: string };
    if (recarregar) await fetchAlunos();
    return result;
  };

  const atualizar = async (id: string, dados: { nome: string; email: string; senha: string; turmaId: string; entityStatus?: string }) => {
    const res = await fetch(`/api/alunos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao atualizar aluno");
    await fetchAlunos();
  };

  const excluir = async (id: string) => {
    const res = await fetch(`/api/alunos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao excluir aluno");
    await fetchAlunos();
  };

  return { alunos, loading, fetchAlunos, criar, atualizar, excluir };
}