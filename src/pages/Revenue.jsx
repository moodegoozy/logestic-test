import { useState, useMemo } from 'react';
import { useOrders } from '../hooks/useOrders';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  HiOutlineBanknotes,
  HiOutlineTruck,
  HiOutlineShoppingCart,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineFunnel,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'اليوم' },
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'year', label: 'هذه السنة' },
  { value: 'all', label: 'الكل' },
];

function getStartOfPeriod(period) {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case 'year': {
      return new Date(now.getFullYear(), 0, 1);
    }
    default:
      return new Date(0);
  }
}

function formatCurrency(n) {
  return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Revenue() {
  const { orders, loading } = useOrders();
  const [period, setPeriod] = useState('month');
  const [driverFilter, setDriverFilter] = useState('all');

  // Filter orders by period
  const filteredOrders = useMemo(() => {
    const start = getStartOfPeriod(period);
    return orders.filter((o) => {
      const created = o.createdAt?.toDate?.() || new Date(o.createdAt);
      const inPeriod = created >= start;
      const inDriver = driverFilter === 'all' || o.assignedDriverId === driverFilter;
      return inPeriod && inDriver;
    });
  }, [orders, period, driverFilter]);

  // All unique drivers
  const drivers = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      if (o.assignedDriverId && o.assignedDriverName) {
        map.set(o.assignedDriverId, o.assignedDriverName);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [orders]);

  // Stats
  const stats = useMemo(() => {
    const delivered = filteredOrders.filter((o) => o.status === 'delivered');
    const cancelled = filteredOrders.filter((o) => o.status === 'cancelled');
    const pending = filteredOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status));

    const totalRevenue = delivered.reduce((sum, o) => sum + Number(o.invoiceTotal || 0), 0);
    const totalDeliveryFees = delivered.reduce((sum, o) => sum + Number(o.deliveryPrice || 0), 0);
    const totalOrderValue = delivered.reduce((sum, o) => sum + Number(o.invoicePrice || 0), 0);
    const avgOrderValue = delivered.length > 0 ? totalRevenue / delivered.length : 0;

    return {
      totalOrders: filteredOrders.length,
      deliveredCount: delivered.length,
      cancelledCount: cancelled.length,
      pendingCount: pending.length,
      totalRevenue,
      totalDeliveryFees,
      totalOrderValue,
      avgOrderValue,
      deliveryRate: filteredOrders.length > 0 ? ((delivered.length / filteredOrders.length) * 100).toFixed(1) : 0,
      cancelRate: filteredOrders.length > 0 ? ((cancelled.length / filteredOrders.length) * 100).toFixed(1) : 0,
    };
  }, [filteredOrders]);

  // Daily breakdown for chart
  const dailyData = useMemo(() => {
    const delivered = filteredOrders.filter((o) => o.status === 'delivered');
    const map = new Map();

    delivered.forEach((o) => {
      const created = o.createdAt?.toDate?.() || new Date(o.createdAt);
      const key = created.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
      const existing = map.get(key) || { label: key, revenue: 0, count: 0 };
      existing.revenue += Number(o.invoiceTotal || 0);
      existing.count += 1;
      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [filteredOrders]);

  // Max revenue for bar scaling
  const maxRevenue = useMemo(() => Math.max(...dailyData.map((d) => d.revenue), 1), [dailyData]);

  // Driver performance
  const driverStats = useMemo(() => {
    const delivered = filteredOrders.filter((o) => o.status === 'delivered');
    const map = new Map();

    delivered.forEach((o) => {
      if (!o.assignedDriverId) return;
      const existing = map.get(o.assignedDriverId) || {
        name: o.assignedDriverName || 'غير معروف',
        count: 0,
        revenue: 0,
      };
      existing.count += 1;
      existing.revenue += Number(o.invoiceTotal || 0);
      map.set(o.assignedDriverId, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Top orders
  const topOrders = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === 'delivered' && o.invoiceTotal)
      .sort((a, b) => Number(b.invoiceTotal || 0) - Number(a.invoiceTotal || 0))
      .slice(0, 5);
  }, [filteredOrders]);

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-3 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">الإيرادات والتحليلات</h1>
            <p className="mt-1 text-sm text-slate-500">مراقبة شاملة للأداء المالي والتشغيلي</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            {/* Period Filter */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <HiOutlineCalendarDays className="h-4 w-4 text-slate-400" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {/* Driver Filter */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
              >
                <option value="all">كل المناديب</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            icon={HiOutlineBanknotes}
            label="إجمالي الإيرادات"
            value={`${formatCurrency(stats.totalRevenue)} ر.س`}
            color="emerald"
          />
          <KpiCard
            icon={HiOutlineShoppingCart}
            label="قيمة الطلبات"
            value={`${formatCurrency(stats.totalOrderValue)} ر.س`}
            color="blue"
          />
          <KpiCard
            icon={HiOutlineTruck}
            label="رسوم التوصيل"
            value={`${formatCurrency(stats.totalDeliveryFees)} ر.س`}
            color="purple"
          />
          <KpiCard
            icon={HiOutlineArrowTrendingUp}
            label="متوسط الطلب"
            value={`${formatCurrency(stats.avgOrderValue)} ر.س`}
            color="amber"
          />
          <KpiCard
            icon={HiOutlineCheckCircle}
            label="نسبة التوصيل"
            value={`${stats.deliveryRate}%`}
            color="teal"
          />
          <KpiCard
            icon={HiOutlineXCircle}
            label="نسبة الإلغاء"
            value={`${stats.cancelRate}%`}
            color="red"
          />
        </div>

        {/* Order counts bar */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CountCard label="إجمالي الطلبات" count={stats.totalOrders} color="slate" />
          <CountCard label="تم التوصيل" count={stats.deliveredCount} color="emerald" />
          <CountCard label="ملغي" count={stats.cancelledCount} color="red" />
        </div>

        {/* Charts row */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Revenue chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <HiOutlineChartBarSquare className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">الإيرادات حسب اليوم</h3>
            </div>
            {dailyData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                لا توجد بيانات في هذه الفترة
              </div>
            ) : (
              <div className="flex h-48 items-end gap-1 overflow-x-auto pb-2 pt-4">
                {dailyData.map((d, i) => (
                  <div key={i} className="group flex min-w-[36px] flex-1 flex-col items-center gap-1">
                    {/* Tooltip */}
                    <div className="invisible mb-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-white shadow-lg group-hover:visible">
                      {formatCurrency(d.revenue)} ر.س
                      <br />
                      {d.count} طلبات
                    </div>
                    {/* Bar */}
                    <div
                      className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all group-hover:from-indigo-700 group-hover:to-indigo-500"
                      style={{ height: `${Math.max((d.revenue / maxRevenue) * 140, 8)}px` }}
                    />
                    {/* Label */}
                    <span className="max-w-[40px] truncate text-[10px] text-slate-400">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Driver performance */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <HiOutlineTruck className="h-5 w-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-800">أداء المناديب</h3>
            </div>
            {driverStats.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                لا توجد بيانات
              </div>
            ) : (
              <div className="space-y-3">
                {driverStats.map((d, i) => {
                  const maxDriverRev = driverStats[0]?.revenue || 1;
                  return (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="max-w-[50%] truncate font-medium text-slate-700">{d.name}</span>
                        <span className="text-xs text-slate-500">
                          {d.count} طلبات &middot; {formatCurrency(d.revenue)} ر.س
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-purple-600 to-purple-400 transition-all"
                          style={{ width: `${(d.revenue / maxDriverRev) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top orders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <HiOutlineArrowTrendingUp className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">أعلى الطلبات قيمة</h3>
          </div>
          {topOrders.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-slate-400">
              لا توجد طلبات مكتملة بفواتير في هذه الفترة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-right text-xs text-slate-500">
                    <th className="pb-3 font-medium">#</th>
                    <th className="pb-3 font-medium">رقم الطلب</th>
                    <th className="pb-3 font-medium">العميل</th>
                    <th className="pb-3 font-medium">المندوب</th>
                    <th className="pb-3 font-medium">سعر الطلب</th>
                    <th className="pb-3 font-medium">التوصيل</th>
                    <th className="pb-3 font-medium">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {topOrders.map((o, i) => (
                    <tr key={o.id} className="border-b border-slate-50 transition hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="py-3 font-medium text-indigo-600">{o.orderNumber}</td>
                      <td className="max-w-[160px] truncate py-3 text-slate-700">{o.customerName}</td>
                      <td className="max-w-[160px] truncate py-3 text-slate-500">{o.assignedDriverName || '—'}</td>
                      <td className="py-3" dir="ltr">{formatCurrency(o.invoicePrice)} ر.س</td>
                      <td className="py-3" dir="ltr">{formatCurrency(o.deliveryPrice)} ر.س</td>
                      <td className="py-3 font-bold text-emerald-700" dir="ltr">{formatCurrency(o.invoiceTotal)} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

/* ── Sub-components ── */

function KpiCard({ icon: Icon, label, value, color }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };
  const iconColors = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    teal: 'bg-teal-100 text-teal-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className={`rounded-2xl border p-4 ${colors[color]} min-w-0`}>
      <div className={`mb-2 inline-flex rounded-xl p-2 ${iconColors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-medium opacity-70 break-words">{label}</p>
      <p className="mt-1 text-base font-bold leading-tight break-words sm:text-lg">{value}</p>
    </div>
  );
}

function CountCard({ label, count, color }) {
  const colors = {
    slate: 'border-slate-200 bg-white',
    emerald: 'border-emerald-200 bg-emerald-50',
    red: 'border-red-200 bg-red-50',
  };
  const textColors = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-700',
    red: 'text-red-700',
  };

  return (
    <div className={`rounded-2xl border p-4 text-center ${colors[color]} min-w-0`}>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{count}</p>
      <p className="mt-1 text-xs text-slate-500 break-words">{label}</p>
    </div>
  );
}
