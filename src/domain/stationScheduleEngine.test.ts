import { describe, it, expect } from 'vitest';
import {
  DADAR_TIMETABLE_ROSTER,
  detectPlatformFlipEvents,
  evaluateFastVsSlowDecision,
} from './stationScheduleEngine';

describe('Dadar Suburban Timetable & Platform Flip Radar', () => {
  it('initializes authentic peak-hour timetable roster covering Western and Central lines', () => {
    expect(DADAR_TIMETABLE_ROSTER.length).toBeGreaterThanOrEqual(8);

    const westernEntries = DADAR_TIMETABLE_ROSTER.filter((e) => e.line === 'WESTERN');
    const centralEntries = DADAR_TIMETABLE_ROSTER.filter((e) => e.line === 'CENTRAL');

    expect(westernEntries.length).toBeGreaterThan(0);
    expect(centralEntries.length).toBeGreaterThan(0);

    // Verify all platforms are within Dadar's 1-14 platform domain
    DADAR_TIMETABLE_ROSTER.forEach((entry) => {
      expect(entry.scheduledPlatform).toBeGreaterThanOrEqual(1);
      expect(entry.scheduledPlatform).toBeLessThanOrEqual(14);
      expect(entry.actualPlatform).toBeGreaterThanOrEqual(1);
      expect(entry.actualPlatform).toBeLessThanOrEqual(14);
      expect(entry.scheduledTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  it('detects emergency Platform Flip events with complete alert telemetry', () => {
    const flips = detectPlatformFlipEvents(DADAR_TIMETABLE_ROSTER);
    expect(flips.length).toBeGreaterThanOrEqual(1);

    const flippedTrain = flips.find((f) => f.trainNumber === '90451');
    expect(flippedTrain).toBeDefined();
    expect(flippedTrain?.oldPlatform).toBe(3);
    expect(flippedTrain?.newPlatform).toBe(5);
    expect(flippedTrain?.destination).toBe('Borivali');
    expect(flippedTrain?.urgency).toBe('CRITICAL');
    expect(flippedTrain?.announcementText).toContain('Platform 3 will now arrive on Platform 5');
  });

  it('provides commuter decision assistance for Fast vs Slow train dilemmas', () => {
    const decision = evaluateFastVsSlowDecision('Borivali');
    expect(decision).toBeDefined();
    expect(decision.destination).toBe('Borivali');
    expect(['FAST', 'SLOW']).toContain(decision.recommendedChoice);
    expect(decision.timeDifferenceMinutes).toBeGreaterThanOrEqual(0);
    expect(decision.adviceMessage).toMatch(/PF \d/);
  });

  it('correctly filters timetable entries by direction and speed category', () => {
    const northbound = DADAR_TIMETABLE_ROSTER.filter((e) => e.direction === 'UP');
    const southbound = DADAR_TIMETABLE_ROSTER.filter((e) => e.direction === 'DOWN');

    expect(northbound.length).toBeGreaterThan(0);
    expect(southbound.length).toBeGreaterThan(0);

    // Up trains go to northern suburbs (Borivali, Virar, Kalyan, Karjat, Kasara, Dahanu)
    northbound.forEach((e) => {
      expect(['Borivali', 'Virar', 'Dahanu Road', 'Kalyan', 'Karjat', 'Kasara']).toContain(
        e.destination
      );
    });

    // Down trains go to southern terminals (Churchgate, CSMT)
    southbound.forEach((e) => {
      expect(['Churchgate', 'CSMT']).toContain(e.destination);
    });
  });
});
