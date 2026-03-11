import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { cameraShake, triggerHaptic } from '../../systems/gameplayComfort';
import { nextHitStreak, pushImpact, tickImpacts, type ImpactPulse } from './feedback';

interface BattleshipSceneConfig {
  hooks: GameRuntimeHooks;
}

type CellState = 0 | 1 | 2 | 3;

const GRID_SIZE = 8;
const CELL = 44;
const PLAYER_ORIGIN = { x: 90, y: 150 };
const ENEMY_ORIGIN = { x: 740, y: 150 };
const SHIP_LENGTHS = [4, 3, 3, 2, 2] as const;

function makeBoard(): CellState[][] {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0));
}

function inside(row: number, col: number): boolean {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

function hasShipsRemaining(board: readonly CellState[][]): boolean {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] === 1) return true;
    }
  }
  return false;
}

function cellToScreen(origin: { x: number; y: number }, row: number, col: number): { x: number; y: number } {
  return { x: origin.x + col * CELL, y: origin.y + row * CELL };
}

export class BattleshipScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private readonly coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  private playerBoard: CellState[][] = makeBoard();
  private enemyBoard: CellState[][] = makeBoard();

  private playerTurn = true;
  private gameOver = false;
  private endPosted = false;
  private aiDelayMs = 0;

  private readonly aiQueuedTargets: Array<{ row: number; col: number }> = [];

  private boardGfx!: Phaser.GameObjects.Graphics;
  private textStatus!: Phaser.GameObjects.Text;
  private textStats!: Phaser.GameObjects.Text;
  private textFeedback!: Phaser.GameObjects.Text;
  private hoverEnemyRow = -1;
  private hoverEnemyCol = -1;
  private streak = 0;
  private impacts: ImpactPulse[] = [];

  constructor(config: BattleshipSceneConfig) {
    super('battleship-main');
    this.hooks = config.hooks;
  }

  create() {
    this.boardGfx = this.add.graphics();
    this.add.text(28, 18, 'Battleship', { color: '#f5fbff', fontSize: '32px' });
    this.textStats = this.add.text(28, 58, '', { color: '#cfe6ff', fontSize: '20px' });
    this.textStatus = this.add.text(28, 90, '', { color: '#ffd88b', fontSize: '20px' });
    this.textFeedback = this.add.text(28, 116, '', { color: '#a2ffc3', fontSize: '18px' });
    this.add.text(PLAYER_ORIGIN.x + 8, PLAYER_ORIGIN.y - 31, 'Your Fleet', {
      color: '#caecff',
      fontSize: '16px'
    });
    this.add.text(ENEMY_ORIGIN.x + 8, ENEMY_ORIGIN.y - 31, 'Enemy Waters', {
      color: '#caecff',
      fontSize: '16px'
    });

    this.add
      .text(28, 124, 'New Match', { color: '#041722', backgroundColor: '#91d7ff', fontSize: '20px' })
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startNewMatch());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer.x, pointer.y));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.updateHover(pointer.x, pointer.y));
    this.input.keyboard?.on('keydown-R', () => this.startNewMatch());

    this.startNewMatch();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
  }

  update(_time: number, deltaMs: number) {
    tickImpacts(this.impacts, deltaMs);
    this.drawBoards();
    this.refreshHud();

    if (!this.playerTurn && !this.gameOver) {
      this.aiDelayMs -= deltaMs;
      if (this.aiDelayMs <= 0) {
        this.runAiTurn();
      }
    }
  }

  private startNewMatch() {
    this.playerBoard = makeBoard();
    this.enemyBoard = makeBoard();
    this.playerTurn = true;
    this.gameOver = false;
    this.endPosted = false;
    this.aiDelayMs = 0;
    this.aiQueuedTargets.length = 0;
    this.hoverEnemyRow = -1;
    this.hoverEnemyCol = -1;
    this.streak = 0;
    this.impacts.length = 0;
    this.textFeedback.setText('Tip: acquire target and fire.');

    this.placeFleetRandom(this.playerBoard);
    this.placeFleetRandom(this.enemyBoard);

    this.hooks.reportEvent({ type: 'game_start', gameId: this.hooks.gameId, mode: 'classic' });
  }

  private placeFleetRandom(board: CellState[][]) {
    for (const shipLen of SHIP_LENGTHS) {
      let placed = false;
      for (let attempts = 0; attempts < 200 && !placed; attempts += 1) {
        const vertical = Math.random() < 0.5;
        const startRow = Math.floor(Math.random() * GRID_SIZE);
        const startCol = Math.floor(Math.random() * GRID_SIZE);

        let valid = true;
        for (let i = 0; i < shipLen; i += 1) {
          const row = startRow + (vertical ? i : 0);
          const col = startCol + (vertical ? 0 : i);
          if (!inside(row, col) || board[row][col] !== 0) {
            valid = false;
            break;
          }
        }

        if (!valid) continue;

        for (let i = 0; i < shipLen; i += 1) {
          const row = startRow + (vertical ? i : 0);
          const col = startCol + (vertical ? 0 : i);
          board[row][col] = 1;
        }

        placed = true;
      }
    }
  }

  private handlePointer(x: number, y: number) {
    if (!this.playerTurn || this.gameOver) return;

    const col = Math.floor((x - ENEMY_ORIGIN.x) / CELL);
    const row = Math.floor((y - ENEMY_ORIGIN.y) / CELL);
    if (!inside(row, col)) return;

    const state = this.enemyBoard[row][col];
    if (state === 2 || state === 3) return;

    const hit = this.fireAt(this.enemyBoard, row, col);
    this.registerImpact('enemy', row, col, hit);
    if (!hasShipsRemaining(this.enemyBoard)) {
      this.finishGame(true);
      return;
    }

    if (hit) {
      this.streak = nextHitStreak(this.streak, hit);
      this.textFeedback.setText(this.streak > 1 ? `Great: direct hit x${this.streak}. Fire again.` : 'Great: direct hit. Fire again.');
      cameraShake(this, 90, 0.0022);
      triggerHaptic(10);
    } else {
      this.streak = nextHitStreak(this.streak, hit);
      this.textFeedback.setText('Alert: splash. Enemy turn.');
      triggerHaptic(8);
      this.playerTurn = false;
      this.aiDelayMs = 420;
    }
  }

  private updateHover(x: number, y: number) {
    if (this.coarsePointer) return;
    const col = Math.floor((x - ENEMY_ORIGIN.x) / CELL);
    const row = Math.floor((y - ENEMY_ORIGIN.y) / CELL);
    if (!inside(row, col) || !this.playerTurn || this.gameOver) {
      this.hoverEnemyRow = -1;
      this.hoverEnemyCol = -1;
      return;
    }
    this.hoverEnemyRow = row;
    this.hoverEnemyCol = col;
  }

  private fireAt(board: CellState[][], row: number, col: number): boolean {
    if (board[row][col] === 1) {
      board[row][col] = 3;
      return true;
    }

    if (board[row][col] === 0) {
      board[row][col] = 2;
    }

    return false;
  }

  private runAiTurn() {
    if (this.playerTurn || this.gameOver) return;

    const target = this.pickAiTarget();
    if (!target) {
      this.playerTurn = true;
      return;
    }

    const hit = this.fireAt(this.playerBoard, target.row, target.col);
    this.registerImpact('player', target.row, target.col, hit);
    if (hit) {
      this.enqueueAiNeighbors(target.row, target.col);
      this.textFeedback.setText('Alert: enemy hit your fleet.');
      cameraShake(this, 110, 0.0028);
    }

    if (!hasShipsRemaining(this.playerBoard)) {
      this.finishGame(false);
      return;
    }

    if (hit) {
      this.aiDelayMs = 300;
    } else {
      this.textFeedback.setText('Great: enemy missed. Your turn.');
      this.playerTurn = true;
    }
  }

  private registerImpact(side: 'player' | 'enemy', row: number, col: number, hit: boolean) {
    pushImpact(this.impacts, { side, row, col, hit, lifeMs: 620 }, 24);
  }

  private pickAiTarget(): { row: number; col: number } | null {
    while (this.aiQueuedTargets.length > 0) {
      const target = this.aiQueuedTargets.shift();
      if (!target) break;
      const state = this.playerBoard[target.row][target.col];
      if (state === 0 || state === 1) return target;
    }

    const available: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const state = this.playerBoard[row][col];
        if (state === 0 || state === 1) available.push({ row, col });
      }
    }

    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  private enqueueAiNeighbors(row: number, col: number) {
    const neighbors = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 }
    ];

    for (const next of neighbors) {
      if (!inside(next.row, next.col)) continue;
      const state = this.playerBoard[next.row][next.col];
      if (state === 0 || state === 1) {
        this.aiQueuedTargets.push(next);
      }
    }
  }

  private finishGame(playerWon: boolean) {
    this.gameOver = true;

    if (!this.endPosted) {
      this.endPosted = true;
      const playerHealth = this.remainingShipCells(this.playerBoard);
      const score = Math.max(0, playerHealth * 10 + (playerWon ? 200 : 25));
      triggerHaptic(playerWon ? [16, 18, 20] : [12, 10]);
      this.hooks.reportEvent({
        type: 'game_end',
        gameId: this.hooks.gameId,
        score,
        winner: playerWon ? 'player' : 'ai'
      });
    }
  }

  private remainingShipCells(board: readonly CellState[][]): number {
    let remaining = 0;
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (board[row][col] === 1) remaining += 1;
      }
    }
    return remaining;
  }

  private drawGrid(origin: { x: number; y: number }, board: readonly CellState[][], revealShips: boolean) {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const state = board[row][col];
        const pos = cellToScreen(origin, row, col);

        let fill = 0x0f3040;
        if (state === 1 && revealShips) fill = 0x5d8194;
        if (state === 2) fill = 0x25485b;
        if (state === 3) fill = 0x8b2f2a;

        this.boardGfx.fillStyle(fill, 1);
        this.boardGfx.fillRect(pos.x + 1, pos.y + 1, CELL - 2, CELL - 2);

        this.boardGfx.lineStyle(1, 0x5a93af, 0.45);
        this.boardGfx.strokeRect(pos.x, pos.y, CELL, CELL);

        if (state === 2) {
          this.boardGfx.fillStyle(0x9dd7f3, 0.9);
          this.boardGfx.fillCircle(pos.x + CELL / 2, pos.y + CELL / 2, 5);
        }
        if (state === 3) {
          this.boardGfx.lineStyle(3, 0xffd8c6, 1);
          this.boardGfx.strokeLineShape(new Phaser.Geom.Line(pos.x + 8, pos.y + 8, pos.x + CELL - 8, pos.y + CELL - 8));
          this.boardGfx.strokeLineShape(new Phaser.Geom.Line(pos.x + CELL - 8, pos.y + 8, pos.x + 8, pos.y + CELL - 8));
        }
      }
    }
  }

  private drawBoards() {
    this.boardGfx.clear();

    this.drawGridHeaders();

    this.drawGrid(PLAYER_ORIGIN, this.playerBoard, true);
    this.drawGrid(ENEMY_ORIGIN, this.enemyBoard, this.gameOver);
    this.drawImpactPulses();

    if (!this.coarsePointer && inside(this.hoverEnemyRow, this.hoverEnemyCol) && this.playerTurn && !this.gameOver) {
      const p = cellToScreen(ENEMY_ORIGIN, this.hoverEnemyRow, this.hoverEnemyCol);
      this.boardGfx.lineStyle(2, 0xb6ecff, 0.85);
      this.boardGfx.strokeRect(p.x + 2, p.y + 2, CELL - 4, CELL - 4);
    }
  }

  private drawImpactPulses() {
    for (const impact of this.impacts) {
      const origin = impact.side === 'player' ? PLAYER_ORIGIN : ENEMY_ORIGIN;
      const pos = cellToScreen(origin, impact.row, impact.col);
      const alpha = Math.max(0, Math.min(1, impact.lifeMs / 620));
      this.boardGfx.lineStyle(3, impact.hit ? 0xffe29f : 0x96d8ff, alpha);
      this.boardGfx.strokeCircle(pos.x + CELL * 0.5, pos.y + CELL * 0.5, (1 - alpha) * 14 + 8);
    }
  }

  private drawGridHeaders() {
    this.boardGfx.fillStyle(0xffffff, 0.9);
    this.boardGfx.fillRect(PLAYER_ORIGIN.x, PLAYER_ORIGIN.y - 34, 190, 24);
    this.boardGfx.fillRect(ENEMY_ORIGIN.x, ENEMY_ORIGIN.y - 34, 210, 24);
    this.boardGfx.fillStyle(0x001018, 1);
    this.boardGfx.fillRect(PLAYER_ORIGIN.x + 1, PLAYER_ORIGIN.y - 33, 188, 22);
    this.boardGfx.fillRect(ENEMY_ORIGIN.x + 1, ENEMY_ORIGIN.y - 33, 208, 22);

    this.boardGfx.lineStyle(2, 0x79b8d9, 0.9);
    this.boardGfx.strokeRect(PLAYER_ORIGIN.x, PLAYER_ORIGIN.y - 34, 190, 24);
    this.boardGfx.strokeRect(ENEMY_ORIGIN.x, ENEMY_ORIGIN.y - 34, 210, 24);
  }

  private refreshHud() {
    const myRemaining = this.remainingShipCells(this.playerBoard);
    const enemyRemaining = this.remainingShipCells(this.enemyBoard);
    this.textStats.setText(`Ship Cells Remaining: You ${myRemaining}  |  Enemy ${enemyRemaining}`);

    if (this.gameOver) {
      if (enemyRemaining === 0) {
        this.textStatus.setText('Victory. Enemy fleet sunk. Press New Match or R.');
      } else {
        this.textStatus.setText('Defeat. Your fleet is gone. Press New Match or R.');
      }
      return;
    }

    if (this.playerTurn) {
      this.textStatus.setText('Your turn: click a tile on Enemy Waters.');
    } else {
      this.textStatus.setText('Enemy turn: incoming salvo...');
    }
  }
}
