import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { cameraShake, triggerHaptic } from '../../systems/gameplayComfort';

type Side = 1 | 2;

interface CheckersPiece {
  id: number;
  row: number;
  col: number;
  side: Side;
  king: boolean;
  captured: boolean;
}

interface MoveOption {
  pieceId: number;
  toRow: number;
  toCol: number;
  captureId: number | null;
}

interface CheckersSceneConfig {
  hooks: GameRuntimeHooks;
}

const BOARD_SIZE = 8;
const CELL = 72;
const BOARD_LEFT = 352;
const BOARD_TOP = 72;

function insideBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function opposite(side: Side): Side {
  return side === 1 ? 2 : 1;
}

function directionsFor(piece: CheckersPiece): Array<{ dr: number; dc: number }> {
  if (piece.king) {
    return [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 }
    ];
  }
  return piece.side === 1
    ? [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 }
      ]
    : [
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 }
      ];
}

function pieceAt(pieces: readonly CheckersPiece[], row: number, col: number): CheckersPiece | null {
  return pieces.find((piece) => !piece.captured && piece.row === row && piece.col === col) ?? null;
}

function createInitialPieces(): CheckersPiece[] {
  const pieces: CheckersPiece[] = [];
  let id = 1;

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 1) {
        pieces.push({ id: id++, row, col, side: 2, king: false, captured: false });
      }
    }
  }

  for (let row = 5; row < 8; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 1) {
        pieces.push({ id: id++, row, col, side: 1, king: false, captured: false });
      }
    }
  }

  return pieces;
}

