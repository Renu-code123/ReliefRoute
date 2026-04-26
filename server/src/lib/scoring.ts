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
}

export function calculatePriorityScore(
  severityScore: number,
  populationDensity: number,
  roadAccessibility: number
): number {
  const normalizedPopDensity = Math.log10(populationDensity + 1) / Math.log10(50000);
  const accessPenalty = (10 - roadAccessibility) / 10;

  let priorityScore =
    (severityScore / 10) * 0.50 +
    normalizedPopDensity * 0.30 +
    accessPenalty * 0.20;

  if (severityScore >= 7) {
    priorityScore = Math.max(priorityScore, 0.65);
  }

  return priorityScore;
}

export function sortZonesByPriority(zones: Zone[]): Zone[] {
  return [...zones]
    .map(zone => ({
      ...zone,
      priorityScore: calculatePriorityScore(zone.severityScore, zone.populationDensity, zone.roadAccessibility)
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
