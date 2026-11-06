import React, { useState } from 'react';
import { ActiveTrainState, calculateCoachPillarMapping } from '../domain/trainRakeEngine.ts';
import { Clock, MapPin, Gauge, Footprints, Info } from 'lucide-react';

interface CoachAlignmentHUDProps {
  train: ActiveTrainState | undefined;
  platformNumber: number;
}

export const CoachAlignmentHUD: React.FC<CoachAlignmentHUDProps> = ({ train, platformNumber }) => {
  const [selectedCoachIndex, setSelectedCoachIndex] = useState<number>(2); // Default to coach 2 (Ladies/FC)

  if (!train) {
    return (
      <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 text-center">
        <div className="text-xs text-gray-400">Platform {platformNumber}</div>
        <div className="text-sm font-semibold text-gray-200 mt-1">No Train Currently at Platform</div>
        <div className="text-xs text-gray-500 mt-1">Next suburban service scheduled in ~3 mins</div>
      </div>
    );
  }

  const selectedCoach = train.coaches[selectedCoachIndex] || train.coaches[0];
  const alignment = calculateCoachPillarMapping(train, selectedCoach.position);

  // Status badges
  const getLifecycleBadge = () => {
    switch (train.lifecycle) {
      case 'APPROACHING':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold animate-pulse">
            <Gauge className="w-3.5 h-3.5" />
            <span>Entering Station ({train.currentSpeedKmH} km/h)</span>
          </span>
        );
      case 'HALTED':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Boarding Open · {Math.ceil(train.haltSecondsRemaining)}s left</span>
          </span>
        );
      case 'DEPARTING':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold">
            <span>Departing Platform</span>
          </span>
        );
      case 'CLEAR':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Next in {train.nextEtaSeconds}s</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col space-y-3 p-3.5 rounded-xl bg-gray-950/95 border border-gray-800 shadow-xl backdrop-blur">
      {/* Top Train Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400">PF {platformNumber}</span>
            <span className="text-xs font-mono px-1.5 py-0.2 bg-gray-800 text-gray-300 rounded">
              #{train.trainNumber}
            </span>
            <span className="text-sm font-extrabold text-white">
              {train.destination} {train.speedType.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {train.carCount}-Car Suburban EMU · {train.line} Line
          </p>
        </div>
        {getLifecycleBadge()}
      </div>

      {/* Horizontal Interactive Coach Strip */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
          <span className="font-semibold text-gray-300">Coach Position Alignment Strip</span>
          <span className="text-[10px] text-gray-500">Tap coach to locate platform pillar</span>
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto pb-1.5 pt-0.5">
          {train.coaches.map((c, idx) => {
            const isSelected = idx === selectedCoachIndex;
            return (
              <button
                key={c.position}
                type="button"
                onClick={() => setSelectedCoachIndex(idx)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-11 h-12 rounded-lg border text-center transition active:scale-95 ${
                  isSelected
                    ? 'border-blue-400 bg-blue-950 shadow-md ring-2 ring-blue-500/50'
                    : 'border-gray-800 bg-gray-900/80 hover:border-gray-700'
                }`}
              >
                <span className="text-[10px] font-mono font-bold text-gray-400">#{c.position}</span>
                <span
                  className="text-[9px] font-black truncate max-w-[40px] px-1 rounded"
                  style={{ color: c.colorHex }}
                >
                  {c.coachCode}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Coach Pillar Inspection Card */}
      <div className="p-3 rounded-lg bg-gray-900/90 border border-blue-500/30 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: alignment.colorHex }}
            ></span>
            <span className="text-xs font-bold text-white">
              Coach {alignment.coachPosition} ({alignment.displayName})
            </span>
          </div>
          <span className="text-xs font-mono font-extrabold text-blue-400 flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>PILLAR {alignment.targetPillar}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-950/70 p-2 rounded border border-gray-800">
          <div>
            <span className="text-gray-500 block">Nearest Overbridge</span>
            <span className="font-semibold text-gray-200 flex items-center space-x-1 mt-0.5">
              <Footprints className="w-3 h-3 text-blue-400" />
              <span>{alignment.fobProximity}</span>
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Boarding Guidance</span>
            <span className="font-medium text-gray-300 block mt-0.5 text-[10px] leading-tight">
              {alignment.walkingAdvice}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] text-gray-400">
          <Info className="w-3 h-3 text-blue-400 shrink-0" />
          <span>Platform 300m length is numbered Pillar 1 (South End) to Pillar 24 (North End).</span>
        </div>
      </div>
    </div>
  );
};
