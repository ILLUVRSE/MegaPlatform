import { createInitialProfile, type OutcomeDelta, type StarlightProfile } from '../../games/starlight-chronicles/rules';
import { loadItemsCatalog } from '../../games/starlight-chronicles/economy/inventory';
import { resolveMissionForNode, applyCrewExploreModifier } from '../../games/starlight-chronicles/run/nodeResolvers';
import { loadMissions } from '../../games/starlight-chronicles/combat/enemyPatterns';
import { addCrewToRoster, generateRecruitmentPool } from '../../games/starlight-chronicles/crew/crewGen';
import { createRunSnapshot, type RunSnapshot } from '../../games/starlight-chronicles/run/runSnapshot';
import { createRunState, deterministicNodeSeed, selectableNodeIds, startNode, completeNode, applyRunNodeOutcome } from '../../games/starlight-chronicles/run/runRules';
import { generateStarMap } from '../../games/starlight-chronicles/run/runGen';
import type { NodeType, RunNodeResult, RunState, StarMapGraph, StarMapNode } from '../../games/starlight-chronicles/run/runTypes';
import { createSeededRng, hashStringToSeed } from '../../games/starlight-chronicles/rng';
import { loadUniverse } from '../../games/starlight-chronicles/world/universe';
import { ensureHullState, loadHullCatalog, switchHull } from '../../games/starlight-chronicles/ship/hulls';
import { applyHullCosmetic, ensureCosmetics, loadCosmeticsCatalog } from '../../games/starlight-chronicles/ship/cosmetics';
import { loadWingmen } from '../../games/starlight-chronicles/fleet/wingmen';
import { loadDrones } from '../../games/starlight-chronicles/fleet/drone';
import { computeFrontlineState, type FrontlineState } from '../../games/starlight-chronicles/world/frontline';
import { weekKeyUtc } from '../../games/starlight-chronicles/world/time';
import { loadMarketShocks, selectWeeklyShockIds } from '../../games/starlight-chronicles/economy/marketSim';
import { applyDeterministicDamageRoll, fieldRepairSystem } from '../../games/starlight-chronicles/ship/shipDamage';
import {
  applyDamageIntentToBoss,
  computeBossStateChecksum,
  computeDamageIntentChecksum,
  createSharedBossState,
  deriveAttackId,
  type DamageIntentPayload,
  type SharedBossState,
  validateDamageIntentChecksum,
  validateDamageIntentEnvelope,
  scoreContribution
} from '../../games/starlight-chronicles/combat/coopBoss';
import {
  activeDamageMultiplier,
  castSupportAbility,
  cleanupExpiredBuffs,
  createSupportAbilityState,
  hasPatchFieldSupport,
  type ActiveAbilityBuff,
  type SupportAbilityId,
  type SupportAbilityState
} from '../../games/starlight-chronicles/combat/supportAbilities';
import { allowRate, type RateGateState } from '../../games/starlight-chronicles/combat/coopNet';
import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';

const STARLIGHT_COOP_VERSION = 1;
const VOTE_TIMER_MS = 15000;
const MAX_MSG_PER_SECOND = 24;
const MAX_DMG_INTENTS_PER_SECOND = 10;
const COMBAT_TIMEOUT_MS = 52000;
const BOSS_SYNC_INTERVAL_MS = 200;
const DOWNED_REVIVE_MS = 8000;

type CoopPhase = 'lobby' | 'map' | 'node' | 'combat' | 'results' | 'end';
type VoteScope = 'node' | 'choice';
type PlayerLifeState = 'alive' | 'downed';

interface CoopPlayerState {
  playerId: string;
  seat: number;
  ready: boolean;
  spectator: boolean;
  connected: boolean;
  lastInputMs: number;
  msgWindowStartMs: number;
  msgCountWindow: number;
  dmgRateGate: RateGateState;
}

interface VoteState {
  scope: VoteScope;
  nodeId: string | null;
  options: string[];
  startedAtMs: number;
  endsAtMs: number;
  votes: Record<string, string>;
}

interface CombatContribution {
  bossDamage: number;
  teamScore: number;
  supportCasts: number;
  survived: boolean;
}

interface CombatSession {
  missionId: string;
  nodeId: string;
  seed: number;
  scheduleSeed: number;
  startedAtMs: number;
  timeoutAtMs: number;
  boss: SharedBossState;
  abilities: SupportAbilityState;
  contributions: Record<string, CombatContribution>;
  playerState: Record<string, { state: PlayerLifeState; changedAtMs: number }>;
  rejections: Record<string, string>;
  recentDamageByPlayer: Record<string, number>;
  lastBossSyncAtMs: number;
  escortMission: boolean;
  convoyMaxHp: number;
  convoyHp: number;
}

interface CoopSessionConfig {
  sessionId: string;
  seed: number;
  voteNodeSelection: boolean;
  teamWallet: boolean;
  hostCanOverride: boolean;
  roundRobinDistribution: boolean;
}

export interface CombatResultPayload {
  v: number;
  type: 'combat_result';
  playerId: string;
  missionId: string;
  score: number;
  kills: number;
  damageTaken: number;
  survived: boolean;
  bossPhaseReached: number;
  checksum: number;
}

export interface StarlightVoteCastMessage {
  v: number;
  type: 'vote_cast';
  playerId: string;
  nodeId: string;
  choiceId: string;
}

interface StarlightReadyMessage {
  v: number;
  type: 'ready_status';
  ready: boolean;
}

interface StarlightHostOverrideMessage {
  v: number;
  type: 'host_override';
  action: 'pick_node' | 'pick_choice' | 'skip_timer' | 'toggle_team_wallet' | 'toggle_vote_mode';
  optionId?: string;
}

interface StarlightSnapshotRequestMessage {
  v: number;
  type: 'snapshot_request';
}

interface StarlightShipConfigMessage {
  v: number;
  type: 'ship_config';
  playerId: string;
  activeHullId?: string;
  skinKey?: string;
  decalKey?: string;
  trailKey?: string;
  activeWingmenIds?: string[];
  activeDroneId?: string | null;
}

interface StarlightConvoyDamageMessage {
  v: number;
  type: 'convoy_damage';
  playerId: string;
  missionId: string;
  t: number;
  amount: number;
}

export interface AbilityCastPayload {
  v: number;
  type: 'ability_cast';
  playerId: string;
  missionId: string;
  abilityId: SupportAbilityId;
  t: number;
}

export interface PlayerStatePayload {
  v: number;
  type: 'player_state';
  playerId: string;
  missionId: string;
  state: PlayerLifeState;
  t: number;
}

export type StarlightInput =
  | StarlightVoteCastMessage
  | StarlightReadyMessage
  | StarlightHostOverrideMessage
  | StarlightSnapshotRequestMessage
  | DamageIntentPayload
  | AbilityCastPayload
  | PlayerStatePayload
  | CombatResultPayload
  | StarlightShipConfigMessage
  | StarlightConvoyDamageMessage;

