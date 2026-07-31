import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  generateOpaqueToken,
  isOpaqueToken,
  mapPanelSessionRow,
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

test("resultado do banco só vira sessão após validação estrutural", () => {
  assert.deepEqual(
    mapPanelSessionRow({
      session_id: "session-id",
      actor_id: "actor-id",
      actor_name: "Professora",
      actor_role: "TEACHER",
      must_change_password: false,
      session_expires_at: "2030-01-01T00:00:00.000Z",
    }),
    {
      sessionId: "session-id",
      actor: {
        id: "actor-id",
        nome: "Professora",
        role: "TEACHER",
        mustChangeSenha: false,
      },
      expiresAt: "2030-01-01T00:00:00.000Z",
    },
  );
  assert.equal(mapPanelSessionRow({ actor_role: "TEACHER" }), null);
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

test("professor não consegue selecionar outro professor por parâmetro", () => {
  const session = {
    sessionId: "session-id",
    actor: {
      id: "teacher-id",
      nome: "Professora",
      role: "TEACHER",
      mustChangeSenha: false,
    },
    expiresAt: "2030-01-01T00:00:00.000Z",
  };

  assert.equal(resolveProfessorId(session, "other-teacher-id"), "teacher-id");
  assert.equal(resolveProfessorId(session, null), "teacher-id");
});

test("administrador mantém escopo explícito e pode consultar visão global", () => {
  const session = {
    sessionId: "session-id",
    actor: {
      id: "admin-id",
      nome: "Admin",
      role: "ADMIN",
      mustChangeSenha: false,
    },
    expiresAt: "2030-01-01T00:00:00.000Z",
  };

  assert.equal(resolveProfessorId(session, "teacher-id"), "teacher-id");
  assert.equal(resolveProfessorId(session, null), null);
});
