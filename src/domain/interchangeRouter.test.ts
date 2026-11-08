import { describe, it, expect } from 'vitest';
import {
  calculateDetailedInterchangePath,
  FOB_ELEVATION_Y,
  PLATFORM_SURFACE_Y,
  getPlatformX,
} from './interchangeRouter';
import { DADAR_PLATFORMS } from './station';

describe('Dadar Interchange Route Dispatcher & Stampede Avoider', () => {
  it('guarantees valid navigable routes for all 14x14 platform transfer pairs', () => {
    DADAR_PLATFORMS.forEach((src) => {
      DADAR_PLATFORMS.forEach((dst) => {
        const route = calculateDetailedInterchangePath(src.number, dst.number);
        expect(route).toBeDefined();
        expect(route.sourcePlatform).toBe(src.number);
        expect(route.targetPlatform).toBe(dst.number);
        expect(route.estimatedWalkingMinutes).toBeGreaterThanOrEqual(0);
        expect(route.waypoints3D.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  it('handles same-platform case with zero walking minutes and platform standby guidance', () => {
    const sameRoute = calculateDetailedInterchangePath(4, 4);
    expect(sameRoute.estimatedWalkingMinutes).toBe(0);
    expect(sameRoute.distanceMeters).toBe(0);
    expect(sameRoute.reason).toContain('already on this platform');
    expect(sameRoute.waypoints3D).toHaveLength(1);
    expect(sameRoute.waypoints3D[0].y).toBe(PLATFORM_SURFACE_Y);
  });

  it('anti-stampede test: detours Western to Central commuters away from CHOKED Middle FOB to North FOB', () => {
    // Commuter arrives on PF 3 (Western Fast) and needs to transfer to PF 10 (Central Fast)
    const route = calculateDetailedInterchangePath(3, 10);

    // Middle FOB is CHOKED in the live data, while North FOB is FREE_FLOW
    expect(route.recommendedFob.id).toBe('north-fob');
    expect(route.recommendedFob.congestion).toBe('FREE_FLOW');
    expect(route.timeSavedMinutesVsChokedRoute).toBeGreaterThanOrEqual(2);
    expect(route.reason).toMatch(/Avoid|Recommended via North/);
  });

  it('constructs continuous 3D waypoints ascending to FOB elevation and descending to target platform', () => {
    const route = calculateDetailedInterchangePath(2, 9);
    const waypoints = route.waypoints3D;

    expect(waypoints.length).toBe(7);

    // Waypoint 1: Source platform ground surface
    expect(waypoints[0].x).toBeCloseTo(getPlatformX(2), 2);
    expect(waypoints[0].y).toBe(PLATFORM_SURFACE_Y);

    // Waypoint 3 & 4 & 5: Elevated bridge deck crossing
    expect(waypoints[2].y).toBeGreaterThanOrEqual(FOB_ELEVATION_Y);
    expect(waypoints[3].y).toBeGreaterThanOrEqual(FOB_ELEVATION_Y);
    expect(waypoints[4].y).toBeGreaterThanOrEqual(FOB_ELEVATION_Y);

    // Waypoint 7: Target platform ground surface
    expect(waypoints[6].x).toBeCloseTo(getPlatformX(9), 2);
    expect(waypoints[6].y).toBe(PLATFORM_SURFACE_Y);
  });

  it('accurately distinguishes cross-system transfers between Western and Central sides', () => {
    // Western (PF 1) to Central (PF 14) is the widest physical traverse in Dadar (~55+ units)
    const crossSystemRoute = calculateDetailedInterchangePath(1, 14);
    expect(crossSystemRoute.distanceMeters).toBeGreaterThan(200);
    expect(crossSystemRoute.estimatedWalkingMinutes).toBeGreaterThanOrEqual(3);
  });
});
