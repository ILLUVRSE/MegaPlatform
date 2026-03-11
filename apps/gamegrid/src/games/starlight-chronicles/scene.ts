import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { makeButton, makePanel } from './ui/components';
import { beginRun, createInitialProfile, spendConsumable, type OutcomeDelta, type StarlightProfile } from './rules';
import { loadProfile, saveProfile } from './persistence';
import { applyStoryChoice, findChapter, findNode, loadChapters, resolveChoicesWithCrewBonus } from './story/storyRules';
import { applyAnomalyResponse, type AnomalyDefinition, type AnomalyResponse, loadAnomalies } from './explore/exploreRules';
import {
  applyConsumableEffect,
  buyConsumable,
  buyModule,
  loadItemsCatalog,
  repairShip,
  sellLoot
} from './economy/inventory';
import { deriveShipStats, type DerivedShipStats } from './economy/fitting';
import { addCargo, cargoFree, loadGoodsCatalog, removeCargo } from './economy/goods';
import { computeSystemPrices, getMarketShockIdsForNow, loadMarketShocks, priceTrend } from './economy/marketSim';
import { generateContractsForSystem, pruneExpiredContracts, resolveDeliveredContracts } from './economy/contracts';
import {
  applyIncomingDamage,
  computeMissionScore,
  createCombatShip,
  regenShield,
  resolveBossPhase,
  scoreOnKill,
  scoreOnPlayerHit,
  type CombatScoreState,
  type CombatShipState
} from './combat/combatRules';
import { buildWaveSpawns, loadEnemies, loadMissions, type EnemyDefinition, type MissionDefinition, type MissionWave } from './combat/enemyPatterns';
import { createPool, type PoolItem } from './combat/pooling';
import { hashStringToSeed } from './rng';
import { generateStarMap } from './run/runGen';
import { applyRunNodeOutcome, completeNode, createRunState, deterministicNodeSeed, selectableNodeIds, startNode } from './run/runRules';
import type { NodeType, RunDifficulty, RunFocus, RunNodeResult, RunState, StarMapGraph, StarMapNode } from './run/runTypes';
import { applyCrewExploreModifier, hasCaptainPersuadeBonus, resolveAnomalyForNode, resolveMissionForNode, resolveShopInventory } from './run/nodeResolvers';
import { assignCrew, crewChoiceThreshold } from './crew/crewRules';
import { CREW_ROLE_LABELS, CREW_ROLES, type CrewRole } from './crew/crewTypes';
import { formatDialogueTemplate, resolveDialogueContext, selectCrewDialogue } from './crew/crewDialogue';
import { applyDeterministicDamageRoll, applyHullDelta } from './ship/shipDamage';
import { createRunSnapshot } from './run/runSnapshot';
import { addCrewToRoster, generateRecruitmentPool } from './crew/crewGen';
import { advanceRoute, buildRoute, currentRouteSystem, isRouteComplete } from './run/route';
import { computeFrontlineState, generateGalacticReport } from './world/frontline';
import { resolveFleeAttempt, resolveInspection, rollPiracyEncounter } from './world/risk';
import { dayKeyUtc, weekKeyUtc } from './world/time';
import { getSystemById, loadUniverse, type UniverseSystem } from './world/universe';
import { ensureHullState, equipModuleForHull, loadHullCatalog, purchaseHull, switchHull } from './ship/hulls';
import { applyHullCosmetic, ensureCosmetics, loadCosmeticsCatalog, recommendedHullClassesForFocus } from './ship/cosmetics';
import { exportHangarCardPng } from './ship/showroom';
import { applyPostCombatDroneRepair, assignDrone, loadDrones, unlockDrone } from './fleet/drone';
import { assignActiveWingmen, generateWingmanOffers, loadWingmen, recruitWingman, type Wingman } from './fleet/wingmen';
import { loadEscortMissions, resolveEscortNode } from './fleet/escortMissions';
import { applyPatrolChoice, patrolPresenceForSystem, patrolRiskModifier, type PatrolPresence } from './world/patrols';

interface StarlightSceneConfig {
  hooks: GameRuntimeHooks;
}

type ScreenId = 'bridge' | 'navmap' | 'market' | 'hangar' | 'shipyard' | 'fleet' | 'starmap' | 'story' | 'explore' | 'patrol' | 'combat' | 'shop' | 'inventory' | 'codex' | 'summary';

interface BulletEntity extends PoolItem {
  sprite: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  damage: number;
  fromPlayer: boolean;
}

interface EnemyEntity extends PoolItem {
  sprite: Phaser.GameObjects.Rectangle;
  def: EnemyDefinition;
  hp: number;
  maxHp: number;
  shotCooldownMs: number;
  waveTag: string;
  telegraphUntil: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function intersects(a: Phaser.GameObjects.Rectangle, b: Phaser.GameObjects.Rectangle, bScale = 1): boolean {
  const bw = b.width * bScale;
  const bh = b.height * bScale;
  return Math.abs(a.x - b.x) * 2 < a.width + bw && Math.abs(a.y - b.y) * 2 < a.height + bh;
}

function mapDifficultyScale(difficulty: RunDifficulty): number {
  if (difficulty === 'easy') return 0.9;
  if (difficulty === 'hard') return 1.25;
  return 1;
}

function mapDifficultyWaveBonus(difficulty: RunDifficulty): number {
  if (difficulty === 'hard') return 1;
  if (difficulty === 'easy') return -1;
  return 0;
}

export function simulateStarMapSelectionHeadless(seed: number): { firstNodeType: string; finished: boolean } {
  const graph = generateStarMap(seed, 'diplomacy');
  let runState = createRunState(seed, 'normal', 'diplomacy');
  const first = selectableNodeIds(runState, graph)[0];
  runState = startNode(runState, first);
  runState = completeNode(
    runState,
    first,
    {
      credits: 0,
      materials: 0,
      morale: 0,
      condition: 0,
      xp: 0,
      factionDelta: { concordium: 0, freebelt: 0, astral: 0 },
      notes: ['sim']
    },
    graph
  );
  const node = graph.nodes.find((entry) => entry.id === first);
  return { firstNodeType: node?.type ?? 'UNKNOWN', finished: runState.finished };
}

export function simulateCrewBootAndNodeHeadless(seed: number): { ok: boolean; activeCaptain: string | null } {
  let profile = createInitialProfile(seed);
  const captain = profile.crew.roster.find((entry) => entry.role === 'captain');
  if (captain) {
    profile = {
      ...profile,
      crew: assignCrew(profile.crew, 'captain', captain.id)
    };
  }

  const started = beginRun(profile);
  const graph = generateStarMap(started.runSeed, 'diplomacy');
  let runState = createRunState(started.runSeed, 'normal', 'diplomacy');
  const first = selectableNodeIds(runState, graph)[0];
  runState = startNode(runState, first);
  runState = completeNode(
    runState,
    first,
    {
      credits: 0,
      materials: 0,
      morale: 0,
      condition: 0,
      xp: 0,
      factionDelta: { concordium: 0, freebelt: 0, astral: 0 },
      notes: ['crew-sim']
    },
    graph
  );

  return { ok: runState.summary.nodesCompleted >= 1, activeCaptain: started.profile.crew.active.captain };
}

export class StarlightChroniclesScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private readonly chapters = loadChapters();
  private readonly anomalies = loadAnomalies();
  private readonly items = loadItemsCatalog();
  private readonly goods = loadGoodsCatalog();
  private readonly hulls = loadHullCatalog();
  private readonly cosmetics = loadCosmeticsCatalog();
  private readonly universe = loadUniverse();
  private readonly shocks = loadMarketShocks();
  private readonly enemies = loadEnemies();
  private readonly missions = loadMissions();
  private readonly wingmen = loadWingmen();
  private readonly drones = loadDrones();
  private readonly escortMissions = loadEscortMissions();

  private screen: ScreenId = 'bridge';
  private uiContainer!: Phaser.GameObjects.Container;
  private toastText!: Phaser.GameObjects.Text;
  private toastUntil = 0;

  private profile!: StarlightProfile;
  private derivedStats!: DerivedShipStats;

  private runDifficulty: RunDifficulty = 'normal';
  private runFocus: RunFocus = 'diplomacy';
  private activeRunGraph: StarMapGraph | null = null;
  private activeRunState: RunState | null = null;
  private currentRunSeed = 1;
  private selectedNode: StarMapNode | null = null;
  private runTravelLegHandled = false;
  private runAmbushPending = false;
  private activePatrol: PatrolPresence | null = null;
  private companionLine = '';
  private reduceMotion = false;

  private chapterId = 'prologue';
  private storyNodeId = '';

  private scanAssist = true;
  private scanProgress = 0;
  private scanHolding = false;
  private discoveredAnomaly: AnomalyDefinition | null = null;

  private combatHudTop!: Phaser.GameObjects.Text;
  private combatHudBottom!: Phaser.GameObjects.Text;
  private combatShipSprite!: Phaser.GameObjects.Rectangle;
  private combatShip!: CombatShipState;
  private combatScore: CombatScoreState = { kills: 0, combo: 0, bestCombo: 0, damageTaken: 0 };
  private activeMission: MissionDefinition | null = null;
  private currentWaveIndex = 0;
  private spawnedInWave = 0;
  private waveSpawnTimerMs = 0;
  private combatRunning = false;
  private combatWon = false;
  private combatLost = false;
  private rewardApplied = false;
  private combatAmbushActive = false;

  private autoFire = true;
  private lastPlayerFireMs = 0;
  private lastAbilityMs = -99999;
  private dragPointerId: number | null = null;
  private combatTargetX = 640;
  private dragLastX = 640;
  private combatDamageBoost = 0;
  private combatIncomingMitigation = 0;
  private combatHitEventIndex = 0;
  private endReported = false;

  private bulletPool = createPool<BulletEntity>(
    () => ({
      active: false,
      sprite: this.add.rectangle(-999, -999, 6, 20, 0xa6d6ff, 1).setVisible(false),
      vx: 0,
      vy: 0,
      damage: 10,
      fromPlayer: true
    }),
    90
  );

  private enemyPool = createPool<EnemyEntity>(
    () => ({
      active: false,
      sprite: this.add.rectangle(-999, -999, 30, 30, 0xff6f7d, 1).setVisible(false),
      def: this.enemies[0],
      hp: 1,
      maxHp: 1,
      shotCooldownMs: 0,
      waveTag: '',
      telegraphUntil: 0
    }),
    48
  );

  constructor(config: StarlightSceneConfig) {
    super('starlight-chronicles-main');
    this.hooks = config.hooks;
  }

  create() {
    const seed = this.hooks.multiplayer?.seed ?? hashStringToSeed('starlight-chronicles-default-seed');
    this.profile = loadProfile(seed);
    if (this.profile.profileVersion !== 6) {
      this.profile = createInitialProfile(seed);
    }
    this.profile = ensureCosmetics(ensureHullState(this.profile, this.hulls, this.items.modules), this.hulls, this.cosmetics);
    this.derivedStats = deriveShipStats(this.profile, this.items.modules, this.hulls);
    this.reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    this.add.rectangle(640, 360, 1280, 720, 0x071120, 1);
    this.add.rectangle(640, 200, 1400, 640, 0x14335e, 0.28).setAngle(-10);
    this.add.rectangle(290, 640, 1000, 380, 0x173c63, 0.2).setAngle(8);

    this.combatShipSprite = this.add.rectangle(640, 640, 50, 30, 0x8bd8ff).setVisible(false);
    this.combatHudTop = this.add.text(20, 14, '', { fontFamily: 'Verdana', fontSize: '24px', color: '#f4f8ff' }).setVisible(false);
    this.combatHudBottom = this.add.text(20, 675, '', { fontFamily: 'Verdana', fontSize: '22px', color: '#d4e8ff' }).setVisible(false);

    this.toastText = this.add
      .text(640, 48, '', {
        fontFamily: 'Verdana',
        fontSize: '24px',
        color: '#f9fbff',
        backgroundColor: '#233e5d'
      })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setVisible(false);

    this.uiContainer = this.add.container(0, 0);

    this.registerInputHandlers();
    this.renderBridge();
    this.reportGameStart('session');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
  }

  update(_time: number, delta: number) {
    if (this.toastUntil > 0 && this.time.now > this.toastUntil) {
      this.toastUntil = 0;
      this.toastText.setVisible(false);
    }

    if (this.screen === 'explore' && this.scanHolding) {
      const bonus = 1 + this.profile.runModifiers.nextExploreScanBoost;
      const rate = this.scanAssist ? 0.06 : 0.09;
      this.scanProgress = clamp(this.scanProgress + delta * rate * this.derivedStats.scanRateMultiplier * bonus, 0, 100);
      if (this.scanProgress >= 100 && !this.discoveredAnomaly && this.selectedNode && this.activeRunState) {
        this.discoveredAnomaly = resolveAnomalyForNode(
          this.anomalies,
          this.selectedNode.id,
          this.profile.captainRank,
          this.profile.metaUnlocks.rareAnomalyNode
        );
        this.renderExplore();
      }
    }

    if (this.screen === 'combat' && this.combatRunning) {
      this.updateCombat(delta);
    }
  }

