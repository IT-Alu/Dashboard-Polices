/**
 * ============================================
 * UTILIDADES - CONTROL SEGUROS AAA
 * ============================================
 * 
 * Funciones utilitarias para formatos, validaciones y manejo de errores.
 */

/**
 * Clase para errores de la aplicación
 */
class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Manejador global de errores
 * @param {Error} error - Error a manejar
 */
function handleError(error) {
  console.error('Error:', error);
  
  let message = 'Error inesperado';
  let code = 'UNKNOWN_ERROR';
  
  // Errores de Supabase
  if (error.code) {
    code = error.code;
    
    switch (error.code) {
      case 'PGRST116':
        message = 'No tienes permiso para realizar esta acción';
        break;
      case 'PGRST301':
        message = 'Recurso no encontrado';
        break;
      case '23505':
        message = 'Ya existe un registro con estos datos';
        break;
      case '42501':
        message = 'No tienes acceso a este recurso';
        break;
      case '23503':
        message = 'La referencia no es válida';
        break;
      case '22001':
        message = 'El dato es demasiado largo';
        break;
      default:
        message = error.message || 'Error en la operación';
    }
  }
  
  // Errores de autenticación
  if (error.status === 401 || error.message?.includes('Invalid login credentials')) {
    message = 'Email o contraseña incorrectos';
  }
  
  if (error.message?.includes('User already registered')) {
    message = 'Este email ya está registrado';
  }
  
  if (error.message?.includes('Invalid email')) {
    message = 'El email no es válido';
  }
  
  // Mostrar error al usuario
  showError(message);
  
  // Lanzar error para logging
  throw new AppError(message, code, { originalError: error });
}

/**
 * Muestra un mensaje de error al usuario
 * @param {string} message - Mensaje a mostrar
 */
function showError(message) {
  // Usar el sistema de notificaciones existente
  if (typeof toast === 'function') {
    toast(message, 'error');
  } else {
    console.error(message);
    alert(message);
  }
}

/**
 * Muestra un mensaje de éxito al usuario
 * @param {string} message - Mensaje a mostrar
 */
function showSuccess(message) {
  if (typeof toast === 'function') {
    toast(message, 'success');
  }
}

/**
 * Formatea una fecha al formato europeo (DD/MM/YYYY)
 * @param {string|Date} value - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDate(value) {
  if (!value) return '—';
  const d = parseDate(value);
  return d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

/**
 * Parsea una fecha de varios formatos
 * @param {string|Date} value - Valor a parsear
 * @returns {Date|null} Fecha parseada o null
 */
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  
  // Formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('/').map(Number);
    return new Date(yyyy, mm - 1, dd);
  }
  
  // Intentar parsear como ISO
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

/**
 * Convierte una fecha a formato ISO (YYYY-MM-DD)
 * @param {string|Date} value - Fecha a convertir
 * @returns {string} Fecha en formato ISO
 */
function toISODate(value) {
  const d = parseDate(value);
  return d ? d.toISOString().slice(0, 10) : '';
}

/**
 * Formatea un número como moneda (euros)
 * @param {number|string} value - Valor a formatear
 * @returns {string} Valor formateado como moneda
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

/**
 * Calcula los días restantes hasta una fecha
 * @param {string|Date} endDate - Fecha de fin
 * @param {string} status - Estado de la póliza
 * @returns {number|null} Días restantes o null
 */
function daysUntil(endDate, status) {
  if ((status || '').toUpperCase() === 'ANULADA') return null;
  const end = parseDate(endDate);
  if (!end) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.ceil((endNormalized - today) / 86400000);
}

/**
 * Sugiere el estado de una póliza basado en sus fechas
 * @param {object} record - Registro de póliza
 * @returns {string} Estado sugerido
 */
function suggestStatus(record) {
  if ((record.status || '').toUpperCase() === 'ANULADA') return 'ANULADA';
  const end = parseDate(record.endDate);
  if (!end) return 'ACTIVA';
  return end < new Date() ? 'VENCIDA' : 'ACTIVA';
}

/**
 * Genera un policy_id único sin race conditions
 * @returns {string} Policy ID único
 */
function generatePolicyId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `POL-${timestamp}-${random}`;
}

/**
 * Sanitiza un texto eliminando espacios extra
 * @param {any} value - Valor a sanear
 * @returns {string} Texto saneado
 */
function sanitizeText(value) {
  return String(value == null ? '' : value).trim();
}

/**
 * Obtiene el inicio del día actual
 * @returns {Date} Inicio del día actual
 */
function todayStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Suma días a una fecha
 * @param {Date} date - Fecha base
 * @param {number} days - Días a sumar
 * @returns {Date} Nueva fecha
 */
function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Valida un archivo de logo
 * @param {File} file - Archivo a validar
 * @returns {object} Resultado de la validación
 */
function validateLogoFile(file) {
  if (!file) return { ok: false, message: 'No se ha seleccionado ningún archivo.' };
  
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
  const nameOk = /\.(png|jpe?g|svg)$/i.test(file.name);
  
  if (!validTypes.includes(file.type) && !nameOk) {
    return { ok: false, message: 'Formato no permitido. Usa PNG, JPG/JPEG o SVG.' };
  }
  
  if (file.size > 200 * 1024) { // 200KB máximo recomendado
    return { ok: false, message: 'El archivo supera 200KB. Se recomienda optimizar la imagen.' };
  }
  
  if (file.size > 2 * 1024 * 1024) { // 2MB máximo absoluto
    return { ok: false, message: 'El archivo supera 2MB.' };
  }
  
  return { ok: true };
}

