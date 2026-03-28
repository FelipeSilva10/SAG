"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { Suspense } from "react";

function AutoLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      const accessToken  = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        router.replace("/login");
        return;
      }

      const supabase = getSupabaseBrowser();

      const { data, error } = await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        setStatus("error");
        setErrorMsg("Sessão inválida ou expirada. Feche esta janela e tente novamente.");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("perfis")
        .select("role")
        .eq("id", data.session.user.id)
        .single();

      if (perfilError || perfil?.role !== "teacher") {
        await supabase.auth.signOut();
        setStatus("error");
        setErrorMsg("Acesso restrito a professores.");
        return;
      }

      router.replace("/escolas");
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "16px",
        background: "#f0f2f5", fontFamily: "system-ui, sans-serif",
      }}>
        <span style={{ fontSize: "3rem" }}>🚫</span>
        <h2 style={{ color: "#2f3542", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>
          Acesso negado
        </h2>
        <p style={{ color: "#7f8c8d", fontWeight: 700, textAlign: "center", maxWidth: 320 }}>
          {errorMsg}
        </p>
        <button
          onClick={() => router.replace("/login")}
          style={{
            marginTop: "8px", padding: "12px 28px",
            background: "#2b6cb0", color: "white",
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
      background: "#f0f2f5", fontFamily: "system-ui, sans-serif",
    }}>
      <span style={{ fontSize: "3rem", animation: "spin 1s linear infinite" }}>⚙️</span>
      <p style={{ color: "#2f3542", fontWeight: 800, fontSize: "1.1rem" }}>
        Conectando ao painel…
      </p>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function AutoLoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "16px",
        background: "#f0f2f5", fontFamily: "system-ui, sans-serif",
      }}>
        <span style={{ fontSize: "3rem" }}>⚙️</span>
        <p style={{ color: "#2f3542", fontWeight: 800, fontSize: "1.1rem" }}>
          Carregando…
        </p>
      </div>
    }>
      <AutoLoginContent />
    </Suspense>
  );
}