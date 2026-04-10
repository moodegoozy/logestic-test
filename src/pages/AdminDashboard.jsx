import { useState, useEffect } from 'react';
import { useOrders } from '../hooks/useOrders';
import { getDrivers } from '../services/users';
import {
  updateOrderStatus,
  assignDriver,
  deleteOrder,
} from '../services/orders';
import { STATUS_OPTIONS } from '../utils/constants';
import { formatDate, generateMapsLink } from '../utils/helpers';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardDocumentList,
  HiOutlinePlusCircle,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineXMark,
  HiOutlineMapPin,
  HiOutlinePhone,
  HiOutlineUser,
} from 'react-icons/hi2';

export default function AdminDashboard() {
  const { orders, loading } = useOrders();
  const [drivers, setDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getDrivers().then(setDrivers).catch(console.error);
  }, []);

  /* ── Stats ── */
  const stats = {
    total: orders.length,
    newOrders: orders.filter((o) => o.status === 'new').length,
    inProgress: orders.filter((o) =>
      ['reviewed', 'assigned', 'on_the_way'].includes(o.status)
    ).length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  /* ── Filtered orders ── */
  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      order.customerName?.toLowerCase().includes(term) ||
      order.orderNumber?.toLowerCase().includes(term) ||
      order.customerPhone?.includes(searchTerm);
    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /* ── Handlers ── */
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('تم تحديث الحالة بنجاح');
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
    } catch {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleAssignDriver = async (orderId, driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;
    try {
      await assignDriver(orderId, driverId, driver.name);
      toast.success(`تم تعيين السائق ${driver.name}`);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({
          ...prev,
          assignedDriverId: driverId,
          assignedDriverName: driver.name,
          status: 'assigned',
        }));
      }
    } catch {
      toast.error('حدث خطأ أثناء تعيين السائق');
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteOrder(orderToDelete.id);
      toast.success('تم حذف الطلب بنجاح');
      setShowDelete(false);
      setOrderToDelete(null);
      if (selectedOrder?.id === orderToDelete.id) setSelectedOrder(null);
    } catch {
      toast.error('حدث خطأ أثناء حذف الطلب');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner size="lg" />
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          title="إجمالي الطلبات"
          value={stats.total}
          icon={HiOutlineClipboardDocumentList}
          color="indigo"
        />
        <StatsCard
          title="طلبات جديدة"
          value={stats.newOrders}
          icon={HiOutlinePlusCircle}
          color="blue"
        />
        <StatsCard
          title="قيد التنفيذ"
          value={stats.inProgress}
          icon={HiOutlineTruck}
          color="amber"
        />
        <StatsCard
          title="تم التوصيل"
          value={stats.delivered}
          icon={HiOutlineCheckCircle}
          color="green"
        />
      </div>

      {/* ── Search & Filter ── */}
      <div className="mt-6 space-y-4">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الطلب أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            الكل ({orders.length})
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                statusFilter === s.value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.label} ({orders.filter((o) => o.status === s.value).length})
            </button>
          ))}
        </div>
      </div>

      {/* ── Orders List ── */}
      <div className="mt-6">
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <HiOutlineClipboardDocumentList className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-sm font-bold text-indigo-600">
                        {order.orderNumber}
                      </p>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <HiOutlineUser className="h-4 w-4" />
                        {order.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <HiOutlinePhone className="h-4 w-4" />
                        <span dir="ltr">{order.customerPhone}</span>
                      </span>
                      {order.assignedDriverName && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <HiOutlineTruck className="h-4 w-4" />
                          {order.assignedDriverName}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                      title="عرض التفاصيل"
                    >
                      <HiOutlineEye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setOrderToDelete(order);
                        setShowDelete(true);
                      }}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      title="حذف"
                    >
                      <HiOutlineTrash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-20">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  تفاصيل الطلب
                </h3>
                <p className="font-mono text-sm text-indigo-600">
                  {selectedOrder.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <HiOutlineXMark className="h-6 w-6" />
              </button>
            </div>

            {/* Status & Driver selectors */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-500">
                  الحالة
                </label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) =>
                    handleStatusChange(selectedOrder.id, e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-500">
                  السائق المعيّن
                </label>
                <select
                  value={selectedOrder.assignedDriverId || ''}
                  onChange={(e) =>
                    handleAssignDriver(selectedOrder.id, e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">— اختر سائق —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="اسم العميل" value={selectedOrder.customerName} />
              <InfoField
                label="رقم الهاتف"
                value={selectedOrder.customerPhone}
                dir="ltr"
              />
              <InfoField
                label="تفاصيل الطلب"
                value={selectedOrder.orderDetails}
                full
              />
              <InfoField
                label="ملاحظات العميل"
                value={selectedOrder.notes}
                full
              />
              <InfoField label="العنوان" value={selectedOrder.address} full />
              {selectedOrder.driverNotes && (
                <InfoField
                  label="ملاحظات السائق"
                  value={selectedOrder.driverNotes}
                  full
                />
              )}
            </div>

            {/* Map link */}
            {selectedOrder.latitude && selectedOrder.longitude && (
              <div className="mt-4">
                <a
                  href={generateMapsLink(
                    selectedOrder.latitude,
                    selectedOrder.longitude
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  <HiOutlineMapPin className="h-5 w-5" />
                  فتح الموقع في خرائط جوجل
                </a>
              </div>
            )}

            <p className="mt-4 text-xs text-slate-400">
              تاريخ الإنشاء: {formatDate(selectedOrder.createdAt)}
              {selectedOrder.updatedAt &&
                ` · آخر تحديث: ${formatDate(selectedOrder.updatedAt)}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={showDelete}
        title="حذف الطلب"
        message={`هل أنت متأكد من حذف الطلب ${orderToDelete?.orderNumber}؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDelete(false);
          setOrderToDelete(null);
        }}
        loading={deleteLoading}
      />
    </Layout>
  );
}

/* ── Helper sub-component ── */
function InfoField({ label, value, dir, full }) {
  if (!value) return null;
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-700" dir={dir}>
        {value}
      </p>
    </div>
  );
}
