// ─────────────────────────────────────────────────────────────────────────────
// store/session.ts — estado global de sessão
// Equivalente ao campo `sessaoAtual` e `isAdmin()` do MainFX.java
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import type { UsuarioSessao } from "@/lib/types";

interface SessionStore {
  sessao: UsuarioSessao | null;
  setSessao: (sessao: UsuarioSessao) => void;
  clearSessao: () => void;
  isAdmin: () => boolean;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  sessao: null,

  setSessao: (sessao) => set({ sessao }),

  clearSessao: () => set({ sessao: null }),

  isAdmin: () => get().sessao?.role === "ADMIN",
}));
