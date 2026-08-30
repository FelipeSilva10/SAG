import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  generateOpaqueToken,
  hasRole,
  isOpaqueToken,
  mapPanelSessionRow,
  ownsProfessorScope,
  PANEL_SESSION_COOKIE,
  resolveProfessorId,
  sha256Hex,
} from "../src/lib/panel-session-core.ts";

test("sessão do painel usa token opaco de 256 bits", () => {
  const token = generateOpaqueToken((target) => {
    target.fill(7);
    return target;
  });

  assert.equal(token.length, 43);
  assert.equal(isOpaqueToken(token), true);
  assert.equal(token.includes("="), false);
  assert.equal(PANEL_SESSION_COOKIE, "__Host-sag_session");
});

test("hash de sessão é SHA-256 hexadecimal", async () => {
  assert.equal(
    await sha256Hex("sag-panel-session"),
    "0df70f6faac7f491c56916af2b34f11ef57412ba28e315c3c61706ef5c644360",
  );
});

test("resultado do banco só vira sessão após validação estrutural (papel único)", () => {
  assert.deepEqual(
    mapPanelSessionRow({
      session_id: "session-id",
      actor_id: "actor-id",
      actor_name: "Professora",
      actor_roles: ["TEACHER"],
      must_change_password: false,
      session_expires_at: "2030-01-01T00:00:00.000Z",
    }),
    {
      sessionId: "session-id",
      actor: {
        id: "actor-id",
        nome: "Professora",
        roles: ["TEACHER"],
        mustChangeSenha: false,
      },
      expiresAt: "2030-01-01T00:00:00.000Z",
    },
  );
  assert.equal(mapPanelSessionRow({ actor_roles: ["TEACHER"] }), null);
});

test("resultado do banco aceita identidade com múltiplos papéis (admin + professor)", () => {
  const mapped = mapPanelSessionRow({
    session_id: "session-id",
    actor_id: "actor-id",
    actor_name: "Felipe",
    actor_roles: ["ADMIN", "TEACHER"],
    must_change_password: false,
    session_expires_at: "2030-01-01T00:00:00.000Z",
  });

  assert.deepEqual(mapped.actor.roles, ["ADMIN", "TEACHER"]);
});

test("resultado do banco rejeita papéis vazios ou desconhecidos", () => {
  assert.equal(
    mapPanelSessionRow({
      session_id: "session-id",
      actor_id: "actor-id",
      actor_name: "Ninguém",
      actor_roles: [],
      must_change_password: false,
      session_expires_at: "2030-01-01T00:00:00.000Z",
    }),
    null,
  );
  assert.equal(
    mapPanelSessionRow({
      session_id: "session-id",
      actor_id: "actor-id",
      actor_name: "Aluno",
      actor_roles: ["STUDENT"],
      must_change_password: false,
      session_expires_at: "2030-01-01T00:00:00.000Z",
    }),
    null,
  );
});

