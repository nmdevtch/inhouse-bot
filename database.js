// database.js
import Database from "better-sqlite3";
import fs from "fs";

const DB_PATH = "./inhouse.db";

// 🧩 Verificação de integridade do banco
if (fs.existsSync(DB_PATH)) {
  try {
    const testDb = new Database(DB_PATH);
    testDb.prepare("PRAGMA user_version;").get();
    testDb.close();
  } catch (err) {
    console.error("⚠️ Banco de dados corrompido ou inválido. Criando novo...");
    fs.unlinkSync(DB_PATH);
  }
}

// 🗃️ Inicializa o banco
const db = new Database(DB_PATH);

// --- 🧩 Criação da tabela de jogadores
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT
  )
`).run();

// --- 🕹️ Tabela genérica antiga de fila (mantida por compatibilidade)
db.prepare(`
  CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT
  )
`).run();

// --- 🏆 Tabelas específicas para as séries A, B e C
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

// --- 📊 Tabela de ranking (separada por série)
db.prepare(`
  CREATE TABLE IF NOT EXISTS ranking (
    id TEXT PRIMARY KEY,
    name TEXT,
    serie TEXT,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0
  )
`).run();

// --- 🧱 Função auxiliar: garante colunas ausentes (failsafe)
const ensureColumn = (table, column, type) => {
  try {
    db.prepare(`SELECT ${column} FROM ${table} LIMIT 1`).get();
  } catch {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`🛠️ Coluna adicionada: ${table}.${column}`);
  }
};

// --- 🔍 Verificação de todas as tabelas importantes
[
  "players",
  "queue",
  "queue_a",
  "queue_b",
  "queue_c",
  "ranking"
].forEach((table) => {
  ensureColumn(table, "name", "TEXT");
  ensureColumn(table, "role", "TEXT");
  ensureColumn(table, "elo", "TEXT");
});

// --- 🧩 Campos extras do ranking (failsafe)
ensureColumn("ranking", "serie", "TEXT");
ensureColumn("ranking", "wins", "INTEGER");
ensureColumn("ranking", "losses", "INTEGER");
ensureColumn("ranking", "points", "INTEGER");

console.log("✅ Banco de dados inicializado com sucesso!");
export default db;
