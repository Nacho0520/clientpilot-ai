// Voyage AI / OpenAI compatible embeddings. For v1 we keep things simple and call
// Voyage via Anthropic-recommended embedding model. If unavailable, we fall back
// to a deterministic null vector so the pipeline doesn't crash during local dev.

import { env } from "../env";

export async function embed(text: string): Promise<number[] | null> {
  // Placeholder: in production, swap for the embeddings provider of choice.
  // Voyage's voyage-3 or OpenAI text-embedding-3-small are both 1536-dim compatible
  // with the messages.embedding vector(1536) column.
  if (!env.anthropicApiKey) return null;
  try {
    const r = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY ?? ""}`,
      },
      body: JSON.stringify({ input: text, model: "voyage-3" }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { data: Array<{ embedding: number[] }> };
    return j.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}
