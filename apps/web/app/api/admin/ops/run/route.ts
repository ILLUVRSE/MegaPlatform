export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { findOpsRoot, OPS_ROLES } from "@/lib/ops";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { z } from "zod";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";
import { writeAudit } from "@/lib/audit";

const execFileAsync = promisify(execFile);

const payloadSchema = z.object({
  role: z.enum(OPS_ROLES),
  id: z.string().regex(/^[a-zA-Z0-9_.:-]+$/).max(200).optional()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `admin:ops-run:${resolveClientKey(req, auth.session.user.id)}`,
    windowMs: 60_000,
    limit: 12
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const opsRoot = await findOpsRoot();
  if (!opsRoot) {
    return NextResponse.json({ error: "ops root not found" }, { status: 404 });
  }

  const runner = path.join(opsRoot, "runner.py");
  const args = [runner, "--role", body.role, "--claim"];
  if (body.id) {
    args.push("--id", body.id);
  }

  try {
    const result = await execFileAsync("python3", args, { cwd: opsRoot, timeout: 15000 });
    await writeAudit(
      auth.session.user.id,
      "OPS_RUN_TRIGGERED",
      JSON.stringify({ role: body.role, taskId: body.id ?? null })
    );
    return NextResponse.json({
      ok: true,
      stdout: result.stdout?.toString() ?? "",
      stderr: result.stderr?.toString() ?? ""
    });
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json({
      error: err.message ?? "runner failed",
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? ""
    }, { status: 500 });
  }
}
