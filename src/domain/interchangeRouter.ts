/**
 * Interchange Route Dispatcher & Stampede Avoidance Engine
 * Calculates optimal walking paths and 3D waypoints across Dadar Junction platforms via Foot Overbridges
 */

import { DADAR_PLATFORMS, DADAR_FOBS, FootOverbridge, CongestionLevel } from './station.ts';

export interface RouteWaypoint3D {
  x: number;
  y: number;
  z: number;
  label?: string;
}

export interface DetailedRoute {
  sourcePlatform: number;
  targetPlatform: number;
  recommendedFob: FootOverbridge;
  alternateFob?: FootOverbridge;
  estimatedWalkingMinutes: number;
  distanceMeters: number;
  crowdCaution: boolean;
  timeSavedMinutesVsChokedRoute: number;
  reason: string;
  waypoints3D: RouteWaypoint3D[];
}

// 3D coordinate helper functions matching DadarStationCanvas geometry
export const getPlatformX = (pfNum: number): number => {
  if (pfNum <= 7) {
    return -28 + (pfNum - 1) * 3.8;
  } else {
    return 5 + (pfNum - 8) * 3.8;
  }
};

export const FOB_Z_POSITIONS: Record<string, number> = {
  'north-fob': -22,
  'middle-fob': 0,
  'south-fob': 22,
};

export const FOB_ELEVATION_Y = 5.2;
export const PLATFORM_SURFACE_Y = 1.0;

/**
 * Calculates complete commuter interchange route with 3D path waypoints
 */
