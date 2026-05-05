/**
 * ============================================
 * STORAGE - CONTROL SEGUROS AAA
 * ============================================
 * 
 * Gestión de logos en Supabase Storage.
 * URLs firmadas para mayor seguridad.
 */

/**
 * Sube un logo para una compañía
 * @param {string} companyName - Nombre de la compañía
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} URL firmada del logo
 */
async function uploadCompanyLogo(companyName, file) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Usuario no autenticado');
  
  // Validar archivo
  const validation = validateLogoFile(file);
  if (!validation.ok) throw new Error(validation.message);
  
  // Generar nombre de archivo
  const fileExt = file.name.split('.').pop();
  const safeCompanyName = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const fileName = `${userId}/${safeCompanyName}/logo.${fileExt}`;
  
  // Subir archivo
  const { data, error } = await supabaseClient.storage
    .from(APP_CONFIG.STORAGE.LOGOS)
    .upload(fileName, file, { 
      cacheControl: '3600',
      upsert: true 
    });
  
  if (error) throw error;
  
  // Generar URL firmada (válida por 1 hora)
  return await getSignedLogoUrl(fileName);
}

/**
 * Obtiene una URL firmada para un logo
 * @param {string} path - Ruta del archivo en storage
 * @param {number} expiresIn - Segundos de validez (default: 1 hora)
 * @returns {Promise<string>} URL firmada
 */
async function getSignedLogoUrl(path, expiresIn = 3600) {
  const { data, error } = await supabaseClient.storage
    .from(APP_CONFIG.STORAGE.LOGOS)
    .createSignedUrl(path, expiresIn);
  
  if (error) throw error;
  
  return data.signedUrl;
}

/**
 * Elimina un logo de una compañía
 * @param {string} logoUrl - URL del logo a eliminar
 */
async function deleteCompanyLogo(logoUrl) {
  if (!logoUrl) return;
  
  // Extraer path de la URL
  const urlParts = logoUrl.split('/object/');
  if (urlParts.length < 2) return;
  
  const path = urlParts[1].split('?')[0];
  
  const { error } = await supabaseClient.storage
    .from(APP_CONFIG.STORAGE.LOGOS)
    .remove([path]);
  
  if (error) console.error('Error eliminando logo:', error);
}

/**
 * Cache para URLs de logos (evita múltiples peticiones)
 */
const logoUrlCache = new Map();

/**
 * Obtiene la URL del logo de una compañía (con caché)
 * @param {string} companyName - Nombre de la compañía
 * @param {string} existingUrl - URL existente (si ya está en BD)
 * @returns {Promise<string|null>} URL del logo
 */
async function getCompanyLogoUrl(companyName, existingUrl = null) {
  if (existingUrl) {
    // Verificar si la URL aún es válida (no ha expirado)
    try {
      const response = await fetch(existingUrl, { method: 'HEAD' });
      if (response.ok) {
        return existingUrl;
      }
    } catch (e) {
      // URL expirada o inválida, generar nueva
    }
  }
  
  const userId = getCurrentUserId();
  if (!userId) return null;
  
  const safeCompanyName = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const path = `${userId}/${safeCompanyName}/logo.png`;
  
  // Verificar si existe el archivo
  const { data: files } = await supabaseClient.storage
    .from(APP_CONFIG.STORAGE.LOGOS)
    .list(userId, { limit: 100 });
  
  if (!files || !files.find(f => f.name === path)) {
    return null;
  }
  
  return await getSignedLogoUrl(path);
}

// Exportar funciones globales
window.uploadCompanyLogo = uploadCompanyLogo;
window.getSignedLogoUrl = getSignedLogoUrl;
window.deleteCompanyLogo = deleteCompanyLogo;
window.getCompanyLogoUrl = getCompanyLogoUrl;