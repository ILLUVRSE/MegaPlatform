const labels: Record<string, string> = {
  netflix: 'Netflix',
  hulu: 'Hulu',
  'prime-video': 'Prime Video',
  'disney-plus': 'Disney+',
  max: 'Max',
  'apple-tv-plus': 'Apple TV+'
};

export function platformLabel(value: string): string {
  return labels[value.toLowerCase()] || value;
}
