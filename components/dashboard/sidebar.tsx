"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Resumen", exact: true },
  { href: "/dashboard/conversations", label: "Conversaciones" },
  { href: "/dashboard/appointments", label: "Citas" },
  { href: "/dashboard/settings", label: "Ajustes" },
  { href: "/dashboard/billing", label: "Plan y facturación" },
];

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700",
  pro: "bg-indigo-100 text-indigo-700",
  clinic: "bg-emerald-100 text-emerald-700",
};

export function DashboardSidebar({
  bizName,
  plan,
  aiResponsesThisMonth,
  planLimit,
  isAdmin = false,
}: {
  bizName: string;
  plan: string;
  aiResponsesThisMonth: number;
  planLimit: number | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r bg-secondary/20 flex flex-col">
      <div className="p-4 border-b">
        <p className="text-lg font-bold">ClientPilot AI</p>
        <p className="truncate text-xs text-muted-foreground mt-0.5">{bizName}</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 text-sm">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-secondary text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <div className="pt-3 mt-3 border-t">
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 transition-colors text-amber-700 dark:text-amber-400",
                pathname.startsWith("/admin")
                  ? "bg-amber-100 dark:bg-amber-900/30 font-medium"
                  : "hover:bg-amber-50 dark:hover:bg-amber-900/20"
              )}
            >
              <span className="text-xs">⚡</span> Admin
            </Link>
          </div>
        )}
      </nav>

      {/* Plan badge */}
      <div className="p-3 border-t space-y-2">
        <div className={cn("rounded-md px-3 py-2 text-xs font-medium", PLAN_COLORS[plan] ?? PLAN_COLORS.starter)}>
          <p className="uppercase tracking-wide">{plan}</p>
          {planLimit !== null && (
            <p className="mt-0.5 text-[11px] font-normal opacity-80">
              {aiResponsesThisMonth} / {planLimit} respuestas IA
            </p>
          )}
          {planLimit === null && (
            <p className="mt-0.5 text-[11px] font-normal opacity-80">Respuestas ilimitadas</p>
          )}
        </div>
        <Link
          href="/guia-preparacion"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <span>📖</span> Guía de configuración
        </Link>
        <div className="flex items-center justify-between">
          <form action="/api/auth/logout" method="post">
            <button className="text-xs text-muted-foreground hover:underline" type="submit">Cerrar sesión</button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
