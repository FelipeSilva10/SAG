"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, BookOpen, BookUser, CalendarDays, CheckCircle2,
  ClipboardCheck, Clock, GraduationCap, Plus, School, Users,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { useAlunos } from "@/hooks/useAlunos";
import { useEscolas } from "@/hooks/useEscolas";
import { useTurmas } from "@/hooks/useTurmas";
import { useSessionStore } from "@/store/session";
import type { Professor } from "@/lib/types";

interface ModuleItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  metric?: string;
  accent: string;
}

interface ActionItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { sessao, isAdmin } = useSessionStore();
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

  const escolaIdsComTurma = useMemo(
    () => new Set(turmas.map((turma) => turma.escolaId)),
    [turmas]
  );

  const turmasSemProfessor = useMemo(
    () => turmas.filter((turma) => !turma.professorId).length,
    [turmas]
  );

  const escolasSemTurma = useMemo(
    () => escolas.filter((escola) => !escolaIdsComTurma.has(escola.id)).length,
    [escolas, escolaIdsComTurma]
  );

  const alunosPorTurma = turmas.length > 0
    ? Math.round(alunos.length / turmas.length)
    : 0;

  const modules: ModuleItem[] = [
    {
      title: "Escolas",
      description: "Unidades, tipo de atendimento e status operacional.",
      href: "/escolas",
      icon: <School size={18} />,
      metric: `${escolas.length} cadastrada${escolas.length === 1 ? "" : "s"}`,
      accent: "text-[#285a82] bg-[#eef4f8] border-[#c9d9e5]",
    },
    {
      title: "Turmas",
      description: "Organização por escola, ano letivo e professor responsável.",
      href: "/turmas",
      icon: <Users size={18} />,
      metric: `${turmas.length} ativa${turmas.length === 1 ? "" : "s"}`,
      accent: "text-[#416d8d] bg-[#edf3f7] border-[#d1e0ea]",
    },
    {
      title: "Alunos",
      description: "Cadastros individuais, turmas e acesso dos estudantes.",
      href: "/alunos",
      icon: <GraduationCap size={18} />,
      metric: `${alunos.length} aluno${alunos.length === 1 ? "" : "s"}`,
      accent: "text-[#866a35] bg-[#f5f1e8] border-[#e5dcc8]",
    },
    ...(admin
      ? [{
          title: "Professores",
          description: "Acessos, senhas e vínculos com turmas.",
          href: "/professores",
          icon: <BookUser size={18} />,
          metric: `${professores.length} docente${professores.length === 1 ? "" : "s"}`,
          accent: "text-[#536b7d] bg-[#eef1f3] border-[#d6dfe5]",
        }]
      : []),
    {
      title: "Cronograma",
      description: "Aulas regulares, substituições e reuniões.",
      href: "/cronograma",
      icon: <CalendarDays size={18} />,
      metric: admin ? "Planejamento geral" : "Minha semana",
      accent: "text-[#416d8d] bg-[#edf3f7] border-[#d1e0ea]",
    },
    ...(!admin
      ? [
          {
            title: "Chamada",
            description: "Registro rápido de presença por turma e data.",
            href: "/chamada",
            icon: <ClipboardCheck size={18} />,
            metric: "Rotina diária",
            accent: "text-[#487254] bg-[#edf4ef] border-[#d4e5d7]",
          },
          {
            title: "Diário de Aulas",
            description: "Conteúdo trabalhado, observações e histórico.",
            href: "/diario",
            icon: <BookOpen size={18} />,
            metric: "Registros pedagógicos",
            accent: "text-[#775b60] bg-[#f4eeee] border-[#e6d8da]",
          },
        ]
      : []),
    {
      title: "Horas",
      description: "Aulas realizadas, presença e exportação mensal.",
      href: "/horas",
      icon: <Clock size={18} />,
      metric: admin ? "Conferência" : "Meu relatório",
      accent: "text-slate-700 bg-slate-100 border-slate-200",
    },
  ];

  const quickActions: ActionItem[] = admin
    ? [
        {
          title: "Cadastrar escola",
          description: "Abrir módulo de escolas",
          href: "/escolas",
          icon: <Plus size={16} />,
          primary: true,
        },
        {
          title: "Organizar turmas",
          description: "Atribuir escola e professor",
          href: "/turmas",
          icon: <Users size={16} />,
        },
        {
          title: "Revisar horas",
          description: "Conferir período e exportar CSV",
          href: "/horas",
          icon: <Clock size={16} />,
        },
      ]
    : [
        {
          title: "Fazer chamada",
          description: "Registrar presença de hoje",
          href: "/chamada",
          icon: <ClipboardCheck size={16} />,
          primary: true,
        },
        {
          title: "Registrar diário",
          description: "Adicionar conteúdo da aula",
          href: "/diario",
          icon: <BookOpen size={16} />,
        },
        {
          title: "Ver cronograma",
          description: "Consultar aulas da semana",
          href: "/cronograma",
          icon: <CalendarDays size={16} />,
        },
      ];

  const operationalNotes = admin
    ? [
        {
          label: "Turmas sem professor",
          value: turmasSemProfessor,
          detail: turmasSemProfessor === 0
            ? "Todas as turmas têm responsável."
            : "Revise a atribuição para evitar lacunas no cronograma.",
        },
        {
          label: "Escolas sem turma",
          value: escolasSemTurma,
          detail: escolasSemTurma === 0
            ? "Todas as escolas já têm turma vinculada."
            : "Crie ou vincule turmas para completar a operação.",
        },
        {
          label: "Média de alunos por turma",
          value: alunosPorTurma,
          detail: "Indicador rápido para acompanhar distribuição.",
        },
      ]
    : [
        {
          label: "Turmas sob sua responsabilidade",
          value: turmas.length,
          detail: "Acesso direto para chamada, diário e cronograma.",
        },
        {
          label: "Alunos acompanhados",
          value: alunos.length,
          detail: "Total visível de acordo com suas turmas.",
        },
        {
          label: "Média de alunos por turma",
          value: alunosPorTurma,
          detail: "Ajuda a antecipar volume de chamada.",
        },
      ];

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="border-b border-slate-300 pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
              <CalendarDays size={14} />
              <span className="capitalize">{dateLabel}</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#285a82]">Dashboard</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {admin ? "Visão geral" : `Olá, ${sessao?.nome?.split(" ")[0] ?? "professor"}`}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              {admin
                ? "Acompanhe os cadastros e as pendências da operação escolar."
                : "Consulte suas turmas e registre as atividades da rotina escolar."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant={action.primary ? "primary" : "secondary"}
                size="sm"
                title={action.description}
                onClick={() => router.push(action.href)}
                className="rounded-md"
              >
                {action.icon}
                {action.title}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white py-14">
          <Spinner text="Carregando seu painel..." />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Escolas"
              value={escolas.length}
              detail={`${escolas.filter((e) => e.tipo === "PUBLICA").length} públicas, ${escolas.filter((e) => e.tipo === "PRIVADA").length} privadas`}
              icon={<School size={18} />}
            />
            <StatCard
              label="Turmas"
              value={turmas.length}
              detail={admin ? `${turmasSemProfessor} sem professor` : "Turmas atribuídas"}
              icon={<Users size={18} />}
            />
            <StatCard
              label="Alunos"
              value={alunos.length}
              detail={`${alunosPorTurma} por turma em média`}
              icon={<GraduationCap size={18} />}
            />
            <StatCard
              label={admin ? "Professores" : "Rotinas"}
              value={admin ? professores.length : 3}
              detail={admin ? "Docentes cadastrados" : "Chamada, diário e horas"}
              icon={admin ? <BookUser size={18} /> : <CheckCircle2 size={18} />}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Módulos do sistema</h2>
                  <p className="mt-1 text-sm text-slate-500">Acesso aos recursos disponíveis para seu perfil.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {modules.map((module) => (
                  <ModuleCard
                    key={module.title}
                    item={module}
                    onClick={() => router.push(module.href)}
                  />
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Pendências</h2>
                    <p className="mt-1 text-xs text-slate-500">Itens que precisam de acompanhamento.</p>
                  </div>
                  <span className="text-xs font-medium text-slate-400">Resumo</span>
                </div>
                <div className="mt-3 space-y-3">
                  {operationalNotes.map((note) => (
                    <div
                      key={note.label}
                      className="border-l-2 border-slate-300 bg-slate-50 px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-slate-600">{note.label}</p>
                        <span className="text-lg font-bold text-slate-950">{note.value}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {note.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-bold text-slate-900">Rotina do sistema</h2>
                <p className="mt-1 text-xs text-slate-500">Ordem sugerida para os procedimentos.</p>
                <div className="mt-3 space-y-2 text-sm">
                  {(admin
                    ? ["Escolas", "Turmas", "Alunos", "Cronograma", "Horas"]
                    : ["Cronograma", "Chamada", "Diário de Aulas", "Horas"]
                  ).map((step, index) => (
                    <div key={step} className="flex items-center gap-3 border-b border-slate-100 px-2 py-2 last:border-0">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-sm bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <span className="font-medium text-slate-700">{step}</span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-[#e7eef5] text-[#285a82]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  item,
  onClick,
}: {
  item: ModuleItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-[#9eb7cb] hover:bg-[#f8fafc]"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-md border ${item.accent}`}>
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-slate-900">{item.title}</p>
            <ArrowRight size={15} className="flex-none text-slate-300 transition-colors group-hover:text-[#285a82]" />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.description}</p>
          {item.metric && (
            <p className="mt-3 text-xs font-semibold text-slate-600">{item.metric}</p>
          )}
        </div>
      </div>
    </button>
  );
}
