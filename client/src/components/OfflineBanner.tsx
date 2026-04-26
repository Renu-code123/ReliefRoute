import React from 'react';
import { useStore } from '../store/useStore';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useStore(state => state.isOnline);
  const pendingCount = useStore(state => state.pendingQueueCount);

  if (isOnline) return null;

  return (
    <div className="bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-50 shrink-0">
      <WifiOff size={16} />
      <span>{t('sync.offline_banner')}</span>
      {pendingCount > 0 && (
        <span className="ml-2 font-bold bg-yellow-600 text-yellow-50 px-2 py-0.5 rounded-full text-xs">
          {t('sync.pending_actions', { count: pendingCount })}
        </span>
      )}
    </div>
  );
}
