import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';
import {
  HiOutlineTruck,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
} from 'react-icons/hi2';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userData) {
      if (userData.role === 'admin') navigate('/admin', { replace: true });
      else if (userData.role === 'driver') navigate('/driver', { replace: true });
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
      const cred = await login(email, password);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        toast.success('تم تسجيل الدخول بنجاح');
        if (role === 'admin') navigate('/admin', { replace: true });
        else if (role === 'driver') navigate('/driver', { replace: true });
        else navigate('/', { replace: true });
      } else {
        toast.error('لا توجد بيانات لهذا المستخدم في النظام');
      }
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <HiOutlineTruck className="h-9 w-9" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-800">لوجستك</h1>
            <p className="mt-1 text-sm text-slate-400">
              تسجيل الدخول إلى لوحة التحكم
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-l from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
