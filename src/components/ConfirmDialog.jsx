import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  confirmLabel,
  confirmClass,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <HiOutlineExclamationTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{message}</p>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${confirmClass || 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            {loading ? 'جاري...' : (confirmLabel || 'تأكيد')}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
