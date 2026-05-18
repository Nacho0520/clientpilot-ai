import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendManualMessage } from "./actions";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/lib/supabase/database.types";
import { auth } from "@/lib/auth";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warn"> = {
  active: "default", lead: "warn", converted: "success", closed: "secondary", cold: "secondary",
};

// Join shape: conversation row with nested businesses join.
type ConversationWithBusiness = {
  businesses?: Pick<Database["public"]["Tables"]["businesses"]["Row"], "owner_id"> | null;
};

function DateDivider({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = "Hoy";
  else if (isYesterday(date)) label = "Ayer";
  else label = format(date, "d 'de' MMMM yyyy", { locale: es });
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 border-t" />
    </div>
  );
}

export default async function ConversationDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { user, supa }] = await Promise.all([params, auth()]);
  const [{ data: convo }, { data: messages }] = await Promise.all([
    supa.from("conversations").select("*, businesses(name, owner_id)").eq("id", id).single(),
    supa.from("messages").select("*").eq("conversation_id", id).order("sent_at"),
  ]);

  if (!convo || (convo as ConversationWithBusiness).businesses?.owner_id !== user?.id) notFound();

  const initials = (convo.customer_name ?? convo.customer_phone)
    .split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const processedMessages = (messages ?? []).map((m, idx) => {
    const date = new Date(m.sent_at);
    const prevDate = idx > 0 ? new Date(messages![idx - 1].sent_at) : null;
    const timeStr = format(date, "HH:mm");
    const showDivider = !prevDate || !isSameDay(date, prevDate);
    const isManual = (m.metadata as { source?: string } | null)?.source === "manual_reply";
    return { ...m, date, showDivider, timeStr, isManual };
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4 mb-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{convo.customer_name ?? convo.customer_phone}</p>
          <p className="text-xs text-muted-foreground">{convo.customer_phone}</p>
        </div>
        <Badge variant={STATUS_VARIANT[convo.status] ?? "default"}>{convo.status}</Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-1 overflow-y-auto pr-2">
        {processedMessages.map((m) => (
          <div key={m.id}>
            {m.showDivider && <DateDivider date={m.date} />}
            <div className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-sm rounded-2xl px-4 py-2 text-sm ${
                m.direction === "outbound"
                  ? m.isManual
                    ? "bg-emerald-600 text-white"
                    : "bg-primary text-primary-foreground"
                  : "bg-secondary"
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="mt-1 text-[10px] opacity-70 text-right">
                  {m.timeStr}
                  {m.isManual && " · manual"}
                </p>
              </div>
            </div>
          </div>
        ))}
        {!processedMessages.length && (
          <p className="text-center text-sm text-muted-foreground py-8">No hay mensajes aún.</p>
        )}
      </div>

      {/* Reply box */}
      <form action={sendManualMessage} className="mt-4 border-t pt-4 space-y-2">
        <input type="hidden" name="conversation_id" value={id} />
        <Textarea
          name="content"
          placeholder="Escribe una respuesta manual (se enviará por WhatsApp)..."
          className="min-h-[80px] resize-none"
          required
        />
        <div className="flex justify-end">
          <Button type="submit">Enviar respuesta</Button>
        </div>
      </form>
    </div>
  );
}
