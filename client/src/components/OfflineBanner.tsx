import React, { useEffect, useState } from 'react';
import { WifiIcon, SignalSlashIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import api from '../services/api';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncing, syncNow } = useOnlineStatus();
  const [justSynced, setJustSynced] = useState(false);
  const [visible, setVisible] = useState(false);

  // Show banner when offline OR when there are pending items
  useEffect(() => {
    if (!isOnline || pendingCount > 0) {
      setVisible(true);
    } else if (isOnline && pendingCount === 0) {
      // Hide after short delay when back online
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, pendingCount]);

  const handleSync = async () => {
    await syncNow(async (url, data) => {
      await api.post(url, data);
    });
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 3000);
  };

  if (!visible) return null;

  if (!isOnline) {
    return (
      <div className="offline-banner offline-banner--offline">
        <SignalSlashIcon className="offline-icon" />
        <span>Sin conexión — los cambios se guardan localmente</span>
        {pendingCount > 0 && (
          <span className="offline-badge">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
        )}
      </div>
    );
  }

  // Online but has pending items
  if (pendingCount > 0) {
    return (
      <div className="offline-banner offline-banner--sync">
        <WifiIcon className="offline-icon" />
        <span>Conexión restaurada — {pendingCount} orden{pendingCount !== 1 ? 'es' : ''} sin sincronizar</span>
        <button className="offline-sync-btn" onClick={handleSync} disabled={syncing}>
          <ArrowPathIcon className={`offline-icon-sm ${syncing ? 'spinning' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      </div>
    );
  }

  // Just came back online, no pending
  return (
    <div className="offline-banner offline-banner--online">
      <CheckCircleIcon className="offline-icon" />
      <span>{justSynced ? 'Sincronización completada' : 'Conexión restaurada'}</span>
    </div>
  );
}