export interface StarlightCoopSnapshot {
  sessionId: string;
  seed: number;
  phase: CoopPhase;
  sessionConfig: CoopSessionConfig;
  runSnapshot: RunSnapshot;
  players: Array<{ playerId: string; seat: number; ready: boolean; spectator: boolean; connected: boolean }>;
  currentNode: { id: string | null; type: NodeType | null };
  availableNodeIds: string[];
  vote: {
    scope: VoteScope | null;
    nodeId: string | null;
    options: string[];
    endsAtMs: number;
    tally: Record<string, number>;
    myVote: string | null;
  };
  combat: {
    missionId: string | null;
    seed: number | null;
    startedAtMs: number;
    timeoutAtMs: number;
    isEscortMission: boolean;
    convoyMaxHp: number;
    convoyHp: number;
    bossMaxHp: number;
    bossHp: number;
    bossPhase: number;
    nextAttackId: string;
    bossChecksum: number;
    activeBuffs: Array<{ abilityId: SupportAbilityId; byPlayerId: string; expiresAtMs: number }>;
    playerStates: Array<{ playerId: string; state: PlayerLifeState }>;
    topContributors: Array<{ playerId: string; score: number }>;
  };
  lastEventId: number;
}

export type StarlightCoopEvent =
  | { v: number; type: 'coop_init'; sessionConfig: CoopSessionConfig; runSnapshot: RunSnapshot; eventId: number }
  | { v: number; type: 'coop_phase'; phase: CoopPhase; payload: Record<string, unknown>; eventId: number }
  | { v: number; type: 'vote_resolve'; chosenChoiceId: string; tally: Record<string, number>; eventId: number }
  | {
      v: number;
      type: 'combat_shared_start';
      missionId: string;
      seed: number;
      bossMaxHP: number;
      scheduleSeed: number;
      difficulty: string;
      modifiers: Record<string, number>;
      escortMission?: boolean;
      convoyMaxHp?: number;
      eventId: number;
    }
  | { v: number; type: 'boss_state'; t: number; hp: number; maxHp: number; phase: number; nextAttackId: string; checksum: number; eventId: number }
  | { v: number; type: 'convoy_state'; t: number; hp: number; maxHp: number; eventId: number }
  | { v: number; type: 'boss_phase'; phaseId: number; t: number; hp: number; eventId: number }
  | { v: number; type: 'ability_apply'; abilityId: SupportAbilityId; byPlayerId: string; t: number; durationMs: number; eventId: number }
  | {
      v: number;
      type: 'combat_shared_end';
      reason: 'boss_defeated' | 'team_wipe' | 'timeout';
      combined: { totalBossDamage: number; teamScore: number; survivedCount: number };
      perPlayer: Array<{ playerId: string; bossDamage: number; supportCasts: number; score: number; survived: boolean; status: 'ok' | 'dnf' | 'rejected' }>;
      rewards: { credits: number; materials: number; notes: string[] };
      nextSnapshot: RunSnapshot;
      eventId: number;
    }
  | { v: number; type: 'snapshot_resync'; runSnapshot: RunSnapshot; reason: string; phase: CoopPhase; combat?: StarlightCoopSnapshot['combat']; eventId: number }
  | { v: number; type: 'input_rejected'; reason: string; eventId: number; playerId: string }
  | { v: number; type: 'coop_end'; finalSummary: { nodesCompleted: number; credits: number; materials: number; notes: string[] }; eventId: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function missionEnvelope(missionId: string): { maxScore: number; maxKills: number; maxDamageTaken: number } {
  const hash = hashStringToSeed(missionId);
  return {
    maxScore: 15000 + (hash % 6000),
    maxKills: 220 + (hash % 70),
    maxDamageTaken: 1200
  };
}

export function computeCombatChecksum(seed: number, missionId: string, result: Pick<CombatResultPayload, 'kills' | 'bossPhaseReached' | 'score'>): number {
  return (seed ^ hashStringToSeed(`${missionId}:${result.kills}:${result.bossPhaseReached}:${Math.floor(result.score / 10)}`)) >>> 0;
}

export function validateCombatResultEnvelope(seed: number, payload: CombatResultPayload): { valid: boolean; reason?: string } {
  const envelope = missionEnvelope(payload.missionId);
  if (payload.score < 0 || payload.score > envelope.maxScore) return { valid: false, reason: 'score_out_of_bounds' };
  if (payload.kills < 0 || payload.kills > envelope.maxKills) return { valid: false, reason: 'kills_out_of_bounds' };
  if (payload.damageTaken < 0 || payload.damageTaken > envelope.maxDamageTaken) return { valid: false, reason: 'damage_out_of_bounds' };
  if (payload.survived && payload.damageTaken > 1000) return { valid: false, reason: 'survival_inconsistent' };
  const expected = computeCombatChecksum(seed, payload.missionId, payload);
  if (payload.checksum !== expected) return { valid: false, reason: 'checksum_mismatch' };
  return { valid: true };
}

function asPlayerInput(value: unknown): StarlightInput | null {
  if (!isRecord(value) || value.v !== STARLIGHT_COOP_VERSION || typeof value.type !== 'string') return null;

  if (value.type === 'ready_status' && typeof value.ready === 'boolean') return value as unknown as StarlightReadyMessage;

  if (value.type === 'vote_cast' && typeof value.playerId === 'string' && typeof value.nodeId === 'string' && typeof value.choiceId === 'string') {
    return value as unknown as StarlightVoteCastMessage;
  }

  if (
    value.type === 'host_override' &&
    (value.action === 'pick_node' || value.action === 'pick_choice' || value.action === 'skip_timer' || value.action === 'toggle_team_wallet' || value.action === 'toggle_vote_mode')
  ) {
    return value as unknown as StarlightHostOverrideMessage;
  }

  if (value.type === 'snapshot_request') return value as unknown as StarlightSnapshotRequestMessage;

  if (value.type === 'ship_config' && typeof value.playerId === 'string') {
    return value as unknown as StarlightShipConfigMessage;
  }

  if (
    value.type === 'dmg_intent' &&
    typeof value.playerId === 'string' &&
    typeof value.missionId === 'string' &&
    typeof value.t === 'number' &&
    typeof value.amount === 'number' &&
    typeof value.weaponType === 'string' &&
    typeof value.checksum === 'number'
  ) {
    return value as unknown as DamageIntentPayload;
  }

  if (
    value.type === 'ability_cast' &&
    typeof value.playerId === 'string' &&
    typeof value.missionId === 'string' &&
    typeof value.abilityId === 'string' &&
    typeof value.t === 'number'
  ) {
    return value as unknown as AbilityCastPayload;
  }

  if (
    value.type === 'player_state' &&
    typeof value.playerId === 'string' &&
    typeof value.missionId === 'string' &&
    (value.state === 'alive' || value.state === 'downed') &&
    typeof value.t === 'number'
  ) {
    return value as unknown as PlayerStatePayload;
  }

  if (
    value.type === 'combat_result' &&
    typeof value.playerId === 'string' &&
    typeof value.missionId === 'string' &&
    typeof value.score === 'number' &&
    typeof value.kills === 'number' &&
    typeof value.damageTaken === 'number' &&
    typeof value.survived === 'boolean' &&
    typeof value.bossPhaseReached === 'number' &&
    typeof value.checksum === 'number'
  ) {
    return value as unknown as CombatResultPayload;
  }

  if (
    value.type === 'convoy_damage' &&
    typeof value.playerId === 'string' &&
    typeof value.missionId === 'string' &&
    typeof value.t === 'number' &&
    typeof value.amount === 'number'
  ) {
    return value as unknown as StarlightConvoyDamageMessage;
  }

  return null;
}

function factionHintFromNode(node: StarMapNode | null): 'concordium' | 'freebelt' | 'astral' {
  if (!node) return 'concordium';
  if (node.factionInfluenceHint === 'mixed') return 'concordium';
  return node.factionInfluenceHint;
}

function bossMaxHpForMission(missionId: string, isBoss: boolean): number {
  const seed = hashStringToSeed(missionId);
  return (isBoss ? 2600 : 1700) + (seed % (isBoss ? 400 : 220));
}

export function resolveVoteWinner(
  votes: Record<string, string>,
  options: string[],
  seatOrder: string[],
  seed: number,
  voteKey: string
): { chosenChoiceId: string; tally: Record<string, number> } {
  const tally: Record<string, number> = {};
  for (let i = 0; i < options.length; i += 1) tally[options[i]] = 0;

  for (const playerId of Object.keys(votes)) {
    const option = votes[playerId];
    if (!(option in tally)) continue;
    tally[option] += 1;
  }

  let best = -1;
  let leaders: string[] = [];
  for (let i = 0; i < options.length; i += 1) {
    const option = options[i];
    const count = tally[option] ?? 0;
    if (count > best) {
      best = count;
      leaders = [option];
    } else if (count === best) {
      leaders.push(option);
    }
  }

  if (leaders.length === 1) return { chosenChoiceId: leaders[0], tally };

  const seatWeighted = seatOrder.filter((playerId) => votes[playerId] && leaders.includes(votes[playerId]));
  if (seatWeighted.length > 0) return { chosenChoiceId: votes[seatWeighted[0]], tally };

  const rng = createSeededRng((seed ^ hashStringToSeed(`vote:${voteKey}:${leaders.join('|')}`)) >>> 0);
  return { chosenChoiceId: leaders[rng.nextInt(0, leaders.length - 1)] ?? options[0], tally };
}

export class StarlightChroniclesMultiplayerAdapter
  implements MpAdapter<StarlightInput, StarlightCoopSnapshot, StarlightCoopEvent, { status: string; nodesCompleted: number } | null>
{
  readonly isTurnBased = false;
  readonly capabilities = { coopPlanned: true };

  private role: 'host' | 'client' = 'client';
  private localPlayerId = 'client';
  private hostPlayerId = 'host';
  private playerSeatOrder: string[] = [];
  private missions = loadMissions();
  private items = loadItemsCatalog();
  private hulls = loadHullCatalog();
  private cosmetics = loadCosmeticsCatalog();
  private wingmen = loadWingmen();
  private drones = loadDrones();

  private started = false;
  private nowMs = 0;
  private sessionConfig: CoopSessionConfig = {
    sessionId: 'starlight-session-0',
    seed: 1,
    voteNodeSelection: true,
    teamWallet: true,
    hostCanOverride: true,
    roundRobinDistribution: true
  };

  private phase: CoopPhase = 'lobby';
  private players = new Map<string, CoopPlayerState>();
  private playerVotes: VoteState | null = null;
  private combatSession: CombatSession | null = null;
  private activeGraph!: StarMapGraph;
  private runState!: RunState;
  private sharedProfile!: StarlightProfile;
  private frontline: FrontlineState = { weekKey: '', contestedSystemIds: [] };
  private marketShockIds: string[] = [];
  private selectedNode: StarMapNode | null = null;
  private result: { status: string; nodesCompleted: number } | null = null;
  private eventId = 0;
  private outEvents: StarlightCoopEvent[] = [];
  private remoteSnapshot: StarlightCoopSnapshot | null = null;

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    this.localPlayerId = context.playerId;
    this.hostPlayerId = String(context.options?.hostPlayerId ?? context.playerId);
    const playerIds = Array.isArray(context.options?.playerIds) ? (context.options?.playerIds as string[]) : [this.hostPlayerId];
    this.playerSeatOrder = playerIds.length > 0 ? playerIds.slice() : [this.hostPlayerId];

    this.sessionConfig = {
      sessionId: `starlight-${context.seed}-${hashStringToSeed(this.playerSeatOrder.join('|')).toString(16)}`,
      seed: context.seed,
      voteNodeSelection: context.options?.voteNodeSelection !== false,
      teamWallet: context.options?.teamWallet !== false,
      hostCanOverride: true,
      roundRobinDistribution: context.options?.distributionMode !== 'host-only'
    };

    this.players.clear();
    for (let i = 0; i < this.playerSeatOrder.length; i += 1) {
      const playerId = this.playerSeatOrder[i];
      this.players.set(playerId, {
        playerId,
        seat: i,
        ready: false,
        spectator: false,
        connected: true,
        lastInputMs: 0,
        msgWindowStartMs: 0,
        msgCountWindow: 0,
        dmgRateGate: { windowStartMs: 0, count: 0 }
      });
    }

    if (!this.players.has(this.localPlayerId)) {
      this.players.set(this.localPlayerId, {
        playerId: this.localPlayerId,
        seat: this.players.size,
        ready: false,
        spectator: true,
        connected: true,
        lastInputMs: 0,
        msgWindowStartMs: 0,
        msgCountWindow: 0,
        dmgRateGate: { windowStartMs: 0, count: 0 }
      });
      this.playerSeatOrder.push(this.localPlayerId);
    }

    this.activeGraph = generateStarMap(context.seed, 'diplomacy', { includeEscortNode: true, includePatrolNode: true });
    this.runState = createRunState(context.seed, 'normal', 'diplomacy');
    this.runState.pendingNodeIds = selectableNodeIds(this.runState, this.activeGraph);
    this.sharedProfile = ensureCosmetics(ensureHullState(createInitialProfile(context.seed), this.hulls, this.items.modules), this.hulls, this.cosmetics);
    const universe = loadUniverse();
    const weekKey = weekKeyUtc(new Date());
    this.frontline = computeFrontlineState(universe, context.seed, weekKey);
    this.marketShockIds = selectWeeklyShockIds(weekKey, context.seed, loadMarketShocks(), 2);
    this.selectedNode = null;
    this.phase = 'lobby';
    this.playerVotes = null;
    this.combatSession = null;
    this.result = null;
    this.eventId = 0;
    this.outEvents = [];
    this.started = false;
    this.nowMs = 0;
    this.remoteSnapshot = null;
  }

  start(): void {
    this.started = true;
    if (this.role === 'host') {
      this.pushEvent({ v: STARLIGHT_COOP_VERSION, type: 'coop_init', sessionConfig: this.sessionConfig, runSnapshot: this.currentRunSnapshot(), eventId: this.nextEventId() });
      this.pushPhaseEvent('lobby', { message: 'Awaiting ready states' });
    }
  }

  stop(): void {
    this.started = false;
    if (!this.result) this.result = { status: 'stopped', nodesCompleted: this.runState?.summary.nodesCompleted ?? 0 };
  }

  onInput(localInput: StarlightInput): void {
    this.processInput(this.localPlayerId, localInput);
  }

  onRemoteMessage(msg: unknown): void {
    const remote = msg as { fromPlayerId?: string; input?: unknown };
    const fromPlayerId = typeof remote.fromPlayerId === 'string' ? remote.fromPlayerId : this.localPlayerId;
    const parsed = asPlayerInput(remote.input);
    if (!parsed) return;
    this.processInput(fromPlayerId, parsed);
  }

  private processInput(playerId: string, input: StarlightInput): void {
    if (this.role !== 'host') return;
    const player = this.players.get(playerId);
    if (!player) {
      if (input.type === 'snapshot_request') {
        this.players.set(playerId, {
          playerId,
          seat: this.players.size,
          ready: false,
          spectator: true,
          connected: true,
          lastInputMs: this.nowMs,
          msgWindowStartMs: this.nowMs,
          msgCountWindow: 1,
          dmgRateGate: { windowStartMs: this.nowMs, count: 0 }
        });
        this.pushEvent({
          v: STARLIGHT_COOP_VERSION,
          type: 'snapshot_resync',
          runSnapshot: this.currentRunSnapshot(),
          reason: 'new_spectator',
          phase: this.phase,
          combat: this.getSnapshot().combat,
          eventId: this.nextEventId()
        });
      }
      return;
    }

    if (this.isRateLimited(player)) {
      this.rejectInput(playerId, 'rate_limited');
      return;
    }

    if (input.type === 'snapshot_request') {
      this.pushEvent({
        v: STARLIGHT_COOP_VERSION,
        type: 'snapshot_resync',
        runSnapshot: this.currentRunSnapshot(),
        reason: 'requested',
        phase: this.phase,
        combat: this.getSnapshot().combat,
        eventId: this.nextEventId()
      });
      return;
    }

    if (input.type === 'ready_status') {
      player.ready = input.ready;
      return;
    }

    if (input.type === 'host_override') {
      if (playerId !== this.hostPlayerId) return this.rejectInput(playerId, 'host_only');
      this.applyHostOverride(input);
      return;
    }

    if (input.type === 'vote_cast') return this.applyVote(playerId, input);
    if (input.type === 'ship_config') return this.applyShipConfig(playerId, input);
    if (input.type === 'convoy_damage') return this.applyConvoyDamage(playerId, input);
    if (input.type === 'dmg_intent') return this.applyDamageIntent(player, input);
    if (input.type === 'ability_cast') return this.applyAbilityCast(playerId, input);
    if (input.type === 'player_state') return this.applyPlayerLifeState(playerId, input);
    if (input.type === 'combat_result') return this.applyLegacyCombatResult(playerId, input);
  }

  private isRateLimited(player: CoopPlayerState): boolean {
    if (this.nowMs - player.msgWindowStartMs >= 1000) {
      player.msgWindowStartMs = this.nowMs;
      player.msgCountWindow = 0;
    }
    player.msgCountWindow += 1;
    player.lastInputMs = this.nowMs;
    return player.msgCountWindow > MAX_MSG_PER_SECOND;
  }

  private applyHostOverride(input: StarlightHostOverrideMessage): void {
    if (input.action === 'skip_timer' && this.playerVotes) {
      this.playerVotes.endsAtMs = this.nowMs;
      return;
    }
    if (input.action === 'toggle_team_wallet') {
      this.sessionConfig.teamWallet = !this.sessionConfig.teamWallet;
      this.pushPhaseEvent(this.phase, { teamWallet: this.sessionConfig.teamWallet });
      return;
    }
    if (input.action === 'toggle_vote_mode') {
      this.sessionConfig.voteNodeSelection = !this.sessionConfig.voteNodeSelection;
      this.pushPhaseEvent(this.phase, { voteNodeSelection: this.sessionConfig.voteNodeSelection });
      return;
    }

    if (!this.playerVotes) return;
    if ((input.action === 'pick_node' || input.action === 'pick_choice') && input.optionId && this.playerVotes.options.includes(input.optionId)) {
      this.playerVotes.votes[this.hostPlayerId] = input.optionId;
      this.playerVotes.endsAtMs = this.nowMs;
    }
  }

  private applyVote(playerId: string, input: StarlightVoteCastMessage): void {
    if (!this.playerVotes) return this.rejectInput(playerId, 'no_active_vote');
    if (!this.playerVotes.options.includes(input.choiceId)) return this.rejectInput(playerId, 'invalid_vote_choice');
    this.playerVotes.votes[playerId] = input.choiceId;
  }

  private applyShipConfig(playerId: string, input: StarlightShipConfigMessage): void {
    if (input.playerId !== playerId) return this.rejectInput(playerId, 'identity_mismatch');
    let next = this.sharedProfile;
    if (input.activeHullId) {
      if (!next.ownedHullIds.includes(input.activeHullId)) return this.rejectInput(playerId, 'invalid_hull_id');
      next = switchHull(next, this.hulls, this.items.modules, input.activeHullId);
    }
    if (input.activeWingmenIds) {
      const knownWingmen = new Set(this.wingmen.wingmen.map((entry) => entry.id));
      const valid = input.activeWingmenIds
        .filter((id, idx) => input.activeWingmenIds?.indexOf(id) === idx && next.ownedWingmenIds.includes(id) && knownWingmen.has(id))
        .slice(0, 2);
      if (valid.length !== input.activeWingmenIds.length) return this.rejectInput(playerId, 'invalid_wingmen_id');
      next = { ...next, activeWingmenIds: valid };
    }
    if (input.activeDroneId !== undefined) {
      const knownDrones = new Set(this.drones.drones.map((entry) => entry.id));
      if (input.activeDroneId && (!next.ownedDroneIds.includes(input.activeDroneId) || !knownDrones.has(input.activeDroneId))) {
        return this.rejectInput(playerId, 'invalid_drone_id');
      }
      next = { ...next, activeDroneId: input.activeDroneId };
    }
    if (input.skinKey) next = applyHullCosmetic(next, next.activeHullId, 'skinKey', input.skinKey, this.cosmetics);
    if (input.decalKey) next = applyHullCosmetic(next, next.activeHullId, 'decalKey', input.decalKey, this.cosmetics);
    if (input.trailKey) next = applyHullCosmetic(next, next.activeHullId, 'trailKey', input.trailKey, this.cosmetics);
    this.sharedProfile = next;
  }

  private applyConvoyDamage(playerId: string, input: StarlightConvoyDamageMessage): void {
    const session = this.combatSession;
    if (!session) return this.rejectInput(playerId, 'no_active_combat');
    if (!session.escortMission) return this.rejectInput(playerId, 'not_escort_mission');
    if (input.playerId !== playerId) return this.rejectInput(playerId, 'identity_mismatch');
    if (input.missionId !== session.missionId) return this.rejectInput(playerId, 'wrong_mission_id');
    if (!Number.isFinite(input.amount) || input.amount < 0 || input.amount > 40) return this.rejectInput(playerId, 'convoy_damage_out_of_bounds');

    session.convoyHp = Math.max(0, session.convoyHp - input.amount);
  }

  private applyDamageIntent(player: CoopPlayerState, input: DamageIntentPayload): void {
    const session = this.combatSession;
    if (!session) return this.rejectInput(player.playerId, 'no_active_combat');
    if (input.playerId !== player.playerId) return this.rejectInput(player.playerId, 'identity_mismatch');
    if (input.missionId !== session.missionId) return this.rejectInput(player.playerId, 'wrong_mission_id');

    const gate = allowRate(player.dmgRateGate, this.nowMs, MAX_DMG_INTENTS_PER_SECOND);
    player.dmgRateGate = gate.next;
    if (!gate.allowed) return this.rejectInput(player.playerId, 'dmg_intent_rate_limited');

    if (!validateDamageIntentChecksum(session.seed, input)) return this.rejectInput(player.playerId, 'intent_checksum_mismatch');

    session.abilities = cleanupExpiredBuffs(session.abilities, this.nowMs);
    const damageMult = activeDamageMultiplier(session.abilities, this.nowMs);
    const tacticalBonus = this.sharedProfile.crew.active.tactical ? 1 : 0;

    const validation = validateDamageIntentEnvelope(input, {
      elapsedMs: Math.max(1, this.nowMs - session.startedAtMs),
      tacticalBonus,
      weaponDamageTier: this.sharedProfile.shipDamage.systems.weapons,
      damageMultiplier: damageMult,
      recentDamageWindow: session.recentDamageByPlayer[player.playerId] ?? 0
    });

    if (!validation.valid) {
      session.rejections[player.playerId] = validation.reason ?? 'intent_invalid';
      return this.rejectInput(player.playerId, validation.reason ?? 'intent_invalid');
    }

    const applied = applyDamageIntentToBoss(session.boss, input, this.nowMs, damageMult);
    session.boss = applied.state;
    session.recentDamageByPlayer[player.playerId] = (session.recentDamageByPlayer[player.playerId] ?? 0) + applied.appliedDamage;

    const contribution = session.contributions[player.playerId];
    contribution.bossDamage += applied.appliedDamage;
    contribution.teamScore += Math.round(applied.appliedDamage * 2 + (input.crit ? 10 : 0));

    if (applied.phaseChanged) {
      this.pushEvent({ v: STARLIGHT_COOP_VERSION, type: 'boss_phase', phaseId: session.boss.phaseId, t: this.nowMs, hp: Math.round(session.boss.hp), eventId: this.nextEventId() });
    }
  }

  private applyAbilityCast(playerId: string, payload: AbilityCastPayload): void {
    const session = this.combatSession;
    if (!session) return this.rejectInput(playerId, 'no_active_combat');
    if (payload.playerId !== playerId) return this.rejectInput(playerId, 'identity_mismatch');
    if (payload.missionId !== session.missionId) return this.rejectInput(playerId, 'wrong_mission_id');

    const cast = castSupportAbility(session.abilities, playerId, payload.abilityId, this.nowMs);
    if (!cast.ok) return this.rejectInput(playerId, cast.reason);
    session.abilities = cast.state;
    session.contributions[playerId].supportCasts += 1;

    if (payload.abilityId === 'captain_rally') {
      const ids = Object.keys(session.playerState);
      for (let i = 0; i < ids.length; i += 1) {
        if (session.playerState[ids[i]].state === 'downed') {
          session.playerState[ids[i]] = { state: 'alive', changedAtMs: this.nowMs };
          session.contributions[ids[i]].survived = true;
        }
      }
    }

    this.pushEvent({ v: STARLIGHT_COOP_VERSION, type: 'ability_apply', abilityId: payload.abilityId, byPlayerId: playerId, t: this.nowMs, durationMs: cast.buff.expiresAtMs - cast.buff.startedAtMs, eventId: this.nextEventId() });
  }

  private applyPlayerLifeState(playerId: string, payload: PlayerStatePayload): void {
    const session = this.combatSession;
    if (!session) return this.rejectInput(playerId, 'no_active_combat');
    if (payload.playerId !== playerId) return this.rejectInput(playerId, 'identity_mismatch');
    if (payload.missionId !== session.missionId) return this.rejectInput(playerId, 'wrong_mission_id');

    session.playerState[playerId] = {
      state: payload.state,
      changedAtMs: this.nowMs
    };
    session.contributions[playerId].survived = payload.state === 'alive';
  }

  private applyLegacyCombatResult(playerId: string, payload: CombatResultPayload): void {
    const session = this.combatSession;
    if (!session) return this.rejectInput(playerId, 'no_active_combat');
    if (payload.playerId !== playerId || payload.missionId !== session.missionId) return this.rejectInput(playerId, 'legacy_result_invalid');
    const validation = validateCombatResultEnvelope(session.seed, payload);
    if (!validation.valid) return this.rejectInput(playerId, validation.reason ?? 'validation_failed');

    const contribution = session.contributions[playerId];
    contribution.teamScore += Math.round(payload.score * 0.15);
    contribution.survived = payload.survived;
  }

  private rejectInput(playerId: string, reason: string): void {
    this.pushEvent({ v: STARLIGHT_COOP_VERSION, type: 'input_rejected', reason, playerId, eventId: this.nextEventId() });
  }

  getSnapshot(): StarlightCoopSnapshot {
    if (this.role === 'client' && this.remoteSnapshot) {
      return this.remoteSnapshot;
    }

    const vote = this.playerVotes;
    const tally: Record<string, number> = {};
    if (vote) {
      for (let i = 0; i < vote.options.length; i += 1) tally[vote.options[i]] = 0;
      for (const selected of Object.values(vote.votes)) if (selected in tally) tally[selected] += 1;
    }

    const combat = this.combatSession;
    const topContributors = combat
      ? this.playerSeatOrder
          .filter((playerId) => combat.contributions[playerId])
          .map((playerId) => ({
            playerId,
            score: scoreContribution(combat.contributions[playerId].bossDamage, combat.contributions[playerId].survived, combat.contributions[playerId].supportCasts)
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
      : [];

    return {
      sessionId: this.sessionConfig.sessionId,
      seed: this.sessionConfig.seed,
      phase: this.phase,
      sessionConfig: { ...this.sessionConfig },
      runSnapshot: this.currentRunSnapshot(),
      players: this.playerSeatOrder.map((playerId) => {
        const p = this.players.get(playerId);
        return {
          playerId,
          seat: p?.seat ?? 0,
          ready: p?.ready ?? false,
          spectator: p?.spectator ?? false,
          connected: p?.connected ?? true
        };
      }),
      currentNode: { id: this.selectedNode?.id ?? null, type: this.selectedNode?.type ?? null },
      availableNodeIds: selectableNodeIds(this.runState, this.activeGraph),
      vote: {
        scope: vote?.scope ?? null,
        nodeId: vote?.nodeId ?? null,
        options: vote?.options ?? [],
        endsAtMs: vote?.endsAtMs ?? 0,
        tally,
        myVote: vote?.votes[this.localPlayerId] ?? null
      },
      combat: {
        missionId: combat?.missionId ?? null,
        seed: combat?.seed ?? null,
        startedAtMs: combat?.startedAtMs ?? 0,
        timeoutAtMs: combat?.timeoutAtMs ?? 0,
        isEscortMission: combat?.escortMission ?? false,
        convoyMaxHp: combat?.convoyMaxHp ?? 0,
        convoyHp: Math.round(combat?.convoyHp ?? 0),
        bossMaxHp: combat?.boss.maxHp ?? 0,
        bossHp: Math.round(combat?.boss.hp ?? 0),
        bossPhase: combat?.boss.phaseId ?? 0,
        nextAttackId: combat?.boss.nextAttackId ?? '',
        bossChecksum: combat ? computeBossStateChecksum(combat.boss) : 0,
        activeBuffs: (combat?.abilities.activeBuffs ?? []).map((buff: ActiveAbilityBuff) => ({ abilityId: buff.abilityId, byPlayerId: buff.byPlayerId, expiresAtMs: buff.expiresAtMs })),
        playerStates: combat
          ? this.playerSeatOrder
              .filter((playerId) => !this.players.get(playerId)?.spectator)
              .map((playerId) => ({ playerId, state: combat.playerState[playerId]?.state ?? 'alive' }))
          : [],
        topContributors
      },
      lastEventId: this.eventId
    };
  }

  applySnapshot(snapshot: StarlightCoopSnapshot): void {
    this.remoteSnapshot = snapshot;
    this.sessionConfig = { ...snapshot.sessionConfig };
    this.phase = snapshot.phase;
    this.eventId = snapshot.lastEventId;
  }

  serializeEvent(event: StarlightCoopEvent): unknown {
    return event;
  }

  applyEvent(event: StarlightCoopEvent): void {
    this.eventId = Math.max(this.eventId, event.eventId);
    if (event.type === 'snapshot_resync') {
      this.phase = event.phase;
      return;
    }
    if (event.type === 'coop_phase') {
      this.phase = event.phase;
      return;
    }
    if (event.type === 'coop_end') {
      this.phase = 'end';
      this.result = { status: 'ended', nodesCompleted: event.finalSummary.nodesCompleted };
    }
  }

  step(dtS = 1 / 20): StarlightCoopEvent[] {
    if (!this.started || this.role !== 'host') return [];
    this.nowMs += Math.max(0, dtS * 1000);

    if (this.phase === 'lobby') {
      const activePlayers = this.playerSeatOrder.filter((playerId) => !this.players.get(playerId)?.spectator);
      const everyoneReady = activePlayers.length >= 2 && activePlayers.every((playerId) => this.players.get(playerId)?.ready === true);
      if (everyoneReady) {
        this.phase = 'map';
        this.pushPhaseEvent('map', { availableNodeIds: selectableNodeIds(this.runState, this.activeGraph) });
        if (this.sessionConfig.voteNodeSelection) this.startVote('node', null, selectableNodeIds(this.runState, this.activeGraph));
      }
    }

    if (this.playerVotes && this.nowMs >= this.playerVotes.endsAtMs) this.resolveVote();

    if (this.combatSession) {
      this.tickCombatSession();
      if (this.combatSession && this.nowMs >= this.combatSession.timeoutAtMs) this.resolveCombat('timeout');
    }

    const events = this.outEvents.slice();
    this.outEvents.length = 0;
    return events;
  }

  private tickCombatSession(): void {
    const session = this.combatSession;
    if (!session) return;

    session.abilities = cleanupExpiredBuffs(session.abilities, this.nowMs);

    const ids = Object.keys(session.recentDamageByPlayer);
    for (let i = 0; i < ids.length; i += 1) {
      session.recentDamageByPlayer[ids[i]] *= 0.82;
      if (session.recentDamageByPlayer[ids[i]] < 1) session.recentDamageByPlayer[ids[i]] = 0;
    }

    const playerIds = this.playerSeatOrder.filter((playerId) => !this.players.get(playerId)?.spectator);
    const aliveCount = playerIds.filter((playerId) => session.playerState[playerId]?.state !== 'downed').length;

    for (let i = 0; i < playerIds.length; i += 1) {
      const pid = playerIds[i];
      const state = session.playerState[pid];
      if (!state || state.state !== 'downed') continue;
      if (aliveCount > 0 && this.nowMs - state.changedAtMs >= DOWNED_REVIVE_MS) {
        session.playerState[pid] = { state: 'alive', changedAtMs: this.nowMs };
        session.contributions[pid].survived = true;
      }
    }

    if (playerIds.length > 0 && playerIds.every((playerId) => session.playerState[playerId]?.state === 'downed')) {
      this.resolveCombat('team_wipe');
      return;
    }

    const attackRateScale = session.abilities.activeBuffs.some((buff) => buff.abilityId === 'science_scan_lock') ? 1.2 : 1;
    session.boss = {
      ...session.boss,
      nextAttackId: deriveAttackId(session.scheduleSeed, this.nowMs, session.boss.phaseId, attackRateScale),
      lastUpdateMs: this.nowMs
    };

    if (session.escortMission) {
      const escortDecaySeed = deterministicNodeSeed(this.sessionConfig.seed, `${session.nodeId}:${Math.floor(this.nowMs / 250)}`);
      const chip = 0.6 + (escortDecaySeed % 4) * 0.2;
      session.convoyHp = Math.max(0, session.convoyHp - chip);
    }

    if (this.nowMs - session.lastBossSyncAtMs >= BOSS_SYNC_INTERVAL_MS) {
      session.lastBossSyncAtMs = this.nowMs;
      this.pushEvent({
        v: STARLIGHT_COOP_VERSION,
        type: 'boss_state',
        t: this.nowMs,
        hp: Math.round(session.boss.hp),
        maxHp: session.boss.maxHp,
        phase: session.boss.phaseId,
        nextAttackId: session.boss.nextAttackId,
        checksum: computeBossStateChecksum(session.boss),
        eventId: this.nextEventId()
      });
      if (session.escortMission) {
        this.pushEvent({
          v: STARLIGHT_COOP_VERSION,
          type: 'convoy_state',
          t: this.nowMs,
          hp: Math.round(session.convoyHp),
          maxHp: session.convoyMaxHp,
          eventId: this.nextEventId()
        });
      }
    }

    if (session.escortMission && session.convoyHp <= 0) {
      this.resolveCombat('team_wipe');
      return;
    }
    if (session.boss.hp <= 0) this.resolveCombat('boss_defeated');
  }

  getResult(): { status: string; nodesCompleted: number } | null {
    return this.result;
  }

  serializeSnapshotSafe(snapshot: StarlightCoopSnapshot): string {
    return JSON.stringify(snapshot);
  }

  deserializeSnapshotSafe(raw: string): StarlightCoopSnapshot | null {
    try {
      return JSON.parse(raw) as StarlightCoopSnapshot;
    } catch {
      return null;
    }
  }

  private nextEventId(): number {
    this.eventId += 1;
    return this.eventId;
  }

  private pushEvent(event: StarlightCoopEvent): void {
    this.outEvents.push(event);
  }

  private pushPhaseEvent(phase: CoopPhase, payload: Record<string, unknown>): void {
    this.phase = phase;
    this.pushEvent({ v: STARLIGHT_COOP_VERSION, type: 'coop_phase', phase, payload, eventId: this.nextEventId() });
  }

  private startVote(scope: VoteScope, nodeId: string | null, options: string[]): void {
    this.playerVotes = {
      scope,
      nodeId,
      options,
      startedAtMs: this.nowMs,
      endsAtMs: this.nowMs + VOTE_TIMER_MS,
      votes: {}
    };
    this.pushPhaseEvent(this.phase, { voteScope: scope, nodeId, options, endsAtMs: this.playerVotes.endsAtMs });
  }

  private resolveVote(): void {
    if (!this.playerVotes) return;
    const vote = this.playerVotes;
    const result = resolveVoteWinner(vote.votes, vote.options, this.playerSeatOrder, this.sessionConfig.seed, `${vote.scope}:${vote.nodeId ?? 'none'}:${this.runState.currentStep}`);
    this.playerVotes = null;
    this.pushEvent({ v: STARLIGHT_COOP_VERSION, type: 'vote_resolve', chosenChoiceId: result.chosenChoiceId, tally: result.tally, eventId: this.nextEventId() });

    if (vote.scope === 'node') return this.applyNodeSelection(result.chosenChoiceId);
    this.applyChoiceSelection(result.chosenChoiceId);
  }

  private applyNodeSelection(nodeId: string): void {
    const node = this.activeGraph.nodes.find((entry) => entry.id === nodeId);
    const available = selectableNodeIds(this.runState, this.activeGraph);
    if (!node || !available.includes(nodeId)) {
      this.pushPhaseEvent('map', { warning: 'invalid_node_selection' });
      return;
    }

    this.runState = startNode(this.runState, nodeId);
    this.selectedNode = node;
    this.pushPhaseEvent('node', { nodeId: node.id, nodeType: node.type });

    if (node.type === 'STORY') return this.startVote('choice', node.id, ['diplomacy', 'pragmatic', 'force']);
    if (node.type === 'EXPLORE') return this.startVote('choice', node.id, ['science', 'salvage', 'avoid']);

    if (node.type === 'SHOP') {
      const recruits = generateRecruitmentPool({ runSeed: this.sessionConfig.seed, nodeId, standingBias: factionHintFromNode(node), captainRank: this.sharedProfile.captainRank }, 1);
      if (recruits[0]) this.sharedProfile = { ...this.sharedProfile, crew: addCrewToRoster(this.sharedProfile.crew, recruits[0]) };
      return this.finalizeNode({ xp: 12, shipCondition: 5 }, `Shop visit${recruits[0] ? ' + crew recruit' : ''}`);
    }
    if (node.type === 'DELIVERY') {
      return this.finalizeNode({ xp: 16, credits: 30 }, 'Delivery checkpoint');
    }
    if (node.type === 'PATROL') {
      return this.finalizeNode({ xp: 12, credits: 20, factionDelta: { concordium: 1 } }, 'Patrol assist');
    }

    const mission = resolveMissionForNode(this.missions, node.id, node.type === 'BOSS');
    const missionSeed = deterministicNodeSeed(this.sessionConfig.seed, `${node.id}:${mission.id}`);
    const scheduleSeed = deterministicNodeSeed(this.sessionConfig.seed, `schedule:${mission.id}:${node.id}`);
    const participants = this.playerSeatOrder.filter((playerId) => !this.players.get(playerId)?.spectator);

    const contributions: Record<string, CombatContribution> = {};
    const playerState: CombatSession['playerState'] = {};
    const recentDamageByPlayer: Record<string, number> = {};
    for (let i = 0; i < participants.length; i += 1) {
      contributions[participants[i]] = { bossDamage: 0, teamScore: 0, supportCasts: 0, survived: true };
      playerState[participants[i]] = { state: 'alive', changedAtMs: this.nowMs };
      recentDamageByPlayer[participants[i]] = 0;
    }

    const bossMaxHP = bossMaxHpForMission(mission.id, node.type === 'BOSS');
    const boss = createSharedBossState({ missionId: mission.id, seed: missionSeed, scheduleSeed, bossMaxHp: bossMaxHP, nowMs: this.nowMs });
    const isEscortMission = node.type === 'ESCORT';
    const convoyMaxHp = isEscortMission ? 68 : 0;

    this.combatSession = {
      missionId: mission.id,
      nodeId: node.id,
      seed: missionSeed,
      scheduleSeed,
      startedAtMs: this.nowMs,
      timeoutAtMs: this.nowMs + COMBAT_TIMEOUT_MS,
      boss,
      abilities: createSupportAbilityState(participants),
      contributions,
      playerState,
      rejections: {},
      recentDamageByPlayer,
      lastBossSyncAtMs: this.nowMs,
      escortMission: isEscortMission,
      convoyMaxHp,
      convoyHp: convoyMaxHp
    };

    this.pushPhaseEvent('combat', { nodeId: node.id, missionId: mission.id, timeoutAtMs: this.combatSession.timeoutAtMs });
    this.pushEvent({
      v: STARLIGHT_COOP_VERSION,
      type: 'combat_shared_start',
      missionId: mission.id,
      seed: missionSeed,
      bossMaxHP,
      scheduleSeed,
      difficulty: this.runState.difficulty,
      modifiers: {
        tacticalBonus: this.sharedProfile.crew.active.tactical ? 1 : 0,
        weaponDamageTier: this.sharedProfile.shipDamage.systems.weapons,
        hullIntegrity: this.sharedProfile.shipDamage.hullIntegrity
      },
      escortMission: isEscortMission,
      convoyMaxHp,
      eventId: this.nextEventId()
    });
  }

  private applyChoiceSelection(choiceId: string): void {
    if (!this.selectedNode) return;
    let outcome: OutcomeDelta = {};

    if (this.selectedNode.type === 'STORY') {
      if (choiceId === 'diplomacy') outcome = { crewMorale: 2, factionDelta: { concordium: 1 }, xp: 12 };
      if (choiceId === 'pragmatic') outcome = { credits: 40, materials: 2, factionDelta: { freebelt: 1 }, xp: 10 };
      if (choiceId === 'force') outcome = { credits: 55, crewMorale: -1, shipCondition: -2, xp: 14 };
    }

    if (this.selectedNode.type === 'EXPLORE') {
      if (choiceId === 'science') outcome = { xp: 16, crewMorale: 1, shipCondition: -1 };
      if (choiceId === 'salvage') outcome = { credits: 65, materials: 4, shipCondition: -4 };
      if (choiceId === 'avoid') outcome = { crewMorale: 0, shipCondition: 1, xp: 7 };
      outcome = applyCrewExploreModifier(outcome, this.sharedProfile.crew.active.science ? 8 : 0);
    }

    this.finalizeNode(outcome, `${this.selectedNode.type} choice ${choiceId}`);
  }

  private finalizeNode(outcome: OutcomeDelta, note: string): void {
    if (!this.selectedNode) return;
    const before = this.sharedProfile;
    let next = applyRunNodeOutcome(this.sharedProfile, outcome);

    if ((outcome.shipCondition ?? 0) < 0) {
      const severity = Math.max(1, Math.ceil(Math.abs(outcome.shipCondition ?? 0) / 4));
      const shipDamage = applyDeterministicDamageRoll(next.shipDamage, this.sessionConfig.seed, this.selectedNode.id, this.runState.summary.nodesCompleted, 'anomaly-risk', severity);
      next = { ...next, shipDamage, shipCondition: shipDamage.hullIntegrity };
    }

    const result: RunNodeResult = {
      credits: next.inventory.credits - before.inventory.credits,
      materials: next.inventory.materials - before.inventory.materials,
      morale: next.crewMorale - before.crewMorale,
      condition: next.shipCondition - before.shipCondition,
      xp: next.captainXp - before.captainXp,
      factionDelta: {
        concordium: next.factions.concordium - before.factions.concordium,
        freebelt: next.factions.freebelt - before.factions.freebelt,
        astral: next.factions.astral - before.factions.astral
      },
      notes: [note]
    };

    this.sharedProfile = next;
    this.runState = completeNode(this.runState, this.selectedNode.id, result, this.activeGraph);

    if (this.runState.finished) {
      this.phase = 'end';
      this.result = { status: 'ended', nodesCompleted: this.runState.summary.nodesCompleted };
      this.pushEvent({
        v: STARLIGHT_COOP_VERSION,
        type: 'coop_end',
        finalSummary: {
          nodesCompleted: this.runState.summary.nodesCompleted,
          credits: this.sharedProfile.inventory.credits,
          materials: this.sharedProfile.inventory.materials,
          notes: this.runState.summary.notes.slice(-6)
        },
        eventId: this.nextEventId()
      });
      return;
    }

    this.pushPhaseEvent('results', { note, snapshot: this.currentRunSnapshot() });
    this.phase = 'map';
    this.pushPhaseEvent('map', { availableNodeIds: selectableNodeIds(this.runState, this.activeGraph) });
    if (this.sessionConfig.voteNodeSelection) this.startVote('node', null, selectableNodeIds(this.runState, this.activeGraph));
  }

  private resolveCombat(reason: 'boss_defeated' | 'team_wipe' | 'timeout'): void {
    if (!this.combatSession || !this.selectedNode) return;
    const session = this.combatSession;
    const participants = this.playerSeatOrder.filter((playerId) => !this.players.get(playerId)?.spectator);

    const perPlayer = participants.map((playerId) => {
      const contribution = session.contributions[playerId];
      const rejected = session.rejections[playerId];
      const survived = session.playerState[playerId]?.state !== 'downed' && contribution.survived;
      return {
        playerId,
        bossDamage: Math.round(contribution.bossDamage),
        supportCasts: contribution.supportCasts,
        score: scoreContribution(contribution.bossDamage, survived, contribution.supportCasts),
        survived,
        status: rejected ? ('rejected' as const) : ('ok' as const)
      };
    });

    const combined = perPlayer.reduce(
      (acc, row) => {
        acc.totalBossDamage += row.bossDamage;
        acc.teamScore += row.score;
        if (row.survived) acc.survivedCount += 1;
        return acc;
      },
      { totalBossDamage: 0, teamScore: 0, survivedCount: 0 }
    );

    const failRatio = participants.length > 0 ? (participants.length - combined.survivedCount) / participants.length : 1;
    let outcome: OutcomeDelta = {
      credits: 90 + Math.floor(combined.totalBossDamage / 28) + (reason === 'boss_defeated' ? 40 : 0),
      materials: 6 + Math.floor(combined.teamScore / 380) + (reason === 'boss_defeated' ? 3 : 0),
      xp: this.selectedNode.type === 'BOSS' ? 85 : 52
    };

    if (reason === 'team_wipe') {
      outcome = { ...outcome, credits: Math.floor((outcome.credits ?? 0) * 0.45), materials: Math.floor((outcome.materials ?? 0) * 0.5), shipCondition: -5 };
    } else if (failRatio > 0.5) {
      outcome.shipCondition = -2;
    }

    const ranked = perPlayer.slice().sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId));
    const topContributor = ranked[0]?.playerId ?? this.hostPlayerId;

    const missionDrop = this.missions.find((entry) => entry.id === session.missionId)?.rewards.moduleDropPool ?? [];
    if (missionDrop.length > 0) {
      const roundRobinIndex = this.runState.summary.nodesCompleted % Math.max(1, participants.length);
      const baseModule = missionDrop[deterministicNodeSeed(this.sessionConfig.seed, `${session.nodeId}:${roundRobinIndex}`) % missionDrop.length] ?? missionDrop[0];
      const bonusRoll = deterministicNodeSeed(this.sessionConfig.seed, `${session.nodeId}:bonus:${ranked.map((entry) => entry.playerId).join('|')}`) % missionDrop.length;
      const bonusModule = missionDrop[bonusRoll] ?? baseModule;

      const toAdd = [baseModule, bonusModule];
      for (let i = 0; i < toAdd.length; i += 1) {
        const moduleId = toAdd[i];
        if (moduleId && !this.sharedProfile.inventory.modules.includes(moduleId)) {
          this.sharedProfile = {
            ...this.sharedProfile,
            inventory: {
              ...this.sharedProfile.inventory,
              modules: [...this.sharedProfile.inventory.modules, moduleId]
            }
          };
        }
      }
    }

    if (hasPatchFieldSupport(session.abilities)) {
      this.sharedProfile = {
        ...this.sharedProfile,
        shipDamage: fieldRepairSystem(this.sharedProfile.shipDamage, this.sessionConfig.seed, session.nodeId, this.runState.summary.nodesCompleted),
        shipCondition: this.sharedProfile.shipDamage.hullIntegrity
      };
    }

    const rewards = {
      credits: outcome.credits ?? 0,
      materials: outcome.materials ?? 0,
      notes: [
        `Top contributor ${topContributor}`,
        ...(reason === 'boss_defeated' ? ['Shared boss defeated'] : []),
        ...(combined.survivedCount === participants.length ? ['All survived bonus'] : []),
        ...(hasPatchFieldSupport(session.abilities) ? ['Patch Field repaired one system tier'] : []),
        ...(reason === 'team_wipe' ? ['Team wipe penalty applied'] : [])
      ]
    };

    this.pushEvent({
      v: STARLIGHT_COOP_VERSION,
      type: 'combat_shared_end',
      reason,
      combined,
      perPlayer,
      rewards,
      nextSnapshot: this.currentRunSnapshot(),
      eventId: this.nextEventId()
    });

    this.combatSession = null;
    this.finalizeNode(outcome, `Combat ${session.missionId}`);
  }

  private currentRunSnapshot(): RunSnapshot {
    return createRunSnapshot(this.sharedProfile, this.activeGraph, this.runState, {
      marketShockIds: this.marketShockIds,
      frontline: this.frontline,
      patrolContextIds: [...this.frontline.contestedSystemIds]
    });
  }
}

export const starlight_chroniclesMpAdapter = new StarlightChroniclesMultiplayerAdapter();

export { computeDamageIntentChecksum };
export type { SupportAbilityId };
