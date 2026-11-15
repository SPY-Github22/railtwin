import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  Users,
  ArrowRight,
} from 'lucide-react';
import {
  CrowdSeverityLevel,
  IncidentCategory,
  CrowdReport,
  GeoCoordinates,
  validateDadarGeofence,
  DADAR_STATION_CENTER,
} from '../domain/crowdReportEngine.ts';

interface CrowdReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: Omit<CrowdReport, 'id' | 'timestampMs'>) => void;
  initialFobId?: 'north-fob' | 'middle-fob' | 'south-fob';
}

export const CrowdReportModal: React.FC<CrowdReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport,
  initialFobId = 'middle-fob',
}) => {
  const [bridgeId, setBridgeId] = useState<'north-fob' | 'middle-fob' | 'south-fob'>(initialFobId);
  const [severity, setSeverity] = useState<CrowdSeverityLevel>('SLOW_MOVING');
  const [incident, setIncident] = useState<IncidentCategory>('STAIRCASE_JAM');
  const [notes, setNotes] = useState<string>('');

  // Geofence state
  const [userCoords, setUserCoords] = useState<GeoCoordinates | null>(null);
  const [mockAtDadar, setMockAtDadar] = useState<boolean>(true); // Default true for frictionless testing/demo
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (initialFobId) {
      setBridgeId(initialFobId);
    }
  }, [initialFobId]);

  useEffect(() => {
    if (!isOpen) {
      setSubmitSuccess(false);
      setIsSubmitting(false);
      return;
    }

    if (navigator.geolocation && !mockAtDadar) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // Graceful fallback if user denies or GPS unavailable
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen, mockAtDadar]);

  if (!isOpen) return null;

  const currentCoords: GeoCoordinates = mockAtDadar
    ? DADAR_STATION_CENTER
    : (userCoords || { latitude: 18.95, longitude: 72.82 });

  const geofenceCheck = validateDadarGeofence(currentCoords, mockAtDadar);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!geofenceCheck.isWithinGeofence && !mockAtDadar) return;

    setIsSubmitting(true);
    onSubmitReport({
      bridgeId,
      severity,
      incident,
      userCoords: currentCoords,
      isMockedLocation: mockAtDadar,
      notes: notes.trim() ? notes.trim() : undefined,
    });

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setTimeout(() => {
      onClose();
      setSubmitSuccess(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Report Bridge Congestion</h2>
              <p className="text-xs text-slate-500">Crowdsourced real-time safety alert</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Report Transmitted!</h3>
            <p className="text-sm text-slate-600 max-w-sm">
              Thank you for keeping fellow Mumbai commuters safe. The 3D twin congestion heat score has been updated.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Geofence Status Pill */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center space-x-2">
                <MapPin className={`w-4 h-4 ${geofenceCheck.isWithinGeofence ? 'text-emerald-600' : 'text-amber-500'}`} />
                <div>
                  <span className="font-semibold text-slate-800">
                    {mockAtDadar ? 'Mock GPS: Dadar Concourse (Active)' : geofenceCheck.isWithinGeofence ? 'Verified Inside Station' : 'Outside Station Geofence'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {mockAtDadar
                      ? 'Testing override active (45m from PF 3)'
                      : `${geofenceCheck.distanceMeters}m from Dadar Station center`}
                  </p>
                </div>
              </div>

              {/* Mock Toggle */}
              <button
                type="button"
                onClick={() => setMockAtDadar(!mockAtDadar)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition border ${
                  mockAtDadar
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {mockAtDadar ? 'Mock On' : 'Simulate Dadar'}
              </button>
            </div>

            {/* Bridge Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Foot Overbridge (FOB)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'north-fob' as const, label: 'North FOB', desc: 'PF 1–7 to 8–14' },
                  { id: 'middle-fob' as const, label: 'Middle FOB', desc: 'Main Interchange' },
                  { id: 'south-fob' as const, label: 'South FOB', desc: 'Flower Market' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBridgeId(f.id)}
                    className={`p-2.5 rounded-2xl text-left border transition ${
                      bridgeId === f.id
                        ? 'bg-blue-50/70 border-blue-600 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{f.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Congestion Severity
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: 'NORMAL' as const, label: 'Clear', color: 'emerald', icon: '🟢' },
                  { id: 'SLOW_MOVING' as const, label: 'Slow', color: 'amber', icon: '🟡' },
                  { id: 'DENSE' as const, label: 'Dense', color: 'orange', icon: '🟠' },
                  { id: 'CHOKED_CRUSH' as const, label: 'Crush Hazard', color: 'rose', icon: '🔴' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id)}
                    className={`py-2 px-3 rounded-xl text-center border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                      severity === s.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Incident Classification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Primary Cause / Chokepoint
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'NORMAL_COMMUTE' as const, label: 'Normal Rush' },
                  { id: 'STAIRCASE_JAM' as const, label: 'Staircase Jam' },
                  { id: 'ESCALATOR_HALTED' as const, label: 'Escalator Broken' },
                  { id: 'HEAVY_RAIN_WATERLOGGING' as const, label: 'Rain Waterlogging' },
                  { id: 'POLICE_BARRICADE' as const, label: 'Police Barricade' },
                ].map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => setIncident(inc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      incident === inc.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {inc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Optional Commuter Note
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Platform 4 staircase jammed, take South FOB instead"
                maxLength={100}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || (!geofenceCheck.isWithinGeofence && !mockAtDadar)}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition ${
                  geofenceCheck.isWithinGeofence || mockAtDadar
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Broadcast Chokepoint Report</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
