import { describe, expect, it } from 'vitest';
import chapters from '../../content/oz-chronicle/chapters.json';
import glossary from '../../content/oz-chronicle/glossary.json';
import minigames from '../../content/oz-chronicle/minigames.json';
import artPalette from '../../content/oz-chronicle/artPalette.json';
import sketches from '../../content/oz-chronicle/sketches.json';
import docRaw from '../../../docs/oz-chronicle.md?raw';

const PROHIBITED_PHRASES = [
  'ruby slippers',
  'over the rainbow',
  'somewhere over the rainbow',
  'mgm',
  'glinda',
  'wicked witch',
  'yellow brick road song',
  'there is no place like home',
  'green skin',
  'green-faced',
  'pointed hat',
  'broomstick silhouette',
  'flying broom',
  'black pointed hat',
  'pay no attention'
];

describe('oz chronicle baum-only compliance', () => {
  it('does not contain prohibited adaptation references', () => {
    const sources = [
      JSON.stringify(chapters),
      JSON.stringify(glossary),
      JSON.stringify(minigames),
      JSON.stringify(artPalette),
      JSON.stringify(sketches),
      docRaw
    ];

    for (const source of sources) {
      const lower = source.toLowerCase();
      for (const phrase of PROHIBITED_PHRASES) {
        expect(lower.includes(phrase)).toBe(false);
      }
    }
  });

  it('keeps pack #3 through #9 references within 1900-novel terms', () => {
    const packTerms = JSON.stringify(chapters).toLowerCase();
    expect(packTerms.includes('kalidah')).toBe(true);
    expect(packTerms.includes('poppy')).toBe(true);
    expect(packTerms.includes('field mice')).toBe(true);
    expect(packTerms.includes('guardian of the gates')).toBe(true);
    expect(packTerms.includes('green spectacles')).toBe(true);
    expect(packTerms.includes('witch of the west')).toBe(true);
    expect(packTerms.includes('winkie')).toBe(true);
    expect(packTerms.includes('golden cap')).toBe(true);
    expect(packTerms.includes('winged monkeys')).toBe(true);
    expect(packTerms.includes('water')).toBe(true);
    expect(packTerms.includes('return to the emerald city')).toBe(true);
    expect(packTerms.includes('humbug')).toBe(true);
    expect(packTerms.includes('balloon')).toBe(true);
    expect(packTerms.includes('silver slippers')).toBe(true);
    expect(packTerms.includes('wizard')).toBe(true);
    expect(packTerms.includes('ruby')).toBe(false);
  });
});
