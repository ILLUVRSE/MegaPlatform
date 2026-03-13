import { z } from "zod";

const PRESENCE_TTL_MS = 30_000;

export type PresenceCursor = {
  field: string;
  position: number;
  selectionEnd?: number;
};

export type PresenceClient = {
  clientId: string;
  userId: string;
  name?: string;
  cursor?: PresenceCursor;
  lastSeenAt: string;
};

export type StudioTextOperation =
  | {
      type: "insert";
      opId: string;
      clientId: string;
      field: string;
      baseVersion: number;
      index: number;
      text: string;
    }
  | {
      type: "delete";
      opId: string;
      clientId: string;
      field: string;
      baseVersion: number;
      index: number;
      length: number;
    };

export type StudioAssetPatch = {
  assetId: string;
  clientId: string;
  userId: string;
  baseVersion: number;
  changes: Record<string, unknown>;
};

export type MergeSuggestion = {
  assetId: string;
  conflictingKeys: string[];
  suggestedChanges: Record<string, { serverValue: unknown; incomingValue: unknown; recommended: "server" | "manual" }>;
};

export type AuditLogEntry = {
  id: string;
  docId: string;
  timestamp: string;
  type: "text_merge" | "asset_merge" | "conflict_detected" | "presence_update";
  summary: string;
  actorId: string;
  metadata?: Record<string, unknown>;
};

type StoredTextOperation = StudioTextOperation & {
  appliedAtVersion: number;
};

type TextFieldState = {
  value: string;
  version: number;
  history: StoredTextOperation[];
};

type AssetMetadataState = {
  version: number;
  values: Record<string, unknown>;
  keyVersions: Record<string, number>;
};

type StudioDocumentState = {
  docId: string;
  presence: Map<string, PresenceClient>;
  textFields: Map<string, TextFieldState>;
  assets: Map<string, AssetMetadataState>;
  auditLog: AuditLogEntry[];
};

const studioTextOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("insert"),
    opId: z.string().min(1),
    clientId: z.string().min(1),
    field: z.string().min(1),
    baseVersion: z.number().int().min(0),
    index: z.number().int().min(0),
    text: z.string()
  }),
  z.object({
    type: z.literal("delete"),
    opId: z.string().min(1),
    clientId: z.string().min(1),
    field: z.string().min(1),
    baseVersion: z.number().int().min(0),
    index: z.number().int().min(0),
    length: z.number().int().min(0)
  })
]);

const studioAssetPatchSchema = z.object({
  assetId: z.string().min(1),
  clientId: z.string().min(1),
  userId: z.string().min(1),
  baseVersion: z.number().int().min(0),
  changes: z.record(z.unknown())
});

const presenceSchema = z.object({
  clientId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1).optional(),
  cursor: z
    .object({
      field: z.string().min(1),
      position: z.number().int().min(0),
      selectionEnd: z.number().int().min(0).optional()
    })
    .optional()
});

function nowIso() {
  return new Date().toISOString();
}

function createAuditEntry(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
  return {
    id: `${entry.type}:${Math.random().toString(36).slice(2, 10)}`,
    timestamp: nowIso(),
    ...entry
  };
}

function getStore() {
  const globalStore = globalThis as typeof globalThis & {
    __studioCollabStore?: Map<string, StudioDocumentState>;
  };
  globalStore.__studioCollabStore ??= new Map<string, StudioDocumentState>();
  return globalStore.__studioCollabStore;
}

function getDocument(docId: string) {
  const store = getStore();
  let existing = store.get(docId);
  if (!existing) {
    existing = {
      docId,
      presence: new Map(),
      textFields: new Map(),
      assets: new Map(),
      auditLog: []
    };
    store.set(docId, existing);
  }
  return existing;
}

function getTextField(doc: StudioDocumentState, field: string) {
  let current = doc.textFields.get(field);
  if (!current) {
    current = { value: "", version: 0, history: [] };
    doc.textFields.set(field, current);
  }
  return current;
}

function getAssetMetadata(doc: StudioDocumentState, assetId: string) {
  let current = doc.assets.get(assetId);
  if (!current) {
    current = { version: 0, values: {}, keyVersions: {} };
    doc.assets.set(assetId, current);
  }
  return current;
}

