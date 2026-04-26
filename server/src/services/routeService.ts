import db from '../db';
import crypto from 'crypto';

export interface RouteResult {
  etaMinutes: number;
  distanceKm: number;
  polyline: [number, number][];
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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple polyline decoder if needed, or just return as is if ORS provides it
// ORS returns geometry as GeoJSON by default, or encoded polyline.
// Instruction says: "decodePolyline(response.routes[0].geometry)"
// I'll implement a basic one or just pass it through if it's already an array.
function decodePolyline(encoded: string): [number, number][] {
  // This is a standard Google Polyline Algorithm implementation
  let points: [number, number][] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export async function getRealRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteResult> {
  const cacheKey = crypto.createHash('md5').update(`${fromLat.toFixed(3)},${fromLng.toFixed(3)},${toLat.toFixed(3)},${toLng.toFixed(3)}`).digest('hex');
  const now = Date.now();
  const TTL = 2 * 60 * 60 * 1000; // 2 hours

  // Check cache
  const cached = db.prepare('SELECT * FROM route_cache WHERE cache_key = ?').get(cacheKey) as any;
  if (cached && (now - cached.cached_at) < TTL) {
    return {
      etaMinutes: cached.eta_minutes,
      distanceKm: cached.distance_km,
      polyline: JSON.parse(cached.polyline)
    };
  }

  // Rate limit check
  const todayStart = new Date();
  todayStart.setUTCHours(0,0,0,0);
  const orsCount = db.prepare('SELECT COUNT(*) as count FROM sync_log WHERE service = ? AND synced_at > ?').get('ors_call', todayStart.getTime()) as any;
  
  if (orsCount.count >= 1900) {
    console.warn('[Routing] ORS rate limit buffer reached. Falling back to Haversine.');
    return fallbackToHaversine(fromLat, fromLng, toLat, toLng);
  }

  try {
    const res = await fetchWithTimeout(
      'https://api.openrouteservice.org/v2/directions/driving-car',
      {
        method: 'POST',
        headers: { 
          'Authorization': process.env.ORS_API_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: [[fromLng, fromLat], [toLng, toLat]],
          avoid_features: ["ferries", "fords"],
          preference: "fastest"
        })
      },
      10000
    );

    if (!res.ok) throw new Error('ORS_API_ERROR');

    const data = await res.json();
    const route = data.routes[0];
    const result: RouteResult = {
      etaMinutes: Math.ceil(route.summary.duration / 60),
      distanceKm: route.summary.distance / 1000,
      polyline: decodePolyline(route.geometry)
    };

    // Save to cache
    db.prepare('INSERT OR REPLACE INTO route_cache (cache_key, eta_minutes, distance_km, polyline, cached_at) VALUES (?, ?, ?, ?, ?)')
      .run(cacheKey, result.etaMinutes, result.distanceKm, JSON.stringify(result.polyline), now);

    // Log call for rate limiting
    db.prepare('INSERT INTO sync_log (service, synced_at, status) VALUES (?, ?, ?)')
      .run('ors_call', now, 'success');

    return result;

  } catch (err) {
    console.warn('[Routing] ORS failed, falling back to Haversine:', err);
    return fallbackToHaversine(fromLat, fromLng, toLat, toLng);
  }
}

function fallbackToHaversine(fromLat: number, fromLng: number, toLat: number, toLng: number): RouteResult {
  const dist = haversineKm(fromLat, fromLng, toLat, toLng);
  return {
    etaMinutes: Math.ceil(dist / 40 * 60),
    distanceKm: dist,
    polyline: [[fromLat, fromLng], [toLat, toLng]]
  };
}
