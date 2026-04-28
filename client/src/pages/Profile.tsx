//import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { User, Shield, Mail, LogOut, Activity, MapPin, Warehouse, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { t } = useTranslation();
  const { user, logout, zones, depots, lastSyncLog } = useStore();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Profile</h1>
          <p className="text-slate-500 font-medium">Manage your coordinator account and session</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-500/30 hover:bg-rose-600 transition-all active:scale-95"
        >
          <LogOut size={18} />
          {t('auth.logout')}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="md:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200/50">
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-xl">
              <User size={40} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-slate-900">{user.email.split('@')[0]}</h2>
                {user.role === 'admin' && (
                  <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-sm">
                    <Shield size={10} />
                    {user.role}
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Session Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">System ID</p>
                <p className="text-slate-700 font-mono text-xs truncate">{user.id}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Role</p>
                <p className="text-slate-900 font-bold capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Stats */}
        {user.role === 'admin' ? (
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/30 transition-colors" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="text-blue-400" size={24} />
                <h3 className="text-lg font-black tracking-tight">Admin Stats</h3>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-3xl font-black">{zones.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Zones</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-400">
                    <Warehouse size={24} />
                  </div>
                  <div>
                    <p className="text-3xl font-black">{depots.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Depots</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Sync Activity</span>
                  </div>
                  <p className="text-xs font-medium text-slate-300">
                    {lastSyncLog && lastSyncLog.length > 0 
                      ? new Date(lastSyncLog[0] as { synced_at: string }).synced_at).toLocaleString() 
                      : 'No sync history recorded'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-center items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Shield size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Standard Access</h3>
              <p className="text-white/70 text-sm font-medium">Your account has field coordinator privileges.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
