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
    <div className="relative overflow-hidden p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950 via-red-900/90 to-amber-950 border-2 border-red-500 shadow-2xl shadow-red-950/60 animate-bounce-subtle z-30">
      {/* Background Pulse Glow */}
      <div className="absolute -right-8 -top-8 w-28 h-28 bg-red-500/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-red-600 text-white shadow-lg animate-pulse shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-800 text-red-200 border border-red-700">
                CRITICAL PLATFORM FLIP
              </span>
              <span className="text-xs font-mono font-bold text-gray-300">#{event.trainNumber}</span>
            </div>
            <h3 className="text-sm font-black text-white mt-0.5">
              {event.destination} Fast reassigned from Platform {event.oldPlatform} to Platform {event.newPlatform}!
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          title="Dismiss Alert"
          aria-label="Dismiss Alert"
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-red-800/40 transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-black/40 p-2.5 rounded-xl border border-red-800/50">
        <div className="flex items-center space-x-3 text-xs text-red-200">
          <div className="flex items-center space-x-1.5">
            <span className="line-through text-red-400 font-bold">PF {event.oldPlatform}</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
            <span className="text-base font-black text-yellow-300 px-2 py-0.5 rounded bg-red-950 border border-yellow-500/60">
              PF {event.newPlatform}
            </span>
          </div>
          <span className="text-gray-400">·</span>
          <span>Arriving in ~{Math.ceil(event.etaSeconds / 60)} mins</span>
        </div>

        <button
          type="button"
          onClick={() => onRerouteToNewPlatform(event.newPlatform)}
          className="flex items-center justify-center space-x-2 px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs shadow-lg shadow-yellow-500/20 transition active:scale-95"
        >
          <Compass className="w-4 h-4 text-gray-950" />
          <span>Guide Me to PF {event.newPlatform} in 3D</span>
        </button>
      </div>
    </div>
  );
};
