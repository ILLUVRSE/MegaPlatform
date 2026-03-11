import { slugifyTerm } from '@/lib/slug';

export type ArtistDiscipline = 'Painter' | 'Sculptor' | 'Composer';

export interface ArtistProfile {
  slug: string;
  name: string;
  discipline: ArtistDiscipline;
  period: string;
  era: string;
  movement: string;
  region: string;
  nationality?: string;
  mediums: string[];
  influencedBy?: string[];
  influenced?: string[];
  mediaQuery: string;
}

interface ArtistSeed {
  name: string;
  discipline: ArtistDiscipline;
  period: string;
  region: string;
}

const artistSeed: ArtistSeed[] = [
  { name: 'Leonardo da Vinci', discipline: 'Painter', period: 'Renaissance', region: 'Italy' },
  { name: 'Michelangelo', discipline: 'Sculptor', period: 'Renaissance', region: 'Italy' },
  { name: 'Raphael', discipline: 'Painter', period: 'Renaissance', region: 'Italy' },
  { name: 'Donatello', discipline: 'Sculptor', period: 'Renaissance', region: 'Italy' },
  { name: 'Caravaggio', discipline: 'Painter', period: 'Baroque', region: 'Italy' },
  { name: 'Rembrandt', discipline: 'Painter', period: 'Baroque', region: 'Netherlands' },
  { name: 'Johannes Vermeer', discipline: 'Painter', period: 'Baroque', region: 'Netherlands' },
  { name: 'Francisco Goya', discipline: 'Painter', period: 'Romantic', region: 'Spain' },
  { name: 'J.M.W. Turner', discipline: 'Painter', period: 'Romantic', region: 'United Kingdom' },
  { name: 'Caspar David Friedrich', discipline: 'Painter', period: 'Romantic', region: 'Germany' },
  { name: 'Édouard Manet', discipline: 'Painter', period: 'Impressionist', region: 'France' },
  { name: 'Claude Monet', discipline: 'Painter', period: 'Impressionist', region: 'France' },
  { name: 'Edgar Degas', discipline: 'Painter', period: 'Impressionist', region: 'France' },
  { name: 'Pierre-Auguste Renoir', discipline: 'Painter', period: 'Impressionist', region: 'France' },
  { name: 'Paul Cézanne', discipline: 'Painter', period: 'Post-Impressionist', region: 'France' },
  { name: 'Vincent van Gogh', discipline: 'Painter', period: 'Post-Impressionist', region: 'Netherlands' },
  { name: 'Paul Gauguin', discipline: 'Painter', period: 'Post-Impressionist', region: 'France' },
  { name: 'Georges Seurat', discipline: 'Painter', period: 'Post-Impressionist', region: 'France' },
  { name: 'Henri Matisse', discipline: 'Painter', period: 'Modern', region: 'France' },
  { name: 'Pablo Picasso', discipline: 'Painter', period: 'Modern', region: 'Spain' },
  { name: 'Georges Braque', discipline: 'Painter', period: 'Modern', region: 'France' },
  { name: 'Wassily Kandinsky', discipline: 'Painter', period: 'Modern', region: 'Russia' },
  { name: 'Piet Mondrian', discipline: 'Painter', period: 'Modern', region: 'Netherlands' },
  { name: 'Gustav Klimt', discipline: 'Painter', period: 'Modern', region: 'Austria' },
  { name: 'Egon Schiele', discipline: 'Painter', period: 'Modern', region: 'Austria' },
  { name: 'Salvador Dalí', discipline: 'Painter', period: 'Modern', region: 'Spain' },
  { name: 'René Magritte', discipline: 'Painter', period: 'Modern', region: 'Belgium' },
  { name: 'Frida Kahlo', discipline: 'Painter', period: 'Modern', region: 'Mexico' },
  { name: 'Jackson Pollock', discipline: 'Painter', period: 'Modern', region: 'United States' },
  { name: 'Mark Rothko', discipline: 'Painter', period: 'Modern', region: 'United States' },
  { name: 'Willem de Kooning', discipline: 'Painter', period: 'Modern', region: 'United States' },
  { name: 'Francis Bacon', discipline: 'Painter', period: 'Modern', region: 'United Kingdom' },
  { name: 'Andy Warhol', discipline: 'Painter', period: 'Contemporary', region: 'United States' },
  { name: 'Roy Lichtenstein', discipline: 'Painter', period: 'Contemporary', region: 'United States' },
  { name: 'Jean-Michel Basquiat', discipline: 'Painter', period: 'Contemporary', region: 'United States' },
  { name: 'Keith Haring', discipline: 'Painter', period: 'Contemporary', region: 'United States' },
  { name: 'Banksy', discipline: 'Painter', period: 'Contemporary', region: 'United Kingdom' },
  { name: 'George Caleb Bingham', discipline: 'Painter', period: 'Romantic', region: 'United States' },
  { name: 'Damien Hirst', discipline: 'Sculptor', period: 'Contemporary', region: 'United Kingdom' },
  { name: 'Jeff Koons', discipline: 'Sculptor', period: 'Contemporary', region: 'United States' },
  { name: 'Yayoi Kusama', discipline: 'Sculptor', period: 'Contemporary', region: 'Japan' },
  { name: 'Ai Weiwei', discipline: 'Sculptor', period: 'Contemporary', region: 'China' },
  { name: 'Anish Kapoor', discipline: 'Sculptor', period: 'Contemporary', region: 'United Kingdom' },
  { name: 'Auguste Rodin', discipline: 'Sculptor', period: 'Modern', region: 'France' },
  { name: 'Constantin Brâncuși', discipline: 'Sculptor', period: 'Modern', region: 'Romania' },
  { name: 'Henry Moore', discipline: 'Sculptor', period: 'Modern', region: 'United Kingdom' },
  { name: 'Alberto Giacometti', discipline: 'Sculptor', period: 'Modern', region: 'Switzerland' },
  { name: 'Louise Bourgeois', discipline: 'Sculptor', period: 'Modern', region: 'France' },
  { name: 'David Smith (sculptor, metalwork)', discipline: 'Sculptor', period: 'Modern', region: 'United States' },
  { name: 'Alexander Calder', discipline: 'Sculptor', period: 'Modern', region: 'United States' },
  { name: 'Isamu Noguchi', discipline: 'Sculptor', period: 'Modern', region: 'United States' },
  { name: 'Johann Sebastian Bach', discipline: 'Composer', period: 'Baroque', region: 'Germany' },
  { name: 'George Frideric Handel', discipline: 'Composer', period: 'Baroque', region: 'Germany' },
  { name: 'Antonio Vivaldi', discipline: 'Composer', period: 'Baroque', region: 'Italy' },
  { name: 'Claudio Monteverdi', discipline: 'Composer', period: 'Baroque', region: 'Italy' },
  { name: 'Henry Purcell', discipline: 'Composer', period: 'Baroque', region: 'United Kingdom' },
  { name: 'Arcangelo Corelli', discipline: 'Composer', period: 'Baroque', region: 'Italy' },
  { name: 'Domenico Scarlatti', discipline: 'Composer', period: 'Baroque', region: 'Italy' },
  { name: 'Joseph Haydn', discipline: 'Composer', period: 'Classical', region: 'Austria' },
  { name: 'Wolfgang Amadeus Mozart', discipline: 'Composer', period: 'Classical', region: 'Austria' },
  { name: 'Ludwig van Beethoven', discipline: 'Composer', period: 'Classical-Romantic', region: 'Germany' },
  { name: 'Franz Schubert', discipline: 'Composer', period: 'Romantic', region: 'Austria' },
  { name: 'Felix Mendelssohn', discipline: 'Composer', period: 'Romantic', region: 'Germany' },
  { name: 'Frédéric Chopin', discipline: 'Composer', period: 'Romantic', region: 'Poland' },
  { name: 'Robert Schumann', discipline: 'Composer', period: 'Romantic', region: 'Germany' },
  { name: 'Franz Liszt', discipline: 'Composer', period: 'Romantic', region: 'Hungary' },
  { name: 'Johannes Brahms', discipline: 'Composer', period: 'Romantic', region: 'Germany' },
  { name: 'Richard Wagner', discipline: 'Composer', period: 'Romantic', region: 'Germany' },
  { name: 'Giuseppe Verdi', discipline: 'Composer', period: 'Romantic', region: 'Italy' },
  { name: 'Pyotr Ilyich Tchaikovsky', discipline: 'Composer', period: 'Romantic', region: 'Russia' },
  { name: 'Antonín Dvořák', discipline: 'Composer', period: 'Romantic', region: 'Czechia' },
  { name: 'Bedřich Smetana', discipline: 'Composer', period: 'Romantic', region: 'Czechia' },
  { name: 'Nikolai Rimsky-Korsakov', discipline: 'Composer', period: 'Romantic', region: 'Russia' },
  { name: 'Modest Mussorgsky', discipline: 'Composer', period: 'Romantic', region: 'Russia' },
  { name: 'Sergei Rachmaninoff', discipline: 'Composer', period: 'Romantic', region: 'Russia' },
  { name: 'Gustav Mahler', discipline: 'Composer', period: 'Late Romantic', region: 'Austria' },
  { name: 'Anton Bruckner', discipline: 'Composer', period: 'Late Romantic', region: 'Austria' },
  { name: 'Claude Debussy', discipline: 'Composer', period: 'Modern', region: 'France' },
  { name: 'Maurice Ravel', discipline: 'Composer', period: 'Modern', region: 'France' },
  { name: 'Camille Saint-Saëns', discipline: 'Composer', period: 'Romantic', region: 'France' },
  { name: 'Gabriel Fauré', discipline: 'Composer', period: 'Late Romantic', region: 'France' },
  { name: 'Jean Sibelius', discipline: 'Composer', period: 'Late Romantic', region: 'Finland' },
  { name: 'Edvard Grieg', discipline: 'Composer', period: 'Romantic', region: 'Norway' },
  { name: 'Dmitri Shostakovich', discipline: 'Composer', period: 'Modern', region: 'Russia' },
  { name: 'Sergei Prokofiev', discipline: 'Composer', period: 'Modern', region: 'Russia' },
  { name: 'Igor Stravinsky', discipline: 'Composer', period: 'Modern', region: 'Russia' },
  { name: 'Béla Bartók', discipline: 'Composer', period: 'Modern', region: 'Hungary' },
  { name: 'Arnold Schoenberg', discipline: 'Composer', period: 'Modern', region: 'Austria' },
  { name: 'Alban Berg', discipline: 'Composer', period: 'Modern', region: 'Austria' },
  { name: 'Anton Webern', discipline: 'Composer', period: 'Modern', region: 'Austria' },
  { name: 'Benjamin Britten', discipline: 'Composer', period: 'Modern', region: 'United Kingdom' },
  { name: 'Aaron Copland', discipline: 'Composer', period: 'Modern', region: 'United States' },
  { name: 'George Gershwin', discipline: 'Composer', period: 'Modern', region: 'United States' },
  { name: 'Leonard Bernstein', discipline: 'Composer', period: 'Modern', region: 'United States' },
  { name: 'Philip Glass', discipline: 'Composer', period: 'Contemporary', region: 'United States' },
  { name: 'Steve Reich', discipline: 'Composer', period: 'Contemporary', region: 'United States' },
  { name: 'Arvo Pärt', discipline: 'Composer', period: 'Contemporary', region: 'Estonia' },
  { name: 'John Williams', discipline: 'Composer', period: 'Contemporary', region: 'United States' },
  { name: 'Richard Strauss', discipline: 'Composer', period: 'Late Romantic', region: 'Germany' },
  { name: 'Carlo Gesualdo', discipline: 'Composer', period: 'Renaissance', region: 'Italy' },
  { name: 'Giacomo Puccini', discipline: 'Composer', period: 'Late Romantic', region: 'Italy' }
];

