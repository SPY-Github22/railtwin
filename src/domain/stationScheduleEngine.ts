/**
 * Suburban Station Timetable & Dynamic Platform Flip Engine
 * Manages upcoming departures, platform diversion alerts, and Fast vs Slow decision assistance
 */

import { RailwayLine } from './station.ts';

export type TrainSpeedCategory = 'FAST' | 'SLOW' | 'AC_FAST' | 'AC_SLOW';

export type TrainOperationalStatus = 'ON_TIME' | 'DELAYED' | 'PLATFORM_FLIPPED' | 'CANCELLED';

export interface TimetableEntry {
  id: string;
  trainNumber: string;
  destination: string;
  direction: 'UP' | 'DOWN'; // UP = Northbound (Borivali/Kalyan), DOWN = Southbound (Churchgate/CSMT)
  line: RailwayLine;
  speedCategory: TrainSpeedCategory;
  isAC: boolean;
  scheduledTime: string; // e.g. "08:44"
  expectedTime: string;
  delayMinutes: number;
  scheduledPlatform: number;
  actualPlatform: number;
  status: TrainOperationalStatus;
  carCount: 12 | 15;
}

export interface PlatformFlipEvent {
  id: string;
  trainNumber: string;
  destination: string;
  line: RailwayLine;
  oldPlatform: number;
  newPlatform: number;
  etaSeconds: number;
  urgency: 'HIGH' | 'CRITICAL';
  announcementText: string;
}

export interface FastVsSlowComparison {
  destination: string;
  fastTrain: {
    trainNumber: string;
    platform: number;
    leavesInMinutes: number;
    travelMinutes: number;
    totalTripMinutes: number;
  };
  slowTrain: {
    trainNumber: string;
    platform: number;
    leavesInMinutes: number;
    travelMinutes: number;
    totalTripMinutes: number;
  };
  recommendedChoice: 'FAST' | 'SLOW';
  timeDifferenceMinutes: number;
  adviceMessage: string;
}

/**
 * Authentic Dadar Peak-Hour Suburban Timetable Roster
 */
export const DADAR_TIMETABLE_ROSTER: TimetableEntry[] = [
  // Western Railway Up (Northbound)
  {
    id: 'tt-wr-01',
    trainNumber: '90451',
    destination: 'Borivali',
    direction: 'UP',
    line: 'WESTERN',
    speedCategory: 'FAST',
    isAC: false,
    scheduledTime: '08:44',
    expectedTime: '08:47',
    delayMinutes: 3,
    scheduledPlatform: 3,
    actualPlatform: 5, // PLATFORM FLIP EVENT!
    status: 'PLATFORM_FLIPPED',
    carCount: 12,
  },
  {
    id: 'tt-wr-02',
    trainNumber: '90453',
    destination: 'Virar',
    direction: 'UP',
    line: 'WESTERN',
    speedCategory: 'AC_FAST',
    isAC: true,
    scheduledTime: '08:48',
    expectedTime: '08:48',
    delayMinutes: 0,
    scheduledPlatform: 4,
    actualPlatform: 4,
    status: 'ON_TIME',
    carCount: 12,
  },
  {
    id: 'tt-wr-03',
    trainNumber: '90455',
    destination: 'Borivali',
    direction: 'UP',
    line: 'WESTERN',
    speedCategory: 'SLOW',
    isAC: false,
    scheduledTime: '08:42',
    expectedTime: '08:43',
    delayMinutes: 1,
    scheduledPlatform: 2,
    actualPlatform: 2,
    status: 'ON_TIME',
    carCount: 12,
  },
  {
    id: 'tt-wr-04',
    trainNumber: '90457',
    destination: 'Dahanu Road',
    direction: 'UP',
    line: 'WESTERN',
    speedCategory: 'FAST',
    isAC: false,
    scheduledTime: '08:52',
    expectedTime: '08:58',
    delayMinutes: 6,
    scheduledPlatform: 4,
    actualPlatform: 4,
    status: 'DELAYED',
    carCount: 15,
  },

  // Western Railway Down (Southbound - Churchgate)
  {
    id: 'tt-wr-05',
    trainNumber: '90382',
    destination: 'Churchgate',
    direction: 'DOWN',
    line: 'WESTERN',
    speedCategory: 'FAST',
    isAC: false,
    scheduledTime: '08:40',
    expectedTime: '08:41',
    delayMinutes: 1,
    scheduledPlatform: 3,
    actualPlatform: 3,
    status: 'ON_TIME',
    carCount: 15,
  },
  {
    id: 'tt-wr-06',
    trainNumber: '90384',
    destination: 'Churchgate',
    direction: 'DOWN',
    line: 'WESTERN',
    speedCategory: 'SLOW',
    isAC: false,
    scheduledTime: '08:45',
    expectedTime: '08:45',
    delayMinutes: 0,
    scheduledPlatform: 1,
    actualPlatform: 1,
    status: 'ON_TIME',
    carCount: 12,
  },

  // Central Railway Up (Northbound - Thane/Kalyan/Karjat)
  {
    id: 'tt-cr-01',
    trainNumber: '97103',
    destination: 'Kalyan',
    direction: 'UP',
    line: 'CENTRAL',
    speedCategory: 'SLOW',
    isAC: false,
    scheduledTime: '08:45',
    expectedTime: '08:45',
    delayMinutes: 0,
    scheduledPlatform: 9,
    actualPlatform: 9,
    status: 'ON_TIME',
    carCount: 12,
  },
  {
    id: 'tt-cr-02',
    trainNumber: '97105',
    destination: 'Karjat',
    direction: 'UP',
    line: 'CENTRAL',
    speedCategory: 'FAST',
    isAC: false,
    scheduledTime: '08:50',
    expectedTime: '08:54',
    delayMinutes: 4,
    scheduledPlatform: 11,
    actualPlatform: 11,
    status: 'DELAYED',
    carCount: 12,
  },
  {
    id: 'tt-cr-03',
    trainNumber: '97107',
    destination: 'Kasara',
    direction: 'UP',
    line: 'CENTRAL',
    speedCategory: 'AC_FAST',
    isAC: true,
    scheduledTime: '08:55',
    expectedTime: '08:55',
    delayMinutes: 0,
    scheduledPlatform: 10,
    actualPlatform: 10,
    status: 'ON_TIME',
    carCount: 12,
  },

  // Central Railway Down (Southbound - CSMT)
  {
    id: 'tt-cr-04',
    trainNumber: '97088',
    destination: 'CSMT',
    direction: 'DOWN',
    line: 'CENTRAL',
    speedCategory: 'FAST',
    isAC: false,
    scheduledTime: '08:43',
    expectedTime: '08:44',
    delayMinutes: 1,
    scheduledPlatform: 10,
    actualPlatform: 10,
    status: 'ON_TIME',
    carCount: 12,
  },
  {
    id: 'tt-cr-05',
    trainNumber: '97090',
    destination: 'CSMT',
    direction: 'DOWN',
    line: 'CENTRAL',
    speedCategory: 'SLOW',
    isAC: false,
    scheduledTime: '08:47',
    expectedTime: '08:47',
    delayMinutes: 0,
    scheduledPlatform: 8,
    actualPlatform: 8,
    status: 'ON_TIME',
    carCount: 12,
  },
];

