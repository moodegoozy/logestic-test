import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineTruck,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';

export default function PendingApproval() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const isRejected = userData?.role === 'rejected';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl text-center">
          {/* Icon */}
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              isRejected
                ? 'bg-gradient-to-br from-red-100 to-red-200'
                : 'bg-gradient-to-br from-amber-100 to-orange-200'
            }`}
          >
            {isRejected ? (
              <HiOutlineXCircle className="h-10 w-10 text-red-500" />
            ) : (
              <HiOutlineClock className="h-10 w-10 text-amber-500 animate-pulse" />
            )}
          </div>

          {/* App logo row */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <HiOutlineTruck className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-700">لوجستك</span>
          </div>

          {isRejected ? (
            <>
              <h2 className="mt-4 text-xl font-bold text-red-600">تم رفض الطلب</h2>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                عذراً، تم رفض طلب تسجيلك من قِبل الإدارة. يمكنك التواصل مع الإدارة للمزيد من المعلومات.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-bold text-slate-800">طلبك قيد المراجعة</h2>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                تم استلام طلب تسجيلك وهو الآن قيد مراجعة الإدارة. سيتم تفعيل حسابك فور القبول وستتلقى الطلبات مباشرةً.
              </p>

              {/* Info pills */}
              <div className="mt-6 space-y-3 text-right">
                {[
                  { label: 'الاسم', value: userData?.name },
                  { label: 'البريد', value: userData?.email },
                  { label: 'الجوال', value: userData?.phone },
                  { label: 'نوع السيارة', value: userData?.carType },
                ].filter((r) => r.value).map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5"
                  >
                    <span className="text-xs font-medium text-slate-400">{row.label}</span>
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[60%]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
