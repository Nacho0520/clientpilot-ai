"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";

export async function changePlan(fd: FormData) {
  await auth();
  await requireAdmin();

  const businessId = fd.get("business_id") as string;
  const plan = fd.get("plan") as string;
  if (!["starter", "pro", "clinic"].includes(plan)) return;

  const supa = createAdminClient();
  await supa.from("businesses").update({ plan }).eq("id", businessId);
  revalidatePath("/admin/users");
}
