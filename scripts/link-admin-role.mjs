// Migração de dados (um-a-um, manual): liga uma identidade admin existente em
// backoffice_admins a uma linha de perfis via perfis_papeis, ou cria uma
// identidade nova quando a pessoa não é (e nunca foi) professora.
//
// backoffice_admins não é apagada nem alterada por este script — ela só
// deixa de ser lida pelo login (ver src/app/api/auth/login/route.ts). Este
// script é idempotente: rodar de novo com os mesmos parâmetros não duplica
// nada (usa ON CONFLICT DO NOTHING no papel e falha alto se o e-mail de
// criação já existir).
//
// Uso:
//   Pessoa que JÁ é professora no SAG (caso comum — vira admin+professor):
//     node --env-file=.env.local scripts/link-admin-role.mjs \
//       --email professor@existente.com
//
//   Pessoa que é SÓ admin, sem conta de professor (cria identidade nova):
//     node --env-file=.env.local scripts/link-admin-role.mjs \
//       --create --email novo-admin@dominio.com --nome "Nome Completo" --senha "senha-temporaria"
//
//   Adicione --dry-run em qualquer um dos dois modos para só inspecionar.

import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { setDefaultResultOrder } from "node:dns";

setDefaultResultOrder("ipv4first");

function parseArgs(argv) {
  const args = { create: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--create") args.create = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--email") args.email = argv[++i];
    else if (arg === "--nome") args.nome = argv[++i];
    else if (arg === "--senha") args.senha = argv[++i];
    else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }
  return args;
}

function sqlClient() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT ?? "6543");
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;
  const database = process.env.DB_NAME ?? "postgres";
  if (!host || !user || !password) {
    throw new Error("Credenciais DB_HOST/DB_USER/DB_PASS não encontradas no ambiente.");
  }
  return postgres({ host, port, user, password, database, max: 1, ssl: "require", prepare: false });
}

function supabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey?.startsWith("sb_secret_")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY não configurados.");
  }
  return createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function linkExisting(sql, email, dryRun) {
  const rows = await sql`
    SELECT id, nome, role
    FROM perfis
    WHERE LOWER(email) = ${email.toLowerCase()}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw new Error(
      `Nenhum perfil encontrado com o e-mail ${email}. Use --create se esta pessoa nunca teve conta no SAG.`,
    );
  }
  const perfil = rows[0];

  const existing = await sql`
    SELECT 1 FROM perfis_papeis WHERE perfil_id = ${perfil.id}::uuid AND papel = 'admin'
  `;
  if (existing.length > 0) {
    console.log(`${perfil.nome} (${email}) já possui o papel admin. Nada a fazer.`);
    return;
  }

  console.log(
    `Vai conceder o papel 'admin' a ${perfil.nome} (${email}), perfil.id=${perfil.id}, ` +
    `perfis.role atual='${perfil.role}' (não é alterado).`,
  );
  if (dryRun) {
    console.log("(dry-run: nenhuma escrita realizada)");
    return;
  }

  await sql`
    INSERT INTO perfis_papeis (perfil_id, papel)
    VALUES (${perfil.id}::uuid, 'admin')
    ON CONFLICT DO NOTHING
  `;
  console.log("Papel 'admin' concedido com sucesso.");
}

async function createNew(sql, { email, nome, senha }, dryRun) {
  if (!email || !nome || !senha) {
    throw new Error("--create exige --email, --nome e --senha.");
  }
  if (senha.length < 6) {
    throw new Error("Senha mínima de 6 caracteres.");
  }

  const existing = await sql`
    SELECT 1 FROM perfis WHERE LOWER(email) = ${email.toLowerCase()}
  `;
  if (existing.length > 0) {
    throw new Error(
      `Já existe um perfil com o e-mail ${email}. Use o modo sem --create para vincular o papel admin a ele.`,
    );
  }

  console.log(`Vai criar uma identidade nova: ${nome} <${email}>, role='admin'.`);
  if (dryRun) {
    console.log("(dry-run: nenhuma escrita realizada)");
    return;
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Falha ao criar usuário no Supabase Auth.");
  }
  const authId = data.user.id;

  try {
    await sql`
      INSERT INTO perfis (id, nome, email, senha, role)
      VALUES (${authId}::uuid, ${nome}, ${email}, ${senha}, 'admin')
    `;
    await sql`
      INSERT INTO perfis_papeis (perfil_id, papel)
      VALUES (${authId}::uuid, 'admin')
    `;
  } catch (dbError) {
    await admin.auth.admin.deleteUser(authId);
    throw dbError;
  }

  console.log(`Identidade admin criada com sucesso. perfis.id=${authId}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email) {
    throw new Error("--email é obrigatório.");
  }

  const sql = sqlClient();
  try {
    if (args.create) {
      await createNew(sql, args, args.dryRun);
    } else {
      await linkExisting(sql, args.email, args.dryRun);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Erro:", error.message ?? error);
  process.exitCode = 1;
});
