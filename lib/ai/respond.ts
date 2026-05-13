import { anthropic, MODEL } from "../anthropic";
import type Anthropic from "@anthropic-ai/sdk";

type Msg = { role: "user" | "assistant"; content: string };

export async function generateReply(systemPrompt: string, history: Msg[]): Promise<string> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });
  return res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
}
