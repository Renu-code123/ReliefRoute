import { Zone } from './scoring';

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
}

export interface AssignedResources {
  food: number;
  medicine: number;
  shelterKits: number;
  rescueTeams: number;
}

export interface ZoneAllocation {
  zoneId: string;
  depotId: string;
  assignedResources: AssignedResources;
  justification: string;
  estimatedETA: number; // minutes
  routePolyline?: Array<{ lat: number; lng: number }>; // simplifying LatLng
}

export interface AllocationPlan {
  id: string;
  createdAt: number;
  zoneAllocations: ZoneAllocation[];
  equityFlag: boolean;
  generatedBy: 'ai' | 'manual' | 'ai-unverified';
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate ETA: assuming 40 km/h average speed in disaster zones, plus 30 mins prep time
export function calculateETA(distanceKm: number, roadAccessibility: number): number {
  const speed = 40 * (roadAccessibility / 10); // km/h
  const effectiveSpeed = Math.max(speed, 5); // min 5 km/h
  const travelTimeHrs = distanceKm / effectiveSpeed;
  return Math.round(travelTimeHrs * 60) + 30;
}

import { getRealRoute } from '../services/routeService';

export async function generateAllocationPlan(zones: Zone[], depots: Depot[]): Promise<AllocationPlan> {
  const allocations: ZoneAllocation[] = [];
  let equityFlag = false;

  // Deep clone depots to mutate inventory safely
  const availableDepots = depots.map(d => ({
    ...d,
    inventory: { ...d.inventory }
  }));

  for (const zone of zones) {
    // Determine needed resources based on population and severity
    const neededFood = Math.ceil(zone.populationDensity * 0.05 * (zone.severityScore / 10));
    const neededMedicine = Math.ceil(zone.populationDensity * 0.02 * (zone.severityScore / 10));
    const neededShelter = Math.ceil(zone.populationDensity * 0.01 * (zone.severityScore / 10));
    const neededTeams = Math.ceil(zone.severityScore / 2);

    let assignedFood = 0;
    let assignedMedicine = 0;
    let assignedShelter = 0;
    let assignedTeams = 0;

    // Minimum required by constraints
    const minMedicine = zone.severityScore >= 6 ? 1 : 0;
    const minTeams = zone.severityScore >= 6 ? 1 : 0;

    // Rank depots by distance
    const rankedDepots = [...availableDepots].sort((a, b) => {
      return haversineKm(zone.lat, zone.lng, a.lat, a.lng) - haversineKm(zone.lat, zone.lng, b.lat, b.lng);
    });

    let bestDepotId = rankedDepots[0]?.id || '';
    let bestDepot = rankedDepots[0];

    for (const depot of rankedDepots) {
      // Check if depot has anything we need
      const wantsFood = neededFood - assignedFood;
      const wantsMed = neededMedicine - assignedMedicine;
      const wantsShelter = neededShelter - assignedShelter;
      const wantsTeams = neededTeams - assignedTeams;

      let contributed = false;

      if (wantsFood > 0 && depot.inventory.food > 0) {
        const take = Math.min(wantsFood, depot.inventory.food);
        assignedFood += take;
        depot.inventory.food -= take;
        contributed = true;
      }
      
      if (wantsMed > 0 && depot.inventory.medicine > 0) {
        const take = Math.min(wantsMed, depot.inventory.medicine);
        assignedMedicine += take;
        depot.inventory.medicine -= take;
        contributed = true;
      }
      
      if (wantsShelter > 0 && depot.inventory.shelterKits > 0) {
        const take = Math.min(wantsShelter, depot.inventory.shelterKits);
        assignedShelter += take;
        depot.inventory.shelterKits -= take;
        contributed = true;
      }

      if (wantsTeams > 0 && depot.inventory.rescueTeams > 0) {
        const take = Math.min(wantsTeams, depot.inventory.rescueTeams);
        assignedTeams += take;
        depot.inventory.rescueTeams -= take;
        contributed = true;
      }

      if (contributed) {
        bestDepotId = depot.id;
        bestDepot = depot;
      }

      // If we fulfilled needs, break out of depot loop
      if (assignedFood >= neededFood && assignedMedicine >= neededMedicine && assignedShelter >= neededShelter && assignedTeams >= neededTeams) {
        break;
      }
    }

    // Force minimums if constraint wasn't met natively
    if (assignedMedicine < minMedicine) {
      const depotWithMed = rankedDepots.find(d => d.inventory.medicine >= minMedicine);
      if (depotWithMed) {
        depotWithMed.inventory.medicine -= minMedicine;
        assignedMedicine += minMedicine;
        bestDepotId = depotWithMed.id;
        bestDepot = depotWithMed;
      }
    }
    if (assignedTeams < minTeams) {
      const depotWithTeams = rankedDepots.find(d => d.inventory.rescueTeams >= minTeams);
      if (depotWithTeams) {
        depotWithTeams.inventory.rescueTeams -= minTeams;
        assignedTeams += minTeams;
        bestDepotId = depotWithTeams.id;
        bestDepot = depotWithTeams;
      }
    }

    // Get real route from best depot to zone
    let eta = 0;
    let polyline: any = [];
    if (bestDepot) {
      try {
        const route = await getRealRoute(bestDepot.lat, bestDepot.lng, zone.lat, zone.lng);
        eta = route.etaMinutes;
        polyline = route.polyline.map(p => ({ lat: p[0], lng: p[1] }));
      } catch (e) {
        // Fallback already handled in routeService
      }
    }

    // Check equity
    const totalNeeds = neededFood + neededMedicine + neededShelter + neededTeams;
    const totalAssigned = assignedFood + assignedMedicine + assignedShelter + assignedTeams;
    const fulfilledRatio = totalNeeds > 0 ? (totalAssigned / totalNeeds) : 1;
    
    if (fulfilledRatio < 0.40 && zone.roadAccessibility < 5) {
      equityFlag = true;
    }

    allocations.push({
      zoneId: zone.id,
      depotId: bestDepotId,
      assignedResources: {
        food: assignedFood, medicine: assignedMedicine,
        shelterKits: assignedShelter, rescueTeams: assignedTeams
      },
      justification: '', 
      estimatedETA: eta,
      routePolyline: polyline
    });
  }

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
    createdAt: Date.now(),
    zoneAllocations: allocations,
    equityFlag,
    generatedBy: 'ai'
  };
}
