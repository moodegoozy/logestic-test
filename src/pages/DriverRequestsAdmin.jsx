import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  subscribeToPendingDrivers,
  approveDriver,
  rejectDriver,
} from '../services/driverRequests';
import {
  HiOutlineUserPlus,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineTruck,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlinePhoto,
  HiOutlineClock,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';

export default function DriverRequestsAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [lightbox, setLightbox] = useState(null); // { url, label }
  const [confirmReject, setConfirmReject] = useState(null); // driver object

  useEffect(() => {
    const unsub = subscribeToPendingDrivers((data) => {
      setRequests(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (driver) => {
    setActionLoading((prev) => ({ ...prev, [driver.id]: 'approve' }));
    try {
      await approveDriver(driver.id);
      toast.success(`تم قبول ${driver.name} كمندوب معتمد ✓`);
    } catch {
      toast.error('حدث خطأ أثناء القبول');
    } finally {
      setActionLoading((prev) => ({ ...prev, [driver.id]: null }));
    }
  };

  const handleReject = async (driver) => {
    setActionLoading((prev) => ({ ...prev, [driver.id]: 'reject' }));
    try {
      await rejectDriver(driver.id);
      toast.success(`تم رفض طلب ${driver.name}`);
      setConfirmReject(null);
    } catch {
      toast.error('حدث خطأ أثناء الرفض');
    } finally {
      setActionLoading((prev) => ({ ...prev, [driver.id]: null }));
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
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
          <HiOutlineUserPlus className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">طلبات المناديب</h1>
          <p className="text-sm text-slate-400">مراجعة وقبول طلبات التسجيل</p>
        </div>
        <span className="mr-auto rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
          {requests.length} طلب
        </span>
      </div>

      {/* Empty state */}
      {requests.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <HiOutlineCheckCircle className="mx-auto h-14 w-14 text-emerald-300" />
          <p className="mt-4 text-lg font-semibold text-slate-500">لا توجد طلبات معلقة</p>
          <p className="mt-1 text-sm text-slate-400">
            ستظهر هنا طلبات التسجيل الجديدة من المناديب تلقائياً
          </p>
        </div>
      )}

      {/* Requests list */}
      <div className="space-y-5">
        {requests.map((driver) => (
          <div
            key={driver.id}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
          >
            {/* Top row */}
            <div className="flex flex-wrap items-start gap-3 sm:items-center">
              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-lg font-bold text-indigo-600">
                {driver.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-slate-800">{driver.name}</h3>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <HiOutlineEnvelope className="h-3.5 w-3.5" />
                    {driver.email}
                  </span>
                  {driver.phone && (
                    <span className="flex items-center gap-1 text-xs text-slate-400" dir="ltr">
                      <HiOutlinePhone className="h-3.5 w-3.5" />
                      {driver.phone}
                    </span>
                  )}
                </div>
              </div>
              {/* Status badge */}
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <HiOutlineClock className="h-3.5 w-3.5" />
                قيد المراجعة
              </span>
            </div>

            {/* Details */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {driver.carType && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5">
                  <HiOutlineTruck className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">نوع السيارة</p>
                    <p className="text-sm font-semibold text-slate-700">{driver.carType}</p>
                  </div>
                </div>
              )}
              {driver.createdAt && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5">
                  <HiOutlineClock className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">تاريخ الطلب</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {driver.createdAt?.toDate
                        ? driver.createdAt.toDate().toLocaleDateString('ar-SA')
                        : '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Photos */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
              {driver.licensePhotoUrl && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-500">
                    <HiOutlinePhoto className="h-3.5 w-3.5" />
                    صورة الرخصة
                  </p>
                  <img
                    src={driver.licensePhotoUrl}
                    alt="رخصة القيادة"
                    onClick={() => setLightbox({ url: driver.licensePhotoUrl, label: 'رخصة القيادة' })}
                    className="h-28 w-full cursor-zoom-in rounded-xl border border-slate-200 object-cover transition hover:opacity-90 sm:h-36"
                  />
                </div>
              )}
              {driver.vehicleDocPhotoUrl && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-500">
                    <HiOutlinePhoto className="h-3.5 w-3.5" />
                    صورة الاستمارة
                  </p>
                  <img
                    src={driver.vehicleDocPhotoUrl}
                    alt="استمارة المركبة"
                    onClick={() => setLightbox({ url: driver.vehicleDocPhotoUrl, label: 'استمارة المركبة' })}
                    className="h-28 w-full cursor-zoom-in rounded-xl border border-slate-200 object-cover transition hover:opacity-90 sm:h-36"
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => handleApprove(driver)}
                disabled={!!actionLoading[driver.id]}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-600 to-green-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-green-700 disabled:opacity-50"
              >
                {actionLoading[driver.id] === 'approve' ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <HiOutlineCheck className="h-4 w-4" />
                )}
                قبول المندوب
              </button>
              <button
                onClick={() => setConfirmReject(driver)}
                disabled={!!actionLoading[driver.id]}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                <HiOutlineXMark className="h-4 w-4" />
                رفض الطلب
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-white">{lightbox.label}</span>
              <button
                onClick={() => setLightbox(null)}
                className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            <img
              src={lightbox.url}
              alt={lightbox.label}
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Confirm reject dialog */}
      <ConfirmDialog
        open={!!confirmReject}
        title="رفض طلب التسجيل"
        message={`هل تريد رفض طلب المندوب "${confirmReject?.name}"؟ سيتم إشعاره عند الدخول.`}
        confirmLabel="رفض الطلب"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        loading={actionLoading[confirmReject?.id] === 'reject'}
        onConfirm={() => handleReject(confirmReject)}
        onCancel={() => setConfirmReject(null)}
      />
    </Layout>
  );
}
