#!/usr/bin/env node

/**
 * ============================================
 * GENERATE ENV - ControlSeguros AAA
 * ============================================
 * 
 * Genera public/js/env.js con variables de entorno.
 * Se ejecuta durante build para inyectar credenciales de Supabase.
 * 
 * Uso: node scripts/generate-env.js
 */

const fs = require('fs');
const path = require('path');

// Intentar cargar variables de .env.local si existen
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=');
      }
    }
  });
}

// Leer variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validar que existan
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: Variables de entorno incompletas');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗ FALTA');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗ FALTA');
  console.error('\n📖 En local: copia .env.example a .env.local y rellena los valores');
  console.error('📖 En Vercel: añade estas variables en Project Settings > Environment Variables\n');
  process.exit(1);
}

// Generar contenido de env.js
const envContent = `/**
 * Configuración de entorno inyectada por scripts/generate-env.js
 * NO edites este archivo manualmente.
 * Se regenera automáticamente durante npm run build.
 */

window.APP_ENV = {
  SUPABASE_URL: ${JSON.stringify(SUPABASE_URL)},
  SUPABASE_ANON_KEY: ${JSON.stringify(SUPABASE_ANON_KEY)}
};

// Validación básica en navegador
(function() {
  if (!window.APP_ENV.SUPABASE_URL || !window.APP_ENV.SUPABASE_ANON_KEY) {
    console.error('❌ Error: Variables de entorno de Supabase no configuradas.');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', window.APP_ENV.SUPABASE_URL ? 'OK' : 'FALTA');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', window.APP_ENV.SUPABASE_ANON_KEY ? 'OK' : 'FALTA');
    console.error('\\n📖 Instrucciones:');
    console.error('   Local: copia .env.example a .env.local');
    console.error('   Vercel: añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('          en Project Settings > Environment Variables');
  }
})();
`;

// Crear directorio si no existe
const publicJsDir = path.join(__dirname, '..', 'public', 'js');
if (!fs.existsSync(publicJsDir)) {
  fs.mkdirSync(publicJsDir, { recursive: true });
}

// Escribir archivo
const envFilePath = path.join(publicJsDir, 'env.js');
fs.writeFileSync(envFilePath, envContent, 'utf8');

console.log(`✅ Generado: ${envFilePath}`);
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  console.log('   ✓ NEXT_PUBLIC_SUPABASE_URL configurada');
  console.log('   ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY configurada');
} else {
  console.log('   ⚠️  Variables incompletas (fallará en navegador)');
}
