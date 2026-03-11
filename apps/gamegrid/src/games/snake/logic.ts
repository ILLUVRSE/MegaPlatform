export interface SnakeCell {
  x: number;
  y: number;
}

export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export interface SnakeState {
  width: number;
  height: number;
  snake: SnakeCell[];
  direction: SnakeDirection;
  queuedDirection: SnakeDirection | null;
  food: SnakeCell | null;
  score: number;
  gameOver: boolean;
}

const OPPOSITE_DIRECTION: Record<SnakeDirection, SnakeDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

function sameCell(a: SnakeCell, b: SnakeCell): boolean {
  return a.x === b.x && a.y === b.y;
}

function nextHead(head: SnakeCell, direction: SnakeDirection): SnakeCell {
  if (direction === 'up') return { x: head.x, y: head.y - 1 };
  if (direction === 'down') return { x: head.x, y: head.y + 1 };
  if (direction === 'left') return { x: head.x - 1, y: head.y };
  return { x: head.x + 1, y: head.y };
}

export function canTurn(current: SnakeDirection, next: SnakeDirection): boolean {
  return OPPOSITE_DIRECTION[current] !== next;
}

export function queueDirection(state: SnakeState, direction: SnakeDirection): SnakeState {
  if (state.gameOver) return state;
  const activeDirection = state.queuedDirection ?? state.direction;
  if (!canTurn(activeDirection, direction)) return state;
  return { ...state, queuedDirection: direction };
}

export function placeFood(width: number, height: number, snake: readonly SnakeCell[], random = Math.random): SnakeCell | null {
  const openCells: SnakeCell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const occupied = snake.some((segment) => segment.x === x && segment.y === y);
      if (!occupied) openCells.push({ x, y });
    }
  }
  if (openCells.length === 0) return null;
  const index = Math.floor(random() * openCells.length) % openCells.length;
  return openCells[index];
}

export function createSnakeState(width = 20, height = 20, random = Math.random): SnakeState {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const snake: SnakeCell[] = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY }
  ];
  return {
    width,
    height,
    snake,
    direction: 'right',
    queuedDirection: null,
    food: placeFood(width, height, snake, random),
    score: 0,
    gameOver: false
  };
}

export function stepSnakeState(state: SnakeState, random = Math.random): SnakeState {
  if (state.gameOver || state.snake.length === 0) return state;

  const direction = state.queuedDirection ?? state.direction;
  const head = state.snake[0];
  const proposedHead = nextHead(head, direction);
  const ateFood = state.food ? sameCell(proposedHead, state.food) : false;
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitWall =
    proposedHead.x < 0 ||
    proposedHead.x >= state.width ||
    proposedHead.y < 0 ||
    proposedHead.y >= state.height;
  const hitSelf = bodyToCheck.some((segment) => sameCell(segment, proposedHead));

  if (hitWall || hitSelf) {
    return {
      ...state,
      direction,
      queuedDirection: null,
      gameOver: true
    };
  }

  const nextSnake = [proposedHead, ...state.snake];
  if (!ateFood) nextSnake.pop();
  const food = ateFood ? placeFood(state.width, state.height, nextSnake, random) : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction,
    queuedDirection: null,
    food,
    score: ateFood ? state.score + 1 : state.score,
    gameOver: food === null
  };
}
