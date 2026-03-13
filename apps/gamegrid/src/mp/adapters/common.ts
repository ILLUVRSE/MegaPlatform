import type { MpAdapterInitContext } from '../mpAdapter';

export type PlayerIndex = 0 | 1;

export interface AdapterPlayers {
  hostPlayerId: string;
  localPlayerIndex: number;
  playerIdsByIndex: [string, string];
}

export interface InputEnvelope<TInput> {
  fromPlayerId?: string;
  input?: TInput;
}

export interface ParsedInputEnvelope<TInput> {
  fromPlayerId?: string;
  input: TInput;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readNumber(value: unknown, fallback: number, min?: number, max?: number): number {
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw)) return fallback;
  if (min === undefined && max === undefined) return raw;
  return clamp(raw, min ?? raw, max ?? raw);
}

export function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function readInputEnvelope(msg: unknown): ParsedInputEnvelope<Record<string, unknown>> | null {
  if (!isRecord(msg)) return null;
  const inputRaw = 'input' in msg ? (msg as Record<string, unknown>).input : msg;
  if (!isRecord(inputRaw)) return null;
  const fromPlayerId = typeof (msg as Record<string, unknown>).fromPlayerId === 'string'
    ? String((msg as Record<string, unknown>).fromPlayerId)
    : undefined;
  return { fromPlayerId, input: inputRaw };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function safePlayerIndex(value: unknown): PlayerIndex | null {
  return value === 0 || value === 1 ? value : null;
}

export function normalizePlayers(context: MpAdapterInitContext): AdapterPlayers {
  const hostPlayerId = String(context.options?.hostPlayerId ?? context.playerId);
  const optionPlayerIndex = Number(context.options?.playerIndex);
  const localPlayerIndex = Number.isInteger(optionPlayerIndex) ? optionPlayerIndex : -1;

  const players = Array.isArray(context.options?.playerIds) ? (context.options?.playerIds as unknown[]) : [];
  const playerIdsByIndex: [string, string] = [String(players[0] ?? ''), String(players[1] ?? '')];

  if (!playerIdsByIndex[0]) {
    playerIdsByIndex[0] = hostPlayerId;
  }

  if (localPlayerIndex === 0 || localPlayerIndex === 1) {
    playerIdsByIndex[localPlayerIndex] = context.playerId;
  }

  return {
    hostPlayerId,
    localPlayerIndex,
    playerIdsByIndex
  };
}

export function resolveSlotByPlayerId(playerIdsByIndex: [string, string], playerId: string): PlayerIndex | null {
  if (!playerId) return null;
  if (playerIdsByIndex[0] === playerId) return 0;
  if (playerIdsByIndex[1] === playerId) return 1;
  return null;
}

export function validateRemoteFromKnownPlayer(
  playerIdsByIndex: [string, string],
  fromPlayerId: string | undefined,
  hostPlayerId?: string,
  requireHostPlayer = false
): boolean {
  if (typeof fromPlayerId !== 'string' || fromPlayerId.length === 0) return false;
  if (requireHostPlayer) {
    return typeof hostPlayerId === 'string' && hostPlayerId.length > 0 && fromPlayerId === hostPlayerId;
  }
  return resolveSlotByPlayerId(playerIdsByIndex, fromPlayerId) !== null;
}

export function readStringOption(options: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const raw = options?.[key];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : fallback;
}

export function readNumberOption(options: Record<string, unknown> | undefined, key: string, fallback: number): number {
  const raw = Number(options?.[key]);
  return Number.isFinite(raw) ? raw : fallback;
}

export function seedStep(seedRef: { value: number }): number {
  let x = seedRef.value | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  seedRef.value = x;
  return (x >>> 0) / 0xffffffff;
}
