import type { ClientToServerMessage, ServerToClientMessage } from './protocol.js';
import { isClientToServerMessage, isServerToClientMessage } from './protocol.js';

export const serializeMessage = (msg: ClientToServerMessage | ServerToClientMessage): string => JSON.stringify(msg);

export const parseClientMessage = (raw: string): ClientToServerMessage | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isClientToServerMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const parseServerMessage = (raw: string): ServerToClientMessage | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isServerToClientMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
