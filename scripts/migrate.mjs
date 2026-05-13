// Script para aplicar las migraciones al proyecto Supabase
// Uso: node scripts/migrate.mjs
// O con contraseña explícita: SUPABASE_DB_PASSWORD=xxx node scripts/migrate.mjs

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'dyujowkydblogmojfgff';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dWpvd2t5ZGJsb2dtb2pmZ2ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYwNTc4NSwiZXhwIjoyMDk0MTgxNzg1fQ.GlclAihbjvO37eP0vIxr77yovEy_tWk5JN1TJL6oK8A';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || SERVICE_ROLE_KEY;

const CONNECTION_CONFIGS = [
  // Pooler (session mode) - might work with service role as password
  {
    host: `aws-0-eu-central-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    label: 'Pooler EU session mode'
  },
  // Direct connection
  {
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    label: 'Direct connection'
  },
  // US region pooler
  {
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    label: 'Pooler US session mode'
  },
];

const migrationFile = join(__dirname, '../supabase/migrations/0001_init.sql');
const sql = readFileSync(migrationFile, 'utf8');

async function tryConnect(config) {
  const { label, ...pgConfig } = config;
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log(`✓ Conectado via: ${label}`);
    return client;
  } catch (err) {
    console.log(`✗ Falló ${label}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('🔗 Intentando conectar a Supabase PostgreSQL...\n');
  
  let client = null;
  for (const config of CONNECTION_CONFIGS) {
    client = await tryConnect(config);
    if (client) break;
  }

  if (!client) {
    console.error('\n❌ No se pudo conectar. Necesitas la contraseña de la base de datos.');
    console.error('   Ejecútalo con: SUPABASE_DB_PASSWORD=tu_contraseña node scripts/migrate.mjs');
    console.error('   (Encuéntrala en Supabase Dashboard → Settings → Database)');
    process.exit(1);
  }

  try {
    console.log('\n📦 Aplicando migración...');
    await client.query(sql);
    console.log('✅ Migración aplicada exitosamente.');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('✅ Las tablas ya existen (migración ya aplicada).');
    } else {
      console.error('❌ Error aplicando migración:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main();
