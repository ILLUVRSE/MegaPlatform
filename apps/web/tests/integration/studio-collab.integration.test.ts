import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/studio/realtime/route";
import { resetStudioCollabState } from "@/lib/studio/collab";

describe("studio realtime route", () => {
  beforeEach(() => {
    resetStudioCollabState();
  });

  it("simulates three clients editing the same document", async () => {
    const docId = "doc-three-way";

    const clientPayloads = [
      {
        clientId: "client-a",
        userId: "user-a",
        name: "Alice",
        cursor: { field: "body", position: 0 }
      },
      {
        clientId: "client-b",
        userId: "user-b",
        name: "Ben",
        cursor: { field: "body", position: 0 }
      },
      {
        clientId: "client-c",
        userId: "user-c",
        name: "Chen",
        cursor: { field: "body", position: 0 }
      }
    ];

    for (const payload of clientPayloads) {
      const response = await POST(
        new Request("http://localhost/api/studio/realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "presence",
            docId,
            payload
          })
        })
      );
      expect(response.status).toBe(200);
    }

    const opA = await POST(
      new Request("http://localhost/api/studio/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "text_operation",
          docId,
          payload: {
            type: "insert",
            opId: "op-a",
            clientId: "client-a",
            field: "body",
            baseVersion: 0,
            index: 0,
            text: "Hello"
          }
        })
      })
    );
    expect(opA.status).toBe(200);

    const opB = await POST(
      new Request("http://localhost/api/studio/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "text_operation",
          docId,
          payload: {
            type: "insert",
            opId: "op-b",
            clientId: "client-b",
            field: "body",
            baseVersion: 0,
            index: 5,
            text: " world"
          }
        })
      })
    );
    expect(opB.status).toBe(200);

    const opC = await POST(
      new Request("http://localhost/api/studio/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "text_operation",
          docId,
          payload: {
            type: "insert",
            opId: "op-c",
            clientId: "client-c",
            field: "body",
            baseVersion: 1,
            index: 11,
            text: "!"
          }
        })
      })
    );
    expect(opC.status).toBe(200);

    const metaA = await POST(
      new Request("http://localhost/api/studio/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "asset_metadata",
          docId,
          payload: {
            assetId: "asset-1",
            clientId: "client-a",
            userId: "user-a",
            baseVersion: 0,
            changes: {
              alt: "Studio hero render"
            }
          }
        })
      })
    );
    expect(metaA.status).toBe(200);

    const metaB = await POST(
      new Request("http://localhost/api/studio/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "asset_metadata",
          docId,
          payload: {
            assetId: "asset-1",
            clientId: "client-b",
            userId: "user-b",
            baseVersion: 0,
            changes: {
              alt: "Different alt text"
            }
          }
        })
      })
    );
    expect(metaB.status).toBe(200);
    const metaBPayload = (await metaB.json()) as {
      conflict: boolean;
      suggestion: { conflictingKeys: string[] } | null;
    };
    expect(metaBPayload.conflict).toBe(true);
    expect(metaBPayload.suggestion?.conflictingKeys).toEqual(["alt"]);

    const snapshotResponse = await GET(new Request(`http://localhost/api/studio/realtime?docId=${docId}`));
    expect(snapshotResponse.status).toBe(200);
    const snapshotPayload = (await snapshotResponse.json()) as {
      snapshot: {
        presence: Array<{ clientId: string }>;
        textFields: { body: { value: string; version: number } };
        assets: { "asset-1": { values: Record<string, unknown> } };
        auditLog: Array<{ type: string }>;
      };
    };

    expect(snapshotPayload.snapshot.presence).toHaveLength(3);
    expect(snapshotPayload.snapshot.textFields.body).toEqual({
      value: "Hello world!",
      version: 3
    });
    expect(snapshotPayload.snapshot.assets["asset-1"].values.alt).toBe("Studio hero render");
    expect(snapshotPayload.snapshot.auditLog.filter((entry) => entry.type === "conflict_detected")).toHaveLength(1);
  });
});

