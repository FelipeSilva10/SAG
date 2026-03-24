"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSessionStore } from "@/store/session";
import {
  School, Users, GraduationCap, BookUser,
  CalendarDays, ClipboardCheck, BookOpen,
  Clock, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  teacherOnly?: boolean;
}

const NAV_GESTAO: NavItem[] = [
  { label: "Escolas",      href: "/escolas",      icon: <School size={16} /> },
  { label: "Turmas",       href: "/turmas",        icon: <Users size={16} /> },
  { label: "Alunos",       href: "/alunos",        icon: <GraduationCap size={16} /> },
  { label: "Professores",  href: "/professores",   icon: <BookUser size={16} />, adminOnly: true },
];

const NAV_MODULOS: NavItem[] = [
  { label: "Cronograma",     href: "/cronograma",  icon: <CalendarDays size={16} /> },
  { label: "Chamada",        href: "/chamada",     icon: <ClipboardCheck size={16} />, teacherOnly: true },
  { label: "Diário de Aulas",href: "/diario",      icon: <BookOpen size={16} />, teacherOnly: true },
  { label: "Horas",          href: "/horas",       icon: <Clock size={16} /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessao, clearSessao, isAdmin } = useSessionStore();

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    clearSessao();
    router.push("/login");
    toast.success("Sessão encerrada.");
  }

  function filteredItems(items: NavItem[]) {
    return items.filter((item) => {
      if (item.adminOnly && !isAdmin()) return false;
      if (item.teacherOnly && isAdmin()) return false;
      return true;
    });
  }

  // Breadcrumb: extrai o nome da rota atual
  const currentItem = [...NAV_GESTAO, ...NAV_MODULOS].find(
    (i) => pathname.startsWith(i.href)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-52 flex-none flex flex-col overflow-y-auto"
        style={{ background: "#1a202c" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs
              font-bold text-blue-300 flex-none" style={{ background: "#2c5282" }}>
              OA
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Oficina Admin</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-none truncate max-w-[100px]">
                {sessao?.nome ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {/* Gestão */}
          <div>
            <p className="px-2 mb-1.5 text-[10px] font-bold tracking-widest uppercase"
              style={{ color: "#4a5568" }}>
              Gestão
            </p>
            {filteredItems(NAV_GESTAO).map((item) => (
              <NavButton key={item.href} item={item} active={pathname.startsWith(item.href)} />
            ))}
          </div>

          {/* Módulos */}
          <div>
            <p className="px-2 mb-1.5 text-[10px] font-bold tracking-widest uppercase"
              style={{ color: "#4a5568" }}>
              {isAdmin() ? "Operação" : "Módulos"}
            </p>
            {filteredItems(NAV_MODULOS).map((item) => (
              <NavButton key={item.href} item={item} active={pathname.startsWith(item.href)} />
            ))}
          </div>
        </nav>

        {/* Role badge + logout */}
        <div className="px-3 py-4 border-t border-gray-700 space-y-2">
          <div className="px-2 py-1.5 rounded-lg" style={{ background: "#2d3748" }}>
            <p className="text-xs text-gray-400">
              {isAdmin() ? "👑 Administrador" : "🧑‍🏫 Professor"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm
              text-red-400 hover:bg-red-900/20 transition"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-none h-14 flex items-center px-6 bg-white border-b border-gray-200">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="font-medium text-gray-900">Oficina Admin</span>
            {currentItem && (
              <>
                <ChevronRight size={14} className="text-gray-300" />
                <span className="text-gray-600 font-medium">{currentItem.label}</span>
              </>
            )}
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(item.href)}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition text-left",
        active
          ? "bg-blue-600 text-white font-semibold"
          : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
      )}
    >
      <span className="flex-none">{item.icon}</span>
      {item.label}
    </button>
  );
}
