# Autenticação server-side do SAG

## Identidade única, múltiplos papéis

Uma conta do SAG é uma linha de `public.perfis` (a mesma tabela usada pelo
Bloquin). Os papéis de painel que essa conta pode exercer — `admin`,
`teacher`, ou os dois ao mesmo tempo — vivem em `public.perfis_papeis`
(`perfil_id`, `papel`), uma tabela nova e exclusiva do backoffice do SAG,
nunca exposta ao Data API do Bloquin. `perfis.role` continua existindo e
significando o que sempre significou para o Bloquin (`teacher`/`student`, e
agora também `admin` para quem só administra) — nenhuma política RLS do
Bloquin foi alterada.

Isso elimina a necessidade histórica de duas contas para uma mesma pessoa
(uma "admin" e uma "professor"): quem acumula os dois papéis loga uma única
vez e a sessão carrega `roles: ["ADMIN", "TEACHER"]`. O código nunca deve
assumir que `roles` tem exatamente um elemento — toda checagem de permissão
passa por `hasRole(actor, papel)` (`src/lib/panel-session-core.ts`), nunca
por comparação direta de igualdade.

A tabela `public.backoffice_admins` (identidade de admin desconectada de
`auth.users`, anterior a este modelo) não é mais lida pelo login — fica
preservada só para auditoria/rollback. Ver
`supabase/migrations/20260830130000_add_multi_role_papeis.sql` no
repositório Bloquin para o schema e `scripts/link-admin-role.mjs` para a
migração de dados (ligar um admin existente a um perfil de professor, ou
criar uma identidade admin nova).

As RPCs de sessão (`create_backoffice_session`, `validate_backoffice_session`,
`consume_admin_panel_handoff`) sempre leem os papéis atuais de
`perfis_papeis` — revogar um papel (ex.: tirar o admin de alguém) tem efeito
na próxima validação de sessão, não precisa esperar a sessão de 8h expirar.

## Sessão opaca

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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SECRET_KEY`;
- `AUTH_SECRET`;
- credenciais `DB_*` já usadas pelas rotas do SAG.

O `SUPABASE_SECRET_KEY` nunca pode usar prefixo `NEXT_PUBLIC_`, aparecer em
resposta, log, código cliente ou configuração Tauri.

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
