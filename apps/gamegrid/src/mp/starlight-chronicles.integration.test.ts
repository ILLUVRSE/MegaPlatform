import { describe, expect, it } from 'vitest';
import {
  StarlightChroniclesMultiplayerAdapter,
  computeDamageIntentChecksum,
  type StarlightCoopEvent,
  type StarlightCoopSnapshot
} from './adapters/starlight-chronicles';

function createAdapter(role: 'host' | 'client', playerId: string, seed: number, playerIds: string[]) {
  const adapter = new StarlightChroniclesMultiplayerAdapter();
  adapter.init({
    role,
    playerId,
    seed,
    options: {
      hostPlayerId: playerIds[0],
      playerIds,
      playerIndex: playerIds.indexOf(playerId)
    }
  });
  adapter.start();
  return adapter;
}

function flushHost(host: StarlightChroniclesMultiplayerAdapter, clients: StarlightChroniclesMultiplayerAdapter[], dt = 0.2) {
  const events = host.step(dt) as StarlightCoopEvent[];
  const snap = host.getSnapshot();
  for (let i = 0; i < clients.length; i += 1) {
    for (let e = 0; e < events.length; e += 1) clients[i].applyEvent(events[e]);
    clients[i].applySnapshot(snap);
  }
  return { events, snap };
}

function readyAll(host: StarlightChroniclesMultiplayerAdapter, players: string[]) {
  for (let i = 0; i < players.length; i += 1) {
    const playerId = players[i];
    if (i === 0) host.onInput({ v: 1, type: 'ready_status', ready: true });
    else host.onRemoteMessage({ fromPlayerId: playerId, input: { v: 1, type: 'ready_status', ready: true } });
  }
}

function enterCombat(host: StarlightChroniclesMultiplayerAdapter, clients: StarlightChroniclesMultiplayerAdapter[]) {
  for (let i = 0; i < 6; i += 1) flushHost(host, clients);
  const snap = host.getSnapshot();
  const combatNodeId = snap.availableNodeIds.find((nodeId) => {
    const node = snap.runSnapshot.mapGraph.nodes.find((entry) => entry.id === nodeId);
    return node?.type === 'COMBAT' || node?.type === 'BOSS';
  });
  expect(combatNodeId).toBeTruthy();

  host.onInput({ v: 1, type: 'host_override', action: 'pick_node', optionId: combatNodeId });
  host.onInput({ v: 1, type: 'host_override', action: 'skip_timer' });

  let cycle = { events: [] as StarlightCoopEvent[], snap: host.getSnapshot() as StarlightCoopSnapshot };
  for (let i = 0; i < 8; i += 1) cycle = flushHost(host, clients);
  expect(cycle.snap.phase).toBe('combat');
  return cycle.snap;
}

function enterEscortCombat(host: StarlightChroniclesMultiplayerAdapter, clients: StarlightChroniclesMultiplayerAdapter[]) {
  for (let i = 0; i < 6; i += 1) flushHost(host, clients);
  const snap = host.getSnapshot();
  const escortNodeId = snap.availableNodeIds.find((nodeId) => {
    const node = snap.runSnapshot.mapGraph.nodes.find((entry) => entry.id === nodeId);
    return node?.type === 'ESCORT';
  });
  expect(escortNodeId).toBeTruthy();
  host.onInput({ v: 1, type: 'host_override', action: 'pick_node', optionId: escortNodeId });
  host.onInput({ v: 1, type: 'host_override', action: 'skip_timer' });
  let cycle = { events: [] as StarlightCoopEvent[], snap: host.getSnapshot() as StarlightCoopSnapshot };
  for (let i = 0; i < 8; i += 1) cycle = flushHost(host, clients);
  expect(cycle.snap.phase).toBe('combat');
  expect(cycle.snap.combat.isEscortMission).toBe(true);
  return cycle.snap;
}

