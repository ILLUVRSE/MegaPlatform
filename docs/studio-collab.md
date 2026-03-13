# Studio collaborative editing

Studio realtime editing now runs through `apps/web/app/api/studio/realtime/route.ts` backed by `apps/web/lib/studio/collab.ts`.

## Presence

- Presence is tracked per document by `clientId` and `userId`.
- Each heartbeat may include cursor state for a text field: `field`, `position`, and optional `selectionEnd`.
- Presence entries expire after 30 seconds without refresh.

## Conflict resolution

- Text fields use a minimal operational transform pipeline over insert/delete operations.
- The server arbiter transforms stale client operations against newer applied operations before committing them.
- Asset metadata uses optimistic key-level merge: non-overlapping keys are applied immediately, while overlapping keys produce merge suggestions instead of silent overwrite.

## Audit log

- Every automated text merge, asset merge, conflict detection, and presence update is appended to the document audit log.
- The realtime snapshot API returns the current document state plus the bounded audit history, which can feed future merge-review UI.

## API

- `GET /api/studio/realtime?docId=<id>` returns the current collaboration snapshot.
- `POST /api/studio/realtime` accepts one of:
  - `event: "presence"`
  - `event: "text_operation"`
  - `event: "asset_metadata"`
