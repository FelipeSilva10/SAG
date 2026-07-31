# Autenticação server-side do SAG

O SAG aceita dois caminhos de entrada, ambos terminando na mesma sessão opaca
persistida como SHA-256 em `public.backoffice_sessions`:

- handoff de uso único emitido pelo Bloquin;
- login direto legado do painel.

O handoff chega em `/auto-login#code=...`. A página apaga o fragmento e envia o
código uma única vez para `POST /api/auth/handoff`. O endpoint chama
`consume_admin_panel_handoff`, cria um token aleatório próprio e define o cookie
`__Host-sag_session` com `HttpOnly`, `Secure`, `SameSite=Strict` e oito horas de
expiração máxima.

O middleware:

- descarta headers de identidade fornecidos pelo cliente;
- valida o cookie no banco;
- revalida role, status e sessão de origem;
- injeta headers internos somente depois da validação;
- bloqueia operações administrativas para professores.

As rotas de consulta e as rotas pedagógicas mutáveis derivam o professor da
sessão validada. Parâmetros `professorId` enviados por um professor são
ignorados; alterações também validam a posse da turma ou do registro.

Variáveis server-side necessárias:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- credenciais `DB_*` já usadas pelas rotas do SAG.

O `SUPABASE_SERVICE_ROLE_KEY` nunca pode usar prefixo `NEXT_PUBLIC_`, aparecer
em resposta, log, código cliente ou configuração Tauri.

Validação local:

```sh
/home/felipe/.nvm/versions/node/v24.14.0/bin/node \
  --experimental-strip-types --test tests/admin-auth.test.mjs

/home/felipe/.nvm/versions/node/v24.14.0/bin/node \
  node_modules/next/dist/bin/next build
```

O teste integrado HTTP fica no repositório do Bloquin em
`scripts/admin-handoff-sag.integration.test.mjs` e requer as Edge Functions e
o SAG locais em execução.