/**
 * Lee un archivo como DataURL
 * @param {File} file - Archivo a leer
 * @returns {Promise<string>} DataURL del archivo
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Obtiene las iniciales de un texto para fallback de logos
 * @param {string} text - Texto del que extraer iniciales
 * @returns {string} Iniciales en mayúsculas
 */
function getInitials(text) {
  return (text || '—')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '—';
}

/**
 * Obtiene un color de acento para una compañía
 * @param {string} company - Nombre de la compañía
 * @returns {string} Color en formato hexadecimal
 */
function companyAccent(company) {
  const names = getCompanyNames();
  const index = Math.max(0, names.indexOf(company));
  return APP_CONFIG.ACCENT_COLORS[index % APP_CONFIG.ACCENT_COLORS.length];
}

/**
 * Obtiene el HTML para un logo de compañía
 * @param {string} company - Nombre de la compañía
 * @param {string} logoUrl - URL del logo (opcional)
 * @param {number} size - Tamaño en píxeles
 * @returns {string} HTML del logo
 */
function logoHTML(company, logoUrl = null, size = 56) {
  const fallback = getInitials(company);
  
  if (logoUrl) {
    return `<div class="logo-tile" style="width:${size}px;height:${size}px;" aria-hidden="true">
      <img src="${logoUrl}" alt="" />
    </div>`;
  }
  
  return `<div class="logo-tile" style="width:${size}px;height:${size}px;" aria-hidden="true">
    <span class="logo-fallback">${fallback}</span>
  </div>`;
}

/**
 * Obtiene el badge HTML para un estado
 * @param {string} status - Estado de la póliza
 * @returns {string} HTML del badge
 */
function statusBadge(status) {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVA') return '<span class="badge status-active">● Activa</span>';
  if (s === 'VENCIDA') return '<span class="badge status-expired">✕ Vencida</span>';
  return '<span class="badge status-cancelled">○ Anulada</span>';
}

/**
 * Obtiene el badge HTML para días restantes
 * @param {number} daysLeft - Días restantes
 * @param {string} status - Estado de la póliza
 * @returns {string} HTML del badge
 */
function daysBadge(daysLeft, status) {
  if ((status || '').toUpperCase() === 'ANULADA') return '<span class="badge status-cancelled">Anulada</span>';
  if (daysLeft == null) return '<span class="badge chip-info">—</span>';
  if (daysLeft < 0) return '<span class="badge status-expired">Vencida</span>';
  if (daysLeft <= 60) return `<span class="badge status-warning">${daysLeft} días</span>`;
  return `<span class="badge chip-info">${daysLeft} días</span>`;
}

/**
 * Obtiene el badge HTML for una frecuencia
 * @param {string} value - Frecuencia
 * @returns {string} HTML del badge
 */
function frequencyBadge(value) {
  const v = value || '—';
  if (v === 'ANUAL') return `<span class="badge chip-info">${v}</span>`;
  if (v === 'TRIMESTRAL') return `<span class="badge chip-purple">${v}</span>`;
  if (v === 'MENSUAL') return `<span class="badge status-warning">${v}</span>`;
  if (v === 'BIMESTRAL') return `<span class="badge status-active">${v}</span>`;
  return `<span class="badge">${v}</span>`;
}

/**
 * Obtiene los nombres de todas las compañías
 * @returns {string[]} Lista de nombres de compañías
 */
function getCompanyNames() {
  const names = new Set([
    ...APP_CONFIG.DEFAULT_COMPANIES,
    ...Object.keys(appState.companies),
    ...appState.policies.map(p => (p.company || '').toUpperCase()).filter(Boolean)
  ]);
  return [...names].sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Obtiene los nombres de todos los mediadores
 * @returns {string[]} Lista de nombres de mediadores
 */
function getBrokerNames() {
  const names = new Set([
    ...APP_CONFIG.BROKERS,
    ...appState.policies.map(p => p.broker || '').filter(Boolean)
  ]);
  return [...names].sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Obtiene las pólizas de un año específico
 * @param {number} year - Año
 * @returns {object[]} Lista de pólizas
 */
function getPoliciesForYear(year) {
  return appState.policies.filter(p => Number(p.year) === Number(year));
}

/**
 * Anuncia un mensaje para lectores de pantalla
 * @param {string} message - Mensaje a anunciar
 */
function announceStatus(message) {
  const announcer = document.getElementById('statusAnnouncer');
  if (announcer) {
    announcer.textContent = message;
  }
}

// Exportar funciones globales
window.handleError = handleError;
window.showError = showError;
window.showSuccess = showSuccess;
window.formatDate = formatDate;
window.parseDate = parseDate;
window.toISODate = toISODate;
window.formatCurrency = formatCurrency;
window.daysUntil = daysUntil;
window.suggestStatus = suggestStatus;
window.generatePolicyId = generatePolicyId;
window.sanitizeText = sanitizeText;
window.todayStart = todayStart;
window.addDays = addDays;
window.validateLogoFile = validateLogoFile;
window.readFileAsDataURL = readFileAsDataURL;
window.getInitials = getInitials;
window.companyAccent = companyAccent;
window.logoHTML = logoHTML;
window.statusBadge = statusBadge;
window.daysBadge = daysBadge;
window.frequencyBadge = frequencyBadge;
window.getCompanyNames = getCompanyNames;
window.getBrokerNames = getBrokerNames;
window.getPoliciesForYear = getPoliciesForYear;
window.announceStatus = announceStatus;