export class CheckersScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private pieces: CheckersPiece[] = [];
  private turn: Side = 1;
  private selectedPieceId: number | null = null;
  private legalMovesForTurn: MoveOption[] = [];
  private endPosted = false;
  private aiDelayMs = 0;
  private readonly coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  private hoverRow = -1;
  private hoverCol = -1;
  private feedbackMessage = '';
  private feedbackMs = 0;

  private boardGfx!: Phaser.GameObjects.Graphics;
  private highlightGfx!: Phaser.GameObjects.Graphics;
  private piecesGfx!: Phaser.GameObjects.Graphics;

  private statusText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;

  constructor(config: CheckersSceneConfig) {
    super('checkers-main');
    this.hooks = config.hooks;
  }

  create() {
    this.boardGfx = this.add.graphics();
    this.highlightGfx = this.add.graphics();
    this.piecesGfx = this.add.graphics();

    this.turnText = this.add.text(24, 22, '', { color: '#f8f8f8', fontSize: '28px' });
    this.scoreText = this.add.text(24, 58, '', { color: '#dbe8ff', fontSize: '20px' });
    this.statusText = this.add.text(24, 92, '', { color: '#ffd786', fontSize: '20px' });

    this.add
      .text(24, 140, 'New Match', { color: '#0b1a22', fontSize: '20px', backgroundColor: '#9ad0ff' })
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startNewMatch());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer.x, pointer.y));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer.x, pointer.y));
    this.input.keyboard?.on('keydown-R', () => this.startNewMatch());

    this.startNewMatch();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
  }

  update(_time: number, deltaMs: number) {
    this.drawBoard();
    this.drawHighlights();
    this.drawPieces();
    this.refreshHud();
    this.feedbackMs = Math.max(0, this.feedbackMs - deltaMs);

    if (this.turn === 2 && !this.isGameOver()) {
      this.aiDelayMs -= deltaMs;
      if (this.aiDelayMs <= 0) {
        this.runAiTurn();
      }
    }
  }

  private startNewMatch() {
    this.pieces = createInitialPieces();
    this.turn = 1;
    this.selectedPieceId = null;
    this.endPosted = false;
    this.aiDelayMs = 700;
    this.feedbackMessage = 'Opening move: take center control.';
    this.feedbackMs = 1800;
    this.recomputeTurnMoves();

    this.hooks.reportEvent({ type: 'game_start', gameId: this.hooks.gameId, mode: 'vs-ai' });
  }

  private onPointerDown(x: number, y: number) {
    if (this.turn !== 1 || this.isGameOver()) return;

    const col = Math.floor((x - BOARD_LEFT) / CELL);
    const row = Math.floor((y - BOARD_TOP) / CELL);
    if (!insideBoard(row, col)) return;

    const piece = pieceAt(this.pieces, row, col);
    const selectedMoves = this.legalMovesForTurn.filter((move) => move.pieceId === this.selectedPieceId);
    const destination = selectedMoves.find((move) => move.toRow === row && move.toCol === col);

    if (destination) {
      this.applyMove(destination);
      return;
    }

    if (piece && piece.side === 1) {
      const hasMove = this.legalMovesForTurn.some((move) => move.pieceId === piece.id);
      this.selectedPieceId = hasMove ? piece.id : null;
      if (!hasMove) {
        this.feedbackMessage = 'Tip: that piece is blocked. Pick a movable piece.';
        this.feedbackMs = 1100;
      }
      return;
    }

    this.feedbackMessage = 'Tip: choose one of your red pieces.';
    this.feedbackMs = 900;
    this.selectedPieceId = null;
  }

  private onPointerMove(x: number, y: number) {
    if (this.coarsePointer) return;
    const col = Math.floor((x - BOARD_LEFT) / CELL);
    const row = Math.floor((y - BOARD_TOP) / CELL);
    if (!insideBoard(row, col)) {
      this.hoverRow = -1;
      this.hoverCol = -1;
      return;
    }
    this.hoverRow = row;
    this.hoverCol = col;
  }

  private isGameOver(): boolean {
    return this.winner() !== null;
  }

  private winner(): Side | null {
    const side1Pieces = this.pieces.filter((piece) => !piece.captured && piece.side === 1).length;
    const side2Pieces = this.pieces.filter((piece) => !piece.captured && piece.side === 2).length;

    if (side1Pieces === 0) return 2;
    if (side2Pieces === 0) return 1;

    if (this.legalMovesForTurn.length === 0) {
      return opposite(this.turn);
    }

    return null;
  }

  private recomputeTurnMoves() {
    const allMoves = this.computeMovesForSide(this.turn);
    this.legalMovesForTurn = allMoves;

    if (this.selectedPieceId !== null) {
      const selectedStillHasMove = allMoves.some((move) => move.pieceId === this.selectedPieceId);
      if (!selectedStillHasMove) this.selectedPieceId = null;
    }

    const winSide = this.winner();
    if (winSide !== null && !this.endPosted) {
      this.endPosted = true;
      const myPieces = this.pieces.filter((piece) => !piece.captured && piece.side === 1).length;
      const aiPieces = this.pieces.filter((piece) => !piece.captured && piece.side === 2).length;
      const score = Math.max(0, 100 + (myPieces - aiPieces) * 10 + (winSide === 1 ? 150 : 0));
      this.hooks.reportEvent({ type: 'game_end', gameId: this.hooks.gameId, score, winner: winSide === 1 ? 'player' : 'ai' });
    }
  }

  private computeMovesForSide(side: Side): MoveOption[] {
    const captures: MoveOption[] = [];
    const normals: MoveOption[] = [];

    for (const piece of this.pieces) {
      if (piece.captured || piece.side !== side) continue;
      const dirs = directionsFor(piece);

      for (const dir of dirs) {
        const stepRow = piece.row + dir.dr;
        const stepCol = piece.col + dir.dc;
        if (!insideBoard(stepRow, stepCol)) continue;

        const stepPiece = pieceAt(this.pieces, stepRow, stepCol);
        if (!stepPiece) {
          normals.push({ pieceId: piece.id, toRow: stepRow, toCol: stepCol, captureId: null });
          continue;
        }

        if (stepPiece.side === piece.side) continue;

        const jumpRow = stepRow + dir.dr;
        const jumpCol = stepCol + dir.dc;
        if (!insideBoard(jumpRow, jumpCol)) continue;
        if (pieceAt(this.pieces, jumpRow, jumpCol)) continue;

        captures.push({ pieceId: piece.id, toRow: jumpRow, toCol: jumpCol, captureId: stepPiece.id });
      }
    }

    return captures.length > 0 ? captures : normals;
  }

  private applyMove(move: MoveOption) {
    const piece = this.pieces.find((entry) => entry.id === move.pieceId);
    if (!piece) return;
    const wasKing = piece.king;

    piece.row = move.toRow;
    piece.col = move.toCol;

    if (!piece.king) {
      if (piece.side === 1 && piece.row === 0) piece.king = true;
      if (piece.side === 2 && piece.row === BOARD_SIZE - 1) piece.king = true;
    }

    let continuedCapture = false;
    if (move.captureId !== null) {
      const captured = this.pieces.find((entry) => entry.id === move.captureId);
      if (captured) captured.captured = true;

      const nextCaptures = this.computeMovesForPiece(piece.id).filter((option) => option.captureId !== null);
      if (nextCaptures.length > 0) {
        this.selectedPieceId = piece.id;
        this.legalMovesForTurn = nextCaptures;
        continuedCapture = true;
      }
      cameraShake(this, 80, 0.0022);
      triggerHaptic([12, 10]);
      this.feedbackMessage = continuedCapture ? 'Great: multi-jump available. Continue with the same piece.' : 'Great: capture landed.';
      this.feedbackMs = 1200;
    } else {
      triggerHaptic(6);
    }

    if (!continuedCapture) {
      this.turn = opposite(this.turn);
      this.selectedPieceId = null;
      this.recomputeTurnMoves();
      if (this.turn === 2) this.aiDelayMs = 550;
      if (!wasKing && piece.king) {
        this.feedbackMessage = 'Great: king me. That piece can move both directions now.';
        this.feedbackMs = 1600;
        triggerHaptic([10, 14]);
      }
    }
  }

  private computeMovesForPiece(pieceId: number): MoveOption[] {
    const piece = this.pieces.find((entry) => entry.id === pieceId);
    if (!piece || piece.captured) return [];

    const sideMoves = this.computeMovesForSide(piece.side);
    return sideMoves.filter((move) => move.pieceId === pieceId);
  }

  private runAiTurn() {
    if (this.turn !== 2 || this.isGameOver()) return;

    const moves = this.computeMovesForSide(2);
    if (moves.length === 0) {
      this.legalMovesForTurn = [];
      this.recomputeTurnMoves();
      return;
    }

    const captures = moves.filter((move) => move.captureId !== null);
    const pool = captures.length > 0 ? captures : moves;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    this.legalMovesForTurn = moves;
    this.selectedPieceId = choice.pieceId;
    this.applyMove(choice);
    this.aiDelayMs = 260 + Math.random() * 240;

    if (this.turn === 2 && !this.isGameOver()) {
      this.aiDelayMs = 260 + Math.random() * 260;
    }
  }

  private drawBoard() {
    this.boardGfx.clear();

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const x = BOARD_LEFT + col * CELL;
        const y = BOARD_TOP + row * CELL;
        const dark = (row + col) % 2 === 1;
        this.boardGfx.fillStyle(dark ? 0x2b1d14 : 0xe9d6b8, 1);
        this.boardGfx.fillRect(x, y, CELL, CELL);
      }
    }

    this.boardGfx.lineStyle(3, 0x111111, 0.8);
    this.boardGfx.strokeRect(BOARD_LEFT, BOARD_TOP, BOARD_SIZE * CELL, BOARD_SIZE * CELL);
  }

  private drawHighlights() {
    this.highlightGfx.clear();

    if (!this.coarsePointer && insideBoard(this.hoverRow, this.hoverCol)) {
      this.highlightGfx.lineStyle(2, 0xa5d4ff, 0.4);
      this.highlightGfx.strokeRect(BOARD_LEFT + this.hoverCol * CELL + 2, BOARD_TOP + this.hoverRow * CELL + 2, CELL - 4, CELL - 4);
    }

    if (this.selectedPieceId !== null) {
      const piece = this.pieces.find((entry) => entry.id === this.selectedPieceId);
      if (piece && !piece.captured) {
        this.highlightGfx.lineStyle(4, 0x5ee7ff, 0.95);
        this.highlightGfx.strokeRect(BOARD_LEFT + piece.col * CELL + 4, BOARD_TOP + piece.row * CELL + 4, CELL - 8, CELL - 8);
      }

      const moves = this.legalMovesForTurn.filter((move) => move.pieceId === this.selectedPieceId);
      for (const move of moves) {
        const cx = BOARD_LEFT + move.toCol * CELL + CELL / 2;
        const cy = BOARD_TOP + move.toRow * CELL + CELL / 2;
        this.highlightGfx.fillStyle(move.captureId !== null ? 0xffb347 : 0x7bf1a8, 0.7);
        this.highlightGfx.fillCircle(cx, cy, 12);
      }
    }
  }

  private drawPieces() {
    this.piecesGfx.clear();

    for (const piece of this.pieces) {
      if (piece.captured) continue;
      const cx = BOARD_LEFT + piece.col * CELL + CELL / 2;
      const cy = BOARD_TOP + piece.row * CELL + CELL / 2;

      this.piecesGfx.fillStyle(piece.side === 1 ? 0xdb4d4d : 0x232323, 1);
      this.piecesGfx.fillCircle(cx, cy, 26);
      this.piecesGfx.lineStyle(2, 0xf4f4f4, 0.35);
      this.piecesGfx.strokeCircle(cx, cy, 26);

      if (piece.king) {
        this.piecesGfx.fillStyle(0xffe27a, 1);
        this.piecesGfx.fillCircle(cx, cy, 9);
      }
    }
  }

  private refreshHud() {
    const myPieces = this.pieces.filter((piece) => !piece.captured && piece.side === 1).length;
    const aiPieces = this.pieces.filter((piece) => !piece.captured && piece.side === 2).length;
    this.turnText.setText(`Checkers  |  ${this.turn === 1 ? 'Your Turn' : 'AI Turn'}`);
    this.scoreText.setText(`Pieces: You ${myPieces}  -  AI ${aiPieces}`);

    const winSide = this.winner();
    if (winSide === 1) {
      this.statusText.setText('You win. Press New Match or R to play again.');
    } else if (winSide === 2) {
      this.statusText.setText('AI wins. Press New Match or R to rematch.');
    } else if (this.feedbackMs > 0) {
      this.statusText.setText(this.feedbackMessage);
    } else if (this.turn === 1) {
      const captureForced = this.legalMovesForTurn.some((move) => move.captureId !== null);
      this.statusText.setText(captureForced ? 'Capture is available. Select the piece that can jump.' : 'Select a piece, then click a highlighted destination.');
    } else {
      this.statusText.setText('AI is thinking...');
    }
  }
}
