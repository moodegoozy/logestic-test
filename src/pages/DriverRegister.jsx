import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { uploadDriverPhoto } from '../services/driverRequests';
import toast from 'react-hot-toast';
import {
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlinePhone,
  HiOutlinePhoto,
  HiOutlineArrowRightOnRectangle,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';

const CAR_TYPES = [
  'سيدان',
  'SUV',
  'بيك آب',
  'فان / باص',
  'شاحنة صغيرة',
  'دراجة نارية',
  'أخرى',
];

export default function DriverRegister() {
  const navigate = useNavigate();
  const licenseRef = useRef(null);
  const vehicleDocRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    carType: '',
  });
  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [vehicleDocFile, setVehicleDocFile] = useState(null);
  const [vehicleDocPreview, setVehicleDocPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('الحد الأقصى لحجم الصورة 5 ميغابايت');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة فقط');
      return;
    }
    const url = URL.createObjectURL(file);
    if (type === 'license') {
      setLicenseFile(file);
      setLicensePreview(url);
    } else {
      setVehicleDocFile(file);
      setVehicleDocPreview(url);
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (licensePreview) URL.revokeObjectURL(licensePreview);
      if (vehicleDocPreview) URL.revokeObjectURL(vehicleDocPreview);
    };
  }, [licensePreview, vehicleDocPreview]);

  const validate = () => {
    if (!form.name.trim()) return 'يرجى إدخال الاسم الكامل';
    if (!form.email.trim()) return 'يرجى إدخال البريد الإلكتروني';
    if (!form.password || form.password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    if (form.password !== form.confirmPassword) return 'كلمتا المرور غير متطابقتين';
    if (!form.phone.trim()) return 'يرجى إدخال رقم الجوال';
    if (!form.carType) return 'يرجى اختيار نوع السيارة';
    if (!licenseFile) return 'يرجى رفع صورة الرخصة';
    if (!vehicleDocFile) return 'يرجى رفع صورة الاستمارة';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }

    setLoading(true);
    let credential = null;
    try {
      // 1. Create Firebase Auth user
      credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const uid = credential.user.uid;

      // 2. Update display name
      await updateProfile(credential.user, { displayName: form.name.trim() });

      // 3. Upload photos to Firebase Storage
      const [licenseUrl, vehicleDocUrl] = await Promise.all([
        uploadDriverPhoto(uid, 'license', licenseFile),
        uploadDriverPhoto(uid, 'vehicle-doc', vehicleDocFile),
      ]);

      // 4. Save user document with role 'pending'
      await setDoc(doc(db, 'users', uid), {
        uid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        carType: form.carType,
        licensePhotoUrl: licenseUrl,
        vehicleDocPhotoUrl: vehicleDocUrl,
        role: 'pending',
        createdAt: serverTimestamp(),
      });

      toast.success('تم إرسال طلب التسجيل بنجاح');
      navigate('/pending', { replace: true });
    } catch (error) {
      // If auth user was created but later steps failed, still navigate to pending
      // so user doesn't get stuck
      if (error.code === 'auth/email-already-in-use') {
        toast.error('البريد الإلكتروني مستخدم بالفعل');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('البريد الإلكتروني غير صحيح');
      } else if (error.code === 'auth/weak-password') {
        toast.error('كلمة المرور ضعيفة جداً');
      } else {
        toast.error('حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-3 py-8 sm:p-6"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-2xl">
        {/* Header card */}
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-xl sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-300/50">
              <HiOutlineTruck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">لوجستك</h1>
              <p className="text-sm text-slate-400">تسجيل مندوب جديد</p>
            </div>
            <Link
              to="/login"
              className="mr-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 sm:text-sm"
            >
              <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
              تسجيل الدخول
            </Link>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl sm:p-8">
          <h2 className="mb-6 text-lg font-bold text-slate-800">بيانات الحساب والمركبة</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row: Name + Phone */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlineUser className="h-4 w-4 text-slate-400" />
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="محمد العلي"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlinePhone className="h-4 w-4 text-slate-400" />
                  رقم الجوال
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <HiOutlineEnvelope className="h-4 w-4 text-slate-400" />
                البريد الإلكتروني
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="driver@example.com"
                dir="ltr"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Password row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlineLockClosed className="h-4 w-4 text-slate-400" />
                  كلمة المرور
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlineLockClosed className="h-4 w-4 text-slate-400" />
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Car type */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <HiOutlineTruck className="h-4 w-4 text-slate-400" />
                نوع السيارة
              </label>
              <select
                name="carType"
                value={form.carType}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">اختر نوع السيارة</option>
                {CAR_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Photos upload */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* License */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlinePhoto className="h-4 w-4 text-slate-400" />
                  صورة الرخصة
                </label>
                <div
                  onClick={() => licenseRef.current?.click()}
                  className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition ${
                    licenseFile
                      ? 'border-indigo-300 bg-indigo-50/50'
                      : 'border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/30'
                  }`}
                >
                  {licensePreview ? (
                    <img
                      src={licensePreview}
                      alt="صورة الرخصة"
                      className="h-full max-h-32 w-full rounded-lg object-contain p-1"
                    />
                  ) : (
                    <>
                      <HiOutlinePhoto className="h-8 w-8 text-slate-300" />
                      <span className="text-xs text-slate-400">اضغط لرفع صورة الرخصة</span>
                      <span className="text-[10px] text-slate-300">حد أقصى 5 ميغابايت</span>
                    </>
                  )}
                  {licenseFile && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">
                      <HiOutlineCheckCircle className="h-3 w-3" />
                      تم الرفع
                    </div>
                  )}
                </div>
                <input
                  ref={licenseRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'license')}
                />
              </div>

              {/* Vehicle Registration Doc */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlinePhoto className="h-4 w-4 text-slate-400" />
                  صورة الاستمارة
                </label>
                <div
                  onClick={() => vehicleDocRef.current?.click()}
                  className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition ${
                    vehicleDocFile
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50 hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                >
                  {vehicleDocPreview ? (
                    <img
                      src={vehicleDocPreview}
                      alt="صورة الاستمارة"
                      className="h-full max-h-32 w-full rounded-lg object-contain p-1"
                    />
                  ) : (
                    <>
                      <HiOutlinePhoto className="h-8 w-8 text-slate-300" />
                      <span className="text-xs text-slate-400">اضغط لرفع صورة الاستمارة</span>
                      <span className="text-[10px] text-slate-300">حد أقصى 5 ميغابايت</span>
                    </>
                  )}
                  {vehicleDocFile && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">
                      <HiOutlineCheckCircle className="h-3 w-3" />
                      تم الرفع
                    </div>
                  )}
                </div>
                <input
                  ref={vehicleDocRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'vehicleDoc')}
                />
              </div>
            </div>

            {/* Info note */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700 leading-relaxed">
              سيتم مراجعة طلبك من قِبل الإدارة وإشعارك بالقبول. يمكنك تسجيل الدخول في أي وقت لمعرفة حالة طلبك.
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-l from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  جاري إرسال الطلب...
                </span>
              ) : (
                'إرسال طلب التسجيل'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
