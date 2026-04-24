import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { updateUserData } from '../services/users';
import { uploadDriverPhoto } from '../services/driverRequests';
import toast from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineTruck,
  HiOutlinePhoto,
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

export default function DriverProfile() {
  const { user, userData, refreshUserData } = useAuth();
  const licenseRef = useRef(null);
  const vehicleDocRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', carType: '' });
  const [licenseFile, setLicenseFile] = useState(null);
  const [vehicleDocFile, setVehicleDocFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState('');
  const [vehicleDocPreview, setVehicleDocPreview] = useState('');

  useEffect(() => {
    setForm({
      name: userData?.name || '',
      phone: userData?.phone || '',
      carType: userData?.carType || '',
    });
    setLicensePreview(userData?.licensePhotoUrl || '');
    setVehicleDocPreview(userData?.vehicleDocPhotoUrl || '');
  }, [userData]);

  useEffect(() => {
    return () => {
      if (licenseFile && licensePreview?.startsWith('blob:')) URL.revokeObjectURL(licensePreview);
      if (vehicleDocFile && vehicleDocPreview?.startsWith('blob:')) URL.revokeObjectURL(vehicleDocPreview);
    };
  }, [licenseFile, licensePreview, vehicleDocFile, vehicleDocPreview]);

  const profileCompleteness = useMemo(() => {
    const items = [form.name, form.phone, form.carType, licensePreview, vehicleDocPreview];
    const done = items.filter(Boolean).length;
    return Math.round((done / items.length) * 100);
  }, [form, licensePreview, vehicleDocPreview]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة فقط');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('الحد الأقصى لحجم الصورة 5 ميغابايت');
      return;
    }
    const preview = URL.createObjectURL(file);
    if (kind === 'license') {
      setLicenseFile(file);
      setLicensePreview(preview);
    } else {
      setVehicleDocFile(file);
      setVehicleDocPreview(preview);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) {
      toast.error('تعذر تحديد حساب المندوب');
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.carType.trim()) {
      toast.error('الاسم ورقم الجوال ونوع المركبة مطلوبة');
      return;
    }
    if (!licensePreview || !vehicleDocPreview) {
      toast.error('الرخصة والاستمارة مطلوبة في البروفايل');
      return;
    }

    setSaving(true);
    try {
      const [licensePhotoUrl, vehicleDocPhotoUrl] = await Promise.all([
        licenseFile ? uploadDriverPhoto(user.uid, 'license', licenseFile) : Promise.resolve(userData?.licensePhotoUrl || ''),
        vehicleDocFile ? uploadDriverPhoto(user.uid, 'vehicle-doc', vehicleDocFile) : Promise.resolve(userData?.vehicleDocPhotoUrl || ''),
      ]);

      await updateUserData(user.uid, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        carType: form.carType,
        licensePhotoUrl,
        vehicleDocPhotoUrl,
      });

      await refreshUserData(user.uid);
      setLicenseFile(null);
      setVehicleDocFile(null);
      toast.success('تم تحديث بروفايل المندوب بنجاح');
    } catch (error) {
      console.error('Driver profile update failed:', error);
      toast.error('تعذر تحديث بيانات المندوب');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">بروفايل المندوب</h1>
              <p className="mt-1 text-sm text-slate-400">حدّث بياناتك الشخصية ووثائق المركبة من نفس الصفحة</p>
            </div>
            <div className="min-w-44 rounded-2xl bg-gradient-to-l from-indigo-50 to-cyan-50 p-4">
              <p className="text-xs font-bold text-slate-500">اكتمال الملف</p>
              <p className="mt-1 text-3xl font-extrabold text-indigo-700">{profileCompleteness}%</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">البيانات الأساسية</h2>

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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
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
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <HiOutlineTruck className="h-4 w-4 text-slate-400" />
                نوع المركبة
              </label>
              <select
                name="carType"
                value={form.carType}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">اختر نوع المركبة</option>
                {CAR_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="mt-6 rounded-2xl bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <HiOutlineCheckCircle className="h-5 w-5" />
                أي تعديل على الوثائق يظهر مباشرة للإدارة في طلبات المناديب وإدارة المستخدمين
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">الوثائق والتراخيص</h2>

            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <HiOutlinePhoto className="h-4 w-4 text-slate-400" />
                    رخصة القيادة
                  </label>
                  <button
                    type="button"
                    onClick={() => licenseRef.current?.click()}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    تغيير الصورة
                  </button>
                </div>
                <input
                  ref={licenseRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'license')}
                />
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {licensePreview ? (
                    <img src={licensePreview} alt="رخصة القيادة" className="h-52 w-full object-cover" />
                  ) : (
                    <div className="flex h-52 items-center justify-center text-sm text-slate-400">لا توجد صورة رخصة حالياً</div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <HiOutlinePhoto className="h-4 w-4 text-slate-400" />
                    استمارة المركبة
                  </label>
                  <button
                    type="button"
                    onClick={() => vehicleDocRef.current?.click()}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    تغيير الصورة
                  </button>
                </div>
                <input
                  ref={vehicleDocRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'vehicle-doc')}
                />
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {vehicleDocPreview ? (
                    <img src={vehicleDocPreview} alt="استمارة المركبة" className="h-52 w-full object-cover" />
                  ) : (
                    <div className="flex h-52 items-center justify-center text-sm text-slate-400">لا توجد صورة استمارة حالياً</div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-gradient-to-l from-indigo-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
              >
                {saving ? 'جاري حفظ التعديلات...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}