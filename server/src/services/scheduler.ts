import cron from 'node-cron';
import db from '../db';
import { syncIncidents } from './ndmaService';
import { syncWeatherForAllZones } from './weatherService';
import { syncPopulationForAllZones } from './populationService';

export function startScheduler(): void {
  // Job 1 — Incident sync (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Syncing incidents...');
    await syncIncidents();
  });

  // Job 2 — Weather sync (every 30 minutes)
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Scheduler] Syncing weather...');
    await syncWeatherForAllZones();
  });

  // Job 3 — Population sync (every 60 minutes)
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Syncing population...');
    await syncPopulationForAllZones();
  });

  // Job 4 — Health check log (every 5 minutes)
  cron.schedule('*/5 * * * *', () => {
    try {
      const health = db.prepare('SELECT * FROM api_health').all() as any[];
      const threshold = Number(process.env.API_FAIL_THRESHOLD) || 3;
      
      health.forEach(h => {
        if (h.fail_count >= threshold) {
          console.error(`[Health] ${h.service} has failed ${h.fail_count} times. Last error: ${h.last_error}`);
        }
      });
    } catch (err) {
      console.error('[Scheduler] Failed to check api_health', err);
    }
  });
  
  console.log('[Scheduler] Cron jobs started.');
}
