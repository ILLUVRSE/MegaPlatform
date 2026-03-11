import type { GameEngine } from '../../game/engine';
import type { GameRuntimeHooks } from '../../game/modules';
import { createSnakeState, queueDirection, stepSnakeState, type SnakeDirection, type SnakeState } from './logic';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const TICK_MS = 120;

function keyToDirection(key: string): SnakeDirection | null {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowup' || normalized === 'w') return 'up';
  if (normalized === 'arrowdown' || normalized === 's') return 'down';
  if (normalized === 'arrowleft' || normalized === 'a') return 'left';
  if (normalized === 'arrowright' || normalized === 'd') return 'right';
  return null;
}

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks): GameEngine {
  target.innerHTML = '';

  const root = document.createElement('section');
  root.className = 'snake-root';

  const hud = document.createElement('div');
  hud.className = 'snake-hud';

  const scoreLabel = document.createElement('strong');
  scoreLabel.className = 'snake-score';

  const statusLabel = document.createElement('span');
  statusLabel.className = 'snake-status';

  const restartButton = document.createElement('button');
  restartButton.className = 'gg-button gg-button--quiet';
  restartButton.type = 'button';
  restartButton.textContent = 'Restart';

  hud.append(scoreLabel, statusLabel, restartButton);

  const board = document.createElement('div');
  board.className = 'snake-board';
  board.style.setProperty('--snake-cols', String(GRID_WIDTH));
  board.style.setProperty('--snake-rows', String(GRID_HEIGHT));

  const cells = new Array<HTMLElement>(GRID_WIDTH * GRID_HEIGHT);
  for (let i = 0; i < cells.length; i += 1) {
    const cell = document.createElement('span');
    cell.className = 'snake-cell';
    board.appendChild(cell);
    cells[i] = cell;
  }

  const controls = document.createElement('div');
  controls.className = 'snake-controls';

  const upButton = document.createElement('button');
  upButton.className = 'gg-button gg-button--quiet';
  upButton.type = 'button';
  upButton.textContent = 'Up';
  const leftButton = document.createElement('button');
  leftButton.className = 'gg-button gg-button--quiet';
  leftButton.type = 'button';
  leftButton.textContent = 'Left';
  const downButton = document.createElement('button');
  downButton.className = 'gg-button gg-button--quiet';
  downButton.type = 'button';
  downButton.textContent = 'Down';
  const rightButton = document.createElement('button');
  rightButton.className = 'gg-button gg-button--quiet';
  rightButton.type = 'button';
  rightButton.textContent = 'Right';

  controls.append(upButton, leftButton, downButton, rightButton);
  root.append(hud, board, controls);
  target.appendChild(root);

  let state: SnakeState = createSnakeState(GRID_WIDTH, GRID_HEIGHT);
  let paused = false;
  let started = false;
  let gameEndReported = false;
  let intervalId: number | null = null;

  const toIndex = (x: number, y: number) => y * GRID_WIDTH + x;

  const render = () => {
    for (const cell of cells) {
      cell.classList.remove('snake-cell--snake', 'snake-cell--head', 'snake-cell--food');
    }

    for (let i = 0; i < state.snake.length; i += 1) {
      const segment = state.snake[i];
      const idx = toIndex(segment.x, segment.y);
      const cell = cells[idx];
      if (!cell) continue;
      cell.classList.add('snake-cell--snake');
      if (i === 0) cell.classList.add('snake-cell--head');
    }

    if (state.food) {
      const foodCell = cells[toIndex(state.food.x, state.food.y)];
      foodCell?.classList.add('snake-cell--food');
    }

    scoreLabel.textContent = `Score: ${state.score}`;
    statusLabel.textContent = state.gameOver ? 'Game Over' : paused ? 'Paused' : 'Running';

    hooks.reportEvent({
      type: 'hud_update',
      gameId: hooks.gameId,
      score: state.score
    });
  };

  const setDirection = (direction: SnakeDirection) => {
    state = queueDirection(state, direction);
  };

  const resetState = () => {
    state = createSnakeState(GRID_WIDTH, GRID_HEIGHT);
    gameEndReported = false;
    paused = false;
    hooks.reportEvent({ type: 'game_start', gameId: hooks.gameId });
    render();
  };

  const tick = () => {
    if (paused || state.gameOver) return;
    state = stepSnakeState(state);
    render();
    if (state.gameOver && !gameEndReported) {
      gameEndReported = true;
      hooks.reportEvent({
        type: 'game_end',
        gameId: hooks.gameId,
        score: state.score,
        outcome: 'game_over'
      });
    }
  };

  const keydownHandler = (event: KeyboardEvent) => {
    const direction = keyToDirection(event.key);
    if (!direction) return;
    event.preventDefault();
    setDirection(direction);
  };

  const bindDirectionButton = (button: HTMLButtonElement, direction: SnakeDirection) => {
    button.addEventListener('click', () => setDirection(direction));
  };

  bindDirectionButton(upButton, 'up');
  bindDirectionButton(leftButton, 'left');
  bindDirectionButton(downButton, 'down');
  bindDirectionButton(rightButton, 'right');

  restartButton.addEventListener('click', () => {
    resetState();
  });

  const ensureTicker = () => {
    if (intervalId !== null) return;
    intervalId = window.setInterval(tick, TICK_MS);
  };

  return {
    init: () => {
      window.addEventListener('keydown', keydownHandler, { passive: false });
      render();
    },
    start: () => {
      if (!started) {
        started = true;
        hooks.reportEvent({ type: 'game_start', gameId: hooks.gameId });
      }
      ensureTicker();
      paused = false;
      render();
    },
    pause: () => {
      paused = true;
      render();
    },
    resume: () => {
      paused = false;
      ensureTicker();
      render();
    },
    reset: () => {
      resetState();
      ensureTicker();
    },
    mute: () => {
      // Snake has no audio.
    },
    destroy: () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      window.removeEventListener('keydown', keydownHandler);
      target.innerHTML = '';
    }
  };
}
