// Shared domain types. The generated Supabase types live in lib/supabase/database.types.ts
// once `pnpm run db:types` is run against a local Supabase instance.

export type Intent =
  | "appointment_request"
  | "price_inquiry"
  | "general_question"
  | "complaint"
  | "follow_up_response"
  | "unknown";
export type Tone = "formal" | "friendly" | "premium";
