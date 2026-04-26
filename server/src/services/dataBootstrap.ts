import db from '../db';
import { syncIncidents } from './ndmaService';
import { v4 as uuidv4 } from 'uuid';

export async function bootstrapData(): Promise<void> {
  // 1. Check zones
  const zoneCount = (db.prepare('SELECT COUNT(*) as count FROM zones').get() as any).count;

  if (zoneCount === 0) {
    console.log('[Bootstrap] No zone data found. Running first-time API sync...');
    await syncIncidents();
    
    // Check if sync actually loaded anything
    const newCount = (db.prepare('SELECT COUNT(*) as count FROM zones').get() as any).count;
    if (newCount === 0) {
      console.warn('[Bootstrap] API sync failed to load zones. Inserting placeholders.');
      const now = Date.now();
      const placeholders = [
        { name:'Zone A (Placeholder)', lat:30.32, lng:78.03, severityScore:5, populationDensity:10000, roadAccessibility:5, data_source:'placeholder' },
        { name:'Zone B (Placeholder)', lat:30.08, lng:78.29, severityScore:5, populationDensity:10000, roadAccessibility:5, data_source:'placeholder' },
        { name:'Zone C (Placeholder)', lat:29.94, lng:78.16, severityScore:5, populationDensity:10000, roadAccessibility:5, data_source:'placeholder' }
      ];
      
      for (const p of placeholders) {
        db.prepare(`
          INSERT INTO zones (id, name, lat, lng, severityScore, populationDensity, roadAccessibility, priorityScore, lastUpdated, data_source)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).run(uuidv4(), p.name, p.lat, p.lng, p.severityScore, p.populationDensity, p.roadAccessibility, now, p.data_source);
      }
    }
  } else {
    // 3. App restart: Check last sync
    const lastSyncRow = db.prepare('SELECT last_api_sync FROM zones WHERE external_id IS NOT NULL ORDER BY last_api_sync DESC LIMIT 1').get() as any;
    const pollInterval = parseInt(process.env.POLL_INCIDENTS_MS || '900000');
    
    if (!lastSyncRow || (Date.now() - lastSyncRow.last_api_sync) > pollInterval) {
      console.log('[Bootstrap] Data is stale. Starting background sync...');
      syncIncidents().catch(err => console.error('[Bootstrap] Background sync failed:', err));
    }
  }

  // 4. Check depots
  const depotCount = (db.prepare('SELECT COUNT(*) as count FROM depots').get() as any).count;
  if (depotCount === 0) {
    console.log('[Bootstrap] No depots found. Inserting placeholders.');
    const placeholders = [
      { name:'Depot A (Placeholder)', lat:30.31, lng:78.04, food:0, medicine:0, shelterKits:0, rescueTeams:0, update_source:'placeholder' },
      { name:'Depot B (Placeholder)', lat:29.93, lng:78.15, food:0, medicine:0, shelterKits:0, rescueTeams:0, update_source:'placeholder' }
    ];
    for (const p of placeholders) {
      db.prepare(`
        INSERT INTO depots (id, name, lat, lng, food, medicine, shelterKits, rescueTeams, update_source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), p.name, p.lat, p.lng, p.food, p.medicine, p.shelterKits, p.rescueTeams, p.update_source);
    }
  }
}
