// database.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "inhouse.db");

const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    username TEXT,
    elo TEXT,
    rota TEXT,
    data_registro DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log("💾 Banco de dados SQLite conectado com sucesso!");
export default db;
