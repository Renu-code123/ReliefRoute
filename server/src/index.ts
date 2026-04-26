import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import db from './db';
import { sortZonesByPriority, Zone } from './lib/scoring';
import { generateAllocationPlan, Depot } from './lib/matcher';
import { analyzeDisaster, chatbot, generateJustifications, conversationalReallocate, runEquityAudit } from './services/aiService';
import { startMeshRelay } from './meshRelay';
import { bootstrapData } from './services/dataBootstrap';
import { startScheduler } from './services/scheduler';
import { syncIncidents } from './services/ndmaService';
import { syncWeatherForAllZones } from './services/weatherService';
import { syncPopulationForAllZones } from './services/populationService';



const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper to get all zones
const getZones = (): Zone[] => {
  const stmt = db.prepare('SELECT * FROM zones');
  return stmt.all() as Zone[];
};

// Helper to get all depots
const getDepots = (): Depot[] => {
  const stmt = db.prepare('SELECT * FROM depots');
  const raw = stmt.all() as any[];
  return raw.map(d => ({
    id: d.id,
    name: d.name,
    lat: d.lat,
    lng: d.lng,
    inventory: {
      food: d.food,
      medicine: d.medicine,
      shelterKits: d.shelterKits,
      rescueTeams: d.rescueTeams
    }
  }));
};

