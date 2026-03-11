export type ContentEnrichment = {
  tags: string[];
  topics: string[];
  safetyHints: string[];
};

export function enrichContentText(text: string): ContentEnrichment {
  const normalized = text.toLowerCase();
  const tags: string[] = [];
  const topics: string[] = [];
  const safetyHints: string[] = [];

  if (normalized.includes("game") || normalized.includes("play")) topics.push("gaming");
  if (normalized.includes("watch") || normalized.includes("episode")) topics.push("streaming");
  if (normalized.includes("buy") || normalized.includes("price")) tags.push("monetization");
  if (normalized.includes("violence")) safetyHints.push("review_violence");

  return { tags, topics, safetyHints };
}
