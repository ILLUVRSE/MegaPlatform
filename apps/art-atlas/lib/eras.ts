import { slugifyTerm } from '@/lib/slug';

export interface EraProfile {
  name: string;
  slug: string;
  overview: string;
}

const eraSeed = [
  {
    name: 'Renaissance',
    overview: 'A period of renewed humanism, technical innovation, and classical influence spanning visual art and early modern music.'
  },
  {
    name: 'Baroque',
    overview: 'Known for dramatic contrast, ornament, and expressive theatricality across painting, sculpture, and composition.'
  },
  {
    name: 'Classical',
    overview: 'Emphasized clarity, balance, and formal structure, especially in late 18th-century European music and aesthetics.'
  },
  {
    name: 'Romantic',
    overview: 'Privileged emotion, nationalism, and individual expression across 19th-century art and music traditions.'
  },
  {
    name: 'Late Romantic',
    overview: 'Expanded orchestral scale and harmonic richness while preserving expressive Romantic traditions.'
  },
  {
    name: 'Modern',
    overview: 'A broad experimental era that challenged traditional forms through abstraction, new materials, and novel musical language.'
  },
  {
    name: 'Contemporary',
    overview: 'Cross-disciplinary, global practices from the late 20th century onward, including conceptual and postmodern approaches.'
  }
] as const;

export const eras: EraProfile[] = eraSeed.map((era) => ({
  ...era,
  slug: slugifyTerm(era.name)
}));

export function getEraBySlug(slug: string): EraProfile | undefined {
  return eras.find((era) => era.slug === slug);
}
