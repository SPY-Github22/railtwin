import React from 'react';
import { DADAR_PLATFORMS } from '../domain/station.ts';
import { DetailedRoute } from '../domain/interchangeRouter.ts';
import { ArrowRightLeft, Footprints, Clock, ShieldCheck, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

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

  const sourceData = DADAR_PLATFORMS.find((p) => p.number === sourcePf);
  const targetData = DADAR_PLATFORMS.find((p) => p.number === targetPf);

  return (
    <div className="flex flex-col space-y-3.5 p-3.5 rounded-xl bg-gray-950/95 border border-gray-800 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Footprints className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Smart Interchange Dispatcher
            </h2>
            <p className="text-[10px] text-gray-400">Avoid bridge choke points & stampedes</p>
          </div>
        </div>
        {route.timeSavedMinutesVsChokedRoute > 0 && (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold animate-pulse">
            <Sparkles className="w-3 h-3" />
            <span>Saves ~{route.timeSavedMinutesVsChokedRoute} mins</span>
          </span>
        )}
      </div>

      {/* Quick Selectors & Swap Button */}
      <div className="flex items-center space-x-2 bg-gray-900/90 p-2 rounded-xl border border-gray-800">
        {/* Source Platform Selector */}
        <div className="flex-1">
          <label htmlFor="source-platform-select" className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">
            From Platform
          </label>
          <select
            id="source-platform-select"
            value={sourcePf}
            onChange={(e) => onSelectSourcePf(Number(e.target.value))}
            aria-label="From Platform"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
          >
            {DADAR_PLATFORMS.map((p) => (
              <option key={p.id} value={p.number}>
                PF {p.number} ({p.line === 'WESTERN' ? 'WR' : 'CR'})
              </option>
            ))}
          </select>
          <span className="text-[10px] text-blue-400 block mt-0.5">
            {sourceData?.line} Line
          </span>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={handleSwap}
          title="Swap Source and Target Platforms"
          aria-label="Swap Source and Target Platforms"
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition active:scale-90 mt-3"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        {/* Target Platform Selector */}
        <div className="flex-1">
          <label htmlFor="target-platform-select" className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">
            To Platform
          </label>
          <select
            id="target-platform-select"
            value={targetPf}
            onChange={(e) => onSelectTargetPf(Number(e.target.value))}
            aria-label="To Platform"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
          >
            {DADAR_PLATFORMS.map((p) => (
              <option key={p.id} value={p.number}>
                PF {p.number} ({p.line === 'WESTERN' ? 'WR' : 'CR'})
              </option>
            ))}
          </select>
          <span className="text-[10px] text-emerald-400 block mt-0.5">
            {targetData?.line} Line
          </span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px]">
        {quickPresets.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelectSourcePf(preset.src);
              onSelectTargetPf(preset.dst);
            }}
            className="flex-shrink-0 px-2 py-1 rounded-md bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 transition"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Route Recommendation Card */}
      <div className="p-3 rounded-xl bg-gray-900/90 border border-blue-500/40 flex flex-col space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">
              Recommended Overbridge
            </span>
            <span className="text-sm font-extrabold text-white flex items-center space-x-1.5">
              <span>{route.recommendedFob.name}</span>
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-black text-emerald-400 flex items-center justify-end space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>~{route.estimatedWalkingMinutes} MINS</span>
            </span>
            <span className="text-[10px] text-gray-400">{route.distanceMeters}m walk</span>
          </div>
        </div>

        {/* Guidance Alert Banner */}
        <div
          className={`flex items-start space-x-2 p-2 rounded-lg text-[11px] leading-snug border ${
            route.crowdCaution
              ? 'bg-amber-950/60 border-amber-900/60 text-amber-200'
              : 'bg-blue-950/50 border-blue-900/50 text-blue-200'
          }`}
        >
          {route.crowdCaution ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <span>{route.reason}</span>
        </div>

        {/* 3-Step Navigation Waypoint Breadcrumbs */}
        {route.sourcePlatform !== route.targetPlatform && (
          <div className="flex items-center justify-between text-[10px] bg-gray-950/80 p-2 rounded-lg border border-gray-800 text-gray-300">
            <div className="flex items-center space-x-1">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[9px]">
                1
              </span>
              <span>Stairs PF {route.sourcePlatform}</span>
            </div>
            <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
            <div className="flex items-center space-x-1">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px]">
                2
              </span>
              <span>Cross Deck</span>
            </div>
            <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
            <div className="flex items-center space-x-1">
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[9px]">
                3
              </span>
              <span>Arrive PF {route.targetPlatform}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
