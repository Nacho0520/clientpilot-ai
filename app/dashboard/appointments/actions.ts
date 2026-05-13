"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateAppointmentStatus(id: string, status: "confirmed" | "cancelled" | "completed" | "no_show") {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return;
  await supa.from("appointments").update({ status }).eq("id", id).eq("business_id", biz.id);
  revalidatePath("/dashboard/appointments");
}
