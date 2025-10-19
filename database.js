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
    try {
      fs.unlinkSync(DB_PATH);
      console.log("🗑️ Banco corrompido removido com sucesso.");
    } catch (e) {
      console.error("❌ Erro ao tentar remover banco antigo:", e);
    }
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
    elo TEXT,
    mmr INTEGER DEFAULT 200
  )
`).run();

// --- 🕹️ Nova tabela de fila global
db.prepare(`
  CREATE TABLE IF NOT EXISTS queue_all (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT,
    mmr INTEGER
  )
`).run();

// --- 📊 Tabela de ranking unificada (sem séries)
db.prepare(`
  CREATE TABLE IF NOT EXISTS ranking (
    id TEXT PRIMARY KEY,
    name TEXT,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    mmr INTEGER DEFAULT 200
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
["players", "queue_all", "ranking"].forEach((table) => {
  ensureColumn(table, "name", "TEXT");
  ensureColumn(table, "role", "TEXT");
  ensureColumn(table, "elo", "TEXT");
  ensureColumn(table, "mmr", "INTEGER");
});

// --- 🧩 Campos extras do ranking (failsafe)
ensureColumn("ranking", "wins", "INTEGER");
ensureColumn("ranking", "losses", "INTEGER");
ensureColumn("ranking", "points", "INTEGER");

console.log("✅ Banco de dados inicializado com sucesso!");
export default db;
