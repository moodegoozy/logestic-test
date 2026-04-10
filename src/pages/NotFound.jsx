import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-indigo-200">404</h1>
        <p className="mt-4 text-xl font-bold text-slate-700">
          الصفحة غير موجودة
        </p>
        <p className="mt-2 text-slate-400">
          الصفحة التي تبحث عنها غير متاحة
        </p>
        <Link
          to="/order"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
