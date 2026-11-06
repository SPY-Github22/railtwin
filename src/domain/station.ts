/**
 * Domain Models for Dadar Junction (Mumbai) Spatial Monitoring
 */

export type RailwayLine = 'WESTERN' | 'CENTRAL';

export type CoachClass = 
  | 'LADIES_SECOND' 
  | 'LADIES_FIRST' 
  | 'FIRST_CLASS' 
  | 'GENERAL_SECOND' 
  | 'AC_LOCAL' 
  | 'DIVYANGJAN';

export interface CoachInfo {
  position: number; // 1 to 12 or 1 to 15
  coachCode: string; // e.g., "GS", "L", "FC", "AC"
  coachClass: CoachClass;
  displayName: string;
  colorHex: string;
  approxPillarMarker: number; // Relative platform pillar (1 to 24)
}

export interface Platform {
  id: number; // 1 to 14
  number: number;
  line: RailwayLine;
  side: 'WEST' | 'EAST';
  lengthMeters: number; // typically ~300m for 12/15 car suburban rakes
  currentStatus: 'IDLE' | 'TRAIN_ARRIVING' | 'TRAIN_HALTED' | 'TRAIN_DEPARTED';
  activeTrainId?: string;
  amenities: {
    hasLift: boolean;
    hasEscalator: boolean;
    hasWaterKiosk: boolean;
    hasJanAahaar: boolean;
  };
}

export type CongestionLevel = 'FREE_FLOW' | 'MODERATE' | 'CHOKED';

export interface FootOverbridge {
  id: string; // 'north-fob' | 'middle-fob' | 'south-fob'
  name: string;
  connectedPlatforms: number[]; // e.g., [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  widthMeters: number;
  averageCrossSeconds: number;
  congestion: CongestionLevel;
  lastUpdated: string;
  hasEscalatorAccess: boolean;
  hasRampAccess: boolean;
}

export interface TrainSchedule {
  id: string;
  trainNumber: string;
  destination: string;
  speedType: 'FAST' | 'SLOW' | 'AC_FAST' | 'AC_SLOW';
  line: RailwayLine;
  platformNumber: number;
  expectedTime: string;
  etaSeconds: number;
  carCount: 12 | 15;
  coaches: CoachInfo[];
}

export interface InterchangeRoute {
  sourcePlatform: number;
  targetPlatform: number;
  recommendedFobId: string;
  estimatedWalkingMinutes: number;
  alternateFobId?: string;
  crowdCaution: boolean;
}

/**
 * Standard 12-Coach Suburban EMU Composition Pattern for Mumbai
 */
export function generateSuburbanRake(carCount: 12 | 15, isAC = false): CoachInfo[] {
  const coaches: CoachInfo[] = [];
  const total = carCount;

  for (let i = 1; i <= total; i++) {
    const pillarMarker = Math.round((i / total) * 24);

    if (isAC) {
      coaches.push({
        position: i,
        coachCode: `AC-${i}`,
        coachClass: 'AC_LOCAL',
        displayName: 'AC Chair/General',
        colorHex: '#06B6D4',
        approxPillarMarker: pillarMarker,
      });
      continue;
    }

    // Standard Non-AC Suburban EMU Rake Demarcation
    if (i === 1 || i === total) {
      // Motor coach with Luggage/Disabled/General
      coaches.push({
        position: i,
        coachCode: 'SLR/GEN',
        coachClass: 'DIVYANGJAN',
        displayName: 'Disabled & General',
        colorHex: '#F59E0B',
        approxPillarMarker: pillarMarker,
      });
    } else if (i === 2 || i === total - 1 || i === Math.floor(total / 2)) {
      // Ladies coaches
      coaches.push({
        position: i,
        coachCode: 'LADIES',
        coachClass: 'LADIES_SECOND',
        displayName: 'Ladies Second Class',
        colorHex: '#EC4899',
        approxPillarMarker: pillarMarker,
      });
    } else if (i === 4 || i === total - 3) {
      // First Class
      coaches.push({
        position: i,
        coachCode: 'FC',
        coachClass: 'FIRST_CLASS',
        displayName: 'First Class',
        colorHex: '#EF4444',
        approxPillarMarker: pillarMarker,
      });
    } else {
      // General Second Class
      coaches.push({
        position: i,
        coachCode: 'GEN',
        coachClass: 'GENERAL_SECOND',
        displayName: 'General Second Class',
        colorHex: '#8B5CF6',
        approxPillarMarker: pillarMarker,
      });
    }
  }

  return coaches;
}

/**
 * Dadar Junction Official Platform Configuration
 */
