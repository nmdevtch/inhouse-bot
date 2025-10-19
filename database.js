// database.js
import Database from "better-sqlite3";
import fs from "fs";

const DB_PATH = "./inhouse.db";

// 🧩 Verificação de integridade
if (fs.existsSync(DB_PATH)) {
  try {
    const testDb = new Database(DB_PATH);
    testDb.prepare("PRAGMA user_version;").get();
    testDb.close();
  } catch {
    console.error("⚠️ Banco corrompido. Removendo...");
    fs.unlinkSync(DB_PATH);
  }
}

const db = new Database(DB_PATH);

// --- Função para recriar tabela se estrutura antiga for detectada
function recreateRankingIfInvalid() {
  try {
    const columns = db.prepare("PRAGMA table_info(ranking);").all();
    const hasSerie = columns.some(c => c.name === "serie");
    if (hasSerie) {
      console.log("🧹 Removendo coluna antiga 'serie' do ranking...");
      db.prepare("DROP TABLE IF EXISTS ranking").run();
    }
  } catch {
    console.log("⚙️ Criando nova tabela ranking...");
  }

  // recria com nova estrutura
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
}

// --- Criação das outras tabelas
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT,
    mmr INTEGER DEFAULT 200
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS queue_all (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    elo TEXT,
    mmr INTEGER
  )
`).run();

// --- Verifica e corrige ranking
recreateRankingIfInvalid();

console.log("✅ Banco de dados inicializado e sincronizado com sucesso!");
export default db;
