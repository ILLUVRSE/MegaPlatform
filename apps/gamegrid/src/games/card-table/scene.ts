import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { triggerHaptic } from '../../systems/gameplayComfort';
import { applyRoundOutcome, loadCardTableProfile, saveCardTableProfile, type CardTableModeId, type CardTableProfile } from './engine/state';
import { cardToString, type Card } from './engine/cards';
import { createDeck, deal, shuffleDeck } from './engine/deck';
import {
  createBlackjackRound,
  playerDouble,
  playerHit,
  settleBlackjack
} from './modes/blackjack/rules';
import { resolveHigherLowerGuess, resolveHigherLowerPayout } from './modes/higher-lower/rules';
import { chooseThirtyOneAiMove } from './modes/thirtyone/ai';
import { advanceTurn, bestThirtyOneScore, createThirtyOneState, determineThirtyOneWinner, isThirtyOneRoundOver, knock, swapCard } from './modes/thirtyone/rules';
import { canMoveTableauStack, canMoveToFoundation, canPlaceOnTableau, createSolitaireState, drawFromStock, revealTopIfNeeded } from './modes/solitaire/rules';
import type { SolitaireState, TableauCard } from './modes/solitaire/types';
import { chooseForeheadAiBet } from './modes/forehead-poker/ai';
import { settleForeheadRound } from './modes/forehead-poker/rules';
import { chooseDrawDiscards } from './modes/five-card-draw/ai';
import { createFiveCardDrawRound, replaceDiscards, settleFiveCardDraw } from './modes/five-card-draw/rules';
import { chooseHoldemAiAction, type HoldemAiPersonality } from './modes/holdem/ai';
import { resolveHoldemShowdown } from './modes/holdem/rules';
import { BLACKJACK_RULES } from './modes/blackjack/ui';
import { HIGHER_LOWER_RULES } from './modes/higher-lower/ui';
import { THIRTYONE_RULES } from './modes/thirtyone/ui';
import { SOLITAIRE_RULES } from './modes/solitaire/ui';
import { FOREHEAD_RULES } from './modes/forehead-poker/ui';
import { FIVE_CARD_DRAW_RULES } from './modes/five-card-draw/ui';
import { HOLDEM_RULES } from './modes/holdem/ui';
import { CardRenderer } from './ui/CardRenderer';
import { createModal, createTextButton } from './ui/widgets';
import { applyThemeCssVariables, normalizeCardTableAppearance } from './theme/themeManager';
import { CARD_TABLE_THEMES, getCardTableTheme } from './theme/themes';

interface CardTableSceneConfig {
  hooks: GameRuntimeHooks;
}

interface ActionButton {
  label: string;
  onClick: () => void;
}

interface BlackjackModeState {
  wager: number;
  round: ReturnType<typeof createBlackjackRound>;
  result: ReturnType<typeof settleBlackjack> | null;
}

interface HigherLowerModeState {
  wager: number;
  deck: Card[];
  current: Card;
  streak: number;
  active: boolean;
}

interface ThirtyOneModeState {
  wager: number;
  state: ReturnType<typeof createThirtyOneState>;
  pendingDraw: Card | null;
  resultText: string | null;
}

interface SolitaireModeState {
  state: SolitaireState;
  selectedSource: { type: 'waste' } | { type: 'tableau'; index: number } | null;
  resultText: string | null;
}

interface ForeheadModeState {
  wager: number;
  playerHidden: Card;
  aiHidden: Card;
  aiBet: number;
  revealed: boolean;
  resultText: string | null;
}

interface FiveCardDrawModeState {
  wager: number;
  ante: number;
  player: Card[];
  ai: Card[];
  deck: Card[];
  selectedDiscards: Set<number>;
  resultText: string | null;
}

interface HoldemSeat {
  id: string;
  stack: number;
  committed: number;
  folded: boolean;
  personality: HoldemAiPersonality | 'player';
  cards: [Card, Card];
}

interface HoldemModeState {
  handSeed: number;
  seats: HoldemSeat[];
  board: Card[];
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  currentBet: number;
  handLog: string[];
  resultText: string | null;
  lastHandReplay: string | null;
}

type ModeState =
  | { mode: 'blackjack'; data: BlackjackModeState }
  | { mode: 'higher-lower'; data: HigherLowerModeState }
  | { mode: 'thirtyone'; data: ThirtyOneModeState }
  | { mode: 'solitaire'; data: SolitaireModeState }
  | { mode: 'forehead-poker'; data: ForeheadModeState }
  | { mode: 'five-card-draw'; data: FiveCardDrawModeState }
  | { mode: 'holdem'; data: HoldemModeState };

const MODE_ORDER: readonly CardTableModeId[] = [
  'blackjack',
  'higher-lower',
  'thirtyone',
  'solitaire',
  'forehead-poker',
  'five-card-draw',
  'holdem'
] as const;

const MODE_LABEL: Record<CardTableModeId, string> = {
  blackjack: 'Blackjack',
  'higher-lower': 'Higher or Lower',
  thirtyone: '31',
  solitaire: 'Solitaire (Klondike)',
  'forehead-poker': 'Forehead Poker',
  'five-card-draw': '5 Card Draw',
  holdem: "Texas Hold'em"
};

const MODE_DESC: Record<CardTableModeId, string> = {
  blackjack: 'Beat the dealer with S17 + 3:2 blackjack payout.',
  'higher-lower': 'Predict the next card and build streak multipliers.',
  thirtyone: 'Build the best single-suit total toward 31.',
  solitaire: 'Classic Klondike with draw-1 or draw-3 settings.',
  'forehead-poker': 'You see opponent card; they see yours.',
  'five-card-draw': 'One draw phase then showdown.',
  holdem: 'Cash table hand with blinds, streets, and side pots.'
};

const MODE_RULES: Record<CardTableModeId, string> = {
  blackjack: BLACKJACK_RULES,
  'higher-lower': HIGHER_LOWER_RULES,
  thirtyone: THIRTYONE_RULES,
  solitaire: SOLITAIRE_RULES,
  'forehead-poker': FOREHEAD_RULES,
  'five-card-draw': FIVE_CARD_DRAW_RULES,
  holdem: HOLDEM_RULES
};

const POKER_MODES = new Set<CardTableModeId>(['holdem', 'five-card-draw', 'forehead-poker']);


function clampBet(value: number, bankroll: number): number {
  const capped = Math.min(Math.max(5, value), Math.max(5, bankroll));
  return Math.floor(capped / 5) * 5;
}

