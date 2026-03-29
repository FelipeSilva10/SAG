// src/hooks/useProfessores.ts
import { useState, useCallback, useEffect } from "react";
import type { Professor } from "@/lib/types";

export function useProfessores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfessores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/professores");
      if (!res.ok) throw new Error("Erro ao buscar professores");
      setProfessores(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfessores();
  }, [fetchProfessores]);

  const criar = async (dados: { nome: string; email: string; senha: string }) => {
    const res = await fetch("/api/professores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao criar professor");
    }
    await fetchProfessores();
  };

  const atualizar = async (id: string, dados: { nome: string; email: string; senha: string }) => {
    const res = await fetch(`/api/professores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error("Erro ao atualizar professor");
    await fetchProfessores();
  };

  const excluir = async (id: string) => {
    const res = await fetch(`/api/professores/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir professor");
    await fetchProfessores();
  };

  return { professores, loading, fetchProfessores, criar, atualizar, excluir };
}