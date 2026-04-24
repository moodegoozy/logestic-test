import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineTruck,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlinePhone,
  HiOutlineKey,
} from 'react-icons/hi2';

const FUNCTIONS_BASE = 'https://us-central1-sfrtalbyt-f7fd1.cloudfunctions.net';

export default function Login() {
  const [mode, setMode] = useState('driver');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, loginWithCustomToken, user, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userData) {
      if (userData.role === 'admin') navigate('/admin', { replace: true });
      else if (userData.role === 'driver') navigate('/driver', { replace: true });
      else if (userData.role === 'pending' || userData.role === 'rejected') navigate('/pending', { replace: true });
    }
  }, [user, userData, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول بنجاح');
      // AuthContext will auto-create user doc & redirect via useEffect
    } catch (error) {
      const code = error.code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (code === 'auth/too-many-requests') {
        toast.error('تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.');
      } else {
        toast.error('حدث خطأ أثناء تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!phone.trim()) {
      toast.error('يرجى إدخال رقم الجوال');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/requestDriverOtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'تعذر إرسال رمز التحقق');
        return;
      }
      setOtpSent(true);
      setOtpCooldown(45);
      toast.success('تم إرسال رمز التحقق إلى واتساب الرقم المسجل');
    } catch {
      toast.error('تعذر إرسال رمز التحقق حالياً');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !otp.trim()) {
      toast.error('يرجى إدخال رقم الجوال ورمز التحقق');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/verifyDriverOtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: otp.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        toast.error(data?.error || 'رمز التحقق غير صحيح');
        return;
      }
      await loginWithCustomToken(data.token);
      toast.success('تم تسجيل دخول المندوب بنجاح');
    } catch {
      toast.error('تعذر التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl sm:p-8">
          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white sm:h-16 sm:w-16">
              <HiOutlineTruck className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-800 sm:text-2xl">لوجستك</h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              تسجيل الدخول إلى لوحة التحكم
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold sm:mt-8 sm:text-sm">
            <button
              onClick={() => setMode('driver')}
              className={`rounded-lg px-3 py-2 transition ${mode === 'driver' ? 'bg-white text-indigo-700 shadow' : 'text-slate-500'}`}
            >
              دخول المندوب (OTP)
            </button>
            <button
              onClick={() => setMode('admin')}
              className={`rounded-lg px-3 py-2 transition ${mode === 'admin' ? 'bg-white text-indigo-700 shadow' : 'text-slate-500'}`}
            >
              دخول الإدارة
            </button>
          </div>

          {mode === 'admin' ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:space-y-5">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlineEnvelope className="h-4 w-4 text-slate-400" />
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:py-3"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlineLockClosed className="h-4 w-4 text-slate-400" />
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:py-3"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-l from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 sm:py-3"
              >
                {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4 sm:space-y-5">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlinePhone className="h-4 w-4 text-slate-400" />
                  رقم الجوال المسجل
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:py-3"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <HiOutlineKey className="h-4 w-4 text-slate-400" />
                  رمز OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="000000"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:py-3"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpLoading || otpCooldown > 0}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                >
                  {otpLoading ? 'جاري الإرسال...' : (otpCooldown > 0 ? `إعادة الإرسال بعد ${otpCooldown}s` : 'إرسال رمز OTP')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !otpSent}
                  className="rounded-xl bg-gradient-to-l from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {loading ? 'جاري التحقق...' : 'دخول المندوب'}
                </button>
              </div>
            </form>
          )}

            {/* Registration link */}
            <div className="mt-5 border-t border-slate-100 pt-5 text-center">
              <p className="text-xs text-slate-400 sm:text-sm">
                مندوب جديد؟{' '}
                <Link
                  to="/register"
                  className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                >
                  سجّل حسابك الآن
                </Link>
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
