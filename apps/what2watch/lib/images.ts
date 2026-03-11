export function tmdbImage(path?: string | null, size: 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string {
  if (!path) return 'https://via.placeholder.com/780x439?text=What2Watch';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
