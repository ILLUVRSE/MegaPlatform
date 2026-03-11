import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { getMpAdapterDescriptor } from '../../mp/adapters';
import { createProtocolMessage } from '../../mp/protocol';
import { WebRtcDataTransport } from '../../mp/transport';
import {
  computeDamageIntentChecksum,
  type StarlightCoopEvent,
  type StarlightCoopSnapshot,
  type StarlightInput,
  type SupportAbilityId
} from '../../mp/adapters/starlight-chronicles';
import { allowRate, batchDamageAmounts, type RateGateState } from './combat/coopNet';

interface SceneDeps {
  hooks: GameRuntimeHooks;
}

interface LocalCombatState {
  missionId: string;
  seed: number;
  startedAtMs: number;
  localHp: number;
  state: 'alive' | 'downed';
  damageQueue: number[];
  rateGate: RateGateState;
  rngState: number;
  bossDisplayHp: number;
}

const ABILITY_LABELS: Record<SupportAbilityId, string> = {
  captain_rally: 'Rally',
  science_scan_lock: 'Scan Lock',
  engineer_patch_field: 'Patch Field',
  tactical_overcharge: 'Overcharge'
};

const ABILITIES: SupportAbilityId[] = ['captain_rally', 'science_scan_lock', 'engineer_patch_field', 'tactical_overcharge'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class StarlightChroniclesMultiplayerScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private transport: WebRtcDataTransport | null = null;
  private descriptor = getMpAdapterDescriptor('starlight-chronicles');

  private statusText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private tallyText!: Phaser.GameObjects.Text;
  private panelText!: Phaser.GameObjects.Text;
  private hostText!: Phaser.GameObjects.Text;
  private bossText!: Phaser.GameObjects.Text;

  private optionButtons: Phaser.GameObjects.Container[] = [];
  private combatButtons: Phaser.GameObjects.Container[] = [];
  private abilityButtons: Phaser.GameObjects.Container[] = [];

  private localInputSeq = 0;
  private localCombat: LocalCombatState | null = null;
  private pendingStatus: string | null = null;
  private reducedMotion = false;

  constructor({ hooks }: SceneDeps) {
    super('starlight-chronicles-coop');
    this.hooks = hooks;
  }

  create() {
    const mp = this.hooks.multiplayer;
    if (!mp) {
      this.add.text(28, 28, 'Missing multiplayer context', { color: '#ffb9b9', fontSize: '24px' });
      return;
    }

    this.reducedMotion = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const descriptor = getMpAdapterDescriptor('starlight-chronicles');
    if (!descriptor) {
      this.add.text(28, 28, 'Starlight adapter unavailable', { color: '#ffb9b9', fontSize: '24px' });
      return;
    }
    this.descriptor = descriptor;

    descriptor.adapter.init({
      role: mp.role,
      playerId: mp.playerId,
      seed: mp.seed,
      options: {
        hostPlayerId: mp.hostId,
        playerIds: mp.playerIds,
        playerIndex: mp.playerIndex,
        ...(mp.options ?? {})
      }
    });
    descriptor.adapter.start();

    this.renderFrame(mp.roomCode);
    this.sendReady(false);

    this.transport = new WebRtcDataTransport({
      role: mp.role,
      playerId: mp.playerId,
      roomCode: mp.roomCode,
      signalingUrl: mp.signalingUrl,
      reconnectToken: mp.reconnectToken
    });

    this.transport.onMessage((packet) => {
      if (!this.descriptor) return;
      if (packet.message.type === 'input' && mp.role === 'host') {
        this.descriptor.adapter.onRemoteMessage({ fromPlayerId: packet.fromPlayerId, input: packet.message.input });
      }
      if (packet.message.type === 'snapshot' && mp.role === 'client') {
        this.descriptor.adapter.applySnapshot(packet.message.state as StarlightCoopSnapshot);
      }
      if (packet.message.type === 'event') {
        const event = packet.message.event as StarlightCoopEvent;
        this.descriptor.adapter.applyEvent(event);
        this.onCoopEvent(event);
      }
      if (packet.message.type === 'ping' && mp.role === 'client') {
        this.transport?.sendToHost(createProtocolMessage('pong', { pingId: packet.message.pingId }));
      }
    });

    this.transport.connect();
    this.sendSnapshotRequest();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.transport?.disconnect();
      this.transport = null;
      descriptor.adapter.stop();
    });
  }

  update(_time: number, deltaMs: number) {
    if (!this.descriptor || !this.transport) return;

    const adapter = this.descriptor.adapter as unknown as {
      step?: (dtS: number) => unknown[];
      getSnapshot: () => StarlightCoopSnapshot;
    };

    if (this.hooks.multiplayer?.role === 'host') {
      const events = adapter.step?.(Math.max(0, Math.min(0.05, deltaMs / 1000))) ?? [];
      for (let i = 0; i < events.length; i += 1) {
        this.transport.broadcastFromHost(createProtocolMessage('event', { event: events[i] }));
      }
      this.transport.broadcastFromHost(createProtocolMessage('snapshot', { tick: Math.floor(performance.now()), state: adapter.getSnapshot() }));
    }

    const snapshot = adapter.getSnapshot();
    this.updateLocalCombat(snapshot, deltaMs);
    this.renderFromSnapshot(snapshot);
  }

  private renderFrame(roomCode: string) {
    this.add.rectangle(640, 360, 1280, 720, 0x061223, 1);
    this.add.rectangle(640, 360, 1160, 640, 0x0f2239, 0.95).setStrokeStyle(2, 0x86bcff, 0.6);

    this.statusText = this.add.text(56, 26, `Room ${roomCode}`, { fontFamily: 'Verdana', fontSize: '24px', color: '#d7ecff' });
    this.phaseText = this.add.text(56, 60, 'Phase: lobby', { fontFamily: 'Verdana', fontSize: '20px', color: '#a6d0ff' });
    this.timerText = this.add.text(56, 90, '', { fontFamily: 'Verdana', fontSize: '18px', color: '#d9f0ff' });
    this.tallyText = this.add.text(56, 116, '', { fontFamily: 'Verdana', fontSize: '17px', color: '#d7f8dd' });
    this.bossText = this.add.text(56, 146, '', { fontFamily: 'Verdana', fontSize: '19px', color: '#ffd7a6' });
    this.panelText = this.add.text(56, 182, '', { fontFamily: 'Verdana', fontSize: '20px', color: '#f5fbff', wordWrap: { width: 1080 } });
    this.hostText = this.add.text(56, 622, '', { fontFamily: 'Verdana', fontSize: '17px', color: '#bdd7f8', wordWrap: { width: 1080 } });

    const readyBtn = this.makeButton(1040, 52, 'Ready', () => this.sendReady(true), 170, 50, 0x2f6c93);
    const unreadyBtn = this.makeButton(1220, 52, 'Unready', () => this.sendReady(false), 170, 50, 0x4f4f7f);
    this.add.existing(readyBtn);
    this.add.existing(unreadyBtn);
  }

  private renderFromSnapshot(snapshot: StarlightCoopSnapshot) {
    const me = snapshot.players.find((entry) => entry.playerId === this.hooks.multiplayer?.playerId);
    this.statusText.setText(`Room ${this.hooks.multiplayer?.roomCode ?? '----'} | Session ${snapshot.sessionId}`);
    this.phaseText.setText(`Phase: ${snapshot.phase} | ${snapshot.players.length} players | You ${me?.ready ? 'Ready' : 'Not Ready'}${me?.spectator ? ' (Spectator)' : ''}`);

    const now = performance.now();
    if (snapshot.vote.scope) {
      const remain = Math.max(0, Math.ceil((snapshot.vote.endsAtMs - now) / 1000));
      this.timerText.setText(`Vote Timer: ${remain}s`);
      this.tallyText.setText(`Vote tally: ${snapshot.vote.options.map((opt) => `${opt}:${snapshot.vote.tally[opt] ?? 0}`).join('  ')}`);
    } else {
      this.timerText.setText('');
      this.tallyText.setText(this.pendingStatus ?? '');
    }

    if (snapshot.phase === 'combat' && snapshot.combat.missionId) {
      this.bossText.setText(
        `${snapshot.combat.isEscortMission ? `Convoy ${snapshot.combat.convoyHp}/${snapshot.combat.convoyMaxHp} | ` : ''}Shared Boss HP ${snapshot.combat.bossHp}/${snapshot.combat.bossMaxHp} | Phase ${snapshot.combat.bossPhase} | Attack ${snapshot.combat.nextAttackId} | Buffs ${snapshot.combat.activeBuffs.length}`
      );
    } else {
      this.bossText.setText('');
    }

    const playersText = snapshot.players
      .map((player) => `${player.seat + 1}. ${player.playerId}${player.ready ? ' ready' : ''}${player.spectator ? ' spectator' : ''}`)
      .join('\n');

    const contributors = snapshot.combat.topContributors.length > 0 ? snapshot.combat.topContributors.map((entry) => `${entry.playerId}:${entry.score}`).join(' | ') : '-';
    this.panelText.setText(
      `Current node: ${snapshot.currentNode.id ?? 'none'} (${snapshot.currentNode.type ?? 'n/a'})\n` +
        `Available nodes: ${snapshot.availableNodeIds.join(', ') || '-'}\n` +
        `Team wallet: ${snapshot.sessionConfig.teamWallet ? 'ON' : 'OFF'} | Node vote mode: ${snapshot.sessionConfig.voteNodeSelection ? 'VOTE' : 'HOST PICK'}\n` +
        `Top contributors: ${contributors}\n\nPlayers\n${playersText}`
    );

    this.renderVoteButtons(snapshot);
    this.renderCombatButtons(snapshot);
    this.renderAbilityButtons(snapshot);

    if (this.hooks.multiplayer?.role === 'host') {
      this.hostText.setText('Host controls: Skip Timer, Toggle Team Wallet, Toggle Vote, Force first option.');
      this.renderHostControls(snapshot);
    } else {
      this.hostText.setText('Client mode: cast votes, send damage intents, use support abilities.');
    }
  }

  private renderVoteButtons(snapshot: StarlightCoopSnapshot) {
    for (let i = 0; i < this.optionButtons.length; i += 1) this.optionButtons[i].destroy(true);
    this.optionButtons.length = 0;

    if (!snapshot.vote.scope) return;
    const options = snapshot.vote.options.slice(0, 4);
    for (let i = 0; i < options.length; i += 1) {
      const option = options[i];
      const btn = this.makeButton(220 + i * 270, 470, `Vote ${option}`, () => this.castVote(snapshot, option), 240, 54, 0x2f6c93);
      this.optionButtons.push(btn);
      this.add.existing(btn);
    }
  }

  private renderCombatButtons(snapshot: StarlightCoopSnapshot) {
    for (let i = 0; i < this.combatButtons.length; i += 1) this.combatButtons[i].destroy(true);
    this.combatButtons.length = 0;

    if (snapshot.phase !== 'combat' || !snapshot.combat.missionId) return;
    const fireBtn = this.makeButton(
      936,
      520,
      'Fire',
      () => {
        if (!this.localCombat || this.localCombat.state === 'downed') return;
        this.localCombat.damageQueue.push(28);
      },
      180,
      56,
      0x8d5a2f
    );
    const evadeBtn = this.makeButton(
      1138,
      520,
      'Evade',
      () => {
        if (!this.localCombat) return;
        this.localCombat.localHp = clamp(this.localCombat.localHp + 4, 0, 100);
      },
      180,
      56,
      0x2f7f5e
    );

    this.combatButtons.push(fireBtn, evadeBtn);
    this.add.existing(fireBtn);
    this.add.existing(evadeBtn);
  }

  private renderAbilityButtons(snapshot: StarlightCoopSnapshot) {
    for (let i = 0; i < this.abilityButtons.length; i += 1) this.abilityButtons[i].destroy(true);
    this.abilityButtons.length = 0;

    if (snapshot.phase !== 'combat' || !snapshot.combat.missionId) return;

    const now = performance.now();
    for (let i = 0; i < ABILITIES.length; i += 1) {
      const abilityId = ABILITIES[i];
      const buff = snapshot.combat.activeBuffs.find((entry) => entry.abilityId === abilityId);
      const remain = buff ? Math.max(0, Math.ceil((buff.expiresAtMs - now) / 1000)) : 0;
      const label = remain > 0 ? `${ABILITY_LABELS[abilityId]} (${remain}s)` : ABILITY_LABELS[abilityId];

      const btn = this.makeButton(
        190 + i * 230,
        580,
        label,
        () => {
          if (!snapshot.combat.missionId) return;
          this.sendCoopInput({
            v: 1,
            type: 'ability_cast',
            playerId: this.hooks.multiplayer?.playerId ?? 'client',
            missionId: snapshot.combat.missionId,
            abilityId,
            t: Math.floor(performance.now())
          });
        },
        210,
        54,
        buff ? 0x75603a : 0x435a78
      );
      this.abilityButtons.push(btn);
      this.add.existing(btn);
    }
  }

  private renderHostControls(snapshot: StarlightCoopSnapshot) {
    const cleanup = this.children.getByName('host-control') as Phaser.GameObjects.GameObject[] | Phaser.GameObjects.GameObject | null;
    if (Array.isArray(cleanup)) {
      for (let i = 0; i < cleanup.length; i += 1) cleanup[i].destroy();
    }

    const makeHost = (x: number, y: number, label: string, action: string, optionId?: string) => {
      const btn = this.makeButton(
        x,
        y,
        label,
        () => {
          this.sendCoopInput({
            v: 1,
            type: 'host_override',
            action: action as 'pick_node' | 'pick_choice' | 'skip_timer' | 'toggle_team_wallet' | 'toggle_vote_mode',
            optionId
          });
        },
        200,
        46,
        0x5f4f86
      );
      btn.name = 'host-control';
      this.add.existing(btn);
    };

    makeHost(880, 622, 'Skip Timer', 'skip_timer');
    makeHost(1088, 622, 'Toggle Wallet', 'toggle_team_wallet');
    makeHost(1240, 622, 'Toggle Vote', 'toggle_vote_mode');

    if (snapshot.vote.options.length > 0) {
      makeHost(880, 570, `Force ${snapshot.vote.options[0]}`, snapshot.vote.scope === 'node' ? 'pick_node' : 'pick_choice', snapshot.vote.options[0]);
    }
  }

  private castVote(snapshot: StarlightCoopSnapshot, option: string) {
    this.sendCoopInput({
      v: 1,
      type: 'vote_cast',
      playerId: this.hooks.multiplayer?.playerId ?? 'client',
      nodeId: snapshot.currentNode.id ?? 'pending',
      choiceId: option
    });
  }

  private sendReady(ready: boolean) {
    this.sendCoopInput({ v: 1, type: 'ready_status', ready });
  }

  private sendSnapshotRequest() {
    this.sendCoopInput({ v: 1, type: 'snapshot_request' });
  }

  private sendCoopInput(input: StarlightInput) {
    if (!this.descriptor) return;
    this.descriptor.adapter.onInput(input as never);

    if (this.hooks.multiplayer?.role === 'client') {
      this.transport?.sendToHost(
        createProtocolMessage('input', {
          playerId: this.hooks.multiplayer.playerId,
          input,
          seq: this.localInputSeq++
        })
      );
    }
  }

  private updateLocalCombat(snapshot: StarlightCoopSnapshot, deltaMs: number) {
    if (snapshot.phase !== 'combat' || !snapshot.combat.missionId) {
      this.localCombat = null;
      return;
    }

    if (!this.localCombat || this.localCombat.missionId !== snapshot.combat.missionId || this.localCombat.seed !== (snapshot.combat.seed ?? 1)) {
      this.localCombat = {
        missionId: snapshot.combat.missionId,
        seed: snapshot.combat.seed ?? 1,
        startedAtMs: performance.now(),
        localHp: 100,
        state: 'alive',
        damageQueue: [],
        rateGate: { windowStartMs: 0, count: 0 },
        rngState: (snapshot.combat.seed ?? 1) ^ 0x7a1f,
        bossDisplayHp: snapshot.combat.bossHp
      };
      this.pendingStatus = null;
    }

    const local = this.localCombat;

    local.rngState ^= local.rngState << 13;
    local.rngState ^= local.rngState >>> 17;
    local.rngState ^= local.rngState << 5;
    const roll = ((local.rngState >>> 0) % 1000) / 1000;

    if (roll > 0.9 && local.state === 'alive') local.damageQueue.push(18);
    if (roll > 0.96 && local.state === 'alive') local.localHp = clamp(local.localHp - 8, 0, 100);

    if (local.localHp <= 0 && local.state !== 'downed') {
      local.state = 'downed';
      this.sendCoopInput({
        v: 1,
        type: 'player_state',
        playerId: this.hooks.multiplayer?.playerId ?? 'client',
        missionId: local.missionId,
        state: 'downed',
        t: Math.floor(performance.now())
      });
    }

    const myState = snapshot.combat.playerStates.find((entry) => entry.playerId === this.hooks.multiplayer?.playerId)?.state ?? 'alive';
    if (myState === 'alive' && local.state === 'downed') {
      local.state = 'alive';
      local.localHp = 40;
      this.pendingStatus = 'Revived';
    }

    const gate = allowRate(local.rateGate, performance.now(), 8);
    local.rateGate = gate.next;
    if (gate.allowed && local.state === 'alive' && local.damageQueue.length > 0) {
      const batched = batchDamageAmounts(local.damageQueue, 3);
      local.damageQueue = batched.remaining;
      const amount = clamp(batched.batched, 0, 150);
      if (amount > 0) {
        const intentTime = Math.max(0, Math.floor(performance.now() - local.startedAtMs));
        this.sendCoopInput({
          v: 1,
          type: 'dmg_intent',
          playerId: this.hooks.multiplayer?.playerId ?? 'client',
          missionId: local.missionId,
          t: intentTime,
          amount,
          weaponType: 'pulse',
          crit: amount > 80,
          checksum: computeDamageIntentChecksum(local.seed, local.missionId, {
            t: intentTime,
            amount,
            weaponType: 'pulse',
            crit: amount > 80
          })
        });
      }
    }

    if (snapshot.combat.isEscortMission && gate.allowed && local.state === 'alive' && roll > 0.87) {
      this.sendCoopInput({
        v: 1,
        type: 'convoy_damage',
        playerId: this.hooks.multiplayer?.playerId ?? 'client',
        missionId: local.missionId,
        t: Math.max(0, Math.floor(performance.now() - local.startedAtMs)),
        amount: 2 + Math.floor(roll * 4)
      });
    }

    const targetHp = snapshot.combat.bossHp;
    if (this.reducedMotion) {
      local.bossDisplayHp = targetHp;
    } else {
      const step = Math.max(1, deltaMs * 0.22);
      if (targetHp < local.bossDisplayHp) local.bossDisplayHp = Math.max(targetHp, local.bossDisplayHp - step);
      else local.bossDisplayHp = targetHp;
    }
  }

  private onCoopEvent(event: StarlightCoopEvent) {
    if (event.type === 'combat_shared_start') {
      this.pendingStatus = `Co-op mission ${event.missionId} started`;
    }

    if (event.type === 'combat_shared_end') {
      this.pendingStatus = `Combat end: ${event.reason} | +${event.rewards.credits}c +${event.rewards.materials}m`;
    }

    if (event.type === 'input_rejected' && event.playerId === this.hooks.multiplayer?.playerId) {
      this.pendingStatus = `Input rejected: ${event.reason}`;
    }

    if (this.pendingStatus) {
      this.tallyText.setText(this.pendingStatus);
    }
  }

  private makeButton(x: number, y: number, label: string, onTap: () => void, width: number, height: number, color: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, color, 1).setStrokeStyle(2, 0xcce3ff, 0.8);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Verdana',
        fontSize: '17px',
        color: '#f5fbff',
        align: 'center',
        wordWrap: { width: width - 12 }
      })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => onTap());
    container.add([bg, text]);
    return container;
  }
}
