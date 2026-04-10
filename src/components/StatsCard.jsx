export default function StatsCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-200',
    green: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
    amber: 'from-amber-500 to-amber-600 shadow-amber-200',
    purple: 'from-purple-500 to-purple-600 shadow-purple-200',
    rose: 'from-rose-500 to-rose-600 shadow-rose-200',
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
          colors[color] || colors.blue
        } shadow-lg text-white`}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