const periodToEra: Record<string, string> = {
  Renaissance: 'Renaissance',
  Baroque: 'Baroque',
  Classical: 'Classical',
  'Classical-Romantic': 'Romantic',
  Romantic: 'Romantic',
  'Late Romantic': 'Late Romantic',
  Impressionist: 'Romantic',
  'Post-Impressionist': 'Modern',
  Modern: 'Modern',
  Contemporary: 'Contemporary'
};

const periodToMovement: Record<string, string> = {
  Renaissance: 'High Renaissance',
  Baroque: 'Baroque',
  Classical: 'Classical',
  'Classical-Romantic': 'Romanticism',
  Romantic: 'Romanticism',
  'Late Romantic': 'Romanticism',
  Impressionist: 'Impressionism',
  'Post-Impressionist': 'Post-Impressionism',
  Modern: 'Modernism',
  Contemporary: 'Contemporary'
};

const movementOverrides: Record<string, string> = {
  'salvador-dali': 'Surrealism',
  'rene-magritte': 'Surrealism',
  'jackson-pollock': 'Abstract Expressionism',
  'mark-rothko': 'Abstract Expressionism',
  'willem-de-kooning': 'Abstract Expressionism',
  'andy-warhol': 'Pop Art',
  'roy-lichtenstein': 'Pop Art',
  'jean-michel-basquiat': 'Contemporary',
  'keith-haring': 'Contemporary',
  'banksy': 'Contemporary',
  'philip-glass': 'Minimalism',
  'steve-reich': 'Minimalism',
  'john-williams': 'Film Score Tradition',
  'arnold-schoenberg': 'Second Viennese School',
  'alban-berg': 'Second Viennese School',
  'anton-webern': 'Second Viennese School',
  'jean-sibelius': 'National Romanticism',
  'edvard-grieg': 'National Romanticism',
  'carlo-gesualdo': 'Madrigal Tradition'
};

