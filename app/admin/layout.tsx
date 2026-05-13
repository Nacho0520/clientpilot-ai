import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/users", label: "Negocios" },
  { href: "/admin/plans", label: "Planes" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 sticky top-0 z-10">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">CP</div>
              <span className="font-bold">Admin</span>
            </div>
            <nav className="flex gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:underline">← Mi panel</Link>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
