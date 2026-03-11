import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { cameraFlash, cameraShake, triggerHaptic } from '../../systems/gameplayComfort';
import { comboMultiplier, consonantPayout, nextCombo } from './scoring';

interface WheelOfFortuneSceneConfig {
  hooks: GameRuntimeHooks;
}

interface PuzzleEntry {
  phrase: string;
  category: string;
}

type Phase = 'need_spin' | 'pick_consonant' | 'pick_vowel' | 'ended';

const PUZZLES: readonly PuzzleEntry[] = [
  { phrase: 'GAME NIGHT', category: 'Activity' },
  { phrase: 'CHECKMATE IN THREE', category: 'Strategy' },
  { phrase: 'SINK THE FLEET', category: 'Phrase' },
  { phrase: 'LUCK OF THE SPIN', category: 'Expression' },
  { phrase: 'TABLETOP TOURNAMENT', category: 'Event' },
  { phrase: 'WEEKEND CHAMPION', category: 'Title' }
] as const;

const WHEEL_VALUES: ReadonlyArray<number | 'BANKRUPT' | 'LOSE TURN'> = [
  150,
  200,
  250,
  300,
  350,
  400,
  450,
  500,
  600,
  700,
  'BANKRUPT',
  'LOSE TURN'
] as const;

function isVowel(letter: string): boolean {
  return letter === 'A' || letter === 'E' || letter === 'I' || letter === 'O' || letter === 'U';
}

function normalizeGuess(value: string): string {
  return value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
}

function countOccurrences(phrase: string, letter: string): number {
  let count = 0;
  for (let i = 0; i < phrase.length; i += 1) {
    if (phrase[i] === letter) count += 1;
  }
  return count;
}

