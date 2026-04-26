import db from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface RawIncident {
  external_id: string;
  name: string;
  lat: number;
  lng: number;
  severityScore: number;
  populationAffected: number;
  areaSqKm: number;
  roadStatusScore: number;
  source: string;
}

function mapSeverityToScore(level: string): number {
  const l = level?.toUpperCase();
  if (l === 'CATASTROPHIC') return 10;
  if (l === 'SEVERE') return 8;
  if (l === 'HIGH') return 7;
  if (l === 'MODERATE') return 5;
  if (l === 'LOW') return 3;
  return 5;
}

async function fetchWithTimeout(url: string, options: any, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromNDMA(): Promise<RawIncident[]> {
  const apiKey = process.env.NDMA_API_KEY;
  try {
    const res = await fetchWithTimeout(
      'https://idrn.gov.in/api/incidents?status=active&country=IN',
      { headers: { 'x-api-key': apiKey } },
      10000
    );
    
    if (!res.ok) throw new Error('NDMA_UNAVAILABLE');
    
    const data = await res.json();
    return data.map((item: any) => ({
      external_id: item.incident_id,
      name: item.location_name,
      lat: parseFloat(item.latitude),
      lng: parseFloat(item.longitude),
      severityScore: mapSeverityToScore(item.severity_level),
      populationAffected: item.affected_population ?? 0,
      areaSqKm: item.area_sq_km ?? 1,
      roadStatusScore: item.road_status_score ?? 5,
      source: 'ndma'
    }));
  } catch (err) {
    throw new Error('NDMA_UNAVAILABLE');
  }
}

async function fetchFromReliefWeb(): Promise<RawIncident[]> {
  const appName = process.env.RELIEFWEB_APP_NAME || 'reliefroute';
  try {
    const res = await fetchWithTimeout(
      'https://api.reliefweb.int/v1/disasters',
      {
        method: 'POST',
        headers: { 'appname': appName, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: {
            operator: "AND",
            conditions: [
              { field: "country.iso3", value: "IND" },
              { field: "status", value: "ongoing" }
            ]
          },
          fields: {
            include: ["name", "date", "country", "primary_type", "glide"]
          },
          limit: 20
        })
      },
      10000
    );
    
    if (!res.ok) throw new Error('RELIEFWEB_UNAVAILABLE');
    
    const data = await res.json();
    return (data.data || []).map((item: any) => ({
      external_id: item.id.toString(),
      name: item.fields.name,
      lat: item.fields.primary_country?.location?.lat ?? 20.5937,
      lng: item.fields.primary_country?.location?.lon ?? 78.9629,
      severityScore: 6,
      populationAffected: 0,
      areaSqKm: 1,
      roadStatusScore: 5,
      source: 'reliefweb'
    }));
  } catch (err) {
    throw new Error('RELIEFWEB_UNAVAILABLE');
  }
}

export async function syncIncidents(): Promise<void> {
  let incidents: RawIncident[] = [];
  let errorMsg = '';
  let serviceName = 'ndma';

  try {
    incidents = await fetchFromNDMA();
  } catch (err: any) {
    console.warn('NDMA failed, falling back to ReliefWeb:', err.message);
    serviceName = 'reliefweb';
    try {
      incidents = await fetchFromReliefWeb();
    } catch (err2: any) {
      errorMsg = err2.message;
      db.prepare('INSERT INTO api_health (service, fail_count, last_error) VALUES (?, 1, ?) ON CONFLICT(service) DO UPDATE SET fail_count = fail_count + 1, last_error = ?')
        .run('incidents', errorMsg, errorMsg);
      return;
    }
  }

  const now = Date.now();
  let updatedCount = 0;

  try {
    const upsertZone = db.transaction((items: RawIncident[]) => {
      for (const item of items) {
        const existing = db.prepare('SELECT id FROM zones WHERE external_id = ?').get(item.external_id) as any;
        if (existing) {
          db.prepare(`
            UPDATE zones SET 
              severityScore = ?, 
              roadAccessibility = ?, 
              lastUpdated = ?, 
              last_api_sync = ?, 
              data_source = ? 
            WHERE id = ?
          `).run(item.severityScore, item.roadStatusScore, now, now, item.source, existing.id);
        } else {
          db.prepare(`
            INSERT INTO zones (
              id, name, lat, lng, severityScore, populationDensity, 
              roadAccessibility, priorityScore, lastUpdated, 
              external_id, last_api_sync, data_source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
          `).run(
            uuidv4(), item.name, item.lat, item.lng, 
            item.severityScore, item.populationAffected / item.areaSqKm,
            item.roadStatusScore, now, item.external_id, now, item.source
          );
        }
        updatedCount++;
      }
      
      // Mark zones not in response as stale
      const externalIds = items.map(i => i.external_id);
      const placeholders = externalIds.map(() => '?').join(',');
      db.prepare(`UPDATE zones SET data_source = 'stale' WHERE external_id IS NOT NULL AND external_id NOT IN (${placeholders})`)
        .run(...externalIds);
    });

    upsertZone(incidents);

    // Update health
    db.prepare('INSERT INTO api_health (service, last_success, fail_count, last_error) VALUES (?, ?, 0, NULL) ON CONFLICT(service) DO UPDATE SET last_success = ?, fail_count = 0, last_error = NULL')
      .run('incidents', now, now);

    // Sync log
    db.prepare('INSERT INTO sync_log (service, synced_at, records_updated, status) VALUES (?, ?, ?, ?)')
      .run('incidents', now, updatedCount, 'success');

  } catch (err: any) {
    console.error('Failed to update DB during incident sync:', err);
    db.prepare('INSERT INTO sync_log (service, synced_at, records_updated, status, error) VALUES (?, ?, ?, ?, ?)')
      .run('incidents', now, updatedCount, 'failed', err.message);
  }
}
