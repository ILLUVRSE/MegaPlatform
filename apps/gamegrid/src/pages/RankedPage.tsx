import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { GAME_REGISTRY } from '../registry/games';
import { persistence } from '../systems/persistence';
import { ensureRankSeason, formatTierLabel } from '../systems/ranks';
import { ensureDailyQuests } from '../systems/dailyQuests';
import { trackTelemetry } from '../systems/telemetry';
import { ensureBattlePassSeason } from '../systems/battlePass';

export function RankedPage() {
  const navigate = useNavigate();
  const stats = useMemo(() => {
    const loaded = persistence.loadStats();
    const withQuests = ensureDailyQuests(loaded).next;
    const withRanks = ensureRankSeason(withQuests);
    const withPass = ensureBattlePassSeason(withRanks);
    persistence.saveStats(withPass);
    return withPass;
  }, []);

  useEffect(() => {
    trackTelemetry({ type: 'page_view', page: 'ranked' });
  }, []);

  return (
    <main className="ranked-page">
      <header className="hero premium-hero">
        <h1>
          <Icon name="trophy" className="inline-icon" /> Ranked Arena
        </h1>
        <p>Climb per-game ladders and build your Grid Rating. Wins only. No practice.</p>
        <div className="hero-metrics">
          <span>Season: {stats.rank.seasonId || 'Preseason'}</span>
          <span>
            Grid Rating: {stats.rank.meta.rating} ({formatTierLabel(stats.rank.meta.tier)})
          </span>
        </div>
        <Link to="/">Back to Lobby</Link>
      </header>

      <section className="ranked-grid" aria-label="Ranked games">
        {GAME_REGISTRY.map((game) => {
          const record = stats.rank.perGame[game.id] ?? stats.rank.meta;
          return (
            <article key={game.id} className="ranked-card">
              <div className="ranked-card-header">
                <strong>{game.title}</strong>
                <span className="chip">{formatTierLabel(record.tier)}</span>
              </div>
              <p>{record.rating} rating · {record.matches} matches</p>
              <div className="ranked-card-footer">
                <button onClick={() => navigate(`${game.route}?ranked=1`)}>
                  <Icon name="play" className="inline-icon" /> Start Ranked
                </button>
                <span>
                  {record.wins}W / {record.losses}L
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <nav className="bottom-nav" aria-label="Primary">
        <Link to="/">Home</Link>
        <Link to="/party">Party</Link>
        <Link to="/ranked">Ranked</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/profile">Profile</Link>
      </nav>
    </main>
  );
}
