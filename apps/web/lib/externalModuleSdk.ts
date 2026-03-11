import { z } from "zod";

export const externalModuleManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["Media", "Games", "Culture"]),
  route: z.string().min(1),
  launchUrl: z.string().url(),
  tagline: z.string().min(1),
  description: z.string().min(1)
});

export type ExternalModuleManifest = z.infer<typeof externalModuleManifestSchema>;

export function registerExternalModule(manifest: ExternalModuleManifest) {
  return externalModuleManifestSchema.parse(manifest);
}
