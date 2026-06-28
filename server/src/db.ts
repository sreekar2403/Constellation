import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export interface DB {
  run(sql: string, params?: any[]): Promise<void>;
  get<T>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T>(sql: string, params?: any[]): Promise<T[]>;
}

let dbInstance: DB | null = null;

export async function getDB(): Promise<DB> {
  if (dbInstance) return dbInstance;

  // Open SQLite database file (will be created if missing)
  const sqlite = sqlite3.verbose();
  const db = new sqlite.Database('./data/constellation.db');

  // Promisify the core methods
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<void>;
  const get = promisify(db.get.bind(db)) as <T>(sql: string, params?: any[]) => Promise<T | undefined>;
  const all = promisify(db.all.bind(db)) as <T>(sql: string, params?: any[]) => Promise<T[]>;

  // Initialise tables if they don't exist
  await run(`CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    providerId TEXT,
    triggerEmbedding TEXT,
    similarityThreshold REAL,
    usageCount INTEGER,
    totalTokensSaved INTEGER,
    status TEXT,
    createdAt TEXT,
    steps TEXT,
    sourcePatternId TEXT,
    generation INTEGER
  );`);

  await run(`CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,
    json TEXT
  );`);

  dbInstance = { run, get, all };
  return dbInstance;
}
