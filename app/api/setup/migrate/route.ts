import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readFileSync } from "fs";
import { join } from "path";

const ADMIN_EMAIL = "hemmings.nacho@gmail.com";

export async function POST() {
  // Only the admin user can run migrations
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    return NextResponse.json({
      error: "SUPABASE_DB_URL no está configurado",
      instructions: [
        "1. Ve a Supabase Dashboard → Settings → Database",
        "2. Copia la 'Connection string' (URI format)",
        "3. Añádela a tu .env: SUPABASE_DB_URL=postgresql://postgres:[tu-password]@db.dyujowkydblogmojfgff.supabase.co:5432/postgres",
        "4. Reinicia el servidor y vuelve a llamar este endpoint",
      ],
    }, { status: 400 });
  }

  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    const migrationPath = join(process.cwd(), "supabase/migrations/0001_init.sql");
    const sql = readFileSync(migrationPath, "utf8");

    await client.query(sql);
    await client.end();

    return NextResponse.json({
      success: true,
      message: "Migración aplicada correctamente. Las tablas de la base de datos han sido creadas.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      return NextResponse.json({
        success: true,
        message: "Las tablas ya existen (migración ya estaba aplicada).",
      });
    }
    return NextResponse.json({ error: `Error en la migración: ${message}` }, { status: 500 });
  }
}

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dbUrl = process.env.SUPABASE_DB_URL;
  const status = {
    authenticated: true,
    admin: true,
    db_url_configured: !!dbUrl,
    instructions: dbUrl ? "Llama POST /api/setup/migrate para aplicar las migraciones" : [
      "Falta SUPABASE_DB_URL en el .env",
      "Encuéntrala en: Supabase Dashboard → Settings → Database → Connection string",
      "Formato: postgresql://postgres:[password]@db.dyujowkydblogmojfgff.supabase.co:5432/postgres",
    ],
  };

  return NextResponse.json(status);
}