export const DADAR_PLATFORMS: Platform[] = [
  // Western Railway Platforms (1 to 7)
  { id: 1, number: 1, line: 'WESTERN', side: 'WEST', lengthMeters: 300, currentStatus: 'IDLE', amenities: { hasLift: true, hasEscalator: true, hasWaterKiosk: true, hasJanAahaar: true } },
  { id: 2, number: 2, line: 'WESTERN', side: 'WEST', lengthMeters: 300, currentStatus: 'TRAIN_ARRIVING', activeTrainId: 'WR-BOR-0842', amenities: { hasLift: false, hasEscalator: true, hasWaterKiosk: true, hasJanAahaar: false } },
  { id: 3, number: 3, line: 'WESTERN', side: 'WEST', lengthMeters: 320, currentStatus: 'TRAIN_HALTED', activeTrainId: 'WR-CCG-0840', amenities: { hasLift: true, hasEscalator: true, hasWaterKiosk: true, hasJanAahaar: true } },
  { id: 4, number: 4, line: 'WESTERN', side: 'WEST', lengthMeters: 320, currentStatus: 'IDLE', amenities: { hasLift: false, hasEscalator: false, hasWaterKiosk: true, hasJanAahaar: false } },
  { id: 5, number: 5, line: 'WESTERN', side: 'WEST', lengthMeters: 350, currentStatus: 'IDLE', amenities: { hasLift: true, hasEscalator: true, hasWaterKiosk: true, hasJanAahaar: true } },
  { id: 6, number: 6, line: 'WESTERN', side: 'WEST', lengthMeters: 350, currentStatus: 'IDLE', amenities: { hasLift: false, hasEscalator: false, hasWaterKiosk: false, hasJanAahaar: false } },
  { id: 7, number: 7, line: 'WESTERN', side: 'WEST', lengthMeters: 350, currentStatus: 'IDLE', amenities: { hasLift: false, hasEscalator: false, hasWaterKiosk: false, hasJanAahaar: false } },

  // Central Railway Platforms (8 to 14)
  { id: 8, number: 8, line: 'CENTRAL', side: 'EAST', lengthMeters: 300, currentStatus: 'IDLE', amenities: { hasLift: true, hasEscalator: true, hasWaterKiosk: true, hasJanAahaar: true } },
  { id: 9, number: 9, line: 'CENTRAL', side: 'EAST', lengthMeters: 300, currentStatus: 'TRAIN_ARRIVING', activeTrainId: 'CR-KYN-0845', amenities: { hasLift: false, hasEscalator: true, hasWaterKiosk: true, hasJanAahaar: false } },
  { id: 10, number: 10, line: 'CENTRAL', side: 'EAST', lengthMeters: 320, currentStatus: 'IDLE', amenities: { hasLift: true, hasEscalator: true, hasWaterKiosk: true, hasJanAahaar: true } },
  { id: 11, number: 11, line: 'CENTRAL', side: 'EAST', lengthMeters: 320, currentStatus: 'IDLE', amenities: { hasLift: false, hasEscalator: false, hasWaterKiosk: true, hasJanAahaar: false } },
  { id: 12, number: 12, line: 'CENTRAL', side: 'EAST', lengthMeters: 350, currentStatus: 'IDLE', amenities: { hasLift: true, hasEscalator: false, hasWaterKiosk: true, hasJanAahaar: false } },
  { id: 13, number: 13, line: 'CENTRAL', side: 'EAST', lengthMeters: 350, currentStatus: 'IDLE', amenities: { hasLift: false, hasEscalator: false, hasWaterKiosk: false, hasJanAahaar: false } },
  { id: 14, number: 14, line: 'CENTRAL', side: 'EAST', lengthMeters: 350, currentStatus: 'IDLE', amenities: { hasLift: false, hasEscalator: false, hasWaterKiosk: false, hasJanAahaar: false } },
];

/**
 * Dadar Foot Overbridges (Connecting WR and CR)
 */
export const DADAR_FOBS: FootOverbridge[] = [
  {
    id: 'north-fob',
    name: 'North Foot Overbridge (Ramp & Escalator)',
    connectedPlatforms: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    widthMeters: 8,
    averageCrossSeconds: 150,
    congestion: 'FREE_FLOW',
    lastUpdated: 'Just now',
    hasEscalatorAccess: true,
    hasRampAccess: true,
  },
  {
    id: 'middle-fob',
    name: 'Central Main Foot Overbridge (High Traffic)',
    connectedPlatforms: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    widthMeters: 6,
    averageCrossSeconds: 380,
    congestion: 'CHOKED',
    lastUpdated: '1 min ago',
    hasEscalatorAccess: true,
    hasRampAccess: false,
  },
  {
    id: 'south-fob',
    name: 'South Foot Overbridge (Tilak Bridge End)',
    connectedPlatforms: [1, 2, 3, 4, 8, 9, 10],
    widthMeters: 5,
    averageCrossSeconds: 210,
    congestion: 'MODERATE',
    lastUpdated: '2 mins ago',
    hasEscalatorAccess: false,
    hasRampAccess: false,
  },
];

/**
 * Route Dispatcher Logic: Calculates optimal bridge between two platforms
 */
export function calculateInterchangeRoute(sourcePf: number, targetPf: number): InterchangeRoute {
  // Find valid FOBs connecting both source and target platforms
  const connectingFobs = DADAR_FOBS.filter(
    (fob) => fob.connectedPlatforms.includes(sourcePf) && fob.connectedPlatforms.includes(targetPf)
  );

  if (connectingFobs.length === 0) {
    // Default fallback to North FOB which connects all platforms 1 to 14
    return {
      sourcePlatform: sourcePf,
      targetPlatform: targetPf,
      recommendedFobId: 'north-fob',
      estimatedWalkingMinutes: 6,
      crowdCaution: false,
    };
  }

  // Prioritize FREE_FLOW over MODERATE over CHOKED
  const rank: Record<CongestionLevel, number> = {
    FREE_FLOW: 1,
    MODERATE: 2,
    CHOKED: 3,
  };

  const sortedFobs = [...connectingFobs].sort((a, b) => rank[a.congestion] - rank[b.congestion]);
  const bestFob = sortedFobs[0];
  const alternateFob = sortedFobs.length > 1 ? sortedFobs[1] : undefined;

  const walkingMinutes = Math.ceil(bestFob.averageCrossSeconds / 60);

  return {
    sourcePlatform: sourcePf,
    targetPlatform: targetPf,
    recommendedFobId: bestFob.id,
    estimatedWalkingMinutes: walkingMinutes,
    alternateFobId: alternateFob?.id,
    crowdCaution: bestFob.congestion === 'CHOKED',
  };
}
