import { useEffect, useState, useCallback } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'vales-offline';
const STORE = 'pending-orders';

// IndexedDB helpers
async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'localId', autoIncrement: true });
      }
    },
  });
}

export async function saveOrderOffline(data: Record<string, unknown>) {
  const db = await getDB();
  await db.add(STORE, { ...data, savedAt: new Date().toISOString() });
}

export async function getPendingOrders() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function deletePendingOrder(localId: number) {
  const db = await getDB();
  await db.delete(STORE, localId);
}

// Hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const checkPending = useCallback(async () => {
    const items = await getPendingOrders();
    setPendingCount(items.length);
  }, []);

  useEffect(() => {
    checkPending();
  }, [checkPending]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      checkPending();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Listen for sync complete from service worker
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        setSyncing(false);
        checkPending();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      navigator.serviceWorker?.removeEventListener('message', handler);
    };
  }, [checkPending]);

  const syncNow = useCallback(async (api: (url: string, data: unknown) => Promise<void>) => {
    const items = await getPendingOrders();
    if (!items.length || !navigator.onLine) return;
    setSyncing(true);
    for (const item of items) {
      try {
        await api('/orders', item);
        await deletePendingOrder(item.localId);
      } catch {
        // leave in queue
      }
    }
    await checkPending();
    setSyncing(false);
  }, [checkPending]);

  return { isOnline, pendingCount, syncing, syncNow, checkPending };
}
