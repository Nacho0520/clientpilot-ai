"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Resumen", exact: true },
  { href: "/dashboard/conversations", label: "Conversaciones" },
  { href: "/dashboard/appointments", label: "Citas" },
  { href: "/dashboard/settings", label: "Ajustes" },
  { href: "/dashboard/billing", label: "Plan y facturación" },
];

export function MobileNav({ bizName }: { bizName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3 md:hidden bg-background">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">CP</div>
          <span className="font-semibold text-sm">{bizName}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 top-[57px] z-50 bg-background border-t">
          <nav className="p-4 space-y-1">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center rounded-md px-4 py-3 text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground font-medium" : "hover:bg-secondary"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-4 border-t mt-4">
              <form action="/api/auth/logout" method="post">
                <button className="text-sm text-muted-foreground hover:underline" type="submit">Cerrar sesión</button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
