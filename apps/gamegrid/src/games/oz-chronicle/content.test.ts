import { describe, expect, it } from 'vitest';
import chaptersRaw from '../../content/oz-chronicle/chapters.json';
import glossaryRaw from '../../content/oz-chronicle/glossary.json';
import minigamesRaw from '../../content/oz-chronicle/minigames.json';

interface ChapterChoice {
  id: string;
  label: string;
  nextNodeId: string | null;
  outcome: Record<string, unknown>;
}

interface ChapterNode {
  id: string;
  text: string;
  choices: ChapterChoice[];
}

interface Chapter {
  id: string;
  title: string;
  startNodeId: string;
  nodes: ChapterNode[];
}

describe('oz chronicle chapters content schema', () => {
  it('has required chapter fields and playable choices', () => {
    const parsed = chaptersRaw as { chapters: Chapter[] };

    expect(Array.isArray(parsed.chapters)).toBe(true);
    expect(parsed.chapters.length).toBeGreaterThanOrEqual(10);

    for (const chapter of parsed.chapters) {
      expect(typeof chapter.id).toBe('string');
      expect(typeof chapter.title).toBe('string');
      expect(typeof chapter.startNodeId).toBe('string');
      expect(Array.isArray(chapter.nodes)).toBe(true);
      expect(chapter.nodes.length).toBeGreaterThan(0);

      for (const node of chapter.nodes) {
        expect(typeof node.id).toBe('string');
        expect(typeof node.text).toBe('string');
        expect(Array.isArray(node.choices)).toBe(true);
        expect(node.choices.length).toBeGreaterThan(0);

        for (const choice of node.choices) {
          expect(typeof choice.id).toBe('string');
          expect(typeof choice.label).toBe('string');
          expect(choice.nextNodeId === null || typeof choice.nextNodeId === 'string').toBe(true);
          expect(typeof choice.outcome).toBe('object');
        }
      }
    }
  });

  it('includes pack 4 chapter ids, glossary growth, and spectacle minigame config', () => {
    const parsed = chaptersRaw as { chapters: Chapter[] };
    const ids = parsed.chapters.map((entry) => entry.id);
    expect(ids).toContain('emerald-city-approach');
    expect(ids).toContain('guardian-of-gates');
    expect(ids).toContain('emerald-city-entry');
    expect(ids).toContain('emerald-city-explore');
    expect(ids).toContain('wizard-audience-setup');
    expect(ids).toContain('palace-waiting-protocol');
    expect(ids).toContain('wizard-first-audience');
    expect(ids).toContain('westward-mission-setup');
    expect(ids).toContain('westward-departure');
    expect(ids).toContain('winkie-country');
    expect(ids).toContain('witch-interference-early');
    expect(ids).toContain('westward-cliffhanger');
    expect(ids).toContain('west-capture');
    expect(ids).toContain('golden-cap-discovery');
    expect(ids).toContain('winkie-workdays');
    expect(ids).toContain('companion-rescue-chain');
    expect(ids).toContain('pack7-cliffhanger');
    expect(ids).toContain('western-reckoning-setup');
    expect(ids).toContain('water-defeat-moment');
    expect(ids).toContain('winkie-liberation-aftermath');
    expect(ids).toContain('golden-cap-continuity');
    expect(ids).toContain('return-to-emerald-setup');
    expect(ids).toContain('emerald-return-arrival');
    expect(ids).toContain('wizard-revelation-resolution');
    expect(ids).toContain('companion-gifts-ceremony');
    expect(ids).toContain('balloon-departure-attempt');
    expect(ids).toContain('balloon-mishap-aftermath');

    const glossary = glossaryRaw as { entries: Array<{ id: string }> };
    expect(glossary.entries.length).toBeGreaterThanOrEqual(60);

    const minigames = minigamesRaw as {
      spectacleFastening?: Record<string, unknown>;
      audiencePerception?: Record<string, unknown>;
      shadowOfTheWest?: Record<string, unknown>;
      westernHoldEscape?: Record<string, unknown>;
      dousingTheShadow?: Record<string, unknown>;
      balloonRigging?: Record<string, unknown>;
    };
    expect(typeof minigames.spectacleFastening).toBe('object');
    expect(typeof minigames.audiencePerception).toBe('object');
    expect(typeof minigames.shadowOfTheWest).toBe('object');
    expect(typeof minigames.westernHoldEscape).toBe('object');
    expect(typeof minigames.dousingTheShadow).toBe('object');
    expect(typeof minigames.balloonRigging).toBe('object');
  });
});
