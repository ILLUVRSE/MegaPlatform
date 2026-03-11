import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const roleBaselineSchema = z.object({
  role: z.string().min(1),
  permissions: z.array(z.string().min(1)).min(1)
});

export type RoleBaseline = z.infer<typeof roleBaselineSchema>;

const defaultBaseline: RoleBaseline[] = [
  { role: "admin", permissions: ["admin:*"] },
  {
    role: "moderator",
    permissions: ["feed:review", "feed:hide", "feed:shadowban"]
  },
  {
    role: "creator",
    permissions: ["studio:read", "studio:write", "studio:publish"]
  },
  {
    role: "user",
    permissions: ["watch:read", "party:join", "feed:interact"]
  }
];

type PrismaLike = {
  role: {
    findMany: (args?: { select?: { name?: boolean; permissions?: boolean } }) => Promise<Array<{ name: string; permissions: unknown }>>;
  };
};

export async function loadRbacBaseline() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "rbac-baseline.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(roleBaselineSchema).safeParse(parsed);
    if (!result.success) return defaultBaseline;
    return result.data;
  } catch {
    return defaultBaseline;
  }
}

export async function buildPermissionDriftReport(prisma: PrismaLike) {
  const [baseline, liveRoles] = await Promise.all([
    loadRbacBaseline(),
    prisma.role.findMany({ select: { name: true, permissions: true } })
  ]);

  const baselineByRole = new Map(baseline.map((row) => [row.role, new Set(row.permissions)]));
  const liveByRole = new Map(
    liveRoles.map((row) => [
      row.name,
      new Set(Array.isArray(row.permissions) ? row.permissions.filter((value): value is string => typeof value === "string") : [])
    ])
  );

  const drift: Array<{
    role: string;
    addedPermissions: string[];
    missingPermissions: string[];
    risk: "critical" | "warning";
    remediation: string;
  }> = [];
  const allRoles = new Set([...baselineByRole.keys(), ...liveByRole.keys()]);

  for (const role of allRoles) {
    const baselinePerms = baselineByRole.get(role) ?? new Set<string>();
    const livePerms = liveByRole.get(role) ?? new Set<string>();

    const added = [...livePerms].filter((perm) => !baselinePerms.has(perm));
    const missing = [...baselinePerms].filter((perm) => !livePerms.has(perm));
    if (added.length === 0 && missing.length === 0) continue;

    drift.push({
      role,
      addedPermissions: added,
      missingPermissions: missing,
      risk: added.includes("admin:*") || missing.includes("admin:*") ? "critical" : "warning",
      remediation: "Align role permissions with ops/governance/rbac-baseline.json and re-run drift checks."
    });
  }

  return {
    baselineCount: baseline.length,
    liveRoleCount: liveRoles.length,
    drift,
    generatedAt: new Date().toISOString()
  };
}
