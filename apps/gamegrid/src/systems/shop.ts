import type { PortalStats } from '../types';

export type ShopItemType = 'room_skin' | 'emote' | 'badge' | 'table_skin';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ShopItemType;
  price: number;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'room-neon',
    name: 'Neon Arcade Room',
    description: 'Loud neon glow, night shift energy.',
    type: 'room_skin',
    price: 420
  },
  {
    id: 'room-rustic',
    name: 'Rustic Sports Bar',
    description: 'Warm wood panels and classic pennants.',
    type: 'room_skin',
    price: 360
  },
  {
    id: 'table-carbon',
    name: 'Carbon Table Skin',
    description: 'Matte black surface with carbon weave.',
    type: 'table_skin',
    price: 260
  },
  {
    id: 'table-sunset',
    name: 'Sunset Table Skin',
    description: 'Gradient felt with stadium sunset glow.',
    type: 'table_skin',
    price: 240
  },
  {
    id: 'emote-airhorn',
    name: 'Airhorn Emote',
    description: 'Let the room hear it.',
    type: 'emote',
    price: 180
  },
  {
    id: 'emote-spark',
    name: 'Spark Emote',
    description: 'Flashy win vibe.',
    type: 'emote',
    price: 160
  },
  {
    id: 'badge-mvp',
    name: 'MVP Badge',
    description: 'Show the bar who runs the bracket.',
    type: 'badge',
    price: 200
  },
  {
    id: 'badge-regular',
    name: 'House Regular Badge',
    description: 'You have a tab and a seat.',
    type: 'badge',
    price: 190
  }
];

export function purchaseShopItem(
  stats: PortalStats,
  itemId: string
): { next: PortalStats; error?: string } {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return { next: stats, error: 'Item not found.' };
  if (stats.inventory.owned.includes(itemId)) return { next: stats, error: 'Already owned.' };
  if (stats.currency.tickets < item.price) return { next: stats, error: 'Not enough tickets.' };

  const next = {
    ...stats,
    currency: {
      ...stats.currency,
      tickets: stats.currency.tickets - item.price
    },
    inventory: {
      ...stats.inventory,
      owned: [...stats.inventory.owned, itemId]
    }
  };
  return { next };
}

export function equipShopItem(stats: PortalStats, itemId: string): { next: PortalStats; error?: string } {
  if (!stats.inventory.owned.includes(itemId)) return { next: stats, error: 'Purchase first.' };
  return {
    next: {
      ...stats,
      inventory: {
        ...stats.inventory,
        equipped: itemId
      }
    }
  };
}

export function resolveEquippedLabel(stats: PortalStats): string {
  const item = SHOP_ITEMS.find((entry) => entry.id === stats.inventory.equipped);
  return item?.name ?? 'Classic Green Felt';
}
