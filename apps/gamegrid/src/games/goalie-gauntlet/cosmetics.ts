import rawCosmetics from '../../content/goalie-gauntlet-cosmetics.json';

export type CosmeticType = 'mask' | 'pads' | 'glove' | 'stick_tape' | 'goal_horn' | 'ice_trail' | 'crowd_chant';

export interface CosmeticItem {
  id: string;
  type: CosmeticType;
  name: string;
  price: number;
  unlockRule: 'default' | 'store' | 'level' | 'achievement';
  preview: {
    primaryColor?: string;
    label?: string;
  };
}

export interface CosmeticCatalog {
  items: CosmeticItem[];
}

export interface CosmeticProfile {
  coins: number;
  unlockedCosmetics: string[];
  equippedCosmetics: Record<CosmeticType, string>;
}

const TYPES: CosmeticType[] = ['mask', 'pads', 'glove', 'stick_tape', 'goal_horn', 'ice_trail', 'crowd_chant'];

function isType(value: unknown): value is CosmeticType {
  return typeof value === 'string' && TYPES.includes(value as CosmeticType);
}

function isRule(value: unknown): value is CosmeticItem['unlockRule'] {
  return value === 'default' || value === 'store' || value === 'level' || value === 'achievement';
}

function isItem(value: unknown): value is CosmeticItem {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    rec.id.length > 0 &&
    isType(rec.type) &&
    typeof rec.name === 'string' &&
    rec.name.length > 0 &&
    typeof rec.price === 'number' &&
    rec.price >= 0 &&
    isRule(rec.unlockRule) &&
    !!rec.preview &&
    typeof rec.preview === 'object'
  );
}

export function loadCosmeticsCatalog(): CosmeticCatalog {
  const parsed = rawCosmetics as unknown;
  if (!Array.isArray(parsed)) throw new Error('goalie-gauntlet-cosmetics.json must export array');
  const items = parsed.filter(isItem);
  if (items.length < 30) throw new Error(`goalie-gauntlet-cosmetics.json requires at least 30 cosmetics, found ${items.length}`);
  for (let i = 0; i < TYPES.length; i += 1) {
    const type = TYPES[i];
    if (!items.some((entry) => entry.type === type)) {
      throw new Error(`cosmetic category missing entries: ${type}`);
    }
  }
  return { items };
}

export function defaultCosmeticProfile(catalog: CosmeticCatalog): CosmeticProfile {
  const unlocked = catalog.items.filter((item) => item.unlockRule === 'default').map((item) => item.id);
  const equipped: Record<CosmeticType, string> = {
    mask: '',
    pads: '',
    glove: '',
    stick_tape: '',
    goal_horn: '',
    ice_trail: '',
    crowd_chant: ''
  };

  for (let i = 0; i < TYPES.length; i += 1) {
    const type = TYPES[i];
    const pick = catalog.items.find((item) => item.type === type && unlocked.includes(item.id));
    if (pick) equipped[type] = pick.id;
  }

  return {
    coins: 0,
    unlockedCosmetics: unlocked,
    equippedCosmetics: equipped
  };
}

export function buyCosmetic<T extends CosmeticProfile>(profile: T, catalog: CosmeticCatalog, cosmeticId: string): T {
  const item = catalog.items.find((entry) => entry.id === cosmeticId);
  if (!item) return profile;
  if (profile.unlockedCosmetics.includes(cosmeticId)) return profile;
  if (profile.coins < item.price) return profile;
  return {
    ...profile,
    coins: profile.coins - item.price,
    unlockedCosmetics: [...profile.unlockedCosmetics, cosmeticId]
  } as T;
}

export function equipCosmetic<T extends CosmeticProfile>(profile: T, catalog: CosmeticCatalog, cosmeticId: string): T {
  const item = catalog.items.find((entry) => entry.id === cosmeticId);
  if (!item) return profile;
  if (!profile.unlockedCosmetics.includes(cosmeticId)) return profile;
  return {
    ...profile,
    equippedCosmetics: {
      ...profile.equippedCosmetics,
      [item.type]: cosmeticId
    }
  } as T;
}

export function cosmeticPreviewColor(catalog: CosmeticCatalog, equippedId: string, fallback: string): string {
  const item = catalog.items.find((entry) => entry.id === equippedId);
  return item?.preview.primaryColor ?? fallback;
}
