/**
 * ============================================
 * MIGRACIÓN - CONTROL SEGUROS AAA
 * ============================================
 * 
 * Migración de datos desde localStorage a Supabase.
 * Control de duplicados y manejo de errores.
 */

/**
 * Verifica si hay datos en localStorage para migrar
 * @returns {boolean} True si hay datos para migrar
 */
function hasLocalDataToMigrate() {
  const localPolicies = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.POLICIES);
  return localPolicies && localStorage.getItem(APP_CONFIG.STORAGE_KEYS.MIGRATED) !== 'true';
}

/**
 * Obtiene los datos locales del localStorage
 * @returns {object} { policies: [], companies: {} }
 */
function getLocalData() {
  try {
    const policiesStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.POLICIES);
    const companiesStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.COMPANIES);
    
    return {
      policies: policiesStr ? JSON.parse(policiesStr) : [],
      companies: companiesStr ? JSON.parse(companiesStr) : {}
    };
  } catch (error) {
    console.error('Error reading local data:', error);
    return { policies: [], companies: {} };
  }
}

/**
 * Migración principal de localStorage a Supabase
 */
async function migrateFromLocalStorage() {
  // Verificar si ya está autenticado
  if (!isAuthenticated()) {
    console.log('Usuario no autenticado, esperando...');
    return;
  }
  
  // Verificar si hay datos para migrar
  if (!hasLocalDataToMigrate()) {
    console.log('No hay datos para migrar o ya fue migrado');
    return;
  }
  
  console.log('Iniciando migración de datos locales...');
  
  try {
    const localData = getLocalData();
    const { policies, companies } = localData;
    
    if (!policies.length) {
      markMigrationComplete();
      return;
    }
    
    // 1. Migrar compañías y logos primero
    console.log(`Migrando ${Object.keys(companies).length} compañías...`);
    for (const [companyName, companyData] of Object.entries(companies)) {
      if (companyData.logoDataUrl) {
        try {
          // Convertir base64 a File
          const response = await fetch(companyData.logoDataUrl);
          const blob = await response.blob();
          const file = new File([blob], 'logo.png', { type: companyData.logoMimeType || 'image/png' });
          
          // Subir logo a Storage
          const logoUrl = await saveCompanyLogo(companyName, file);
          console.log(`Logo subido para ${companyName}:`, logoUrl);
          
        } catch (error) {
          console.error(`Error subiendo logo de ${companyName}:`, error);
        }
      }
    }
    
    // 2. Migrar pólizas en lotes de 50
    console.log(`Migrando ${policies.length} pólizas...`);
    const batchSize = 50;
    let migratedCount = 0;
    
    for (let i = 0; i < policies.length; i += batchSize) {
      const batch = policies.slice(i, i + batchSize);
      
      // Normalizar datos
      const policiesToInsert = batch.map(policy => ({
        policy_id: policy.id, // El ID local se convierte en policy_id
        accounting_account: policy.accountingAccount,
        company: policy.company,
        broker: policy.broker,
        concept: policy.concept,
        policy_number: policy.policyNumber,
        start_date: toISODate(policy.startDate),
        end_date: toISODate(policy.endDate),
        payment_frequency: policy.paymentFrequency,
        amount: policy.amount,
        year: policy.year,
        status: policy.status,
        notes: policy.notes
      }));
      
      // Insertar con upsert para evitar duplicados
      const { error } = await supabaseClient
        .from(APP_CONFIG.TABLES.POLICIES)
        .upsert(policiesToInsert, {
          onConflict: 'policy_id' // Usar policy_id como clave de conflicto
        });
      
      if (error) {
        console.error(`Error en lote ${i / batchSize}:`, error);
        // Continuar con el siguiente lote
      } else {
        migratedCount += batch.length;
        console.log(`Lote completado: ${migratedCount}/${policies.length} pólizas migradas`);
      }
      
      // Pequeña pausa entre lotes para no saturar
      if (i + batchSize < policies.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 3. Marcar migración como completada
    markMigrationComplete();
    
    console.log(`✅ Migración completada: ${migratedCount} pólizas migradas`);
    toast(`✅ ${migratedCount} pólizas migradas correctamente`, 'success');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    toast('Error en la migración de datos', 'error');
  }
}

/**
 * Marca la migración como completada en localStorage
 */
function markMigrationComplete() {
  localStorage.setItem(APP_CONFIG.STORAGE_KEYS.MIGRATED, 'true');
}

/**
 * Limpia los datos locales después de la migración (opcional)
 */
function clearLocalData() {
  if (confirm('¿Deseas eliminar los datos locales del navegador? (Recomendado si la migración fue exitosa)')) {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.POLICIES);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.COMPANIES);
    toast('Datos locales eliminados', 'info');
  }
}

/**
 * Exporta datos de Supabase a localStorage (backup)
 */
async function exportToLocalStorage() {
  try {
    const policies = await fetchPolicies();
    const companies = await fetchCompanies();
    
    // Convertir a formato localStorage
    const localPolicies = policies.map(p => ({
      id: p.policy_id,
      accountingAccount: p.accounting_account,
      company: p.company,
      broker: p.broker,
      concept: p.concept,
      policyNumber: p.policy_number,
      startDate: p.start_date,
      endDate: p.end_date,
      paymentFrequency: p.payment_frequency,
      amount: p.amount,
      year: p.year,
      status: p.status,
      notes: p.notes
    }));
    
    const localCompanies = {};
    companies.forEach(c => {
      localCompanies[c.name] = {
        name: c.name,
        logoDataUrl: c.logo_url,
        logoMimeType: c.logo_mime_type,
        logoFileName: c.logo_file_name
      };
    });
    
    // Guardar en localStorage
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.POLICIES, JSON.stringify(localPolicies));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.COMPANIES, JSON.stringify(localCompanies));
    
    toast('Backup creado en localStorage', 'success');
    
  } catch (error) {
    console.error('Error creando backup:', error);
    toast('Error creando backup', 'error');
  }
}

/**
 * Verifica y muestra el estado de la migración
 */
function checkMigrationStatus() {
  const migrated = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.MIGRATED) === 'true';
  const localData = getLocalData();
  
  return {
    migrated,
    localPoliciesCount: localData.policies.length,
    localCompaniesCount: Object.keys(localData.companies).length
  };
}

// Exportar funciones globales
window.hasLocalDataToMigrate = hasLocalDataToMigrate;
window.getLocalData = getLocalData;
window.migrateFromLocalStorage = migrateFromLocalStorage;
window.markMigrationComplete = markMigrationComplete;
window.clearLocalData = clearLocalData;
window.exportToLocalStorage = exportToLocalStorage;
window.checkMigrationStatus = checkMigrationStatus;