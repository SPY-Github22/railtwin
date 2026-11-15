import React, { useState, useEffect } from 'react';
import { DADAR_PLATFORMS } from './domain/station.ts';
import {
  INITIAL_TRAIN_ROSTER,
  advanceTrainPhysics,
  ActiveTrainState,
  calculateCoachPillarMapping,
} from './domain/trainRakeEngine.ts';
import { DadarStationCanvas } from './components/DadarStationCanvas.tsx';
import { Train, Info, Users } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(3);
  const [selectedCoachPosition, setSelectedCoachPosition] = useState<number | null>(2); // Default to Ladies Coach #2
  const [trains, setTrains] = useState<ActiveTrainState[]>(INITIAL_TRAIN_ROSTER);

  // Train Physics Simulation Loop with Tab Sleep Resynchronization
  useEffect(() => {
    let lastTime = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;

      // Safe delta clamp to prevent sudden jumps
      const safeDelta = Math.min(Math.max(elapsed, 0.05), 2.0);
      setTrains((prevTrains) => prevTrains.map((t) => advanceTrainPhysics(t, safeDelta)));
    }, 200);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastTime = performance.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const activePlatformData = DADAR_PLATFORMS.find((p) => p.number === selectedPlatform);
  const activeTrain = trains.find((t) => t.platformNumber === selectedPlatform);
  const selectedCoachMapping = activeTrain && selectedCoachPosition
    ? calculateCoachPillarMapping(activeTrain, selectedCoachPosition)
    : null;

  const handleSelectPlatform = (pfNum: number) => {
    setSelectedPlatform(pfNum);
    // Auto-select Coach #2 (Ladies) or Coach #1 when switching platforms
    setSelectedCoachPosition(2);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* 3D WebGL Canvas: Full-Screen Station Foundation */}
      <div className="absolute inset-0 z-0">
        <DadarStationCanvas
          trains={trains}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={handleSelectPlatform}
          selectedCoachPosition={selectedCoachPosition}
        />
      </div>

      {/* Clean, Minimalist Top Header */}
      <header className="absolute top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-20 flex items-center justify-between space-x-3 bg-white/95 px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/50 backdrop-blur">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-600 rounded-xl text-white shadow-xs">
            <Train className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-sm tracking-tight text-slate-900">RailTwin</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 font-black rounded-md border border-blue-200">
                DADAR
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">14 Platforms · 3D Live Station Twin</p>
          </div>
        </div>
      </header>

      {/* Clean, Uncluttered Bottom Controls (Step 2: Coach & Platform Locator) */}
      <div className="absolute bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[620px] z-20 flex flex-col items-center space-y-2 pointer-events-auto">
        {/* Step 2: 1-Tap Coach & Pillar Formation Strip */}
        {activeTrain && activeTrain.coaches && activeTrain.coaches.length > 0 && (
          <div className="flex flex-col items-center space-y-1.5 w-full bg-white/95 p-2 rounded-2xl border border-slate-200/90 shadow-xl backdrop-blur animate-in fade-in duration-200">
            {/* Coach formation horizontal scroll row */}
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full px-1 py-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center space-x-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span>Coaches:</span>
              </span>
              {activeTrain.coaches.map((c) => {
                const isSelected = selectedCoachPosition === c.position;
                return (
                  <button
                    key={c.position}
                    type="button"
                    onClick={() => setSelectedCoachPosition(c.position)}
                    style={{
                      borderColor: isSelected ? c.colorHex : '#e2e8f0',
                      backgroundColor: isSelected ? `${c.colorHex}15` : '#ffffff',
                    }}
                    className={`px-2.5 py-1 rounded-xl border text-xs font-bold shrink-0 transition flex items-center space-x-1.5 ${
                      isSelected ? 'shadow-xs ring-2 ring-offset-1' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.colorHex }}
                    />
                    <span className="text-slate-800">#{c.position}</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      {c.coachCode}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Coach Pillar & Boarding Guidance Pill */}
            {selectedCoachMapping && (
              <div className="flex flex-col sm:flex-row sm:items-center text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 w-full justify-between gap-1">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedCoachMapping.colorHex }}
                  />
                  <span className="font-bold text-slate-900">
                    Coach {selectedCoachMapping.coachPosition} ({selectedCoachMapping.displayName})
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-medium text-slate-600">
                    Stand near <strong className="text-blue-700 font-bold">Pillar {selectedCoachMapping.targetPillar}</strong> ({selectedCoachMapping.fobProximity})
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {selectedCoachMapping.walkingAdvice}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Selected Platform Quick Status Pill */}
        {activePlatformData && (
          <div className="flex items-center space-x-2.5 px-4 py-2 bg-white/95 rounded-2xl border border-slate-200 shadow-md backdrop-blur text-xs font-semibold text-slate-800 animate-in fade-in duration-150 w-full justify-between">
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-lg text-white font-extrabold text-[11px] ${
                  activePlatformData.line === 'WESTERN' ? 'bg-blue-600' : 'bg-red-600'
                }`}
              >
                PF {activePlatformData.number}
              </span>
              <span className="text-slate-600 font-medium">
                Platform {activePlatformData.number} ({activePlatformData.line === 'WESTERN' ? 'Western Line' : 'Central Line'})
              </span>
            </div>
            {activeTrain ? (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                Train #{activeTrain.trainNumber} ({activeTrain.destination})
              </span>
            ) : (
              <span className="text-slate-400 text-[11px] italic">No active train at platform</span>
            )}
          </div>
        )}

        {/* 14 Platform Selector Chips */}
        <div className="flex items-center space-x-1 p-1.5 bg-white/95 rounded-2xl border border-slate-200 shadow-xl backdrop-blur overflow-x-auto max-w-full">
          {DADAR_PLATFORMS.map((pf) => {
            const isSelected = selectedPlatform === pf.number;
            const isWestern = pf.line === 'WESTERN';
            return (
              <button
                key={pf.id}
                type="button"
                onClick={() => handleSelectPlatform(pf.number)}
                className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition active:scale-95 ${
                  isSelected
                    ? isWestern
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={`Select Platform ${pf.number}`}
              >
                {pf.number}
              </button>
            );
          })}
        </div>

        {/* Subtle Guidance Hint */}
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 bg-white/80 px-3 py-1 rounded-full border border-slate-200/80 shadow-xs backdrop-blur">
          <Info className="w-3 h-3 text-blue-500" />
          <span>Tap a coach to see where it stops along the platform in 3D. Free drag/rotate anytime.</span>
        </div>
      </div>
    </div>
  );
};

