interface GlobalLoadingScreenProps {
  progress: number;
  label?: string;
}

export function GlobalLoadingScreen({ progress, label = 'Loading GameGrid' }: GlobalLoadingScreenProps) {
  const normalized = Math.max(0, Math.min(100, progress));
  return (
    <div className="global-loading" role="status" aria-live="polite">
      <div className="loading-card">
        <h1>GameGrid</h1>
        <p>{label}</p>
        <div className="loading-track" aria-hidden="true">
          <div className="loading-fill" style={{ width: `${normalized}%` }} />
        </div>
        <span>{normalized}%</span>
      </div>
    </div>
  );
}
