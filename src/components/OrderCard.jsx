import StatusBadge from './StatusBadge';
import { formatDate } from '../utils/helpers';
import {
  HiOutlineMapPin,
  HiOutlinePhone,
  HiOutlineUser,
} from 'react-icons/hi2';

export default function OrderCard({ order, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-bold text-indigo-600">
            {order.orderNumber}
          </p>
          <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <HiOutlineUser className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{order.customerName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <HiOutlinePhone className="h-4 w-4 shrink-0 text-slate-400" />
          <span dir="ltr">{order.customerPhone}</span>
        </div>
        {order.address && (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <HiOutlineMapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span className="line-clamp-2">{order.address}</span>
          </div>
        )}
      </div>

      {order.orderDetails && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="mb-1 text-xs font-medium text-slate-500">تفاصيل الطلب</p>
          <p className="text-sm text-slate-700">{order.orderDetails}</p>
        </div>
      )}

      {order.notes && (
        <div className="mt-2 rounded-xl bg-amber-50 p-3">
          <p className="mb-1 text-xs font-medium text-amber-600">ملاحظات العميل</p>
          <p className="text-sm text-amber-800">{order.notes}</p>
        </div>
      )}

      {order.driverNotes && (
        <div className="mt-2 rounded-xl bg-blue-50 p-3">
          <p className="mb-1 text-xs font-medium text-blue-600">ملاحظات السائق</p>
          <p className="text-sm text-blue-800">{order.driverNotes}</p>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
