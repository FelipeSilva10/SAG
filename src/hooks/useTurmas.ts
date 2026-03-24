import { useState, useCallback, useEffect } from "react";
import { useSessionStore } from "@/store/session";
import type { Turma } from "@/lib/types";

export function useTurmas() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessao, isAdmin } = useSessionStore();

  const fetchTurmas = useCallback(async (escolaIdFiltro?: string) => {
    setLoading(true);
    try {
      let url = "/api/turmas";
      if (isAdmin() && escolaIdFiltro) {
        url += `?escolaId=${escolaIdFiltro}`;
      } else if (!isAdmin() && sessao?.id) {
        url += `?professorId=${sessao.id}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar turmas");
      setTurmas(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sessao]);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  const criar = async (escolaId: string, nome: string, anoLetivo: string, professorId: string | null) => {
    const res = await fetch("/api/turmas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escolaId, nome, anoLetivo, professorId }),
    });
    if (!res.ok) throw new Error("Erro ao criar turma");
    await fetchTurmas();
  };

  const atualizar = async (id: string, escolaId: string, nome: string, anoLetivo: string, professorId: string | null) => {
    const res = await fetch(`/api/turmas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escolaId, nome, anoLetivo, professorId }),
    });
    if (!res.ok) throw new Error("Erro ao atualizar turma");
    await fetchTurmas();
  };

  const excluir = async (id: string) => {
    const res = await fetch(`/api/turmas/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir turma");
    await fetchTurmas();
  };

  return { turmas, loading, fetchTurmas, criar, atualizar, excluir };
}