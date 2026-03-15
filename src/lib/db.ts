// db.ts — conexão PostgreSQL usando opções explícitas (sem URL parsing)
// Evita problemas com caracteres especiais na senha e com o pooler do Supabase.

import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined;
}

function createConnection() {
  // Tenta ler DATABASE_URL primeiro (deploy na Vercel, etc.)
  const url = process.env.DATABASE_URL;

  if (url && url.length > 10) {
    return postgres(url, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 15,
      ssl: "require",
      prepare: false,
    });
  }

  // Fallback: opções explícitas (mais robusto para senhas com caracteres especiais)
  // Equivalente ao POOLER_USER/POOLER_URL/PASS do ConexaoBD.java
  const host = process.env.DB_HOST ?? "aws-0-sa-east-1.pooler.supabase.com";
  const port = Number(process.env.DB_PORT ?? "6543");
  const user = process.env.DB_USER ?? "";
  const pass = process.env.DB_PASS ?? "";
  const db   = process.env.DB_NAME ?? "postgres";

  if (!user || !pass) {
    throw new Error(
      "Credenciais de banco não encontradas.\n" +
      "Defina DATABASE_URL ou as variáveis DB_HOST, DB_USER, DB_PASS no .env.local"
    );
  }

  return postgres({
    host,
    port,
    user,
    password: pass,
    database: db,
    max: 10,
    idle_timeout: 30,
    connect_timeout: 15,
    ssl: "require",
    prepare: false,
  });
}

export const sql =
  process.env.NODE_ENV === "development"
    ? (global._sql ?? (global._sql = createConnection()))
    : createConnection();

export default sql;