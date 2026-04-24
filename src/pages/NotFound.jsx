import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-indigo-200 sm:text-8xl">404</h1>
        <p className="mt-4 text-lg font-bold text-slate-700 sm:text-xl">
          الصفحة غير موجودة
        </p>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">
          الصفحة التي تبحث عنها غير متاحة
        </p>
        <Link
          to="/order"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 sm:px-6 sm:py-3"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
