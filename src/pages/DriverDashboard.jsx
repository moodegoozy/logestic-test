import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDriverOrders } from '../hooks/useOrders';
import { updateOrderStatus, addDriverNotes } from '../services/orders';
import { STATUS_LABELS } from '../utils/constants';
import { generateMapsLink } from '../utils/helpers';
import Layout from '../components/Layout';
import OrderCard from '../components/OrderCard';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineMapPin,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
} from 'react-icons/hi2';

export default function DriverDashboard() {
  const { userData } = useAuth();
  const { orders, loading } = useDriverOrders(userData?.id);
  const [notesMap, setNotesMap] = useState({});
  const [editingNotes, setEditingNotes] = useState({});

  const stats = {
    total: orders.length,
    active: orders.filter((o) =>
      ['assigned', 'on_the_way'].includes(o.status)
    ).length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  const handleStatusUpdate = async (order) => {
    const nextStatus = { assigned: 'on_the_way', on_the_way: 'delivered' };
    const next = nextStatus[order.status];
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next);
      toast.success(`تم تحديث الحالة إلى: ${STATUS_LABELS[next]}`);
    } catch {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleSaveNotes = async (orderId) => {
    const notes = notesMap[orderId];
    if (!notes?.trim()) return;
    try {
      await addDriverNotes(orderId, notes);
      toast.success('تم حفظ الملاحظات');
      setEditingNotes((prev) => ({ ...prev, [orderId]: false }));
    } catch {
      toast.error('حدث خطأ أثناء حفظ الملاحظات');
    }
  };

  const getStatusAction = (status) => {
    switch (status) {
      case 'assigned':
        return {
          label: 'بدء التوصيل',
          color: 'bg-orange-500 hover:bg-orange-600',
        };
      case 'on_the_way':
        return {
          label: 'تم التوصيل',
          color: 'bg-emerald-500 hover:bg-emerald-600',
        };
      default:
        return null;
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
      <div className="grid grid-cols-3 gap-4">
        <StatsCard
          title="إجمالي الطلبات"
          value={stats.total}
          icon={HiOutlineClipboardDocumentList}
          color="indigo"
        />
        <StatsCard
          title="طلبات نشطة"
          value={stats.active}
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

      {/* ── Orders ── */}
      <div className="mt-6">
        <h3 className="mb-4 text-lg font-bold text-slate-800">طلباتي</h3>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <HiOutlineTruck className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">
              لا توجد طلبات معينة لك حالياً
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => {
              const action = getStatusAction(order.status);
              return (
                <OrderCard key={order.id} order={order}>
                  <div className="space-y-3">
                    {/* Location link */}
                    {order.latitude && order.longitude && (
                      <a
                        href={generateMapsLink(
                          order.latitude,
                          order.longitude
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <HiOutlineMapPin className="h-5 w-5" />
                        فتح موقع العميل
                      </a>
                    )}

                    {/* Status advance */}
                    {action && (
                      <button
                        onClick={() => handleStatusUpdate(order)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${action.color}`}
                      >
                        <HiOutlineArrowPath className="h-5 w-5" />
                        {action.label}
                      </button>
                    )}

                    {/* Driver notes */}
                    {editingNotes[order.id] ? (
                      <div className="space-y-2">
                        <textarea
                          value={notesMap[order.id] ?? order.driverNotes ?? ''}
                          onChange={(e) =>
                            setNotesMap((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          placeholder="أضف ملاحظاتك هنا..."
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveNotes(order.id)}
                            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() =>
                              setEditingNotes((prev) => ({
                                ...prev,
                                [order.id]: false,
                              }))
                            }
                            className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setNotesMap((prev) => ({
                            ...prev,
                            [order.id]: order.driverNotes || '',
                          }));
                          setEditingNotes((prev) => ({
                            ...prev,
                            [order.id]: true,
                          }));
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                      >
                        <HiOutlinePencilSquare className="h-5 w-5" />
                        {order.driverNotes
                          ? 'تعديل الملاحظات'
                          : 'إضافة ملاحظات'}
                      </button>
                    )}
                  </div>
                </OrderCard>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
