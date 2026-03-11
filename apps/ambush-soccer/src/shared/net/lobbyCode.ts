const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateLobbyCode = (rng: () => number = Math.random, length = 6): string => {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(rng() * ALPHABET.length)] ?? 'A';
  }
  return out;
};