const influences: Record<string, { influencedBy?: string[]; influenced?: string[] }> = {
  'michelangelo': { influencedBy: ['donatello'], influenced: ['auguste-rodin'] },
  'raphael': { influencedBy: ['leonardo-da-vinci', 'michelangelo'] },
  'caravaggio': { influencedBy: ['michelangelo'], influenced: ['rembrandt'] },
  'claude-monet': { influencedBy: ['edouard-manet'], influenced: ['paul-cezanne'] },
  'paul-cezanne': { influencedBy: ['claude-monet'], influenced: ['pablo-picasso', 'georges-braque'] },
  'pablo-picasso': { influencedBy: ['paul-cezanne'], influenced: ['willem-de-kooning'] },
  'georges-braque': { influencedBy: ['paul-cezanne'], influenced: ['pablo-picasso'] },
  'wassily-kandinsky': { influencedBy: ['claude-monet'], influenced: ['piet-mondrian'] },
  'salvador-dali': { influencedBy: ['rene-magritte'] },
  'jackson-pollock': { influencedBy: ['pablo-picasso'], influenced: ['mark-rothko'] },
  'mark-rothko': { influencedBy: ['jackson-pollock'] },
  'andy-warhol': { influencedBy: ['pablo-picasso'], influenced: ['jean-michel-basquiat'] },
  'jean-michel-basquiat': { influencedBy: ['andy-warhol'] },
  'johann-sebastian-bach': { influencedBy: ['claudio-monteverdi'], influenced: ['wolfgang-amadeus-mozart', 'ludwig-van-beethoven'] },
  'wolfgang-amadeus-mozart': { influencedBy: ['johann-sebastian-bach', 'joseph-haydn'], influenced: ['ludwig-van-beethoven'] },
  'ludwig-van-beethoven': { influencedBy: ['wolfgang-amadeus-mozart'], influenced: ['johannes-brahms', 'richard-wagner'] },
  'richard-wagner': { influencedBy: ['ludwig-van-beethoven'], influenced: ['gustav-mahler', 'richard-strauss'] },
  'claude-debussy': { influencedBy: ['modest-mussorgsky'], influenced: ['maurice-ravel'] },
  'maurice-ravel': { influencedBy: ['claude-debussy'] },
  'arnold-schoenberg': { influencedBy: ['richard-strauss'], influenced: ['alban-berg', 'anton-webern'] },
  'alban-berg': { influencedBy: ['arnold-schoenberg'] },
  'anton-webern': { influencedBy: ['arnold-schoenberg'] },
  'philip-glass': { influencedBy: ['arnold-schoenberg'], influenced: ['steve-reich'] },
  'steve-reich': { influencedBy: ['philip-glass'] },
  'john-williams': { influencedBy: ['richard-strauss'] }
};

