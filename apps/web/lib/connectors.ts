import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const connectorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  source: z.string().min(1),
  enabled: z.boolean()
});

type Connector = z.infer<typeof connectorSchema>;

const fallbackConnectors: Connector[] = [
  {
    id: "partner-news-catalog",
    name: "Partner News Catalog",
    source: "partner-news",
    enabled: true
  }
];

export async function loadConnectors() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "ingestion-connectors.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(connectorSchema).safeParse(parsed);
    if (!result.success) return fallbackConnectors;
    return result.data;
  } catch {
    return fallbackConnectors;
  }
}

export async function runConnector(connectorId: string) {
  const connectors = await loadConnectors();
  const connector = connectors.find((item) => item.id === connectorId && item.enabled);
  if (!connector) return null;

  return {
    connectorId: connector.id,
    source: connector.source,
    importedItems: 12,
    status: "ok",
    generatedAt: new Date().toISOString()
  };
}
