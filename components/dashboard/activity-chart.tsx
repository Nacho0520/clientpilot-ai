"use client";
import dynamic from "next/dynamic";

const ActivityChartInner = dynamic(
  () => import("./activity-chart-inner"),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded bg-secondary/40" /> }
);

export function ActivityChart({ data }: { data: Array<{ day: string; mensajes: number }> }) {
  return <ActivityChartInner data={data} />;
}
