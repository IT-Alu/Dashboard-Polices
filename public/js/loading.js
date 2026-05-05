/**
 * ============================================
 * LOADING - CONTROL SEGUROS AAA
 * ============================================
 * 
 * Estados de carga y skeleton loading.
 */

/**
 * Muestra skeleton loading en las tarjetas
 * @param {string} containerId - ID del contenedor
 */
function showSkeletonLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.classList.add('loading');
  
  // Añadir skeleton si no existe
  if (!container.querySelector('.skeleton')) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.innerHTML = `
      <div class="skeleton-line" style="width: 80%; height: 20px;"></div>
      <div class="skeleton-line" style="width: 60%; height: 16px;"></div>
      <div class="skeleton-line" style="width: 90%; height: 24px;"></div>
    `;
    container.appendChild(skeleton);
  }
}

/**
 * Oculta skeleton loading
 * @param {string} containerId - ID del contenedor
 */
function hideSkeletonLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.classList.remove('loading');
  
  // Eliminar skeleton
  const skeleton = container.querySelector('.skeleton');
  if (skeleton) skeleton.remove();
}

/**
 * Muestra loading en todo el dashboard
 */
function showDashboardLoading() {
  showSkeletonLoading('kpiGrid');
  showSkeletonLoading('barChart');
  showSkeletonLoading('renewalsList');
  showSkeletonLoading('companySummaryList');
  showSkeletonLoading('topPoliciesList');
}

/**
 * Oculta loading del dashboard
 */
function hideDashboardLoading() {
  hideSkeletonLoading('kpiGrid');
  hideSkeletonLoading('barChart');
  hideSkeletonLoading('renewalsList');
  hideSkeletonLoading('companySummaryList');
  hideSkeletonLoading('topPoliciesList');
}

/**
 * Muestra loading en la tabla de pólizas
 */
function showTableLoading() {
  const tbody = document.getElementById('policiesTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="11">
        <div class="skeleton" style="padding: 20px;">
          <div class="skeleton-line" style="width: 100%; height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton-line" style="width: 100%; height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton-line" style="width: 100%; height: 20px;"></div>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Oculta loading de la tabla
 */
function hideTableLoading() {
  // El loading se reemplaza con los datos reales
}

/**
 * Muestra loading en el calendario
 */
function showCalendarLoading() {
  const container = document.getElementById('calendarList');
  if (!container) return;
  
  container.innerHTML = `
    <tr>
      <td colspan="13">
        <div class="skeleton" style="padding: 40px;">
          <div class="skeleton-line" style="width: 100%; height: 30px; margin-bottom: 12px;"></div>
          <div class="skeleton-line" style="width: 100%; height: 30px; margin-bottom: 12px;"></div>
          <div class="skeleton-line" style="width: 100%; height: 30px;"></div>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Oculta loading del calendario
 */
function hideCalendarLoading() {
  // El loading se reemplaza con los datos reales
}

/**
 * Muestra un spinner de carga
 * @param {string} containerId - ID del contenedor
 */
function showSpinner(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; padding: 40px;">
      <div style="width: 40px; height: 40px; border: 3px solid var(--surface-2); border-top-color: var(--purple); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    </div>
  `;
}

/**
 * Oculta spinner
 * @param {string} containerId - ID del contenedor
 */
function hideSpinner(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // El contenido se reemplaza con los datos reales
}

// Exportar funciones globales
window.showSkeletonLoading = showSkeletonLoading;
window.hideSkeletonLoading = hideSkeletonLoading;
window.showDashboardLoading = showDashboardLoading;
window.hideDashboardLoading = hideDashboardLoading;
window.showTableLoading = showTableLoading;
window.hideTableLoading = hideTableLoading;
window.showCalendarLoading = showCalendarLoading;
window.hideCalendarLoading = hideCalendarLoading;
window.showSpinner = showSpinner;
window.hideSpinner = hideSpinner;