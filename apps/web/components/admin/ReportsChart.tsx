export default function ReportsChart({
  data
}: {
  data: { label: string; value: number }[];
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
      <h3 className="text-lg font-semibold">Platform Activity Snapshot</h3>
      <div className="mt-6 space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-illuvrse-muted">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-illuvrse-accent"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
