import { useState, useCallback, useEffect } from "react";
import { useSessionStore } from "@/store/session";
import type { Turma } from "@/lib/types";

export type DadosTurma = Pick<Turma, "escolaId" | "nome" | "anoLetivo" | "professorId" | "dataInicio" | "dataFim" | "totalAulas" | "situacao" | "horarios">;

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

  const salvar = async (dados: DadosTurma, id?: string) => {
    const res = await fetch(id ? `/api/turmas/${id}` : "/api/turmas", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar turma");
    await fetchTurmas();
  };

  const excluir = async (id: string) => {
    const res = await fetch(`/api/turmas/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao excluir turma");
    await fetchTurmas();
  };

  return { turmas, loading, fetchTurmas, salvar, excluir };
}
