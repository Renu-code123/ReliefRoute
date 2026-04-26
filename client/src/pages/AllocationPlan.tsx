import React, { useState, useEffect } from 'react';
import { useStore, ZoneAllocation } from '../store/useStore';
import { Printer, AlertTriangle, ShieldAlert, Warehouse, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

export default function AllocationPlan() {
  const { latestPlan, zones, depots } = useStore();
  const [auditResult, setAuditResult] = useState<any>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // Attempt to run audit if plan exists
    if (latestPlan) {
      fetch(`${API_BASE_URL}/api/audit/run?lang=${i18n.language}`, { method: 'POST' })
        .then(r => r.json())
        .then(data => setAuditResult(data))
        .catch(console.error);
    }
  }, [latestPlan, i18n.language]);

  if (!latestPlan) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t('allocation.no_plan')}
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!latestPlan) return;
    const headers = [t('allocation.zone'), t('allocation.priority_col'), t('resource.food'), t('resource.medicine'), t('resource.shelterKits'), t('resource.rescueTeams'), t('allocation.from_depot'), t('allocation.eta'), t('allocation.ai_justification_col')];
    const rows = latestPlan.zoneAllocations.map(a => [
      zones.find(z => z.id === a.zoneId)?.name || t('allocation.unknown'),
      zones.find(z => z.id === a.zoneId)?.priorityScore.toFixed(2) || '0',
      a.assignedResources.food,
      a.assignedResources.medicine,
      a.assignedResources.shelterKits,
      a.assignedResources.rescueTeams,
      depots.find(d => d.id === a.depotId)?.name || t('allocation.none'),
      a.estimatedETA,
      `"${a.justification.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ReliefRoute_Allocation_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const scoreColor = auditResult?.overallEquityScore >= 0.8 ? 'text-green-600 bg-green-50' 
                   : auditResult?.overallEquityScore >= 0.5 ? 'text-orange-600 bg-orange-50' 
                   : 'text-red-600 bg-red-50';

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-end mb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('allocation.master_plan')}</h2>
          <p className="text-sm text-slate-500">{t('allocation.generated')} {new Date(latestPlan.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 shadow-sm transition-all active:scale-95">
            <Printer size={16} /> {t('allocation.export_pdf')}
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-700 shadow-lg shadow-slate-900/20 transition-all active:scale-95">
            <Download size={16} /> {t('allocation.export_csv')}
          </button>
        </div>
      </div>

      {/* Equity Score Card */}
      {auditResult && (
        <div className={`p-6 rounded-3xl border-2 mb-8 flex items-center justify-between ${scoreColor} shadow-xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.01]`}>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/40 flex items-center justify-center shadow-inner">
              <ShieldAlert size={32} className="text-current" />
            </div>
            <div>
              <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                {t('audit.equity_score')}
              </h3>
              <p className="text-sm opacity-80 mt-1 max-w-md font-medium">
                {t('audit.equity_desc')}
              </p>
            </div>
          </div>
          <div className="text-6xl font-black tabular-nums tracking-tighter">
            {(auditResult.overallEquityScore * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {latestPlan.equityFlag && !auditResult && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg mb-6 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">{t('audit.warning_triggered')}</h4>
            <p className="text-sm">{t('audit.warning_desc')}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-widest font-black">
            <tr>
              <th className="p-6">{t('allocation.zone')}</th>
              <th className="p-6 text-center">{t('allocation.priority_col')}</th>
              <th className="p-6">{t('allocation.assigned_resources')}</th>
              <th className="p-6">{t('allocation.from_depot')}</th>
              <th className="p-6">{t('allocation.eta')}</th>
              <th className="p-6 w-1/3">{t('allocation.ai_justification_col')}</th>
              <th className="p-6 text-right print:hidden">{t('allocation.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {latestPlan.zoneAllocations.map((alloc: ZoneAllocation) => {
              const zone = zones.find(z => z.id === alloc.zoneId);
              const depot = depots.find(d => d.id === alloc.depotId);
              const isFlagged = auditResult?.flaggedZones?.some((f: any) => f.zoneId === alloc.zoneId);
              const flaggedReason = auditResult?.flaggedZones?.find((f: any) => f.zoneId === alloc.zoneId)?.reason;

              return (
                <tr key={alloc.zoneId} className={`group hover:bg-blue-50/30 transition-colors duration-300 ${isFlagged ? 'bg-amber-50/40' : ''}`}>
                  <td className="p-6">
                    <div className="font-bold text-slate-800 flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${isFlagged ? 'bg-amber-400' : 'bg-blue-400 opacity-20 group-hover:opacity-100'} transition-all`} />
                      <div>
                        <p className="text-base">{zone?.name || t('allocation.unknown')}</p>
                        {isFlagged && <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter mt-1">{t('allocation.flagged')}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600 font-black group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                      {zone?.priorityScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="text-xs text-slate-600 grid grid-cols-2 gap-x-4 gap-y-2 font-bold">
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">🍱</span> {alloc.assignedResources.food.toLocaleString()}</span>
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">💊</span> {alloc.assignedResources.medicine.toLocaleString()}</span>
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">⛺</span> {alloc.assignedResources.shelterKits.toLocaleString()}</span>
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">🚁</span> {alloc.assignedResources.rescueTeams.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-400 transition-colors">
                        <Warehouse size={14} />
                      </div>
                      <span className="font-semibold text-slate-700">{depot?.name || t('allocation.none')}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span 
                      className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm cursor-help"
                      title={alloc.routePolyline && alloc.routePolyline.length > 2 ? t('allocation.via_road') : t('allocation.estimated')}
                    >
                      {t('sync.eta_approx')}{alloc.estimatedETA}{t('sync.minutes_short')}
                    </span>
                  </td>
                  <td className="p-6 text-xs text-slate-500 italic leading-relaxed">
                    {alloc.justification}
                  </td>
                  <td className="p-6 text-right print:hidden">
                    <button className="text-blue-600 hover:text-white text-xs font-black px-4 py-2 bg-blue-50 hover:bg-blue-600 rounded-xl transition-all active:scale-95 shadow-sm">
                      {t('allocation.override')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
