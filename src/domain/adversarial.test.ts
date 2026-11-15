import { describe, it, expect } from 'vitest';
import {
  calculateDetailedInterchangePath,
  getPlatformX,
} from './interchangeRouter.ts';
import {
  generateSuburbanRake,
  calculateInterchangeRoute,
} from './station.ts';
import {
  calculateCoachPillarMapping,
  advanceTrainPhysics,
  INITIAL_TRAIN_ROSTER,
  ActiveTrainState,
} from './trainRakeEngine.ts';
import {
  detectPlatformFlipEvents,
  evaluateFastVsSlowDecision,
  TimetableEntry,
} from './stationScheduleEngine.ts';

describe('Adversarial Red-Team Stress Test Matrix', () => {
  describe('Vector 1: Numeric Boundaries & Type Extremes', () => {
    it('handles negative, zero, and out-of-range platform queries', () => {
      // Expect throw or safe fallback, NOT silent undefined or NaN crash
      expect(() => calculateDetailedInterchangePath(-1, 5)).toThrow();
      expect(() => calculateDetailedInterchangePath(0, 10)).toThrow();
      expect(() => calculateDetailedInterchangePath(15, 2)).toThrow();
      expect(() => calculateDetailedInterchangePath(99999, 1)).toThrow();
    });

    it('probes NaN and Infinity inputs in interchange pathfinding', () => {
      expect(() => calculateDetailedInterchangePath(NaN, 5)).toThrow();
      expect(() => calculateDetailedInterchangePath(3, Infinity)).toThrow();
    });

    it('probes getPlatformX boundary behavior', () => {
      const xNeg = getPlatformX(-10);
      const xZero = getPlatformX(0);
      const xOverflow = getPlatformX(999);
      const xNaN = getPlatformX(NaN);

      // Clamped to platform 1 (-28) and platform 14 (27.8)
      expect(xNeg).toBe(-28);
      expect(xZero).toBe(-28);
      expect(xOverflow).toBeCloseTo(27.8, 1);
      expect(xNaN).toBe(-28);
    });

    it('probes coach pillar mapping with hostile indices (0, negative, overflow, NaN)', () => {
      const train = INITIAL_TRAIN_ROSTER[0];

      // Coach 0: should clamp to coach 1 and return safe boundary
      const mappingZero = calculateCoachPillarMapping(train, 0);
      expect(mappingZero.targetPillar).toBeGreaterThanOrEqual(1);
      expect(mappingZero.targetPillar).toBeLessThanOrEqual(24);

      // Negative coach
      const mappingNeg = calculateCoachPillarMapping(train, -5);
      expect(mappingNeg.targetPillar).toBeGreaterThanOrEqual(1);
      expect(mappingNeg.targetPillar).toBeLessThanOrEqual(24);

      // High overflow coach (e.g. coach 999 on 12-car train)
      const mappingOverflow = calculateCoachPillarMapping(train, 999);
      expect(mappingOverflow.targetPillar).toBeGreaterThanOrEqual(1);
      expect(mappingOverflow.targetPillar).toBeLessThanOrEqual(24);

      // NaN coach: safe fallback to coach 1
      const mappingNaN = calculateCoachPillarMapping(train, NaN);
      expect(mappingNaN.coachPosition).toBe(1);
      expect(mappingNaN.targetPillar).toBeGreaterThanOrEqual(1);
      expect(mappingNaN.targetPillar).toBeLessThanOrEqual(24);
    });
  });

  describe('Vector 2: Concurrency & Delta-Time Physics Starvation', () => {
    it('probes advanceTrainPhysics with negative time (time-travel fault)', () => {
      const train: ActiveTrainState = { ...INITIAL_TRAIN_ROSTER[0], currentSpeedKmH: 28, positionZ: -48 };
      const corrupted = advanceTrainPhysics(train, -10);
      // Negative delta must be clamped to 0 without mutating state backwards
      expect(corrupted.positionZ).toBe(train.positionZ);
      expect(corrupted.currentSpeedKmH).toBe(train.currentSpeedKmH);
    });

    it('probes advanceTrainPhysics with massive time delta (tab suspended for 1 hour)', () => {
      const train: ActiveTrainState = { ...INITIAL_TRAIN_ROSTER[0], lifecycle: 'APPROACHING', positionZ: -50 };
      // User locks phone, returns 3600 seconds later
      const fastForward = advanceTrainPhysics(train, 3600);
      // Train advances gracefully to CLEAR without infinite coordinates
      expect(Number.isFinite(fastForward.positionZ)).toBe(true);
      expect(Number.isFinite(fastForward.currentSpeedKmH)).toBe(true);
      expect(fastForward.lifecycle).toBe('CLEAR');
    });

    it('probes advanceTrainPhysics with NaN and Infinity deltas', () => {
      const train: ActiveTrainState = { ...INITIAL_TRAIN_ROSTER[0], positionZ: -48, currentSpeedKmH: 28 };
      const nanDelta = advanceTrainPhysics(train, NaN);
      expect(Number.isFinite(nanDelta.positionZ)).toBe(true);
      expect(Number.isFinite(nanDelta.currentSpeedKmH)).toBe(true);
      expect(nanDelta.positionZ).toBe(train.positionZ);
    });
  });

  describe('Vector 3: Decision & Schedule Invariant Breakers', () => {
    it('probes evaluateFastVsSlowDecision with non-standard / hostile inputs', () => {
      // Empty string should fall back gracefully without throw
      const emptyResult = evaluateFastVsSlowDecision('' as any);
      expect(emptyResult.destination).toBe('Unknown');
      expect(emptyResult.adviceMessage).toContain('not yet monitored');

      // Thane and Kalyan on Central line
      const thaneResult = evaluateFastVsSlowDecision('Thane');
      expect(thaneResult.destination).toBe('Thane');
      expect(thaneResult.recommendedChoice).toBeDefined();

      const kalyanResult = evaluateFastVsSlowDecision('Kalyan');
      expect(kalyanResult.destination).toBe('Kalyan');
      expect(kalyanResult.recommendedChoice).toBeDefined();
    });

    it('probes detectPlatformFlipEvents with empty, null, or corrupted rosters', () => {
      const emptyFlips = detectPlatformFlipEvents([]);
      expect(emptyFlips).toEqual([]);

      const corruptedRoster: TimetableEntry[] = [
        {
          id: 'bad-1',
          trainNumber: '',
          destination: '',
          direction: 'UP',
          line: 'WESTERN',
          speedCategory: 'FAST',
          isAC: false,
          scheduledTime: 'invalid',
          expectedTime: 'invalid',
          delayMinutes: -50, // Negative delay
          scheduledPlatform: 3,
          actualPlatform: 5,
          status: 'PLATFORM_FLIPPED',
          carCount: 12,
        },
      ];

      const corruptedFlips = detectPlatformFlipEvents(corruptedRoster);
      expect(corruptedFlips).toHaveLength(1);
      // ETA must not be negative
      expect(corruptedFlips[0].etaSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Vector 4: Station Invariants & Null Pointer Traps', () => {
    it('probes calculateInterchangeRoute with non-existent platform connections', () => {
      // What if platform 99 is queried in station.ts?
      const route = calculateInterchangeRoute(99, 100);
      expect(route).toBeDefined();
      expect(route.recommendedFobId).toBe('north-fob'); // Fallback must hold
    });

    it('probes generateSuburbanRake with edge-case car counts (0, 1, 99)', () => {
      // 0 cars
      const zeroRake = generateSuburbanRake(0 as any);
      console.log('zeroRake length:', zeroRake.length);

      // 1 car
      const singleRake = generateSuburbanRake(1 as any);
      console.log('singleRake length:', singleRake.length);
    });
  });
});
