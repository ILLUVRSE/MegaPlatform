# Asset Lineage and Provenance

Phase 63 adds provenance records for published studio assets.

## Data model

- `AssetLineage`
  - links `StudioAsset` + `StudioProject`
  - stores `rootAssetId`, `parentAssetId`
  - records `originType` and `rightsStatus`
  - stores `provenanceJson` metadata
- Enums:
  - `AssetOriginType`
  - `AssetRightsStatus`

## Publish integration

- Studio publish now upserts lineage records for each project asset.
- Baseline provenance payload includes:
  - project type/id
  - published post id
  - generation timestamp

This establishes deterministic lineage references for published assets and a foundation for rights/audit workflows.
