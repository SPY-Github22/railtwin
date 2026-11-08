import React, { useState } from 'react';
import {
  DADAR_TIMETABLE_ROSTER,
  evaluateFastVsSlowDecision,
  TimetableEntry,
} from '../domain/stationScheduleEngine.ts';
import { Clock, Zap, ArrowRight, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface SuburbanTimetableHUDProps {
  onSelectPlatform: (platformNumber: number) => void;
}

export type TimetableFilter = 'ALL' | 'WESTERN' | 'CENTRAL' | 'AC';

export const SuburbanTimetableHUD: React.FC<SuburbanTimetableHUDProps> = ({ onSelectPlatform }) => {
  const [filter, setFilter] = useState<TimetableFilter>('ALL');
  const [decisionDest, setDecisionDest] = useState<'Borivali' | 'Kalyan'>('Borivali');

  const fastVsSlow = evaluateFastVsSlowDecision(decisionDest);

  const filteredEntries = DADAR_TIMETABLE_ROSTER.filter((entry) => {
    if (filter === 'WESTERN') return entry.line === 'WESTERN';
    if (filter === 'CENTRAL') return entry.line === 'CENTRAL';
    if (filter === 'AC') return entry.isAC;
    return true;
  });

  return (
    <div className="flex flex-col space-y-3 p-3 rounded-xl bg-gray-950/95 border border-gray-800 shadow-xl backdrop-blur">
      {/* Fast vs Slow Decision Helper Card */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-950/70 via-gray-900 to-indigo-950/50 border border-blue-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Fast vs Slow Local Optimizer
            </span>
          </div>
          <div className="flex items-center space-x-1 text-[10px]">
            <button
              type="button"
              onClick={() => setDecisionDest('Borivali')}
              className={`px-2 py-0.5 rounded ${
                decisionDest === 'Borivali'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Borivali (WR)
            </button>
            <button
              type="button"
              onClick={() => setDecisionDest('Kalyan')}
              className={`px-2 py-0.5 rounded ${
                decisionDest === 'Kalyan'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Kalyan (CR)
            </button>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-black/40 border border-blue-900/50 flex flex-col space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">
              Choice: <strong className="text-emerald-400 font-extrabold">{fastVsSlow.recommendedChoice} LOCAL</strong>
            </span>
            <span className="text-[10px] text-emerald-300 font-mono flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Saves {fastVsSlow.timeDifferenceMinutes} mins</span>
            </span>
          </div>
          <p className="text-[11px] text-blue-200 leading-snug">{fastVsSlow.adviceMessage}</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            filter === 'ALL'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          }`}
        >
          All Trains
        </button>
        <button
          type="button"
          onClick={() => setFilter('WESTERN')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            filter === 'WESTERN'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          }`}
        >
          Western Line (PF 1-7)
        </button>
        <button
          type="button"
          onClick={() => setFilter('CENTRAL')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            filter === 'CENTRAL'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          }`}
        >
          Central Line (PF 8-14)
        </button>
        <button
          type="button"
          onClick={() => setFilter('AC')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            filter === 'AC'
              ? 'bg-cyan-600 text-white shadow'
              : 'bg-gray-900 text-cyan-400 hover:text-white'
          }`}
        >
          AC Locals
        </button>
      </div>

      {/* Timetable Cards List */}
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {filteredEntries.map((train: TimetableEntry) => {
          const isFlipped = train.status === 'PLATFORM_FLIPPED';
          const isDelayed = train.status === 'DELAYED';

          return (
            <div
              key={train.id}
              className={`p-2.5 rounded-xl border transition ${
                isFlipped
                  ? 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-950/20'
                  : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-gray-300">#{train.trainNumber}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                      train.isAC
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                        : train.speedCategory === 'FAST'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {train.speedCategory.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-gray-400">{train.line}</span>
                </div>

                {/* Delay / On-time Status */}
                {isFlipped ? (
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-yellow-300 bg-red-900/60 px-1.5 py-0.5 rounded border border-yellow-500/50 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    <span>PF FLIPPED</span>
                  </span>
                ) : isDelayed ? (
                  <span className="text-[10px] font-semibold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-900">
                    +{train.delayMinutes}m delay
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>On Time</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-white flex items-center space-x-1.5">
                    <span>{train.destination}</span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      ({train.direction === 'UP' ? 'Northbound' : 'Southbound'})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-0.5">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="font-mono text-gray-200">{train.expectedTime}</span>
                    </span>
                    <span className="text-gray-600">·</span>
                    <span>{train.carCount} Cars</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 uppercase block">Platform</span>
                    {isFlipped ? (
                      <span className="text-sm font-black text-yellow-300 px-2 py-0.5 rounded bg-red-950 border border-yellow-500/60 animate-pulse">
                        PF {train.actualPlatform}
                      </span>
                    ) : (
                      <span className="text-sm font-black text-white px-2 py-0.5 rounded bg-gray-950 border border-gray-800">
                        PF {train.actualPlatform}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectPlatform(train.actualPlatform)}
                    title={`Inspect Platform ${train.actualPlatform} in 3D`}
                    aria-label={`Inspect Platform ${train.actualPlatform} in 3D`}
                    className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition active:scale-95"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
