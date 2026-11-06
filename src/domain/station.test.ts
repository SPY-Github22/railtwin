import { describe, it, expect } from 'vitest';
import {
  DADAR_PLATFORMS,
  DADAR_FOBS,
  generateSuburbanRake,
  calculateInterchangeRoute,
} from './station';

describe('Daily Commuter Reality Checks: Dadar Station Domain', () => {
  it('correctly maps 14 platforms between Western (1-7) and Central (8-14) lines', () => {
    expect(DADAR_PLATFORMS).toHaveLength(14);

    const westernPlatforms = DADAR_PLATFORMS.filter((p) => p.line === 'WESTERN');
    const centralPlatforms = DADAR_PLATFORMS.filter((p) => p.line === 'CENTRAL');

    expect(westernPlatforms.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(centralPlatforms.map((p) => p.number)).toEqual([8, 9, 10, 11, 12, 13, 14]);

    // Check Western platforms are labeled West and Central are East
    westernPlatforms.forEach((p) => expect(p.side).toBe('WEST'));
    centralPlatforms.forEach((p) => expect(p.side).toBe('EAST'));
  });

  it('guarantees North FOB connects all 14 platforms for full cross-station connectivity', () => {
    const northFob = DADAR_FOBS.find((f) => f.id === 'north-fob');
    expect(northFob).toBeDefined();
    expect(northFob?.connectedPlatforms).toHaveLength(14);
    for (let i = 1; i <= 14; i++) {
      expect(northFob?.connectedPlatforms).toContain(i);
    }
  });

  it('generates authentic 12-coach suburban EMU rake with accurate coach demarcations', () => {
    const rake12 = generateSuburbanRake(12, false);
    expect(rake12).toHaveLength(12);

    // Motor coach / Disabled coach at ends
    expect(rake12[0].coachClass).toBe('DIVYANGJAN');
    expect(rake12[11].coachClass).toBe('DIVYANGJAN');

    // Ladies coaches
    const ladiesCoaches = rake12.filter((c) => c.coachClass === 'LADIES_SECOND');
    expect(ladiesCoaches.length).toBeGreaterThanOrEqual(2);

    // First class coaches
    const firstClassCoaches = rake12.filter((c) => c.coachClass === 'FIRST_CLASS');
    expect(firstClassCoaches.length).toBeGreaterThanOrEqual(1);

    // Pillars span 1 to 24 along the 300m platform
    expect(rake12[0].approxPillarMarker).toBeGreaterThan(0);
    expect(rake12[11].approxPillarMarker).toBeLessThanOrEqual(24);
  });

  it('generates AC EMU rake with all coaches designated as AC_LOCAL', () => {
    const acRake = generateSuburbanRake(12, true);
    expect(acRake).toHaveLength(12);
    acRake.forEach((c) => {
      expect(c.coachClass).toBe('AC_LOCAL');
      expect(c.colorHex).toBe('#06B6D4');
    });
  });

  it('prevents commuter stampede: diverts transfer route away from CHOKED bridge', () => {
    // Scenario: Commuter transfers from PF 3 (Western) to PF 10 (Central)
    // Middle FOB connects both PF 3 and PF 10, BUT is currently CHOKED!
    const middleFob = DADAR_FOBS.find((f) => f.id === 'middle-fob');
    expect(middleFob?.congestion).toBe('CHOKED');

    // The interchange router must steer the commuter to North FOB which is FREE_FLOW
    const route = calculateInterchangeRoute(3, 10);
    expect(route.sourcePlatform).toBe(3);
    expect(route.targetPlatform).toBe(10);
    expect(route.recommendedFobId).toBe('north-fob');
    expect(route.crowdCaution).toBe(false);
    expect(route.estimatedWalkingMinutes).toBeLessThanOrEqual(3);
  });

  it('properly validates accessibility features for disabled and senior commuters', () => {
    const platformsWithLifts = DADAR_PLATFORMS.filter((p) => p.amenities.hasLift);
    const platformsWithEscalators = DADAR_PLATFORMS.filter((p) => p.amenities.hasEscalator);

    expect(platformsWithLifts.length).toBeGreaterThan(0);
    expect(platformsWithEscalators.length).toBeGreaterThan(0);

    // North FOB must have wheelchair ramp access
    const northFob = DADAR_FOBS.find((f) => f.id === 'north-fob');
    expect(northFob?.hasRampAccess).toBe(true);
  });
});