function mediumsForDiscipline(discipline: ArtistDiscipline): string[] {
  if (discipline === 'Painter') {
    return ['painting', 'drawing'];
  }
  if (discipline === 'Sculptor') {
    return ['sculpture', 'installation'];
  }
  return ['composition', 'orchestration'];
}

function cleanMediaQuery(value: string): string {
  const noParenthetical = value.replace(/\(.*?\)/g, '');
  return noParenthetical.replace(/\s+/g, ' ').trim();
}

export const artistDirectory: ArtistProfile[] = artistSeed.map((artist) => {
  const slug = slugifyTerm(artist.name);
  const baseMovement = periodToMovement[artist.period] ?? 'Contemporary';
  return {
    ...artist,
    slug,
    era: periodToEra[artist.period] ?? 'Contemporary',
    movement: movementOverrides[slug] ?? baseMovement,
    nationality: artist.region,
    mediums: mediumsForDiscipline(artist.discipline),
    influencedBy: influences[slug]?.influencedBy,
    influenced: influences[slug]?.influenced,
    mediaQuery: cleanMediaQuery(artist.name)
  };
});

export function getArtistBySlug(slug: string): ArtistProfile | undefined {
  return artistDirectory.find((artist) => artist.slug === slug);
}

export function getArtistsByEraSlug(eraSlug: string): ArtistProfile[] {
  return artistDirectory.filter((artist) => slugifyTerm(artist.era) === eraSlug);
}

export function getArtistsByMovementSlug(movementSlug: string): ArtistProfile[] {
  return artistDirectory.filter((artist) => slugifyTerm(artist.movement) === movementSlug);
}
