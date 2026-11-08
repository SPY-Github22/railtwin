import React from 'react';
import { PlatformFlipEvent } from '../domain/stationScheduleEngine.ts';
import { AlertTriangle, ArrowRight, Compass, X } from 'lucide-react';

interface PlatformFlipAlertProps {
  event: PlatformFlipEvent;
  onRerouteToNewPlatform: (newPlatform: number) => void;
  onDismiss: () => void;
}

export const PlatformFlipAlert: React.FC<PlatformFlipAlertProps> = ({
  event,
  onRerouteToNewPlatform,
  onDismiss,
}) => {
  return (
    <div className="relative overflow-hidden p-3.5 rounded-2xl bg-white border-2 border-red-500 shadow-xl shadow-red-500/10 z-30">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                PLATFORM CHANGED
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">#{event.trainNumber}</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
              {event.destination} local reassigned from Platform {event.oldPlatform} to Platform {event.newPlatform}!
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          title="Dismiss Alert"
          aria-label="Dismiss Alert"
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <span className="line-through text-slate-400 font-bold">PF {event.oldPlatform}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-black text-red-600 px-2 py-0.5 rounded bg-red-50 border border-red-200">
            PF {event.newPlatform}
          </span>
          <span className="text-slate-400">·</span>
          <span>Arriving in ~{Math.ceil(event.etaSeconds / 60)} mins</span>
        </div>

        <button
          type="button"
          onClick={() => onRerouteToNewPlatform(event.newPlatform)}
          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Guide Me to PF {event.newPlatform} in 3D</span>
        </button>
      </div>
    </div>
  );
};
