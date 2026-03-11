import Phaser from 'phaser';
import cardsManifest from '../../../assets/cards/manifest.json';
import { cardToString, type Card } from '../engine/cards';
import type { CardFaceStyle } from '../theme/themeManager';

const PNG_1X = import.meta.glob('../../../assets/cards/png/1x/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

const PNG_2X = import.meta.glob('../../../assets/cards/png/2x/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

const SVG = import.meta.glob('../../../assets/cards/svg/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

const BACK_SVG = import.meta.glob('../../../assets/cards/svg/backs/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

export type RenderCardSize = 'small' | 'medium' | 'large';

interface RenderCardOptions {
  x: number;
  y: number;
  size: RenderCardSize;
  card: Card | null;
  faceUp: boolean;
  cardBackId: string;
  cardFaceStyle: CardFaceStyle;
  highContrast: boolean;
}

interface ManifestCard {
  id: string;
  svg: string;
  png1x: string;
  png2x: string;
}

interface ManifestBack {
  id: string;
  svg: string;
  png1x: string;
  png2x: string;
}

const manifestCards = (cardsManifest.cards as ManifestCard[]).filter((entry) => entry.id.length <= 3);
const manifestBacks = cardsManifest.backs as ManifestBack[];

const sizeMap: Record<RenderCardSize, { width: number; height: number }> = {
  small: { width: 64, height: 90 },
  medium: { width: 84, height: 117 },
  large: { width: 112, height: 156 }
};

function byBasename(entries: Record<string, string>, file: string): string | null {
  const needle = `/${file}`;
  for (const [key, value] of Object.entries(entries)) {
    if (key.endsWith(needle)) return value;
  }
  return null;
}

function cardAssetUrls(cardId: string): { png1x: string | null; png2x: string | null; svg: string | null } {
  return {
    png1x: byBasename(PNG_1X, `${cardId}.png`),
    png2x: byBasename(PNG_2X, `${cardId}.png`),
    svg: byBasename(SVG, `${cardId}.svg`)
  };
}

function backAssetUrls(backId: string): { png1x: string | null; png2x: string | null; svg: string | null } {
  return {
    png1x: byBasename(PNG_1X, `${backId}.png`),
    png2x: byBasename(PNG_2X, `${backId}.png`),
    svg: byBasename(BACK_SVG, `${backId}.svg`)
  };
}

function isRedSuit(cardId: string): boolean {
  return cardId.endsWith('H') || cardId.endsWith('D');
}

export class CardRenderer {
  static preload(scene: Phaser.Scene, cardBackId: string): void {
    for (let i = 0; i < manifestCards.length; i += 1) {
      const card = manifestCards[i];
      const urls = cardAssetUrls(card.id);
      if (urls.png1x && !scene.textures.exists(`ct-png-${card.id}`)) {
        scene.load.image(`ct-png-${card.id}`, urls.png1x);
      }
      if (urls.svg && !scene.textures.exists(`ct-svg-${card.id}`)) {
        scene.load.svg(`ct-svg-${card.id}`, urls.svg);
      }
    }

    for (let i = 0; i < manifestBacks.length; i += 1) {
      const back = manifestBacks[i];
      const urls = backAssetUrls(back.id);
      if (urls.png1x && !scene.textures.exists(`ct-png-${back.id}`)) {
        scene.load.image(`ct-png-${back.id}`, urls.png1x);
      }
      if (urls.svg && !scene.textures.exists(`ct-svg-${back.id}`)) {
        scene.load.svg(`ct-svg-${back.id}`, urls.svg);
      }
    }

    const chosenBack = backAssetUrls(cardBackId);
    if (chosenBack.png2x && !scene.textures.exists(`ct-png2x-${cardBackId}`)) {
      scene.load.image(`ct-png2x-${cardBackId}`, chosenBack.png2x);
    }
  }

  static render(scene: Phaser.Scene, options: RenderCardOptions): Phaser.GameObjects.GameObject {
    const size = sizeMap[options.size];
    const cardId = options.card ? cardToString(options.card) : options.cardBackId;
    const faceUp = options.faceUp && options.card !== null;

    const pngKey = `ct-png-${cardId}`;
    const svgKey = `ct-svg-${cardId}`;
    const fallbackPngKey = `ct-png-${options.cardBackId}`;
    const fallbackSvgKey = `ct-svg-${options.cardBackId}`;

    const preferSvg = options.cardFaceStyle === 'svg' || options.size === 'large';
    const preferPng = options.cardFaceStyle === 'png' || options.cardFaceStyle === 'auto';

    const chosenKeys = preferSvg
      ? [svgKey, pngKey, fallbackSvgKey, fallbackPngKey]
      : preferPng
        ? [pngKey, svgKey, fallbackPngKey, fallbackSvgKey]
        : [pngKey, svgKey, fallbackPngKey, fallbackSvgKey];

    let textureKey: string | null = null;
    for (let i = 0; i < chosenKeys.length; i += 1) {
      if (scene.textures.exists(chosenKeys[i])) {
        textureKey = chosenKeys[i];
        break;
      }
    }

    if (textureKey) {
      const image = scene.add.image(options.x, options.y, textureKey).setDisplaySize(size.width, size.height).setOrigin(0.5);
      if (options.highContrast && faceUp && options.card) {
        image.setTint(isRedSuit(cardId) ? 0xff1f46 : 0x000000);
      }
      return image;
    }

    const bg = scene.add.rectangle(options.x, options.y, size.width, size.height, 0xffffff).setStrokeStyle(2, 0xcbd5e1);
    const label = scene.add
      .text(options.x, options.y, faceUp && options.card ? cardId : 'CARD', {
        fontFamily: 'Verdana',
        fontSize: `${options.size === 'small' ? 14 : options.size === 'medium' ? 18 : 24}px`,
        color: faceUp && options.card && isRedSuit(cardId) ? (options.highContrast ? '#ff1f46' : '#b91c1c') : '#0f172a'
      })
      .setOrigin(0.5);
    return scene.add.container(0, 0, [bg, label]);
  }
}
