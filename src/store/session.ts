// ─────────────────────────────────────────────────────────────────────────────
// store/session.ts — estado global de sessão
// Equivalente ao campo `sessaoAtual` e `isAdmin()` do MainFX.java
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UsuarioSessao } from "@/lib/types";

interface SessionStore {
  sessao: UsuarioSessao | null;
  setSessao: (sessao: UsuarioSessao) => void;
  clearSessao: () => void;
  isAdmin: () => boolean;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessao: null,

      setSessao: (sessao) => set({ sessao }),

      clearSessao: () => set({ sessao: null }),

      // Equivalente ao isAdmin() do MainFX.java
      isAdmin: () => get().sessao?.role === "ADMIN",
    }),
    {
      name: "sag-session", // chave no localStorage
    }
  )
);
