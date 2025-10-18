import Database from "better-sqlite3";

const db = new Database("inhouse.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT
  )
`).run();

export default db;
