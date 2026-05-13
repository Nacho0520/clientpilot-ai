"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function ActivityChart({ data }: { data: Array<{ day: string; mensajes: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip />
        <Line type="monotone" dataKey="mensajes" strokeWidth={2} dot={false} className="stroke-primary" />
      </LineChart>
    </ResponsiveContainer>
  );
}
