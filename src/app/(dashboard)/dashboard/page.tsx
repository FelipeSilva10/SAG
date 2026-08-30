"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, BookUser, CalendarDays,
  ClipboardCheck, Clock, GraduationCap, School, Users,
} from "lucide-react";
import { Spinner } from "@/components/ui";
import { useAlunos } from "@/hooks/useAlunos";
import { useEscolas } from "@/hooks/useEscolas";
import { useTurmas } from "@/hooks/useTurmas";
import { useSessionStore } from "@/store/session";
import type { Professor } from "@/lib/types";

interface ModuleItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  count?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAdmin } = useSessionStore();
  const admin = isAdmin();

  const { escolas, loading: loadingEscolas } = useEscolas();
  const { turmas, loading: loadingTurmas } = useTurmas();
  const { alunos, loading: loadingAlunos } = useAlunos();
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loadingProfessores, setLoadingProfessores] = useState(false);

  useEffect(() => {
    if (!admin) {
      setProfessores([]);
      return;
    }

    let active = true;
    setLoadingProfessores(true);

    fetch("/api/professores")
      .then((res) => res.json())
      .then((data) => {
        if (active) setProfessores(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setProfessores([]);
      })
      .finally(() => {
        if (active) setLoadingProfessores(false);
      });

    return () => {
      active = false;
    };
  }, [admin]);

  const loading =
    loadingEscolas || loadingTurmas || loadingAlunos || (admin && loadingProfessores);

  const modules: ModuleItem[] = [
    { title: "Escolas", href: "/escolas", icon: <School size={18} />, count: escolas.length },
    { title: "Turmas", href: "/turmas", icon: <Users size={18} />, count: turmas.length },
    { title: "Alunos", href: "/alunos", icon: <GraduationCap size={18} />, count: alunos.length },
    ...(admin
      ? [{ title: "Professores", href: "/professores", icon: <BookUser size={18} />, count: professores.length }]
      : []),
    { title: "Cronograma", href: "/cronograma", icon: <CalendarDays size={18} /> },
    ...(!admin
      ? [
          { title: "Chamada", href: "/chamada", icon: <ClipboardCheck size={18} /> },
          { title: "Diário de Aulas", href: "/diario", icon: <BookOpen size={18} /> },
        ]
      : []),
    { title: "Horas", href: "/horas", icon: <Clock size={18} /> },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-4 py-6 sm:px-6">
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {modules.map((m) => (
            <button
              key={m.title}
              type="button"
              onClick={() => router.push(m.href)}
              className="flex flex-col items-start gap-2 rounded-lg border border-[#e3ebf1] bg-white p-4 text-left transition-colors hover:border-[#a9c4d4] hover:bg-[#f8fafc]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e8f1f6] text-[#23638c]">
                {m.icon}
              </span>
              <span className="font-bold text-[#1f2d3a]">{m.title}</span>
              {m.count !== undefined && (
                <span className="text-xs font-semibold text-[#8ea0b0]">{m.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
