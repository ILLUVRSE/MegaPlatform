"use client";

type PartyIdentity = {
  playerId: string;
  playerName: string;
  isHost: boolean;
};

const keyFor = (code: string) => `illuvrse:minigame-party:${code}`;

export const savePartyIdentity = (code: string, identity: PartyIdentity) => {
  window.localStorage.setItem(keyFor(code), JSON.stringify(identity));
};

export const loadPartyIdentity = (code: string): PartyIdentity | null => {
  const raw = window.localStorage.getItem(keyFor(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PartyIdentity;
  } catch {
    return null;
  }
};

export const clearPartyIdentity = (code: string) => {
  window.localStorage.removeItem(keyFor(code));
};

export type { PartyIdentity };
