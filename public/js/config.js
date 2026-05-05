/**
 * ============================================
 * CONFIGURACIÓN DE SUPABASE - CONTROL SEGUROS AAA
 * ============================================
 * 
 * Las credenciales de Supabase se inyectan desde window.APP_ENV
 * (definido en public/js/env.js, generado por scripts/generate-env.js)
 * 
 * En local: copia .env.example a .env.local y rellena los valores.
 *          Ejecuta: npm run build (genera env.js desde .env.local)
 * 
 * En Vercel: configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
 *            en Project Settings > Environment Variables
 */

// ============================================
// Obtener credenciales desde window.APP_ENV (inyectadas por env.js)
// ============================================

const SUPABASE_URL = window.APP_ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.APP_ENV?.SUPABASE_ANON_KEY || '';

// Validar configuración
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERROR CRÍTICO: Variables de Supabase no configuradas.');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗ FALTA');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗ FALTA');
  console.error('\n📖 Solución:');
  console.error('   1. Copia .env.example a .env.local');
  console.error('   2. Rellena los valores de Supabase');
  console.error('   3. Ejecuta: npm run build');
  console.error('   4. Luego: npm run dev\n');
  document.body.innerHTML = '<h1 style="color:red;margin:20px;">Error: Variables de Supabase no configuradas</h1>';
  throw new Error('Supabase configuration missing');
}

// ============================================
// Inicializar cliente de Supabase
// ============================================

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    storage: {}
  }
);

// Constantes de la aplicación
const APP_CONFIG = {
  // Nombres de las tablas
  TABLES: {
    POLICIES: 'policies',
    COMPANIES: 'companies'
  },
  
  // Nombres de los buckets de storage
  STORAGE: {
    LOGOS: 'company-logos'
  },
  
  // Frecuencias de pago
  FREQUENCIES: ['ANUAL', 'TRIMESTRAL', 'BIMESTRAL', 'MENSUAL', 'REGULARIZACIÓN'],
  
  // Mediadores por defecto
  BROKERS: ['MARSH', 'AON', 'MUR & VALLS', 'SUMMA MEDIADORS SL', 'WILLIS TOWERS WATSON', 'CATALANA OCCIDENTE'],
  
  // Compañías por defecto
  DEFAULT_COMPANIES: ['ALLIANZ', 'AXA', 'CHUBB', 'GENERALI', 'LIBERTY', 'MAPFRE', 'SOLUNION', 'ZURICH', 'HDI', 'ASISA', 'SANITAS', 'ADESLAS', 'MUTUA MADRILEÑA', 'BERKLEY', 'TOKIO MARINE'],
  
  // Estados de póliza
  STATUS: {
    ACTIVA: 'ACTIVA',
    VENCIDA: 'VENCIDA',
    ANULADA: 'ANULADA'
  },
  
  // Claves de localStorage para migración
  STORAGE_KEYS: {
    POLICIES: 'control_seguros_dashboard_small_v6',
    COMPANIES: 'control_seguros_dashboard_small_v6_companies',
    MIGRATED: 'migrated_to_supabase',
    THEME: 'control_seguros_dashboard_small_theme_v6'
  },
  
  // Configuración de paginación
  PAGINATION: {
    PAGE_SIZE: 10
  },
  
  // Meses
  MONTHS: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  
  // Colores para gráficos
  ACCENT_COLORS: ['#B17AFF', '#45D45B', '#F3BF4A', '#4E86FF', '#FF6161', '#C998FF', '#A5734B'],
  
  // Estilos para KPIs
  KPI_STYLES: [
    { color: '#4E86FF', icon: '💰' },
    { color: '#45D45B', icon: '📜' },
    { color: '#F3BF4A', icon: '⏰' },
    { color: '#B17AFF', icon: '🏢' },
    { color: '#FF6161', icon: '📈' }
  ]
};

// Estado global de la aplicación
const appState = {
  currentUser: null,
  session: null,
  policies: [],
  companies: {},
  currentYear: new Date().getFullYear(),
  currentPage: 'dashboard',
  theme: 'dark',
  filters: {
    search: '',
    company: '',
    status: '',
    frequency: ''
  },
  sort: {
    field: 'end_date',
    direction: 'asc'
  },
  page: 1,
  pageSize: APP_CONFIG.PAGINATION.PAGE_SIZE,
  calendarFilters: {
    company: '',
    status: ''
  },
  editingId: null,
  transientLogo: null,
  modalTrigger: null
};

// Exportar para uso en otros módulos
window.APP_CONFIG = APP_CONFIG;
window.supabaseClient = supabaseClient;
window.appState = appState;
