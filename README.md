# 🛡️ ControlSeguros AAA - Dashboard Profesional con Supabase + Vercel

Dashboard profesional para la gestión de pólizas de seguros, transformado desde una SPA con localStorage a una aplicación cloud con autenticación, base de datos PostgreSQL y almacenamiento seguro.

---

## 🚀 Características Principales

- ✅ **Autenticación segura** con Supabase Auth (email + contraseña)
- ✅ **Base de datos PostgreSQL** con Row Level Security (RLS)
- ✅ **Almacenamiento de logos** en Supabase Storage con URLs firmadas
- ✅ **CRUD completo** de pólizas sin race conditions
- ✅ **Migración automática** desde localStorage
- ✅ **Soft delete** para recuperación de datos
- ✅ **Diseño responsive** manteniendo tu UI original
- ✅ **Coste $0/mes** con planes gratuitos de Supabase + Vercel

---

## 📁 Estructura del Proyecto

```
controlseguros-supabase/
├── public/
│   ├── index.html              # Dashboard con login modal
│   ├── css/
│   │   └── styles.css          # Estilos (inline en HTML)
│   └── js/
│       ├── config.js           # Configuración de Supabase
│       ├── auth.js             # Autenticación
│       ├── policies.js         # CRUD de pólizas
│       ├── companies.js        # Gestión de compañías
│       ├── storage.js          # Logos con URLs firmadas
│       ├── migration.js        # Migración desde localStorage
│       ├── utils.js            # Utilidades y manejo de errores
│       ├── loading.js          # Skeleton loading states
│       └── app.js              # Lógica principal
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_policies_table.sql
│   │   ├── 002_create_companies_table.sql
│   │   ├── 003_setup_rls_policies.sql
│   │   ├── 004_create_storage_bucket.sql
│   │   └── 005_create_triggers.sql
├── .env.example                # Variables de entorno (ejemplo)
├── .gitignore
├── package.json
├── vercel.json                 # Configuración de Vercel
└── README.md
```

---

## 🛠️ Configuración Paso a Paso

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Haz clic en **"New Project"**
3. Rellena:
   - **Name**: `controlseguros-dashboard`
   - **Database Password**: (guárdala en un gestor de contraseñas)
   - **Region**: Elige la más cercana a ti
4. Espera ~2 minutos a que se cree el proyecto

### 2. Configurar Base de Datos

1. En tu proyecto Supabase, ve a **"SQL Editor"** en el menú izquierdo
2. Haz clic en **"New Query"**
3. Copia y pega **CADA** archivo SQL en orden:
   - `supabase/migrations/001_create_policies_table.sql`
   - `supabase/migrations/002_create_companies_table.sql`
   - `supabase/migrations/003_setup_rls_policies.sql`
   - `supabase/migrations/004_create_storage_bucket.sql`
   - `supabase/migrations/005_create_triggers.sql`
4. Ejecuta cada uno haciendo clic en **"Run"** (o Ctrl+Enter)

### 3. Configurar Autenticación

1. Ve a **"Authentication"** → **"Providers"**
2. **Email** debe estar **Enabled**
3. **Disable email confirmations** (para desarrollo)
4. En **"URL Configuration"**:
   - **Site URL**: `https://tudominio.vercel.app` (o `http://localhost:3000` para local)
   - **Redirect URLs**: `https://tudominio.vercel.app`

### 4. Obtener Credenciales de Supabase

1. Ve a **"Project Settings"** (engranaje abajo a la izquierda)
2. **"API"**
3. Copia:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (larga, empieza con eyJ)

### 5. Configurar Variables de Entorno Locales

1. Copia `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Edita `.env.local` y pega tus credenciales:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### 6. Probar Localmente

```bash
# Instalar serve (si no lo tienes)
npm install -g serve

# Iniciar servidor local
npx serve public
```

Abre `http://localhost:3000` y deberías ver el login.

### 7. Desplegar en Vercel

#### Opción A: Desde GitHub (Recomendado)

1. **Sube tu código a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/controlseguros-supabase.git
   git push -u origin main
   ```

2. **Conecta Vercel con GitHub**:
   - Ve a [vercel.com](https://vercel.com)
   - **"Add New..."** → **"Project"**
   - **"Import Git Repository"**
   - Selecciona tu repositorio `controlseguros-supabase`
   - **"Import Project"**

3. **Configura Variables de Entorno en Vercel**:
   - En **"Configure Project"**, expande **"Environment Variables"**
   - Añade:
     - `NEXT_PUBLIC_SUPABASE_URL` = `https://xxxxx.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGc...`
   - **"Deploy"**

4. **¡Listo!** Tu app estará en `https://controlseguros-supabase.vercel.app`

#### Opción B: Desde CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Desplegar
vercel --project-name controlseguros-dashboard

