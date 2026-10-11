'use client';
import Modal from './Modal';
import { useLanguage } from '@/context/LanguageContext';

/**
 * "Are you sure?" for any action that matters (delete, cancel, sign out…):
 * what will happen, then a clear confirm and a way back. Optional children
 * (e.g. a password field) sit between the text and the buttons.
 */
export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, cancelLabel, cancelPrimary = false, tone = 'primary', busy = false, error, children }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  /** Text for the way back (default "Cancel"). */
  cancelLabel?: string;
  /** Show the way back as the highlighted button (e.g. "Keep them"). */
  cancelPrimary?: boolean;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  error?: string;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title}>
      {message && <div className="text-sm text-gray-600 leading-relaxed space-y-2">{message}</div>}
      {children && <div className="mt-4">{children}</div>}
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={cancelPrimary ? onConfirm : onClose} disabled={busy}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">{cancelPrimary ? (busy ? t('ui.wait') : confirmLabel) : (cancelLabel ?? t('ui.cancel'))}</button>
        <button type="button" onClick={cancelPrimary ? onClose : onConfirm} disabled={busy}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold text-white transition disabled:opacity-60 ${tone === 'danger' && !cancelPrimary ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'}`}>
          {cancelPrimary ? (cancelLabel ?? t('ui.cancel')) : (busy ? t('ui.wait') : confirmLabel)}
        </button>
      </div>
    </Modal>
  );
}
