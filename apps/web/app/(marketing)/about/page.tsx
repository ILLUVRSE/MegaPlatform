/**
 * Marketing about page.
 * Request/response: describes the MegaPlatform vision.
 * Guard: none; public view.
 */
export default function AboutPage() {
  return (
    <div className="space-y-6">
      <header className="party-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">About</p>
        <h1 className="text-3xl font-semibold">The ILLUVRSE MegaPlatform</h1>
        <p className="text-sm text-illuvrse-muted">
          ILLUVRSE blends premium premieres, instant games, and real-time watch parties into a single
          entertainment stack.
        </p>
      </header>
      <section className="party-card space-y-3 text-sm text-illuvrse-muted">
        <p>Ship shows, shorts, and live parties on one platform.</p>
        <p>Extend watch sessions into games, commerce, and community.</p>
        <p>Build with a shared design system and modular service layers.</p>
      </section>
    </div>
  );
}
