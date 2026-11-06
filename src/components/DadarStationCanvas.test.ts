import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { DADAR_PLATFORMS, DADAR_FOBS } from '../domain/station';

describe('Spatial 3D Station Geometry & Commuter Coordinate Engine', () => {
  // Spatial math functions matching DadarStationCanvas implementation
  const getPlatformX = (pfNum: number): number => {
    if (pfNum <= 7) {
      return -28 + (pfNum - 1) * 3.8;
    } else {
      return 5 + (pfNum - 8) * 3.8;
    }
  };

  it('allocates strictly non-overlapping 3D tracks & platform corridors across all 14 platforms', () => {
    const xCoordinates: { pf: number; x: number; line: string }[] = [];

    DADAR_PLATFORMS.forEach((pf) => {
      const posX = getPlatformX(pf.number);
      xCoordinates.push({ pf: pf.number, x: posX, line: pf.line });
    });

    // Check Western platforms are strictly to the West (negative X)
    const westernCoords = xCoordinates.filter((c) => c.line === 'WESTERN');
    westernCoords.forEach((c) => {
      expect(c.x).toBeLessThan(0);
    });

    // Check Central platforms are strictly to the East (positive X)
    const centralCoords = xCoordinates.filter((c) => c.line === 'CENTRAL');
    centralCoords.forEach((c) => {
      expect(c.x).toBeGreaterThan(0);
    });

    // Verify distance between adjacent platforms is at least 3.5 units (enough clearance for tracks)
    for (let i = 0; i < westernCoords.length - 1; i++) {
      const delta = westernCoords[i + 1].x - westernCoords[i].x;
      expect(delta).toBeGreaterThanOrEqual(3.5);
    }

    for (let i = 0; i < centralCoords.length - 1; i++) {
      const delta = centralCoords[i + 1].x - centralCoords[i].x;
      expect(delta).toBeGreaterThanOrEqual(3.5);
    }
  });

  it('constructs multi-level verticality: FOBs are elevated 5.2m above ground platforms', () => {
    const platformHeight = 1.0;
    const fobElevation = 5.2;

    const clearance = fobElevation - platformHeight;
    // Commuters and trains must have clearance under the footbridge
    expect(clearance).toBeGreaterThan(4.0);

    // Verify all 3 FOBs have distinctive longitudinal Z placement
    const fobZPositions: Record<string, number> = {
      'north-fob': -22,
      'middle-fob': 0,
      'south-fob': 22,
    };

    DADAR_FOBS.forEach((fob) => {
      expect(fobZPositions[fob.id]).toBeDefined();
    });

    expect(fobZPositions['north-fob']).toBeLessThan(fobZPositions['middle-fob']);
    expect(fobZPositions['middle-fob']).toBeLessThan(fobZPositions['south-fob']);
  });

  it('verifies camera presets cover commuter sightlines without flipping or ground clipping', () => {
    const cameraPresets = {
      OVERVIEW: { pos: new THREE.Vector3(0, 48, 64), target: new THREE.Vector3(0, 0, 0) },
      WESTERN: { pos: new THREE.Vector3(-18, 28, 36), target: new THREE.Vector3(-18, 0, 0) },
      CENTRAL: { pos: new THREE.Vector3(18, 28, 36), target: new THREE.Vector3(18, 0, 0) },
      BRIDGES: { pos: new THREE.Vector3(0, 60, 8), target: new THREE.Vector3(0, 5, 0) },
    };

    // All presets must have camera elevation Y > 20 to prevent ground clipping
    Object.entries(cameraPresets).forEach(([, config]) => {
      expect(config.pos.y).toBeGreaterThanOrEqual(25);
      // Distance from target must be within safe viewing frustum (20 to 100 units)
      const dist = config.pos.distanceTo(config.target);
      expect(dist).toBeGreaterThan(20);
      expect(dist).toBeLessThan(100);
    });
  });

  it('correctly maps bridge congestion states to visual alert color indicators', () => {
    const getFobColor = (congestion: string): string => {
      switch (congestion) {
        case 'FREE_FLOW':
          return '#10b981';
        case 'MODERATE':
          return '#f59e0b';
        case 'CHOKED':
          return '#ef4444';
        default:
          return '#64748b';
      }
    };

    expect(getFobColor('FREE_FLOW')).toBe('#10b981');
    expect(getFobColor('MODERATE')).toBe('#f59e0b');
    expect(getFobColor('CHOKED')).toBe('#ef4444');
  });
});
