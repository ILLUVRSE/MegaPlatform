import { describe, expect, it } from 'vitest';
import {
  addCompanionMeter,
  canUseGoldenCap,
  createInitialState,
  markBossResult,
  markPackCompleted,
  setSpectaclesTint,
  setChapterPosition,
  unlockSketches,
  useGoldenCapCommand
} from './rules';
import { applyStoryChoice, findChapter, isChoiceUnlocked, loadChapters } from './story/storyRules';

describe('oz chronicle rules', () => {
  it('updates story progression state correctly from chapter choices', () => {
    const chapters = loadChapters();
    const chapter = findChapter(chapters, 'arrival-munchkins');

    let state = createInitialState(1234);
    state = setChapterPosition(state, chapter.id, chapter.startNodeId, 'arrival-cyclone');

    const first = applyStoryChoice(state, chapter, 'arrival_1', 'arrival_1_steady');
    expect(first.nextNodeId).toBe('arrival_2');
    expect(first.state.stats.brains).toBe(2);

    const second = applyStoryChoice(first.state, chapter, 'arrival_2', 'arrival_2_listen');
    expect(second.nextNodeId).toBe('arrival_3');
    expect(second.state.stats.brains).toBe(3);
  });

  it('persists silver slippers inventory flag through story outcomes', () => {
    const chapters = loadChapters();
    const chapter = findChapter(chapters, 'arrival-munchkins');

    let state = createInitialState(3456);
    state = setChapterPosition(state, chapter.id, chapter.startNodeId, 'arrival-cyclone');

    const finish = applyStoryChoice(state, chapter, 'arrival_3', 'arrival_3_ready');
    expect(finish.state.inventory.silverSlippers).toBe(true);
    expect(finish.state.inventory.protectionMark).toBe(true);
  });

  it('meeting Tin and Lion sets companions as acquired', () => {
    const chapters = loadChapters();
    const tinChapter = findChapter(chapters, 'meet-tin-woodman');
    const lionChapter = findChapter(chapters, 'meet-cowardly-lion');

    let state = createInitialState(777);

    state = applyStoryChoice(state, tinChapter, 'tin_2', 'tin_2_join').state;
    state = applyStoryChoice(state, lionChapter, 'lion_2', 'lion_2_join').state;

    expect(state.companions['tin-woodman'].acquired).toBe(true);
    expect(state.companions['cowardly-lion'].acquired).toBe(true);
  });

  it('companion meter increments persist and clamp to cap', () => {
    let state = createInitialState(778);
    for (let i = 0; i < 20; i += 1) {
      state = addCompanionMeter(state, 'scarecrow', 1, 'Solved another route puzzle.');
    }

    expect(state.companions.scarecrow.meter).toBe(9);
    expect(state.companions.scarecrow.recentActions.length).toBeGreaterThan(0);
    expect(state.companions.scarecrow.recentActions.length).toBeLessThanOrEqual(4);
  });

  it('high meter unlocks smart branch and applies companion bonus tag', () => {
    const chapters = loadChapters();
    const kalidahChapter = findChapter(chapters, 'kalidah-encounter');
    let state = createInitialState(1200);

    state = addCompanionMeter(state, 'scarecrow', 5, 'Mapped a weak bridge span.');
    state = { ...state, companions: { ...state.companions, scarecrow: { ...state.companions.scarecrow, acquired: true } } };

    const result = applyStoryChoice(state, kalidahChapter, 'kalidah_2', 'kalidah_2_smart');
    expect(result.state.stats.brains).toBeGreaterThan(state.stats.brains);
    expect(result.companionBonusTag).toContain('Companion Bonus Applied');
  });

  it('applies poppy sleep status and clears flags through field mice progression', () => {
    const chapters = loadChapters();
    const poppy = findChapter(chapters, 'poppy-field');
    const mice = findChapter(chapters, 'field-mice-rescue');

    let state = createInitialState(1499);
    state = applyStoryChoice(state, poppy, 'poppy_1', 'poppy_1_press').state;
    expect(state.storyFlags.dorothyAsleep).toBe(true);
    expect(state.storyFlags.lionAsleep).toBe(true);

    state = applyStoryChoice(state, mice, 'mice_2', 'mice_2_finish').state;
    expect(state.storyFlags.dorothyAsleep).toBe(false);
    expect(state.storyFlags.lionAsleep).toBe(false);
    expect(state.storyFlags.fieldMiceRescueComplete).toBe(true);
  });

  it('pack completion and boss records persist with clamps', () => {
    let state = createInitialState(501);
    state = markPackCompleted(state, 'pack1');
    state = markPackCompleted(state, 'pack1');
    state = markPackCompleted(state, 'pack6');
    state = markBossResult(state, 'kalidah-chase', 730, 10120);
    state = markBossResult(state, 'kalidah-chase', 680, 11120);
    state = markBossResult(state, 'shadow-of-the-west', 810, 9230);
    state = markBossResult(state, 'western-hold-escape', 860, 9050);
    state = markBossResult(state, 'dousing-the-shadow', 901, 8440);

    expect(state.completedPackIds).toEqual(['pack1', 'pack6']);
    expect(state.bestBossScores['kalidah-chase']).toBe(730);
    expect(state.bestBossTimesMs['kalidah-chase']).toBe(10120);
    expect(state.bestBossScores['shadow-of-the-west']).toBe(810);
    expect(state.bestBossScores['western-hold-escape']).toBe(860);
    expect(state.bestBossScores['dousing-the-shadow']).toBe(901);
  });

  it('story sketch unlocks persist without duplicates', () => {
    let state = createInitialState(999);
    state = unlockSketches(state, ['tin-polish-study', 'tin-polish-study']);
    state = unlockSketches(state, ['lion-roar-echo']);
    state = unlockSketches(state, ['lion-roar-echo']);

    expect(state.unlockedSketches).toEqual(['tin-polish-study', 'lion-roar-echo']);
  });

  it('gate admission chapter sets spectacles story flag', () => {
    const chapters = loadChapters();
    const chapter = findChapter(chapters, 'emerald-city-entry');
    let state = createInitialState(2088);

    const result = applyStoryChoice(state, chapter, 'entry_1', 'entry_1_step-through');
    expect(result.state.storyFlags.spectaclesOn).toBe(true);
  });

  it('meter-gated companion city option appears at threshold and does not block progression', () => {
    const chapters = loadChapters();
    const chapter = findChapter(chapters, 'emerald-city-explore');
    const node = chapter.nodes.find((entry) => entry.id === 'explore_1');
    expect(node).toBeDefined();

    let state = createInitialState(912);
    state = { ...state, companions: { ...state.companions, 'cowardly-lion': { ...state.companions['cowardly-lion'], acquired: true } } };
    const gatedChoice = node?.choices.find((entry) => entry.id === 'explore_1_lion-line');
    const baseChoice = node?.choices.find((entry) => entry.id === 'explore_1_choose');

    expect(baseChoice).toBeDefined();
    expect(gatedChoice).toBeDefined();
    expect(baseChoice ? isChoiceUnlocked(state, baseChoice) : false).toBe(true);
    expect(gatedChoice ? isChoiceUnlocked(state, gatedChoice) : true).toBe(false);

    state = addCompanionMeter(state, 'cowardly-lion', 4, 'Crowd scouting.');
    expect(gatedChoice ? isChoiceUnlocked(state, gatedChoice) : false).toBe(true);
  });

  it('toggles spectacles tint setting in state', () => {
    let state = createInitialState(202);
    expect(state.settings.spectaclesTint).toBe(true);
    state = setSpectaclesTint(state, false);
    expect(state.settings.spectaclesTint).toBe(false);
  });

  it('mission setup unlocks westward journey and pack6 route token flags', () => {
    const chapters = loadChapters();
    const mission = findChapter(chapters, 'westward-mission-setup');
    let state = createInitialState(2027);

    state = applyStoryChoice(state, mission, 'westward_2', 'westward_2_accept').state;
    expect(state.storyFlags.westwardJourneyUnlocked).toBe(true);
    expect(state.storyFlags.pack6RouteToken).toBe(true);
  });

  it('pack6 story progression updates winkie stage and threat level', () => {
    const chapters = loadChapters();
    const winkie = findChapter(chapters, 'winkie-country');
    const cliff = findChapter(chapters, 'westward-cliffhanger');
    let state = createInitialState(2033);

    state = applyStoryChoice(state, winkie, 'winkie_1', 'winkie_1_step-in').state;
    expect(state.storyFlags.winkieCountryReached).toBe(true);
    expect(state.storyFlags.westThreatLevel).toBe(2);

    state = applyStoryChoice(state, cliff, 'west_cliff_2', 'west_cliff_2_hold-fast').state;
    expect(state.storyFlags.westThreatLevel).toBe(4);
    expect(state.unlockedSketches).toContain('lions-resolve');
  });

  it('golden cap commands decrement, clamp, and require availability', () => {
    const chapters = loadChapters();
    const cap = findChapter(chapters, 'golden-cap-discovery');
    let state = createInitialState(4111);

    state = applyStoryChoice(state, cap, 'cap_1', 'cap_1_claim').state;
    expect(state.goldenCap.acquired).toBe(true);
    expect(state.goldenCap.usesRemaining).toBe(3);
    expect(canUseGoldenCap(state)).toBe(true);

    state = useGoldenCapCommand(state, 'aid-rescue');
    state = useGoldenCapCommand(state, 'carry-companions');
    state = useGoldenCapCommand(state, 'clear-path');
    expect(state.goldenCap.usesRemaining).toBe(0);
    expect(canUseGoldenCap(state)).toBe(false);

    const stable = useGoldenCapCommand(state, 'clear-path');
    expect(stable.goldenCap.usesRemaining).toBe(0);
    expect(stable.goldenCap.commandHistory).toEqual(['aid-rescue', 'carry-companions', 'clear-path']);
  });

  it('pack8 story progression sets west-defeat and return flags', () => {
    const chapters = loadChapters();
    const water = findChapter(chapters, 'water-defeat-moment');
    const winkie = findChapter(chapters, 'winkie-liberation-aftermath');
    const ret = findChapter(chapters, 'return-to-emerald-setup');
    let state = createInitialState(4888);

    state = applyStoryChoice(state, water, 'water8_1', 'water8_1_act').state;
    expect(state.storyFlags.witchDefeatedWest).toBe(true);

    state = applyStoryChoice(state, winkie, 'wink8_1', 'wink8_1_accept').state;
    expect(state.storyFlags.winkieFreed).toBe(true);

    state = applyStoryChoice(state, ret, 'ret8_1', 'ret8_1_set').state;
    expect(state.storyFlags.returnQuestUnlocked).toBe(true);
  });

  it('pack9 story progression sets revelation, gifts, and balloon attempt flags', () => {
    const chapters = loadChapters();
    const wizard = findChapter(chapters, 'wizard-revelation-resolution');
    const gifts = findChapter(chapters, 'companion-gifts-ceremony');
    const balloon = findChapter(chapters, 'balloon-departure-attempt');
    let state = createInitialState(5099);

    state = applyStoryChoice(state, wizard, 'wiz9_1', 'wiz9_1_truth').state;
    expect(state.storyFlags.wizardRevealed).toBe(true);

    state = applyStoryChoice(state, gifts, 'gift9_1', 'gift9_1_accept').state;
    state = applyStoryChoice(state, gifts, 'gift9_2', 'gift9_2_accept').state;
    state = applyStoryChoice(state, gifts, 'gift9_3', 'gift9_3_accept').state;
    expect(state.storyFlags.scarecrowGifted).toBe(true);
    expect(state.storyFlags.tinGifted).toBe(true);
    expect(state.storyFlags.lionGifted).toBe(true);

    state = applyStoryChoice(state, balloon, 'bal9_2', 'bal9_2_missed').state;
    expect(state.storyFlags.balloonAttempted).toBe(true);
    expect(state.storyFlags.dorothyStillInOz).toBe(true);
  });
});