function hexToInt(color: string, fallback: number): number {
  const raw = color.trim().replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map((c) => `${c}${c}`).join('') : raw;
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function summarizeCards(cards: readonly Card[]): string {
  return cards.map(cardToString).join(' ');
}

export class CardTableScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private profile: CardTableProfile = loadCardTableProfile();
  private activeMode: ModeState | null = null;
  private ui: Phaser.GameObjects.GameObject[] = [];
  private modal: Phaser.GameObjects.Container | null = null;
  private confirmBack = false;
  private message = 'Choose a card mode.';
  private streakByMode: Partial<Record<CardTableModeId, number>> = {};
  private cardAssetsReady = false;

  constructor(config: CardTableSceneConfig) {
    super('card-table-main');
    this.hooks = config.hooks;
  }

  create(): void {
    this.input.setTopOnly(true);
    this.applyCurrentTheme();
    const appearance = normalizeCardTableAppearance({
      themeId: this.profile.settings.appearanceTheme,
      cardFaceStyle: this.profile.settings.cardFaceStyle,
      cardBackId: this.profile.settings.cardBackId,
      highContrastCards: this.profile.settings.highContrastCards
    });
    CardRenderer.preload(this, appearance.cardBackId);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.cardAssetsReady = true;
      this.renderScreen();
    });
    this.load.start();
    this.renderScreen();
  }

  private clearUi(): void {
    for (let i = 0; i < this.ui.length; i += 1) {
      this.ui[i].destroy();
    }
    this.ui = [];
    this.modal?.destroy();
    this.modal = null;
  }

  private appearance() {
    return normalizeCardTableAppearance({
      themeId: this.profile.settings.appearanceTheme,
      cardFaceStyle: this.profile.settings.cardFaceStyle,
      cardBackId: this.profile.settings.cardBackId,
      highContrastCards: this.profile.settings.highContrastCards
    });
  }

  private applyCurrentTheme(): void {
    const canvas = this.game.canvas;
    const host = canvas?.parentElement;
    if (!host) return;
    const appearance = this.appearance();
    const theme = getCardTableTheme(appearance.themeId);
    applyThemeCssVariables(host, theme);
  }

  private renderScreen(): void {
    this.clearUi();
    this.applyCurrentTheme();
    const appearance = this.appearance();
    const theme = getCardTableTheme(appearance.themeId);

    const bg = this.add.rectangle(640, 360, 1280, 720, hexToInt(theme.panel, 0x0f1726));
    this.ui.push(bg);
    const halo = this.add.ellipse(640, 300, 1300, 780, hexToInt(theme.accent, 0x1f6aa5), 0.08);
    this.ui.push(halo);

    const title = this.add
      .text(640, 42, 'Card Table', { fontFamily: 'Verdana', fontSize: '42px', color: theme.text })
      .setOrigin(0.5);
    this.ui.push(title);

    const bankroll = this.add
      .text(40, 88, `Bankroll: ${this.profile.bankroll}`, { fontFamily: 'Verdana', fontSize: '24px', color: theme.muted })
      .setOrigin(0, 0);
    this.ui.push(bankroll);

    const settings = createTextButton(this, 1120, 92, 'Settings & Appearance', () => {
      this.openSettingsModal();
    }, { width: 290, height: 44, fill: hexToInt(theme.accent, 0x274060) });
    this.ui.push(settings);

    const message = this.add
      .text(640, 128, this.message, { fontFamily: 'Verdana', fontSize: '20px', color: theme.text })
      .setOrigin(0.5);
    this.ui.push(message);

    if (!this.cardAssetsReady) {
      const loading = this.add
        .text(640, 164, 'Loading card assets...', { fontFamily: 'Verdana', fontSize: '18px', color: theme.muted })
        .setOrigin(0.5);
      this.ui.push(loading);
    }

    if (!this.activeMode) {
      this.renderModeSelect();
      return;
    }

    this.renderActiveMode();
  }

  private renderModeSelect(): void {
    const disclaimer = this.add
      .text(640, 170, 'No real money. Soft currency only. For entertainment.', {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#fca5a5'
      })
      .setOrigin(0.5);
    this.ui.push(disclaimer);

    const cols = 2;
    for (let i = 0; i < MODE_ORDER.length; i += 1) {
      const mode = MODE_ORDER[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 340 + col * 600;
      const y = 240 + row * 105;
      const tile = createTextButton(this, x, y, `${MODE_LABEL[mode]}\n${MODE_DESC[mode]}`, () => this.startMode(mode), {
        width: 520,
        height: 86,
        fill: 0x1d3557
      });
      this.ui.push(tile);
    }
  }

  private renderActiveMode(): void {
    if (!this.activeMode) return;

    const header = this.add
      .text(640, 178, MODE_LABEL[this.activeMode.mode], { fontFamily: 'Verdana', fontSize: '34px', color: '#ffffff' })
      .setOrigin(0.5);
    this.ui.push(header);

    if (POKER_MODES.has(this.activeMode.mode)) {
      const disclaimer = this.add
        .text(640, 212, 'No real money. Soft currency only. For entertainment.', {
          fontFamily: 'Verdana',
          fontSize: '18px',
          color: '#fca5a5'
        })
        .setOrigin(0.5);
      this.ui.push(disclaimer);
    }

    const back = createTextButton(this, 120, 44, 'Back', () => {
      if (this.confirmBack || this.modeRoundActive()) {
        this.askBackConfirm();
      } else {
        this.activeMode = null;
        this.message = 'Choose a card mode.';
        this.renderScreen();
      }
    }, { width: 140, height: 42, fill: 0x374151 });
    this.ui.push(back);

    const rules = createTextButton(this, 300, 44, 'How to Play', () => {
      if (!this.activeMode) return;
      this.openModal(MODE_LABEL[this.activeMode.mode], MODE_RULES[this.activeMode.mode]);
    }, { width: 210, height: 42, fill: 0x1f6aa5 });
    this.ui.push(rules);

    switch (this.activeMode.mode) {
      case 'blackjack':
        this.renderBlackjack();
        break;
      case 'higher-lower':
        this.renderHigherLower();
        break;
      case 'thirtyone':
        this.renderThirtyOne();
        break;
      case 'solitaire':
        this.renderSolitaire();
        break;
      case 'forehead-poker':
        this.renderForehead();
        break;
      case 'five-card-draw':
        this.renderFiveCardDraw();
        break;
      case 'holdem':
        this.renderHoldem();
        break;
    }
  }

  private openModal(title: string, body: string, onCloseAction?: () => void): void {
    this.modal?.destroy();
    this.modal = createModal(this, title, body, () => {
      onCloseAction?.();
      this.modal?.destroy();
      this.modal = null;
    });
  }

  private cycleTheme(direction: 1 | -1): void {
    const current = this.profile.settings.appearanceTheme;
    const ids = CARD_TABLE_THEMES.map((theme) => theme.id);
    const index = ids.indexOf(current);
    const next = ids[(index + direction + ids.length) % ids.length];
    this.profile.settings.appearanceTheme = next;
    const theme = getCardTableTheme(next);
    this.profile.settings.cardBackId = theme.cardBackId as 'back-classic' | 'back-midnight' | 'back-crimson';
  }

  private openSettingsModal(): void {
    this.modal?.destroy();
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.68).setInteractive();
    const panel = this.add.rectangle(640, 360, 1040, 600, 0x0f1a2b).setStrokeStyle(2, 0xffffff, 0.25);
    const title = this.add.text(640, 116, 'Card Table Settings', { fontFamily: 'Verdana', fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
    const subtitle = this.add
      .text(640, 152, 'Appearance only. No gameplay effects.', { fontFamily: 'Verdana', fontSize: '18px', color: '#bfdbfe' })
      .setOrigin(0.5);

    const makeOptionRow = (label: string, value: () => string, onChange: (dir: 1 | -1) => void, y: number) => {
      const labelText = this.add.text(180, y, label, { fontFamily: 'Verdana', fontSize: '22px', color: '#e2e8f0' }).setOrigin(0, 0.5);
      const valueText = this.add.text(640, y, value(), { fontFamily: 'Verdana', fontSize: '22px', color: '#f8fafc' }).setOrigin(0.5);
      const prev = createTextButton(this, 500, y, 'Prev', () => { onChange(-1); this.openSettingsModal(); }, { width: 110, height: 40, fill: 0x1e3a8a });
      const next = createTextButton(this, 780, y, 'Next', () => { onChange(1); this.openSettingsModal(); }, { width: 110, height: 40, fill: 0x1e3a8a });
      return [labelText, valueText, prev, next] as Phaser.GameObjects.GameObject[];
    };

    const rows: Phaser.GameObjects.GameObject[] = [];
    rows.push(
      ...makeOptionRow(
        'Theme',
        () => getCardTableTheme(this.profile.settings.appearanceTheme).name,
        (dir) => this.cycleTheme(dir),
        220
      )
    );
    rows.push(
      ...makeOptionRow(
        'Card Face Style',
        () => this.profile.settings.cardFaceStyle.toUpperCase(),
        () => {
          const order: Array<'auto' | 'png' | 'svg'> = ['auto', 'png', 'svg'];
          const idx = order.indexOf(this.profile.settings.cardFaceStyle);
          this.profile.settings.cardFaceStyle = order[(idx + 1) % order.length];
        },
        285
      )
    );
    rows.push(
      ...makeOptionRow(
        'Card Back',
        () => this.profile.settings.cardBackId,
        () => {
          const order: Array<'back-classic' | 'back-midnight' | 'back-crimson'> = ['back-classic', 'back-midnight', 'back-crimson'];
          const idx = order.indexOf(this.profile.settings.cardBackId);
          this.profile.settings.cardBackId = order[(idx + 1) % order.length];
        },
        350
      )
    );
    rows.push(
      ...makeOptionRow(
        'High Contrast Cards',
        () => (this.profile.settings.highContrastCards ? 'ON' : 'OFF'),
        () => {
          this.profile.settings.highContrastCards = !this.profile.settings.highContrastCards;
        },
        415
      )
    );
    rows.push(
      ...makeOptionRow(
        'Hints',
        () => (this.profile.settings.hints ? 'ON' : 'OFF'),
        () => {
          this.profile.settings.hints = !this.profile.settings.hints;
        },
        480
      )
    );

    const save = createTextButton(this, 500, 608, 'Apply', () => {
      const appearance = this.appearance();
      this.profile.settings.appearanceTheme = appearance.themeId;
      this.profile.settings.cardBackId = appearance.cardBackId as 'back-classic' | 'back-midnight' | 'back-crimson';
      this.profile.settings.cardFaceStyle = appearance.cardFaceStyle;
      this.profile.settings.highContrastCards = appearance.highContrastCards;
      saveCardTableProfile(this.profile);
      this.applyCurrentTheme();
      CardRenderer.preload(this, this.profile.settings.cardBackId);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.cardAssetsReady = true;
        this.renderScreen();
      });
      this.load.start();
      this.modal?.destroy();
      this.modal = null;
    }, { width: 180, height: 46, fill: 0x2563eb });

    const close = createTextButton(this, 770, 608, 'Close', () => {
      this.modal?.destroy();
      this.modal = null;
      this.renderScreen();
    }, { width: 180, height: 46, fill: 0x475569 });

    this.modal = this.add.container(0, 0, [overlay, panel, title, subtitle, ...rows, save, close]);
  }

  private drawCards(
    cards: readonly Card[],
    options: { x: number; y: number; faceUp?: boolean; size?: 'small' | 'medium' | 'large'; spacing?: number; backId?: string }
  ): void {
    const appearance = this.appearance();
    const faceUp = options.faceUp ?? true;
    const size = options.size ?? 'medium';
    const spacing = options.spacing ?? (size === 'small' ? 74 : size === 'medium' ? 96 : 128);
    for (let i = 0; i < cards.length; i += 1) {
      const item = CardRenderer.render(this, {
        x: options.x + i * spacing,
        y: options.y,
        card: cards[i],
        faceUp,
        size,
        cardBackId: options.backId ?? appearance.cardBackId,
        cardFaceStyle: appearance.cardFaceStyle,
        highContrast: appearance.highContrastCards
      });
      this.ui.push(item);
    }
  }

  private askBackConfirm(): void {
    this.confirmBack = true;
    this.openModal('Leave Mode?', 'A round is in progress. Return to Mode Select?', () => {
      this.confirmBack = false;
      this.activeMode = null;
      this.message = 'Choose a card mode.';
      this.renderScreen();
    });
  }

  private modeRoundActive(): boolean {
    if (!this.activeMode) return false;
    switch (this.activeMode.mode) {
      case 'blackjack':
        return this.activeMode.data.result === null;
      case 'higher-lower':
        return this.activeMode.data.active;
      case 'thirtyone':
        return this.activeMode.data.resultText === null;
      case 'solitaire':
        return this.activeMode.data.resultText === null;
      case 'forehead-poker':
        return !this.activeMode.data.revealed;
      case 'five-card-draw':
        return this.activeMode.data.resultText === null;
      case 'holdem':
        return this.activeMode.data.resultText === null;
      default:
        return false;
    }
  }

  private startMode(mode: CardTableModeId): void {
    const seed = Date.now();
    if (mode === 'blackjack') {
      this.activeMode = { mode, data: { wager: clampBet(25, this.profile.bankroll), round: createBlackjackRound(25, seed), result: null } };
    } else if (mode === 'higher-lower') {
      const deck = shuffleDeck(createDeck(), seed);
      this.activeMode = { mode, data: { wager: clampBet(20, this.profile.bankroll), deck, current: deck.shift() as Card, streak: 0, active: true } };
    } else if (mode === 'thirtyone') {
      const deck = shuffleDeck(createDeck(), seed);
      const players = [
        { id: 'player', hand: deal(deck, 3) },
        { id: 'ai', hand: deal(deck, 3) }
      ];
      this.activeMode = { mode, data: { wager: clampBet(25, this.profile.bankroll), state: createThirtyOneState(deck, players), pendingDraw: null, resultText: null } };
    } else if (mode === 'solitaire') {
      const deck = shuffleDeck(createDeck(), seed);
      const drawCount = this.profile.settings.solitaireDraw === 'draw3' ? 3 : 1;
      this.activeMode = { mode, data: { state: createSolitaireState(deck, drawCount), selectedSource: null, resultText: null } };
    } else if (mode === 'forehead-poker') {
      const deck = shuffleDeck(createDeck(), seed);
      const playerHidden = deck.shift() as Card;
      const aiHidden = deck.shift() as Card;
      const wager = clampBet(20, this.profile.bankroll);
      this.activeMode = {
        mode,
        data: { wager, playerHidden, aiHidden, aiBet: chooseForeheadAiBet(wager, playerHidden), revealed: false, resultText: null }
      };
    } else if (mode === 'five-card-draw') {
      const round = createFiveCardDrawRound(seed);
      this.activeMode = {
        mode,
        data: {
          wager: clampBet(25, this.profile.bankroll),
          ante: 5,
          player: round.player,
          ai: round.ai,
          deck: round.deck,
          selectedDiscards: new Set<number>(),
          resultText: null
        }
      };
    } else {
      this.activeMode = { mode, data: this.createHoldemMode(seed) };
    }

    CardRenderer.preload(this, this.profile.settings.cardBackId);
    if (!this.load.isLoading()) {
      this.load.start();
    }
    this.hooks.reportEvent({ type: 'game_start', gameId: 'card-table', mode, options: { bankroll: this.profile.bankroll } });
    triggerHaptic(8);
    this.message = `Mode started: ${MODE_LABEL[mode]}`;
    this.renderScreen();
  }

  private renderActionButtons(buttons: readonly ActionButton[], startY = 560): void {
    for (let i = 0; i < buttons.length; i += 1) {
      const x = 210 + i * 170;
      const button = createTextButton(this, x, startY, buttons[i].label, buttons[i].onClick, { width: 160, height: 48, fill: 0x334155 });
      this.ui.push(button);
    }
  }

  private addOutcome(mode: CardTableModeId, outcome: 'win' | 'loss' | 'push', payout: number, stats: object, requestAd: boolean): void {
    const nextStreak = outcome === 'win' ? (this.streakByMode[mode] ?? 0) + 1 : 0;
    this.streakByMode[mode] = nextStreak;
    this.profile = applyRoundOutcome(this.profile, mode, outcome, payout, nextStreak);
    saveCardTableProfile(this.profile);
    this.hooks.reportEvent({ type: 'game_end', gameId: 'card-table', mode, outcome, stats });
    if (requestAd) {
      void window.gamegridAds?.requestInterstitial({ reason: 'round_end', gameId: 'card-table' });
    }
  }

  private renderBlackjack(): void {
    if (!this.activeMode || this.activeMode.mode !== 'blackjack') return;
    const { data } = this.activeMode;

    const text = this.add
      .text(70, 250, `Wager: ${data.wager}\nPlayer: ${summarizeCards(data.round.player)}\nDealer: ${summarizeCards(data.round.dealer)}`, {
        fontFamily: 'Verdana',
        fontSize: '24px',
        color: '#f8fafc'
      })
      .setOrigin(0, 0);
    this.ui.push(text);
    this.drawCards(data.round.player, { x: 800, y: 300, size: 'medium', faceUp: true });
    this.drawCards(data.round.dealer, { x: 800, y: 450, size: 'medium', faceUp: !!data.result });

    if (data.result) {
      const outcomeText = this.add
        .text(70, 430, `Outcome: ${data.result.outcome} | Payout: ${data.result.payout}\nPlayer ${data.result.playerValue.total} vs Dealer ${data.result.dealerValue.total}\nS17, Blackjack pays 3:2, Split omitted.`, {
          fontFamily: 'Verdana',
          fontSize: '22px',
          color: '#fbbf24'
        })
        .setOrigin(0, 0);
      this.ui.push(outcomeText);
    }

    this.renderActionButtons([
      {
        label: 'Bet -',
        onClick: () => {
          data.wager = clampBet(data.wager - 5, this.profile.bankroll);
          this.renderScreen();
        }
      },
      {
        label: 'Bet +',
        onClick: () => {
          data.wager = clampBet(data.wager + 5, this.profile.bankroll);
          this.renderScreen();
        }
      },
      {
        label: 'Hit',
        onClick: () => {
          if (data.result) return;
          data.round = playerHit(data.round);
          if (data.round.finished) {
            data.result = settleBlackjack(data.round);
            this.addOutcome('blackjack', data.result.outcome, data.result.payout, data.result, true);
          }
          this.renderScreen();
        }
      },
      {
        label: 'Stand',
        onClick: () => {
          if (data.result) return;
          data.result = settleBlackjack(data.round);
          this.addOutcome('blackjack', data.result.outcome, data.result.payout, data.result, true);
          this.renderScreen();
        }
      },
      {
        label: 'Double',
        onClick: () => {
          if (data.result) return;
          data.round = playerDouble(data.round);
          data.result = settleBlackjack(data.round);
          this.addOutcome('blackjack', data.result.outcome, data.result.payout, data.result, true);
          this.renderScreen();
        }
      },
      {
        label: 'New',
        onClick: () => {
          data.round = createBlackjackRound(data.wager, Date.now());
          data.result = null;
          this.hooks.reportEvent({ type: 'game_start', gameId: 'card-table', mode: 'blackjack', options: { wager: data.wager } });
          this.renderScreen();
        }
      }
    ]);
  }

  private renderHigherLower(): void {
    if (!this.activeMode || this.activeMode.mode !== 'higher-lower') return;
    const { data } = this.activeMode;

    const info = this.add
      .text(70, 250, `Current: ${cardToString(data.current)}\nWager: ${data.wager}\nStreak: ${data.streak}\nEqual policy: ${this.profile.settings.higherLowerEqualPolicy}`, {
        fontFamily: 'Verdana',
        fontSize: '24px',
        color: '#f8fafc'
      })
      .setOrigin(0, 0);
    this.ui.push(info);
    this.drawCards([data.current], { x: 860, y: 330, size: 'large', faceUp: true });

    if (!data.active) {
      const ended = this.add
        .text(70, 420, 'Run ended. Start a new run.', { fontFamily: 'Verdana', fontSize: '22px', color: '#fbbf24' })
        .setOrigin(0, 0);
      this.ui.push(ended);
    }

    const guess = (side: 'higher' | 'lower') => {
      if (!data.active) return;
      const next = data.deck.shift();
      if (!next) return;
      const out = resolveHigherLowerGuess({
        current: data.current,
        next,
        guess: side,
        streak: data.streak,
        equalPolicy: this.profile.settings.higherLowerEqualPolicy
      });
      data.current = out.nextCurrent;
      data.streak = out.streak;
      if (out.ended) {
        data.active = false;
        const payout = resolveHigherLowerPayout(data.wager, out.streak);
        this.addOutcome('higher-lower', payout > 0 ? 'win' : payout < 0 ? 'loss' : 'push', payout, out, true);
      }
      this.renderScreen();
    };

    this.renderActionButtons([
      { label: 'Bet -', onClick: () => { data.wager = clampBet(data.wager - 5, this.profile.bankroll); this.renderScreen(); } },
      { label: 'Bet +', onClick: () => { data.wager = clampBet(data.wager + 5, this.profile.bankroll); this.renderScreen(); } },
      { label: 'Higher', onClick: () => guess('higher') },
      { label: 'Lower', onClick: () => guess('lower') },
      {
        label: 'Cash Out',
        onClick: () => {
          if (!data.active) return;
          data.active = false;
          const payout = data.streak > 0 ? resolveHigherLowerPayout(data.wager, data.streak) : 0;
          this.addOutcome('higher-lower', payout > 0 ? 'win' : 'push', payout, { streak: data.streak, cashout: true }, true);
          this.renderScreen();
        }
      },
      {
        label: 'New',
        onClick: () => {
          const deck = shuffleDeck(createDeck(), Date.now());
          data.deck = deck;
          data.current = deck.shift() as Card;
          data.streak = 0;
          data.active = true;
          this.hooks.reportEvent({ type: 'game_start', gameId: 'card-table', mode: 'higher-lower', options: { wager: data.wager } });
          this.renderScreen();
        }
      }
    ]);
  }

  private runThirtyOneAi(data: ThirtyOneModeState): void {
    while (data.state.turn === 1 && !isThirtyOneRoundOver(data.state)) {
      const ai = data.state.players[1];
      const move = chooseThirtyOneAiMove(ai.hand, data.state.discardTop);
      const incoming = move.drawFrom === 'discard' ? data.state.discardTop : (data.state.deck.shift() as Card);
      const replaced = ai.hand[move.dropIndex];
      ai.hand = swapCard(ai.hand, move.dropIndex, incoming);
      data.state.discardTop = replaced;
      if (move.knock) {
        data.state = knock(data.state);
      }
      data.state = advanceTurn(data.state);
    }
  }

  private finalizeThirtyOneIfDone(data: ThirtyOneModeState): void {
    if (!isThirtyOneRoundOver(data.state)) return;
    const winner = determineThirtyOneWinner(data.state.players);
    const playerWon = winner.winner === 'player';
    const payout = playerWon ? data.wager : -data.wager;
    data.resultText = `Winner: ${winner.winner} | Player ${winner.scores.player} vs AI ${winner.scores.ai}`;
    this.addOutcome('thirtyone', playerWon ? 'win' : 'loss', payout, winner, true);
  }

  private renderThirtyOne(): void {
    if (!this.activeMode || this.activeMode.mode !== 'thirtyone') return;
    const { data } = this.activeMode;
    const player = data.state.players[0];
    const ai = data.state.players[1];

    const text = this.add
      .text(
        70,
        250,
        `Wager: ${data.wager}\nYour hand: ${summarizeCards(player.hand)}\nYour best: ${bestThirtyOneScore(player.hand)}\nAI hand: ${data.resultText ? summarizeCards(ai.hand) : '[hidden hidden hidden]'}\nDiscard: ${cardToString(data.state.discardTop)}\n${data.pendingDraw ? `Pending draw: ${cardToString(data.pendingDraw)}` : ''}`,
        { fontFamily: 'Verdana', fontSize: '22px', color: '#f8fafc' }
      )
      .setOrigin(0, 0);
    this.ui.push(text);
    this.drawCards(player.hand, { x: 760, y: 300, size: 'medium', faceUp: true });
    this.drawCards(ai.hand, { x: 760, y: 450, size: 'medium', faceUp: Boolean(data.resultText) });
    this.drawCards([data.state.discardTop], { x: 1120, y: 300, size: 'medium', faceUp: true });
    if (data.pendingDraw) {
      this.drawCards([data.pendingDraw], { x: 1120, y: 450, size: 'medium', faceUp: true });
    }

    if (data.resultText) {
      const done = this.add.text(70, 470, data.resultText, { fontFamily: 'Verdana', fontSize: '24px', color: '#fbbf24' }).setOrigin(0, 0);
      this.ui.push(done);
    }

    const onSwap = (index: number) => {
      if (data.resultText || data.state.turn !== 0 || !data.pendingDraw) return;
      const replaced = player.hand[index];
      player.hand = swapCard(player.hand, index, data.pendingDraw);
      data.state.discardTop = replaced;
      data.pendingDraw = null;
      data.state = advanceTurn(data.state);
      this.runThirtyOneAi(data);
      this.finalizeThirtyOneIfDone(data);
      this.renderScreen();
    };

    this.renderActionButtons([
      { label: 'Bet -', onClick: () => { data.wager = clampBet(data.wager - 5, this.profile.bankroll); this.renderScreen(); } },
      { label: 'Bet +', onClick: () => { data.wager = clampBet(data.wager + 5, this.profile.bankroll); this.renderScreen(); } },
      {
        label: 'Draw Deck',
        onClick: () => {
          if (data.resultText || data.state.turn !== 0 || data.pendingDraw) return;
          data.pendingDraw = data.state.deck.shift() as Card;
          this.renderScreen();
        }
      },
      {
        label: 'Draw Discard',
        onClick: () => {
          if (data.resultText || data.state.turn !== 0 || data.pendingDraw) return;
          data.pendingDraw = data.state.discardTop;
          this.renderScreen();
        }
      },
      { label: 'Swap 1', onClick: () => onSwap(0) },
      { label: 'Swap 2', onClick: () => onSwap(1) },
      { label: 'Swap 3', onClick: () => onSwap(2) }
    ], 560);

    const secondRow: ActionButton[] = [
      {
        label: 'Knock',
        onClick: () => {
          if (data.resultText) return;
          data.state = knock(data.state);
          if (data.state.turn === 0) {
            data.state = advanceTurn(data.state);
          }
          this.runThirtyOneAi(data);
          this.finalizeThirtyOneIfDone(data);
          this.renderScreen();
        }
      },
      {
        label: 'New',
        onClick: () => {
          const deck = shuffleDeck(createDeck(), Date.now());
          const players = [
            { id: 'player', hand: deal(deck, 3) },
            { id: 'ai', hand: deal(deck, 3) }
          ];
          data.state = createThirtyOneState(deck, players);
          data.pendingDraw = null;
          data.resultText = null;
          this.hooks.reportEvent({ type: 'game_start', gameId: 'card-table', mode: 'thirtyone', options: { wager: data.wager } });
          this.renderScreen();
        }
      }
    ];
    this.renderActionButtons(secondRow, 620);
  }

  private tableauTop(pile: readonly TableauCard[]): TableauCard | null {
    if (pile.length === 0) return null;
    return pile[pile.length - 1];
  }

  private renderSolitaire(): void {
    if (!this.activeMode || this.activeMode.mode !== 'solitaire') return;
    const { data } = this.activeMode;
    const state = data.state;

    const topWaste = state.waste.length ? state.waste[state.waste.length - 1] : null;
    const foundationSummary = `Foundations S:${state.foundation.S.length} H:${state.foundation.H.length} D:${state.foundation.D.length} C:${state.foundation.C.length}`;
    const body = this.add
      .text(
        70,
        250,
        `Moves: ${state.moves}\nStock: ${state.stock.length} | Waste: ${topWaste ? cardToString(topWaste) : 'empty'}\n${foundationSummary}\nSelected: ${
          data.selectedSource ? (data.selectedSource.type === 'waste' ? 'Waste' : `Pile ${data.selectedSource.index + 1}`) : 'None'
        }\n${data.resultText ?? ''}`,
        { fontFamily: 'Verdana', fontSize: '22px', color: '#f8fafc' }
      )
      .setOrigin(0, 0);
    this.ui.push(body);
    if (topWaste) {
      this.drawCards([topWaste], { x: 900, y: 290, size: 'medium', faceUp: true });
    }

    const selectSource = (source: SolitaireModeState['selectedSource']) => {
      data.selectedSource = source;
      this.renderScreen();
    };

    this.renderActionButtons([
      { label: 'Draw', onClick: () => { data.state = drawFromStock(data.state); this.renderScreen(); } },
      {
        label: 'Waste',
        onClick: () => {
          if (!topWaste) return;
          selectSource({ type: 'waste' });
        }
      },
      {
        label: 'To Found.',
        onClick: () => {
          if (!data.selectedSource) return;
          const src = data.selectedSource;
          const card =
            src.type === 'waste'
              ? data.state.waste[data.state.waste.length - 1]
              : this.tableauTop(data.state.tableau[src.index]);
          if (!card) return;
          const foundation = data.state.foundation[card.suit];
          const top = foundation.length ? foundation[foundation.length - 1] : null;
          if (!canMoveToFoundation(card, top)) return;
          foundation.push(card);
          if (src.type === 'waste') {
            data.state.waste.pop();
          } else {
            const pile = data.state.tableau[src.index];
            pile.pop();
            data.state.tableau[src.index] = revealTopIfNeeded(pile);
          }
          data.state.moves += 1;
          data.selectedSource = null;
          const won = Object.values(data.state.foundation).every((pile) => pile.length === 13);
          if (won) {
            data.resultText = 'You won Solitaire.';
            const elapsedSec = Math.floor((Date.now() - data.state.startedAt) / 1000);
            this.addOutcome('solitaire', 'win', 0, { moves: data.state.moves, seconds: elapsedSec }, true);
          }
          this.renderScreen();
        }
      },
      {
        label: 'Give Up',
        onClick: () => {
          data.resultText = 'Round ended. Use New to restart.';
          this.addOutcome('solitaire', 'loss', 0, { giveUp: true, moves: data.state.moves }, true);
          this.renderScreen();
        }
      },
      {
        label: 'New',
        onClick: () => {
          const deck = shuffleDeck(createDeck(), Date.now());
          const drawCount = this.profile.settings.solitaireDraw === 'draw3' ? 3 : 1;
          data.state = createSolitaireState(deck, drawCount);
          data.resultText = null;
          data.selectedSource = null;
          this.hooks.reportEvent({ type: 'game_start', gameId: 'card-table', mode: 'solitaire', options: { draw: drawCount } });
          this.renderScreen();
        }
      }
    ]);

    for (let i = 0; i < data.state.tableau.length; i += 1) {
      const pile = data.state.tableau[i];
      const top = this.tableauTop(pile);
      const label = `Pile ${i + 1}: ${top ? cardToString(top) : 'empty'} (${pile.length})`;
      const btn = createTextButton(this, 180 + i * 150, 640, label, () => {
        if (!data.selectedSource) {
          selectSource({ type: 'tableau', index: i });
          return;
        }
        const src = data.selectedSource;
        const sourceCard =
          src.type === 'waste' ? data.state.waste[data.state.waste.length - 1] : this.tableauTop(data.state.tableau[src.index]);
        if (!sourceCard) return;
        const targetTop = this.tableauTop(pile);
        if (!canPlaceOnTableau(sourceCard, targetTop) || (src.type === 'tableau' && src.index === i)) return;

        if (src.type === 'waste') {
          data.state.waste.pop();
        } else {
          const sourcePile = data.state.tableau[src.index];
          const moving = sourcePile.pop();
          if (!moving) return;
          data.state.tableau[src.index] = revealTopIfNeeded(sourcePile);
        }

        pile.push({ ...sourceCard, faceUp: true });
        data.state.moves += 1;
        data.selectedSource = null;
        this.renderScreen();
      }, { width: 145, height: 72, fill: 0x2d3b52 });
      this.ui.push(btn);

      if (top && !canMoveTableauStack([top])) {
        // no-op; call keeps move legality helper used in runtime build.
      }
    }
  }

  private renderForehead(): void {
    if (!this.activeMode || this.activeMode.mode !== 'forehead-poker') return;
    const { data } = this.activeMode;

    const body = this.add
      .text(
        70,
        250,
        `Wager: ${data.wager}\nOpponent card (you can see): ${cardToString(data.aiHidden)}\nYour hidden card (AI can see): ${data.revealed ? cardToString(data.playerHidden) : '[hidden]'}\nAI pressure bet: ${data.aiBet}\n${data.resultText ?? ''}`,
        { fontFamily: 'Verdana', fontSize: '24px', color: '#f8fafc' }
      )
      .setOrigin(0, 0);
    this.ui.push(body);
    this.drawCards([data.aiHidden], { x: 860, y: 320, size: 'large', faceUp: true });
    this.drawCards([data.playerHidden], { x: 1020, y: 320, size: 'large', faceUp: data.revealed });

    this.renderActionButtons([
      { label: 'Bet -', onClick: () => { data.wager = clampBet(data.wager - 5, this.profile.bankroll); this.renderScreen(); } },
      { label: 'Bet +', onClick: () => { data.wager = clampBet(data.wager + 5, this.profile.bankroll); this.renderScreen(); } },
      {
        label: 'Reveal',
        onClick: () => {
          if (data.revealed) return;
          data.revealed = true;
          const settled = settleForeheadRound(data.playerHidden, data.aiHidden, data.wager);
          data.resultText = `${settled.winner === 'push' ? 'Push' : `${settled.winner} wins`} | payout ${settled.payout}`;
          this.addOutcome('forehead-poker', settled.payout > 0 ? 'win' : settled.payout < 0 ? 'loss' : 'push', settled.payout, settled, true);
          this.renderScreen();
        }
      },
      {
        label: 'New',
        onClick: () => {
          const deck = shuffleDeck(createDeck(), Date.now());
          data.playerHidden = deck.shift() as Card;
          data.aiHidden = deck.shift() as Card;
          data.aiBet = chooseForeheadAiBet(data.wager, data.playerHidden);
          data.revealed = false;
          data.resultText = null;
          this.hooks.reportEvent({ type: 'game_start', gameId: 'card-table', mode: 'forehead-poker', options: { wager: data.wager } });
          this.renderScreen();
        }
      }
    ]);
  }

  private renderFiveCardDraw(): void {
    if (!this.activeMode || this.activeMode.mode !== 'five-card-draw') return;
    const { data } = this.activeMode;

    const text = this.add
      .text(
        70,
        250,
        `Wager: ${data.wager} (ante ${data.ante})\nYour hand: ${summarizeCards(data.player)}\nAI hand: ${data.resultText ? summarizeCards(data.ai) : '[hidden x5]'}\nSelected discards: ${[...data.selectedDiscards].map((i) => i + 1).join(', ') || 'none'}\n${data.resultText ?? ''}`,
        { fontFamily: 'Verdana', fontSize: '23px', color: '#f8fafc' }
      )
      .setOrigin(0, 0);
    this.ui.push(text);
    this.drawCards(data.player, { x: 760, y: 320, size: 'medium', faceUp: true });
    this.drawCards(data.ai, { x: 760, y: 450, size: 'medium', faceUp: Boolean(data.resultText) });

    const toggleDiscard = (index: number) => {
      if (data.resultText) return;
      if (data.selectedDiscards.has(index)) data.selectedDiscards.delete(index);
      else data.selectedDiscards.add(index);
      this.renderScreen();
    };

    for (let i = 0; i < 5; i += 1) {
      const selected = data.selectedDiscards.has(i) ? '*' : '';
      const btn = createTextButton(this, 150 + i * 140, 470, `${selected}${cardToString(data.player[i])}`, () => toggleDiscard(i), {
        width: 130,
        height: 58,
        fill: 0x334155
      });
      this.ui.push(btn);
    }

    this.renderActionButtons([
      { label: 'Bet -', onClick: () => { data.wager = clampBet(data.wager - 5, this.profile.bankroll); this.renderScreen(); } },
      { label: 'Bet +', onClick: () => { data.wager = clampBet(data.wager + 5, this.profile.bankroll); this.renderScreen(); } },
      {
        label: 'Draw',
        onClick: () => {
          if (data.resultText) return;
          data.player = replaceDiscards(data.player, [...data.selectedDiscards], data.deck);
          const aiDiscards = chooseDrawDiscards(data.ai);
          data.ai = replaceDiscards(data.ai, aiDiscards, data.deck);
          const showdown = settleFiveCardDraw({ player: data.player, ai: data.ai, wager: data.wager, ante: data.ante });
          data.resultText = `${showdown.winner} | ${showdown.playerRank.label} vs ${showdown.aiRank.label} | payout ${showdown.payout}`;
          this.addOutcome('five-card-draw', showdown.payout > 0 ? 'win' : showdown.payout < 0 ? 'loss' : 'push', showdown.payout, showdown, true);
          this.renderScreen();
        }
      },
      {
        label: 'New',
        onClick: () => {
          const round = createFiveCardDrawRound(Date.now());
          data.player = round.player;
          data.ai = round.ai;
          data.deck = round.deck;
          data.selectedDiscards = new Set<number>();
          data.resultText = null;
          this.hooks.reportEvent({ type: 'game_start', gameId: 'card-table', mode: 'five-card-draw', options: { wager: data.wager } });
          this.renderScreen();
        }
      }
    ]);
  }

  private createHoldemMode(seed: number): HoldemModeState {
    const deck = shuffleDeck(createDeck(), seed);
    const ids = ['player', 'bot1', 'bot2', 'bot3', 'bot4', 'bot5'];
    const personalities: HoldemAiPersonality[] = ['tight', 'balanced', 'loose', 'balanced', 'tight'];
    const seats: HoldemSeat[] = ids.map((id, index) => ({
      id,
      stack: 200,
      committed: id === 'player' ? 5 : index === 1 ? 10 : 0,
      folded: false,
      personality: id === 'player' ? 'player' : personalities[index - 1],
      cards: [deck.shift() as Card, deck.shift() as Card]
    }));

    return {
      handSeed: seed,
      seats,
      board: [],
      street: 'preflop',
      currentBet: 10,
      handLog: [`Blinds posted: player 5, bot1 10`],
      resultText: null,
      lastHandReplay: null
    };
  }

  private runHoldemStreetBots(data: HoldemModeState): void {
    const toCall = data.currentBet;
    for (let i = 1; i < data.seats.length; i += 1) {
      const seat = data.seats[i];
      if (seat.folded) continue;
      const owe = Math.max(0, toCall - seat.committed);
      const ai = chooseHoldemAiAction({
        cards: seat.cards,
        toCall: owe,
        minRaise: 10,
        stack: seat.stack,
        personality: seat.personality as HoldemAiPersonality
      });
      if (ai.action === 'fold') {
        seat.folded = true;
        data.handLog.push(`${seat.id} folds`);
      } else if (ai.action === 'raise' && ai.raiseTo) {
        const commit = Math.min(seat.stack, owe + ai.raiseTo);
        seat.stack -= commit;
        seat.committed += commit;
        data.currentBet = Math.max(data.currentBet, seat.committed);
        data.handLog.push(`${seat.id} raises`);
      } else {
        const commit = Math.min(seat.stack, owe);
        seat.stack -= commit;
        seat.committed += commit;
        data.handLog.push(owe > 0 ? `${seat.id} calls` : `${seat.id} checks`);
      }
    }
  }

  private advanceHoldemStreet(data: HoldemModeState): void {
    if (data.street === 'preflop') {
      const deck = shuffleDeck(createDeck(), data.handSeed + 1);
      data.board = [deck[0], deck[1], deck[2]];
      data.street = 'flop';
      data.handLog.push(`Flop: ${summarizeCards(data.board)}`);
      return;
    }
    if (data.street === 'flop') {
      const deck = shuffleDeck(createDeck(), data.handSeed + 2);
      data.board = [...data.board, deck[3]];
      data.street = 'turn';
      data.handLog.push(`Turn: ${cardToString(deck[3])}`);
      return;
    }
    if (data.street === 'turn') {
      const deck = shuffleDeck(createDeck(), data.handSeed + 3);
      data.board = [...data.board, deck[4]];
      data.street = 'river';
      data.handLog.push(`River: ${cardToString(deck[4])}`);
      return;
    }
    if (data.street === 'river') {
      data.street = 'showdown';
      const players = data.seats.map((s) => ({ id: s.id, cards: s.cards, committed: s.committed, folded: s.folded }));
      const result = resolveHoldemShowdown(players, data.board);
      for (let i = 0; i < data.seats.length; i += 1) {
        data.seats[i].stack += result.payouts[data.seats[i].id] ?? 0;
      }
      const playerDelta = (result.payouts.player ?? 0) - data.seats[0].committed;
      const outcome = playerDelta > 0 ? 'win' : playerDelta < 0 ? 'loss' : 'push';
      data.resultText = `Showdown. Payout: ${result.payouts.player ?? 0} (delta ${playerDelta})`;
      data.lastHandReplay = data.handLog.join('\n');
      this.addOutcome('holdem', outcome, playerDelta, { payouts: result.payouts, board: summarizeCards(data.board) }, true);
    }
  }

  private renderHoldem(): void {
    if (!this.activeMode || this.activeMode.mode !== 'holdem') return;
    const { data } = this.activeMode;
    const player = data.seats[0];

    const body = this.add
      .text(
        70,
        250,
        `Street: ${data.street}\nBoard: ${data.board.length ? summarizeCards(data.board) : '[none]'}\nYour cards: ${summarizeCards(player.cards)}\nCurrent bet: ${data.currentBet}\nYou committed: ${player.committed}\n${data.resultText ?? ''}`,
        { fontFamily: 'Verdana', fontSize: '22px', color: '#f8fafc' }
      )
      .setOrigin(0, 0);
    this.ui.push(body);
    if (data.board.length > 0) {
      this.drawCards(data.board, { x: 660, y: 220, size: 'small', faceUp: true, spacing: 72 });
    }
    this.drawCards(player.cards, { x: 760, y: 350, size: 'large', faceUp: true, spacing: 140 });

    const runPlayerAction = (action: 'fold' | 'call' | 'raise') => {
      if (data.resultText) return;
      if (action === 'fold') {
        player.folded = true;
        data.resultText = 'You folded.';
        this.addOutcome('holdem', 'loss', -player.committed, { folded: true }, true);
        this.renderScreen();
        return;
      }

      const owe = Math.max(0, data.currentBet - player.committed);
      let commit = owe;
      if (action === 'raise') {
        commit += 10;
        data.currentBet += 10;
        data.handLog.push('player raises');
      } else {
        data.handLog.push(owe > 0 ? 'player calls' : 'player checks');
      }
      commit = Math.min(player.stack, commit);
      player.stack -= commit;
      player.committed += commit;

      this.runHoldemStreetBots(data);
      this.advanceHoldemStreet(data);
      this.renderScreen();
    };

    this.renderActionButtons([
      { label: 'Fold', onClick: () => runPlayerAction('fold') },
      { label: 'Call/Check', onClick: () => runPlayerAction('call') },
      { label: 'Raise', onClick: () => runPlayerAction('raise') },
      {
        label: 'Replay',
        onClick: () => {
          this.openModal('Last Hand Replay', data.lastHandReplay ?? 'No previous hand yet.');
        }
      },
      {
        label: 'New Hand',
        onClick: () => {
          const next = this.createHoldemMode(Date.now());
          this.activeMode = { mode: 'holdem', data: next };
          this.hooks.reportEvent({ type: 'game_start', gameId: 'card-table', mode: 'holdem', options: { table: 'cash' } });
          this.renderScreen();
        }
      }
    ]);

    const botSummary = this.add
      .text(
        70,
        520,
        data.seats
          .slice(1)
          .map((s) => `${s.id}: ${s.folded ? 'folded' : 'in'} | stack ${s.stack} | commit ${s.committed}`)
          .join('\n'),
        { fontFamily: 'Verdana', fontSize: '18px', color: '#cbd5e1' }
      )
      .setOrigin(0, 0);
    this.ui.push(botSummary);
  }
}
