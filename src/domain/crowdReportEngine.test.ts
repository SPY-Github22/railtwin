import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistanceMeters,
  validateDadarGeofence,
  aggregateBridgeCongestion,
  CrowdReport,
  DADAR_STATION_CENTER,
  DADAR_ACCESSIBILITY_EQUIPMENT,
  DADAR_EMERGENCY_CONTACTS,
} from './crowdReportEngine.ts';

describe('Crowd Report & Accessibility Radar Engine', () => {
  describe('Geofence & Distance Validation', () => {
    it('calculates zero distance for exact same coordinates', () => {
      const distance = calculateHaversineDistanceMeters(DADAR_STATION_CENTER, DADAR_STATION_CENTER);
      expect(distance).toBeCloseTo(0, 1);
    });

    it('identifies coordinates within 500m geofence', () => {
      // 100 meters north of Dadar station center: ~0.0009 deg lat change
      const nearCoords = {
        latitude: DADAR_STATION_CENTER.latitude + 0.001,
        longitude: DADAR_STATION_CENTER.longitude,
      };
      const check = validateDadarGeofence(nearCoords, false);
      expect(check.isWithinGeofence).toBe(true);
      expect(check.distanceMeters).toBeLessThan(500);
    });

    it('identifies coordinates outside geofence (e.g. Bandra or CSMT)', () => {
      // Bandra: ~19.0544, 72.8402 (approx 4km away)
      const bandraCoords = { latitude: 19.0544, longitude: 72.8402 };
      const check = validateDadarGeofence(bandraCoords, false);
      expect(check.isWithinGeofence).toBe(false);
      expect(check.distanceMeters).toBeGreaterThan(2000);
    });

    it('permits testing bypass when allowMock is enabled', () => {
      const farCoords = { latitude: 28.6139, longitude: 77.2090 }; // New Delhi
      const check = validateDadarGeofence(farCoords, true);
      expect(check.isWithinGeofence).toBe(true);
      expect(check.distanceMeters).toBe(45);
    });

    it('safely handles NaN and Infinite coordinates', () => {
      const distance = calculateHaversineDistanceMeters(
        { latitude: NaN, longitude: 72.8478 },
        DADAR_STATION_CENTER
      );
      expect(distance).toBe(Infinity);
    });
  });

  describe('Crowd Report Aggregation & Decay Weighting', () => {
    const baseTime = 1700000000000;

    it('aggregates multiple reports for Middle FOB and updates congestion status', () => {
      const reports: CrowdReport[] = [
        {
          id: 'rep-1',
          timestampMs: baseTime - 60000, // 1 min ago
          bridgeId: 'middle-fob',
          severity: 'CHOKED_CRUSH',
          incident: 'STAIRCASE_JAM',
          isMockedLocation: false,
        },
        {
          id: 'rep-2',
          timestampMs: baseTime - 120000, // 2 mins ago
          bridgeId: 'middle-fob',
          severity: 'DENSE',
          incident: 'STAIRCASE_JAM',
          isMockedLocation: false,
        },
      ];

      const snapshot = aggregateBridgeCongestion(reports, baseTime);
      expect(snapshot['middle-fob'].activeReportsCount).toBe(2);
      expect(snapshot['middle-fob'].congestionStatus).toMatch(/HIGH|CRITICAL/);
      expect(snapshot['middle-fob'].primaryIssue).toBe('STAIRCASE_JAM');
    });

    it('discards stale reports older than 30 minutes', () => {
      const staleReports: CrowdReport[] = [
        {
          id: 'rep-old',
          timestampMs: baseTime - 35 * 60 * 1000, // 35 mins ago
          bridgeId: 'north-fob',
          severity: 'CHOKED_CRUSH',
          incident: 'STAIRCASE_JAM',
          isMockedLocation: false,
        },
      ];

      const snapshot = aggregateBridgeCongestion(staleReports, baseTime);
      expect(snapshot['north-fob'].activeReportsCount).toBe(0);
      expect(snapshot['north-fob'].congestionStatus).toBe('LOW');
    });

    it('returns default baseline moderate status when no reports exist', () => {
      const snapshot = aggregateBridgeCongestion([], baseTime);
      expect(snapshot['north-fob'].congestionStatus).toBe('LOW');
      expect(snapshot['middle-fob'].congestionStatus).toBe('LOW');
      expect(snapshot['south-fob'].congestionStatus).toBe('LOW');
    });
  });

  describe('Station Accessibility Inventory & Emergency Directory', () => {
    it('verifies accessibility equipment records contain essential operational metadata', () => {
      expect(DADAR_ACCESSIBILITY_EQUIPMENT.length).toBeGreaterThanOrEqual(5);

      for (const eq of DADAR_ACCESSIBILITY_EQUIPMENT) {
        expect(eq.id).toBeDefined();
        expect(eq.name).toBeTruthy();
        expect(eq.connectedPlatforms.length).toBeGreaterThan(0);
        expect(['OPERATIONAL', 'UNDER_MAINTENANCE', 'POWER_OFF']).toContain(eq.status);
      }
    });

    it('verifies emergency helpline directory contains 139 and Dadar GRP', () => {
      const rpf = DADAR_EMERGENCY_CONTACTS.find((c) => c.telephone === '139');
      expect(rpf).toBeDefined();
      expect(rpf?.priority).toBe('EMERGENCY');

      const grp = DADAR_EMERGENCY_CONTACTS.find((c) => c.designation.includes('GRP'));
      expect(grp).toBeDefined();
    });
  });
});
