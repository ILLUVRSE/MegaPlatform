# Studio Template Marketplace v1

Phase 62 adds reusable Studio templates for shorts/memes/games with versioning and reuse flow.

## Data model

- `StudioTemplate`
- `StudioTemplateVersion`
- `StudioTemplateKind` (`SHORT`, `MEME`, `GAME`)

## APIs

- `GET /api/studio/templates` (published catalog)
- `POST /api/studio/templates` (publish template with version 1)
- `POST /api/studio/templates/[id]/versions` (create next template version)
- `POST /api/studio/templates/[id]/reuse` (instantiate draft studio project from template)

## Ownership

- Templates are owned by `CreatorProfile`.
- Version updates enforce owner/admin authorization.
