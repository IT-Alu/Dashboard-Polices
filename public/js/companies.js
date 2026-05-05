/**
 * ============================================
 * COMPAÑÍAS - CONTROL SEGUROS AAA
 * ============================================
 * 
 * Gestión de compañías y logos con Supabase.
 */

/**
 * Obtiene todas las compañías del usuario
 * @returns {Promise<object[]>} Lista de compañías
 */
async function fetchCompanies() {
  try {
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.COMPANIES)
      .select('*')
      .is('deleted_at', null)
      .order('name');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
}

/**
 * Crea o actualiza una compañía
 * @param {object} companyData - Datos de la compañía
 * @returns {Promise<object>} Compañía guardada
 */
async function saveCompany(companyData) {
  try {
    // Verificar si ya existe
    const existing = await getCompanyByName(companyData.name);
    
    if (existing) {
      // Actualizar
      const { data, error } = await supabaseClient
        .from(APP_CONFIG.TABLES.COMPANIES)
        .update(companyData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Crear
      const { data, error } = await supabaseClient
        .from(APP_CONFIG.TABLES.COMPANIES)
        .insert([companyData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Obtiene una compañía por nombre
 * @param {string} name - Nombre de la compañía
 * @returns {Promise<object|null>} Compañía
 */
async function getCompanyByName(name) {
  try {
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.COMPANIES)
      .select('*')
      .eq('name', name.toUpperCase())
      .is('deleted_at', null)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return data || null;
  } catch (error) {
    console.error('Error fetching company:', error);
    return null;
  }
}

/**
 * Guarda el logo de una compañía
 * @param {string} companyName - Nombre de la compañía
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} URL del logo
 */
async function saveCompanyLogo(companyName, file) {
  try {
    // Subir logo
    const logoUrl = await uploadCompanyLogo(companyName, file);
    
    // Guardar o actualizar compañía con la URL
    const companyData = {
      name: companyName.toUpperCase(),
      logo_url: logoUrl,
      logo_mime_type: file.type,
      logo_file_name: file.name
    };
    
    await saveCompany(companyData);
    
    return logoUrl;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Elimina el logo de una compañía
 * @param {string} companyName - Nombre de la compañía
 */
async function deleteCompanyLogoFromDb(companyName) {
  try {
    const company = await getCompanyByName(companyName);
    if (company && company.logo_url) {
      // Eliminar archivo del storage
      await deleteCompanyLogo(company.logo_url);
      
      // Actualizar compañía
      await supabaseClient
        .from(APP_CONFIG.TABLES.COMPANIES)
        .update({ 
          logo_url: null, 
          logo_mime_type: null, 
          logo_file_name: null 
        })
        .eq('id', company.id);
    }
  } catch (error) {
    console.error('Error deleting company logo:', error);
  }
}

/**
 * Obtiene el logo de una compañía (con URL firmada si es necesario)
 * @param {string} companyName - Nombre de la compañía
 * @returns {Promise<{url: string|null, type: string|null}>}
 */
async function getCompanyLogo(companyName) {
  try {
    const company = await getCompanyByName(companyName);
    
    if (!company || !company.logo_url) {
      return { url: null, type: null };
    }
    
    // Verificar si la URL es firmada (temporal) o pública
    // Las URLs firmadas expiran, así que generamos una nueva si es necesario
    const isSignedUrl = company.logo_url.includes('X-Amz-Signature') || 
                        company.logo_url.includes('expires=');
    
    if (isSignedUrl) {
      // Verificar si aún es válida
      try {
        const response = await fetch(company.logo_url, { method: 'HEAD' });
        if (response.ok) {
          return { url: company.logo_url, type: company.logo_mime_type };
        }
      } catch (e) {
        // URL expirada, generar nueva
      }
      
      // Extraer path y generar nueva URL firmada
      const urlParts = company.logo_url.split('/object/');
      if (urlParts.length >= 2) {
        const path = urlParts[1].split('?')[0];
        const newUrl = await getSignedLogoUrl(path);
        return { url: newUrl, type: company.logo_mime_type };
      }
    }
    
    return { url: company.logo_url, type: company.logo_mime_type };
  } catch (error) {
    console.error('Error getting company logo:', error);
    return { url: null, type: null };
  }
}

/**
 * Obtiene todas las compañías con sus logos
 * @returns {Promise<object[]>} Compañías con logos
 */
async function getCompaniesWithLogos() {
  try {
    const companies = await fetchCompanies();
    
    // Obtener logos para cada compañía
    for (const company of companies) {
      if (company.logo_url) {
        const logoData = await getCompanyLogo(company.name);
        company.logo_url = logoData.url;
        company.logo_mime_type = logoData.type;
      }
    }
    
    return companies;
  } catch (error) {
    console.error('Error getting companies with logos:', error);
    return [];
  }
}

// Exportar funciones globales
window.fetchCompanies = fetchCompanies;
window.saveCompany = saveCompany;
window.getCompanyByName = getCompanyByName;
window.saveCompanyLogo = saveCompanyLogo;
window.deleteCompanyLogoFromDb = deleteCompanyLogoFromDb;
window.getCompanyLogo = getCompanyLogo;
window.getCompaniesWithLogos = getCompaniesWithLogos;