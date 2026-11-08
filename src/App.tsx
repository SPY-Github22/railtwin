import React, { useState, useEffect } from 'react';
import { DADAR_PLATFORMS, DADAR_FOBS } from './domain/station.ts';
import { INITIAL_TRAIN_ROSTER, advanceTrainPhysics, ActiveTrainState } from './domain/trainRakeEngine.ts';
import { calculateDetailedInterchangePath } from './domain/interchangeRouter.ts';
import { detectPlatformFlipEvents, PlatformFlipEvent } from './domain/stationScheduleEngine.ts';
import { DadarStationCanvas } from './components/DadarStationCanvas.tsx';
import { CoachAlignmentHUD } from './components/CoachAlignmentHUD.tsx';
import { InterchangeRouter } from './components/InterchangeRouter.tsx';
import { PlatformFlipAlert } from './components/PlatformFlipAlert.tsx';
import { SuburbanTimetableHUD } from './components/SuburbanTimetableHUD.tsx';
import {
  Train,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type CommuterTab = 'COACH' | 'INTERCHANGE' | 'TIMETABLE' | 'BRIDGES';

export const App: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(3);
  const [selectedFobId, setSelectedFobId] = useState<string | null>('middle-fob');
  const [trains, setTrains] = useState<ActiveTrainState[]>(INITIAL_TRAIN_ROSTER);

  // Interchange routing state
  const [sourcePf, setSourcePf] = useState<number>(3);
  const [targetPf, setTargetPf] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<CommuterTab>('COACH');
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState<boolean>(false);

  // Platform Flip active alert
  const [flipAlert, setFlipAlert] = useState<PlatformFlipEvent | null>(() => {
    const detected = detectPlatformFlipEvents();
    return detected.length > 0 ? detected[0] : null;
  });

  // Train Physics Simulation Loop (Advances every 200ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setTrains((prevTrains) => prevTrains.map((t) => advanceTrainPhysics(t, 0.2)));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const activeTrain = trains.find((t) => t.platformNumber === selectedPlatform);
  const activeRoute = calculateDetailedInterchangePath(sourcePf, targetPf);

  const handleSelectPlatformFrom3D = (pfNum: number) => {
    setSelectedPlatform(pfNum);
    setIsDrawerCollapsed(false);
    if (activeTab === 'INTERCHANGE') {
      if (sourcePf !== pfNum) {
        setTargetPf(pfNum);
      }
    }
  };

  const handleRerouteAfterPlatformFlip = (newPlatform: number) => {
    setTargetPf(newPlatform);
    setSelectedPlatform(newPlatform);
    setActiveTab('INTERCHANGE');
    setIsDrawerCollapsed(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* 3D WebGL Canvas: Full-Screen Hero Viewport */}
      <div className="absolute inset-0 z-0">
        <DadarStationCanvas
          trains={trains}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={handleSelectPlatformFrom3D}
          selectedFobId={selectedFobId}
          onSelectFob={setSelectedFobId}
          activeRoute={activeTab === 'INTERCHANGE' ? activeRoute : null}
        />
      </div>

      {/* Floating Top Header Bar */}
      <header className="absolute top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-20 flex items-center justify-between sm:space-x-3 bg-white/95 px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/50 backdrop-blur">
        {/* Brand & Station Indicator */}
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-600 rounded-xl text-white shadow-sm">
            <Train className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-sm tracking-tight text-slate-900">RailTwin</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold rounded-md border border-blue-200">
                DADAR
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">14 Platforms · 3D Live Twin</p>
          </div>
        </div>

        {/* Minimalist Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 mx-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('COACH');
              setIsDrawerCollapsed(false);
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeTab === 'COACH' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Coach
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('INTERCHANGE');
              setIsDrawerCollapsed(false);
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeTab === 'INTERCHANGE' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Route
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('TIMETABLE');
              setIsDrawerCollapsed(false);
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeTab === 'TIMETABLE' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('BRIDGES');
              setIsDrawerCollapsed(false);
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeTab === 'BRIDGES' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bridges
          </button>
        </div>

        {/* Report Button */}
        <button
          type="button"
          className="flex items-center space-x-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition active:scale-95 shrink-0"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          <span className="hidden md:inline">Report Chokepoint</span>
        </button>
      </header>

      {/* Floating Platform Flip Alert (Appears dynamically) */}
      {flipAlert && (
        <div className="absolute top-20 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-30">
          <PlatformFlipAlert
            event={flipAlert}
            onRerouteToNewPlatform={handleRerouteAfterPlatformFlip}
            onDismiss={() => setFlipAlert(null)}
          />
        </div>
      )}

      {/* Floating Minimalist Bottom Sheet Card (Glanceable & Decluttered) */}
      <div className="absolute bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[520px] z-20">
        <div className="bg-white/95 rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-300/50 backdrop-blur overflow-hidden transition-all duration-300">
          {/* Header Row of the Floating Card with Collapse Toggle */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {activeTab === 'COACH' && `Platform ${selectedPlatform ?? 3} Focus`}
                {activeTab === 'INTERCHANGE' && 'Cross-Platform Navigation'}
                {activeTab === 'TIMETABLE' && 'Suburban Live Departures'}
                {activeTab === 'BRIDGES' && 'Overbridge Congestion'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
              title={isDrawerCollapsed ? 'Expand card' : 'Collapse card'}
              aria-label={isDrawerCollapsed ? 'Expand card' : 'Collapse card'}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              {isDrawerCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Platform Carousel (1 to 14) */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center space-x-1.5 overflow-x-auto">
            {DADAR_PLATFORMS.map((pf) => (
              <button
                key={pf.id}
                type="button"
                onClick={() => {
                  setSelectedPlatform(pf.number);
                  setIsDrawerCollapsed(false);
                }}
                className={`flex-shrink-0 w-8 h-8 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition ${
                  selectedPlatform === pf.number
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{pf.number}</span>
              </button>
            ))}
          </div>

          {/* Body Content (Toggles open/closed) */}
          {!isDrawerCollapsed && (
            <div className="p-4 max-h-[380px] overflow-y-auto">
              {/* TAB 1: COACH LOCATOR */}
              {activeTab === 'COACH' && (
                <CoachAlignmentHUD train={activeTrain} platformNumber={selectedPlatform ?? 3} />
              )}

              {/* TAB 2: SMART INTERCHANGE ROUTE */}
              {activeTab === 'INTERCHANGE' && (
                <InterchangeRouter
                  sourcePf={sourcePf}
                  targetPf={targetPf}
                  onSelectSourcePf={setSourcePf}
                  onSelectTargetPf={setTargetPf}
                  route={activeRoute}
                />
              )}

              {/* TAB 3: TIMETABLE */}
              {activeTab === 'TIMETABLE' && (
                <SuburbanTimetableHUD onSelectPlatform={handleSelectPlatformFrom3D} />
              )}

              {/* TAB 4: BRIDGES RADAR */}
              {activeTab === 'BRIDGES' && (
                <div className="space-y-2">
                  {DADAR_FOBS.map((fob) => {
                    const isSelected = selectedFobId === fob.id;
                    const badgeColor =
                      fob.congestion === 'FREE_FLOW'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : fob.congestion === 'MODERATE'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200';

                    return (
                      <button
                        key={fob.id}
                        type="button"
                        onClick={() => setSelectedFobId(fob.id)}
                        className={`w-full text-left p-3 rounded-2xl transition border ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900">{fob.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badgeColor}`}>
                            {fob.congestion.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Cross time: ~{Math.ceil(fob.averageCrossSeconds / 60)} mins</span>
                          <span>{fob.lastUpdated}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
