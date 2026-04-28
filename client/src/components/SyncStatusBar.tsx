import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface ServiceStatus {
  lastSuccess: number | null;
  failCount: number;
  lastError: string | null;
}

export function SyncStatusBar() {
  const { t } = useTranslation();
  const [statusData, setStatusData] = useState<Record<string, ServiceStatus>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const API_FAIL_THRESHOLD = 3;
  
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sync/status`);
      if (res.ok) {
        const data = await res.json();
        setStatusData(data.services || {});
      }
    } catch (err) {
      console.error('Failed to fetch sync status', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE_URL}/api/sync/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'all' })
      });
      setTimeout(fetchStatus, 3000);
    } catch (err) {
      console.error('Manual sync failed', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 3000);
    }
  };

  const getStatusColor = (status: ServiceStatus | undefined) => {
    if (!status) return 'bg-gray-400';
    if (status.failCount >= API_FAIL_THRESHOLD) return 'bg-red-500';
    if (!status.lastSuccess) return 'bg-gray-400';
    
    const minutesSinceSync = (Date.now() - status.lastSuccess) / 60000;
    if (minutesSinceSync < 20) return 'bg-green-500';
    if (minutesSinceSync <= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const services = [
    { key: 'ndma', label: t('sync.ndma') },
    { key: 'weather', label: t('sync.weather') },
    { key: 'population', label: t('sync.population') },
    { key: 'routing', label: t('sync.routing') }
  ];

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
      <div className="flex gap-6 flex-wrap">
        {services.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getStatusColor(statusData[s.key])}`} />
            <span>{s.label}</span>
            <span className="text-slate-500 ml-1 hidden sm:inline">
              ({formatTime(statusData[s.key]?.lastSuccess)})
            </span>
          </div>
        ))}
      </div>
      <button 
        onClick={handleSyncNow} 
        disabled={isSyncing}
        className="flex items-center gap-1 hover:text-white disabled:opacity-50 transition-colors bg-slate-700 px-2 py-1 rounded"
      >
        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
        {isSyncing ? t('sync.syncing') : t('sync.sync_now')}
      </button>
    </div>
  );
}