function prunePresence(doc: StudioDocumentState) {
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  for (const [clientId, client] of doc.presence.entries()) {
    if (Date.parse(client.lastSeenAt) < cutoff) {
      doc.presence.delete(clientId);
    }
  }
}

function compareInsertPriority(left: Pick<StudioTextOperation, "clientId" | "opId">, right: Pick<StudioTextOperation, "clientId" | "opId">) {
  const leftKey = `${left.clientId}:${left.opId}`;
  const rightKey = `${right.clientId}:${right.opId}`;
  return leftKey.localeCompare(rightKey);
}

function transformIndexForInsert(index: number, otherIndex: number, delta: number, inclusive: boolean) {
  if (index > otherIndex || (inclusive && index === otherIndex)) {
    return index + delta;
  }
  return index;
}

function transformDeleteDelete(
  incoming: Extract<StudioTextOperation, { type: "delete" }>,
  applied: Extract<StudioTextOperation, { type: "delete" }>
) {
  const incomingStart = incoming.index;
  const incomingEnd = incoming.index + incoming.length;
  const appliedStart = applied.index;
  const appliedEnd = applied.index + applied.length;

  if (incomingEnd <= appliedStart) {
    return incoming;
  }

  if (incomingStart >= appliedEnd) {
    return { ...incoming, index: incoming.index - applied.length };
  }

  const overlap = Math.min(incomingEnd, appliedEnd) - Math.max(incomingStart, appliedStart);
  const adjustedIndex = incomingStart >= appliedStart ? appliedStart : incomingStart;
  const adjustedLength = Math.max(0, incoming.length - overlap);
  return {
    ...incoming,
    index: adjustedIndex,
    length: adjustedLength
  };
}

export function transformTextOperation(incoming: StudioTextOperation, applied: StudioTextOperation): StudioTextOperation {
  if (incoming.field !== applied.field) {
    return incoming;
  }

  if (incoming.type === "insert" && applied.type === "insert") {
    const sameIndex = incoming.index === applied.index;
    const shouldShift = incoming.index > applied.index || (sameIndex && compareInsertPriority(incoming, applied) > 0);
    return shouldShift ? { ...incoming, index: incoming.index + applied.text.length } : incoming;
  }

  if (incoming.type === "insert" && applied.type === "delete") {
    const deleteEnd = applied.index + applied.length;
    if (incoming.index <= applied.index) {
      return incoming;
    }
    if (incoming.index >= deleteEnd) {
      return { ...incoming, index: incoming.index - applied.length };
    }
    return { ...incoming, index: applied.index };
  }

  if (incoming.type === "delete" && applied.type === "insert") {
    const shiftedIndex = transformIndexForInsert(incoming.index, applied.index, applied.text.length, compareInsertPriority(incoming, applied) > 0);
    return { ...incoming, index: shiftedIndex };
  }

  return transformDeleteDelete(incoming, applied as Extract<StudioTextOperation, { type: "delete" }>);
}

function applyTextOperation(value: string, operation: StudioTextOperation) {
  if (operation.type === "insert") {
    return value.slice(0, operation.index) + operation.text + value.slice(operation.index);
  }

  const safeLength = Math.max(0, operation.length);
  return value.slice(0, operation.index) + value.slice(operation.index + safeLength);
}

function appendAuditLog(doc: StudioDocumentState, entry: Omit<AuditLogEntry, "id" | "timestamp">) {
  doc.auditLog.push(createAuditEntry(entry));
  doc.auditLog = doc.auditLog.slice(-100);
}

export function updateStudioPresence(docId: string, rawPresence: unknown) {
  const parsed = presenceSchema.parse(rawPresence);
  const doc = getDocument(docId);
  prunePresence(doc);
  const current: PresenceClient = {
    clientId: parsed.clientId,
    userId: parsed.userId,
    name: parsed.name,
    cursor: parsed.cursor,
    lastSeenAt: nowIso()
  };
  doc.presence.set(parsed.clientId, current);
  appendAuditLog(doc, {
    docId,
    type: "presence_update",
    actorId: parsed.userId,
    summary: `Presence updated for ${parsed.clientId}`,
    metadata: {
      clientId: parsed.clientId,
      cursor: parsed.cursor ?? null
    }
  });
  return snapshotStudioDocument(docId);
}

