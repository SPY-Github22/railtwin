/**
 * Suburban EMU Train Rake & Coach Alignment Engine
 * Simulates real-world Mumbai Suburban EMU dynamics at Dadar Junction
 */

import { RailwayLine, CoachInfo, generateSuburbanRake } from './station.ts';

export type TrainLifecycle = 'APPROACHING' | 'HALTED' | 'DEPARTING' | 'CLEAR';

export interface ActiveTrainState {
  id: string;
  trainNumber: string;
  destination: string;
  line: RailwayLine;
  platformNumber: number;
  speedType: 'FAST' | 'SLOW' | 'AC_FAST' | 'AC_SLOW';
  isAC: boolean;
  carCount: 12 | 15;
  coaches: CoachInfo[];

  // Dynamic Telemetry
  lifecycle: TrainLifecycle;
  positionZ: number; // 3D coordinates along track (-70 to +70)
  targetStopZ: number; // Standstill position (0 = centered on platform)
  currentSpeedKmH: number;
  haltSecondsRemaining: number; // Boarding countdown
  totalHaltSeconds: number;
  nextEtaSeconds: number; // For CLEAR state
}

export interface CoachPillarMapping {
  coachPosition: number;
  coachCode: string;
  coachClass: string;
  displayName: string;
  colorHex: string;
  targetPillar: number; // Pillar 1 (South) to 24 (North)
  fobProximity: 'North FOB' | 'Middle FOB' | 'South FOB';
  walkingAdvice: string;
}

/**
 * Standard Dadar Junction Active Trains Roster (Western & Central Lines)
 */
export const INITIAL_TRAIN_ROSTER: ActiveTrainState[] = [
  // Western Railway Platforms
  {
    id: 'WR-BOR-0842',
    trainNumber: '90451',
    destination: 'Borivali',
    line: 'WESTERN',
    platformNumber: 2,
    speedType: 'SLOW',
    isAC: false,
    carCount: 12,
    coaches: generateSuburbanRake(12, false),
    lifecycle: 'APPROACHING',
    positionZ: -48,
    targetStopZ: 0,
    currentSpeedKmH: 28,
    haltSecondsRemaining: 25,
    totalHaltSeconds: 25,
    nextEtaSeconds: 0,
  },
  {
    id: 'WR-CCG-0840',
    trainNumber: '90382',
    destination: 'Churchgate',
    line: 'WESTERN',
    platformNumber: 3,
    speedType: 'FAST',
    isAC: false,
    carCount: 15,
    coaches: generateSuburbanRake(15, false),
    lifecycle: 'HALTED',
    positionZ: 0,
    targetStopZ: 0,
    currentSpeedKmH: 0,
    haltSecondsRemaining: 18,
    totalHaltSeconds: 30,
    nextEtaSeconds: 0,
  },
  {
    id: 'WR-VR-AC-0846',
    trainNumber: '94009',
    destination: 'Virar AC',
    line: 'WESTERN',
    platformNumber: 4,
    speedType: 'AC_FAST',
    isAC: true,
    carCount: 12,
    coaches: generateSuburbanRake(12, true),
    lifecycle: 'CLEAR',
    positionZ: -100,
    targetStopZ: 0,
    currentSpeedKmH: 0,
    haltSecondsRemaining: 0,
    totalHaltSeconds: 25,
    nextEtaSeconds: 140, // 2 mins 20s away
  },

  // Central Railway Platforms
  {
    id: 'CR-KYN-0845',
    trainNumber: '97103',
    destination: 'Kalyan',
    line: 'CENTRAL',
    platformNumber: 9,
    speedType: 'SLOW',
    isAC: false,
    carCount: 12,
    coaches: generateSuburbanRake(12, false),
    lifecycle: 'APPROACHING',
    positionZ: -35,
    targetStopZ: 0,
    currentSpeedKmH: 22,
    haltSecondsRemaining: 25,
    totalHaltSeconds: 25,
    nextEtaSeconds: 0,
  },
  {
    id: 'CR-CSMT-0843',
    trainNumber: '97088',
    destination: 'CSMT',
    line: 'CENTRAL',
    platformNumber: 10,
    speedType: 'FAST',
    isAC: false,
    carCount: 12,
    coaches: generateSuburbanRake(12, false),
    lifecycle: 'HALTED',
    positionZ: 0,
    targetStopZ: 0,
    currentSpeedKmH: 0,
    haltSecondsRemaining: 12,
    totalHaltSeconds: 25,
    nextEtaSeconds: 0,
  },
];

/**
 * Calculates exact platform physical pillar alignment for any coach on a train
 */
