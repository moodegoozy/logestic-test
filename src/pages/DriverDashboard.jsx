import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDriverOrders, useAvailableOrders } from '../hooks/useOrders';
import {
  updateOrderStatus,
  addDriverNotes,
  acceptOrderFirstCome,
} from '../services/orders';
import { STATUS_LABELS } from '../utils/constants';
import { generateMapsLink } from '../utils/helpers';
import Layout from '../components/Layout';
import OrderCard from '../components/OrderCard';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import InteractiveOrderMap from '../components/InteractiveOrderMap';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineMapPin,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
  HiOutlineBellAlert,
  HiOutlineSparkles,
  HiOutlineClock,
} from 'react-icons/hi2';

export default function DriverDashboard() {
  const { userData } = useAuth();
  const { orders, loading } = useDriverOrders(userData?.id);
  const { orders: availableOrders, loading: availableLoading } = useAvailableOrders();
  const [notesMap, setNotesMap] = useState({});
  const [editingNotes, setEditingNotes] = useState({});
  const [acceptingId, setAcceptingId] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );
  const prevAvailableIdsRef = useRef(new Set());
  const titleFlashRef = useRef(null);

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

  const handleAcceptOrder = async (order) => {
    if (!userData?.id) return;
    try {
      setAcceptingId(order.id);
      const result = await acceptOrderFirstCome(order.id, userData.id, userData.name || userData.email || 'مندوب');
      if (result?.accepted) {
        toast.success('ممتاز! تم إسناد الطلب لك بنجاح');
      } else {
        toast.error('تم قبول الطلب بواسطة مندوب آخر قبلك');
      }
    } catch {
      toast.error('تعذر قبول الطلب حالياً، حاول مرة أخرى');
    } finally {
      setAcceptingId('');
    }
  };

  const playNewOrderTone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore audio API errors on restricted browsers
    }
  };

  const flashPageTitle = (text) => {
    if (titleFlashRef.current) {
      clearInterval(titleFlashRef.current);
      titleFlashRef.current = null;
    }
    const original = document.title;
    let toggle = false;
    titleFlashRef.current = setInterval(() => {
      document.title = toggle ? text : original;
      toggle = !toggle;
    }, 900);
    setTimeout(() => {
      if (titleFlashRef.current) {
        clearInterval(titleFlashRef.current);
        titleFlashRef.current = null;
      }
      document.title = original;
    }, 12000);
  };

  const notifyForNewOrders = (newOrders) => {
    if (!newOrders.length) return;

    playNewOrderTone();

    const first = newOrders[0];
    toast.success(`طلب جديد وارد الآن: ${first.orderNumber}`, { duration: 5000 });

    if (document.hidden) {
      flashPageTitle('طلب جديد متاح الآن');
    }

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      const n = new window.Notification('طلب جديد متاح للقبول', {
        body: `رقم الطلب: ${first.orderNumber}`,
        tag: `order-${first.id}`,
        renotify: true,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  };

  const requestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('متصفحك لا يدعم إشعارات النظام');
      return;
    }
    try {
      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('تم تفعيل إشعارات الطلبات الجديدة');
      } else {
        toast.error('لم يتم منح صلاحية الإشعارات');
      }
    } catch {
      toast.error('تعذر طلب صلاحية الإشعارات');
    }
  };

  useEffect(() => {
    const currentIds = new Set(availableOrders.map((o) => o.id));

    // First load: initialize baseline without triggering alerts for old orders
    if (prevAvailableIdsRef.current.size === 0) {
      prevAvailableIdsRef.current = currentIds;
      return;
    }

    const newlyAdded = availableOrders.filter((o) => !prevAvailableIdsRef.current.has(o.id));
    if (newlyAdded.length > 0) {
      notifyForNewOrders(newlyAdded);
    }

    prevAvailableIdsRef.current = currentIds;
  }, [availableOrders]);

  useEffect(() => {
    return () => {
      if (titleFlashRef.current) {
        clearInterval(titleFlashRef.current);
        titleFlashRef.current = null;
      }
    };
  }, []);

  if (loading || availableLoading) {
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
          title="طلباتي"
          value={stats.total}
          icon={HiOutlineClipboardDocumentList}
          color="indigo"
        />
        <StatsCard
          title="طلبات جديدة متاحة"
          value={availableOrders.length}
          icon={HiOutlineBellAlert}
          color="purple"
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

      {/* ── Live Incoming Orders For All Drivers ── */}
      <div className="mt-8 overflow-hidden rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 shadow-lg shadow-indigo-100/50 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
              <HiOutlineSparkles className="h-6 w-6 text-indigo-600" />
              الطلبات الواردة الآن لجميع المناديب
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              أول مندوب يضغط قبول يتم إسناد الطلب له مباشرة بشكل تلقائي
            </p>
          </div>
          <div className="rounded-full bg-gradient-to-l from-indigo-600 to-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-200 sm:text-sm">
            متاح الآن: {availableOrders.length}
          </div>
        </div>

        {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 sm:text-sm">
              فعل إشعارات النظام حتى يصلك تنبيه عند وصول طلب جديد وأنت خارج الصفحة
            </p>
            <button
              onClick={requestBrowserNotifications}
              className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700 sm:text-sm"
            >
              تفعيل إشعارات الطلبات
            </button>
          </div>
        )}

        {availableOrders.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-10 text-center">
            <HiOutlineBellAlert className="mx-auto h-12 w-12 text-indigo-300" />
            <p className="mt-3 font-semibold text-slate-600">حالياً لا توجد طلبات جديدة</p>
            <p className="mt-1 text-sm text-slate-400">أي طلب جديد من العميل سيظهر هنا مباشرة لحظياً</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {availableOrders.map((order) => (
              <div key={order.id} className="lux-card overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="clip-safe">
                    <p className="text-sm text-slate-500">رقم الطلب</p>
                    <p className="clip-safe font-mono text-lg font-extrabold tracking-wide text-indigo-700" dir="ltr">{order.orderNumber}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    <HiOutlineClock className="h-4 w-4" />
                    جديد
                  </span>
                </div>

                <div className="space-y-4 p-4">
                  <div className="space-y-1 clip-safe">
                    <p className="clip-safe clamp-2 text-base font-extrabold text-slate-800">{order.customerName}</p>
                    <p className="clip-safe clamp-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{order.orderDetails}</p>
                    {order.address && (
                      <p className="clip-safe clamp-2 text-xs text-slate-500">العنوان: {order.address}</p>
                    )}
                  </div>

                  <InteractiveOrderMap
                    latitude={order.latitude}
                    longitude={order.longitude}
                    customerName={order.customerName}
                  />

                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href={generateMapsLink(order.latitude, order.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <HiOutlineMapPin className="h-5 w-5" />
                      فتح الموقع
                    </a>
                  </div>

                  <button
                    onClick={() => handleAcceptOrder(order)}
                    disabled={acceptingId === order.id}
                    className="w-full rounded-xl bg-gradient-to-l from-indigo-600 to-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {acceptingId === order.id ? 'جاري الحجز...' : 'قبول الطلب الآن'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Orders ── */}
      <div className="mt-8">
        <h3 className="mb-4 text-lg font-bold text-slate-800">طلباتي</h3>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <HiOutlineTruck className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">
              لا توجد طلبات معينة لك حالياً
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
