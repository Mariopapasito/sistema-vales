import { useCallback, useEffect, useRef, useState } from 'react';

interface StoredDraft<T> {
  version: 1;
  savedAt: string;
  value: T;
}

interface AutosavedDraftOptions<T> {
  storageKey: string | null;
  value: T;
  onRestore: (value: T) => void;
  delay?: number;
}

export function useAutosavedDraft<T>({
  storageKey,
  value,
  onRestore,
  delay = 700,
}: AutosavedDraftOptions<T>) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const onRestoreRef = useRef(onRestore);
  const suspendedRef = useRef(false);

  onRestoreRef.current = onRestore;

  useEffect(() => {
    suspendedRef.current = false;
    setRestored(false);
    setSavedAt(null);
    if (!storageKey) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as StoredDraft<T>;
        if (draft?.version === 1 && draft.value) {
          onRestoreRef.current(draft.value);
          setSavedAt(draft.savedAt);
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    } finally {
      setRestored(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !restored || suspendedRef.current) return;
    const timer = window.setTimeout(() => {
      try {
        const now = new Date().toISOString();
        const draft: StoredDraft<T> = { version: 1, savedAt: now, value };
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setSavedAt(now);
      } catch {
        // El formulario continúa funcionando aunque el navegador no permita almacenamiento.
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [delay, restored, storageKey, value]);

  const clearDraft = useCallback(() => {
    suspendedRef.current = true;
    if (storageKey) localStorage.removeItem(storageKey);
    setSavedAt(null);
  }, [storageKey]);

  return { savedAt, clearDraft };
}
