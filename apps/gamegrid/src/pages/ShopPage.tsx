import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { persistence } from '../systems/persistence';
import { equipShopItem, purchaseShopItem, resolveEquippedLabel, SHOP_ITEMS } from '../systems/shop';
import { ensureDailyQuests } from '../systems/dailyQuests';
import { trackTelemetry } from '../systems/telemetry';

export function ShopPage() {
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const { stats, refreshed } = useMemo(() => {
    const loaded = persistence.loadStats();
    const { next, refreshed } = ensureDailyQuests(loaded);
    return { stats: next, refreshed };
  }, [version]);

  useEffect(() => {
    if (refreshed) persistence.saveStats(stats);
  }, [refreshed, stats]);

  useEffect(() => {
    trackTelemetry({ type: 'page_view', page: 'shop' });
  }, []);

  const equippedLabel = resolveEquippedLabel(stats);

  const onPurchase = (itemId: string) => {
    const { next, error: purchaseError } = purchaseShopItem(stats, itemId);
    if (purchaseError) {
      setError(purchaseError);
      return;
    }
    persistence.saveStats(next);
    setError(null);
    setVersion((value) => value + 1);
  };

  const onEquip = (itemId: string) => {
    const { next, error: equipError } = equipShopItem(stats, itemId);
    if (equipError) {
      setError(equipError);
      return;
    }
    persistence.saveStats(next);
    setError(null);
    setVersion((value) => value + 1);
  };

  return (
    <main className="shop-page">
      <header className="hero premium-hero">
        <h1>
          <Icon name="trophy" className="inline-icon" /> GameGrid Shop
        </h1>
        <p>Spend coins on bar themes, table skins, and emotes. No real money. Rewards come from play.</p>
        <div className="hero-metrics">
          <span>Coins: {stats.currency.tickets}</span>
          <span>Equipped: {equippedLabel}</span>
        </div>
        <Link to="/">Back to Lobby</Link>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="shop-grid" aria-label="Shop inventory">
        {SHOP_ITEMS.map((item) => {
          const owned = stats.inventory.owned.includes(item.id);
          const equipped = stats.inventory.equipped === item.id;
          return (
            <article key={item.id} className="shop-card">
              <div className="shop-card-header">
                <strong>{item.name}</strong>
                <span className="chip">{item.type.replace('_', ' ')}</span>
              </div>
              <p>{item.description}</p>
              <div className="shop-card-footer">
                <span>{item.price} coins</span>
                {owned ? (
                  <button className="ghost" onClick={() => onEquip(item.id)}>
                    {equipped ? 'Equipped' : 'Equip'}
                  </button>
                ) : (
                  <button onClick={() => onPurchase(item.id)}>Buy</button>
                )}
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
