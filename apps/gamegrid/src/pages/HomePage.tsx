import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { persistence } from '../systems/persistence';
import { PROGRESS_TITLES } from '../systems/progression';
import { ensureDailyQuests } from '../systems/dailyQuests';
import { resolveEquippedLabel } from '../systems/shop';
import { trackTelemetry } from '../systems/telemetry';
import { ensureRankSeason, formatTierLabel } from '../systems/ranks';
import { battlePassProgress } from '../systems/battlePass';
import { canClaimDailyReward, claimDailyReward, ensureDailyReward, getDailyRewardAmount } from '../systems/dailyRewards';
import { ensureBattlePassSeason } from '../systems/battlePass';
import { GAME_REGISTRY } from '../registry/games';

interface HomePageProps {
  onOpenSettings: () => void;
  onOpenHowToPlay: (gameId?: string | null) => void;
}

export function HomePage({ onOpenSettings, onOpenHowToPlay }: HomePageProps) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const { stats, refreshed } = useMemo(() => {
    const loaded = persistence.loadStats();
    const withQuests = ensureDailyQuests(loaded).next;
    const withRanks = ensureRankSeason(withQuests);
    const withPass = ensureBattlePassSeason(withRanks);
    const withRewards = ensureDailyReward(withPass);
    return { stats: withRewards, refreshed: true };
  }, [version]);
  useEffect(() => {
    if (refreshed) persistence.saveStats(stats);
  }, [refreshed, stats]);
  const activeTitleId = stats.unlockedTitles[stats.unlockedTitles.length - 1];
  const activeTitle = PROGRESS_TITLES.find((title) => title.id === activeTitleId)?.name ?? 'Unranked';
  const equippedLabel = resolveEquippedLabel(stats);
  const rankLabel = `${formatTierLabel(stats.rank.meta.tier)} (${stats.rank.meta.rating})`;
  const battlePass = battlePassProgress(stats.battlePass);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const recent = useMemo(
    () =>
      [...GAME_REGISTRY]
        .filter((game) => stats.perGame[game.id]?.plays)
        .sort((a, b) => (stats.perGame[b.id]?.plays ?? 0) - (stats.perGame[a.id]?.plays ?? 0))
        .slice(0, 4),
    [stats.perGame]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 240);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    trackTelemetry({ type: 'page_view', page: 'home' });
  }, []);

  const canClaim = canClaimDailyReward(stats.dailyReward);
  const nextRewardAmount = getDailyRewardAmount(Math.max(0, stats.dailyReward.streakDay));

  const claimReward = () => {
    const { next, reward } = claimDailyReward(stats);
    if (reward <= 0) {
      setRewardMessage('Already claimed today.');
      return;
    }
    persistence.saveStats(next);
    setRewardMessage(`Claimed +${reward} coins.`);
    setVersion((value) => value + 1);
    window.setTimeout(() => setRewardMessage(null), 2000);
  };

  return (
    <main className="home-page">
      <header className="hero premium-hero">
        <img src="/brand/wordmark.svg" alt="GameGrid" className="brand-wordmark" />
        <p>Digital sports bar. Drop in solo or spin up a room with friends.</p>
        <div className="hero-metrics" aria-label="Player progress snapshot">
          <span>Level {stats.level}</span>
          <span>{stats.totalPlays} completed matches</span>
          <span>{stats.dailyStreak} day streak</span>
          <span>Coins: {stats.currency.tickets}</span>
          <span>Theme: {equippedLabel}</span>
          <span>Rank: {rankLabel}</span>
          <span>Title: {activeTitle}</span>
        </div>
        <div className="hero-actions">
          <button onClick={() => onOpenHowToPlay(null)}>
            <Icon name="info" className="inline-icon" /> How to Play
          </button>
          <button onClick={onOpenSettings}>Settings</button>
          <Link to="/party">
            <Icon name="party" className="inline-icon" /> Party Room
          </Link>
          <Link to="/ranked">Ranked</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </header>

      <section className="home-sections" aria-label="Portal sections">
        <article className="party-room-card">
          <h2>
            <Icon name="party" className="inline-icon" /> Party Room
          </h2>
          <p>Create private rooms, ready up, and launch synchronized multiplayer sessions.</p>
          <Link to="/party" className="cta-link">
            Open Party Room
          </Link>
        </article>
        <article className="ranked-card">
          <h2>
            <Icon name="trophy" className="inline-icon" /> Ranked Arena
          </h2>
          <p>Climb the ladder and earn seasonal badges. Ranked matches impact your Grid Rating.</p>
          <Link to="/ranked" className="cta-link">
            Enter Ranked
          </Link>
        </article>
        <article className="quick-play-card">
          <h2>
            <Icon name="play" className="inline-icon" /> Quick Play
          </h2>
          <div className="quick-play-row">
            {GAME_REGISTRY.slice(0, 4).map((game) => (
              <button key={game.id} className="quick-play-pill" onClick={() => navigate(game.route)}>
                <Icon name={game.icon} className="pill-icon" /> {game.title}
              </button>
            ))}
          </div>
        </article>
        <article className="battle-pass-card">
          <h2>
            <Icon name="trophy" className="inline-icon" /> Battle Pass
          </h2>
          <p>
            Tier {battlePass.currentTier} → {battlePass.nextTier} · {battlePass.pct}% to next
          </p>
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${battlePass.pct}%` }} />
          </div>
          <Link to="/profile" className="cta-link">
            View Rewards
          </Link>
        </article>
        <article className="recent-card">
          <h2>
            <Icon name="trophy" className="inline-icon" /> Recently Played
          </h2>
          {recent.length ? (
            <ul className="recent-list">
              {recent.map((game) => (
                <li key={game.id}>
                  {game.title} <span>{stats.perGame[game.id]?.plays ?? 0} plays</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Start a match to populate your recent history.</p>
          )}
        </article>
        <article className="daily-quests-card">
          <h2>
            <Icon name="trophy" className="inline-icon" /> Daily Quests
          </h2>
          <ul className="quest-list">
            {stats.dailyQuests.quests.map((quest) => (
              <li key={quest.id} className={`quest-row ${quest.completed ? 'complete' : ''}`}>
                <div>
                  <strong>{quest.name}</strong>
                  <span>{quest.description}</span>
                </div>
                <span>
                  {Math.min(quest.progress, quest.target)}/{quest.target} · +{quest.rewardTickets}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/shop" className="cta-link">
            Spend Coins
          </Link>
        </article>
        <article className="daily-reward-card">
          <h2>
            <Icon name="trophy" className="inline-icon" /> Daily Reward
          </h2>
          <p>Claim today’s drop and keep your streak alive.</p>
          <div className="daily-reward-row">
            <span>Next reward: +{nextRewardAmount} coins</span>
            <button disabled={!canClaim} onClick={claimReward}>
              {canClaim ? 'Claim' : 'Claimed'}
            </button>
          </div>
          {rewardMessage ? <p className="reward-toast">{rewardMessage}</p> : null}
        </article>
      </section>

      <section className="game-grid" aria-label="Games">
        {(ready ? GAME_REGISTRY : GAME_REGISTRY.slice(0, 8)).map((game) =>
          ready ? (
            <article key={game.id} className="game-tile">
              <div className="game-tile-top">
                <Icon name={game.icon} className="game-icon" label={`${game.title} icon`} />
                <span className="badge">{game.status === 'live' ? 'Live' : 'Coming Soon'}</span>
              </div>
              <strong>{game.title}</strong>
              <p>{game.description}</p>
              <div className="tile-actions">
                <button onClick={() => navigate(game.route)}>
                  <Icon name="play" className="inline-icon" /> Play
                </button>
                <button className="ghost" onClick={() => onOpenHowToPlay(game.id)}>
                  <Icon name="info" className="inline-icon" /> How to Play
                </button>
              </div>
            </article>
          ) : (
            <article key={game.id} className="game-tile skeleton" aria-hidden="true">
              <div className="skeleton-line short" />
              <div className="skeleton-line long" />
              <div className="skeleton-line medium" />
            </article>
          )
        )}
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
