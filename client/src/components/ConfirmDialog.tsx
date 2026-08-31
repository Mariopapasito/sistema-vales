import { createContext, useCallback, useContext, useRef, useState } from 'react';
import './ConfirmDialog.css';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function ConfirmProvider({ children }: React.PropsWithChildren) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFunction>((nextOptions) => {
    resolverRef.current?.(false);
    setOptions(nextOptions);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (accepted: boolean) => {
    resolverRef.current?.(accepted);
    resolverRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={() => close(false)}>
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={`confirm-dialog-icon confirm-dialog-icon--${options.tone || 'primary'}`} aria-hidden="true">!</div>
            <h2 id="confirm-dialog-title">{options.title || 'Confirmar acción'}</h2>
            <p id="confirm-dialog-message">{options.message}</p>
            <div className="confirm-dialog-actions">
              <button type="button" className="confirm-dialog-cancel" onClick={() => close(false)} autoFocus>
                {options.cancelLabel || 'Cancelar'}
              </button>
              <button type="button" className={`confirm-dialog-accept confirm-dialog-accept--${options.tone || 'primary'}`} onClick={() => close(true)}>
                {options.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm debe utilizarse dentro de ConfirmProvider');
  return confirm;
}
