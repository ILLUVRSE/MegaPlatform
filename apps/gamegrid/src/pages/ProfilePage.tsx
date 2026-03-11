import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { GAME_REGISTRY } from '../registry/games';
import { persistence } from '../systems/persistence';
import { levelProgressFromXp, PROGRESS_TITLES } from '../systems/progression';
import { ensureDailyQuests } from '../systems/dailyQuests';
import { resolveEquippedLabel } from '../systems/shop';
import { trackTelemetry } from '../systems/telemetry';
import { ensureRankSeason, formatTierLabel } from '../systems/ranks';
import { battlePassProgress, ensureBattlePassSeason, getBattlePassRewards } from '../systems/battlePass';
import { ensureDailyReward } from '../systems/dailyRewards';

export function ProfilePage() {
  const { stats, refreshed } = useMemo(() => {
    const loaded = persistence.loadStats();
    const withQuests = ensureDailyQuests(loaded).next;
    const withRanks = ensureRankSeason(withQuests);
    const withPass = ensureBattlePassSeason(withRanks);
    const withRewards = ensureDailyReward(withPass);
    return { stats: withRewards, refreshed: true };
  }, []);
  useEffect(() => {
    if (refreshed) persistence.saveStats(stats);
  }, [refreshed, stats]);

  useEffect(() => {
    trackTelemetry({ type: 'page_view', page: 'profile' });
  }, []);
  const activeTitleId = stats.unlockedTitles[stats.unlockedTitles.length - 1];
  const activeTitle = PROGRESS_TITLES.find((title) => title.id === activeTitleId);
  const levelProgress = levelProgressFromXp(stats.xp);
  const progressPct = Math.max(0, Math.min(100, Math.round((levelProgress.inLevelXp / levelProgress.nextLevelXp) * 100)));
  const equippedLabel = resolveEquippedLabel(stats);
  const battlePass = battlePassProgress(stats.battlePass);
  const rewards = getBattlePassRewards().slice(0, 6);

  return (
    <main className="profile-page">
      <header className="hero premium-hero">
        <h1>
          <Icon name="trophy" className="inline-icon" /> Profile
        </h1>
        <p>Global progression and per-game performance across the full GameGrid lineup.</p>
        <Link to="/">Back to Lobby</Link>
      </header>
      <section className="profile-summary" aria-label="Overall progression">
        <article className="summary-card">
          <strong>Level {stats.level}</strong>
          <span>{stats.xp} XP total</span>
          <span>{progressPct}% to next level</span>
        </article>
        <article className="summary-card">
          <strong>{stats.totalPlays}</strong>
          <span>Matches completed</span>
          <span>{stats.totalWins} wins logged</span>
        </article>
        <article className="summary-card">
          <strong>{stats.dailyStreak} day streak</strong>
          <span>Longest streak: {stats.longestStreak}</span>
          <span>Last played: {stats.lastPlayedOn ?? 'Never'}</span>
        </article>
        <article className="summary-card">
          <strong>{activeTitle?.name ?? 'No title yet'}</strong>
          <span>{activeTitle?.description ?? 'Complete matches to unlock profile titles.'}</span>
          <span>{stats.unlockedTitles.length} titles unlocked</span>
        </article>
        <article className="summary-card">
          <strong>{stats.currency.tickets} coins</strong>
          <span>GridTokens: {stats.currency.tokens}</span>
          <span>Theme: {equippedLabel}</span>
        </article>
        <article className="summary-card">
          <strong>Grid Rating {stats.rank.meta.rating}</strong>
          <span>Tier: {formatTierLabel(stats.rank.meta.tier)}</span>
          <span>Season: {stats.rank.seasonId || 'Preseason'}</span>
        </article>
        <article className="summary-card">
          <strong>Battle Pass Tier {battlePass.currentTier}</strong>
          <span>{battlePass.pct}% to next tier</span>
          <span>{stats.battlePass.premiumUnlocked ? 'Premium active' : 'Free track'}</span>
        </article>
      </section>
      <section className="battle-pass-panel" aria-label="Battle pass rewards">
        <h2>Battle Pass Rewards Preview</h2>
        <div className="battle-pass-grid">
          {rewards.map((reward) => (
            <div key={reward.tier} className="battle-pass-card">
              <strong>Tier {reward.tier}</strong>
              <span>{reward.label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="daily-quests-panel" aria-label="Daily quests">
        <h2>Daily Quests</h2>
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
      </section>
      <p>Last Played Game: {stats.lastPlayed ?? 'None yet'}</p>
      <section className="stats-list" aria-label="Game stats">
        {GAME_REGISTRY.map((game) => {
          const row = stats.perGame[game.id];
          return (
            <article key={game.id} className="stat-row">
              <strong>
                <Icon name={game.icon} className="inline-icon" /> {game.title}
              </strong>
              <span>Plays: {row?.plays ?? 0}</span>
              <span>Best: {row?.bestScore ?? 0}</span>
              <span>Last: {row?.lastScore ?? 0}</span>
              <span>Wins: {row?.wins ?? 0}</span>
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
