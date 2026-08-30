"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import type { UsuarioSessao } from "@/lib/types";

function AutoLoginContent() {
  const router = useRouter();
  const setSessao = useSessionStore((state) => state.setSessao);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const code = fragment.get("code");
      window.history.replaceState(null, "", "/auto-login");

      if (!code) {
        setStatus("error");
        setErrorMsg("Código de acesso ausente. Feche esta janela e abra o painel novamente pelo Bloquin.");
        return;
      }

      const response = await fetch("/api/auth/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        cache: "no-store",
      });
      const result = await response.json() as {
        sessao?: UsuarioSessao;
        error?: string;
      };

      if (!response.ok || !result.sessao) {
        setStatus("error");
        setErrorMsg(result.error ?? "Código inválido ou expirado. Abra o painel novamente pelo Bloquin.");
        return;
      }

      setSessao(result.sessao);
      router.replace("/dashboard");
    };

    void run().catch(() => {
      setStatus("error");
      setErrorMsg("Não foi possível conectar ao painel. Feche esta janela e tente novamente.");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "16px",
        background: "#eef2f7", fontFamily: "var(--font-nunito), system-ui, sans-serif",
      }}>
        <span style={{ fontSize: "3rem" }}>🚫</span>
        <h2 style={{ color: "#1f2d3a", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>
          Acesso negado
        </h2>
        <p style={{ color: "#62798a", fontWeight: 700, textAlign: "center", maxWidth: 320 }}>
          {errorMsg}
        </p>
        <button
          onClick={() => router.replace("/login")}
          style={{
            marginTop: "8px", padding: "12px 28px",
            background: "#23638c", color: "white",
            border: "none", borderRadius: "12px",
            fontWeight: 800, fontSize: "1rem", cursor: "pointer",
          }}
        >
          Ir para o Login
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "16px",
      background: "#eef2f7", fontFamily: "var(--font-nunito), system-ui, sans-serif",
    }}>
      <span style={{ fontSize: "3rem", animation: "spin 1s linear infinite" }}>⚙️</span>
      <p style={{ color: "#1f2d3a", fontWeight: 800, fontSize: "1.1rem" }}>
        Conectando ao painel…
      </p>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function AutoLoginPage() {
  return <AutoLoginContent />;
}
