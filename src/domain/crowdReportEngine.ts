/**
 * Crowdsourced Chokepoint Reporting & Station Accessibility Radar Engine
 * Provides geofenced crowd reporting, time-decay score aggregation, and accessibility equipment monitoring.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

// Dadar Junction Railway Station Reference Coordinates (Central & Western Concourse midpoint)
export const DADAR_STATION_CENTER: GeoCoordinates = {
  latitude: 19.0178,
  longitude: 72.8478,
};

// Maximum allowed distance from Dadar Station center for authentic geofenced submissions (500 meters)
export const GEOFENCE_RADIUS_METERS = 500;

export type CrowdSeverityLevel = 'NORMAL' | 'SLOW_MOVING' | 'DENSE' | 'CHOKED_CRUSH';

export type IncidentCategory = 
  | 'NORMAL_COMMUTE'
  | 'STAIRCASE_JAM'
  | 'ESCALATOR_HALTED'
  | 'HEAVY_RAIN_WATERLOGGING'
  | 'POLICE_BARRICADE';

export interface CrowdReport {
  id: string;
  timestampMs: number;
  bridgeId: 'north-fob' | 'middle-fob' | 'south-fob';
  severity: CrowdSeverityLevel;
  incident: IncidentCategory;
  userCoords?: GeoCoordinates;
  isMockedLocation: boolean;
  notes?: string;
}

export interface BridgeCongestionSnapshot {
  bridgeId: 'north-fob' | 'middle-fob' | 'south-fob';
  bridgeName: string;
  activeReportsCount: number;
  weightedScore: number; // 0 (Clear) to 100 (Hazardous crush)
  congestionStatus: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  primaryIssue: IncidentCategory;
  lastUpdated: string;
}

export type EquipmentType = 'LIFT' | 'ESCALATOR' | 'RAMP';
export type EquipmentStatus = 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'POWER_OFF';

export interface AccessibilityEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  locationDescription: string;
  connectedPlatforms: number[];
  connectedFob: 'north-fob' | 'middle-fob' | 'south-fob' | 'tilak-bridge';
  status: EquipmentStatus;
  lastInspected: string;
  wheelchairAccessible: boolean;
}

export interface EmergencyContact {
  id: string;
  designation: string;
  telephone: string;
  description: string;
  priority: 'EMERGENCY' | 'ASSISTANCE' | 'ADMIN';
}

/**
 * Calculates Great-Circle Distance between two coordinates in meters using the Haversine formula
 */
