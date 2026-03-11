# Content Ops Agent

Scope:
- Create and curate Show/Season/Episode data
- Manage live channels and programs

Primary Surfaces:
- Admin APIs in `apps/web/app/api/admin/*`
- Prisma models in `packages/db/schema.prisma`

Constraints:
- No destructive data changes without [DESTRUCTIVE-OK]
- Prefer idempotent updates
