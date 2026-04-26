import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../services/firebase';
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
const OTP_COOLDOWN_SECONDS = 120;
const OTP_LOCK_KEY = 'driverOtpNextAllowedAt';

export default function Login() {
  const [mode, setMode] = useState('driver');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpDebug, setOtpDebug] = useState(null);
  const confirmationRef = useRef(null);
  const recaptchaWidgetIdRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const { login, loginWithCustomToken, user, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userData) {
      if (userData.role === 'admin') navigate('/admin', { replace: true });
      else if (userData.role === 'driver') navigate('/driver', { replace: true });
      else if (userData.role === 'pending' || userData.role === 'rejected') {
        navigate('/pending', { replace: true });
      }
    }
  }, [user, userData, navigate]);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
        window.recaptchaVerifier = null;
      }
      recaptchaWidgetIdRef.current = null;
    };
  }, []);

  const setupRecaptcha = async () => {
    const container = document.getElementById('recaptcha-container');
    if (!container) throw new Error('reCAPTCHA container not found');

    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
      window.recaptchaVerifier = null;
      recaptchaWidgetIdRef.current = null;
    }

    container.innerHTML = '';

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'normal',
      'expired-callback': () => {
        toast.error('انتهت صلاحية reCAPTCHA، أعد التحقق ثم حاول مرة أخرى');
      },
    });

    const widgetId = await window.recaptchaVerifier.render();
    recaptchaWidgetIdRef.current = widgetId;
    return window.recaptchaVerifier;
  };

  const lockOtpRequests = (seconds) => {
    const ms = Math.max(1, Number(seconds || 0)) * 1000;
    const nextAllowedAt = Date.now() + ms;
    setOtpCooldown(Math.ceil(ms / 1000));
    try {
      localStorage.setItem(OTP_LOCK_KEY, String(nextAllowedAt));
    } catch {
      // ignore localStorage errors
    }
  };

  const normalizeSaudiToE164 = (input) => {
    let p = input.replace(/[^\d]/g, '');
    if (p.startsWith('00966')) p = p.slice(5);
    else if (p.startsWith('966')) p = p.slice(3);
    if (p.startsWith('0')) p = p.slice(1);
    // Saudi mobile must be 9 digits and start with 5 (e.g. 5XXXXXXXX)
    if (!/^5\d{8}$/.test(p)) return null;
    return `+966${p}`;
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (error) {
      const code = error.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
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
    setOtpDebug(null);

    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
    if (protocol !== 'https:' && host !== 'localhost') {
      toast.error('تسجيل الجوال يحتاج HTTPS. افتح الموقع على رابط https:// ثم حاول مرة أخرى');
      return;
    }

    if (!phone.trim()) {
      toast.error('يرجى إدخال رقم الجوال');
      return;
    }
    if (otpCooldown > 0) {
      toast.error(`انتظر ${otpCooldown} ثانية قبل طلب رمز جديد`);
      return;
    }
    setOtpLoading(true);
    try {
      const e164 = normalizeSaudiToE164(phone.trim());
      if (!e164) {
        toast.error('صيغة الرقم غير صحيحة. استخدم 05xxxxxxxx');
        return;
      }

      const eligibilityRes = await fetch(`${FUNCTIONS_BASE}/checkDriverPhoneEligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const eligibilityData = await eligibilityRes.json().catch(() => ({}));
      if (!eligibilityRes.ok) {
        toast.error(eligibilityData?.error || 'رقم الجوال غير مؤهل لتسجيل دخول المندوب');
        return;
      }

      const verifier = await setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      confirmationRef.current = confirmation;
      setOtpSent(true);
      lockOtpRequests(OTP_COOLDOWN_SECONDS);
      toast.success(`تم إرسال رمز التحقق إلى ${e164} عبر SMS`);
    } catch (err) {
      console.error('OTP send failed:', err?.code, err?.message);
      setOtpDebug({
        code: err?.code || 'unknown',
        message: err?.message || '',
        host: typeof window !== 'undefined' ? window.location.hostname : '',
      });
      // Reset verifier so it can be recreated next attempt
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
        window.recaptchaVerifier = null;
      }
      if (err.code === 'auth/invalid-phone-number') {
        toast.error('رقم الجوال غير صحيح');
      } else if (err.code === 'auth/operation-not-allowed') {
        toast.error('Phone Authentication غير مفعل في Firebase Authentication');
      } else if (err.code === 'auth/invalid-app-credential') {
        toast.error('فشل التحقق الأمني للتطبيق. تأكد من Authorized domains و reCAPTCHA');
      } else if (err.code === 'auth/captcha-check-failed') {
        const isHostnameMismatch = String(err?.message || '').toLowerCase().includes('hostname match not found');
        if (isHostnameMismatch) {
          toast.error('الدومين الحالي غير مضاف في Firebase Auth Authorized domains. أضف for-all-directions-sa.web.app ثم أعد المحاولة');
        } else {
          toast.error('فشل reCAPTCHA. أكمل التحقق المرئي ثم أعد المحاولة، أو عطّل مانع الإعلانات');
        }
      } else if (err.code === 'auth/quota-exceeded' || err.code === 'auth/too-many-requests') {
        lockOtpRequests(15 * 60);
        toast.error('تم رفض طلب OTP مؤقتاً من خدمة التحقق. انتظر 15 دقيقة ثم أعد المحاولة');
      } else {
        toast.error(`تعذر إرسال رمز التحقق (${err?.code || 'unknown'})`);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error('يرجى إدخال رمز التحقق');
      return;
    }
    if (!confirmationRef.current) {
      toast.error('يرجى طلب رمز OTP أولاً');
      return;
    }
    setLoading(true);
    try {
      const credential = await confirmationRef.current.confirm(otp.trim());
      const idToken = await credential.user.getIdToken();

      const res = await fetch(`${FUNCTIONS_BASE}/exchangePhoneSessionForDriverToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.token) {
        toast.error(data?.error || 'رقم الجوال غير مسجل كمندوب');
        return;
      }

      await loginWithCustomToken(data.token);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (err) {
      if (err.code === 'auth/invalid-verification-code') {
        toast.error('رمز التحقق غير صحيح');
      } else if (err.code === 'auth/code-expired') {
        toast.error('انتهت صلاحية الرمز، أعد الإرسال');
      } else {
        toast.error('تعذر التحقق من الرمز');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const nextAllowedAt = Number(localStorage.getItem(OTP_LOCK_KEY) || 0);
      const now = Date.now();
      if (nextAllowedAt > now) {
        setOtpCooldown(Math.ceil((nextAllowedAt - now) / 1000));
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white sm:h-16 sm:w-16">
              <HiOutlineTruck className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-800 sm:text-2xl">لوجستك</h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">تسجيل الدخول إلى لوحة التحكم</p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold sm:mt-8 sm:text-sm">
            <button
              onClick={() => setMode('driver')}
              className={`rounded-lg px-3 py-2 transition ${mode === 'driver' ? 'bg-white text-indigo-700 shadow' : 'text-slate-500'}`}
            >
              دخول المندوب (SMS)
            </button>
            <button
              onClick={() => setMode('admin')}
              className={`rounded-lg px-3 py-2 transition ${mode === 'admin' ? 'bg-white text-indigo-700 shadow' : 'text-slate-500'}`}
            >
              دخول الإدارة
            </button>
          </div>

          {mode === 'admin' ? (
            <form onSubmit={handleAdminSubmit} className="mt-6 space-y-4 sm:space-y-5">
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

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs text-slate-500">تحقق الأمان (reCAPTCHA) مطلوب قبل إرسال الرمز</p>
            <div id="recaptcha-container" />
          </div>

          {mode === 'driver' && otpDebug && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" dir="ltr">
              <p className="font-semibold">OTP Debug</p>
              <p>code: {otpDebug.code}</p>
              <p>host: {otpDebug.host || 'unknown'}</p>
              <p className="break-all">message: {otpDebug.message || 'n/a'}</p>
            </div>
          )}

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
