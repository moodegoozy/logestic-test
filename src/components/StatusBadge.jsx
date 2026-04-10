import { STATUS_LABELS, STATUS_COLORS } from '../utils/constants';

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
        STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-200'
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
