/**
 * Script de seed: crea un negocio de prueba para el usuario admin
 * una vez que las migraciones estén aplicadas.
 *
 * Uso: node scripts/seed.mjs
 */

const SUPABASE_URL = "https://dyujowkydblogmojfgff.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dWpvd2t5ZGJsb2dtb2pmZ2ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYwNTc4NSwiZXhwIjoyMDk0MTgxNzg1fQ.GlclAihbjvO37eP0vIxr77yovEy_tWk5JN1TJL6oK8A";
const ADMIN_USER_ID = "6feacf74-729b-4a88-8fa6-33b37a661986";

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function apiPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function apiGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(`GET ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log("🌱 Iniciando seed de datos de prueba...\n");

  // Verificar que las tablas existen
  await apiGet("/businesses?select=id&limit=1").catch((err) => {
    console.error("❌ Las tablas no existen todavía. Aplica las migraciones primero:");
    console.error("   node scripts/migrate.mjs  (necesita SUPABASE_DB_URL)");
    console.error("   O aplica el SQL en: supabase/migrations/0001_init.sql");
    console.error("\nError:", err.message);
    process.exit(1);
  });

  console.log("✓ Tablas verificadas");

  // Verificar si ya hay un negocio para el admin
  const existing = await apiGet(`/businesses?owner_id=eq.${ADMIN_USER_ID}&select=id`);
  if (existing.length > 0) {
    console.log(`✓ El negocio ya existe (id: ${existing[0].id}). Nada que crear.`);
    return;
  }

  // Crear negocio de prueba
  const [biz] = await apiPost("/businesses", {
    owner_id: ADMIN_USER_ID,
    name: "Clínica Demo ClientPilot",
    phone: "+34 600 000 000",
    address: "Calle Mayor 1, Madrid",
    sector: "aesthetic_clinic",
    plan: "pro",
    onboarding_complete: true,
  });
  console.log(`✓ Negocio creado: ${biz.name} (id: ${biz.id})`);

  // Crear configuración IA
  await apiPost("/business_settings", {
    business_id: biz.id,
    ai_name: "Sofía",
    tone: "friendly",
  });
  console.log("✓ Configuración IA creada");

  // Crear servicios de prueba
  const services = [
    { business_id: biz.id, name: "Limpieza facial", price_cents: 6500, duration_minutes: 60 },
    { business_id: biz.id, name: "Botox", price_cents: 35000, duration_minutes: 30 },
    { business_id: biz.id, name: "Relleno labios", price_cents: 45000, duration_minutes: 45 },
  ];
  await apiPost("/services", services);
  console.log(`✓ ${services.length} servicios creados`);

  // Crear horarios (lunes-sábado 09:00-20:00, domingo cerrado)
  const hours = Array.from({ length: 7 }, (_, day) => ({
    business_id: biz.id,
    day_of_week: day,
    open_time: day === 0 ? null : "09:00:00",
    close_time: day === 0 ? null : "20:00:00",
    closed: day === 0,
  }));
  await apiPost("/business_hours", hours);
  console.log("✓ Horarios creados");

  console.log("\n🎉 Seed completado. Ahora puedes iniciar sesión y ver el dashboard.");
  console.log("   Email: hemmings.nacho@gmail.com");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
