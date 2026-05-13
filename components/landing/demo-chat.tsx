"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

export default function DemoChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "¡Hola! Soy Sofía, la recepcionista de Clínica Demo. ¿En qué puedo ayudarte?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/demo/chat", { method: "POST", body: JSON.stringify({ messages: next }) });
      const { reply } = await r.json();
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Disculpa, hubo un problema. Vuelve a intentarlo." }]);
    }
    setBusy(false);
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 h-80 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-md rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-muted-foreground">Sofía está escribiendo...</p>}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Escribe un mensaje..." />
        <Button onClick={send} disabled={busy}>Enviar</Button>
      </div>
    </div>
  );
}
