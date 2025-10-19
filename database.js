import Database from "better-sqlite3";

const db = new Database("inhouse.db");

// --- Criação da tabela de jogadores
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT
  )
`).run();

// --- Tabela genérica antiga de fila (mantida por compatibilidade)
db.prepare(`
  CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT
  )
`).run();

// --- Tabelas específicas para as séries
db.prepare(`
  CREATE TABLE IF NOT EXISTS queue_a (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS queue_b (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS queue_c (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT
  )
`).run();

// --- Função de verificação e criação de colunas ausentes (failsafe)
const ensureColumn = (table, column, type) => {
  try {
    db.prepare(`SELECT ${column} FROM ${table} LIMIT 1`).get();
  } catch {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`🛠️ Coluna adicionada: ${table}.${column}`);
  }
};

// --- Garante que todas as colunas existam em todas as tabelas
["players", "queue", "queue_a", "queue_b", "queue_c"].forEach((table) => {
  ensureColumn(table, "name", "TEXT");
  ensureColumn(table, "role", "TEXT");
  ensureColumn(table, "elo", "TEXT");
});

export default db;