test("cookie é HttpOnly, Secure e SameSite Strict", async () => {
  const source = await readFile(
    new URL("../src/lib/panel-session.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /httpOnly:\s*true/u);
  assert.match(source, /secure:\s*true/u);
  assert.match(source, /sameSite:\s*"strict"/u);
});

test("auto-login não aceita tokens da sessão principal", async () => {
  const source = await readFile(
    new URL("../src/app/auto-login/page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /access_token|refresh_token|setSession/u);
  assert.match(source, /window\.location\.hash/u);
  assert.match(source, /\/api\/auth\/handoff/u);
});

test("clientes Supabase usam somente as chaves atuais", async () => {
  const [adminSource, serverSource] = await Promise.all([
    readFile(new URL("../src/lib/supabase.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/supabase-server.ts", import.meta.url), "utf8"),
  ]);
  const source = `${adminSource}\n${serverSource}`;
  const legacyPublicName = [
    "NEXT",
    "PUBLIC",
    "SUPABASE",
    "ANON",
    "KEY",
  ].join("_");
  const legacyPrivilegedName = [
    "SUPABASE",
    "SERVICE",
    "ROLE",
    "KEY",
  ].join("_");

  assert.match(source, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/u);
  assert.match(source, /SUPABASE_SECRET_KEY/u);
  assert.match(source, /sb_publishable_/u);
  assert.match(source, /sb_secret_/u);
  assert.equal(source.includes(legacyPublicName), false);
  assert.equal(source.includes(legacyPrivilegedName), false);
});

test("login do painel não bifurca mais entre backoffice_admins e perfis", async () => {
  const source = await readFile(
    new URL("../src/app/api/auth/login/route.ts", import.meta.url),
    "utf8",
  );

  // Toda identidade do painel passa a ser uma linha de perfis com pelo
  // menos um papel em perfis_papeis — backoffice_admins não é mais fonte
  // de autenticação (fica só como tabela de auditoria/rollback).
  assert.doesNotMatch(source, /backoffice_admins/u);
  assert.match(source, /perfis_papeis/u);
});

// ── hasRole: uma identidade pode ter zero, um ou vários papéis ──────────────

function sessionWith(roles) {
  return {
    sessionId: "session-id",
    actor: { id: "actor-id", nome: "Alguém", roles, mustChangeSenha: false },
    expiresAt: "2030-01-01T00:00:00.000Z",
  };
}

test("hasRole: professor só-professor não tem admin", () => {
  const { actor } = sessionWith(["TEACHER"]);
  assert.equal(hasRole(actor, "TEACHER"), true);
  assert.equal(hasRole(actor, "ADMIN"), false);
});

test("hasRole: administrador só-admin não tem professor", () => {
  const { actor } = sessionWith(["ADMIN"]);
  assert.equal(hasRole(actor, "ADMIN"), true);
  assert.equal(hasRole(actor, "TEACHER"), false);
});

test("hasRole: identidade admin+professor tem os dois papéis simultaneamente", () => {
  const { actor } = sessionWith(["ADMIN", "TEACHER"]);
  assert.equal(hasRole(actor, "ADMIN"), true);
  assert.equal(hasRole(actor, "TEACHER"), true);
});

// ── resolveProfessorId: escopo de dados por papel, não por identidade ──────

test("professor não consegue selecionar outro professor por parâmetro", () => {
  const session = sessionWith(["TEACHER"]);
  session.actor.id = "teacher-id";

  assert.equal(resolveProfessorId(session, "other-teacher-id"), "teacher-id");
  assert.equal(resolveProfessorId(session, null), "teacher-id");
});

test("administrador mantém escopo explícito e pode consultar visão global", () => {
  const session = sessionWith(["ADMIN"]);
  session.actor.id = "admin-id";

  assert.equal(resolveProfessorId(session, "teacher-id"), "teacher-id");
  assert.equal(resolveProfessorId(session, null), null);
});

test("admin+professor é tratado como admin para escopo de consulta (pode ver tudo ou filtrar explicitamente)", () => {
  const session = sessionWith(["ADMIN", "TEACHER"]);
  session.actor.id = "felipe-id";

  assert.equal(resolveProfessorId(session, "outro-professor-id"), "outro-professor-id");
  assert.equal(resolveProfessorId(session, null), null);
  // Ainda pode se auto-filtrar passando o próprio id explicitamente.
  assert.equal(resolveProfessorId(session, "felipe-id"), "felipe-id");
});

// ── ownsProfessorScope: dono do registro ou admin ──────────────────────────

test("ownsProfessorScope: professor só é dono do próprio registro", () => {
  const session = sessionWith(["TEACHER"]);
  session.actor.id = "teacher-id";

  assert.equal(ownsProfessorScope(session, "teacher-id"), true);
  assert.equal(ownsProfessorScope(session, "other-id"), false);
});

test("ownsProfessorScope: admin é dono de qualquer registro de professor", () => {
  const session = sessionWith(["ADMIN"]);
  session.actor.id = "admin-id";

  assert.equal(ownsProfessorScope(session, "any-teacher-id"), true);
});

test("ownsProfessorScope: admin+professor também é dono de qualquer registro", () => {
  const session = sessionWith(["ADMIN", "TEACHER"]);
  session.actor.id = "felipe-id";

  assert.equal(ownsProfessorScope(session, "outro-professor-id"), true);
  assert.equal(ownsProfessorScope(session, "felipe-id"), true);
});
