import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

interface MeshMessage {
  v: number;
  id: string;
  from: string;
  to: string;
  body: string;
  ts: number;
  sig: string;
}

const WS_PORT = parseInt(process.env.MESH_WS_PORT || '8765', 10);
const SECRET = process.env.JWT_SECRET || 'change_this_in_production';

// Buffer for up to 72 hours (72 * 60 * 60 * 1000)
const BUFFER_TTL = 72 * 60 * 60 * 1000;
const messageBuffer: MeshMessage[] = [];

function verifySignature(msg: MeshMessage): boolean {
  const expectedSig = crypto.createHash('sha256').update(msg.id + msg.body + SECRET).digest('hex');
  return expectedSig === msg.sig;
}

export function startMeshRelay() {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New mesh peer connected');

    // Send buffered messages
    const now = Date.now();
    for (const msg of messageBuffer) {
      if (now - msg.ts < BUFFER_TTL) {
        ws.send(JSON.stringify(msg));
      }
    }

    ws.on('message', (data: string) => {
      try {
        const msg: MeshMessage = JSON.parse(data.toString());
        
        // Basic validation
        if (msg.v !== 1 || !msg.id || !msg.body || !msg.sig) {
          return;
        }

        if (!verifySignature(msg)) {
          console.warn('Mesh message signature invalid', msg.id);
          return;
        }

        // Buffer it
        messageBuffer.push(msg);

        // Relay to all other connected peers
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
          }
        });
        
      } catch (err) {
        console.error('Failed to parse mesh message', err);
      }
    });
    
    ws.on('close', () => {
      console.log('Mesh peer disconnected');
    });
  });

  // Cleanup old messages every hour
  setInterval(() => {
    const now = Date.now();
    let i = messageBuffer.length;
    while (i--) {
      if (now - messageBuffer[i].ts >= BUFFER_TTL) {
        messageBuffer.splice(i, 1);
      }
    }
  }, 60 * 60 * 1000);

  console.log(`Mesh WebSocket Relay listening on port ${WS_PORT}`);
}
