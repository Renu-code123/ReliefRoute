import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath, { verbose: console.log });

db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    severityScore INTEGER NOT NULL,
    populationDensity INTEGER NOT NULL,
    roadAccessibility INTEGER NOT NULL,
    priorityScore REAL NOT NULL DEFAULT 0,
    lastUpdated INTEGER NOT NULL,
    data_source TEXT DEFAULT 'manual',
    external_id TEXT,
    last_api_sync INTEGER,
    rainfall_mm REAL DEFAULT 0,
    river_discharge REAL DEFAULT 0,
    base_road_score REAL DEFAULT 5
  );

  CREATE TABLE IF NOT EXISTS depots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    food INTEGER NOT NULL DEFAULT 0,
    medicine INTEGER NOT NULL DEFAULT 0,
    shelterKits INTEGER NOT NULL DEFAULT 0,
    rescueTeams INTEGER NOT NULL DEFAULT 0,
    last_coordinator_update INTEGER,
    update_source TEXT DEFAULT 'manual'
  );

  CREATE TABLE IF NOT EXISTS allocations (
    id TEXT PRIMARY KEY,
    createdAt INTEGER NOT NULL,
    planJson TEXT NOT NULL,
    equityFlag INTEGER NOT NULL DEFAULT 0,
    generatedBy TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT NOT NULL,
    recipientId TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    deliveredVia TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS api_health (
    service     TEXT PRIMARY KEY,
    last_success INTEGER,
    fail_count  INTEGER DEFAULT 0,
    last_error  TEXT
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    service     TEXT,
    synced_at   INTEGER,
    records_updated INTEGER,
    status      TEXT,
    error       TEXT
  );

  CREATE TABLE IF NOT EXISTS route_cache (
    cache_key   TEXT PRIMARY KEY,
    eta_minutes INTEGER,
    distance_km REAL,
    polyline    TEXT,
    cached_at   INTEGER
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    createdAt INTEGER NOT NULL
  );
`);

export default db;
