/**
 * ============================================
 * STORAGE - CONTROL SEGUROS AAA
 * ============================================
 *
 * Gestión de logos en Supabase Storage.
 * URLs firmadas para mayor seguridad.
 */

const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg'];

/**
 * Normaliza el nombre de compañía para usarlo como carpeta.
 * @param {string} companyName
 * @returns {string}
 */
function getSafeCompanyName(companyName) {
  return String(companyName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Obtiene el path base de logos de una compañía.
 * @param {string} companyName
 * @returns {string}
 */
function getCompanyLogoFolder(companyName) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Usuario no autenticado');

  const safeCompanyName = getSafeCompanyName(companyName);
  if (!safeCompanyName) throw new Error('Nombre de compañía no válido');

  return `${userId}/${safeCompanyName}`;
}

/**
 * Sube un logo para una compañía
 * @param {string} companyName - Nombre de la compañía
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} URL firmada del logo
 */
async function uploadCompanyLogo(companyName, file) {
  const userId = getCurrentUserId();

  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  // Validar archivo
  const validation = validateLogoFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const fileExt = file.name.split('.').pop().toLowerCase();
  const folder = getCompanyLogoFolder(companyName);
  const fileName = `${folder}/logo.${fileExt}`;

  // Limpiar logos anteriores de la misma compañía para evitar duplicados .png/.jpg/.svg
  await removeExistingCompanyLogos(companyName);

  // Subir archivo
  const { error } = await supabaseClient.storage
    .from(APP_CONFIG.STORAGE.LOGOS)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw error;
  }

  // Generar URL firmada
  return await getSignedLogoUrl(fileName);
}

/**
 * Elimina posibles logos anteriores de una compañía.
 * @param {string} companyName
 */
async function removeExistingCompanyLogos(companyName) {
  try {
    const folder = getCompanyLogoFolder(companyName);

    const paths = LOGO_EXTENSIONS.map(ext => `${folder}/logo.${ext}`);

    const { error } = await supabaseClient.storage
      .from(APP_CONFIG.STORAGE.LOGOS)
      .remove(paths);

    // Ignorar errores menores porque puede que no existan archivos previos
    if (error) {
      console.warn('No se pudieron limpiar logos anteriores:', error.message);
    }
  } catch (error) {
    console.warn('Error preparando limpieza de logos:', error.message);
  }
}

/**
 * Obtiene una URL firmada para un logo
 * @param {string} path - Ruta del archivo en storage
 * @param {number} expiresIn - Segundos de validez
 * @returns {Promise<string>} URL firmada
 */
async function getSignedLogoUrl(path, expiresIn = 3600) {
  const { data, error } = await supabaseClient.storage
    .from(APP_CONFIG.STORAGE.LOGOS)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

/**
 * Intenta extraer el path interno desde una URL firmada de Supabase.
 * @param {string} logoUrl
 * @returns {string|null}
 */
function extractStoragePathFromSignedUrl(logoUrl) {
  if (!logoUrl) return null;

  try {
    const url = new URL(logoUrl);
    const marker = `/storage/v1/object/sign/${APP_CONFIG.STORAGE.LOGOS}/`;
    const index = url.pathname.indexOf(marker);

    if (index === -1) return null;

    const encodedPath = url.pathname.slice(index + marker.length);
    return decodeURIComponent(encodedPath);
  } catch (error) {
    return null;
  }
}

/**
 * Elimina un logo de una compañía
 * @param {string} logoUrl - URL del logo a eliminar
 */
async function deleteCompanyLogo(logoUrl) {
  if (!logoUrl) return;

  const path = extractStoragePathFromSignedUrl(logoUrl);

  if (!path) {
    console.warn('No se pudo extraer el path del logo para eliminarlo');
    return;
  }

  const { error } = await supabaseClient.storage
    .from(APP_CONFIG.STORAGE.LOGOS)
    .remove([path]);

  if (error) {
    console.error('Error eliminando logo:', error);
  }
}

/**
 * Cache para URLs de logos
 */
const logoUrlCache = new Map();

/**
 * Busca el path real del logo de una compañía probando extensiones permitidas.
 * @param {string} companyName
 * @returns {Promise<string|null>}
 */
async function findCompanyLogoPath(companyName) {
  const folder = getCompanyLogoFolder(companyName);

  const { data: files, error } = await supabaseClient.storage
    .from(APP_CONFIG.STORAGE.LOGOS)
    .list(folder, {
      limit: 20,
      sortBy: {
        column: 'name',
        order: 'asc'
      }
    });

  if (error) {
    console.warn('Error listando logos:', error.message);
    return null;
  }

  if (!files || files.length === 0) {
    return null;
  }

  const logoFile = files.find(file => /^logo\.(png|jpg|jpeg|svg)$/i.test(file.name));

  if (!logoFile) {
    return null;
  }

  return `${folder}/${logoFile.name}`;
}

/**
 * Obtiene la URL del logo de una compañía con caché.
 * @param {string} companyName - Nombre de la compañía
 * @param {string} existingUrl - URL existente si ya está en BD
 * @returns {Promise<string|null>} URL del logo
 */
async function getCompanyLogoUrl(companyName, existingUrl = null) {
  const cacheKey = getSafeCompanyName(companyName);

  if (logoUrlCache.has(cacheKey)) {
    return logoUrlCache.get(cacheKey);
  }

  // Primero intenta reutilizar la URL existente si sigue viva
  if (existingUrl) {
    try {
      const response = await fetch(existingUrl, { method: 'HEAD' });

      if (response.ok) {
        logoUrlCache.set(cacheKey, existingUrl);
        return existingUrl;
      }
    } catch (error) {
      // URL expirada o inaccesible, se regenerará
    }
  }

  const userId = getCurrentUserId();
  if (!userId) {
    return null;
  }

  const path = await findCompanyLogoPath(companyName);

  if (!path) {
    return null;
  }

  const signedUrl = await getSignedLogoUrl(path);
  logoUrlCache.set(cacheKey, signedUrl);

  return signedUrl;
}

// Exportar funciones globales
window.uploadCompanyLogo = uploadCompanyLogo;
window.getSignedLogoUrl = getSignedLogoUrl;
window.deleteCompanyLogo = deleteCompanyLogo;
window.getCompanyLogoUrl = getCompanyLogoUrl;
window.findCompanyLogoPath = findCompanyLogoPath;
window.extractStoragePathFromSignedUrl = extractStoragePathFromSignedUrl;