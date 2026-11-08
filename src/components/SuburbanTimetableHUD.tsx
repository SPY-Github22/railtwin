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
    <div className="flex flex-col space-y-3">
      {/* Fast vs Slow Local Optimizer Card */}
      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Fast vs Slow Optimizer</span>
          </div>
          <div className="flex items-center space-x-1 text-[11px]">
            <button
              type="button"
              onClick={() => setDecisionDest('Borivali')}
              className={`px-2 py-0.5 rounded-full font-semibold ${
                decisionDest === 'Borivali'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Borivali
            </button>
            <button
              type="button"
              onClick={() => setDecisionDest('Kalyan')}
              className={`px-2 py-0.5 rounded-full font-semibold ${
                decisionDest === 'Kalyan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Kalyan
            </button>
          </div>
        </div>

        <div className="bg-white p-2 rounded-lg border border-blue-100 flex items-center justify-between text-xs">
          <div>
            <span className="font-extrabold text-slate-900">
              Choice: {fastVsSlow.recommendedChoice} Local
            </span>
            <span className="text-slate-500 block text-[11px] mt-0.5 leading-snug">
              {fastVsSlow.adviceMessage}
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 flex items-center space-x-1 shrink-0 ml-2">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Save {fastVsSlow.timeDifferenceMinutes}m</span>
          </span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 text-xs">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-2.5 py-1 rounded-full font-semibold transition ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter('WESTERN')}
          className={`px-2.5 py-1 rounded-full font-semibold transition ${
            filter === 'WESTERN'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Western Line
        </button>
        <button
          type="button"
          onClick={() => setFilter('CENTRAL')}
          className={`px-2.5 py-1 rounded-full font-semibold transition ${
            filter === 'CENTRAL'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Central Line
        </button>
        <button
          type="button"
          onClick={() => setFilter('AC')}
          className={`px-2.5 py-1 rounded-full font-semibold transition ${
            filter === 'AC'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'bg-slate-100 text-cyan-700 hover:bg-slate-200'
          }`}
        >
          AC Locals
        </button>
      </div>

      {/* Timetable Cards List */}
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        {filteredEntries.map((train: TimetableEntry) => {
          const isFlipped = train.status === 'PLATFORM_FLIPPED';
          const isDelayed = train.status === 'DELAYED';

          return (
            <div
              key={train.id}
              className={`p-2.5 rounded-xl border transition ${
                isFlipped
                  ? 'bg-red-50/50 border-red-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-400">#{train.trainNumber}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                      train.isAC
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : train.speedCategory === 'FAST'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {train.speedCategory.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-400">{train.line}</span>
                </div>

                {isFlipped ? (
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>PF FLIPPED</span>
                  </span>
                ) : isDelayed ? (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                    +{train.delayMinutes}m delay
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>On Time</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">{train.destination}</div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="font-mono">{train.expectedTime}</span>
                    <span>·</span>
                    <span>{train.carCount} Cars</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-slate-900 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                    PF {train.actualPlatform}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectPlatform(train.actualPlatform)}
                    title={`Inspect Platform ${train.actualPlatform}`}
                    aria-label={`Inspect Platform ${train.actualPlatform}`}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition active:scale-95"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
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
