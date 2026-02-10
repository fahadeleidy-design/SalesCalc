import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig = {
  danger: { icon: 'bg-red-100 text-red-600', btn: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: 'bg-amber-100 text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' },
  info: { icon: 'bg-blue-100 text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
};

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  const v = variantConfig[variant];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-full ${v.icon} shrink-0`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 mt-1">{message}</p>
            </div>
            <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${v.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
