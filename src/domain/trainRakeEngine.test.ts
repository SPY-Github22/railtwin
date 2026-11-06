import { describe, it, expect } from 'vitest';
import {
  INITIAL_TRAIN_ROSTER,
  calculateCoachPillarMapping,
  advanceTrainPhysics,
  ActiveTrainState,
} from './trainRakeEngine';

describe('Suburban EMU Train Dynamics & Coach-to-Pillar Alignment', () => {
  it('initializes active trains roster covering both Western & Central peak corridors', () => {
    expect(INITIAL_TRAIN_ROSTER.length).toBeGreaterThanOrEqual(4);

    const westernTrains = INITIAL_TRAIN_ROSTER.filter((t) => t.line === 'WESTERN');
    const centralTrains = INITIAL_TRAIN_ROSTER.filter((t) => t.line === 'CENTRAL');

    expect(westernTrains.length).toBeGreaterThan(0);
    expect(centralTrains.length).toBeGreaterThan(0);

    // Ensure all trains are on valid Dadar platforms (1 to 14)
    INITIAL_TRAIN_ROSTER.forEach((t) => {
      expect(t.platformNumber).toBeGreaterThanOrEqual(1);
      expect(t.platformNumber).toBeLessThanOrEqual(14);
      expect([12, 15]).toContain(t.carCount);
      expect(t.coaches).toHaveLength(t.carCount);
    });
  });

  it('maps individual coach positions accurately to physical platform pillars 1 to 24', () => {
    const sampleTrain = INITIAL_TRAIN_ROSTER[0]; // 12-coach Borivali slow

    // First coach (South end)
    const coachFirst = calculateCoachPillarMapping(sampleTrain, 1);
    expect(coachFirst.targetPillar).toBeLessThanOrEqual(5);
    expect(coachFirst.fobProximity).toBe('South FOB');

    // Middle coach (approx Pillar 12–14)
    const coachMid = calculateCoachPillarMapping(sampleTrain, 6);
    expect(coachMid.targetPillar).toBeGreaterThanOrEqual(10);
    expect(coachMid.targetPillar).toBeLessThanOrEqual(15);
    expect(coachMid.fobProximity).toBe('Middle FOB');

    // Last coach (North end, Pillar 22–24)
    const coachLast = calculateCoachPillarMapping(sampleTrain, 12);
    expect(coachLast.targetPillar).toBeGreaterThanOrEqual(20);
    expect(coachLast.targetPillar).toBeLessThanOrEqual(24);
    expect(coachLast.fobProximity).toBe('North FOB');
  });

  it('provides actionable commuter boarding advice based on FOB proximity', () => {
    const sampleTrain = INITIAL_TRAIN_ROSTER[1]; // 15-coach Churchgate Fast
    const midCoach = calculateCoachPillarMapping(sampleTrain, 8);
    expect(midCoach.walkingAdvice).toContain('Middle FOB');

    const northCoach = calculateCoachPillarMapping(sampleTrain, 15);
    expect(northCoach.walkingAdvice).toContain('North FOB');
  });

  it('executes smooth deceleration physics: transition from APPROACHING to HALTED', () => {
    let train: ActiveTrainState = {
      ...INITIAL_TRAIN_ROSTER[0],
      lifecycle: 'APPROACHING',
      positionZ: -10,
      targetStopZ: 0,
      currentSpeedKmH: 25,
      haltSecondsRemaining: 25,
    };

    // Simulate physics advancing by 1.5 seconds steps
    for (let i = 0; i < 15; i++) {
      train = advanceTrainPhysics(train, 0.5);
      if (train.lifecycle === 'HALTED') break;
    }

    expect(train.lifecycle).toBe('HALTED');
    expect(train.currentSpeedKmH).toBe(0);
    expect(train.positionZ).toBe(0);
    expect(train.haltSecondsRemaining).toBe(25);
  });

  it('executes departure transition: HALTED countdown expiry triggers DEPARTING', () => {
    let train: ActiveTrainState = {
      ...INITIAL_TRAIN_ROSTER[1],
      lifecycle: 'HALTED',
      positionZ: 0,
      currentSpeedKmH: 0,
      haltSecondsRemaining: 2, // 2 seconds left
    };

    // Advance 3 seconds
    train = advanceTrainPhysics(train, 3.0);
    expect(train.lifecycle).toBe('DEPARTING');
    expect(train.haltSecondsRemaining).toBe(0);
  });

  it('cycles departing train out of station and queues next train ETA', () => {
    let train: ActiveTrainState = {
      ...INITIAL_TRAIN_ROSTER[0],
      lifecycle: 'DEPARTING',
      positionZ: 60,
      currentSpeedKmH: 35,
    };

    // Advance 2 seconds -> should exit past Z = 65
    train = advanceTrainPhysics(train, 2.0);
    expect(train.lifecycle).toBe('CLEAR');
    expect(train.positionZ).toBe(-100);
    expect(train.nextEtaSeconds).toBeGreaterThan(0);
  });
});
