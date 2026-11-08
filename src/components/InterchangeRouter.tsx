import React from 'react';
import { DADAR_PLATFORMS } from '../domain/station.ts';
import { DetailedRoute } from '../domain/interchangeRouter.ts';
import { ArrowRightLeft, Clock, ShieldCheck, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

interface InterchangeRouterProps {
  sourcePf: number;
  targetPf: number;
  onSelectSourcePf: (pf: number) => void;
  onSelectTargetPf: (pf: number) => void;
  route: DetailedRoute;
}

export const InterchangeRouter: React.FC<InterchangeRouterProps> = ({
  sourcePf,
  targetPf,
  onSelectSourcePf,
  onSelectTargetPf,
  route,
}) => {
  const handleSwap = () => {
    const temp = sourcePf;
    onSelectSourcePf(targetPf);
    onSelectTargetPf(temp);
  };

  const quickPresets = [
    { label: 'WR Fast (PF 3) → CR Fast (PF 10)', src: 3, dst: 10 },
    { label: 'WR Slow (PF 2) → CR Slow (PF 9)', src: 2, dst: 9 },
    { label: 'Virar Fast (PF 4) → CSMT (PF 8)', src: 4, dst: 8 },
  ];

  return (
    <div className="flex flex-col space-y-3">
      {/* Route Selector & Swap Controls */}
      <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
        <div className="flex-1">
          <label htmlFor="source-platform-select" className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
            From Platform
          </label>
          <select
            id="source-platform-select"
            value={sourcePf}
            onChange={(e) => onSelectSourcePf(Number(e.target.value))}
            aria-label="From Platform"
            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {DADAR_PLATFORMS.map((p) => (
              <option key={p.id} value={p.number}>
                Platform {p.number} ({p.line === 'WESTERN' ? 'WR' : 'CR'})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSwap}
          title="Swap Source and Target Platforms"
          aria-label="Swap Source and Target Platforms"
          className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition active:scale-90 mt-3 shadow-xs"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <label htmlFor="target-platform-select" className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
            To Platform
          </label>
          <select
            id="target-platform-select"
            value={targetPf}
            onChange={(e) => onSelectTargetPf(Number(e.target.value))}
            aria-label="To Platform"
            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {DADAR_PLATFORMS.map((p) => (
              <option key={p.id} value={p.number}>
                Platform {p.number} ({p.line === 'WESTERN' ? 'WR' : 'CR'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 text-[10px]">
        {quickPresets.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelectSourcePf(preset.src);
              onSelectTargetPf(preset.dst);
            }}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Clean Route Result Card */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Recommended Route</span>
            <span className="text-sm font-extrabold text-slate-900">{route.recommendedFob.name}</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-black text-blue-600 flex items-center justify-end space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>~{route.estimatedWalkingMinutes} MINS</span>
            </span>
            <span className="text-[10px] text-slate-400">{route.distanceMeters}m walk</span>
          </div>
        </div>

        {/* Guidance Alert Banner */}
        <div
          className={`flex items-start space-x-2 p-2 rounded-lg text-xs leading-snug ${
            route.crowdCaution
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {route.crowdCaution ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <span>{route.reason}</span>
        </div>

        {route.timeSavedMinutesVsChokedRoute > 0 && (
          <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Saves ~{route.timeSavedMinutesVsChokedRoute} minutes compared to choked Middle Bridge!</span>
          </div>
        )}

        {/* 3-Step Navigation Waypoint Breadcrumbs */}
        {route.sourcePlatform !== route.targetPlatform && (
          <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-slate-200 text-slate-700 font-medium">
            <span>Stairs on PF {route.sourcePlatform}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-blue-600">Cross Bridge Deck</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Descend to PF {route.targetPlatform}</span>
          </div>
        )}
      </div>
    </div>
  );
};
