import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineArrowRightOnRectangle,
  HiOutlineTruck,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2';

export default function Layout({ children }) {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('تم تسجيل الخروج بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  const roleLabel = userData?.role === 'admin' ? 'مدير النظام' : 'سائق';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l border-slate-200 bg-white shadow-lg transition-transform duration-300 lg:static lg:z-auto lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <HiOutlineTruck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">لوجستك</h1>
            <p className="text-xs text-slate-400">إدارة التوصيل</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="mr-auto lg:hidden"
          >
            <HiOutlineXMark className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4">
          <div className="rounded-xl bg-indigo-50 p-3">
            <div className="flex items-center gap-3">
              <HiOutlineClipboardDocumentList className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">
                لوحة التحكم
              </span>
            </div>
          </div>
        </nav>

        {/* User info & logout */}
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">
              {userData?.name}
            </p>
            <p className="text-xs text-slate-400">{roleLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
          >
            <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <HiOutlineBars3 className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">
            {userData?.role === 'admin'
              ? 'لوحة تحكم المدير'
              : 'لوحة تحكم السائق'}
          </h2>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
