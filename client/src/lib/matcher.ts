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
  //routePolyline?: Array<{ lat: number; lng: number }>; // simplifying LatLng //comment out while error removal
  routePolyline?: string
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

export function generateAllocationPlan(zones: Zone[], depots: Depot[]): AllocationPlan {
  const allocations: ZoneAllocation[] = [];
  let equityFlag = false;

  // Deep clone depots to mutate inventory safely
  const availableDepots = depots.map(d => ({
    ...d,
    inventory: { ...d.inventory }
  }));

  for (const zone of zones) {
    // Determine needed resources based on population and severity
    // Example simplified need calculation:
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
    let minDistance = rankedDepots.length > 0 ? haversineKm(zone.lat, zone.lng, rankedDepots[0].lat, rankedDepots[0].lng) : 0;

    for (const depot of rankedDepots) {
      // Check if depot has anything we need
      const wantsFood = neededFood - assignedFood;
      const wantsMed = neededMedicine - assignedMedicine;
      const wantsShelter = neededShelter - assignedShelter;
      const wantsTeams = neededTeams - assignedTeams;

      if (wantsFood > 0 && depot.inventory.food > 0) {
        const take = Math.min(wantsFood, depot.inventory.food);
        assignedFood += take;
        depot.inventory.food -= take;
        bestDepotId = depot.id;
        minDistance = haversineKm(zone.lat, zone.lng, depot.lat, depot.lng);
      }
      
      if (wantsMed > 0 && depot.inventory.medicine > 0) {
        const take = Math.min(wantsMed, depot.inventory.medicine);
        assignedMedicine += take;
        depot.inventory.medicine -= take;
      }
      
      if (wantsShelter > 0 && depot.inventory.shelterKits > 0) {
        const take = Math.min(wantsShelter, depot.inventory.shelterKits);
        assignedShelter += take;
        depot.inventory.shelterKits -= take;
      }

      if (wantsTeams > 0 && depot.inventory.rescueTeams > 0) {
        const take = Math.min(wantsTeams, depot.inventory.rescueTeams);
        assignedTeams += take;
        depot.inventory.rescueTeams -= take;
      }

      // If we fulfilled needs, break out of depot loop
      if (assignedFood >= neededFood && assignedMedicine >= neededMedicine && assignedShelter >= neededShelter && assignedTeams >= neededTeams) {
        break;
      }
    }

    // Force minimums if constraint wasn't met natively and we have any depot with stock
    if (assignedMedicine < minMedicine) {
      const depotWithMed = rankedDepots.find(d => d.inventory.medicine >= minMedicine);
      if (depotWithMed) {
        depotWithMed.inventory.medicine -= minMedicine;
        assignedMedicine += minMedicine;
        bestDepotId = depotWithMed.id;
        minDistance = haversineKm(zone.lat, zone.lng, depotWithMed.lat, depotWithMed.lng);
      }
    }
    if (assignedTeams < minTeams) {
      const depotWithTeams = rankedDepots.find(d => d.inventory.rescueTeams >= minTeams);
      if (depotWithTeams) {
        depotWithTeams.inventory.rescueTeams -= minTeams;
        assignedTeams += minTeams;
        bestDepotId = depotWithTeams.id;
        minDistance = haversineKm(zone.lat, zone.lng, depotWithTeams.lat, depotWithTeams.lng);
      }
    }

    // Check equity
    const totalNeeds = neededFood + neededMedicine + neededShelter + neededTeams;
    const totalAssigned = assignedFood + assignedMedicine + assignedShelter + assignedTeams;
    const fulfilledRatio = totalNeeds > 0 ? (totalAssigned / totalNeeds) : 1;
    
    // Fallback environment threshold or default 0.40
    if (fulfilledRatio < 0.40 && zone.roadAccessibility < 5) {
      equityFlag = true;
    }

    allocations.push({
      zoneId: zone.id,
      depotId: bestDepotId,
      assignedResources: {
        food: assignedFood,
        medicine: assignedMedicine,
        shelterKits: assignedShelter,
        rescueTeams: assignedTeams
      },
      justification: '', // to be filled by Claude
      estimatedETA: calculateETA(minDistance, zone.roadAccessibility),
      routePolyline: [{ lat: zone.lat, lng: zone.lng }] // Placeholder
    });
  }

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
    createdAt: Date.now(),
    zoneAllocations: allocations,
    equityFlag,
    generatedBy: 'ai' // Default
  };
}
