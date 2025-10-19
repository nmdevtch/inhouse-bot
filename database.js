import Database from "better-sqlite3";

const db = new Database("inhouse.db");

// --- Criação das tabelas principais
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT
  )
`).run();

// --- Verificação e adição de colunas ausentes (failsafe)
const ensureColumn = (table, column, type) => {
  try {
    db.prepare(`SELECT ${column} FROM ${table} LIMIT 1`).get();
  } catch {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`🛠️ Coluna adicionada: ${table}.${column}`);
  }
};

// Garante que todas as colunas existam
ensureColumn("players", "name", "TEXT");
ensureColumn("players", "role", "TEXT");
ensureColumn("players", "elo", "TEXT");
ensureColumn("queue", "name", "TEXT");
ensureColumn("queue", "role", "TEXT");

export default db;
