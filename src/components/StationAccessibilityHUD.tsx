import React, { useState } from 'react';
import {
  Accessibility,
  PhoneCall,
  Layers,
  ArrowUpRight,
  CheckCircle,
  AlertOctagon,
  Wrench,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  BridgeCongestionSnapshot,
  DADAR_ACCESSIBILITY_EQUIPMENT,
  DADAR_EMERGENCY_CONTACTS,
} from '../domain/crowdReportEngine.ts';

interface StationAccessibilityHUDProps {
  onSelectFob: (fobId: string) => void;
  selectedFobId: string | null;
  bridgeCongestion: Record<'north-fob' | 'middle-fob' | 'south-fob', BridgeCongestionSnapshot>;
  onOpenReportModal: (fobId?: 'north-fob' | 'middle-fob' | 'south-fob') => void;
}

type RadarSubTab = 'BRIDGES' | 'EQUIPMENT' | 'EMERGENCY';

export const StationAccessibilityHUD: React.FC<StationAccessibilityHUDProps> = ({
  onSelectFob,
  selectedFobId,
  bridgeCongestion,
  onOpenReportModal,
}) => {
  const [subTab, setSubTab] = useState<RadarSubTab>('BRIDGES');

  return (
    <div className="flex flex-col h-full text-slate-800">
      {/* Subtab Navigator */}
      <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-2xl mb-3 border border-slate-200/80">
        <button
          type="button"
          onClick={() => setSubTab('BRIDGES')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
            subTab === 'BRIDGES'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>FOB Bridges</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('EQUIPMENT')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
            subTab === 'EQUIPMENT'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Accessibility className="w-3.5 h-3.5" />
          <span>Lifts & Esc</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('EMERGENCY')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
            subTab === 'EMERGENCY'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Helplines</span>
        </button>
      </div>

      {/* Subtab Content Panels */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {/* TAB 1: BRIDGES & CROWD STATUS */}
        {subTab === 'BRIDGES' && (
          <div className="space-y-2">
            {(
              [
                { id: 'north-fob' as const, platforms: 'PF 1–7 to PF 8–14' },
                { id: 'middle-fob' as const, platforms: 'PF 1–14 (Wide Interchange)' },
                { id: 'south-fob' as const, platforms: 'PF 1–14 & Flower Market' },
              ]
            ).map((b) => {
              const snap = bridgeCongestion[b.id];
              const isSelected = selectedFobId === b.id;

              const statusColor =
                snap.congestionStatus === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : snap.congestionStatus === 'HIGH'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : snap.congestionStatus === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectFob(b.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col space-y-2 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{snap.bridgeName}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{b.platforms}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg border ${statusColor}`}>
                      {snap.congestionStatus} RUSH
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center space-x-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{snap.activeReportsCount} live reports</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-700">{snap.weightedScore}/100</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReportModal(b.id);
                      }}
                      className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                    >
                      Report Here
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: LIFTS & ESCALATORS RADAR */}
        {subTab === 'EQUIPMENT' && (
          <div className="space-y-2">
            {DADAR_ACCESSIBILITY_EQUIPMENT.map((eq) => (
              <div
                key={eq.id}
                className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                      {eq.type}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{eq.name}</h4>
                  </div>
                  {eq.status === 'OPERATIONAL' && (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      <CheckCircle className="w-3 h-3" />
                      <span>ONLINE</span>
                    </span>
                  )}
                  {eq.status === 'UNDER_MAINTENANCE' && (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      <Wrench className="w-3 h-3" />
                      <span>MAINTENANCE</span>
                    </span>
                  )}
                  {eq.status === 'POWER_OFF' && (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                      <AlertOctagon className="w-3 h-3" />
                      <span>OFFLINE</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600">{eq.locationDescription}</p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                  <span>Serving Platforms: {eq.connectedPlatforms.join(', ')}</span>
                  {eq.wheelchairAccessible && (
                    <span className="text-blue-600 font-semibold flex items-center space-x-1">
                      <Accessibility className="w-3 h-3" />
                      <span>Wheelchair Ready</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: EMERGENCY SPEED DIALERS */}
        {subTab === 'EMERGENCY' && (
          <div className="space-y-2">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2.5 text-rose-800">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
              <div className="text-xs">
                <span className="font-bold">Station Emergency Dialers</span>
                <p className="text-[11px] text-rose-700">Tapping a number initiates instant direct call on mobile.</p>
              </div>
            </div>

            {DADAR_EMERGENCY_CONTACTS.map((c) => (
              <a
                key={c.id}
                href={`tel:${c.telephone}`}
                className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-400 hover:bg-blue-50/30 transition block"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        c.priority === 'EMERGENCY'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {c.priority}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{c.designation}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                </div>

                <div className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 group-hover:bg-blue-600 text-slate-800 rounded-xl text-xs font-bold shrink-0">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  <span>{c.telephone}</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
