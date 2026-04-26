import db from './db';

const addColumn = (table: string, column: string, type: string) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`Added column ${column} to ${table}`);
  } catch (err: any) {
    if (err.message.includes('duplicate column name')) {
      console.log(`Column ${column} already exists in ${table}`);
    } else {
      console.error(`Error adding column ${column} to ${table}:`, err.message);
    }
  }
};

console.log('Migrating database schema...');

// Zones columns
addColumn('zones', 'data_source', "TEXT DEFAULT 'manual'");
addColumn('zones', 'external_id', 'TEXT');
addColumn('zones', 'last_api_sync', 'INTEGER');
addColumn('zones', 'rainfall_mm', 'REAL DEFAULT 0');
addColumn('zones', 'river_discharge', 'REAL DEFAULT 0');
addColumn('zones', 'base_road_score', 'REAL DEFAULT 5');

// Depots columns
addColumn('depots', 'last_coordinator_update', 'INTEGER');
addColumn('depots', 'update_source', "TEXT DEFAULT 'manual'");

console.log('Migration complete.');
process.exit(0);
