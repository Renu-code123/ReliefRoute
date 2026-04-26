import db from '../db';

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPopulationForZone(lat: number, lng: number): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `https://api.worldpop.org/v1/services/stats?dataset=wpgpas&iso3=IND&year=2020&lat=${lat}&lng=${lng}&geojson=0&poptotal=1`,
      12000
    );
    
    if (!res.ok) throw new Error('WORLDPOP_API_ERROR');
    
    const data = await res.json();
    return data.data?.total_population ?? -1;
  } catch (err) {
    console.error('WorldPop fetch failed:', err);
    return -1;
  }
}

export async function syncPopulationForAllZones(): Promise<void> {
  const zones = db.prepare('SELECT * FROM zones').all() as any[];
  const now = Date.now();
  let updatedCount = 0;
  let skippedCount = 0;

  // Sequential as per instructions
  for (const zone of zones) {
    const pop = await fetchPopulationForZone(zone.lat, zone.lng);
    if (pop > 0) {
      db.prepare(`
        UPDATE zones SET 
          populationDensity = ?, 
          last_api_sync = ? 
        WHERE id = ?
      `).run(pop, now, zone.id);
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`[Population] Sync complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`);

  // Update health and log
  db.prepare('INSERT INTO api_health (service, last_success, fail_count, last_error) VALUES (?, ?, 0, NULL) ON CONFLICT(service) DO UPDATE SET last_success = ?, fail_count = 0, last_error = NULL')
    .run('population', now, now);

  db.prepare('INSERT INTO sync_log (service, synced_at, records_updated, status) VALUES (?, ?, ?, ?)')
    .run('population', now, updatedCount, updatedCount > 0 ? 'success' : 'failed');
}
