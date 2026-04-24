import { useState } from 'react';
import { createOrder } from '../services/orders';
import { generateOrderNumber, generateMapsLink } from '../utils/helpers';
import MapPicker from '../components/MapPicker';
import toast from 'react-hot-toast';
import {
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineClipboardDocumentList,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineMapPin,
} from 'react-icons/hi2';
import logoImg from '../logo/logo.jpg';

export default function CustomerOrder() {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    orderDetails: '',
    notes: '',
    latitude: null,
    longitude: null,
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const validate = () => {
    const errs = {};
    if (!formData.customerName.trim()) errs.customerName = 'يرجى إدخال الاسم';
    if (!formData.customerPhone.trim())
      errs.customerPhone = 'يرجى إدخال رقم الهاتف';
    else if (!/^[\d+\-\s()]{8,15}$/.test(formData.customerPhone.trim()))
      errs.customerPhone = 'رقم الهاتف غير صالح';
    if (!formData.orderDetails.trim())
      errs.orderDetails = 'يرجى إدخال تفاصيل الطلب';
    if (!formData.latitude || !formData.longitude)
      errs.location = 'يرجى تحديد الموقع على الخريطة';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleLocationSelect = (lat, lng, address) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng, address }));
    if (errors.location) setErrors((prev) => ({ ...prev, location: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const newOrderNumber = generateOrderNumber();
    try {
      const createPromise = createOrder({
        orderNumber: newOrderNumber,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        orderDetails: formData.orderDetails.trim(),
        notes: formData.notes.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        mapsLink: generateMapsLink(formData.latitude, formData.longitude),
        address: formData.address,
      });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('submit-timeout')), 30000);
      });
      const orderDoc = await Promise.race([createPromise, timeoutPromise]);
      setOrderNumber(newOrderNumber);
      setSubmitted(true);

      // Send WhatsApp confirmation via Cloud Function (fire-and-forget)
      // Phone stays server-side; only orderId crosses the wire
      if (orderDoc?.id) {
        fetch(
          'https://us-central1-sfrtalbyt-f7fd1.cloudfunctions.net/sendOrderConfirmation',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderDoc.id }),
          }
        ).catch(() => {/* Non-fatal: order was saved regardless */});
      }
    } catch (err) {
      console.error('Order submit error:', err);
      if (err?.message === 'submit-timeout' || err?.message === 'timeout') {
        toast.error('انتهت مهلة الإرسال. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.');
      } else {
        toast.error('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success state ── */
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-3 sm:p-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl sm:p-8">
            {/* Logo */}
            <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-lg ring-4 ring-indigo-100 sm:h-20 sm:w-20">
              <img src={logoImg} alt="لكل الاتجاهات" className="h-full w-full object-cover" />
            </div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 sm:h-16 sm:w-16">
              <HiOutlineCheckCircle className="h-7 w-7 text-emerald-600 sm:h-8 sm:w-8" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-800 sm:text-2xl">
              تم إرسال طلبك بنجاح!
            </h2>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">رقم طلبك هو</p>
            <p className="mt-2 break-all font-mono text-2xl font-bold text-indigo-600 sm:text-3xl" dir="ltr">
              {orderNumber}
            </p>
            <p className="mt-4 text-sm text-slate-400">
              احتفظ برقم الطلب للمتابعة. سيتم التواصل معك قريباً.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setOrderNumber('');
                setFormData({
                  customerName: '',
                  customerPhone: '',
                  orderDetails: '',
                  notes: '',
                  latitude: null,
                  longitude: null,
                  address: '',
                });
              }}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 sm:py-3"
            >
              إرسال طلب جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-indigo-600 via-blue-600 to-purple-700 px-4 pb-10 pt-6 text-center text-white sm:pb-12 sm:pt-8">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-3xl border-4 border-white/30 bg-white shadow-2xl shadow-indigo-900/40 ring-4 ring-white/10 backdrop-blur-sm sm:h-28 sm:w-28">
          <img
            src={logoImg}
            alt="لكل الاتجاهات"
            className="h-full w-full object-cover"
          />
        </div>

        <h1 className="mt-5 text-2xl font-extrabold tracking-wide drop-shadow-md sm:text-3xl">
          لكل الاتجاهات
        </h1>
        <p className="mt-1 text-base font-medium text-blue-100 sm:text-lg">
          FOR ALL DIRECTIONS
        </p>
        <p className="mx-auto mt-3 max-w-md text-xs text-indigo-200 sm:text-sm">
          أدخل بيانات طلبك وسنقوم بتوصيله إليك
        </p>

        {/* Curved bottom */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full">
            <path
              fill="#f1f5f9"
              d="M0,60 L0,20 Q720,80 1440,20 L1440,60 Z"
            />
          </svg>
        </div>
      </div>

      {/* Form card */}
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Name */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <HiOutlineUser className="h-4 w-4 text-slate-400" />
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={handleChange('customerName')}
              placeholder="أدخل اسمك الكامل"
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition ${
                errors.customerName
                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {errors.customerName && (
              <p className="mt-1 text-xs text-red-500">{errors.customerName}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <HiOutlinePhone className="h-4 w-4 text-slate-400" />
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={handleChange('customerPhone')}
              placeholder="05xxxxxxxx"
              dir="ltr"
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition ${
                errors.customerPhone
                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {errors.customerPhone && (
              <p className="mt-1 text-xs text-red-500">
                {errors.customerPhone}
              </p>
            )}
          </div>

          {/* Order Details */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <HiOutlineClipboardDocumentList className="h-4 w-4 text-slate-400" />
              تفاصيل الطلب <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.orderDetails}
              onChange={handleChange('orderDetails')}
              placeholder="اكتب تفاصيل طلبك هنا..."
              rows={4}
              className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm outline-none transition ${
                errors.orderDetails
                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {errors.orderDetails && (
              <p className="mt-1 text-xs text-red-500">
                {errors.orderDetails}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <HiOutlineChatBubbleBottomCenterText className="h-4 w-4 text-slate-400" />
              ملاحظات إضافية
            </label>
            <textarea
              value={formData.notes}
              onChange={handleChange('notes')}
              placeholder="أي ملاحظات أو تعليمات خاصة..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Map */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <HiOutlineMapPin className="h-4 w-4 text-slate-400" />
              موقع التوصيل <span className="text-red-500">*</span>
            </label>
            <MapPicker onLocationSelect={handleLocationSelect} />
            {formData.address && (
              <p className="mt-2 break-words text-sm text-slate-600">
                📍 {formData.address}
              </p>
            )}
            {errors.location && (
              <p className="mt-1 text-xs text-red-500">{errors.location}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-l from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 sm:py-3.5 sm:text-base"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </form>
      </div>
    </div>
  );
}