/**
 * Detects any active Platform Flip events from the timetable roster
 */
export function detectPlatformFlipEvents(roster: TimetableEntry[] = DADAR_TIMETABLE_ROSTER): PlatformFlipEvent[] {
  return roster
    .filter((entry) => entry.status === 'PLATFORM_FLIPPED' && entry.scheduledPlatform !== entry.actualPlatform)
    .map((entry) => ({
      id: `flip-${entry.id}`,
      trainNumber: entry.trainNumber,
      destination: entry.destination,
      line: entry.line,
      oldPlatform: entry.scheduledPlatform,
      newPlatform: entry.actualPlatform,
      etaSeconds: Math.max(60, entry.delayMinutes * 60),
      urgency: 'CRITICAL',
      announcementText: `Attention passengers: Train #${entry.trainNumber} (${entry.destination} ${entry.speedCategory.replace('_', ' ')}) scheduled on Platform ${entry.scheduledPlatform} will now arrive on Platform ${entry.actualPlatform}!`,
    }));
}

/**
 * Calculates whether taking a slow train leaving immediately is faster than waiting for a delayed fast train
 */
export function evaluateFastVsSlowDecision(
  destination: 'Borivali' | 'Kalyan' = 'Borivali'
): FastVsSlowComparison {
  if (destination === 'Borivali') {
    // Dadar to Borivali standard runtimes: Fast = 24 mins, Slow = 36 mins
    const fastDelay = 7; // Fast train delayed by 7 mins
    const fastLeavesIn = 7;
    const fastTravel = 24;
    const fastTotal = fastLeavesIn + fastTravel; // 31 mins

    const slowLeavesIn = 1; // Slow train leaves in 1 min from PF 2
    const slowTravel = 34;
    const slowTotal = slowLeavesIn + slowTravel; // 35 mins

    // Suppose fast is delayed by 14 mins:
    // If fastLeavesIn = 14, total = 38 mins -> slow wins!
    const isSlowFaster = slowTotal < fastTotal;
    const diff = Math.abs(fastTotal - slowTotal);

    return {
      destination: 'Borivali',
      fastTrain: {
        trainNumber: '90451',
        platform: 3,
        leavesInMinutes: fastLeavesIn,
        travelMinutes: fastTravel,
        totalTripMinutes: fastTotal,
      },
      slowTrain: {
        trainNumber: '90455',
        platform: 2,
        leavesInMinutes: slowLeavesIn,
        travelMinutes: slowTravel,
        totalTripMinutes: slowTotal,
      },
      recommendedChoice: isSlowFaster ? 'SLOW' : 'FAST',
      timeDifferenceMinutes: diff,
      adviceMessage: isSlowFaster
        ? `Take the 08:42 Slow local from PF 2. Leaves in 1m and arrives ${diff} mins earlier than waiting for the delayed Fast local!`
        : `Stay on PF 3 for Fast Local. Despite ${fastDelay}m delay, it arrives ${diff} mins earlier than the Slow local.`,
    };
  }

  // Dadar to Kalyan
  const fastLeavesIn = 8;
  const fastTravel = 42;
  const fastTotal = fastLeavesIn + fastTravel; // 50 mins

  const slowLeavesIn = 1;
  const slowTravel = 54;
  const slowTotal = slowLeavesIn + slowTravel; // 55 mins

  return {
    destination: 'Kalyan',
    fastTrain: {
      trainNumber: '97105',
      platform: 11,
      leavesInMinutes: fastLeavesIn,
      travelMinutes: fastTravel,
      totalTripMinutes: fastTotal,
    },
    slowTrain: {
      trainNumber: '97103',
      platform: 9,
      leavesInMinutes: slowLeavesIn,
      travelMinutes: slowTravel,
      totalTripMinutes: slowTotal,
    },
    recommendedChoice: 'FAST',
    timeDifferenceMinutes: 5,
    adviceMessage: 'Wait for 08:50 Karjat Fast from PF 11. Arrives in Kalyan 5 mins earlier than the Slow train.',
  };
}
