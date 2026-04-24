export default function StatsCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'from-blue-600 to-cyan-500 shadow-blue-300/60',
    green: 'from-emerald-600 to-teal-500 shadow-emerald-300/60',
    amber: 'from-amber-500 to-orange-500 shadow-amber-300/60',
    purple: 'from-violet-600 to-indigo-600 shadow-violet-300/60',
    rose: 'from-rose-600 to-fuchsia-500 shadow-rose-300/60',
    indigo: 'from-indigo-600 to-blue-600 shadow-indigo-300/60',
  };

  return (
    <div className="lux-card group relative overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-indigo-50/50" />
      <div className="relative flex items-center gap-3 sm:gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br sm:h-14 sm:w-14 ${
          colors[color] || colors.blue
        } text-white shadow-lg transition group-hover:scale-105`}
      >
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>
      <div className="clip-safe">
        <p className="clamp-2 text-xs font-semibold text-slate-500 sm:text-sm">{title}</p>
        <p className="clip-safe mt-0.5 text-xl font-extrabold text-slate-800 sm:text-2xl" dir="auto">{value}</p>
      </div>
      </div>
    </div>
  );
}
