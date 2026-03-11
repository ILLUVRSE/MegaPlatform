import { NextResponse } from "next/server";
import { z } from "zod";
import { getLocalizedCoreModulePaths, localizePath, resolveLocale } from "@/lib/i18nFoundation";

const payloadSchema = z.object({
  locale: z.string().min(2).optional(),
  region: z.string().min(2).optional(),
  path: z.string().min(1).optional()
});

export async function POST(req: Request) {
  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const locale = await resolveLocale({ locale: parsed.data.locale, region: parsed.data.region });
  const localizedPath = parsed.data.path ? await localizePath(parsed.data.path, locale) : null;
  const modules = await getLocalizedCoreModulePaths({ locale });

  return NextResponse.json({ ok: true, locale, localizedPath, modules: modules.modulePaths });
}
