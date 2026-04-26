import React, { useState } from 'react';
import { useStore, Depot } from '../store/useStore';
import { Save, MapPin, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

const CAPACITIES = {
  food: 10000,
  medicine: 5000,
  shelterKits: 2000,
  rescueTeams: 50
};

export default function Depots() {
  const { depots, setDepots } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  const hasPlaceholder = depots.some(d => d.update_source === 'placeholder');

  const startEdit = (depot: Depot) => {
    setEditingId(depot.id);
    setEditForm({ ...depot.inventory });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/depots/${editingId}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      const updatedDepots = depots.map(d => 
        d.id === editingId ? { ...d, inventory: { ...d.inventory, ...editForm } } as Depot : d
      );
      setDepots(updatedDepots);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save depot inventory', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      {hasPlaceholder && (
        <div className="bg-amber-100 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle size={24} className="shrink-0" />
            <p className="font-semibold text-sm">{t('depots.placeholder_warning')}</p>
          </div>
        </div>
      )}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{t('depots.title')}</h2>
        <p className="text-sm text-slate-500">{t('depots.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {depots.map(depot => (
          <div key={depot.id} className="group bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-xl hover:border-blue-200 transition-all duration-500 hover:-translate-y-1">
            <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
              <h3 className="font-black text-slate-800 text-xl group-hover:text-blue-700 transition-colors">{depot.name}</h3>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 mt-1 tracking-wide">
                <MapPin size={12} className="text-blue-400" /> {depot.lat.toFixed(4)}, {depot.lng.toFixed(4)}
              </p>
            </div>
            
            <div className="p-6 flex-1 space-y-5">
              {(Object.keys(CAPACITIES) as Array<keyof typeof CAPACITIES>).map(key => {
                const current = Math.max(0, depot.inventory[key]);
                const capacity = CAPACITIES[key];
                const percentage = Math.min(100, Math.max(0, (current / capacity) * 100));
                
                let barColor = 'bg-gradient-to-r from-blue-400 to-indigo-500';
                if (percentage < 20) barColor = 'bg-gradient-to-r from-red-400 to-rose-600';
                else if (percentage < 50) barColor = 'bg-gradient-to-r from-orange-400 to-amber-500';

                return (
                  <div key={key} className="group/item">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="uppercase tracking-widest font-black text-slate-400 group-hover/item:text-slate-600 transition-colors">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {editingId === depot.id ? (
                        <input 
                          type="number" 
                          value={editForm[key] || 0}
                          onChange={e => setEditForm({...editForm, [key]: Math.max(0, parseInt(e.target.value) || 0)})}
                          className="w-20 border-2 border-blue-100 rounded-lg px-2 py-0.5 text-right text-xs font-bold focus:border-blue-400 outline-none"
                        />
                      ) : (
                        <span className="text-slate-700 font-black">{current.toLocaleString()} <span className="text-slate-300 font-bold">/ {capacity.toLocaleString()}</span></span>
                      )}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <div className={`h-full ${barColor} transition-all duration-1000 ease-out rounded-full`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
              {editingId === depot.id ? (
                <>
                  <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-700 text-sm font-bold px-4 py-1.5">{t('depots.cancel')}</button>
                  <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold px-6 py-2 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                    <Save size={16} /> {t('depots.save')}
                  </button>
                </>
              ) : (
                <button onClick={() => startEdit(depot)} className="text-slate-500 hover:text-blue-600 text-sm font-bold px-5 py-2 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all shadow-sm">
                  {t('depots.edit_inventory')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
