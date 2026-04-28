import { useState } from 'react';
import { useStore, Zone } from '../store/useStore';
import { Upload, Save, RefreshCw } from 'lucide-react';
import PriorityBar from '../components/PriorityBar';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

export default function Zones() {
  const { zones, setZones } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Zone>>({});
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  const startEdit = (zone: Zone) => {
    setEditingId(zone.id);
    setEditForm({ ...zone });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/zones/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      // Update local state temporarily, real app would fetch
      const updatedZones = zones.map(z => z.id === editingId ? { ...z, ...editForm } as Zone : z);
      setZones(updatedZones);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save zone', err);
    } finally {
      setSaving(false);
    }
  };

  const recalculatePriority = async () => {
    setSaving(true);
    try {
      const res = await fetch('http://localhost:3001/api/zones/recalculate', {
        method: 'POST'
      });
      const updatedZones = await res.json();
      setZones(updatedZones);
    } catch (err) {
      console.error('Failed to recalculate', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50/50">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t('zone.title')}</h2>
          <p className="text-sm text-slate-500 font-medium">{t('zone.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={recalculatePriority} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm active:scale-95">
            <RefreshCw size={18} /> {t('zone.recalculate')}
          </button>
          <button className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/20 active:scale-95">
            <Upload size={18} /> {t('zone.import_csv')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-widest font-black">
            <tr>
              <th className="p-6">{t('zone.name')}</th>
              <th className="p-6 text-center">{t('zone.priority')}</th>
              <th className="p-6 text-center">{t('zone.severity')}</th>
              <th className="p-6 text-center">{t('zone.population')}</th>
              <th className="p-6 text-center">{t('zone.roads')}</th>
              <th className="p-6 text-right">{t('zone.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {zones.map((zone) => (
              <tr key={zone.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-10 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                    <span className="font-bold text-slate-800 text-base">{zone.name}</span>
                  </div>
                </td>
                
                <td className="p-6 w-40">
                  <div className="text-center font-black text-blue-600 mb-2 text-lg">
                    {zone.priorityScore.toFixed(2)}
                  </div>
                  <PriorityBar score={zone.priorityScore} />
                </td>

                <td className="p-6 text-center">
                  {editingId === zone.id ? (
                    <input 
                      type="range" min="0" max="10" 
                      value={editForm.severityScore || 0} 
                      onChange={e => setEditForm({...editForm, severityScore: parseInt(e.target.value)})}
                      className="w-full accent-blue-600"
                    />
                  ) : (
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-white shadow-lg ${
                      zone.severityScore >= 8 ? 'bg-rose-500 shadow-rose-900/20' : 
                      zone.severityScore >= 5 ? 'bg-amber-500 shadow-amber-900/20' : 
                      'bg-emerald-500 shadow-emerald-900/20'
                    } group-hover:scale-110 transition-transform`}>
                      {zone.severityScore}
                    </span>
                  )}
                </td>

                <td className="p-6 text-center">
                  {editingId === zone.id ? (
                    <input 
                      type="number" 
                      value={editForm.populationDensity || 0} 
                      onChange={e => setEditForm({...editForm, populationDensity: parseInt(e.target.value)})}
                      className="border-2 border-slate-100 rounded-xl px-3 py-1.5 w-32 font-bold text-center focus:border-blue-400 outline-none transition-all"
                    />
                  ) : (
                    <div className="text-slate-600 font-bold">
                      {(zone.populationDensity / 1000).toFixed(1)}k
                      <p className="text-[10px] text-slate-300 font-black uppercase tracking-tighter">{t('zone.people')}</p>
                    </div>
                  )}
                </td>

                <td className="p-6 text-center">
                  {editingId === zone.id ? (
                    <input 
                      type="range" min="0" max="10" 
                      value={editForm.roadAccessibility || 0} 
                      onChange={e => setEditForm({...editForm, roadAccessibility: parseInt(e.target.value)})}
                      className="w-full accent-blue-600"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                          style={{ width: `${zone.roadAccessibility * 10}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{zone.roadAccessibility} / 10</p>
                    </div>
                  )}
                </td>

                <td className="p-6 text-right">
                  {editingId === zone.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-700 text-sm font-bold px-4 py-2">{t('zone.cancel')}</button>
                      <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 text-sm font-black px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                        <Save size={16} /> {t('zone.save')}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(zone)} className="text-blue-600 hover:text-white text-sm font-black px-6 py-2.5 bg-blue-50 hover:bg-blue-600 rounded-xl transition-all active:scale-95 shadow-sm">
                      {t('zone.edit_data')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
