type ServiceStatsCardProps = {
  section: any;
};

const normalizeBars = (bars: any) => {
  const list = Array.isArray(bars) ? bars : [];
  const cleaned = list
    .map((value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      return Math.max(0, Math.min(100, num));
    })
    .filter((value) => value !== null) as number[];
  if (cleaned.length > 0) return cleaned;
  return [40, 60, 80, 50, 90, 100, 70];
};

export default function ServiceStatsCard({ section }: ServiceStatsCardProps) {
  if (section?.isVisible === false) return null;
  const bars = normalizeBars(section?.bars);
  const title = section?.title || "Пропускная способность";
  const label = section?.statLabel || "Пиковая нагрузка";
  const value = section?.statValue || "942 Mb/s";

  return (
    <section
      className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100"
      data-stitch-block="service_stats_card"
    >
      <div className="max-w-5xl mx-auto px-6 lg:px-10 pb-12">
        <div className="bg-primary p-6 rounded-2xl text-white overflow-hidden relative max-w-xl">
          <h4 className="text-lg font-bold mb-4 relative z-10" data-service-stats-title>
            {title}
          </h4>
          <div className="flex items-end gap-1 h-20 mb-4 relative z-10" data-service-stats-bars>
            {bars.map((bar, idx) => {
              const opacity = 0.2 + (bar / 100) * 0.8;
              return (
                <div
                  key={`bar-${idx}`}
                  className="flex-1 rounded-t"
                  data-service-stats-bar
                  style={{ height: `${bar}%`, backgroundColor: `rgba(255,255,255,${opacity})` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between items-center relative z-10">
            <span className="text-xs font-medium opacity-80" data-service-stats-label>
              {label}
            </span>
            <span className="text-xl font-black" data-service-stats-value>
              {value}
            </span>
          </div>
          <div className="absolute -left-4 -top-4 size-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>
      </div>
    </section>
  );
}