export function calculateDetailedInterchangePath(
  sourcePfNum: number,
  targetPfNum: number
): DetailedRoute {
  const sourcePf = DADAR_PLATFORMS.find((p) => p.number === sourcePfNum);
  const targetPf = DADAR_PLATFORMS.find((p) => p.number === targetPfNum);

  if (!sourcePf || !targetPf) {
    throw new Error(`Invalid platform selection: ${sourcePfNum} -> ${targetPfNum}`);
  }

  // Same platform case
  if (sourcePfNum === targetPfNum) {
    const px = getPlatformX(sourcePfNum);
    return {
      sourcePlatform: sourcePfNum,
      targetPlatform: targetPfNum,
      recommendedFob: DADAR_FOBS[0],
      estimatedWalkingMinutes: 0,
      distanceMeters: 0,
      crowdCaution: false,
      timeSavedMinutesVsChokedRoute: 0,
      reason: 'You are already on this platform. Wait at your coach pillar marker.',
      waypoints3D: [
        { x: px, y: PLATFORM_SURFACE_Y, z: 0, label: `Platform ${sourcePfNum} Surface` },
      ],
    };
  }

  // Filter connecting bridges
  const connectingFobs = DADAR_FOBS.filter(
    (fob) =>
      fob.connectedPlatforms.includes(sourcePfNum) && fob.connectedPlatforms.includes(targetPfNum)
  );

  const fallbackFob = DADAR_FOBS.find((f) => f.id === 'north-fob') || DADAR_FOBS[0];
  const candidates = connectingFobs.length > 0 ? connectingFobs : [fallbackFob];

  // Congestion rank & transit time weight
  const congestionWeights: Record<CongestionLevel, number> = {
    FREE_FLOW: 1.0,
    MODERATE: 1.6,
    CHOKED: 3.2,
  };

  // Evaluate each bridge
  interface EvaluatedFob {
    fob: FootOverbridge;
    rawDistance: number;
    weightedTimeSeconds: number;
  }

  const evaluated: EvaluatedFob[] = candidates.map((fob) => {
    const sx = getPlatformX(sourcePfNum);
    const tx = getPlatformX(targetPfNum);
    const zPos = FOB_Z_POSITIONS[fob.id] ?? 0;

    // Lateral distance across tracks (scaled: 1 unit ~ 5 meters)
    const lateralMeters = Math.abs(tx - sx) * 5;
    // Vertical climb stairs (approx 5 meters up + 5 meters down)
    const verticalMeters = 10;
    // Longitudinal walk to bridge
    const approachMeters = Math.abs(zPos) * 2;

    const rawDistance = Math.round(lateralMeters + verticalMeters + approachMeters);
    const baseWalkSeconds = (rawDistance / 1.3); // average walking speed 1.3 m/s
    const weightedTimeSeconds = Math.round(baseWalkSeconds * congestionWeights[fob.congestion]);

    return {
      fob,
      rawDistance,
      weightedTimeSeconds,
    };
  });

  // Sort by weighted transit time (least congested + shortest)
  evaluated.sort((a, b) => a.weightedTimeSeconds - b.weightedTimeSeconds);

  const best = evaluated[0];
  const worst = evaluated[evaluated.length - 1];
  const alternate = evaluated.length > 1 ? evaluated[1].fob : undefined;

  const estimatedMinutes = Math.max(1, Math.ceil(best.weightedTimeSeconds / 60));
  const worstMinutes = Math.ceil(worst.weightedTimeSeconds / 60);
  const timeSaved = Math.max(0, worstMinutes - estimatedMinutes);

  // Generate 3D Waypoint Path
  const sx = getPlatformX(sourcePfNum);
  const tx = getPlatformX(targetPfNum);
  const fz = FOB_Z_POSITIONS[best.fob.id] ?? 0;

  const waypoints3D: RouteWaypoint3D[] = [
    // 1. Source platform ground level
    {
      x: sx,
      y: PLATFORM_SURFACE_Y,
      z: fz + 4,
      label: `PF ${sourcePfNum} Stairs Entry`,
    },
    // 2. Midway up staircase
    {
      x: sx,
      y: (PLATFORM_SURFACE_Y + FOB_ELEVATION_Y) / 2,
      z: fz + 2,
      label: 'Staircase Climb',
    },
    // 3. Top of stairs onto FOB deck
    {
      x: sx,
      y: FOB_ELEVATION_Y + 0.1,
      z: fz,
      label: `${best.fob.name} Deck`,
    },
    // 4. Midway across bridge deck
    {
      x: (sx + tx) / 2,
      y: FOB_ELEVATION_Y + 0.1,
      z: fz,
      label: 'Overhead Bridge Deck',
    },
    // 5. Above target platform stairs
    {
      x: tx,
      y: FOB_ELEVATION_Y + 0.1,
      z: fz,
      label: `PF ${targetPfNum} Stair Exit`,
    },
    // 6. Midway down staircase
    {
      x: tx,
      y: (PLATFORM_SURFACE_Y + FOB_ELEVATION_Y) / 2,
      z: fz + 2,
      label: 'Descending Stairs',
    },
    // 7. Target platform arrival surface
    {
      x: tx,
      y: PLATFORM_SURFACE_Y,
      z: fz + 4,
      label: `PF ${targetPfNum} Arrival`,
    },
  ];

  // Craft clear commuter guidance reason
  let reason = `Take ${best.fob.name}. Cleanest flow to Platform ${targetPfNum}.`;
  if (best.fob.hasRampAccess) {
    reason = `Recommended via ${best.fob.name}: Wheelchair ramp & escalator available, lowest friction transfer.`;
  }
  if (best.fob.congestion === 'FREE_FLOW' && worst.fob.congestion === 'CHOKED') {
    reason = `Avoid ${worst.fob.name} (Severe crush crowd). Taking ${best.fob.name} saves ~${timeSaved} minutes!`;
  }

  return {
    sourcePlatform: sourcePfNum,
    targetPlatform: targetPfNum,
    recommendedFob: best.fob,
    alternateFob: alternate,
    estimatedWalkingMinutes: estimatedMinutes,
    distanceMeters: best.rawDistance,
    crowdCaution: best.fob.congestion === 'CHOKED',
    timeSavedMinutesVsChokedRoute: timeSaved,
    reason,
    waypoints3D,
  };
}
