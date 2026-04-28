import { create } from 'zustand';
import { saveLastKnownState, getLastKnownState, getPendingQueue, enqueueRequest, removeFromQueue } from '../lib/offlineQueue';
import { API_BASE_URL } from '../config';

export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severityScore: number;
  populationDensity: number;
  roadAccessibility: number;
  priorityScore: number;
  lastUpdated: number;
  data_source?: string;
  last_api_sync?: number;
}

export interface Depot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  inventory: {
    food: number;
    medicine: number;
    shelterKits: number;
    rescueTeams: number;
  };
  update_source?: string;
}

export interface ZoneAllocation {
  zoneId: string;
  depotId: string;
  assignedResources: { food: number; medicine: number; shelterKits: number; rescueTeams: number };
  justification: string;
  estimatedETA: number;
  routePolyline?: string; // written while debugging
}

export interface AllocationPlan {
  id: string;
  createdAt: number;
  zoneAllocations: ZoneAllocation[];
  equityFlag: boolean;
  generatedBy: string;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  token: string;
}

interface StoreState {
  zones: Zone[];
  depots: Depot[];
  latestPlan: AllocationPlan | null;
  isOnline: boolean;
  pendingQueueCount: number;
  user: User | null;
  setZones: (zones: Zone[]) => void;
  setDepots: (depots: Depot[]) => void;
  setLatestPlan: (plan: AllocationPlan | null) => void;
  setOnlineStatus: (status: boolean) => void;
  fetchInitialData: () => Promise<void>;
  enqueueAction: (url: string, method: string, body: any) => Promise<void>;
  syncQueue: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => void;
  //lastSyncLog?: string;//written while debugging
  lastSyncLog?: { synced_at: string }[];
}

export const useStore = create<StoreState>((set, get) => ({
  zones: [],
  depots: [],
  latestPlan: null,
  isOnline: navigator.onLine,
  pendingQueueCount: 0,
  user: JSON.parse(localStorage.getItem('reliefroute-user') || 'null'),
  
  setZones: (zones) => set({ zones }),
  setDepots: (depots) => set({ depots }),
  setLatestPlan: (plan) => {
    set({ latestPlan: plan });
    if (plan) saveLastKnownState('lastPlan', plan);
  },
  setOnlineStatus: (status) => set({ isOnline: status }),

  fetchInitialData: async () => {
    try {
      const cachedPlan = await getLastKnownState('lastPlan');
      if (cachedPlan) {
        set({ latestPlan: cachedPlan });
      }

      const pending = await getPendingQueue();
      set({ pendingQueueCount: pending.length });

      if (!navigator.onLine) return;

      const [zonesRes, depotsRes, planRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/zones`),
        fetch(`${API_BASE_URL}/api/depots`),
        fetch(`${API_BASE_URL}/api/allocation/latest`),
      ]);
      const zones = await zonesRes.json();
      const depots = await depotsRes.json();
      const latestPlan = await planRes.json();
      set({ zones, depots, latestPlan: latestPlan || null });
      
      if (latestPlan) {
        saveLastKnownState('lastPlan', latestPlan);
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  },

  enqueueAction: async (url, method, body) => {
    await enqueueRequest(url, method, body);
    const pending = await getPendingQueue();
    set({ pendingQueueCount: pending.length });
    
    if (get().isOnline) {
      await get().syncQueue();
    }
  },

  syncQueue: async () => {
    if (!navigator.onLine) return;
    
    const pending = await getPendingQueue();
    if (pending.length === 0) return;

    for (const req of pending) {
      try {
        await fetch(req.url, {
          method: req.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        await removeFromQueue(req.id);
      } catch (err) {
        console.error('Failed to sync queue item', req.id, err);
        break;
      }
    }
    
    const remaining = await getPendingQueue();
    set({ pendingQueueCount: remaining.length });
    
    await get().fetchInitialData();
  },

  setUser: (user) => {
    set({ user });
    if (user) {
      localStorage.setItem('reliefroute-user', JSON.stringify(user));
      localStorage.setItem('reliefroute-token', user.token);
    } else {
      localStorage.removeItem('reliefroute-user');
      localStorage.removeItem('reliefroute-token');
    }
  },

  logout: () => {
    set({ user: null });
    localStorage.removeItem('reliefroute-user');
    localStorage.removeItem('reliefroute-token');
  }
}));
