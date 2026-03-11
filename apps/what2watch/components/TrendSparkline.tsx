export function TrendSparkline({ points }: { points: Array<{ date: string; trendScore: number }> }) {
  if (points.length < 2) return null;

  const width = 240;
  const height = 70;
  const max = Math.max(...points.map((p) => p.trendScore));
  const min = Math.min(...points.map((p) => p.trendScore));
  const span = max - min || 1;

  const path = points
    .map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p.trendScore - min) / span) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="mb-2 text-sm font-medium">7-day social buzz</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full">
        <path d={path} fill="none" stroke="#F4A261" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
