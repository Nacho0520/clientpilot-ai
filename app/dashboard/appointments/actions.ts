"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function updateAppointmentStatus(id: string, status: "confirmed" | "cancelled" | "completed" | "no_show") {
  const { user, supa } = await auth();

  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return;
  await supa.from("appointments").update({ status }).eq("id", id).eq("business_id", biz.id);
  revalidatePath("/dashboard/appointments");
}