# Configurar variables de entorno
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Desplegar a producción
vercel --prod
```

---

## 🔄 Migración de Datos Existentes

Si ya tienes datos en localStorage (de tu versión anterior):

1. **Inicia sesión** en tu nueva app
2. **Automáticamente** se detectarán datos locales y se migrarán
3. Los **logos** se subirán a Supabase Storage
4. Las **pólizas** se insertarán con control de duplicados

Para forzar una migración manual:
```javascript
// En la consola del navegador
await migrateFromLocalStorage();
```

---

## 📊 Esquema de Base de Datos

### Tabla: `policies`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Clave primaria (auto) |
| user_id | UUID | Relación con auth.users (auto) |
| policy_id | TEXT | ID visible (ej: POL-M4XZ8K-A7B2) |
| accounting_account | TEXT | Cuenta contable |
| company | TEXT | Nombre compañía |
| broker | TEXT | Mediador |
| concept | TEXT | Concepto/seguro |
| policy_number | TEXT | Nº póliza |
| start_date | DATE | Fecha inicio |
| end_date | DATE | Fecha fin |
| payment_frequency | TEXT | ANUAL, TRIMESTRAL, etc. |
| amount | DECIMAL | Importe en euros |
| year | INTEGER | Año de referencia |
| status | TEXT | ACTIVA, VENCIDA, ANULADA |
| notes | TEXT | Notas adicionales |
| company_logo_path | TEXT | Ruta del logo en Storage |
| deleted_at | TIMESTAMPTZ | Soft delete (NULL = activo) |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

### Tabla: `companies`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Clave primaria |
| user_id | UUID | Relación con auth.users |
| name | TEXT | Nombre compañía |
| logo_url | TEXT | URL del logo en Storage |
| logo_mime_type | TEXT | image/png, etc. |
| logo_file_name | TEXT | Nombre original |
| deleted_at | TIMESTAMPTZ | Soft delete |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

---

## 🔒 Seguridad

### Row Level Security (RLS)
- ✅ Cada usuario solo ve SUS pólizas
- ✅ Cada usuario solo gestiona SUS compañías
- ✅ Soft delete previene pérdida accidental de datos

### Storage Privado
- ✅ Bucket `company-logos` es **privado**
- ✅ URLs firmadas expiran en 1 hora
- ✅ Solo el dueño puede subir/ver sus logos

### Autenticación
- ✅ Contraseñas hasheadas por Supabase
- ✅ Sesiones JWT automáticas
- ✅ Rate limiting en login (4 intentos/hora)

---

## 💰 Costes Estimados

| Servicio | Límite Gratis | Uso Típico | Coste |
|----------|---------------|------------|-------|
| Vercel Hobby | 100GB bandwidth | ~1GB/mes | $0 |
| Supabase | 500MB DB + 1GB Storage | ~100MB DB + 50MB Storage | $0 |
| Supabase Auth | 50K usuarios/mes | 1-10 usuarios | $0 |
| **Total** | | | **$0/mes** |

---

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias (no hay, es estático)
# npm install

# Iniciar servidor de desarrollo
npm run dev

# O directamente
npx serve public
```

Para desarrollo con hot reload, puedes usar Live Server en VS Code.

---

## 📝 Notas Importantes

1. **Variables de entorno**: NUNCA subas `.env.local` a Git
2. **RLS**: Las políticas ya están configuradas, no las modifiques sin entender
3. **Logos**: Máximo 200KB recomendado para mejor rendimiento
4. **Migración**: Se ejecuta automáticamente al primer login si hay datos locales
5. **Soft delete**: Los datos "eliminados" se marcan con `deleted_at`, no se borran físicamente

---

## 🐛 Solución de Problemas

### "No puedo iniciar sesión"
- Verifica que el email esté confirmado (si activaste email confirmation)
- Revisa las credenciales de Supabase en `.env.local`
- Comprueba que las migraciones SQL se ejecutaron correctamente

### "Los logos no se suben"
- Verifica que el bucket `company-logos` existe en Supabase Storage
- Comprueba que las políticas de storage están configuradas
- Asegúrate de que el archivo pesa menos de 2MB

### "Error de RLS: permission denied"
- Revisa que las políticas RLS están activas (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Comprueba que el usuario está autenticado
- Verifica que `auth.uid()` coincide con `user_id` en las políticas

### "Los datos no se migran"
- Abre la consola del navegador (F12) y busca errores
- Asegúrate de haber iniciado sesión primero
- Verifica que hay datos en localStorage (`localStorage.getItem('control_seguros_dashboard_small_v6')`)

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Add nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License - siéntete libre de usar este proyecto para lo que necesites.

---

## 🙏 Agradecimientos

- **Supabase** por la increíble plataforma backend-as-a-service
- **Vercel** por el hosting gratuito y fácil de usar
- **Tú** por confiar en esta solución profesional

---

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa este README
2. Busca en la consola del navegador errores específicos
3. Revisa la documentación de [Supabase](https://supabase.com/docs)
4. Abre un issue en GitHub

---

**¡Disfruta de tu dashboard profesional en la nube! 🎉**