  private registerInputHandlers() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.screen === 'explore') {
        this.scanHolding = true;
      }

      if (this.screen !== 'combat') return;
      if (pointer.y < this.scale.height * (2 / 3)) return;
      this.dragPointerId = pointer.id;
      this.combatTargetX = clamp(pointer.x, 40, this.scale.width - 40);
      this.dragLastX = pointer.x;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.screen !== 'combat' || !this.combatRunning) return;
      if (pointer.id !== this.dragPointerId) return;
      if (Math.abs(pointer.x - this.dragLastX) < 6) return;
      this.combatTargetX = clamp(pointer.x, 40, this.scale.width - 40);
      this.dragLastX = pointer.x;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.screen === 'explore') {
        this.scanHolding = false;
      }
      if (pointer.id === this.dragPointerId) {
        this.dragPointerId = null;
      }
    });
  }

  private notifyStandingDelta(before: StarlightProfile, after: StarlightProfile) {
    const dc = after.factions.concordium - before.factions.concordium;
    const df = after.factions.freebelt - before.factions.freebelt;
    const da = after.factions.astral - before.factions.astral;
    const parts: string[] = [];
    if (dc !== 0) parts.push(`Concordium ${dc > 0 ? '+' : ''}${dc}`);
    if (df !== 0) parts.push(`Freebelt ${df > 0 ? '+' : ''}${df}`);
    if (da !== 0) parts.push(`Astral ${da > 0 ? '+' : ''}${da}`);
    if (parts.length === 0) return;
    this.toastText.setText(parts.join(' | ')).setVisible(true);
    this.toastUntil = this.time.now + (this.reduceMotion ? 900 : 1800);
  }

  private commitProfile(nextProfile: StarlightProfile) {
    const before = this.profile;
    const normalized = ensureCosmetics(ensureHullState(nextProfile, this.hulls, this.items.modules), this.hulls, this.cosmetics);
    this.profile = normalized;
    this.derivedStats = deriveShipStats(this.profile, this.items.modules, this.hulls);
    if (this.profile.cargoCapacity !== this.derivedStats.cargoCapacity) {
      this.profile = { ...this.profile, cargoCapacity: this.derivedStats.cargoCapacity };
    }
    saveProfile(this.profile);
    this.notifyStandingDelta(before, this.profile);
  }

  private clearUi() {
    this.uiContainer.removeAll(true);
    this.combatShipSprite.setVisible(false);
    this.combatHudTop.setVisible(false);
    this.combatHudBottom.setVisible(false);
    this.scanHolding = false;
  }

  private switchScreen(screen: ScreenId) {
    this.screen = screen;
    if (screen === 'bridge') this.renderBridge();
    if (screen === 'navmap') this.renderNavMap();
    if (screen === 'market') this.renderMarket();
    if (screen === 'hangar') this.renderHangar();
    if (screen === 'shipyard') this.renderShipyard();
    if (screen === 'fleet') this.renderFleet();
    if (screen === 'starmap') this.renderStarMap();
    if (screen === 'story') this.renderStoryNode();
    if (screen === 'explore') this.renderExplore();
    if (screen === 'patrol') this.renderPatrolNode();
    if (screen === 'combat') this.renderCombat();
    if (screen === 'shop') this.renderShop();
    if (screen === 'inventory') this.renderInventory();
    if (screen === 'codex') this.renderCodex();
    if (screen === 'summary') {
      this.renderSummary();
      if (!this.endReported) {
        this.endReported = true;
        this.hooks.reportEvent({
          type: 'game_end',
          gameId: this.hooks.gameId,
          score: this.runSummaryScore(),
          outcome: 'summary'
        });
      }
    }
  }

  private reportGameStart(mode: string) {
    this.endReported = false;
    this.hooks.reportEvent({ type: 'game_start', gameId: this.hooks.gameId, mode });
  }

  private runSummaryScore(): number {
    const summary = this.activeRunState?.summary;
    if (!summary) return 0;
    return Math.round(summary.totalCredits + summary.totalMaterials * 4 + summary.totalXp);
  }

  private addHeader(title: string, subtitle: string) {
    const panel = makePanel(this, 640, 360, 1160, 640);
    const titleText = this.add.text(96, 64, title, { fontFamily: 'Verdana', fontSize: '44px', color: '#f6fbff' });
    const subtitleText = this.add.text(96, 118, subtitle, {
      fontFamily: 'Verdana',
      fontSize: '23px',
      color: '#c8ddf8',
      wordWrap: { width: 1028 }
    });
    this.uiContainer.add([panel, titleText, subtitleText]);
  }

  private addFactionMeters(y: number) {
    const lines = [
      `Concordium ${this.profile.factions.concordium}`,
      `Freebelt ${this.profile.factions.freebelt}`,
      `Astral ${this.profile.factions.astral}`
    ].join('    ');
    const text = this.add.text(96, y, lines, { fontFamily: 'Verdana', fontSize: '24px', color: '#b9ddff' });
    this.uiContainer.add(text);
  }

  private dominantFaction(): 'concordium' | 'freebelt' | 'astral' {
    const entries: Array<{ id: 'concordium' | 'freebelt' | 'astral'; value: number }> = [
      { id: 'concordium', value: this.profile.factions.concordium },
      { id: 'freebelt', value: this.profile.factions.freebelt },
      { id: 'astral', value: this.profile.factions.astral }
    ];
    entries.sort((a, b) => b.value - a.value);
    return entries[0].id;
  }

  private currentSystem(): UniverseSystem {
    return getSystemById(this.universe, this.profile.currentSystemId);
  }

  private currentWeekKey(): string {
    return weekKeyUtc(new Date());
  }

  private currentDayKey(): string {
    return dayKeyUtc(new Date());
  }

  private currentFrontline() {
    return computeFrontlineState(this.universe, this.profile.seedBase, this.currentWeekKey());
  }

  private currentShockIds(): string[] {
    return getMarketShockIdsForNow(this.profile.seedBase, this.shocks, new Date());
  }

  private activeRoutePath(): string[] {
    return this.profile.routeProgress?.path ?? [this.profile.currentSystemId];
  }

  private hasHiddenCompartments(): boolean {
    const loadout = this.profile.hullLoadouts[this.profile.activeHullId];
    return loadout?.utility.includes('hidden-compartments') ?? false;
  }

  private hasEscortCapability(): boolean {
    return this.profile.activeWingmenIds.length > 0 || !!this.profile.activeDroneId;
  }

  private nodeSituation(nodeType: NodeType | null): 'story' | 'explore' | 'combat' | 'shop' | 'boss' {
    if (nodeType === 'STORY') return 'story';
    if (nodeType === 'EXPLORE') return 'explore';
    if (nodeType === 'COMBAT' || nodeType === 'ESCORT') return 'combat';
    if (nodeType === 'DELIVERY') return 'shop';
    if (nodeType === 'PATROL') return 'explore';
    if (nodeType === 'BOSS') return 'boss';
    return 'shop';
  }

  private refreshCompanionLine(nodeType: NodeType | null, nodeId: string, nodeLabel: string) {
    const context = resolveDialogueContext(this.profile, this.currentRunSeed || this.profile.seedBase, nodeId, nodeLabel, this.nodeSituation(nodeType), this.runFocus);
    this.companionLine = selectCrewDialogue(context);
  }

  private addCompanionText(y: number) {
    const line = this.companionLine || formatDialogueTemplate('{CAPTAIN}: Ready for {NODE}.', { CAPTAIN: 'Captain', NODE: 'deployment' });
    const text = this.add.text(96, y, line, {
      fontFamily: 'Verdana',
      fontSize: '20px',
      color: '#d2e7ff',
      wordWrap: { width: 1030 }
    });
    this.uiContainer.add(text);
  }

  private addShipStatusPanel(x: number, y: number) {
    const box = this.add.rectangle(x, y, 470, 168, 0x122a46, 0.92).setStrokeStyle(2, 0x85b8ff, 0.65);
    const systems = this.profile.shipDamage.systems;
    const label = this.add.text(
      x - 220,
      y - 62,
      `Ship Status\nHull ${this.profile.shipDamage.hullIntegrity} | Engines ${systems.engines}/3 | Weapons ${systems.weapons}/3 | Sensors ${systems.sensors}/3`,
      {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#e4f1ff',
        wordWrap: { width: 430 }
      }
    );
    const tip = this.add.text(
      x - 220,
      y + 20,
      'Tooltip: Engines reduce move/dodge, Weapons slow fire rate, Sensors reduce scan speed.',
      { fontFamily: 'Verdana', fontSize: '16px', color: '#aac9ec', wordWrap: { width: 430 } }
    );
    this.uiContainer.add([box, label, tip]);
  }

  private renderCrewAssignmentModal(role: CrewRole) {
    const panel = this.add.rectangle(640, 360, 1060, 560, 0x0b1b30, 0.97).setStrokeStyle(2, 0xc4ddff, 0.8);
    panel.name = 'crew-modal';
    const title = this.add.text(130, 112, `${CREW_ROLE_LABELS[role]} Assignment`, { fontFamily: 'Verdana', fontSize: '30px', color: '#f4f9ff' });
    title.name = 'crew-modal';
    this.uiContainer.add([panel, title]);

    const roleCrew = this.profile.crew.roster.filter((entry) => entry.role === role);
    for (let i = 0; i < roleCrew.length; i += 1) {
      const member = roleCrew[i];
      const perkSummary = member.perks.map((perk) => `${perk.label} L${perk.unlockLevel}`).join(' | ');
      const btn = makeButton(
        this,
        640,
        188 + i * 82,
        `${member.name} [${member.rarity}] Lv${member.level} ${member.traits.join('/')} | ${perkSummary}`,
        () => {
          this.commitProfile({
            ...this.profile,
            crew: assignCrew(this.profile.crew, role, member.id)
          });
          this.renderBridge();
        },
        940,
        68,
        this.profile.crew.active[role] === member.id ? 0x547b33 : 0x325983
      );
      btn.container.name = 'crew-modal';
      this.uiContainer.add(btn.container);
    }

    const clear = makeButton(this, 360, 612, 'Unassign', () => {
      this.commitProfile({
        ...this.profile,
        crew: assignCrew(this.profile.crew, role, null)
      });
      this.renderBridge();
    }, 230, 52, 0x7a4d4d);
    clear.container.name = 'crew-modal';
    const close = makeButton(this, 920, 612, 'Close', () => this.renderBridge(), 230, 52, 0x5a6780);
    close.container.name = 'crew-modal';
    this.uiContainer.add([clear.container, close.container]);
  }

  private renderBridge() {
    this.clearUi();
    this.addHeader('Starlight Chronicles', 'Bridge | Start a seeded run from the Star Map.');
    this.refreshCompanionLine(null, 'bridge', 'Bridge');
    const system = this.currentSystem();
    const hull = this.hulls.hulls.find((entry) => entry.id === this.profile.activeHullId) ?? this.hulls.hulls[0];
    const frontline = this.currentFrontline();
    const report = generateGalacticReport(this.universe, this.profile.seedBase, this.currentWeekKey());
    const reportIsNew = this.profile.lastSeenGalacticReportWeekKey !== report.weekKey;

    const stats = this.add.text(
      96,
      170,
      `Rank ${this.profile.captainRank}  XP ${this.profile.captainXp}  Hull ${hull.name} (${hull.class})\nCredits ${this.profile.inventory.credits}  Materials ${this.profile.inventory.materials}  Morale ${this.profile.crewMorale}\nSystem ${system.name} (${system.security})  Cargo ${this.profile.cargoCapacity - cargoFree(this.profile, this.goods)}/${this.profile.cargoCapacity}`,
      { fontFamily: 'Verdana', fontSize: '24px', color: '#f8f9ff' }
    );
    this.uiContainer.add(stats);
    this.addCompanionText(236);
    this.addFactionMeters(245);
    this.addShipStatusPanel(900, 228);

    const difficultyButton = makeButton(this, 280, 336, `Difficulty: ${this.runDifficulty.toUpperCase()}`, () => {
      const order: RunDifficulty[] = ['easy', 'normal', 'hard'];
      const idx = order.indexOf(this.runDifficulty);
      this.runDifficulty = order[(idx + 1) % order.length];
      this.renderBridge();
    }, 360, 66, 0x315985);

    const focusButton = makeButton(this, 660, 336, `Focus: ${this.runFocus.toUpperCase()}`, () => {
      const order: RunFocus[] = ['diplomacy', 'profit', 'wonder'];
      const idx = order.indexOf(this.runFocus);
      this.runFocus = order[(idx + 1) % order.length];
      this.renderBridge();
    }, 360, 66, 0x315985);

    const startRun = makeButton(this, 470, 426, 'Start Run', () => this.startRunFlow(), 520, 74, 0x2f7fcf);
    const inventory = makeButton(this, 280, 520, 'Inventory/Fitting', () => this.switchScreen('inventory'), 360, 66, 0x2c5f8f);
    const codex = makeButton(this, 660, 520, 'Codex Log', () => this.switchScreen('codex'), 360, 66, 0x2c5f8f);
    const crewBtn = makeButton(this, 1035, 520, 'Crew', () => this.renderCrewAssignmentModal('captain'), 230, 66, 0x2c5f8f);
    const navMapBtn = makeButton(this, 280, 430, 'Nav Map', () => this.switchScreen('navmap'), 360, 66, 0x2f6f92);
    const marketBtn = makeButton(this, 660, 430, 'Market', () => this.switchScreen('market'), 360, 66, 0x2f6f92);
    const hangarBtn = makeButton(this, 1035, 430, 'Hangar', () => this.switchScreen('hangar'), 230, 66, 0x2f6f92);
    const shipyardBtn = makeButton(this, 1035, 336, 'Shipyard', () => this.switchScreen('shipyard'), 230, 66, 0x2f6f92);
    const fleetBtn = makeButton(this, 1035, 244, 'Fleet', () => this.switchScreen('fleet'), 230, 66, 0x2f6f92);

    this.uiContainer.add([
      difficultyButton.container,
      focusButton.container,
      startRun.container,
      inventory.container,
      codex.container,
      crewBtn.container,
      navMapBtn.container,
      marketBtn.container,
      hangarBtn.container,
      shipyardBtn.container,
      fleetBtn.container
    ]);

    for (let i = 0; i < CREW_ROLES.length; i += 1) {
      const role = CREW_ROLES[i];
      const assignedId = this.profile.crew.active[role];
      const member = this.profile.crew.roster.find((entry) => entry.id === assignedId);
      const panel = makeButton(
        this,
        235 + i * 270,
        580,
        `${CREW_ROLE_LABELS[role]}\n${member ? `${member.name} Lv${member.level}` : 'Unassigned'}`,
        () => this.renderCrewAssignmentModal(role),
        248,
        72,
        0x2f5170
      );
      this.uiContainer.add(panel.container);
    }

    const bonus = this.add.text(
      96,
      620,
      `Crew Bonuses: Diplomacy +${this.derivedStats.diplomacyBonus.toFixed(1)} | Scan +${this.derivedStats.scanBonus.toFixed(1)} | Repair +${this.derivedStats.repairEfficiency.toFixed(1)} | Combat +${this.derivedStats.combatBonus.toFixed(1)}`,
      { fontFamily: 'Verdana', fontSize: '18px', color: '#d8ecff' }
    );
    this.uiContainer.add(bonus);

    const quickUse = this.add.text(96, 642, 'Quick Consumables:', { fontFamily: 'Verdana', fontSize: '20px', color: '#dfebff' });
    this.uiContainer.add(quickUse);

    const repairBtn = makeButton(this, 310, 684, `Use Repair Kit (${this.profile.inventory.consumables['repair-kit'] ?? 0})`, () => {
      this.useConsumable('repair-kit');
      this.renderBridge();
    }, 360, 56, 0x5e7e35);
    const overBtn = makeButton(this, 690, 684, `Use Overcharge (${this.profile.inventory.consumables['overcharge'] ?? 0})`, () => {
      this.useConsumable('overcharge');
      this.renderBridge();
    }, 360, 56, 0x6c4a9e);
    const scanBtn = makeButton(this, 1070, 684, `Use Scan Booster (${this.profile.inventory.consumables['scan-booster'] ?? 0})`, () => {
      this.useConsumable('scan-booster');
      this.renderBridge();
    }, 320, 56, 0x3f7d7d);

    this.uiContainer.add([repairBtn.container, overBtn.container, scanBtn.container]);

    const reportLine = this.add.text(
      770,
      608,
      `${reportIsNew ? 'NEW ' : ''}Galactic Report ${report.weekKey}: ${report.headline}`,
      { fontFamily: 'Verdana', fontSize: '16px', color: reportIsNew ? '#ffe6a8' : '#c6dcff', wordWrap: { width: 470 } }
    );
    this.uiContainer.add(reportLine);

    if (reportIsNew) {
      this.commitProfile({
        ...this.profile,
        lastSeenGalacticReportWeekKey: report.weekKey
      });
    }

    if (!this.profile.seenTutorials.markets || !this.profile.seenTutorials.contraband || !this.profile.seenTutorials.security) {
      const tipPanel = this.add.rectangle(1030, 300, 390, 190, 0x122a46, 0.93).setStrokeStyle(2, 0xa9d2ff, 0.7);
      const tipText = this.add.text(
        850,
        230,
        `Markets: buy low, sell high.\nContraband: risky in SAFE systems.\nSecurity: SAFE low piracy, LOW mixed, NULL frequent piracy.`,
        { fontFamily: 'Verdana', fontSize: '16px', color: '#e9f4ff', wordWrap: { width: 350 } }
      );
      const dismiss = makeButton(
        this,
        1030,
        360,
        'Understood',
        () => {
          this.commitProfile({
            ...this.profile,
            seenTutorials: {
              markets: true,
              contraband: true,
              security: true
            }
          });
          this.renderBridge();
        },
        220,
        44,
        0x396f9d
      );
      this.uiContainer.add([tipPanel, tipText, dismiss.container]);
    }

    const contested = frontline.contestedSystemIds.includes(system.id) ? 'Contested Frontline' : 'Stable';
    const routeInfo = this.profile.routeTargetSystemId
      ? `Route Target ${this.profile.routeTargetSystemId} (${this.profile.routeProgress ? this.profile.routeProgress.index + 1 : 1}/${this.activeRoutePath().length})`
      : 'Route Target none';
    const worldHint = this.add.text(770, 648, `${contested} | ${routeInfo}`, {
      fontFamily: 'Verdana',
      fontSize: '15px',
      color: '#b7d6ff',
      wordWrap: { width: 470 }
    });
    this.uiContainer.add(worldHint);
  }

  private useConsumable(consumableId: string) {
    const found = this.items.consumables.find((entry) => entry.id === consumableId);
    if (!found) return;
    if ((this.profile.inventory.consumables[consumableId] ?? 0) <= 0) return;
    let next = spendConsumable(this.profile, consumableId);
    const nodeId = this.selectedNode?.id ?? 'bridge';
    next = applyConsumableEffect(next, found, this.currentRunSeed || this.profile.seedBase, nodeId, this.activeRunState?.summary.nodesCompleted ?? 0);
    this.commitProfile(next);
  }

  private startRunFlow() {
    const dayKey = this.currentDayKey();
    const weekKey = this.currentWeekKey();
    const system = this.currentSystem();
    const frontline = this.currentFrontline();
    this.activePatrol = patrolPresenceForSystem(this.profile.seedBase, system.id, system.security, weekKey);
    const inspection = resolveInspection(
      this.profile,
      system,
      this.profile.runCount + 1,
      this.derivedStats.diplomacyBonus,
      this.hasHiddenCompartments(),
      this.hasCaptainPersuadeBonus()
    );
    if (inspection.inspected && inspection.detected) {
      this.commitProfile(inspection.profile);
      this.toastText
        .setText(
          inspection.bribeSucceeded
            ? `Inspection cleared via bribe (${inspection.fineCredits}c).`
            : `Inspection failed: confiscated ${inspection.confiscatedUnits}, fine ${inspection.fineCredits}c.`
        )
        .setVisible(true);
      this.toastUntil = this.time.now + 2600;
    }

    const nextProfile = {
      ...this.profile,
      availableContracts: generateContractsForSystem(this.universe, this.goods, this.profile, this.profile.currentSystemId, dayKey, 3),
      activeContracts: pruneExpiredContracts(this.profile.activeContracts, dayKey)
    };
    this.commitProfile(nextProfile);

    const started = beginRun(this.profile);
    this.currentRunSeed = started.runSeed;
    this.commitProfile(started.profile);
    const needsDeliveryNode =
      !!this.profile.routeTargetSystemId &&
      this.profile.currentSystemId !== this.profile.routeTargetSystemId &&
      this.profile.activeContracts.length > 0;
    const includeEscortNode = this.hasEscortCapability();
    const includePatrolNode = this.activePatrol.intensity > 0.4;
    this.activeRunGraph = generateStarMap(this.currentRunSeed, this.runFocus, {
      includeDeliveryNode: needsDeliveryNode,
      includeEscortNode,
      includePatrolNode
    });
    this.activeRunState = createRunState(this.currentRunSeed, this.runDifficulty, this.runFocus);
    this.activeRunState.pendingNodeIds = selectableNodeIds(this.activeRunState, this.activeRunGraph);
    this.runTravelLegHandled = false;
    const patrolBias = patrolRiskModifier(this.activePatrol, 'avoid');
    this.runAmbushPending = rollPiracyEncounter(this.profile, system, frontline, this.profile.runCount, patrolBias).triggered;
    this.reportGameStart('run');
    this.switchScreen('starmap');
  }

  private hasCaptainPersuadeBonus(): boolean {
    return this.derivedStats.diplomacyBonus >= 8;
  }

  private renderNavMap() {
    this.clearUi();
    this.addHeader('Nav Map', 'Regions and systems. Choose current location and route target.');
    const frontline = this.currentFrontline();
    const route = this.profile.routeProgress;

    let y = 160;
    for (let r = 0; r < this.universe.regions.length; r += 1) {
      const region = this.universe.regions[r];
      const regionLabel = this.add.text(96, y, `${region.name}`, { fontFamily: 'Verdana', fontSize: '24px', color: '#f4f9ff' });
      this.uiContainer.add(regionLabel);
      y += 34;

      for (let i = 0; i < region.systemIds.length; i += 1) {
        const system = getSystemById(this.universe, region.systemIds[i]);
        const selected = system.id === this.profile.currentSystemId;
        const isContested = frontline.contestedSystemIds.includes(system.id);
        const btn = makeButton(
          this,
          520,
          y + i * 56,
          `${selected ? '[Current] ' : ''}${system.name} | ${system.security} | ${system.controllingFaction}${isContested ? ' | CONTESTED' : ''}`,
          () => {
            this.commitProfile({
              ...this.profile,
              currentRegionId: region.id,
              currentSystemId: system.id
            });
            this.renderNavMap();
          },
          820,
          48,
          selected ? 0x3e7f52 : 0x355a85
        );
        this.uiContainer.add(btn.container);

        const routeBtn = makeButton(
          this,
          1080,
          y + i * 56,
          this.profile.routeTargetSystemId === system.id ? 'Route ✓' : 'Set Route',
          () => {
            const path = buildRoute(this.universe, this.profile.currentSystemId, system.id);
            this.commitProfile({
              ...this.profile,
              routeTargetSystemId: system.id,
              routeProgress: { path, index: 0 }
            });
            this.renderNavMap();
          },
          180,
          44,
          0x526f92
        );
        this.uiContainer.add(routeBtn.container);
      }
      y += region.systemIds.length * 56 + 16;
    }

    const routeText = this.add.text(
      96,
      610,
      route ? `Route Path: ${route.path.join(' -> ')} (${route.index + 1}/${route.path.length})` : 'Route Path: none',
      { fontFamily: 'Verdana', fontSize: '19px', color: '#cde2ff', wordWrap: { width: 980 } }
    );
    this.uiContainer.add(routeText);

    const contractsBtn = makeButton(this, 1000, 642, 'Market', () => this.switchScreen('market'), 180, 56, 0x2f6f92);
    const back = makeButton(this, 1180, 642, 'Bridge', () => this.switchScreen('bridge'), 180, 56, 0x5a6780);
    this.uiContainer.add([contractsBtn.container, back.container]);
  }

  private renderMarket() {
    this.clearUi();
    const system = this.currentSystem();
    const frontline = this.currentFrontline();
    const shockIds = this.currentShockIds();
    const prices = computeSystemPrices(this.profile, system, this.goods, this.shocks, frontline, new Date());
    this.addHeader(`Market - ${system.name}`, `Shocks ${shockIds.join(', ')} | Security ${system.security}`);

    const dayKey = this.currentDayKey();
    const contracts = generateContractsForSystem(this.universe, this.goods, this.profile, system.id, dayKey, 3);
    if (this.profile.availableContracts.length === 0 || this.profile.availableContracts[0]?.originSystemId !== system.id) {
      this.commitProfile({ ...this.profile, availableContracts: contracts });
    }

    const cargoState = this.add.text(
      96,
      166,
      `Credits ${this.profile.inventory.credits} | Cargo Used ${this.profile.cargoCapacity - cargoFree(this.profile, this.goods)}/${this.profile.cargoCapacity} | Active Contracts ${this.profile.activeContracts.length}`,
      { fontFamily: 'Verdana', fontSize: '22px', color: '#f5fbff' }
    );
    this.uiContainer.add(cargoState);

    const rowGoods = this.goods.goods.slice(0, 9);
    for (let i = 0; i < rowGoods.length; i += 1) {
      const good = rowGoods[i];
      const price = prices[good.id] ?? good.basePrice;
      const trend = priceTrend(this.profile.seedBase, system, good, shockIds, this.shocks, frontline, new Date());
      const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
      const have = this.profile.cargo[good.id]?.qty ?? 0;

      const line = this.add.text(
        96,
        210 + i * 45,
        `${good.name} ${trendArrow} ${price}c ${good.legality === 'contraband' ? '[CONTRABAND]' : '[LEGAL]'} | Cargo ${have}`,
        { fontFamily: 'Verdana', fontSize: '18px', color: '#dbeaff' }
      );
      this.uiContainer.add(line);

      const buyBtn = makeButton(this, 860, 228 + i * 45, 'Buy 1', () => {
        if (this.profile.inventory.credits < price) return;
        this.commitProfile(addCargo(this.profile, this.goods, good.id, 1, price));
        this.renderMarket();
      }, 120, 36, 0x3e7e56);
      const sellBtn = makeButton(this, 990, 228 + i * 45, 'Sell 1', () => {
        this.commitProfile(removeCargo(this.profile, good.id, 1, price));
        this.renderMarket();
      }, 120, 36, 0x8a6d38);
      this.uiContainer.add([buyBtn.container, sellBtn.container]);
    }

    const listedContracts = this.profile.availableContracts.slice(0, 3);
    for (let i = 0; i < listedContracts.length; i += 1) {
      const contract = listedContracts[i];
      const label = `${contract.smuggling ? 'Smuggle' : 'Deliver'} ${contract.quantity} ${contract.goodId} -> ${contract.destinationSystemId} (${contract.payoutCredits}c, exp ${contract.expiryDayKey})${contract.requiresEscort ? ' [ESCORT REQUIRED]' : ''}`;
      const text = this.add.text(96, 630 + i * 28, label, {
        fontFamily: 'Verdana',
        fontSize: '15px',
        color: '#d4e7ff',
        wordWrap: { width: 820 }
      });
      this.uiContainer.add(text);
      const blocked = contract.requiresEscort && !this.hasEscortCapability();
      const accept = makeButton(
        this,
        1040,
        646 + i * 28,
        this.profile.activeContracts.some((entry) => entry.id === contract.id) ? 'Active' : blocked ? 'Need Fleet' : 'Accept',
        () => {
          if (blocked) return;
          if (this.profile.activeContracts.some((entry) => entry.id === contract.id)) return;
          this.commitProfile({
            ...this.profile,
            activeContracts: [...this.profile.activeContracts, contract]
          });
          this.renderMarket();
        },
        140,
        24,
        0x2f6f92
      );
      this.uiContainer.add(accept.container);
    }

    const bridge = makeButton(this, 1160, 664, 'Bridge', () => this.switchScreen('bridge'), 180, 50, 0x5a6780);
    this.uiContainer.add(bridge.container);
  }

  private renderHangar() {
    this.clearUi();
    this.addHeader('Hangar', 'Select owned hulls, preview appearance, and set cosmetics.');
    const activeHull = this.hulls.hulls.find((entry) => entry.id === this.profile.activeHullId) ?? this.hulls.hulls[0];
    const activeCosmetic = this.profile.hullCosmetics[activeHull.id] ?? { skinKey: activeHull.visuals.skinKey, decalKey: 'none', trailKey: 'none' };

    const previewPanel = this.add.rectangle(900, 260, 520, 280, 0x122a46, 0.95).setStrokeStyle(2, 0x89c2ff, 0.6);
    const shipColor = this.cosmetics.skins.find((entry) => entry.id === activeCosmetic.skinKey)?.color ?? 0x8bd8ff;
    const shipBody = this.add.rectangle(900, 260, 140, 60, shipColor, 1);
    const decalSymbol = this.cosmetics.decals.find((entry) => entry.id === activeCosmetic.decalKey)?.symbol ?? '';
    const decal = this.add.text(900, 260, decalSymbol, { fontFamily: 'Verdana', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    this.tweens.add({ targets: shipBody, y: 250, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.uiContainer.add([previewPanel, shipBody, decal]);

    const stats = this.add.text(
      640,
      390,
      `${activeHull.name} (${activeHull.class})\nHP ${activeHull.stats.maxHP} | Move ${activeHull.stats.moveSpeed} | Fire ${activeHull.stats.fireRate} | Dmg x${activeHull.stats.damageMult.toFixed(2)}\nScan ${activeHull.stats.scanBonus.toFixed(2)} | Cargo ${activeHull.stats.cargoCapacity} | Flee ${activeHull.stats.fleeBonus.toFixed(2)}\nSlots W${activeHull.slots.weaponSlots} S${activeHull.slots.shieldSlots} U${activeHull.slots.utilitySlots}\nFit W[${this.derivedStats.activeLoadout.weapon.join(', ') || '-'}] S[${this.derivedStats.activeLoadout.shield.join(', ') || '-'}] U[${this.derivedStats.activeLoadout.utility.join(', ') || '-'}]`,
      { fontFamily: 'Verdana', fontSize: '17px', color: '#d9ebff', wordWrap: { width: 560 } }
    );
    this.uiContainer.add(stats);

    const owned = this.hulls.hulls.filter((hull) => this.profile.ownedHullIds.includes(hull.id));
    for (let i = 0; i < owned.length; i += 1) {
      const hull = owned[i];
      const selected = hull.id === this.profile.activeHullId;
      const btn = makeButton(
        this,
        250,
        212 + i * 68,
        `${selected ? '✓ ' : ''}${hull.name} (${hull.class})`,
        () => {
          this.commitProfile(switchHull(this.profile, this.hulls, this.items.modules, hull.id));
          this.renderHangar();
        },
        290,
        52,
        selected ? 0x3f7f57 : 0x325983
      );
      this.uiContainer.add(btn.container);
    }

    const skinIds = this.cosmetics.skins.map((entry) => entry.id);
    const decalIds = this.cosmetics.decals.map((entry) => entry.id);
    const trailIds = this.cosmetics.trails.map((entry) => entry.id);
    const nextSkin = skinIds[(Math.max(0, skinIds.indexOf(activeCosmetic.skinKey)) + 1) % skinIds.length];
    const nextDecal = decalIds[(Math.max(0, decalIds.indexOf(activeCosmetic.decalKey)) + 1) % decalIds.length];
    const nextTrail = trailIds[(Math.max(0, trailIds.indexOf(activeCosmetic.trailKey)) + 1) % trailIds.length];

    const skinBtn = makeButton(this, 760, 540, `Skin: ${activeCosmetic.skinKey}`, () => {
      this.commitProfile(applyHullCosmetic(this.profile, activeHull.id, 'skinKey', nextSkin, this.cosmetics));
      this.renderHangar();
    }, 260, 48, 0x2f6f92);
    const decalBtn = makeButton(this, 1030, 540, `Decal: ${activeCosmetic.decalKey}`, () => {
      this.commitProfile(applyHullCosmetic(this.profile, activeHull.id, 'decalKey', nextDecal, this.cosmetics));
      this.renderHangar();
    }, 260, 48, 0x2f6f92);
    const trailBtn = makeButton(this, 900, 594, `Trail: ${activeCosmetic.trailKey}`, () => {
      this.commitProfile(applyHullCosmetic(this.profile, activeHull.id, 'trailKey', nextTrail, this.cosmetics));
      this.renderHangar();
    }, 260, 48, 0x2f6f92);
    this.uiContainer.add([skinBtn.container, decalBtn.container, trailBtn.container]);

    const shareBtn = makeButton(this, 260, 650, 'Share Hangar Card', async () => {
      try {
        const blob = await exportHangarCardPng(this.profile, {
          hullName: activeHull.name,
          hullClass: activeHull.class,
          hp: activeHull.stats.maxHP,
          dps: this.derivedStats.bulletDamage * (1000 / this.derivedStats.fireIntervalMs),
          scan: this.derivedStats.scanRateMultiplier,
          cargo: this.derivedStats.cargoCapacity,
          color: `#${(shipColor >>> 0).toString(16).padStart(6, '0')}`
        });
        if (typeof window !== 'undefined') {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `starlight-hangar-${activeHull.id}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
        this.toastText.setText('Hangar card exported.').setVisible(true);
        this.toastUntil = this.time.now + 1500;
      } catch {
        this.toastText.setText('Hangar card export failed.').setVisible(true);
        this.toastUntil = this.time.now + 1500;
      }
    }, 290, 52, 0x6a4f8f);
    const back = makeButton(this, 1160, 650, 'Bridge', () => this.switchScreen('bridge'), 180, 52, 0x5a6780);
    this.uiContainer.add([shareBtn.container, back.container]);
  }

  private renderShipyard() {
    this.clearUi();
    this.addHeader('Shipyard', 'Unlock and purchase hull classes. Host progression remains offline/local.');
    const rec = recommendedHullClassesForFocus(this.runFocus === 'profit' ? 'profit' : this.runFocus === 'wonder' ? 'wonder' : 'diplomacy');
    const header = this.add.text(96, 150, `Recommended for ${this.runFocus.toUpperCase()}: ${rec.join(', ')}`, {
      fontFamily: 'Verdana',
      fontSize: '18px',
      color: '#d8ebff'
    });
    this.uiContainer.add(header);

    for (let i = 0; i < this.hulls.hulls.length; i += 1) {
      const hull = this.hulls.hulls[i];
      const owned = this.profile.ownedHullIds.includes(hull.id);
      const unlockable = !owned && (hull.unlock.type === 'starter' || this.profile.captainRank >= (hull.unlock.rank ?? 0) || (hull.unlock.faction ? this.profile.factions[hull.unlock.faction] >= (hull.unlock.standing ?? 0) : false) || this.profile.inventory.credits >= (hull.unlock.credits ?? 0));
      const y = 210 + i * 74;
      const cost = hull.unlock.credits ?? 0;
      const row = this.add.text(
        96,
        y,
        `${hull.name} (${hull.class}) | HP ${hull.stats.maxHP} Cargo ${hull.stats.cargoCapacity} | Slots W${hull.slots.weaponSlots} S${hull.slots.shieldSlots} U${hull.slots.utilitySlots}`,
        { fontFamily: 'Verdana', fontSize: '16px', color: '#e4f2ff', wordWrap: { width: 780 } }
      );
      this.uiContainer.add(row);
      const action = makeButton(
        this,
        1020,
        y + 20,
        owned ? 'Owned' : `Buy ${cost}c`,
        () => {
          this.commitProfile(purchaseHull(this.profile, hull));
          this.renderShipyard();
        },
        200,
        44,
        owned ? 0x3f7f57 : unlockable ? 0x2f6f92 : 0x5a5a5a
      );
      this.uiContainer.add(action.container);
    }

    const back = makeButton(this, 1160, 650, 'Bridge', () => this.switchScreen('bridge'), 180, 52, 0x5a6780);
    this.uiContainer.add(back.container);
  }

  private renderFleet() {
    this.clearUi();
    const system = this.currentSystem();
    const offers = generateWingmanOffers(this.wingmen, this.profile, system.id, this.currentDayKey(), 2);
    this.addHeader('Fleet Ops', 'Assign wingmen, activate drones, and recruit deterministic local offers.');

    const wingmanById = new Map(this.wingmen.wingmen.map((entry) => [entry.id, entry]));
    const roster = this.profile.ownedWingmenIds
      .map((id) => wingmanById.get(id))
      .filter((entry): entry is Wingman => Boolean(entry));
    const activeDrone = this.drones.drones.find((entry) => entry.id === this.profile.activeDroneId) ?? null;

    const status = this.add.text(
      96,
      170,
      `Active Wingmen: ${this.profile.activeWingmenIds.join(', ') || 'none'} | Active Drone: ${activeDrone?.name ?? 'none'}\nEscort Capability: ${this.hasEscortCapability() ? 'YES' : 'NO'} | Patrol-ready for ${system.name}`,
      { fontFamily: 'Verdana', fontSize: '20px', color: '#e8f4ff' }
    );
    this.uiContainer.add(status);

    for (let i = 0; i < roster.slice(0, 6).length; i += 1) {
      const wingman = roster[i];
      const active = this.profile.activeWingmenIds.includes(wingman.id);
      const btn = makeButton(
        this,
        360,
        248 + i * 62,
        `${active ? '✓ ' : ''}${wingman.name} (${wingman.role}) ${wingman.passive}`,
        () => {
          const current = this.profile.activeWingmenIds.includes(wingman.id)
            ? this.profile.activeWingmenIds.filter((id) => id !== wingman.id)
            : [...this.profile.activeWingmenIds, wingman.id];
          this.commitProfile(assignActiveWingmen(this.profile, current));
          this.renderFleet();
        },
        520,
        48,
        active ? 0x3f7f57 : 0x315985
      );
      this.uiContainer.add(btn.container);
    }

    for (let i = 0; i < offers.length; i += 1) {
      const offer = offers[i];
      const cost = offer.rarity === 'rare' ? 170 : offer.rarity === 'uncommon' ? 120 : 90;
      const btn = makeButton(
        this,
        920,
        250 + i * 62,
        `Recruit ${offer.name} (${offer.role}) ${cost}c`,
        () => {
          if (this.profile.inventory.credits < cost) return;
          this.commitProfile(
            recruitWingman(
              {
                ...this.profile,
                inventory: { ...this.profile.inventory, credits: this.profile.inventory.credits - cost }
              },
              offer.id
            )
          );
          this.renderFleet();
        },
        420,
        48,
        0x4f5f8f
      );
      this.uiContainer.add(btn.container);
    }

    const drones = this.drones.drones.slice(0, 6);
    for (let i = 0; i < drones.length; i += 1) {
      const drone = drones[i];
      const owned = this.profile.ownedDroneIds.includes(drone.id);
      const active = this.profile.activeDroneId === drone.id;
      const unlockCost = drone.rarity === 'rare' ? 180 : drone.rarity === 'uncommon' ? 130 : 100;
      const label = owned ? `${active ? '✓ ' : ''}${drone.name}` : `Unlock ${drone.name} ${unlockCost}c`;
      const btn = makeButton(
        this,
        920,
        430 + i * 44,
        label,
        () => {
          if (!owned) {
            if (this.profile.inventory.credits < unlockCost) return;
            this.commitProfile(
              unlockDrone(
                {
                  ...this.profile,
                  inventory: { ...this.profile.inventory, credits: this.profile.inventory.credits - unlockCost }
                },
                drone.id
              )
            );
          } else {
            this.commitProfile(assignDrone(this.profile, active ? null : drone.id));
          }
          this.renderFleet();
        },
        420,
        34,
        owned ? (active ? 0x3f7f57 : 0x335e84) : 0x6a4f3f
      );
      this.uiContainer.add(btn.container);
    }

    const back = makeButton(this, 1160, 650, 'Bridge', () => this.switchScreen('bridge'), 180, 52, 0x5a6780);
    this.uiContainer.add(back.container);
  }

  private renderStarMap() {
    this.clearUi();
    if (!this.activeRunGraph || !this.activeRunState) {
      this.switchScreen('bridge');
      return;
    }

    const system = this.currentSystem();
    this.addHeader(
      'Star Map',
      `Run Seed ${this.activeRunGraph.runSeed} | ${this.runDifficulty.toUpperCase()} | Focus ${this.runFocus.toUpperCase()} | ${system.name} ${system.security}`
    );
    this.refreshCompanionLine(this.selectedNode?.type ?? null, this.selectedNode?.id ?? 'starmap', 'Star Map');
    this.addCompanionText(140);
    this.addFactionMeters(170);

    const graph = this.activeRunGraph;
    const runState = this.activeRunState;
    const selectable = selectableNodeIds(runState, graph);

    const stepSpacing = 168;
    const laneY: Record<number, number> = { 0: 270, 1: 385, 2: 500 };

    for (let i = 0; i < graph.nodes.length; i += 1) {
      const node = graph.nodes[i];
      const x = 180 + node.step * stepSpacing;
      const y = laneY[node.lane];
      const selected = selectable.includes(node.id);
      const done = runState.completedNodeIds.includes(node.id);
      const color = done ? 0x294a5f : node.type === 'BOSS' ? 0x9b4b4b : selected ? 0x3f82cc : 0x3a536c;
      const rect = this.add.rectangle(x, y, 128, 72, color, 0.95).setStrokeStyle(2, 0xcce5ff, selected ? 1 : 0.45);
      this.uiContainer.add(rect);

      const text = this.add
        .text(x, y, `${node.type}\nD${node.difficulty}`, { fontFamily: 'Verdana', fontSize: '16px', color: '#f3f8ff', align: 'center' })
        .setOrigin(0.5);
      this.uiContainer.add(text);

      if (selected && !done) {
        rect.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openNode(node.id));
      }
    }

    for (const [from, tos] of Object.entries(graph.edges)) {
      const fromNode = graph.nodes.find((entry) => entry.id === from);
      if (!fromNode) continue;
      const fromX = 180 + fromNode.step * stepSpacing;
      const fromY = laneY[fromNode.lane];
      for (let i = 0; i < tos.length; i += 1) {
        const toNode = graph.nodes.find((entry) => entry.id === tos[i]);
        if (!toNode) continue;
        const toX = 180 + toNode.step * stepSpacing;
        const toY = laneY[toNode.lane];
        const line = this.add.line(0, 0, fromX + 64, fromY, toX - 64, toY, 0x6f9bcc, 0.6).setLineWidth(2);
        this.uiContainer.add(line);
      }
    }

    const snapshot = createRunSnapshot(this.profile, graph, runState, {
      marketShockIds: this.currentShockIds(),
      frontline: this.currentFrontline(),
      patrolContextIds: this.activePatrol ? [this.activePatrol.faction, `${Math.round(this.activePatrol.intensity * 100)}`] : []
    });
    const summary = this.add.text(
      96,
      570,
      `Completed ${runState.summary.nodesCompleted} | Earned ${runState.summary.totalCredits}c ${runState.summary.totalMaterials}m | XP ${runState.summary.totalXp} | Snapshot ${JSON.stringify(snapshot).length}B | Contracts ${this.profile.activeContracts.length}`,
      { fontFamily: 'Verdana', fontSize: '22px', color: '#d7e8ff' }
    );
    this.uiContainer.add(summary);

    const bridge = makeButton(this, 1050, 632, 'Abort Run', () => {
      this.activeRunGraph = null;
      this.activeRunState = null;
      this.switchScreen('bridge');
    }, 230, 60, 0x5a6780);
    this.uiContainer.add(bridge.container);
  }

  private openNode(nodeId: string) {
    if (!this.activeRunGraph || !this.activeRunState) return;
    const node = this.activeRunGraph.nodes.find((entry) => entry.id === nodeId);
    if (!node) return;

    this.activeRunState = startNode(this.activeRunState, nodeId);
    this.selectedNode = node;
    this.refreshCompanionLine(node.type, node.id, node.type);

    if (node.type === 'STORY') {
      const chapterOrder = this.chapters.map((entry) => entry.id);
      const chapterIndex = deterministicNodeSeed(this.currentRunSeed, node.id) % chapterOrder.length;
      this.chapterId = chapterOrder[chapterIndex];
      const chapter = findChapter(this.chapters, this.chapterId);
      this.storyNodeId = this.profile.chapterProgress[chapter.id] ?? chapter.startNodeId;
      this.switchScreen('story');
      return;
    }

    if (node.type === 'EXPLORE') {
      this.scanProgress = 0;
      this.discoveredAnomaly = null;
      this.switchScreen('explore');
      return;
    }

    if (node.type === 'PATROL') {
      this.switchScreen('patrol');
      return;
    }

    if (node.type === 'DELIVERY') {
      const before = this.profile;
      this.completeSelectedNode(this.profileDiffResult(before, before, 'Delivery checkpoint'), { xp: 16, credits: 20 });
      return;
    }

    if (node.type === 'ESCORT') {
      const before = this.profile;
      const escort = resolveEscortNode(this.escortMissions, this.profile, this.drones, this.currentRunSeed, node.id);
      const after = applyRunNodeOutcome(before, escort.outcome);
      this.completeSelectedNode(
        this.profileDiffResult(
          before,
          after,
          `${escort.success ? 'Escort success' : 'Escort failed'} ${escort.mission.name} (${escort.convoyHpRemaining}/${escort.convoyHpMax})`
        ),
        escort.outcome,
        after
      );
      return;
    }

    if (node.type === 'COMBAT' || node.type === 'BOSS') {
      this.combatAmbushActive = node.type === 'COMBAT' && this.runAmbushPending;
      this.runAmbushPending = this.combatAmbushActive ? false : this.runAmbushPending;
      this.switchScreen('combat');
      return;
    }

    if (node.type === 'SHOP') {
      this.switchScreen('shop');
      return;
    }
  }

  private completeSelectedNode(result: RunNodeResult, outcome: OutcomeDelta, resolvedProfile?: StarlightProfile) {
    if (!this.selectedNode || !this.activeRunGraph || !this.activeRunState) return;

    const applied = resolvedProfile ?? applyRunNodeOutcome(this.profile, outcome);
    this.commitProfile(applied);

    this.activeRunState = completeNode(this.activeRunState, this.selectedNode.id, result, this.activeRunGraph);

    if (this.activeRunState.finished) {
      this.applyRunTravelLeg();
      this.switchScreen('summary');
    } else {
      this.switchScreen('starmap');
    }
  }

  private applyRunTravelLeg() {
    if (this.runTravelLegHandled) return;
    this.runTravelLegHandled = true;
    if (!this.profile.routeProgress) return;

    const progressed = advanceRoute(this.profile.routeProgress);
    const newSystem = currentRouteSystem(progressed) || this.profile.currentSystemId;
    const updatedProfile = {
      ...this.profile,
      currentSystemId: newSystem,
      currentRegionId: getSystemById(this.universe, newSystem).regionId,
      routeProgress: isRouteComplete(progressed) ? null : progressed,
      routeTargetSystemId: isRouteComplete(progressed) ? null : this.profile.routeTargetSystemId
    };

    const dayKey = this.currentDayKey();
    const withExpiry = {
      ...updatedProfile,
      activeContracts: pruneExpiredContracts(updatedProfile.activeContracts, dayKey)
    };
    const delivered = resolveDeliveredContracts(withExpiry, dayKey);
    this.commitProfile(delivered.profile);
    if (delivered.delivered.length > 0) {
      this.toastText.setText(`Contracts delivered: ${delivered.delivered.length}`).setVisible(true);
      this.toastUntil = this.time.now + 2200;
    }
  }

  private profileDiffResult(before: StarlightProfile, after: StarlightProfile, note: string): RunNodeResult {
    return {
      credits: after.inventory.credits - before.inventory.credits,
      materials: after.inventory.materials - before.inventory.materials,
      morale: after.crewMorale - before.crewMorale,
      condition: after.shipCondition - before.shipCondition,
      xp: after.captainXp - before.captainXp,
      factionDelta: {
        concordium: after.factions.concordium - before.factions.concordium,
        freebelt: after.factions.freebelt - before.factions.freebelt,
        astral: after.factions.astral - before.factions.astral
      },
      notes: [note]
    };
  }

  private renderStoryNode() {
    this.clearUi();
    if (!this.selectedNode) {
      this.switchScreen('starmap');
      return;
    }

    const chapter = findChapter(this.chapters, this.chapterId);
    const node = findNode(chapter, this.storyNodeId);
    this.addHeader(`${chapter.title} | Story Node`, `Map Node ${this.selectedNode.id}`);
    this.addCompanionText(152);

    const text = this.add.text(96, 178, node.text, {
      fontFamily: 'Verdana',
      fontSize: '28px',
      color: '#f4f8ff',
      wordWrap: { width: 1030 }
    });
    this.uiContainer.add(text);

    const persuadeThreshold = crewChoiceThreshold(this.currentRunSeed, this.selectedNode.id);
    const canPersuade = hasCaptainPersuadeBonus(this.derivedStats.diplomacyBonus, persuadeThreshold);
    const persuadeFaction =
      this.selectedNode.factionInfluenceHint === 'mixed'
        ? 'concordium'
        : this.selectedNode.factionInfluenceHint;
    const persuadeFactionDelta: OutcomeDelta['factionDelta'] =
      persuadeFaction === 'concordium'
        ? { concordium: 1 }
        : persuadeFaction === 'freebelt'
          ? { freebelt: 1 }
          : { astral: 1 };
    const choices = resolveChoicesWithCrewBonus(this.profile, node, canPersuade, {
      crewMorale: 2,
      factionDelta: persuadeFactionDelta,
      xp: 10
    });
    if (choices.length === 0) {
      const back = makeButton(this, 330, 590, 'Complete Node', () => {
        const before = this.profile;
        this.completeSelectedNode(this.profileDiffResult(before, before, 'Story resolved'), { xp: 8 });
      }, 300, 66, 0x48699a);
      this.uiContainer.add(back.container);
      return;
    }

    const renderChoices = choices.slice(0, 3);
    for (let i = 0; i < renderChoices.length; i += 1) {
      const choice = renderChoices[i];
      const btn = makeButton(this, 640, 410 + i * 84, choice.label, () => {
        const before = this.profile;
        if (choice.id === 'crew-persuade') {
          const after = applyRunNodeOutcome(this.profile, choice.outcome);
          this.completeSelectedNode(this.profileDiffResult(before, after, `Story: ${choice.label} | Crew Bonus Applied`), choice.outcome, after);
        } else {
          const result = applyStoryChoice(this.profile, chapter, node.id, choice.id);
          this.storyNodeId = result.nextNodeId ?? node.id;
          const after = result.profile;
          this.completeSelectedNode(this.profileDiffResult(before, after, `Story: ${choice.label}`), choice.outcome, after);
        }
      }, 900, 68, 0x2b5fa2);
      this.uiContainer.add(btn.container);
    }

    const specialRecruit = (deterministicNodeSeed(this.currentRunSeed, this.selectedNode.id) % 3) === 0;
    if (specialRecruit) {
      const recruit = generateRecruitmentPool(
        {
          runSeed: this.currentRunSeed,
          nodeId: `${this.selectedNode.id}-story`,
          standingBias: this.dominantFaction(),
          captainRank: this.profile.captainRank
        },
        1
      )[0];
      if (recruit) {
        const recruitBtn = makeButton(this, 980, 620, `Recruit ${recruit.name}`, () => {
          this.commitProfile({
            ...this.profile,
            crew: addCrewToRoster(this.profile.crew, recruit)
          });
          this.renderStoryNode();
        }, 280, 56, 0x4d688f);
        this.uiContainer.add(recruitBtn.container);
      }
    }

    const skip = makeButton(this, 240, 620, 'Back to Map', () => this.switchScreen('starmap'), 220, 58, 0x5a6780);
    this.uiContainer.add(skip.container);
  }

  private renderExplore() {
    this.clearUi();
    if (!this.selectedNode) {
      this.switchScreen('starmap');
      return;
    }

    const system = this.currentSystem();
    this.addHeader('Explore Node', `Hold to scan. Assist ${this.scanAssist ? 'ON' : 'OFF'} | ${system.name} anomaly profile: ${system.tags.join(', ')}`);
    this.addCompanionText(150);

    const scanPanel = this.add.rectangle(640, 300, 960, 120, 0x0e2a45, 0.95).setStrokeStyle(2, 0xa7cbff, 0.7);
    const scanFill = this.add.rectangle(180, 300, (this.scanProgress / 100) * 920, 90, 0x45b9ff, 0.85).setOrigin(0, 0.5);
    const scanText = this.add.text(196, 274, `Scanning ${Math.floor(this.scanProgress)}%`, {
      fontFamily: 'Verdana',
      fontSize: '30px',
      color: '#f5f9ff'
    });

    this.uiContainer.add([scanPanel, scanFill, scanText]);

    const assistButton = makeButton(this, 280, 430, `Assist: ${this.scanAssist ? 'ON' : 'OFF'}`, () => {
      this.scanAssist = !this.scanAssist;
      this.renderExplore();
    }, 300, 62, 0x3e5e86);
    const mapButton = makeButton(this, 620, 430, 'Back to Map', () => this.switchScreen('starmap'), 240, 62, 0x5a6780);
    this.uiContainer.add([assistButton.container, mapButton.container]);

    if (!this.discoveredAnomaly) {
      const hint = this.add.text(96, 510, 'Hold anywhere to fill scanner. At 100% choose an approach.', {
        fontFamily: 'Verdana',
        fontSize: '22px',
        color: '#bfd9ff'
      });
      this.uiContainer.add(hint);
      return;
    }

    const anomalyTitle = this.add.text(96, 500, `${this.discoveredAnomaly.name}: ${this.discoveredAnomaly.description}`, {
      fontFamily: 'Verdana',
      fontSize: '24px',
      color: '#f3f7ff',
      wordWrap: { width: 1030 }
    });
    this.uiContainer.add(anomalyTitle);

    for (let i = 0; i < this.discoveredAnomaly.responses.length; i += 1) {
      const response = this.discoveredAnomaly.responses[i];
      const btn = makeButton(this, 210 + i * 285, 636, response.label, () => this.resolveExploreResponse(response), 250, 60, 0x2d6bc7);
      this.uiContainer.add(btn.container);
    }
  }

  private resolveExploreResponse(response: AnomalyResponse) {
    if (!this.discoveredAnomaly || !this.selectedNode) return;
    const seed = deterministicNodeSeed(this.currentRunSeed, this.selectedNode.id);
    const before = this.profile;
    const rawAfter = applyAnomalyResponse(before, this.discoveredAnomaly, response.id, seed);
    const rawOutcome = {
      crewMorale: rawAfter.crewMorale - before.crewMorale,
      shipCondition: rawAfter.shipCondition - before.shipCondition,
      credits: rawAfter.inventory.credits - before.inventory.credits,
      materials: rawAfter.inventory.materials - before.inventory.materials,
      xp: rawAfter.captainXp - before.captainXp,
      factionDelta: {
        concordium: rawAfter.factions.concordium - before.factions.concordium,
        freebelt: rawAfter.factions.freebelt - before.factions.freebelt,
        astral: rawAfter.factions.astral - before.factions.astral
      }
    } satisfies OutcomeDelta;
    const outcome = applyCrewExploreModifier(rawOutcome, this.derivedStats.scanBonus);
    let after = applyRunNodeOutcome(before, outcome);
    if ((outcome.shipCondition ?? 0) < 0) {
      const severity = Math.max(1, Math.ceil(Math.abs(outcome.shipCondition ?? 0) / 4));
      const shipDamage = applyDeterministicDamageRoll(after.shipDamage, this.currentRunSeed, this.selectedNode.id, 0, 'anomaly-risk', severity);
      after = {
        ...after,
        shipDamage,
        shipCondition: shipDamage.hullIntegrity
      };
    }
    const resultOutcome = {
      crewMorale: after.crewMorale - before.crewMorale,
      shipCondition: after.shipCondition - before.shipCondition,
      credits: after.inventory.credits - before.inventory.credits,
      materials: after.inventory.materials - before.inventory.materials,
      xp: after.captainXp - before.captainXp,
      factionDelta: {
        concordium: after.factions.concordium - before.factions.concordium,
        freebelt: after.factions.freebelt - before.factions.freebelt,
        astral: after.factions.astral - before.factions.astral
      }
    } satisfies OutcomeDelta;

    after.runModifiers.nextExploreScanBoost = 0;
    this.completeSelectedNode(
      this.profileDiffResult(before, after, `Explore: ${this.discoveredAnomaly.name}${this.derivedStats.scanBonus > 0 ? ' | Crew Bonus Applied' : ''}`),
      resultOutcome,
      after
    );
    this.discoveredAnomaly = null;
    this.scanProgress = 0;
  }

  private renderShop() {
    this.clearUi();
    if (!this.selectedNode) {
      this.switchScreen('starmap');
      return;
    }

    const system = this.currentSystem();
    this.addHeader('Shop/Resupply Node', `Deterministic inventory from run seed + node id. Theme: ${system.tags.join(', ')}`);
    this.addCompanionText(152);

    const shop = resolveShopInventory(
      this.items,
      this.currentRunSeed,
      this.selectedNode.id,
      this.profile,
      this.derivedStats.repairEfficiency,
      this.currentSystem().tags
    );
    const info = this.add.text(
      96,
      170,
      `Credits ${this.profile.inventory.credits}  Materials ${this.profile.inventory.materials}  Hull ${this.profile.shipDamage.hullIntegrity}\nConcordium ${this.profile.factions.concordium}  Freebelt ${this.profile.factions.freebelt}  Astral ${this.profile.factions.astral}`,
      { fontFamily: 'Verdana', fontSize: '23px', color: '#edf6ff' }
    );
    this.uiContainer.add(info);
    if (shop.crewBonusApplied.length > 0) {
      const bonusText = this.add.text(96, 232, `Crew Bonus Applied: ${shop.crewBonusApplied.join(' | ')}`, {
        fontFamily: 'Verdana',
        fontSize: '18px',
        color: '#cde7ff'
      });
      this.uiContainer.add(bonusText);
    }

    const offers = shop.offers.slice(0, 6);
    for (let i = 0; i < offers.length; i += 1) {
      const offer = offers[i];
      const y = 290 + i * 62;
      const button = makeButton(this, 390, y, `Buy ${offer.name} (${offer.price})`, () => {
        if (offer.kind === 'module') {
          const module = this.items.modules.find((entry) => entry.id === offer.id);
          if (module) this.commitProfile(buyModule(this.profile, module, offer.price));
        } else {
          const consumable = this.items.consumables.find((entry) => entry.id === offer.id);
          if (consumable) this.commitProfile(buyConsumable(this.profile, consumable, offer.price));
        }
        this.renderShop();
      }, 560, 52, 0x2f6f62);
      this.uiContainer.add(button.container);
    }

    const recruits = generateRecruitmentPool(
      {
        runSeed: this.currentRunSeed,
        nodeId: this.selectedNode.id,
        standingBias: this.dominantFaction(),
        captainRank: this.profile.captainRank
      },
      2
    );
    for (let i = 0; i < recruits.length; i += 1) {
      const recruit = recruits[i];
      const cost = recruit.rarity === 'rare' ? 140 : recruit.rarity === 'uncommon' ? 100 : 70;
      const recruitBtn = makeButton(
        this,
        900,
        292 + i * 58,
        `Recruit ${recruit.name} (${CREW_ROLE_LABELS[recruit.role]}) ${cost}c`,
        () => {
          if (this.profile.inventory.credits < cost) return;
          this.commitProfile({
            ...this.profile,
            inventory: {
              ...this.profile.inventory,
              credits: this.profile.inventory.credits - cost
            },
            crew: addCrewToRoster(this.profile.crew, recruit)
          });
          this.renderShop();
        },
        300,
        52,
        0x4c5f8f
      );
      this.uiContainer.add(recruitBtn.container);
    }

    const firstLoot = Object.keys(this.profile.inventory.loot)[0];
    const sellButton = makeButton(
      this,
      900,
      315,
      firstLoot ? `Sell 1 ${firstLoot}` : 'No Loot To Sell',
      () => {
        if (!firstLoot) return;
        this.commitProfile(sellLoot(this.profile, firstLoot, 1, this.items.loot));
        this.renderShop();
      },
      300,
      56,
      0x7a5f30
    );

    const repairCost = Math.max(10, Math.round(35 * (1 - shop.repairDiscountPct * 0.01)));
    const repairButton = makeButton(this, 900, 390, `Repair +15 (${repairCost}c)`, () => {
      this.commitProfile(repairShip(this.profile, repairCost, 15, this.derivedStats.repairEfficiency));
      this.renderShop();
    }, 300, 56, 0x517544);

    const done = makeButton(this, 900, 470, 'Leave Shop', () => {
      const before = this.profile;
      this.completeSelectedNode(this.profileDiffResult(before, before, 'Shop visit'), { xp: 10 });
    }, 300, 56, 0x4d6e9b);

    this.uiContainer.add([sellButton.container, repairButton.container, done.container]);
  }

  private renderInventory() {
    this.clearUi();
    this.addHeader('Inventory & Fitting', 'Equip modules and use consumables outside combat.');

    const moduleById = new Map(this.items.modules.map((entry) => [entry.id, entry]));
    const activeHull = this.hulls.hulls.find((entry) => entry.id === this.profile.activeHullId) ?? this.hulls.hulls[0];
    const loadout = this.profile.hullLoadouts[this.profile.activeHullId] ?? { weapon: [], shield: [], utility: [] };
    const equip = this.add.text(
      96,
      170,
      `Hull: ${activeHull.name} (${activeHull.class})\nWeapons [${loadout.weapon.map((id) => moduleById.get(id)?.name ?? id).join(' | ') || '-'}]\nShields [${loadout.shield.map((id) => moduleById.get(id)?.name ?? id).join(' | ') || '-'}]\nUtilities [${loadout.utility.map((id) => moduleById.get(id)?.name ?? id).join(' | ') || '-'}]\nSlots W${activeHull.slots.weaponSlots} S${activeHull.slots.shieldSlots} U${activeHull.slots.utilitySlots}\nDamage ${this.derivedStats.bulletDamage.toFixed(1)}  Shield ${this.derivedStats.maxShield.toFixed(0)}  Scan x${this.derivedStats.scanRateMultiplier.toFixed(2)}  Move ${this.derivedStats.moveSpeed.toFixed(0)}  Cargo ${this.derivedStats.cargoCapacity}\nCrew Tips: Diplomacy helps Story persuade. Science lowers anomaly penalties. Engineer improves repairs. Tactical reduces incoming damage.`,
      { fontFamily: 'Verdana', fontSize: '23px', color: '#f5fbff' }
    );
    this.uiContainer.add(equip);
    this.addShipStatusPanel(980, 220);

    const owned = this.items.modules.filter((entry) => this.profile.inventory.modules.includes(entry.id)).slice(0, 6);
    for (let i = 0; i < owned.length; i += 1) {
      const module = owned[i];
      const btn = makeButton(this, 370, 380 + i * 56, `Equip ${module.name}`, () => {
        this.commitProfile(equipModuleForHull(this.profile, this.hulls, this.items.modules, module.id, module.slot));
        this.renderInventory();
      }, 520, 50, 0x315e90);
      this.uiContainer.add(btn.container);
    }

    const consumeOrder: string[] = ['repair-kit', 'field-repair', 'overcharge', 'scan-booster', 'choir-incense'];
    for (let i = 0; i < consumeOrder.length; i += 1) {
      const id = consumeOrder[i];
      const def = this.items.consumables.find((entry) => entry.id === id);
      if (!def) continue;
      const qty = this.profile.inventory.consumables[id] ?? 0;
      const btn = makeButton(this, 920, 380 + i * 56, `Use ${def.name} (${qty})`, () => {
        this.useConsumable(def.id);
        this.renderInventory();
      }, 360, 50, 0x6a4f8f);
      this.uiContainer.add(btn.container);
    }

    const back = makeButton(this, 970, 646, 'Bridge', () => this.switchScreen('bridge'), 220, 58, 0x5a6780);
    this.uiContainer.add(back.container);
  }

  private renderCodex() {
    this.clearUi();
    this.addHeader('Codex Log', 'Recent choices and branch history.');

    const latest = this.profile.codexLog.slice(-9).reverse();
    if (latest.length === 0) {
      const none = this.add.text(96, 190, 'No entries yet.', { fontFamily: 'Verdana', fontSize: '24px', color: '#c6ddf6' });
      this.uiContainer.add(none);
    } else {
      for (let i = 0; i < latest.length; i += 1) {
        const line = this.add.text(96, 180 + i * 50, `${latest[i].chapterId}/${latest[i].nodeId} - ${latest[i].label}`, {
          fontFamily: 'Verdana',
          fontSize: '22px',
          color: '#eaf4ff'
        });
        this.uiContainer.add(line);
      }
    }

    const back = makeButton(this, 220, 640, 'Bridge', () => this.switchScreen('bridge'), 220, 58, 0x5a6780);
    this.uiContainer.add(back.container);
  }

  private renderPatrolNode() {
    this.clearUi();
    if (!this.selectedNode) {
      this.switchScreen('starmap');
      return;
    }
    const system = this.currentSystem();
    const patrol = this.activePatrol ?? patrolPresenceForSystem(this.profile.seedBase, system.id, system.security, this.currentWeekKey());
    this.addHeader(
      'Patrol Encounter',
      `${patrol.faction.toUpperCase()} patrol intensity ${(patrol.intensity * 100).toFixed(0)}% in ${system.name}. Choose your approach.`
    );
    const detail = this.add.text(
      96,
      180,
      `Assist: standing gain, lower piracy pressure.\nAvoid: no direct effect.\nAmbush: standing loss, extra credits, higher piracy pressure.`,
      { fontFamily: 'Verdana', fontSize: '22px', color: '#deeeff', wordWrap: { width: 980 } }
    );
    this.uiContainer.add(detail);

    const resolveChoice = (choice: 'assist' | 'avoid' | 'ambush') => {
      const before = this.profile;
      const after = applyPatrolChoice(this.profile, patrol, choice);
      if (choice === 'assist') this.runAmbushPending = false;
      if (choice === 'ambush') this.runAmbushPending = true;
      this.completeSelectedNode(
        this.profileDiffResult(before, after, `Patrol ${choice} (${(patrolRiskModifier(patrol, choice) * 100).toFixed(1)}% risk mod)`),
        {
          credits: after.inventory.credits - before.inventory.credits,
          factionDelta: {
            concordium: after.factions.concordium - before.factions.concordium,
            freebelt: after.factions.freebelt - before.factions.freebelt,
            astral: after.factions.astral - before.factions.astral
          },
          xp: choice === 'assist' ? 10 : 8
        },
        after
      );
    };

    const assist = makeButton(this, 280, 380, 'Assist Patrol', () => resolveChoice('assist'), 280, 62, 0x2f6f62);
    const avoid = makeButton(this, 640, 380, 'Avoid Patrol', () => resolveChoice('avoid'), 280, 62, 0x5a6780);
    const ambush = makeButton(this, 1000, 380, 'Ambush Patrol', () => resolveChoice('ambush'), 280, 62, 0x8d5a2f);
    this.uiContainer.add([assist.container, avoid.container, ambush.container]);
  }

  private renderCombat() {
    this.clearUi();
    if (!this.selectedNode) {
      this.switchScreen('starmap');
      return;
    }

    this.activeMission = resolveMissionForNode(this.missions, this.selectedNode.id, this.selectedNode.type === 'BOSS');
    this.combatDamageBoost = this.profile.runModifiers.nextCombatDamageBoost;
    this.profile.runModifiers.nextCombatDamageBoost = 0;
    this.combatIncomingMitigation = Math.min(0.18, this.derivedStats.combatBonus * 0.0045);
    this.combatHitEventIndex = 0;

    this.combatShip = createCombatShip(this.derivedStats);
    this.combatShipSprite.setVisible(true);
    this.combatShipSprite.setPosition(640, 640);
    this.combatTargetX = 640;
    const cosmetic = this.profile.hullCosmetics[this.profile.activeHullId];
    const hullColor = this.cosmetics.skins.find((entry) => entry.id === cosmetic?.skinKey)?.color ?? 0x8bd8ff;
    this.combatShipSprite.setFillStyle(hullColor, 1);

    this.combatScore = { kills: 0, combo: 0, bestCombo: 0, damageTaken: 0 };
    this.currentWaveIndex = 0;
    this.spawnedInWave = 0;
    this.waveSpawnTimerMs = 0;
    this.autoFire = true;
    this.lastPlayerFireMs = 0;
    this.lastAbilityMs = -99999;
    this.combatRunning = true;
    this.combatWon = false;
    this.combatLost = false;
    this.rewardApplied = false;

    const header = this.add.text(20, 70, `Mission ${this.activeMission.name}${this.combatAmbushActive ? ' | AMBUSH' : ''} | Drag bottom third | Auto-fire ON`, {
      fontFamily: 'Verdana',
      fontSize: '23px',
      color: '#c8dfff'
    });
    this.uiContainer.add(header);
    const crewBonus = this.add.text(20, 102, `Crew Bonus Applied: Tactical +${this.derivedStats.combatBonus.toFixed(1)} (${Math.round(this.combatIncomingMitigation * 100)}% damage reduction)`, {
      fontFamily: 'Verdana',
      fontSize: '18px',
      color: '#beddff'
    });
    this.uiContainer.add(crewBonus);

    const autoButton = makeButton(this, 1060, 560, 'Auto Fire: ON', () => {
      this.autoFire = !this.autoFire;
      autoButton.setLabel(`Auto Fire: ${this.autoFire ? 'ON' : 'OFF'}`);
    }, 330, 62, 0x365e98);

    const manualButton = makeButton(this, 1060, 632, 'Manual Fire', () => {
      if (this.combatRunning) this.firePlayerBullet();
    }, 330, 62, 0x226ba4);

    const abilityButton = makeButton(this, 760, 632, 'Pulse Ability', () => {
      if (!this.combatRunning) return;
      const now = this.time.now;
      if (now - this.lastAbilityMs < this.derivedStats.abilityCooldownMs) return;
      this.lastAbilityMs = now;
      const active = this.enemyPool.activeItems();
      for (let i = 0; i < active.length; i += 1) {
        active[i].hp -= Math.round(this.derivedStats.bulletDamage * 2.6);
      }
    }, 250, 62, 0x735dc2);

    const mapButton = makeButton(this, 520, 632, 'Abort', () => {
      this.stopCombat();
      this.switchScreen('starmap');
    }, 220, 62, 0x5a6780);
    const fleeButton = makeButton(this, 240, 632, 'Flee', () => {
      if (!this.combatRunning || !this.selectedNode) return;
      const flee = resolveFleeAttempt(this.profile, this.derivedStats, this.activeRunState?.summary.nodesCompleted ?? 0, this.selectedNode.id);
      if (flee.success) {
        const before = this.profile;
        this.stopCombat();
        this.completeSelectedNode(this.profileDiffResult(before, before, `Fled ${this.activeMission?.name ?? 'combat'} (${Math.round(flee.chance * 100)}%)`), { xp: 8 });
        return;
      }

      const keys = Object.keys(this.profile.cargo);
      let next = this.profile;
      if (keys[0]) {
        const qtyLost = Math.max(1, Math.ceil((next.cargo[keys[0]]?.qty ?? 1) * 0.5));
        next = removeCargo(next, keys[0], qtyLost, 0);
      }
      const damaged = applyDeterministicDamageRoll(next.shipDamage, this.currentRunSeed, this.selectedNode.id, this.combatHitEventIndex + 1, 'combat-hit', 2);
      next = { ...next, shipDamage: damaged, shipCondition: damaged.hullIntegrity };
      const before = this.profile;
      this.stopCombat();
      this.completeSelectedNode(this.profileDiffResult(before, next, `Failed flee ${this.activeMission?.name ?? 'combat'} (${Math.round(flee.chance * 100)}%)`), { shipCondition: -6, xp: 4 }, next);
    }, 220, 62, 0x8d5a2f);

    this.uiContainer.add([autoButton.container, manualButton.container, abilityButton.container, mapButton.container, fleeButton.container]);
    this.combatHudTop.setVisible(true);
    this.combatHudBottom.setVisible(true);
    this.refreshCombatHud();
  }

  private stopCombat() {
    this.combatRunning = false;
    this.combatAmbushActive = false;
    this.releaseAllCombatEntities();
  }

  private updateCombat(delta: number) {
    const deltaSec = delta / 1000;
    const maxStep = this.derivedStats.moveSpeed * deltaSec;
    const dx = this.combatTargetX - this.combatShipSprite.x;
    if (Math.abs(dx) > 0.01) {
      this.combatShipSprite.x += Math.max(-maxStep, Math.min(maxStep, dx));
    }
    this.combatShip = regenShield(this.combatShip, deltaSec);

    if (this.autoFire && this.time.now - this.lastPlayerFireMs >= this.derivedStats.fireIntervalMs) {
      this.firePlayerBullet();
    }

    this.processWaveSpawn(delta);
    this.stepBullets(deltaSec);
    this.stepEnemies(deltaSec);
    this.resolveCombatCollisions();

    if (this.combatShip.hp <= 0 && !this.combatLost) {
      this.combatLost = true;
      this.combatRunning = false;
      const shipDamage = applyHullDelta(this.profile.shipDamage, -8);
      this.commitProfile({
        ...this.profile,
        shipCondition: shipDamage.hullIntegrity,
        shipDamage
      });
      if (this.activeRunState) {
        this.activeRunState.finished = true;
      }
      this.switchScreen('summary');
      return;
    }

    if (this.combatWon && !this.rewardApplied) {
      this.rewardApplied = true;
      this.applyCombatRewards();
      this.combatRunning = false;
    }

    this.refreshCombatHud();
  }

  private processWaveSpawn(deltaMs: number) {
    if (!this.activeMission) return;
    const wave: MissionWave | undefined = this.activeMission.waves[this.currentWaveIndex];
    if (!wave) {
      if (this.enemyPool.activeItems().length === 0) {
        this.combatWon = true;
      }
      return;
    }

    this.waveSpawnTimerMs += deltaMs;
    const canSpawn = wave.spawnIntervalMs === 0 || this.waveSpawnTimerMs >= wave.spawnIntervalMs;
    const densityBonus = mapDifficultyWaveBonus(this.runDifficulty);
    const countTarget = Math.max(1, wave.count + densityBonus);
    if (this.spawnedInWave < countTarget && canSpawn) {
      this.spawnEnemyFromWave(wave, this.spawnedInWave, mapDifficultyScale(this.runDifficulty));
      this.spawnedInWave += 1;
      this.waveSpawnTimerMs = 0;
    }

    if (this.spawnedInWave >= countTarget && this.enemyPool.activeItems().every((enemy) => enemy.waveTag !== wave.id)) {
      this.currentWaveIndex += 1;
      this.spawnedInWave = 0;
      this.waveSpawnTimerMs = 0;
    }
  }

  private spawnEnemyFromWave(wave: MissionWave, spawned: number, hpScale: number) {
    const spawn = buildWaveSpawns(wave, spawned, this.scale.width);
    const def = this.enemies.find((entry) => entry.id === spawn.enemyId);
    if (!def) return;

    const enemy = this.enemyPool.acquire();
    enemy.def = def;
    enemy.maxHp = Math.round(def.hp * hpScale);
    enemy.hp = enemy.maxHp;
    enemy.shotCooldownMs = this.time.now + def.shootCooldownMs;
    enemy.waveTag = wave.id;
    enemy.telegraphUntil = 0;
    enemy.sprite.setSize(def.size, def.size);
    enemy.sprite.setFillStyle(def.isBoss ? 0xffb36d : 0xff6f7d, 1);
    enemy.sprite.setPosition(spawn.x, spawn.y);
    enemy.sprite.setVisible(true);
  }

  private firePlayerBullet() {
    this.lastPlayerFireMs = this.time.now;
    const bullet = this.bulletPool.acquire();
    bullet.sprite.setPosition(this.combatShipSprite.x, this.combatShipSprite.y - 30);
    bullet.sprite.setSize(7, 22);
    bullet.sprite.setFillStyle(0x9ee4ff, 1);
    bullet.sprite.setVisible(true);
    bullet.vx = 0;
    bullet.vy = -760;
    bullet.damage = this.derivedStats.bulletDamage * (1 + this.combatDamageBoost);
    bullet.fromPlayer = true;
  }

  private fireEnemyBullet(enemy: EnemyEntity) {
    if (enemy.def.bulletPattern === 'sweeping-beam') {
      enemy.telegraphUntil = this.time.now + (enemy.def.bossPhases?.[0]?.telegraphMs ?? 550);
      return;
    }

    const bullet = this.bulletPool.acquire();
    bullet.sprite.setPosition(enemy.sprite.x, enemy.sprite.y + 18);
    bullet.sprite.setSize(enemy.def.bulletPattern === 'mines' ? 14 : 8, enemy.def.bulletPattern === 'mines' ? 14 : 18);
    bullet.sprite.setFillStyle(0xffa6b0, 1);
    bullet.sprite.setVisible(true);

    if (enemy.def.bulletPattern === 'aimed') {
      const dx = this.combatShipSprite.x - enemy.sprite.x;
      const dy = this.combatShipSprite.y - enemy.sprite.y;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      bullet.vx = (dx / len) * enemy.def.bulletSpeed;
      bullet.vy = (dy / len) * enemy.def.bulletSpeed;
    } else if (enemy.def.bulletPattern === 'wave') {
      bullet.vx = Math.sin(enemy.sprite.y * 0.03) * 90;
      bullet.vy = enemy.def.bulletSpeed;
    } else if (enemy.def.bulletPattern === 'burst') {
      bullet.vx = (enemy.sprite.x % 2 === 0 ? -1 : 1) * 80;
      bullet.vy = enemy.def.bulletSpeed;
    } else {
      bullet.vx = 0;
      bullet.vy = enemy.def.bulletSpeed;
    }

    bullet.damage = enemy.def.touchDamage;
    bullet.fromPlayer = false;

    if (enemy.def.bulletPattern === 'burst') {
      const mirror = this.bulletPool.acquire();
      mirror.sprite.setPosition(enemy.sprite.x, enemy.sprite.y + 18);
      mirror.sprite.setSize(8, 18);
      mirror.sprite.setFillStyle(0xff8e9f, 1).setVisible(true);
      mirror.vx = -bullet.vx;
      mirror.vy = bullet.vy;
      mirror.damage = bullet.damage;
      mirror.fromPlayer = false;
    }
  }

  private stepBullets(deltaSec: number) {
    const active = this.bulletPool.activeItems();
    for (let i = 0; i < active.length; i += 1) {
      const bullet = active[i];
      bullet.sprite.x += bullet.vx * deltaSec;
      bullet.sprite.y += bullet.vy * deltaSec;
      if (bullet.sprite.y < -40 || bullet.sprite.y > this.scale.height + 40 || bullet.sprite.x < -40 || bullet.sprite.x > this.scale.width + 40) {
        this.releaseBullet(bullet);
      }
    }
  }

  private stepEnemies(deltaSec: number) {
    const enemies = this.enemyPool.activeItems();
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      enemy.sprite.y += enemy.def.speed * deltaSec;
      if (!enemy.def.isBoss) {
        enemy.sprite.x += Math.sin((enemy.sprite.y + i * 40) / 80) * 46 * deltaSec;
      }

      if (enemy.def.isBoss && enemy.def.bossPhases && enemy.def.bossPhases.length > 0) {
        const phase = resolveBossPhase(enemy.hp, enemy.maxHp, enemy.def.bossPhases);
        if (phase) {
          enemy.sprite.setFillStyle(phase.pattern === 'spiral' ? 0xffc26d : phase.pattern === 'wave' ? 0xff9a84 : 0xffb36d, 1);
        }
      }

      if (this.time.now >= enemy.shotCooldownMs) {
        enemy.shotCooldownMs += enemy.def.shootCooldownMs;
        this.fireEnemyBullet(enemy);
      }

      if (enemy.telegraphUntil > this.time.now) {
        enemy.sprite.setStrokeStyle(3, 0xfff2a4, 1);
      } else {
        enemy.sprite.setStrokeStyle();
        if (enemy.telegraphUntil > 0 && enemy.def.bulletPattern === 'sweeping-beam') {
          enemy.telegraphUntil = 0;
          const beam = this.bulletPool.acquire();
          beam.sprite.setPosition(enemy.sprite.x, enemy.sprite.y + 20);
          beam.sprite.setSize(22, 30).setFillStyle(0xffd3a0, 1).setVisible(true);
          beam.vx = 0;
          beam.vy = enemy.def.bulletSpeed * 1.2;
          beam.damage = enemy.def.touchDamage * 1.3;
          beam.fromPlayer = false;
        }
      }

      if (enemy.sprite.y > this.scale.height + 60) {
        this.releaseEnemy(enemy);
      }

      if (intersects(enemy.sprite, this.combatShipSprite, this.derivedStats.dodgeWindowMultiplier)) {
        this.combatShip = applyIncomingDamage(this.combatShip, enemy.def.touchDamage, this.combatIncomingMitigation);
        this.combatScore = scoreOnPlayerHit(this.combatScore, enemy.def.touchDamage);
        const shipDamage = applyDeterministicDamageRoll(this.profile.shipDamage, this.currentRunSeed, this.selectedNode?.id ?? 'combat', this.combatHitEventIndex, 'combat-hit', 1);
        this.commitProfile({
          ...this.profile,
          shipDamage,
          shipCondition: shipDamage.hullIntegrity
        });
        this.combatHitEventIndex += 1;
        this.releaseEnemy(enemy);
      }
    }
  }

  private resolveCombatCollisions() {
    const bullets = this.bulletPool.activeItems();
    const enemies = this.enemyPool.activeItems();

    for (let i = 0; i < bullets.length; i += 1) {
      const bullet = bullets[i];
      if (bullet.fromPlayer) {
        for (let e = 0; e < enemies.length; e += 1) {
          const enemy = enemies[e];
          if (!enemy.active) continue;
          if (!intersects(bullet.sprite, enemy.sprite)) continue;

          enemy.hp -= bullet.damage;
          this.releaseBullet(bullet);
          if (enemy.hp <= 0) {
            this.combatScore = scoreOnKill(this.combatScore);
            if (enemy.def.isBoss) this.combatWon = true;
            this.releaseEnemy(enemy);
          }
          break;
        }
      } else if (intersects(bullet.sprite, this.combatShipSprite, this.derivedStats.dodgeWindowMultiplier)) {
        this.combatShip = applyIncomingDamage(this.combatShip, bullet.damage, this.combatIncomingMitigation);
        this.combatScore = scoreOnPlayerHit(this.combatScore, bullet.damage);
        const shipDamage = applyDeterministicDamageRoll(this.profile.shipDamage, this.currentRunSeed, this.selectedNode?.id ?? 'combat', this.combatHitEventIndex, 'combat-hit', 1);
        this.commitProfile({
          ...this.profile,
          shipDamage,
          shipCondition: shipDamage.hullIntegrity
        });
        this.combatHitEventIndex += 1;
        this.releaseBullet(bullet);
      }
    }
  }

  private applyCombatRewards() {
    if (!this.activeMission || !this.selectedNode) return;

    const before = this.profile;
    const score = computeMissionScore(this.combatScore);
    const dropSeed = deterministicNodeSeed(this.currentRunSeed, this.selectedNode.id) ^ score;
    const drop = this.activeMission.rewards.moduleDropPool[dropSeed % this.activeMission.rewards.moduleDropPool.length];

    const postCombatDamage = applyHullDelta(this.profile.shipDamage, -Math.floor(this.combatScore.damageTaken / 18));

    let next = {
      ...this.profile,
      inventory: {
        ...this.profile.inventory,
        credits: this.profile.inventory.credits + this.activeMission.rewards.credits + (this.combatAmbushActive ? 60 : 0),
        materials: this.profile.inventory.materials + this.activeMission.rewards.materials + (this.combatAmbushActive ? 3 : 0),
        modules: this.profile.inventory.modules.includes(drop) ? this.profile.inventory.modules : [...this.profile.inventory.modules, drop]
      },
      shipCondition: postCombatDamage.hullIntegrity,
      shipDamage: postCombatDamage,
      captainXp: this.profile.captainXp + (this.selectedNode.type === 'BOSS' ? 90 : 55)
    };
    next = applyPostCombatDroneRepair(next, this.drones);

    if (this.combatAmbushActive) {
      const contraband = this.goods.goods.find((entry) => entry.legality === 'contraband');
      if (contraband) {
        next = addCargo(next, this.goods, contraband.id, 1, 0);
      }
    }

    const rank = this.profile.captainRank;
    if (next.captainXp > rank * 120) {
      next = {
        ...next,
        captainRank: this.profile.captainRank + 1
      };
    }

    const outcome: OutcomeDelta = {
      credits: next.inventory.credits - before.inventory.credits,
      materials: next.inventory.materials - before.inventory.materials,
      shipCondition: next.shipCondition - before.shipCondition,
      xp: next.captainXp - before.captainXp
    };

    this.completeSelectedNode(
      this.profileDiffResult(before, next, `${this.combatAmbushActive ? 'Ambush' : 'Combat'}: ${this.activeMission.name}`),
      outcome,
      next
    );
  }

  private releaseBullet(bullet: BulletEntity) {
    bullet.sprite.setVisible(false);
    bullet.sprite.setPosition(-999, -999);
    this.bulletPool.release(bullet);
  }

  private releaseEnemy(enemy: EnemyEntity) {
    enemy.sprite.setVisible(false);
    enemy.sprite.setPosition(-999, -999);
    this.enemyPool.release(enemy);
  }

  private releaseAllCombatEntities() {
    const bullets = this.bulletPool.activeItems();
    for (let i = 0; i < bullets.length; i += 1) {
      this.releaseBullet(bullets[i]);
    }
    const enemies = this.enemyPool.activeItems();
    for (let i = 0; i < enemies.length; i += 1) {
      this.releaseEnemy(enemies[i]);
    }
  }

  private refreshCombatHud() {
    const abilityRemaining = Math.max(0, this.derivedStats.abilityCooldownMs - (this.time.now - this.lastAbilityMs));
    this.combatHudTop.setText(
      `HP ${Math.ceil(this.combatShip.hp)}  Shield ${Math.ceil(this.combatShip.shield)}  Wave ${Math.min(this.currentWaveIndex + 1, this.activeMission?.waves.length ?? 1)}  Eng ${this.profile.shipDamage.systems.engines} Weap ${this.profile.shipDamage.systems.weapons}`
    );

    const status = this.combatWon ? 'MISSION CLEAR' : this.combatLost ? 'MISSION FAILED' : 'ENGAGED';
    this.combatHudBottom.setText(
      `${status} | Kills ${this.combatScore.kills} Combo x${this.combatScore.combo} Score ${computeMissionScore(this.combatScore)} | Ability ${(abilityRemaining / 1000).toFixed(1)}s`
    );

    if ((this.combatWon || this.combatLost) && this.combatRunning === false) {
      if (this.uiContainer.list.some((entry) => entry.name === 'combat-result')) {
        return;
      }
      const resultText = this.add
        .text(640, 300, this.combatWon ? 'Mission complete. Rewards added.' : 'Ship disabled. Run failed.', {
          fontFamily: 'Verdana',
          fontSize: '34px',
          color: '#f5fbff',
          backgroundColor: '#132946'
        })
        .setPadding(14, 10, 14, 10)
        .setOrigin(0.5);
      resultText.name = 'combat-result';

      const mapButton = makeButton(this, 640, 380, this.combatWon ? 'Return to Star Map' : 'Run Summary', () => {
        this.stopCombat();
        if (this.combatWon) this.switchScreen('starmap');
        else this.switchScreen('summary');
      }, 360, 70, 0x4f6fa2);
      mapButton.container.name = 'combat-result';

      this.uiContainer.add([resultText, mapButton.container]);
    }
  }

  private renderSummary() {
    this.clearUi();
    this.addHeader('Run Summary', 'Review outcomes, faction changes, and progression.');

    const run = this.activeRunState;
    const lines = run
      ? `Nodes ${run.summary.nodesCompleted}\nCredits ${run.summary.totalCredits}  Materials ${run.summary.totalMaterials}  XP ${run.summary.totalXp}\nFaction Delta C:${run.summary.factionDelta.concordium} F:${run.summary.factionDelta.freebelt} A:${run.summary.factionDelta.astral}\nHull ${this.profile.shipDamage.hullIntegrity} | Systems E${this.profile.shipDamage.systems.engines} W${this.profile.shipDamage.systems.weapons} S${this.profile.shipDamage.systems.sensors}\nSystem ${this.profile.currentSystemId} | Active Contracts ${this.profile.activeContracts.length}\nNotes: ${run.summary.notes.slice(-3).join(' | ')}`
      : 'No active run summary.';

    const text = this.add.text(96, 186, lines, {
      fontFamily: 'Verdana',
      fontSize: '24px',
      color: '#eef8ff',
      wordWrap: { width: 1020 }
    });
    this.uiContainer.add(text);

    const unlocks = this.add.text(
      96,
      370,
      `Meta Unlocks:\nRare anomaly nodes: ${this.profile.metaUnlocks.rareAnomalyNode ? 'Unlocked' : 'Locked'}\nBetter shop node: ${this.profile.metaUnlocks.betterShopNode ? 'Unlocked' : 'Locked'}\nAurora hull: ${this.profile.metaUnlocks.hullAurora ? 'Unlocked' : 'Locked'}`,
      { fontFamily: 'Verdana', fontSize: '23px', color: '#cde1ff' }
    );
    this.uiContainer.add(unlocks);

    const bridge = makeButton(this, 280, 632, 'Back to Bridge', () => {
      this.activeRunGraph = null;
      this.activeRunState = null;
      this.selectedNode = null;
      this.switchScreen('bridge');
    }, 300, 62, 0x5a6780);

    const next = makeButton(this, 680, 632, 'Start New Run', () => this.startRunFlow(), 300, 62, 0x2f7fcf);

    this.uiContainer.add([bridge.container, next.container]);
  }
}
