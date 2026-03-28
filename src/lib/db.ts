import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined;
}

function createConnection() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT ?? "6543");
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS;
  const db   = process.env.DB_NAME ?? "postgres";

  if (!host || !user || !pass) {
    throw new Error(
      `Credenciais de banco não encontradas. ` +
      `DB_HOST=${host}, DB_USER=${user}, DB_PASS definida=${!!pass}`
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