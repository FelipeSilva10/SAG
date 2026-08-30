"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useLayoutEffect } from "react";
import { useSessionStore } from "@/store/session";
import {
  Home, School, Users, GraduationCap, BookUser,
  CalendarDays, ClipboardCheck, BookOpen,
  Clock, LogOut, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Role, UsuarioSessao } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  // Ausente = visível para qualquer papel. Presente = exige QUALQUER um dos
  // papéis listados (não é exclusivo — quem tem os dois vê os itens dos dois).
  requiresRole?: Role[];
}

const NAV_PRINCIPAL: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <Home size={16} /> },
];

const NAV_GESTAO: NavItem[] = [
  { label: "Escolas", href: "/escolas", icon: <School size={16} /> },
  { label: "Turmas", href: "/turmas", icon: <Users size={16} /> },
  { label: "Alunos", href: "/alunos", icon: <GraduationCap size={16} /> },
  { label: "Professores", href: "/professores", icon: <BookUser size={16} />, requiresRole: ["ADMIN"] },
];

const NAV_MODULOS: NavItem[] = [
  { label: "Cronograma", href: "/cronograma", icon: <CalendarDays size={16} /> },
  { label: "Chamada", href: "/chamada", icon: <ClipboardCheck size={16} />, requiresRole: ["TEACHER"] },
  { label: "Diário de Aulas", href: "/diario", icon: <BookOpen size={16} />, requiresRole: ["TEACHER"] },
  { label: "Horas", href: "/horas", icon: <Clock size={16} /> },
];

const ALL_NAV_ITEMS = [...NAV_PRINCIPAL, ...NAV_GESTAO, ...NAV_MODULOS];

function getVisibleItems(items: NavItem[], roles: Role[]) {
  return items.filter((item) => {
    if (!item.requiresRole) return true;
    return item.requiresRole.some((role) => roles.includes(role));
  });
}

function roleLabel(roles: Role[]): string {
  const labels: string[] = [];
  if (roles.includes("ADMIN")) labels.push("Administrador");
  if (roles.includes("TEACHER")) labels.push("Professor");
  return labels.join(" · ") || "Usuário";
}

export default function DashboardShell({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: UsuarioSessao;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessao, clearSessao } = useSessionStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentSession = sessao ?? initialSession;
  const roles = currentSession.roles;

  useLayoutEffect(() => {
    useSessionStore.getState().setSessao(initialSession);
  }, [initialSession]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    clearSessao();
    router.push("/login");
    toast.success("Sessão encerrada.");
  }

  const currentItem = ALL_NAV_ITEMS.find((item) => {
    if (item.href === "/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  });

  return (
    <div className="sag-shell flex h-screen overflow-hidden bg-[#eef2f7] text-[#1f2d3a]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className="hidden w-60 flex-none flex-col overflow-y-auto border-r border-[#365570] bg-[#233f5c] md:flex">
        <SidebarContent
          sessao={currentSession}
          roles={roles}
          pathname={pathname}
          onNavigate={(href) => router.push(href)}
          onLogout={handleLogout}
        />
      </aside>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden border-r border-[#365570] bg-[#233f5c]",
          "transition-transform duration-200 ease-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menu de navegação"
      >
        <SidebarContent
          sessao={currentSession}
          roles={roles}
          pathname={pathname}
          onNavigate={(href) => router.push(href)}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-none items-center gap-3 border-b border-[#e3ebf1] bg-white px-4 md:px-8">
          <button
            className="flex-none rounded-lg p-2 text-[#62798a] transition-colors hover:bg-[#f3f7fa] hover:text-[#45566a] md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            {currentItem && (
              <span className="truncate font-semibold text-[#45566a]">
                {currentItem.label}
              </span>
            )}
          </div>

          <div className="hidden items-center gap-2.5 sm:flex">
            <Avatar nome={currentSession.nome} />
            <div className="hidden min-w-0 lg:block">
              <p className="max-w-[150px] truncate text-xs font-bold text-[#1f2d3a]">{currentSession.nome}</p>
              <p className="text-[11px] text-[#8ea0b0]">{roleLabel(roles)}</p>
            </div>
          </div>
        </header>

        <main className="sag-main flex-1 overflow-auto bg-[#eef2f7]">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  sessao,
  roles,
  pathname,
  onNavigate,
  onLogout,
  onClose,
}: {
  sessao: UsuarioSessao | null;
  roles: Role[];
  pathname: string;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-[#365570] px-5 py-5">
        <button
          type="button"
          onClick={() => onNavigate("/dashboard")}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-[#e7eef5] text-xs font-black text-[#233f5c]">
            <span className="tracking-tight">SAG</span>
          </div>
          <p className="truncate text-[15px] font-bold leading-tight text-white">SAG</p>
        </button>

        {onClose && (
          <button
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        <NavGroup
          label="Principal"
          items={getVisibleItems(NAV_PRINCIPAL, roles)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavGroup
          label="Gestão"
          items={getVisibleItems(NAV_GESTAO, roles)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavGroup
          label="Sala de Aula"
          items={getVisibleItems(NAV_MODULOS, roles)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="space-y-3 border-t border-[#365570] px-3 py-4">
        <div className="flex items-center gap-3 rounded-md border border-[#365570] bg-[#1d354d] px-3 py-3">
          <Avatar nome={sessao?.nome ?? "Sessão"} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-100">{sessao?.nome ?? "Carregando sessão"}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{roleLabel(roles)}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#1d354d] hover:text-white"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300/60">
        {label}
      </p>

      <div className="space-y-0.5">
        {items.map((item) => (
          <NavButton
            key={item.href}
            item={item}
            active={
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href)
            }
            onClick={() => onNavigate(item.href)}
          />
        ))}
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2.5 text-left text-sm transition-colors",
        active
          ? "border-l-[#7fb3cf] bg-white/10 text-white"
          : "text-slate-300 hover:bg-[#1d354d] hover:text-white"
      )}
    >
      <span className={cn("flex h-6 w-6 flex-none items-center justify-center transition-colors", active ? "text-[#a9d0e3]" : "text-slate-400 group-hover:text-white")}>
        {item.icon}
      </span>
      <span className="truncate font-semibold">{item.label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#a9d0e3]" />}
    </button>
  );
}

function Avatar({ nome }: { nome: string }) {
  const initials = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "S";

  return (
    <div aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e8f1f6] text-[11px] font-bold text-[#23638c]">
      {initials}
    </div>
  );
}
