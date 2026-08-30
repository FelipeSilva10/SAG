// ─────────────────────────────────────────────────────────────────────────────
// store/session.ts — estado global de sessão
// Equivalente ao campo `sessaoAtual` e `isAdmin()` do MainFX.java
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import type { Role, UsuarioSessao } from "@/lib/types";

interface SessionStore {
  sessao: UsuarioSessao | null;
  setSessao: (sessao: UsuarioSessao) => void;
  clearSessao: () => void;
  hasRole: (role: Role) => boolean;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  sessao: null,

  setSessao: (sessao) => set({ sessao }),

  clearSessao: () => set({ sessao: null }),

  hasRole: (role) => get().sessao?.roles.includes(role) ?? false,

  isAdmin: () => get().hasRole("ADMIN"),

  isTeacher: () => get().hasRole("TEACHER"),
}));
