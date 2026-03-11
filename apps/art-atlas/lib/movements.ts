import { slugifyTerm } from '@/lib/slug';

export interface MovementProfile {
  name: string;
  slug: string;
  overview: string;
}

const movementSeed = [
  {
    name: 'High Renaissance',
    overview: 'A mature phase of Renaissance art marked by balance, harmony, and technical mastery.'
  },
  {
    name: 'Baroque',
    overview: 'Dramatic, ornate, and emotionally charged approaches in visual and musical expression.'
  },
  {
    name: 'Classical',
    overview: 'Formal balance and clear architecture in composition and aesthetics.'
  },
  {
    name: 'Romanticism',
    overview: 'Expressive and subjective styles emphasizing imagination, atmosphere, and emotional intensity.'
  },
  {
    name: 'Impressionism',
    overview: 'Attention to light, color, and fleeting perception in both painting and later musical language.'
  },
  {
    name: 'Post-Impressionism',
    overview: 'Diverse responses to Impressionism emphasizing structure, symbolism, and personal style.'
  },
  {
    name: 'Modernism',
    overview: 'Radical experimentation with abstraction, form, harmony, and materials.'
  },
  {
    name: 'Surrealism',
    overview: 'Dreamlike imagery, unexpected juxtapositions, and the exploration of unconscious thought.'
  },
  {
    name: 'Abstract Expressionism',
    overview: 'Gestural and color-field abstraction centered on process, scale, and emotional immediacy.'
  },
  {
    name: 'Pop Art',
    overview: 'Use of mass-media imagery, consumer culture references, and bold graphic language.'
  },
  {
    name: 'Minimalism',
    overview: 'Reduced forms and repeated structures in sculpture, painting, and late-20th-century music.'
  },
  {
    name: 'Contemporary',
    overview: 'Plural, global practices that blend media, concepts, and interdisciplinary methods.'
  },
  {
    name: 'National Romanticism',
    overview: 'A movement emphasizing national identity, folklore, and regional themes in the arts.'
  },
  {
    name: 'Second Viennese School',
    overview: 'An early 20th-century compositional school associated with atonality and serial techniques.'
  },
  {
    name: 'Film Score Tradition',
    overview: 'Symphonic and cinematic composition traditions developed for modern film.'
  },
  {
    name: 'Madrigal Tradition',
    overview: 'Late Renaissance vocal polyphony with expressive text setting and chromatic experimentation.'
  }
] as const;

export const movements: MovementProfile[] = movementSeed.map((movement) => ({
  ...movement,
  slug: slugifyTerm(movement.name)
}));

export function getMovementBySlug(slug: string): MovementProfile | undefined {
  return movements.find((movement) => movement.slug === slug);
}
