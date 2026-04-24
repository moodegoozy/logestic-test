import { STATUS_LABELS, STATUS_COLORS } from '../utils/constants';

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-semibold leading-5 ${
        STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-200'
      }`}
      title={STATUS_LABELS[status] || status}
    >
      <span className="truncate">{STATUS_LABELS[status] || status}</span>
    </span>
  );
}