export function calculateCoachPillarMapping(
  train: ActiveTrainState,
  coachPosition: number
): CoachPillarMapping {
  // Defensive normalization against NaN, negative, and overflow inputs
  const total = Math.max(1, train.carCount);
  const validCoachPos = Number.isFinite(coachPosition)
    ? Math.max(1, Math.min(total, Math.round(coachPosition)))
    : 1;

  const coach = train.coaches.find((c) => c.position === validCoachPos) || train.coaches[0];

  // Platform has 24 pillars from South (Pillar 1) to North (Pillar 24)
  const targetPillar = Math.max(1, Math.min(24, Math.round((validCoachPos / total) * 23) + 1));

  // Determine which Foot Overbridge the coach halts nearest to
  let fobProximity: 'North FOB' | 'Middle FOB' | 'South FOB';
  let walkingAdvice: string;

  if (targetPillar <= 8) {
    fobProximity = 'South FOB';
    walkingAdvice = 'Stand near the South FOB staircase (Pillars 4–7) for direct boarding.';
  } else if (targetPillar <= 16) {
    fobProximity = 'Middle FOB';
    walkingAdvice = 'Halt zone is right under Middle FOB. Expect dense crowd rush; board from rear door.';
  } else {
    fobProximity = 'North FOB';
    walkingAdvice = 'Near North FOB ramps/escalator (Pillars 18–22). Clearest boarding flow.';
  }

  return {
    coachPosition: coach.position,
    coachCode: coach.coachCode,
    coachClass: coach.coachClass,
    displayName: coach.displayName,
    colorHex: coach.colorHex,
    targetPillar,
    fobProximity,
    walkingAdvice,
  };
}

/**
 * Executes a single discrete physics integration step (dt <= 1.0)
 */
function advanceSingleStep(train: ActiveTrainState, dt: number): ActiveTrainState {
  const updated = { ...train };

  switch (updated.lifecycle) {
    case 'APPROACHING': {
      const distanceRemaining = Math.abs(updated.positionZ - updated.targetStopZ);
      if (distanceRemaining < 0.4) {
        updated.positionZ = updated.targetStopZ;
        updated.currentSpeedKmH = 0;
        updated.lifecycle = 'HALTED';
        updated.haltSecondsRemaining = updated.totalHaltSeconds;
      } else {
        const speedMultiplier = Math.max(0.2, distanceRemaining / 20);
        const step = 8 * speedMultiplier * dt;
        updated.positionZ = Math.min(updated.targetStopZ, updated.positionZ + step);
        updated.currentSpeedKmH = Math.round(speedMultiplier * 35);
      }
      break;
    }

    case 'HALTED': {
      updated.haltSecondsRemaining = Math.max(0, updated.haltSecondsRemaining - dt);
      if (updated.haltSecondsRemaining <= 0) {
        updated.lifecycle = 'DEPARTING';
        updated.currentSpeedKmH = 10;
      }
      break;
    }

    case 'DEPARTING': {
      const step = 14 * dt;
      updated.positionZ += step;
      updated.currentSpeedKmH = Math.min(45, updated.currentSpeedKmH + 15 * dt);

      if (updated.positionZ > 65) {
        updated.lifecycle = 'CLEAR';
        updated.positionZ = -100;
        updated.nextEtaSeconds = 90;
        updated.currentSpeedKmH = 0;
      }
      break;
    }

    case 'CLEAR': {
      updated.nextEtaSeconds = Math.max(0, updated.nextEtaSeconds - dt);
      if (updated.nextEtaSeconds <= 0) {
        updated.lifecycle = 'APPROACHING';
        updated.positionZ = -55;
        updated.currentSpeedKmH = 32;
        updated.haltSecondsRemaining = updated.totalHaltSeconds;
      }
      break;
    }
  }

  return updated;
}

/**
 * Updates train telemetry frame-by-frame with defensive delta bounds and multi-stepping
 */
export function advanceTrainPhysics(
  train: ActiveTrainState,
  deltaSeconds: number
): ActiveTrainState {
  // Guard against NaN, Infinity, negative delta, or zero
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return { ...train };
  }

  // If delta is small (normal render loop ~0.2s), advance in single step
  if (deltaSeconds <= 1.0) {
    return advanceSingleStep(train, deltaSeconds);
  }

  // Multi-step sub-stepping for phone wake-up / background catch-up
  // Cap cumulative advancement at 60s to prevent browser hang
  const cappedDelta = Math.min(60, deltaSeconds);
  const stepSize = 0.5;
  let current = { ...train };
  let remaining = cappedDelta;

  while (remaining > 0) {
    const dt = Math.min(stepSize, remaining);
    current = advanceSingleStep(current, dt);
    remaining -= dt;
  }

  return current;
}
