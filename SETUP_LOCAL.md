# 🚀 Guía de Configuración Local - ControlSeguros AAA

Esta guía te ayudará a ejecutar tu aplicación localmente en menos de 5 minutos.

---

## 📋 **Requisitos Previos**

- ✅ Tener Node.js instalado (para usar `npx serve`)
- ✅ Tener una cuenta de Supabase (gratis en [supabase.com](https://supabase.com))
- ✅ Tener un proyecto de Supabase creado

---

## 🔧 **Paso 1: Configurar Supabase**

### 1.1 Crear Proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Haz clic en **"New Project"**
4. Rellena:
   - **Name**: `controlseguros-dashboard` (o el que quieras)
   - **Database Password**: (guárdala en un gestor de contraseñas)
   - **Region**: Elige la más cercana a ti
5. Espera ~2 minutos a que se cree el proyecto

### 1.2 Ejecutar Migraciones SQL
1. En tu proyecto Supabase, ve a **"SQL Editor"** (menú izquierdo)
2. Haz clic en **"New Query"**
3. Copia y pega **CADA** archivo SQL en orden:

   **Primero:** `supabase/migrations/001_create_policies_table.sql`
   ```sql
   -- Copia todo el contenido del archivo 001 y pégalo aquí
   ```
   Haz clic en **"Run"** (o Ctrl+Enter)

   **Segundo:** `supabase/migrations/002_create_companies_table.sql`
   ```sql
   -- Copia todo el contenido del archivo 002 y pégalo aquí
   ```
   Haz clic en **"Run"**

   **Tercero:** `supabase/migrations/003_setup_rls_policies.sql`
   ```sql
   -- Copia todo el contenido del archivo 003 y pégalo aquí
   ```
   Haz clic en **"Run"**

   **Cuarto:** `supabase/migrations/004_create_storage_bucket.sql`
   ```sql
   -- Copia todo el contenido del archivo 004 y pégalo aquí
   ```
   Haz clic en **"Run"**

   **Quinto:** `supabase/migrations/005_create_triggers.sql`
   ```sql
   -- Copia todo el contenido del archivo 005 y pégalo aquí
   ```
   Haz clic en **"Run"**

### 1.3 Configurar Autenticación
1. Ve a **"Authentication"** → **"Providers"**
2. **Email** debe estar **Enabled**
3. **Disable email confirmations** (para desarrollo)
4. En **"URL Configuration"**:
   - **Site URL**: `http://localhost:3000` (para desarrollo local)
   - **Redirect URLs**: `http://localhost:3000`

### 1.4 Obtener Credenciales
1. Ve a **"Project Settings"** (engranaje abajo a la izquierda)
2. **"API"**
3. Copia:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (larga)

---

## 💻 **Paso 2: Configurar Variables de Entorno Locales**

### 2.1 Editar `.env.local`
1. Abre el archivo `.env.local` en la raíz del proyecto
2. Reemplaza los valores placeholder con tus credenciales:

```env
# URL de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co

# Clave anónima (anon/public key) de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tu-key-real-aqui
```

### 2.2 Editar `public/js/config.js`
1. Abre `public/js/config.js`
2. Busca las líneas:
   ```javascript
   const LOCAL_SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';  // ← Cambia esto
   const LOCAL_SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';            // ← Cambia esto
   ```
3. Reemplaza con las mismas credenciales que en `.env.local`:
   ```javascript
   const LOCAL_SUPABASE_URL = 'https://tu-proyecto.supabase.co';
   const LOCAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tu-key-real';
   ```

---

## 🎯 **Paso 3: Ejecutar la Aplicación**

### Opción A: Usando npm (Recomendado)
```bash
# En la raíz del proyecto
npm run dev
```

### Opción B: Usando Live Server en VS Code
1. Instala la extensión **Live Server** en VS Code
2. Haz clic derecho en `public/index.html`
3. Selecciona **"Open with Live Server"**

### Opción C: Usando Python
```bash
cd public
python -m http.server 8000
```
Luego abre `http://localhost:8000`

---

## 🧪 **Paso 4: Probar la Aplicación**

1. **Abre tu navegador** en `http://localhost:3000` (o el puerto que uses)
2. **Deberías ver** el modal de login
3. **Regístrate** con un email y contraseña (mínimo 8 caracteres)
4. **Inicia sesión** con las mismas credenciales
5. **¡Listo!** Deberías ver el dashboard vacío

### ✅ **Verificación de que funciona:**
- ✅ El modal de login aparece
- ✅ Puedes registrarte
- ✅ Puedes iniciar sesión
- ✅ Ves el dashboard con el menú superior
- ✅ No hay errores en la consola (F12)

---

## 🐛 **Solución de Problemas Comunes**

### ❌ "No puedo iniciar sesión"
**Causas posibles:**
1. Las credenciales de Supabase están mal en `.env.local` o `config.js`
2. Las migraciones SQL no se ejecutaron correctamente
3. El usuario no está confirmado (revisa el email si activaste confirmación)

**Solución:**
- Verifica que las URLs y keys sean correctas
- Revisa la consola del navegador (F12) para ver errores específicos

### ❌ "Error de conexión a Supabase"
**Causas posibles:**
1. El proyecto de Supabase no está activo
2. Las políticas RLS no están configuradas
3. Error en las migraciones SQL

**Solución:**
- Verifica que tu proyecto de Supabase esté activo
- Revisa que las migraciones se ejecutaron sin errores

### ❌ "Los logos no se suben"
**Causas posibles:**
1. El bucket de storage no existe
2. Las políticas de storage no están configuradas

**Solución:**
- Asegúrate de haber ejecutado `004_create_storage_bucket.sql`
- Revisa que el bucket `company-logos` existe en Supabase Storage

### ❌ "Error: Identifier 'supabase' has already been declared"
**Causa:** El archivo `config.js` no se actualizó correctamente.

**Solución:**
- Asegúrate de que en `config.js` se use `supabaseClient` en lugar de `supabase`

---

## 📱 **Próximos Pasos**

Una vez que funcione en local:

1. **Sube tu código a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/controlseguros-supabase.git
   git push -u origin main
   ```

2. **Despliega en Vercel**:
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu repositorio de GitHub
   - Configura las variables de entorno en Vercel dashboard
   - ¡Despliega!

3. **Configura dominio personalizado** (opcional):
   - En Vercel, ve a tu proyecto
   - Configura un dominio personalizado en Settings → Domains

---

## 📞 **Soporte**

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Verifica que las migraciones SQL se ejecutaron en orden
3. Revisa la documentación de [Supabase](https://supabase.com/docs)
4. Abre un issue en GitHub

---

## ✅ **Checklist de Verificación**

- [ ] Proyecto de Supabase creado
- [ ] Migraciones SQL ejecutadas en orden (001 → 005)
- [ ] Autenticación configurada en Supabase
- [ ] Credenciales copiadas de Supabase
- [ ] `.env.local` configurado con credenciales reales
- [ ] `public/js/config.js` actualizado con credenciales reales
- [ ] Aplicación ejecutándose en local (`npm run dev`)
- [ ] Login/Registro funcionando
- [ ] Dashboard visible después de login
- [ ] No hay errores en consola

---

**¡Listo para desplegar en producción! 🎉**