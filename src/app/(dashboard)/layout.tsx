"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSessionStore } from "@/store/session";
import {
  Home, School, Users, GraduationCap, BookUser,
  CalendarDays, ClipboardCheck, BookOpen,
  Clock, LogOut, ChevronRight, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { UsuarioSessao } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  teacherOnly?: boolean;
}

const NAV_PRINCIPAL: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <Home size={16} /> },
];

const NAV_GESTAO: NavItem[] = [
  { label: "Escolas", href: "/escolas", icon: <School size={16} /> },
  { label: "Turmas", href: "/turmas", icon: <Users size={16} /> },
  { label: "Alunos", href: "/alunos", icon: <GraduationCap size={16} /> },
  { label: "Professores", href: "/professores", icon: <BookUser size={16} />, adminOnly: true },
];

const NAV_MODULOS: NavItem[] = [
  { label: "Cronograma", href: "/cronograma", icon: <CalendarDays size={16} /> },
  { label: "Chamada", href: "/chamada", icon: <ClipboardCheck size={16} />, teacherOnly: true },
  { label: "Diário de Aulas", href: "/diario", icon: <BookOpen size={16} />, teacherOnly: true },
  { label: "Horas", href: "/horas", icon: <Clock size={16} /> },
];

const ALL_NAV_ITEMS = [...NAV_PRINCIPAL, ...NAV_GESTAO, ...NAV_MODULOS];

function getVisibleItems(items: NavItem[], admin: boolean) {
  return items.filter((item) => {
    if (item.adminOnly && !admin) return false;
    if (item.teacherOnly && admin) return false;
    return true;
  });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessao, clearSessao, isAdmin } = useSessionStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const admin = isAdmin();

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
    <div className="sag-shell flex h-screen overflow-hidden bg-[#f5f6fa] text-slate-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className="hidden w-64 flex-none flex-col overflow-y-auto border-r border-slate-800 bg-[#111827] md:flex">
        <SidebarContent
          sessao={sessao}
          admin={admin}
          pathname={pathname}
          onNavigate={(href) => router.push(href)}
          onLogout={handleLogout}
        />
      </aside>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden border-r border-slate-800 bg-[#111827]",
          "transition-transform duration-200 ease-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menu de navegação"
      >
        <SidebarContent
          sessao={sessao}
          admin={admin}
          pathname={pathname}
          onNavigate={(href) => router.push(href)}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[4.5rem] flex-none items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:px-8">
          <button
            className="flex-none rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="hidden font-medium text-slate-400 sm:inline">Painel</span>
            {currentItem && (
              <>
                <ChevronRight size={15} className="hidden flex-none text-slate-300 sm:inline" />
                <span className="truncate font-semibold text-slate-800">
                  {currentItem.label}
                </span>
              </>
            )}
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sistema online
            </div>
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <Avatar nome={sessao?.nome ?? "Sessão"} />
              <div className="hidden min-w-0 lg:block">
                <p className="max-w-[150px] truncate text-xs font-bold text-slate-800">{sessao?.nome ?? "Sessão"}</p>
                <p className="text-[11px] text-slate-400">{admin ? "Administrador" : "Professor"}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="sag-main flex-1 overflow-auto bg-[#f5f6fa]">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  sessao,
  admin,
  pathname,
  onNavigate,
  onLogout,
  onClose,
}: {
  sessao: UsuarioSessao | null;
  admin: boolean;
  pathname: string;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
        <button
          type="button"
          onClick={() => onNavigate("/dashboard")}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black text-white shadow-lg shadow-indigo-950/30">
            <span className="tracking-tight">SAG</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-white">SAG</p>
            <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">Gestão escolar</p>
          </div>
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
          items={getVisibleItems(NAV_PRINCIPAL, admin)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavGroup
          label="Gestão"
          items={getVisibleItems(NAV_GESTAO, admin)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavGroup
          label={admin ? "Operação" : "Rotina"}
          items={getVisibleItems(NAV_MODULOS, admin)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="space-y-3 border-t border-slate-800 px-3 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3">
          <Avatar nome={sessao?.nome ?? "Sessão"} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-100">{sessao?.nome ?? "Carregando sessão"}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{admin ? "Administrador" : "Professor"}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-200"
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
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
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
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
        active
          ? "bg-indigo-500/15 text-indigo-200 shadow-sm ring-1 ring-inset ring-indigo-400/20"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
      )}
    >
      <span className={cn("flex h-7 w-7 flex-none items-center justify-center rounded-lg transition-colors", active ? "bg-indigo-500 text-white" : "text-slate-500 group-hover:text-slate-200")}>
        {item.icon}
      </span>
      <span className="truncate font-medium">{item.label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-300" />}
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
    <div aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
      {initials}
    </div>
  );
}
