/**
 * ============================================
 * PÓLIZAS - CONTROL SEGUROS AAA
 * ============================================
 * 
 * CRUD de pólizas con Supabase.
 * Crear, leer, actualizar y eliminar pólizas.
 */

/**
 * Obtiene todas las pólizas del usuario
 * @returns {Promise<object[]>} Lista de pólizas
 */
async function fetchPolicies() {
  try {
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.POLICIES)
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching policies:', error);
    return [];
  }
}

/**
 * Obtiene las pólizas de un año específico
 * @param {number} year - Año
 * @returns {Promise<object[]>} Lista de pólizas
 */
async function fetchPoliciesByYear(year) {
  try {
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.POLICIES)
      .select('*')
      .eq('year', year)
      .is('deleted_at', null)
      .order('end_date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching policies by year:', error);
    return [];
  }
}

/**
 * Crea una nueva póliza
 * @param {object} policyData - Datos de la póliza
 * @returns {Promise<object>} Póliza creada
 */
async function createPolicy(policyData, retryCount = 0) {
  try {
    console.log('Intentando crear póliza:', policyData);
    console.log('currentUserId:', getCurrentUserId());

    const dataToInsert = { ...policyData };
    delete dataToInsert.id;
    
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.POLICIES)
      .insert([dataToInsert])
      .select()
      .single();
    
    if (error) {
      console.error('Error en insert:', error);
      throw error;
    }
    
    console.log('Póliza creada:', data);
    return data;
  } catch (error) {
    console.error('Excepción en createPolicy:', error);
    if (retryCount < 2 && (error.message?.includes('network') || error.code === 'PGRST301')) {
      console.log('Reintentando...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return createPolicy(policyData, retryCount + 1);
    }
    handleError(error);
  }
}

/**
 * Actualiza una póliza existente
 * @param {string} id - ID de la póliza (UUID)
 * @param {object} updates - Campos a actualizar
 * @returns {Promise<object>} Póliza actualizada
 */
async function updatePolicy(id, updates) {
  try {
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.POLICIES)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Elimina una póliza (soft delete)
 * @param {string} id - ID de la póliza (UUID)
 */
async function deletePolicy(id) {
  if (!confirm('Estàs segur que vols eliminar aquesta pòlissa?')) return;

  try {
    const { error } = await supabaseClient
      .from(APP_CONFIG.TABLES.POLICIES)
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) throw error;

    toast('Pòlissa eliminada correctament', 'success');
    // Eliminar localment i redibuixar (més ràpid que recarregar tot)
    appState.policies = appState.policies.filter(p => p.id !== id);
    if (typeof renderAll === 'function') renderAll();
  } catch (error) {
    handleError(error);
  }
}

/**
 * Obtiene una póliza por su ID
 * @param {string} id - ID de la póliza (UUID)
 * @returns {Promise<object|null>} Póliza
 */
async function getPolicyById(id) {
  try {
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.POLICIES)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching policy:', error);
    return null;
  }
}

/**
 * Busca pólizas por término
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Promise<object[]>} Pólizas encontradas
 */