export class WheelOfFortuneScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private puzzle: PuzzleEntry = PUZZLES[0];
  private guessed = new Set<string>();

  private bank = 0;
  private strikes = 0;
  private readonly maxStrikes = 5;

  private phase: Phase = 'need_spin';
  private pendingConsonantValue = 0;

  private wheelDisplay: number | 'BANKRUPT' | 'LOSE TURN' | null = null;
  private wheelSpinMs = 0;
  private spinPendingResult: number | 'BANKRUPT' | 'LOSE TURN' | null = null;
  private endPosted = false;
  private combo = 0;

  private categoryText!: Phaser.GameObjects.Text;
  private puzzleText!: Phaser.GameObjects.Text;
  private bankText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private strikesText!: Phaser.GameObjects.Text;
  private wheelText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  private spinButton!: Phaser.GameObjects.Text;
  private buyVowelButton!: Phaser.GameObjects.Text;
  private solveButton!: Phaser.GameObjects.Text;

  private letterButtons = new Map<string, Phaser.GameObjects.Text>();

  constructor(config: WheelOfFortuneSceneConfig) {
    super('wheel-of-fortune-main');
    this.hooks = config.hooks;
  }

  create() {
    this.add.text(24, 18, 'Wheel of Fortune', { color: '#ffffff', fontSize: '34px' });
    this.categoryText = this.add.text(24, 66, '', { color: '#c6e7ff', fontSize: '22px' });
    this.puzzleText = this.add.text(640, 170, '', { color: '#fff2c2', fontSize: '48px', align: 'center' }).setOrigin(0.5, 0);

    this.bankText = this.add.text(24, 108, '', { color: '#d8ffc8', fontSize: '20px' });
    this.strikesText = this.add.text(24, 140, '', { color: '#ffd0a9', fontSize: '20px' });
    this.statusText = this.add.text(24, 172, '', { color: '#ffd78b', fontSize: '20px' });
    this.comboText = this.add.text(24, 198, '', { color: '#9ff8cc', fontSize: '18px' });
    this.promptText = this.add.text(24, 280, '', { color: '#ffd0a6', fontSize: '18px' });

    this.wheelText = this.add
      .text(640, 280, '', { color: '#8ce4ff', fontSize: '32px', backgroundColor: '#112a3c' })
      .setOrigin(0.5)
      .setPadding(16, 10, 16, 10);

    this.spinButton = this.createButton(24, 220, 'Spin', () => this.onSpin());
    this.buyVowelButton = this.createButton(140, 220, 'Buy Vowel (-250)', () => this.onBuyVowel());
    this.solveButton = this.createButton(356, 220, 'Solve Puzzle', () => this.onSolve());
    this.createButton(514, 220, 'New Puzzle', () => this.startNewPuzzle());

    this.createLetterButtons();
    this.input.keyboard?.on('keydown-R', () => this.startNewPuzzle());
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.onKeyDown(event));

    this.startNewPuzzle();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
  }

  update(_time: number, deltaMs: number) {
    if (this.wheelSpinMs > 0) {
      this.wheelSpinMs -= deltaMs;
      if (this.wheelSpinMs <= 0) {
        this.applySpinResult();
      } else {
        const index = Math.floor(Math.random() * WHEEL_VALUES.length);
        this.wheelDisplay = WHEEL_VALUES[index];
      }
    }

    this.refreshTexts();
    this.refreshButtons();
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, label, { color: '#071723', fontSize: '18px', backgroundColor: '#9cd9ff' })
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        triggerHaptic(8);
        onClick();
      });
  }

  private createLetterButtons() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < letters.length; i += 1) {
      const letter = letters[i];
      const col = i % 13;
      const row = Math.floor(i / 13);
      const x = 180 + col * 72;
      const y = 370 + row * 72;
      const button = this.add
        .text(x, y, letter, { color: '#001320', fontSize: '28px', backgroundColor: '#abecff' })
        .setPadding(14, 10, 14, 10)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.onPickLetter(letter));
      this.letterButtons.set(letter, button);
    }
  }

  private startNewPuzzle() {
    this.puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    this.guessed.clear();
    this.bank = 0;
    this.strikes = 0;
    this.phase = 'need_spin';
    this.pendingConsonantValue = 0;
    this.wheelDisplay = null;
    this.wheelSpinMs = 0;
    this.spinPendingResult = null;
    this.endPosted = false;
    this.combo = 0;
    this.promptText.setText('Tip: shortcuts S spin, V vowel, Enter solve.');

    this.hooks.reportEvent({ type: 'game_start', gameId: this.hooks.gameId, mode: 'solo' });
  }

  private refreshTexts() {
    this.categoryText.setText(`Category: ${this.puzzle.category}`);
    this.bankText.setText(`Bank: ${this.bank}`);
    this.strikesText.setText(`Strikes: ${this.strikes}/${this.maxStrikes}`);
    this.comboText.setText(`Combo: x${comboMultiplier(this.combo).toFixed(2)} (${this.combo})`);

    this.puzzleText.setText(this.maskedPuzzle());

    if (this.wheelSpinMs > 0) {
      this.wheelText.setText(`Wheel: ${String(this.wheelDisplay ?? '...')}`);
    } else if (this.wheelDisplay === null) {
      this.wheelText.setText('Wheel: spin to start');
    } else {
      this.wheelText.setText(`Wheel: ${String(this.wheelDisplay)}`);
    }

    if (this.phase === 'ended') {
      if (this.isSolved()) {
        this.statusText.setText('Solved! Great round. Press New Puzzle or R.');
      } else {
        this.statusText.setText(`Round over. Answer: ${this.puzzle.phrase}. Press New Puzzle or R.`);
      }
      return;
    }

    if (this.phase === 'need_spin') {
      this.statusText.setText('Spin for a value, buy a vowel, or solve the puzzle.');
    } else if (this.phase === 'pick_consonant') {
      this.statusText.setText(`Pick a consonant worth ${this.pendingConsonantValue} each.`);
    } else {
      this.statusText.setText('Pick a vowel.');
    }
  }

  private refreshButtons() {
    const spinning = this.wheelSpinMs > 0;
    const ended = this.phase === 'ended';

    this.spinButton.setAlpha(!spinning && !ended && this.phase === 'need_spin' ? 1 : 0.45);
    this.buyVowelButton.setAlpha(!spinning && !ended && this.phase === 'need_spin' && this.bank >= 250 ? 1 : 0.45);
    this.solveButton.setAlpha(!spinning && !ended ? 1 : 0.45);
    for (const [letter, button] of this.letterButtons.entries()) {
      const already = this.guessed.has(letter);
      const activePhase = this.phase === 'pick_consonant' || this.phase === 'pick_vowel';
      if (!activePhase || already || spinning || ended) {
        button.setAlpha(0.35);
      } else if (this.phase === 'pick_consonant' && isVowel(letter)) {
        button.setAlpha(0.25);
      } else if (this.phase === 'pick_vowel' && !isVowel(letter)) {
        button.setAlpha(0.25);
      } else {
        button.setAlpha(1);
      }
    }
  }

  private maskedPuzzle(): string {
    let out = '';
    for (let i = 0; i < this.puzzle.phrase.length; i += 1) {
      const char = this.puzzle.phrase[i];
      if (char < 'A' || char > 'Z') {
        out += char;
      } else {
        out += this.guessed.has(char) ? char : '_';
      }
      out += ' ';
    }
    return out.trim();
  }

  private onSpin() {
    if (this.phase !== 'need_spin' || this.wheelSpinMs > 0) return;

    const result = WHEEL_VALUES[Math.floor(Math.random() * WHEEL_VALUES.length)];
    this.spinPendingResult = result;
    this.wheelSpinMs = 900;
    this.promptText.setText('Tip: wheel spinning...');
  }

  private applySpinResult() {
    this.wheelSpinMs = 0;
    const result = this.spinPendingResult;
    this.spinPendingResult = null;
    if (result === null) return;

    this.wheelDisplay = result;

    if (result === 'BANKRUPT') {
      this.bank = 0;
      this.strikes += 1;
      this.combo = 0;
      this.promptText.setText('Alert: bankrupt. Combo reset.');
      cameraShake(this, 120, 0.0024);
      triggerHaptic([20, 18, 20]);
      this.phase = 'need_spin';
      this.checkFailure();
      return;
    }

    if (result === 'LOSE TURN') {
      this.strikes += 1;
      this.combo = 0;
      this.promptText.setText('Alert: lose turn. Momentum reset.');
      triggerHaptic(12);
      this.phase = 'need_spin';
      this.checkFailure();
      return;
    }

    this.pendingConsonantValue = result;
    this.phase = 'pick_consonant';
  }

  private onBuyVowel() {
    if (this.phase !== 'need_spin' || this.wheelSpinMs > 0) return;
    if (this.bank < 250) return;

    this.bank -= 250;
    this.phase = 'pick_vowel';
  }

  private onPickLetter(letter: string) {
    if (this.phase !== 'pick_consonant' && this.phase !== 'pick_vowel') return;
    if (this.guessed.has(letter)) return;

    if (this.phase === 'pick_consonant' && isVowel(letter)) return;
    if (this.phase === 'pick_vowel' && !isVowel(letter)) return;

    this.guessed.add(letter);
    const hits = countOccurrences(this.puzzle.phrase, letter);

    if (hits > 0) {
      if (this.phase === 'pick_consonant') {
        this.bank += consonantPayout(this.pendingConsonantValue, hits, this.combo);
      }
      this.combo = nextCombo(this.combo, true);
      this.promptText.setText(`Great: ${letter} appears ${hits} time${hits === 1 ? '' : 's'}.`);
      cameraFlash(this, 50, 255, 255, 210);
      triggerHaptic(10);
      if (this.isSolved()) {
        this.finishRound(true);
        return;
      }
      this.phase = 'need_spin';
      return;
    }

    this.strikes += 1;
    this.combo = nextCombo(this.combo, false);
    this.promptText.setText(`Alert: ${letter} is not in the puzzle.`);
    triggerHaptic(14);
    this.phase = 'need_spin';
    this.checkFailure();
  }

  private onSolve() {
    if (this.phase === 'ended' || this.wheelSpinMs > 0) return;

    const answer = window.prompt('Solve the puzzle:');
    if (!answer) return;

    const normalized = normalizeGuess(answer);
    if (normalized === this.puzzle.phrase) {
      for (let i = 0; i < this.puzzle.phrase.length; i += 1) {
        const char = this.puzzle.phrase[i];
        if (char >= 'A' && char <= 'Z') this.guessed.add(char);
      }
      this.finishRound(true);
      return;
    }

    this.strikes += 1;
    this.combo = nextCombo(this.combo, false);
    this.promptText.setText('Alert: incorrect solve attempt.');
    triggerHaptic(14);
    this.checkFailure();
  }

  private checkFailure() {
    if (this.strikes >= this.maxStrikes) {
      this.finishRound(false);
    }
  }

  private isSolved(): boolean {
    for (let i = 0; i < this.puzzle.phrase.length; i += 1) {
      const char = this.puzzle.phrase[i];
      if (char >= 'A' && char <= 'Z' && !this.guessed.has(char)) {
        return false;
      }
    }
    return true;
  }

  private finishRound(playerWon: boolean) {
    this.phase = 'ended';
    this.promptText.setText(playerWon ? 'Great: puzzle solved.' : 'Alert: round failed.');

    if (!this.endPosted) {
      this.endPosted = true;
      const score = Math.max(0, this.bank + (playerWon ? 300 : 0));
      this.hooks.reportEvent({
        type: 'game_end',
        gameId: this.hooks.gameId,
        score,
        solved: playerWon,
        strikes: this.strikes
      });
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    const key = event.key.toUpperCase();
    if (this.phase === 'ended') return;
    if (key === 'S') {
      this.onSpin();
      return;
    }
    if (key === 'V') {
      this.onBuyVowel();
      return;
    }
    if (key === 'ENTER') {
      this.onSolve();
      return;
    }
    if (key.length === 1 && key >= 'A' && key <= 'Z') {
      this.onPickLetter(key);
    }
  }
}
