import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import ZoneMap from '../components/ZoneMap';
import PriorityBar from '../components/PriorityBar';
import { Activity, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

export default function Dashboard() {
  const { zones, latestPlan, setLatestPlan, setZones } = useStore();
  const [running, setRunning] = useState(false);
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/api/zones/stale`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setShowStaleWarning(true);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Sort zones for the right panel by priority descending
  const sortedZones = [...zones].sort((a, b) => b.priorityScore - a.priorityScore);

  const handleRunAllocation = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/allocation/run?lang=${i18n.language}`, {
        method: 'POST',
      });
      const data = await res.json();
      setLatestPlan(data);
      // Re-fetch zones because their priority scores might have been updated
      const zonesRes = await fetch(`${API_BASE_URL}/api/zones`);
      const updatedZones = await zonesRes.json();
      setZones(updatedZones);
    } catch (err) {
      console.error('Failed to run allocation', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {showStaleWarning && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 flex items-start justify-between text-amber-800 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{t('dashboard.stale_warning')}</span>
          </div>
          <button onClick={() => setShowStaleWarning(false)} className="text-amber-600 hover:text-amber-800 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>
      )}
      {/* Dashboard Top Action Bar */}
      <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('dashboard.operational_dashboard')}</h2>
          <p className="text-sm text-slate-500">{t('dashboard.realtime_overview')}</p>
        </div>
        <button
          onClick={handleRunAllocation}
          disabled={running}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg font-bold transition-all duration-300 active:scale-95 ${
            running 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/30'
          }`}
        >
          {running ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              {t('allocation.running')}
            </>
          ) : (
            <>
              <Activity size={18} />
              {t('allocation.run')}
            </>
          )}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Map */}
        <div className="flex-1 p-4 bg-slate-50 h-full relative">
          <div className="h-full w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <ZoneMap zones={zones} plan={latestPlan} />
          </div>
        </div>

        {/* Right Panel: Sorted Zones */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <h3 className="font-semibold text-slate-700">{t('dashboard.critical_zones')}</h3>
            <p className="text-xs text-slate-500">{t('dashboard.sorted_by')}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sortedZones.map((zone, index) => (
              <div 
                key={zone.id} 
                className="group p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full mb-1 inline-block">
                      {t('dashboard.priority_rank')}{index + 1}
                    </span>
                    <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{zone.name}</h4>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-400">
                    {zone.lat.toFixed(2)}, {zone.lng.toFixed(2)}
                  </div>
                </div>
                <PriorityBar score={zone.priorityScore} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-2 rounded-lg text-center group-hover:bg-blue-50 transition-colors">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{t('zone.severity')}</p>
                    <p className="text-sm font-black text-slate-700">{zone.severityScore}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center group-hover:bg-blue-50 transition-colors">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{t('zone.population')}</p>
                    <p className="text-sm font-black text-slate-700">{(zone.populationDensity / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center group-hover:bg-blue-50 transition-colors">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{t('zone.roads')}</p>
                    <p className="text-sm font-black text-slate-700">{zone.roadAccessibility}</p>
                  </div>
                </div>
              </div>
            ))}
            {sortedZones.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-10">
                {t('dashboard.no_zones')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