function sendIntent(host: StarlightChroniclesMultiplayerAdapter, playerId: string, missionId: string, seed: number, t: number, amount: number) {
  const input = {
    v: 1,
    type: 'dmg_intent' as const,
    playerId,
    missionId,
    t,
    amount,
    weaponType: 'pulse' as const,
    crit: amount > 90,
    checksum: computeDamageIntentChecksum(seed, missionId, {
      t,
      amount,
      weaponType: 'pulse',
      crit: amount > 90
    })
  };
  if (playerId === 'host') host.onInput(input);
  else host.onRemoteMessage({ fromPlayerId: playerId, input });
}

describe('starlight chronicles shared boss co-op integration', () => {
  it('host rejects invalid hull config input', () => {
    const playerIds = ['host', 'p1', 'p2'];
    const host = createAdapter('host', 'host', 9200, playerIds);
    const clients = [createAdapter('client', 'p1', 9200, playerIds), createAdapter('client', 'p2', 9200, playerIds)];

    host.onRemoteMessage({
      fromPlayerId: 'p1',
      input: { v: 1, type: 'ship_config', playerId: 'p1', activeHullId: 'not-real-hull' }
    });
    const cycle = flushHost(host, clients, 0.1);
    expect(cycle.events.some((event) => event.type === 'input_rejected' && event.reason === 'invalid_hull_id')).toBe(true);
  });

  it('host and clients share world context snapshot with deterministic shock/frontline ids', () => {
    const playerIds = ['host', 'p1', 'p2'];
    const host = createAdapter('host', 'host', 9201, playerIds);
    const clients = [createAdapter('client', 'p1', 9201, playerIds), createAdapter('client', 'p2', 9201, playerIds)];
    readyAll(host, playerIds);
    const cycle = flushHost(host, clients, 0.2);
    const hostWorld = cycle.snap.runSnapshot.worldContext;
    const clientWorld = clients[0].getSnapshot().runSnapshot.worldContext;
    const hostShip = cycle.snap.runSnapshot.shipConfig;
    const clientShip = clients[0].getSnapshot().runSnapshot.shipConfig;

    expect(hostWorld.systemId).toBe(clientWorld.systemId);
    expect(hostWorld.marketShockIds).toEqual(clientWorld.marketShockIds);
    expect(hostWorld.frontline.contestedSystemIds).toEqual(clientWorld.frontline.contestedSystemIds);
    expect(hostShip.activeHullId).toBe(clientShip.activeHullId);
    expect(hostShip.cosmetics.skinKey).toBe(clientShip.cosmetics.skinKey);
    expect(hostShip.activeDroneId).toBe(clientShip.activeDroneId);
    expect(hostShip.activeWingmenIds).toEqual(clientShip.activeWingmenIds);
    expect(hostShip.patrolContextIds).toEqual(clientShip.patrolContextIds);
  });

  it('host rejects invalid wingmen and drone ids in ship config', () => {
    const playerIds = ['host', 'p1', 'p2'];
    const host = createAdapter('host', 'host', 9206, playerIds);
    const clients = [createAdapter('client', 'p1', 9206, playerIds), createAdapter('client', 'p2', 9206, playerIds)];

    host.onRemoteMessage({
      fromPlayerId: 'p1',
      input: { v: 1, type: 'ship_config', playerId: 'p1', activeWingmenIds: ['bad-wingman'] }
    });
    host.onRemoteMessage({
      fromPlayerId: 'p1',
      input: { v: 1, type: 'ship_config', playerId: 'p1', activeDroneId: 'bad-drone' }
    });
    const cycle = flushHost(host, clients, 0.1);
    expect(cycle.events.some((event) => event.type === 'input_rejected' && event.reason === 'invalid_wingmen_id')).toBe(true);
    expect(cycle.events.some((event) => event.type === 'input_rejected' && event.reason === 'invalid_drone_id')).toBe(true);
  });

  it('shared boss hp syncs across host + clients and ends when hp reaches 0', () => {
    const playerIds = ['host', 'p1', 'p2'];
    const host = createAdapter('host', 'host', 9101, playerIds);
    const clients = [createAdapter('client', 'p1', 9101, playerIds), createAdapter('client', 'p2', 9101, playerIds)];

    readyAll(host, playerIds);
    const combatSnap = enterCombat(host, clients);
    const missionId = combatSnap.combat.missionId ?? 'missing';
    const seed = combatSnap.combat.seed ?? 1;

    for (let i = 0; i < 240; i += 1) {
      sendIntent(host, 'host', missionId, seed, i * 100, 25);
      sendIntent(host, 'p1', missionId, seed, i * 100 + 20, 25);
      sendIntent(host, 'p2', missionId, seed, i * 100 + 40, 25);
      flushHost(host, clients, 0.1);
      const snap = host.getSnapshot();
      expect(clients[0].getSnapshot().combat.bossHp).toBe(snap.combat.bossHp);
      expect(clients[1].getSnapshot().combat.bossHp).toBe(snap.combat.bossHp);
      if (snap.phase !== 'combat') break;
    }

    const finalSnap = host.getSnapshot();
    expect(finalSnap.phase === 'results' || finalSnap.phase === 'map' || finalSnap.phase === 'end').toBe(true);
    expect(finalSnap.runSnapshot.inventory.credits).toBeGreaterThan(220);
  });

  it('ability cooldown is enforced and rally buff changes boss damage resolution', () => {
    const playerIds = ['host', 'p1', 'p2'];
    const host = createAdapter('host', 'host', 9102, playerIds);
    const clients = [createAdapter('client', 'p1', 9102, playerIds), createAdapter('client', 'p2', 9102, playerIds)];

    readyAll(host, playerIds);
    const combatSnap = enterCombat(host, clients);
    const missionId = combatSnap.combat.missionId ?? 'missing';
    const seed = combatSnap.combat.seed ?? 1;

    const hpBefore = host.getSnapshot().combat.bossHp;

    host.onInput({ v: 1, type: 'ability_cast', playerId: 'host', missionId, abilityId: 'captain_rally', t: 1000 });
    sendIntent(host, 'host', missionId, seed, 1100, 60);
    let cycle = flushHost(host, clients, 0.1);

    const hpAfter = host.getSnapshot().combat.bossHp;
    expect(hpBefore - hpAfter).toBeGreaterThan(60);
    expect(cycle.events.some((event) => event.type === 'ability_apply' && event.abilityId === 'captain_rally')).toBe(true);

    host.onInput({ v: 1, type: 'ability_cast', playerId: 'host', missionId, abilityId: 'captain_rally', t: 1400 });
    cycle = flushHost(host, clients, 0.1);
    expect(cycle.events.some((event) => event.type === 'input_rejected' && event.reason === 'ability_cooldown')).toBe(true);
  });

  it('escort convoy hp syncs across host + clients', () => {
    const playerIds = ['host', 'p1', 'p2'];
    const host = createAdapter('host', 'host', 9110, playerIds);
    const clients = [createAdapter('client', 'p1', 9110, playerIds), createAdapter('client', 'p2', 9110, playerIds)];
    readyAll(host, playerIds);
    const escortSnap = enterEscortCombat(host, clients);
    const missionId = escortSnap.combat.missionId ?? 'missing';

    for (let i = 0; i < 20; i += 1) {
      host.onRemoteMessage({
        fromPlayerId: 'p1',
        input: { v: 1, type: 'convoy_damage', playerId: 'p1', missionId, t: i * 100, amount: 3 }
      });
      const cycle = flushHost(host, clients, 0.1);
      expect(clients[0].getSnapshot().combat.convoyHp).toBe(cycle.snap.combat.convoyHp);
      expect(clients[1].getSnapshot().combat.convoyHp).toBe(cycle.snap.combat.convoyHp);
      if (cycle.snap.phase !== 'combat') break;
    }
  });

  it('rejects absurd damage intents as cheat resistance', () => {
    const playerIds = ['host', 'p1', 'p2'];
    const host = createAdapter('host', 'host', 9103, playerIds);
    const clients = [createAdapter('client', 'p1', 9103, playerIds), createAdapter('client', 'p2', 9103, playerIds)];

    readyAll(host, playerIds);
    const combatSnap = enterCombat(host, clients);

    host.onRemoteMessage({
      fromPlayerId: 'p1',
      input: {
        v: 1,
        type: 'dmg_intent',
        playerId: 'p1',
        missionId: combatSnap.combat.missionId,
        t: 200,
        amount: 999,
        weaponType: 'pulse',
        checksum: computeDamageIntentChecksum(combatSnap.combat.seed ?? 1, combatSnap.combat.missionId ?? '', {
          t: 200,
          amount: 999,
          weaponType: 'pulse',
          crit: false
        })
      }
    });

    const cycle = flushHost(host, clients, 0.1);
    expect(cycle.events.some((event) => event.type === 'input_rejected' && event.playerId === 'p1')).toBe(true);
  });

  it('reconnect mid-combat receives boss snapshot and phase', () => {
    const playerIds = ['host', 'p1', 'p2'];
    const host = createAdapter('host', 'host', 9104, playerIds);
    const clients = [createAdapter('client', 'p1', 9104, playerIds), createAdapter('client', 'p2', 9104, playerIds)];

    readyAll(host, playerIds);
    const combatSnap = enterCombat(host, clients);
    const missionId = combatSnap.combat.missionId ?? 'missing';
    const seed = combatSnap.combat.seed ?? 1;

    sendIntent(host, 'host', missionId, seed, 100, 60);
    for (let i = 0; i < 4; i += 1) flushHost(host, clients, 0.1);

    const rejoin = createAdapter('client', 'p1', 9104, playerIds);
    host.onRemoteMessage({ fromPlayerId: 'p1', input: { v: 1, type: 'snapshot_request' } });
    const { events } = flushHost(host, [rejoin], 0.1);
    const resync = events.find((event) => event.type === 'snapshot_resync');
    expect(resync).toBeTruthy();
    if (resync && resync.type === 'snapshot_resync') {
      expect(resync.combat?.missionId).toBe(missionId);
      expect(resync.phase).toBe('combat');
    }
  });

  it('same seed + ordered intents produce deterministic phase timeline and rewards', () => {
    const runScript = () => {
      const playerIds = ['host', 'p1', 'p2'];
      const host = createAdapter('host', 'host', 9105, playerIds);
      const clients = [createAdapter('client', 'p1', 9105, playerIds), createAdapter('client', 'p2', 9105, playerIds)];
      readyAll(host, playerIds);
      const combatSnap = enterCombat(host, clients);
      const missionId = combatSnap.combat.missionId ?? 'missing';
      const seed = combatSnap.combat.seed ?? 1;

      const phaseTimeline: number[] = [];
      let rewards = { credits: 0, materials: 0 };

      for (let i = 0; i < 90; i += 1) {
        sendIntent(host, 'host', missionId, seed, i * 100, 84);
        sendIntent(host, 'p1', missionId, seed, i * 100 + 20, 82);
        sendIntent(host, 'p2', missionId, seed, i * 100 + 40, 80);
        const cycle = flushHost(host, clients, 0.1);
        for (let e = 0; e < cycle.events.length; e += 1) {
          const event = cycle.events[e];
          if (event.type === 'boss_phase') phaseTimeline.push(event.phaseId);
          if (event.type === 'combat_shared_end') {
            rewards = { credits: event.rewards.credits, materials: event.rewards.materials };
          }
        }
        if (host.getSnapshot().phase !== 'combat') break;
      }

      return { phaseTimeline, rewards };
    };

    const a = runScript();
    const b = runScript();
    expect(a).toEqual(b);
  });
});