export function calculateHaversineDistanceMeters(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  if (
    !Number.isFinite(coord1.latitude) ||
    !Number.isFinite(coord1.longitude) ||
    !Number.isFinite(coord2.latitude) ||
    !Number.isFinite(coord2.longitude)
  ) {
    return Infinity;
  }

  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates whether user coordinates reside within Dadar station geofence radius
 */
export function validateDadarGeofence(
  coords: GeoCoordinates,
  allowMock: boolean = false
): { isWithinGeofence: boolean; distanceMeters: number } {
  if (allowMock) {
    return { isWithinGeofence: true, distanceMeters: 45 };
  }

  const distance = calculateHaversineDistanceMeters(coords, DADAR_STATION_CENTER);
  return {
    isWithinGeofence: distance <= GEOFENCE_RADIUS_METERS,
    distanceMeters: Math.round(distance),
  };
}

/**
 * Weights severity levels to numerical score
 */
function severityToScore(level: CrowdSeverityLevel): number {
  switch (level) {
    case 'NORMAL':
      return 15;
    case 'SLOW_MOVING':
      return 45;
    case 'DENSE':
      return 75;
    case 'CHOKED_CRUSH':
      return 100;
    default:
      return 20;
  }
}

/**
 * Aggregate active crowd reports for each FOB with exponential time-decay (15 minute half-life)
 */
export function aggregateBridgeCongestion(
  reports: CrowdReport[],
  currentTimeMs: number = Date.now()
): Record<'north-fob' | 'middle-fob' | 'south-fob', BridgeCongestionSnapshot> {
  const bridgeNames = {
    'north-fob': 'North Foot Overbridge (Platform 1–7 to 8–14)',
    'middle-fob': 'Middle Central Foot Overbridge',
    'south-fob': 'South Foot Overbridge (Flower Market Side)',
  };

  const initialAccumulator = {
    'north-fob': { totalWeightedScore: 0, totalWeight: 0, count: 0, incidents: {} as Record<IncidentCategory, number> },
    'middle-fob': { totalWeightedScore: 0, totalWeight: 0, count: 0, incidents: {} as Record<IncidentCategory, number> },
    'south-fob': { totalWeightedScore: 0, totalWeight: 0, count: 0, incidents: {} as Record<IncidentCategory, number> },
  };

  // Only consider reports within the last 30 minutes (1800000 ms)
  const MAX_REPORT_AGE_MS = 30 * 60 * 1000;

  for (const report of reports) {
    const ageMs = currentTimeMs - report.timestampMs;
    if (ageMs < 0 || ageMs > MAX_REPORT_AGE_MS) continue;

    // Exponential decay: weight = 0.5^(age / 15 minutes)
    const decayWeight = Math.pow(0.5, ageMs / (15 * 60 * 1000));
    const baseScore = severityToScore(report.severity);

    const bucket = initialAccumulator[report.bridgeId];
    if (bucket) {
      bucket.totalWeightedScore += baseScore * decayWeight;
      bucket.totalWeight += decayWeight;
      bucket.count += 1;
      bucket.incidents[report.incident] = (bucket.incidents[report.incident] || 0) + 1;
    }
  }

  const result = {} as Record<'north-fob' | 'middle-fob' | 'south-fob', BridgeCongestionSnapshot>;
  const keys: ('north-fob' | 'middle-fob' | 'south-fob')[] = ['north-fob', 'middle-fob', 'south-fob'];

  for (const key of keys) {
    const bucket = initialAccumulator[key];
    const score = bucket.totalWeight > 0 ? Math.round(bucket.totalWeightedScore / bucket.totalWeight) : 25; // baseline moderate

    let status: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (score >= 85) status = 'CRITICAL';
    else if (score >= 65) status = 'HIGH';
    else if (score >= 40) status = 'MEDIUM';

    // Find most reported incident
    let primaryIssue: IncidentCategory = 'NORMAL_COMMUTE';
    let maxIncCount = 0;
    for (const [inc, count] of Object.entries(bucket.incidents)) {
      if (count > maxIncCount) {
        maxIncCount = count;
        primaryIssue = inc as IncidentCategory;
      }
    }

    result[key] = {
      bridgeId: key,
      bridgeName: bridgeNames[key],
      activeReportsCount: bucket.count,
      weightedScore: score,
      congestionStatus: status,
      primaryIssue,
      lastUpdated: new Date(currentTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return result;
}

/**
 * Authentic Dadar Station Accessibility Equipment Inventory
 */
export const DADAR_ACCESSIBILITY_EQUIPMENT: AccessibilityEquipment[] = [
  {
    id: 'eq-lift-01',
    type: 'LIFT',
    name: 'North FOB Lift - PF 1/2',
    locationDescription: 'North end of Platform 1/2 ascending to North FOB concourse',
    connectedPlatforms: [1, 2],
    connectedFob: 'north-fob',
    status: 'OPERATIONAL',
    lastInspected: 'Today, 06:00',
    wheelchairAccessible: true,
  },
  {
    id: 'eq-lift-02',
    type: 'LIFT',
    name: 'North FOB Lift - PF 3/4',
    locationDescription: 'Mid-north staircase of Platform 3/4 ascending to North FOB',
    connectedPlatforms: [3, 4],
    connectedFob: 'north-fob',
    status: 'OPERATIONAL',
    lastInspected: 'Today, 06:15',
    wheelchairAccessible: true,
  },
  {
    id: 'eq-esc-01',
    type: 'ESCALATOR',
    name: 'Middle FOB Escalator - PF 5 (Western Fast Up)',
    locationDescription: 'Platform 5 center pillar 11 ascending to Middle FOB',
    connectedPlatforms: [5],
    connectedFob: 'middle-fob',
    status: 'OPERATIONAL',
    lastInspected: 'Today, 07:30',
    wheelchairAccessible: false,
  },
  {
    id: 'eq-esc-02',
    type: 'ESCALATOR',
    name: 'Middle FOB Escalator - PF 8/9 (Central Fast Down)',
    locationDescription: 'Platform 8/9 center landing ascending to Middle FOB',
    connectedPlatforms: [8, 9],
    connectedFob: 'middle-fob',
    status: 'UNDER_MAINTENANCE',
    lastInspected: 'Today, 08:00 (Parts replacement)',
    wheelchairAccessible: false,
  },
  {
    id: 'eq-lift-03',
    type: 'LIFT',
    name: 'South FOB Lift - PF 13/14 (Central Terminal)',
    locationDescription: 'South concourse near Flower Market exit',
    connectedPlatforms: [13, 14],
    connectedFob: 'south-fob',
    status: 'OPERATIONAL',
    lastInspected: 'Today, 05:45',
    wheelchairAccessible: true,
  },
  {
    id: 'eq-ramp-01',
    type: 'RAMP',
    name: 'Tilak Flyover Grade Ramp',
    locationDescription: 'Connecting East & West concourse plazas to South FOB without stairs',
    connectedPlatforms: [1, 4, 10, 14],
    connectedFob: 'tilak-bridge',
    status: 'OPERATIONAL',
    lastInspected: 'Today, 04:00',
    wheelchairAccessible: true,
  },
];

/**
 * Emergency Contacts & Passenger Assistance Helpline Directory for Dadar Station
 */
export const DADAR_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'contact-rpf-139',
    designation: 'Security & Medical Emergency (RPF)',
    telephone: '139',
    description: 'Indian Railways National Security & Medical Emergency Hotline (24/7)',
    priority: 'EMERGENCY',
  },
  {
    id: 'contact-grp-dadar',
    designation: 'GRP Dadar Police Station',
    telephone: '+912224144455',
    description: 'Government Railway Police - Dadar Station on-site police station',
    priority: 'EMERGENCY',
  },
  {
    id: 'contact-sm-western',
    designation: 'Station Master (Western Railway)',
    telephone: '+912224221199',
    description: 'Platform 1-7 operations, emergency announcements, and platform flips',
    priority: 'ASSISTANCE',
  },
  {
    id: 'contact-sm-central',
    designation: 'Station Superintendent (Central Railway)',
    telephone: '+912224115588',
    description: 'Platform 8-14 operations, mainline expresses, and concourse crowd flow',
    priority: 'ASSISTANCE',
  },
  {
    id: 'contact-divyang-help',
    designation: 'Divyangjan & Senior Citizen Assistance',
    telephone: '1800111139',
    description: 'On-demand wheelchair porter and battery car assistance at Dadar',
    priority: 'ASSISTANCE',
  },
];
