import React from 'react';
import { DADAR_PLATFORMS, DADAR_FOBS } from './domain/station.ts';
import { Train, ShieldAlert, Navigation } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-gray-100 font-sans">
      {/* Top Header HUD */}
      <header className="h-14 border-b border-gray-800 bg-gray-900/90 px-4 flex items-center justify-between backdrop-blur z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
            <Train className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide flex items-center space-x-2">
              <span>RailTwin 3D</span>
              <span className="text-xs px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded border border-blue-700 font-mono">
                DADAR JUNCTION
              </span>
            </h1>
            <p className="text-xs text-gray-400">14 Platforms · Western & Central Interchange</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-gray-300">Live Station Pulse</span>
          </div>
          <button 
            type="button"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/40 text-red-300 rounded-lg text-xs hover:bg-red-600/30 transition"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Report Chokepoint</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Placeholder 3D Canvas Area for Micro-Milestone 2 */}
        <section 
          aria-label="3D Station Visualizer"
          className="flex-1 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col items-center justify-center p-6 text-center relative"
        >
          <div className="max-w-md p-6 rounded-2xl bg-gray-900/60 border border-gray-800 shadow-2xl backdrop-blur">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Micro-Milestone 1 Verified</h2>
            <p className="text-sm text-gray-400 mb-4">
              Dadar Junction spatial domain logic initialized with 14 active platforms, 3 Foot Overbridges, and suburban EMU rake alignment.
            </p>
            <div className="grid grid-cols-2 gap-2 text-left text-xs bg-gray-950/70 p-3 rounded-xl border border-gray-800">
              <div>
                <span className="text-gray-500 block">Western Line</span>
                <span className="font-semibold text-blue-400">Platforms 1 – 7</span>
              </div>
              <div>
                <span className="text-gray-500 block">Central Line</span>
                <span className="font-semibold text-emerald-400">Platforms 8 – 14</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar Commuter Glance */}
        <aside 
          aria-label="Foot Overbridge Traffic"
          className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-800 bg-gray-900/70 p-4 overflow-y-auto"
        >
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Overbridge Congestion Radar
          </h2>
          <div className="space-y-3">
            {DADAR_FOBS.map((fob) => {
              const badgeColor =
                fob.congestion === 'FREE_FLOW'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : fob.congestion === 'MODERATE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-red-500/20 text-red-300 border-red-500/40';

              return (
                <div key={fob.id} className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-xs text-gray-200">{fob.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${badgeColor}`}>
                      {fob.congestion.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Cross time: ~{Math.ceil(fob.averageCrossSeconds / 60)} mins</span>
                    <span className="text-gray-500">{fob.lastUpdated}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-3">
            Active Platforms ({DADAR_PLATFORMS.length})
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {DADAR_PLATFORMS.map((pf) => (
              <div
                key={pf.id}
                className="p-2 rounded-lg bg-gray-950/80 border border-gray-800 text-center hover:border-gray-700 transition"
              >
                <div className="text-xs font-bold text-white">PF {pf.number}</div>
                <div className="text-[10px] text-gray-400">{pf.line === 'WESTERN' ? 'WR' : 'CR'}</div>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
};
