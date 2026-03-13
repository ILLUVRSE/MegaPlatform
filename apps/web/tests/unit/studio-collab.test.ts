import { beforeEach, describe, expect, it } from "vitest";
import {
  mergeStudioAssetMetadata,
  resetStudioCollabState,
  snapshotStudioDocument,
  submitStudioTextOperation,
  transformTextOperation,
  updateStudioPresence
} from "@/lib/studio/collab";

describe("studio collab", () => {
  beforeEach(() => {
    resetStudioCollabState();
  });

  it("tracks presence with cursor positions", () => {
    const snapshot = updateStudioPresence("doc-1", {
      clientId: "client-a",
      userId: "user-a",
      name: "Alice",
      cursor: {
        field: "title",
        position: 4,
        selectionEnd: 7
      }
    });

    expect(snapshot.presence).toEqual([
      expect.objectContaining({
        clientId: "client-a",
        userId: "user-a",
        cursor: { field: "title", position: 4, selectionEnd: 7 }
      })
    ]);
    expect(snapshot.auditLog.at(-1)?.type).toBe("presence_update");
  });

  it("transforms concurrent inserts deterministically", () => {
    const transformed = transformTextOperation(
      {
        type: "insert",
        opId: "op-b",
        clientId: "client-b",
        field: "body",
        baseVersion: 0,
        index: 0,
        text: "World"
      },
      {
        type: "insert",
        opId: "op-a",
        clientId: "client-a",
        field: "body",
        baseVersion: 0,
        index: 0,
        text: "Hello "
      }
    );

    expect(transformed).toMatchObject({
      type: "insert",
      index: 6
    });
  });

  it("applies OT for conflicting text edits and records the merge", () => {
    const first = submitStudioTextOperation("doc-1", {
      type: "insert",
      opId: "op-1",
      clientId: "client-a",
      field: "body",
      baseVersion: 0,
      index: 0,
      text: "Hello"
    });
    const second = submitStudioTextOperation("doc-1", {
      type: "insert",
      opId: "op-2",
      clientId: "client-b",
      field: "body",
      baseVersion: 0,
      index: 0,
      text: "World "
    });

    expect(first.conflict).toBe(false);
    expect(second.conflict).toBe(true);

    const snapshot = snapshotStudioDocument("doc-1");
    expect(snapshot.textFields.body).toEqual({
      value: "HelloWorld ",
      version: 2
    });
    expect(snapshot.auditLog.some((entry) => entry.type === "text_merge")).toBe(true);
  });

  it("optimistically merges non-overlapping asset metadata", () => {
    mergeStudioAssetMetadata("doc-1", {
      assetId: "asset-1",
      clientId: "client-a",
      userId: "user-a",
      baseVersion: 0,
      changes: { alt: "Poster frame" }
    });

    const result = mergeStudioAssetMetadata("doc-1", {
      assetId: "asset-1",
      clientId: "client-b",
      userId: "user-b",
      baseVersion: 1,
      changes: { frameRate: 24 }
    });

    expect(result.conflict).toBe(false);
    expect(result.snapshot.assets["asset-1"]).toEqual({
      version: 2,
      values: {
        alt: "Poster frame",
        frameRate: 24
      }
    });
  });

  it("detects asset metadata conflicts and issues merge suggestions", () => {
    mergeStudioAssetMetadata("doc-1", {
      assetId: "asset-1",
      clientId: "client-a",
      userId: "user-a",
      baseVersion: 0,
      changes: { caption: "Original caption" }
    });

    const result = mergeStudioAssetMetadata("doc-1", {
      assetId: "asset-1",
      clientId: "client-b",
      userId: "user-b",
      baseVersion: 0,
      changes: { caption: "Rewritten caption" }
    });

    expect(result.conflict).toBe(true);
    expect(result.suggestion).toEqual({
      assetId: "asset-1",
      conflictingKeys: ["caption"],
      suggestedChanges: {
        caption: {
          serverValue: "Original caption",
          incomingValue: "Rewritten caption",
          recommended: "manual"
        }
      }
    });
    expect(result.snapshot.auditLog.some((entry) => entry.type === "conflict_detected")).toBe(true);
  });
});

