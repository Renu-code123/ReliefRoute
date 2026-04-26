import { API_BASE_URL, MESH_WS_URL } from '../config';

// Mesh communication utilities

export type DeliveryMode = 'internet' | 'mesh' | 'sms';

export interface MeshMessage {
  v: number;
  id: string;
  from: string;
  to: string;
  body: string;
  ts: number;
  sig: string;
}

const SECRET = 'change_this_in_production'; // Should match server
let meshSocket: WebSocket | null = null;
let isMeshConnected = false;

// Initialize WebSocket for Mesh (Mode 2)
export function initMeshSocket(onMessage: (msg: MeshMessage) => void) {
  meshSocket = new WebSocket(MESH_WS_URL);
  
  meshSocket.onopen = () => {
    console.log('Connected to local mesh relay');
    isMeshConnected = true;
  };
  
  meshSocket.onmessage = (event) => {
    try {
      const msg: MeshMessage = JSON.parse(event.data);
      onMessage(msg);
    } catch (err) {
      console.error('Failed to parse incoming mesh message', err);
    }
  };
  
  meshSocket.onclose = () => {
    console.log('Disconnected from mesh relay');
    isMeshConnected = false;
    // Reconnect logic would go here
  };
}

export function getMeshStatus() {
  return isMeshConnected;
}

// Generate SHA-256 signature
async function generateSignature(id: string, body: string): Promise<string> {
  const data = new TextEncoder().encode(id + body + SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Main sending router
export async function sendMessage(from: string, to: string, body: string): Promise<DeliveryMode> {
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
  const ts = Date.now();
  const sig = await generateSignature(id, body);
  
  const msg: MeshMessage = { v: 1, id, from, to, body, ts, sig };

  // MODE 1 - Internet
  if (navigator.onLine) {
    try {
      await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: from, recipientId: to, content: body, deliveredVia: 'internet' })
      });
      return 'internet';
    } catch (e) {
      console.warn('Internet send failed, falling back...');
    }
  }

  // MODE 2 - WebSocket Mesh
  if (isMeshConnected && meshSocket && meshSocket.readyState === WebSocket.OPEN) {
    meshSocket.send(JSON.stringify(msg));
    return 'mesh';
  }

  // MODE 3 - SMS
  // For SMS, we just format the uri and open it, then rely on the user.
  // We can return 'sms' to trigger the UI to open the URI.
  return 'sms';
}

export function generateSmsUri(body: string, id: string): string {
  // Simple format for SMS: [ReliefRoute ID:x] body
  const shortId = id.substring(0, 4);
  const text = `[RR:${shortId}] ${body}`;
  return `sms:?body=${encodeURIComponent(text)}`;
}
