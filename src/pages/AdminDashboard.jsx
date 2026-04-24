import { useState, useEffect } from 'react';
import { useOrders } from '../hooks/useOrders';
import { getDrivers } from '../services/users';
import {
  updateOrderStatus,
  assignDriver,
  deleteOrder,
  updateOrder,
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
  HiOutlineDocumentText,
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
  const [invoicePrice, setInvoicePrice] = useState('');
  const [deliveryPrice, setDeliveryPrice] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition ${
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
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition ${
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
                        <span className="max-w-[190px] truncate">{order.customerName}</span>
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
                      onClick={() => { setSelectedOrder(order); setInvoicePrice(''); setDeliveryPrice(''); }}
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
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 pt-10 sm:items-start sm:p-4 sm:pt-20">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl sm:p-6 max-h-[88dvh] overflow-y-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  تفاصيل الطلب
                </h3>
                <p className="break-all font-mono text-sm text-indigo-600" dir="ltr">
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

            {/* ── Invoice Section ── */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* Toggle header */}
              <button
                onClick={() => { setInvoiceOpen(!invoiceOpen); setShowPreview(false); }}
                className="flex w-full items-center justify-between p-4 text-right transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <HiOutlineDocumentText className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-800">إصدار فاتورة</span>
                </div>
                <svg
                  className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${invoiceOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Collapsible body */}
              {invoiceOpen && (
                <div className="border-t border-slate-100 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">سعر الطلب (ر.س)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={invoicePrice}
                        onChange={(e) => { setInvoicePrice(e.target.value); setShowPreview(false); }}
                        placeholder="0.00" dir="ltr"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">سعر التوصيل (ر.س)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={deliveryPrice}
                        onChange={(e) => { setDeliveryPrice(e.target.value); setShowPreview(false); }}
                        placeholder="0.00" dir="ltr"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  {/* Preview button */}
                  <button
                    onClick={() => {
                      if (!invoicePrice || Number(invoicePrice) <= 0) {
                        toast.error('يرجى إدخال سعر الطلب');
                        return;
                      }
                      setShowPreview(true);
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <HiOutlineEye className="h-4 w-4" />
                    معاينة الفاتورة
                  </button>

                  {/* WhatsApp-style preview */}
                  {showPreview && invoicePrice && (
                    <div className="mt-4">
                      {/* WhatsApp header */}
                      <div className="flex items-center gap-2 rounded-t-xl bg-[#075e54] px-4 py-2.5">
                        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <div>
                          <p className="text-sm font-medium text-white">{selectedOrder.customerName}</p>
                          <p className="text-xs text-green-200" dir="ltr">{selectedOrder.customerPhone}</p>
                        </div>
                      </div>

                      {/* Chat area */}
                      <div className="bg-[#e5ddd5] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2260%22%20height%3D%2260%22%3E%3Cpath%20d%3D%22M30%200L60%2030L30%2060L0%2030z%22%20fill%3D%22%23d4ccb5%22%20opacity%3D%220.08%22/%3E%3C/svg%3E')] p-4">
                        {/* Message bubble */}
                        <div className="mr-auto max-w-[85%] rounded-xl rounded-tr-none bg-[#dcf8c6] p-3 shadow-sm">
                          <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#303030]">
                            <p className="border-b border-[#b5d6a4] pb-2 mb-2 text-center font-bold">فاتورة طلب</p>
                            <p><span className="font-bold">رقم الطلب:</span> {selectedOrder.orderNumber}</p>
                            <p><span className="font-bold">العميل:</span> {selectedOrder.customerName}</p>
                            <p className="mt-2"><span className="font-bold">تفاصيل الطلب:</span></p>
                            <p className="text-[#555]">{selectedOrder.orderDetails}</p>
                            <div className="my-2 border-t border-[#b5d6a4]" />
                            <p><span className="font-bold">سعر الطلب:</span> {Number(invoicePrice).toFixed(2)} ر.س</p>
                            <p><span className="font-bold">سعر التوصيل:</span> {Number(deliveryPrice || 0).toFixed(2)} ر.س</p>
                            <div className="my-2 border-t border-[#b5d6a4]" />
                            <p className="text-center font-bold text-[#075e54]">الإجمالي: {(Number(invoicePrice) + Number(deliveryPrice || 0)).toFixed(2)} ر.س</p>
                            <div className="my-2 border-t border-[#b5d6a4]" />
                            <p className="text-center text-xs text-[#888]">شكرا لتعاملكم معنا</p>
                            <p className="text-center text-xs font-bold text-[#075e54]">لكل الاتجاهات</p>
                          </div>
                          <p className="mt-1 text-left text-[10px] text-[#999]">الآن</p>
                        </div>
                      </div>

                      {/* Send bar */}
                      <div className="rounded-b-xl bg-[#f0f0f0] p-3">
                        <button
                          onClick={() => {
                            const phone = selectedOrder.customerPhone.replace(/[^\d+]/g, '').replace(/^0/, '966');
                            const orderTotal = Number(invoicePrice);
                            const deliveryTotal = Number(deliveryPrice || 0);
                            const grandTotal = orderTotal + deliveryTotal;
                            // Save invoice data to Firestore
                            updateOrder(selectedOrder.id, {
                              invoicePrice: orderTotal,
                              deliveryPrice: deliveryTotal,
                              invoiceTotal: grandTotal,
                              invoiceSentAt: new Date(),
                            }).catch(() => {});
                            const msg = `ـــــــــــــــــــــــــــــ\n` +
                              `*فاتورة طلب*\n` +
                              `ـــــــــــــــــــــــــــــ\n\n` +
                              `*رقم الطلب:* ${selectedOrder.orderNumber}\n` +
                              `*العميل:* ${selectedOrder.customerName}\n\n` +
                              `*تفاصيل الطلب:*\n${selectedOrder.orderDetails}\n\n` +
                              `ـــــــــــــــــــــــــــــ\n` +
                              `*سعر الطلب:* ${orderTotal.toFixed(2)} ر.س\n` +
                              `*سعر التوصيل:* ${deliveryTotal.toFixed(2)} ر.س\n` +
                              `ـــــــــــــــــــــــــــــ\n` +
                              `*الإجمالي: ${grandTotal.toFixed(2)} ر.س*\n` +
                              `ـــــــــــــــــــــــــــــ\n\n` +
                              `شكرا لتعاملكم معنا\n` +
                              `*لكل الاتجاهات*`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#1da851]"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                          إرسال الفاتورة عبر واتساب
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
      <p className="break-words text-sm text-slate-700" dir={dir}>
        {value}
      </p>
    </div>
  );
}