// --- AUTH ROUTES ---

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_REPLACE_ME';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = Date.now();
    const userRole = role === 'admin' ? 'admin' : 'user';
    const stmt = db.prepare('INSERT INTO users (id, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, email, hashedPassword, userRole, now);
    
    res.json({ message: 'Signup successful' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (user && await bcrypt.compare(password, user.password)) {
      if (role && user.role !== role) {
        return res.status(403).json({ error: `You do not have ${role} privileges.` });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ 
        token, 
        user: { id: user.id, email: user.email, role: user.role } 
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { token, role } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const email = payload.email;
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      const id = uuidv4();
      const now = Date.now();
      const userRole = role === 'admin' ? 'admin' : 'user';
      // Random password for google users
      const randomPassword = await bcrypt.hash(uuidv4(), 10);
      const stmt = db.prepare('INSERT INTO users (id, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?)');
      stmt.run(id, email, randomPassword, userRole, now);
      user = { id, email, role: userRole };
    }

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token: jwtToken, 
      user: { id: user.id, email: user.email, role: user.role } 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- API ROUTES ---

// AI ENDPOINTS
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { report, language } = req.body;
    if (!report || !language) return res.status(400).json({ error: 'Missing report or language' });
    const result = await analyzeDisaster(report, language);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { query, language } = req.body;
    if (!query || !language) return res.status(400).json({ error: 'Missing query or language' });
    const reply = await chatbot(query, language);
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// RECALCULATE PRIORITY SCORES
app.post('/api/zones/recalculate', (req, res) => {
  try {
    const zones = db.prepare('SELECT * FROM zones').all() as any[];
    const updateStmt = db.prepare('UPDATE zones SET priorityScore = ?, lastUpdated = ? WHERE id = ?');
    
    for (const zone of zones) {
      // Score = (Severity * 0.5) + (log10(PopDensity) * 0.3) + ((10 - RoadAccess) * 0.2)
      const popScore = Math.log10(Math.max(1, zone.populationDensity));
      const roadScore = 10 - zone.roadAccessibility;
      const score = (zone.severityScore * 0.5) + (popScore * 0.3) + (roadScore * 0.2);
      
      updateStmt.run(score, Date.now(), zone.id);
    }
    
    const updatedZones = db.prepare('SELECT * FROM zones').all();
    res.json(updatedZones);
  } catch (err) {
    res.status(500).json({ error: 'Recalculation failed' });
  }
});

// GET /api/zones
app.get('/api/zones', (req, res) => {
  try {
    const zones = getZones();
    res.json(zones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/zones
app.post('/api/zones', (req, res) => {
  try {
    const { name, lat, lng, severityScore, populationDensity, roadAccessibility } = req.body;
    const id = uuidv4();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO zones (id, name, lat, lng, severityScore, populationDensity, roadAccessibility, priorityScore, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, lat, lng, severityScore, populationDensity, roadAccessibility, 0, now);
    res.json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/zones/:id
app.put('/api/zones/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { severityScore, populationDensity, roadAccessibility } = req.body;
    const now = Date.now();
    const stmt = db.prepare(`
      UPDATE zones 
      SET severityScore = ?, populationDensity = ?, roadAccessibility = ?, lastUpdated = ?
      WHERE id = ?
    `);
    stmt.run(severityScore, populationDensity, roadAccessibility, now, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/depots
app.get('/api/depots', (req, res) => {
  try {
    const depots = getDepots();
    res.json(depots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/depots/:id/inventory
app.put('/api/depots/:id/inventory', (req, res) => {
  try {
    const { id } = req.params;
    const { food, medicine, shelterKits, rescueTeams } = req.body;
    const stmt = db.prepare(`
      UPDATE depots 
      SET food = ?, medicine = ?, shelterKits = ?, rescueTeams = ?
      WHERE id = ?
    `);
    stmt.run(food, medicine, shelterKits, rescueTeams, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/allocation/run
app.post('/api/allocation/run', async (req, res) => {
  console.log('--- POST /api/allocation/run hit ---');
  try {
    const lang = (req.query.lang as string) || 'en';
    const zones = getZones();
    const depots = getDepots();
    
    // Sort zones by priority
    const sortedZones = sortZonesByPriority(zones);
    
    // Update the priority scores in the DB
    const updateZonePriority = db.prepare('UPDATE zones SET priorityScore = ? WHERE id = ?');
    db.transaction(() => {
      for (const z of sortedZones) {
        updateZonePriority.run(z.priorityScore, z.id);
      }
    })();
    
    // Generate base plan
    let plan = await generateAllocationPlan(sortedZones, depots);
    
    // STEP 3: Call AI for justifications (graceful fallback if API is rate-limited or unavailable)
    try {
      plan = await generateJustifications(plan, sortedZones, lang);
    } catch (aiErr: any) {
      console.warn('AI justification failed (likely rate-limited), using fallback justifications:', aiErr.message);
      // Add fallback justifications so the plan is still usable
      plan.zoneAllocations = plan.zoneAllocations.map((alloc: any) => ({
        ...alloc,
        justification: lang === 'hi' 
          ? 'एआई औचित्य अनुपलब्ध है। संसाधन दूरी और प्राथमिकता स्कोर के आधार पर आवंटित किए गए।'
          : 'AI justification unavailable. Resources allocated based on distance and priority score.'
      }));
      plan.generatedBy = 'ai-unverified';
    }
    
    // Save to DB
    const stmt = db.prepare(`
      INSERT INTO allocations (id, createdAt, planJson, equityFlag, generatedBy)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(plan.id, plan.createdAt, JSON.stringify(plan), plan.equityFlag ? 1 : 0, plan.generatedBy);
    
    // Deduct assigned resources from depots in the DB based on the plan
    const updateDepot = db.prepare(`
      UPDATE depots 
      SET food = food - ?, medicine = medicine - ?, shelterKits = shelterKits - ?, rescueTeams = rescueTeams - ?
      WHERE id = ?
    `);
    
    db.transaction(() => {
      for (const alloc of plan.zoneAllocations) {
        if (alloc.depotId) {
          updateDepot.run(
            alloc.assignedResources.food,
            alloc.assignedResources.medicine,
            alloc.assignedResources.shelterKits,
            alloc.assignedResources.rescueTeams,
            alloc.depotId
          );
        }
      }
    })();
    
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/allocation/latest
app.get('/api/allocation/latest', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM allocations ORDER BY createdAt DESC LIMIT 1');
    const row = stmt.get() as any;
    if (row) {
      res.json(JSON.parse(row.planJson));
    } else {
      res.json(null);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/allocation/reallocate
app.post('/api/allocation/reallocate', async (req, res) => {
  try {
    const { sessionId, message, lang = 'en' } = req.body;
    
    // Get latest plan
    const stmt = db.prepare('SELECT * FROM allocations ORDER BY createdAt DESC LIMIT 1');
    const row = stmt.get() as any;
    if (!row) {
      return res.status(400).json({ error: 'No active allocation plan found' });
    }
    const currentPlan = JSON.parse(row.planJson);
    
    const zones = getZones();
    const depots = getDepots();

    const response = await conversationalReallocate(
      sessionId,
      message,
      currentPlan,
      zones,
      depots,
      lang
    );

    // If the AI modified the plan, save it as a new version
    if (response.newPlan) {
      const stmt = db.prepare(`
        INSERT INTO allocations (id, createdAt, planJson, equityFlag, generatedBy)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        response.newPlan.id, 
        response.newPlan.createdAt, 
        JSON.stringify(response.newPlan), 
        response.newPlan.equityFlag ? 1 : 0, 
        response.newPlan.generatedBy
      );
    }

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages
app.post('/api/messages', (req, res) => {
  try {
    const { senderId, recipientId, content, deliveredVia } = req.body;
    const id = uuidv4();
    const ts = Date.now();
    const stmt = db.prepare(`
      INSERT INTO messages (id, senderId, recipientId, content, timestamp, deliveredVia, synced)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    stmt.run(id, senderId, recipientId, content, ts, deliveredVia);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:coordinatorId
app.get('/api/messages/:coordinatorId', (req, res) => {
  try {
    const { coordinatorId } = req.params;
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE senderId = ? OR recipientId = ? OR recipientId = 'broadcast'
      ORDER BY timestamp ASC
    `);
    const messages = stmt.all(coordinatorId, coordinatorId);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit/run
app.post('/api/audit/run', async (req, res) => {
  try {
    const lang = (req.query.lang as string) || 'en';
    const stmt = db.prepare('SELECT * FROM allocations ORDER BY createdAt DESC LIMIT 1');
    const row = stmt.get() as any;
    if (!row) {
      return res.status(400).json({ error: 'No active allocation plan found' });
    }
    const currentPlan = JSON.parse(row.planJson);
    
    const auditResult = await runEquityAudit(currentPlan, lang);
    res.json(auditResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit/history
app.get('/api/audit/history', (req, res) => {
  try {
    // Return all plans' equity scores or flags
    const stmt = db.prepare('SELECT createdAt, equityFlag FROM allocations ORDER BY createdAt ASC');
    const history = stmt.all();
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/status
app.get('/api/sync/status', (req, res) => {
  try {
    const healthRows = db.prepare('SELECT * FROM api_health').all() as any[];
    const services: any = {};
    for (const h of healthRows) {
      services[h.service] = {
        lastSuccess: h.last_success,
        failCount: h.fail_count,
        lastError: h.last_error
      };
    }
    
    // Ensure default empty objects for expected services if not present
    ['ndma', 'reliefweb', 'weather', 'population', 'routing'].forEach(s => {
      if (!services[s]) services[s] = { lastSuccess: null, failCount: 0, lastError: null };
    });

    const lastSyncLog = db.prepare('SELECT * FROM sync_log ORDER BY id DESC LIMIT 10').all();
    
    res.json({ services, lastSyncLog });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/trigger
app.post('/api/sync/trigger', async (req, res) => {
  try {
    const { service } = req.body;
    // trigger background syncs
    if (service === 'incidents' || service === 'all') {
      syncIncidents().catch(err => console.error(err));
    }
    if (service === 'weather' || service === 'all') {
      syncWeatherForAllZones().catch(err => console.error(err));
    }
    if (service === 'population' || service === 'all') {
      syncPopulationForAllZones().catch(err => console.error(err));
    }
    res.json({ triggered: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/zones/stale
app.get('/api/zones/stale', (req, res) => {
  try {
    const staleZones = db.prepare("SELECT * FROM zones WHERE data_source = 'stale' OR data_source = 'placeholder'").all();
    res.json(staleZones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  await bootstrapData();
  startScheduler();
  
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    startMeshRelay();
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
