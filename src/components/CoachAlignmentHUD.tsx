import React, { useState } from 'react';
import { ActiveTrainState, calculateCoachPillarMapping } from '../domain/trainRakeEngine.ts';
import { Clock, MapPin, Gauge, Footprints } from 'lucide-react';

interface CoachAlignmentHUDProps {
  train: ActiveTrainState | undefined;
  platformNumber: number;
}

export const CoachAlignmentHUD: React.FC<CoachAlignmentHUDProps> = ({ train, platformNumber }) => {
  const [selectedCoachIndex, setSelectedCoachIndex] = useState<number>(1); // Default to coach 2 (Ladies/FC)

  if (!train) {
    return (
      <div className="p-3 text-center">
        <div className="text-xs text-slate-400">Platform {platformNumber}</div>
        <div className="text-sm font-semibold text-slate-700 mt-0.5">Platform is Currently Clear</div>
        <div className="text-xs text-slate-400 mt-0.5">Next suburban service expected in ~3 mins</div>
      </div>
    );
  }

  const selectedCoach = train.coaches[selectedCoachIndex] || train.coaches[0];
  const alignment = calculateCoachPillarMapping(train, selectedCoach.position);

  const getLifecycleBadge = () => {
    switch (train.lifecycle) {
      case 'APPROACHING':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold animate-pulse">
            <Gauge className="w-3.5 h-3.5" />
            <span>Entering ({train.currentSpeedKmH} km/h)</span>
          </span>
        );
      case 'HALTED':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Boarding Open · {Math.ceil(train.haltSecondsRemaining)}s left</span>
          </span>
        );
      case 'DEPARTING':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
            <span>Departing Platform</span>
          </span>
        );
      case 'CLEAR':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Next in {train.nextEtaSeconds}s</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col space-y-2.5">
      {/* Train Glance Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline space-x-2">
          <span className="text-base font-extrabold text-slate-900">
            {train.destination} {train.speedType.replace('_', ' ')}
          </span>
          <span className="text-xs font-mono font-semibold text-slate-400">#{train.trainNumber}</span>
          <span className="text-xs text-slate-500 font-medium">{train.carCount} Cars</span>
        </div>
        {getLifecycleBadge()}
      </div>

      {/* Horizontal Minimalist Coach Strip */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-0.5">
        {train.coaches.map((c, idx) => {
          const isSelected = idx === selectedCoachIndex;
          return (
            <button
              key={c.position}
              type="button"
              onClick={() => setSelectedCoachIndex(idx)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-11 h-12 rounded-xl border text-center transition active:scale-95 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
              }`}
            >
              <span className="text-[10px] font-mono font-bold text-slate-400">#{c.position}</span>
              <span
                className="text-[9px] font-black truncate max-w-[38px] px-0.5 rounded"
                style={{ color: c.colorHex }}
              >
                {c.coachCode}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Coach Pillar Callout */}
      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center space-x-2">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: alignment.colorHex }}
          ></span>
          <div>
            <span className="font-bold text-slate-800">
              Coach {alignment.coachPosition} ({alignment.displayName})
            </span>
            <span className="text-slate-500 text-[11px] block">
              {alignment.walkingAdvice}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 pl-3">
          <span className="text-xs font-mono font-black text-blue-600 flex items-center justify-end space-x-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>PILLAR {alignment.targetPillar}</span>
          </span>
          <span className="text-[10px] font-semibold text-slate-400 flex items-center justify-end space-x-1 mt-0.5">
            <Footprints className="w-3 h-3 text-slate-400" />
            <span>Near {alignment.fobProximity}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
