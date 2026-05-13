// Shared domain types. The generated Supabase types live in lib/supabase/database.types.ts
// once `npm run db:types` is run against a local Supabase instance.

export type Plan = "starter" | "pro" | "clinic";
export type ConversationStatus = "active" | "lead" | "converted" | "closed" | "cold";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
export type MessageDirection = "inbound" | "outbound";
export type Intent =
  | "appointment_request"
  | "price_inquiry"
  | "general_question"
  | "complaint"
  | "follow_up_response"
  | "unknown";
export type Tone = "formal" | "friendly" | "premium";
export type FollowUpTemplate =
  | "follow_up_a"
  | "follow_up_b"
  | "follow_up_c"
  | "review_request"
  | "reminder_24h";