export function submitStudioTextOperation(docId: string, rawOperation: unknown) {
  const operation = studioTextOperationSchema.parse(rawOperation);
  const doc = getDocument(docId);
  const fieldState = getTextField(doc, operation.field);

  if (fieldState.history.some((entry) => entry.opId === operation.opId)) {
    return {
      accepted: true,
      conflict: false,
      operation,
      snapshot: snapshotStudioDocument(docId)
    };
  }

  const appliedSinceBase = fieldState.history.filter((entry) => entry.appliedAtVersion > operation.baseVersion);
  const transformed = appliedSinceBase.reduce<StudioTextOperation>(
    (current, entry) => transformTextOperation(current, entry),
    {
      ...operation,
      index: Math.min(operation.index, fieldState.value.length)
    }
  );

  const previousValue = fieldState.value;
  fieldState.value = applyTextOperation(fieldState.value, transformed);
  fieldState.version += 1;
  fieldState.history.push({
    ...transformed,
    appliedAtVersion: fieldState.version
  });

  appendAuditLog(doc, {
    docId,
    type: "text_merge",
    actorId: operation.clientId,
    summary: appliedSinceBase.length > 0 ? `Transformed text op on ${operation.field}` : `Applied text op on ${operation.field}`,
    metadata: {
      field: operation.field,
      previousValue,
      nextValue: fieldState.value,
      baseVersion: operation.baseVersion,
      transformedIndex: transformed.index
    }
  });

  return {
    accepted: true,
    conflict: appliedSinceBase.length > 0,
    operation: transformed,
    snapshot: snapshotStudioDocument(docId)
  };
}

export function mergeStudioAssetMetadata(docId: string, rawPatch: unknown) {
  const patch = studioAssetPatchSchema.parse(rawPatch);
  const doc = getDocument(docId);
  const assetState = getAssetMetadata(doc, patch.assetId);
  const conflicts: MergeSuggestion["conflictingKeys"] = [];
  const suggestionMap: MergeSuggestion["suggestedChanges"] = {};

  for (const [key, incomingValue] of Object.entries(patch.changes)) {
    const lastChangedVersion = assetState.keyVersions[key] ?? 0;
    if (lastChangedVersion > patch.baseVersion) {
      conflicts.push(key);
      suggestionMap[key] = {
        serverValue: assetState.values[key],
        incomingValue,
        recommended: "manual"
      };
      continue;
    }

    assetState.values[key] = incomingValue;
    assetState.version += 1;
    assetState.keyVersions[key] = assetState.version;
  }

  const mergeSuggestion =
    conflicts.length > 0
      ? {
          assetId: patch.assetId,
          conflictingKeys: conflicts,
          suggestedChanges: suggestionMap
        }
      : null;

  if (conflicts.length > 0) {
    appendAuditLog(doc, {
      docId,
      type: "conflict_detected",
      actorId: patch.userId,
      summary: `Asset metadata conflict on ${patch.assetId}`,
      metadata: {
        assetId: patch.assetId,
        conflicts
      }
    });
  }

  appendAuditLog(doc, {
    docId,
    type: "asset_merge",
    actorId: patch.userId,
    summary:
      conflicts.length > 0
        ? `Merged non-conflicting asset metadata for ${patch.assetId}`
        : `Merged asset metadata for ${patch.assetId}`,
    metadata: {
      assetId: patch.assetId,
      appliedKeys: Object.keys(patch.changes).filter((key) => !conflicts.includes(key)),
      conflicts
    }
  });

  return {
    accepted: true,
    conflict: conflicts.length > 0,
    suggestion: mergeSuggestion,
    snapshot: snapshotStudioDocument(docId)
  };
}

export function snapshotStudioDocument(docId: string) {
  const doc = getDocument(docId);
  prunePresence(doc);
  return {
    docId,
    presence: Array.from(doc.presence.values()).sort((left, right) => left.clientId.localeCompare(right.clientId)),
    textFields: Object.fromEntries(
      Array.from(doc.textFields.entries()).map(([field, state]) => [
        field,
        {
          value: state.value,
          version: state.version
        }
      ])
    ),
    assets: Object.fromEntries(
      Array.from(doc.assets.entries()).map(([assetId, state]) => [
        assetId,
        {
          version: state.version,
          values: state.values
        }
      ])
    ),
    auditLog: doc.auditLog
  };
}

export function resetStudioCollabState() {
  getStore().clear();
}

