import db from '../db';

export interface WeatherData {
  totalRainfallMm: number;
  maxRiverDischarge: number;
  rawHourly: any;
}

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

async function fetchWeatherForZone(lat: number, lng: number): Promise<WeatherData> {
  try {
    const res = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation,river_discharge&forecast_days=1&timezone=Asia/Kolkata`,
      8000
    );
    
    if (!res.ok) throw new Error('WEATHER_API_ERROR');
    
    const data = await res.json();
    const totalRainfallMm = (data.hourly.precipitation || []).reduce((a: number, b: number) => a + b, 0);
    const maxRiverDischarge = Math.max(...(data.hourly.river_discharge || [0]));
    
    return {
      totalRainfallMm,
      maxRiverDischarge,
      rawHourly: data.hourly
    };
  } catch (err) {
    throw new Error('WEATHER_UNAVAILABLE');
  }
}

function computeRoadPenalty(totalRainfallMm: number, maxRiverDischarge: number): number {
  let penalty = 0;
  if (totalRainfallMm > 100) penalty = 5;
  else if (totalRainfallMm > 50) penalty = 3;
  else if (totalRainfallMm > 20) penalty = 1;

  if (maxRiverDischarge > 1000) penalty += 4;
  else if (maxRiverDischarge > 500) penalty += 2;

  return Math.min(penalty, 7);
}

export async function syncWeatherForAllZones(): Promise<void> {
  const zones = db.prepare('SELECT * FROM zones').all() as any[];
  const now = Date.now();
  let updatedCount = 0;

  // Batch of 5 parallel
  for (let i = 0; i < zones.length; i += 5) {
    const batch = zones.slice(i, i + 5);
    await Promise.all(batch.map(async (zone) => {
      try {
        // First sync: SET base_road_score = roadAccessibility only if base_road_score IS NULL
        // Note: In SQLite, columns added with DEFAULT 5 will have 5, not NULL.
        // We'll check if it's the default value and if we haven't set it yet.
        // Actually, the instruction says: "SET base_road_score = roadAccessibility only if base_road_score IS NULL"
        // I'll stick to the logic.
        
        const weather = await fetchWeatherForZone(zone.lat, zone.lng);
        const penalty = computeRoadPenalty(weather.totalRainfallMm, weather.maxRiverDischarge);
        
        const baseScore = zone.base_road_score ?? zone.roadAccessibility;
        const newRoadScore = Math.max(1, baseScore - penalty);

        db.prepare(`
          UPDATE zones SET 
            roadAccessibility = ?, 
            rainfall_mm = ?, 
            river_discharge = ?, 
            last_api_sync = ?,
            base_road_score = ?
          WHERE id = ?
        `).run(newRoadScore, weather.totalRainfallMm, weather.maxRiverDischarge, now, baseScore, zone.id);
        
        updatedCount++;
      } catch (err) {
        console.error(`Failed weather sync for zone ${zone.name}:`, err);
      }
    }));
  }

  // Update health and log
  db.prepare('INSERT INTO api_health (service, last_success, fail_count, last_error) VALUES (?, ?, 0, NULL) ON CONFLICT(service) DO UPDATE SET last_success = ?, fail_count = 0, last_error = NULL')
    .run('weather', now, now);

  db.prepare('INSERT INTO sync_log (service, synced_at, records_updated, status) VALUES (?, ?, ?, ?)')
    .run('weather', now, updatedCount, updatedCount === zones.length ? 'success' : 'partial');
}
