import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { applyStoryChoice, findChapter, loadChapters, resolveAvailableChoices } from './storyRules';

describe('starlight story rules', () => {
  it('applies choice state changes for faction and morale', () => {
    const chapters = loadChapters();
    const chapter = findChapter(chapters, 'prologue');
    const profile = createInitialProfile(123);

    const result = applyStoryChoice(profile, chapter, 'p1', 'p1-concord');

    expect(result.profile.factions.concordium).toBe(2);
    expect(result.profile.crewMorale).toBe(51);
    expect(result.profile.codexLog).toHaveLength(1);
    expect(result.nextNodeId).toBe('p2');
  });

  it('filters faction-locked choices by standing', () => {
    const chapters = loadChapters();
    const chapter = findChapter(chapters, 'freebelt-accord');
    const node = chapter.nodes.find((entry) => entry.id === 'f4');
    expect(node).toBeTruthy();
    if (!node) return;

    const low = createInitialProfile(1);
    const high = {
      ...low,
      factions: {
        ...low.factions,
        freebelt: 5
      }
    };

    expect(resolveAvailableChoices(low, node).some((entry) => entry.id === 'f4-enter')).toBe(false);
    expect(resolveAvailableChoices(high, node).some((entry) => entry.id === 'f4-enter')).toBe(true);
  });
});