async function searchPolicies(searchTerm) {
  try {
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.POLICIES)
      .select('*')
      .is('deleted_at', null)
      .or(`policy_id.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,concept.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error searching policies:', error);
    return [];
  }
}

/**
 * Filtra pólizas por compañía
 * @param {string} company - Nombre de la compañía
 * @returns {Promise<object[]>} Pólizas filtradas
 */
async function filterPoliciesByCompany(company) {
  try {
    const { data, error } = await supabaseClient
      .from(APP_CONFIG.TABLES.POLICIES)
      .select('*')
      .is('deleted_at', null);
    
    if (error) throw error;
    
    return company ? data.filter(p => p.company === company) : data;
  } catch (error) {
    console.error('Error filtering policies:', error);
    return [];
  }
}

/**
 * Obtiene métricas del dashboard
 * @param {number} year - Año
 * @returns {Promise<object>} Métricas
 */
async function getDashboardMetrics(year) {
  try {
    const policies = await fetchPoliciesByYear(year);
    
    const total = policies.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const policiesCount = policies.length;
    const companies = new Set(policies.map(p => p.company)).size;
    const renewals = policies.filter(p => {
      const days = daysUntil(p.end_date, p.status);
      return p.status === 'ACTIVA' && days !== null && days >= 0 && days <= 60;
    }).length;
    
    return {
      total,
      policies: policiesCount,
      companies,
      renewals,
      avg: policiesCount ? total / policiesCount : 0
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    return { total: 0, policies: 0, companies: 0, renewals: 0, avg: 0 };
  }
}

/**
 * Agrupa pólizas por compañía
 * @param {number} year - Año
 * @returns {Promise<object[]>} Resumen por compañía
 */
async function getCompanySummary(year) {
  try {
    const policies = await fetchPoliciesByYear(year);
    const map = new Map();
    
    policies.forEach(item => {
      const key = item.company || 'SIN COMPAÑÍA';
      if (!map.has(key)) {
        map.set(key, { company: key, amount: 0, count: 0, ids: new Set() });
      }
      const entry = map.get(key);
      entry.amount += Number(item.amount || 0);
      entry.count += 1;
      if (item.id) entry.ids.add(item.id);
    });
    
    return [...map.values()]
      .map(v => ({ ...v, uniquePolicies: v.ids.size }))
      .sort((a, b) => b.amount - a.amount);
  } catch (error) {
    console.error('Error getting company summary:', error);
    return [];
  }
}

/**
 * Obtiene las pólizas próximas a vencer
 * @param {number} days - Días máximos
 * @returns {Promise<object[]>} Pólizas próximas
 */
async function getUpcomingRenewals(days = 60) {
  try {
    const policies = await fetchPolicies();
    
    return policies
      .map(item => ({ ...item, daysLeft: daysUntil(item.end_date, item.status) }))
      .filter(item => item.status === 'ACTIVA' && item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= days)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8);
  } catch (error) {
    console.error('Error getting upcoming renewals:', error);
    return [];
  }
}

/**
 * Obtiene el top 5 pólizas por importe
 * @param {number} year - Año
 * @returns {Promise<object[]>} Top pólizas
 */
async function getTopPolicies(year) {
  try {
    const policies = await fetchPoliciesByYear(year);
    return policies
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);
  } catch (error) {
    console.error('Error getting top policies:', error);
    return [];
  }
}

/**
 * Valida los datos de una póliza
 * @param {object} policy - Datos de la póliza
 * @returns {object[]} Errores de validación
 */
function validatePolicy(policy) {
  const errors = [];
  
  if (!policy.policy_id) errors.push({ id: 'f_id', message: 'El ID de póliza es obligatorio.' });
  if (!policy.accounting_account) errors.push({ id: 'f_accounting_account', message: 'La cuenta contable es obligatoria.' });
  if (!policy.company) errors.push({ id: 'f_company', message: 'La compañía es obligatoria.' });
  if (!policy.concept) errors.push({ id: 'f_concept', message: 'El concepto es obligatorio.' });
  if (!policy.amount || Number(policy.amount) <= 0) errors.push({ id: 'f_amount', message: 'El importe debe ser mayor que 0.' });
  if (!policy.year) errors.push({ id: 'f_year', message: 'El año es obligatorio.' });
  
  if (policy.start_date && policy.end_date && parseDate(policy.start_date) > parseDate(policy.end_date)) {
    errors.push({ id: 'f_end_date', message: 'La fecha de fin debe ser posterior a la fecha de inicio.' });
  }
  
  return errors;
}

/**
 * Normaliza los datos de una póliza
 * @param {object} record - Datos crudos
 * @returns {object} Datos normalizados
 */
function normalizePolicy(record) {
  // Si el usuario escribió un policy_id personalizado, respetarlo
  // Si no, generar uno automáticamente
  const policyId = record.policy_id && record.policy_id.trim() 
    ? record.policy_id.trim() 
    : generatePolicyId();
  
  return {
    user_id: getCurrentUserId(),
    id: record.id || undefined,  // Solo incluir si existe (UUID de Supabase)
    policy_id: policyId,  // ID personalizado o generado
    accounting_account: sanitizeText(record.accounting_account),
    company: sanitizeText(record.company).toUpperCase(),
    broker: sanitizeText(record.broker),
    concept: sanitizeText(record.concept),
    policy_number: sanitizeText(record.policy_number),
    payment_frequency: sanitizeText(record.payment_frequency).toUpperCase(),
    start_date: toISODate(record.start_date) || null,
    end_date: toISODate(record.end_date) || null,
    amount: Number(String(record.amount || '0').replace(/\./g, '').replace(',', '.')) || 0,
    year: Number(record.year) || new Date().getFullYear(),
    status: sanitizeText(record.status || suggestStatus(record)).toUpperCase(),
    notes: sanitizeText(record.notes),
    company_logo_path: record.company_logo_path
  };
}

// Exportar funciones globales
window.fetchPolicies = fetchPolicies;
window.fetchPoliciesByYear = fetchPoliciesByYear;
window.createPolicy = createPolicy;
window.updatePolicy = updatePolicy;
window.deletePolicy = deletePolicy;
window.getPolicyById = getPolicyById;
window.searchPolicies = searchPolicies;
window.filterPoliciesByCompany = filterPoliciesByCompany;
window.getDashboardMetrics = getDashboardMetrics;
window.getCompanySummary = getCompanySummary;
window.getUpcomingRenewals = getUpcomingRenewals;
window.getTopPolicies = getTopPolicies;
window.validatePolicy = validatePolicy;
window.normalizePolicy = normalizePolicy;