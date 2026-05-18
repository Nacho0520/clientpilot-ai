"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp/send";

type ConversationBusiness = {
  businesses?: {
    owner_id?: string | null;
  } | null;
};

export async function sendManualMessage(fd: FormData) {
  const conversationId = fd.get("conversation_id") as string;
  const content = (fd.get("content") as string).trim();
  if (!content) return;

  const { user, supa } = await auth();

  const { data: convo } = await supa
    .from("conversations")
    .select("*, businesses(owner_id)")
    .eq("id", conversationId)
    .single();
  if (!convo) return;
  const biz = (convo as ConversationBusiness).businesses;
  if (biz?.owner_id !== user.id) return;

  await supa.from("messages").insert({
    conversation_id: conversationId,
    business_id: convo.business_id,
    direction: "outbound",
    content,
    metadata: { source: "manual_reply" },
  });

  await supa.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);

  try {
    await sendWhatsApp(convo.customer_phone, content, convo.business_id);
  } catch { /* log but don't fail */ }

  revalidatePath(`/dashboard/conversations/${conversationId}`);
}
