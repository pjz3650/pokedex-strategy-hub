'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
export function ConfirmDelete({
  name,
  kind,
  onCancel,
  onConfirm,
}: {
  name: string;
  kind: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = modal.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    cancel.current?.focus();
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onCancel();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={modal}
      className="import-dialog"
      aria-label={`Excluir ${kind} ${name}?`}
      onCancel={(e) => {
        if (pending.current) e.preventDefault();
        else onCancel();
      }}
    >
      <h2>
        Excluir {kind} {name}?
      </h2>
      <p>A exclusão é permanente. O conteúdo aberto em edição será mantido como cópia local.</p>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <Button ref={cancel} variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={busy} onClick={() => void confirm()}>
          {busy ? 'Excluindo...' : `Excluir ${kind}`}
        </Button>
      </div>
    </dialog>
  );
}
