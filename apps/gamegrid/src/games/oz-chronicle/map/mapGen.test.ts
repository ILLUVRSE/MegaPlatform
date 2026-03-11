import { describe, expect, it } from 'vitest';
import { generateOzChapterMap } from './mapGen';

describe('oz chapter map generation', () => {
  it('is deterministic for the same seed and pack progression', () => {
    const a = generateOzChapterMap(2026, 9);
    const b = generateOzChapterMap(2026, 9);

    expect(a.startNodeId).toBe('arrival-cyclone');
    expect(a.nodes.map((entry) => entry.id)).toEqual(b.nodes.map((entry) => entry.id));
    expect(a.nodes.length).toBeGreaterThanOrEqual(102);
    expect(a.nodes.length).toBeLessThanOrEqual(120);
  });

  it('includes packs in order as progression increases', () => {
    const pack1 = generateOzChapterMap(2026, 1);
    const pack2 = generateOzChapterMap(2026, 2);
    const pack3 = generateOzChapterMap(2026, 3);
    const pack4 = generateOzChapterMap(2026, 4);
    const pack5 = generateOzChapterMap(2026, 5);
    const pack6 = generateOzChapterMap(2026, 6);
    const pack7 = generateOzChapterMap(2026, 7);
    const pack8 = generateOzChapterMap(2026, 8);
    const pack9 = generateOzChapterMap(2026, 9);

    expect(pack1.nodes.every((node) => node.packId === 'pack1')).toBe(true);
    expect(pack2.nodes.some((node) => node.packId === 'pack2')).toBe(true);
    expect(pack3.nodes.some((node) => node.packId === 'pack3')).toBe(true);
    expect(pack4.nodes.some((node) => node.packId === 'pack4')).toBe(true);
    expect(pack5.nodes.some((node) => node.packId === 'pack5')).toBe(true);
    expect(pack6.nodes.some((node) => node.packId === 'pack6')).toBe(true);
    expect(pack7.nodes.some((node) => node.packId === 'pack7')).toBe(true);
    expect(pack8.nodes.some((node) => node.packId === 'pack8')).toBe(true);
    expect(pack9.nodes.some((node) => node.packId === 'pack9')).toBe(true);
    expect(pack1.nodes.length).toBeLessThan(pack2.nodes.length);
    expect(pack2.nodes.length).toBeLessThan(pack3.nodes.length);
    expect(pack3.nodes.length).toBeLessThan(pack4.nodes.length);
    expect(pack4.nodes.length).toBeLessThan(pack5.nodes.length);
    expect(pack5.nodes.length).toBeLessThan(pack6.nodes.length);
    expect(pack6.nodes.length).toBeLessThan(pack7.nodes.length);
    expect(pack7.nodes.length).toBeLessThan(pack8.nodes.length);
    expect(pack8.nodes.length).toBeLessThan(pack9.nodes.length);
  });

  it('places both boss minigame nodes on the pack 3 main route', () => {
    const map = generateOzChapterMap(2026, 3);
    const ids = map.nodes.map((node) => node.id);
    const kalidahIdx = ids.indexOf('kalidah-chase');
    const poppyIdx = ids.indexOf('poppy-drift-rescue');

    expect(kalidahIdx).toBeGreaterThan(-1);
    expect(poppyIdx).toBeGreaterThan(-1);
    expect(kalidahIdx).toBeLessThan(poppyIdx);
  });

  it('places pack 4 admission minigame and city choose-destination node on main flow', () => {
    const map = generateOzChapterMap(2026, 4);
    const ids = map.nodes.map((node) => node.id);
    const admissionIdx = ids.indexOf('spectacle-fastening');
    const chooseIdx = ids.indexOf('city-choose-destination');
    const appointmentIdx = ids.indexOf('wizard-appointment-ledger');

    expect(admissionIdx).toBeGreaterThan(-1);
    expect(chooseIdx).toBeGreaterThan(admissionIdx);
    expect(appointmentIdx).toBeGreaterThan(chooseIdx);
  });

  it('places pack 5 audience mechanic and westward token on main flow', () => {
    const map = generateOzChapterMap(2026, 5);
    const ids = map.nodes.map((node) => node.id);
    const mechanicIdx = ids.indexOf('audience-perception');
    const conditionIdx = ids.indexOf('wizard-condition-declared');
    const tokenIdx = ids.indexOf('pack6-route-token');

    expect(mechanicIdx).toBeGreaterThan(-1);
    expect(conditionIdx).toBeGreaterThan(mechanicIdx);
    expect(tokenIdx).toBeGreaterThan(conditionIdx);
  });

  it('places pack 6 boss node and story beats on the main route', () => {
    const map = generateOzChapterMap(2026, 6);
    const ids = map.nodes.map((node) => node.id);
    const bossIdx = ids.indexOf('shadow-of-the-west');
    const westwardIdx = ids.indexOf('westward-roadhead');
    const winkieIdx = ids.indexOf('winkie-hillside');
    const cliffIdx = ids.indexOf('western-castle-glimpse');

    expect(bossIdx).toBeGreaterThan(-1);
    expect(westwardIdx).toBeGreaterThan(-1);
    expect(winkieIdx).toBeGreaterThan(westwardIdx);
    expect(bossIdx).toBeGreaterThan(winkieIdx);
    expect(cliffIdx).toBeGreaterThan(bossIdx);
  });

  it('places pack 7 capture chain, golden cap, command node, and boss on main route', () => {
    const map = generateOzChapterMap(2026, 7);
    const ids = map.nodes.map((node) => node.id);
    const captureIdx = ids.indexOf('capture-shadow');
    const capIdx = ids.indexOf('golden-cap-taken');
    const commandIdx = ids.indexOf('monkey-command-aid');
    const bossIdx = ids.indexOf('western-hold-escape');

    expect(captureIdx).toBeGreaterThan(-1);
    expect(capIdx).toBeGreaterThan(captureIdx);
    expect(commandIdx).toBeGreaterThan(capIdx);
    expect(bossIdx).toBeGreaterThan(commandIdx);
  });

  it('places pack 8 confrontation, boss, aftermath, and return setup on main route', () => {
    const map = generateOzChapterMap(2026, 8);
    const ids = map.nodes.map((node) => node.id);
    const setupIdx = ids.indexOf('western-reckoning');
    const bossIdx = ids.indexOf('dousing-the-shadow');
    const thanksIdx = ids.indexOf('winkie-thanks');
    const returnIdx = ids.indexOf('return-objective');

    expect(setupIdx).toBeGreaterThan(-1);
    expect(bossIdx).toBeGreaterThan(setupIdx);
    expect(thanksIdx).toBeGreaterThan(bossIdx);
    expect(returnIdx).toBeGreaterThan(thanksIdx);
  });

  it('places pack 9 return chain, revelation, gifts, minigame, and mishap on main route', () => {
    const map = generateOzChapterMap(2026, 9);
    const ids = map.nodes.map((node) => node.id);
    const returnIdx = ids.indexOf('emerald-return-gates');
    const revealIdx = ids.indexOf('truth-of-the-wizard');
    const giftsIdx = ids.indexOf('lion-gift');
    const miniIdx = ids.indexOf('balloon-rigging');
    const mishapIdx = ids.indexOf('departure-mishap');

    expect(returnIdx).toBeGreaterThan(-1);
    expect(revealIdx).toBeGreaterThan(returnIdx);
    expect(giftsIdx).toBeGreaterThan(revealIdx);
    expect(miniIdx).toBeGreaterThan(giftsIdx);
    expect(mishapIdx).toBeGreaterThan(miniIdx);
  });
});
