import { validateProtocolMessage, type MpProtocolMessage } from './protocol';

const MAX_PAYLOAD_BYTES = 64 * 1024;

export function serializeMessage(message: MpProtocolMessage): string {
  const json = JSON.stringify(message);
  if (json.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`payload too large: ${json.length} bytes`);
  }
  return json;
}

export function deserializeMessage(raw: string): MpProtocolMessage {
  if (raw.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`payload too large: ${raw.length} bytes`);
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!validateProtocolMessage(parsed)) {
    throw new Error('invalid protocol message');
  }

  return parsed;
}

export function sanitizePayload<T>(value: T): T {
  const json = JSON.stringify(value);
  if (json.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`payload too large: ${json.length} bytes`);
  }
  return JSON.parse(json) as T;
}

export const SERIALIZER_LIMIT_BYTES = MAX_PAYLOAD_BYTES;
