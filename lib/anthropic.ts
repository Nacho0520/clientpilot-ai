import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

let _client: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicApiKey });
  return _client;
}
export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_t, prop) {
    return Reflect.get(getAnthropic() as object, prop);
  },
});
export const MODEL = env.anthropicModel || "claude-sonnet-4-5";
