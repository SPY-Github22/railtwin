import React, { useState, useEffect } from 'react';
import { DADAR_PLATFORMS, DADAR_FOBS } from './domain/station.ts';
import { INITIAL_TRAIN_ROSTER, advanceTrainPhysics, ActiveTrainState } from './domain/trainRakeEngine.ts';
import { calculateDetailedInterchangePath } from './domain/interchangeRouter.ts';
import { DadarStationCanvas } from './components/DadarStationCanvas.tsx';
import { CoachAlignmentHUD } from './components/CoachAlignmentHUD.tsx';
import { InterchangeRouter } from './components/InterchangeRouter.tsx';
import { Train, ShieldAlert, Footprints, AlertTriangle, CheckCircle2, Navigation, Layers } from 'lucide-react';

export type CommuterTab = 'COACH' | 'INTERCHANGE' | 'BRIDGES';

export const App: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(3);
  const [selectedFobId, setSelectedFobId] = useState<string | null>('middle-fob');
  const [trains, setTrains] = useState<ActiveTrainState[]>(INITIAL_TRAIN_ROSTER);

  // Interchange routing state
  const [sourcePf, setSourcePf] = useState<number>(3); // Western Fast
  const [targetPf, setTargetPf] = useState<number>(10); // Central Fast
  const [activeTab, setActiveTab] = useState<CommuterTab>('COACH');

  // Train Physics Simulation Loop (Advances every 200ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setTrains((prevTrains) => prevTrains.map((t) => advanceTrainPhysics(t, 0.2)));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const activePlatform = DADAR_PLATFORMS.find((p) => p.number === selectedPlatform);
  const activeTrain = trains.find((t) => t.platformNumber === selectedPlatform);
  const activeRoute = calculateDetailedInterchangePath(sourcePf, targetPf);

  const handleSelectPlatformFrom3D = (pfNum: number) => {
    setSelectedPlatform(pfNum);
    // If on interchange tab, update target or source intelligently
    if (activeTab === 'INTERCHANGE') {
      if (sourcePf === pfNum) {
        // already source
      } else {
        setTargetPf(pfNum);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-gray-100 font-sans">
      {/* Top Header HUD */}
      <header className="h-14 border-b border-gray-800 bg-gray-900/95 px-4 flex items-center justify-between backdrop-blur z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
            <Train className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base tracking-wide flex items-center space-x-2">
              <span>RailTwin 3D</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded border border-blue-700 font-mono">
                DADAR JUNCTION
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">14 Platforms · 3D Interchange & Coach Pulse</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-xs bg-gray-950/80 px-3 py-1.5 rounded-lg border border-gray-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-gray-300">Live EMU Telemetry Active</span>
          </div>
          <button 
            type="button"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/40 text-red-300 rounded-lg text-xs hover:bg-red-600/30 transition active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="hidden xs:inline">Report Chokepoint</span>
          </button>
        </div>
      </header>

      {/* Main Spatial Stage */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* 3D WebGL Canvas Viewport */}
        <section aria-label="3D Station Visualizer" className="flex-1 relative h-1/2 md:h-full">
          <DadarStationCanvas
            trains={trains}
            selectedPlatform={selectedPlatform}
            onSelectPlatform={handleSelectPlatformFrom3D}
            selectedFobId={selectedFobId}
            onSelectFob={setSelectedFobId}
            activeRoute={activeTab === 'INTERCHANGE' ? activeRoute : null}
          />
        </section>

        {/* Live Commuter Side Panel */}
        <aside 
          aria-label="Commuter Telemetry & Bridge Pulse"
          className="w-full md:w-96 border-t md:border-t-0 md:border-l border-gray-800 bg-gray-900/80 p-3.5 overflow-y-auto shrink-0 flex flex-col space-y-3.5"
        >
          {/* Commuter Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('COACH')}
              className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'COACH'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              <span>Coach Locator</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INTERCHANGE')}
              className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'INTERCHANGE'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Interchange</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BRIDGES')}
              className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'BRIDGES'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bridge Pulse</span>
            </button>
          </div>

          {/* TAB 1: COACH LOCATOR */}
          {activeTab === 'COACH' && (
            <div className="flex flex-col space-y-3">
              <CoachAlignmentHUD train={activeTrain} platformNumber={selectedPlatform ?? 3} />

              {/* Selected Platform Inspection Card */}
              {activePlatform ? (
                <div className="p-3 rounded-xl bg-gray-950/90 border border-gray-800 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                      Platform Telemetry
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                      {activePlatform.line} LINE
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-black text-white">Platform {activePlatform.number}</span>
                    <span className="text-xs text-gray-400">{activePlatform.side} Concourses</span>
                  </div>

                  {/* Verified Platform Amenities */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center space-x-1.5 text-gray-300">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activePlatform.amenities.hasLift ? 'text-emerald-400' : 'text-gray-600'}`} />
                      <span>{activePlatform.amenities.hasLift ? 'Working Lift' : 'No Lift'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-gray-300">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activePlatform.amenities.hasEscalator ? 'text-emerald-400' : 'text-gray-600'}`} />
                      <span>{activePlatform.amenities.hasEscalator ? 'Escalator' : 'No Escalator'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-gray-300">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activePlatform.amenities.hasWaterKiosk ? 'text-emerald-400' : 'text-gray-600'}`} />
                      <span>Drinking Water</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-gray-300">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activePlatform.amenities.hasJanAahaar ? 'text-emerald-400' : 'text-gray-600'}`} />
                      <span>Jan Aahaar</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: SMART INTERCHANGE ROUTE */}
          {activeTab === 'INTERCHANGE' && (
            <div className="flex flex-col space-y-3">
              <InterchangeRouter
                sourcePf={sourcePf}
                targetPf={targetPf}
                onSelectSourcePf={setSourcePf}
                onSelectTargetPf={setTargetPf}
                route={activeRoute}
              />
            </div>
          )}

          {/* TAB 3: OVERBRIDGE CONGESTION RADAR */}
          {activeTab === 'BRIDGES' && (
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Footprints className="w-3.5 h-3.5 text-blue-400" />
                  <span>Overbridge Congestion</span>
                </h2>
                <span className="text-[10px] text-gray-500">Live Pulse</span>
              </div>

              {DADAR_FOBS.map((fob) => {
                const isSelected = selectedFobId === fob.id;
                const badgeColor =
                  fob.congestion === 'FREE_FLOW'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : fob.congestion === 'MODERATE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-red-500/20 text-red-300 border-red-500/40';

                return (
                  <button
                    key={fob.id}
                    type="button"
                    onClick={() => setSelectedFobId(fob.id)}
                    className={`w-full text-left p-3 rounded-xl transition border ${
                      isSelected
                        ? 'bg-gray-900 border-blue-500 shadow-lg shadow-blue-500/10'
                        : 'bg-gray-950/70 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-gray-200">{fob.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${badgeColor}`}>
                        {fob.congestion.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Transit: ~{Math.ceil(fob.averageCrossSeconds / 60)} mins</span>
                      <span className="text-gray-500">{fob.lastUpdated}</span>
                    </div>

                    {fob.congestion === 'CHOKED' && (
                      <div className="mt-2 flex items-center space-x-1.5 text-[10px] text-red-400 bg-red-950/60 p-1.5 rounded border border-red-900/60">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Crush alert: avoid central stairs, use North FOB ramp.</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Platform Quick-Selector Grid (1 to 14) */}
          <div className="pt-2 border-t border-gray-800">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Inspect Platform (1 to 14)
            </h2>
            <div className="grid grid-cols-7 gap-1.5">
              {DADAR_PLATFORMS.map((pf) => (
                <button
                  key={pf.id}
                  type="button"
                  onClick={() => setSelectedPlatform(pf.number)}
                  className={`p-1.5 rounded-lg border text-center transition ${
                    selectedPlatform === pf.number
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                      : 'bg-gray-950/80 border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <div className="text-[11px] font-black">{pf.number}</div>
                  <div className="text-[9px] text-gray-400">{pf.line === 'WESTERN' ? 'WR' : 'CR'}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
