import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineArrowRightOnRectangle,
  HiOutlineTruck,
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
  HiOutlineBanknotes,
  HiOutlineUserPlus,
} from 'react-icons/hi2';
import { subscribeToPendingDrivers } from '../services/driverRequests';

export default function Layout({ children }) {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeToPendingDrivers((list) => setPendingCount(list.length));
    return () => unsub();
  }, [isAdmin]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('تم تسجيل الخروج بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  const roleLabel = userData?.role === 'admin' ? 'مدير النظام' : 'مندوب';

  const navItems = [
    {
      label: 'لوحة التحكم',
      icon: HiOutlineClipboardDocumentList,
      path: isAdmin ? '/admin' : '/driver',
      show: true,
    },
    {
      label: 'الإيرادات',
      icon: HiOutlineBanknotes,
      path: '/admin/revenue',
      show: isAdmin,
    },
    {
      label: 'إدارة المستخدمين',
      icon: HiOutlineUserGroup,
      path: '/admin/users',
      show: isAdmin,
    },
    {
      label: 'طلبات المناديب',
      icon: HiOutlineUserPlus,
      path: '/admin/driver-requests',
      show: isAdmin,
      badge: pendingCount > 0 ? pendingCount : null,
    },
  ];

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] overflow-hidden bg-transparent">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[86vw] max-w-xs flex-col border-l border-white/70 bg-white/90 shadow-xl backdrop-blur-md transition-transform duration-300 lg:static lg:z-auto lg:w-72 lg:max-w-none lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100/80 px-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-indigo-300/50">
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
        <nav className="flex-1 space-y-2 p-3 sm:p-4">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-xs font-semibold transition sm:text-sm ${
                  isActive
                    ? 'bg-gradient-to-l from-indigo-50 to-cyan-50 text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : ''}`} />
                {item.label}
                {item.badge && (
                  <span className="mr-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 rounded-xl bg-slate-50 p-3 clip-safe">
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
        <header className="flex h-14 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-3 backdrop-blur-sm sm:h-16 sm:gap-4 sm:px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <HiOutlineBars3 className="h-6 w-6" />
          </button>
          <h2 className="truncate text-sm font-bold text-slate-800 sm:text-lg">
            {userData?.role === 'admin'
              ? 'لوحة تحكم المدير'
              : 'لوحة تحكم السائق'}
          </h2>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
