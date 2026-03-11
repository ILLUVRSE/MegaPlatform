import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { formatDialogueTemplate, resolveDialogueContext, selectCrewDialogue } from './crewDialogue';

describe('starlight crew dialogue', () => {
  it('selects deterministic dialogue from seed and context', () => {
    const profile = createInitialProfile(123);
    const context = resolveDialogueContext(profile, 500, 'n-0-0', 'STORY', 'story', 'diplomacy');
    const a = selectCrewDialogue(context);
    const b = selectCrewDialogue(context);
    expect(a).toBe(b);
  });

  it('supports placeholder substitution', () => {
    const line = formatDialogueTemplate('{CAPTAIN} speaks to {FACTION} at {NODE}.', {
      CAPTAIN: 'Rin Vale',
      FACTION: 'astral',
      NODE: 'n-1-0'
    });
    expect(line).toBe('Rin Vale speaks to astral at n-1-0.');
  });
});
