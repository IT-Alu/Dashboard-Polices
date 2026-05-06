/**
 * ============================================
 * APP - CONTROL SEGUROS AAA
 * ============================================
 * 
 * Lógica principal del dashboard.
 * Inicialización y renderizado.
 */

// Variables de estado
const MONTHS = APP_CONFIG.MONTHS;
const FREQUENCIES = APP_CONFIG.FREQUENCIES;
const KPI_STYLES = APP_CONFIG.KPI_STYLES;

/**
 * Inicializa la aplicación
 */
async function initApp() {
  // Inicializar tabs de autenticación
  initAuthTabs();
  
  // Cargar tema
  loadTheme();
  
  // Cargar datos iniciales
  await loadUserData();
  
  // Renderizar UI
  renderYearSelect();
  renderListsAndSelectors();
  renderDashboard();
  renderPoliciesTable();
  renderCalendar();
  renderPage();
  
  // Bind events
  bindEvents();
  
  // Verificar migración
  if (hasLocalDataToMigrate()) {
    toast('Detectamos datos locales. Migrando a la nube...', 'info');
    await migrateFromLocalStorage();
  }
}

/**
 * Carga los datos del usuario desde Supabase
 */
async function loadUserData() {
  showDashboardLoading();
  
  try {
    // Cargar pólizas
    appState.policies = await fetchPolicies();
    await resolvePolicyLogoUrls(appState.policies);
    
    // Cargar compañías
    const companies = await fetchCompanies();
    appState.companies = {};
    companies.forEach(c => {
      appState.companies[c.name] = c;
    });
    
    hideDashboardLoading();
  } catch (error) {
    console.error('Error loading user data:', error);
    hideDashboardLoading();
    toast('Error cargando datos', 'error');
  }
}

async function resolvePolicyLogoUrls(policies) {
  if (!Array.isArray(policies) || !policies.length) return;

  const pathCache = new Map();
  const promises = policies.map(async policy => {
    const path = policy.company_logo_path;
    if (!path) return;

    if (pathCache.has(path)) {
      policy.company_logo_url = pathCache.get(path);
      return;
    }

    try {
      const signedUrl = await getSignedLogoUrl(path);
      policy.company_logo_url = signedUrl;
      pathCache.set(path, signedUrl);
    } catch (error) {
      console.warn('[logo render] failed to get signed URL for policy', path, error);
      policy.company_logo_url = null;
    }
  });

  await Promise.all(promises);
}

/**
 * Carga el tema desde localStorage
 */
function loadTheme() {
  const savedTheme = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME) || 'dark';
  appState.theme = savedTheme;
  applyTheme();
}

/**
 * Aplica el tema actual
 */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', appState.theme);
  const button = document.getElementById('themeToggle');
  const isDark = appState.theme === 'dark';
  button.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
  button.setAttribute('aria-pressed', String(!isDark));
}

/**
 * Alterna entre tema claro/oscuro
 */
function toggleTheme() {
  appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, appState.theme);
  applyTheme();
  toast('Tema actualizado', 'info');
}

/**
 * Renderiza el selector de años
 */
async function renderYearSelect() {
  const select = document.getElementById('yearSelect');
  const years = new Set(appState.policies.map(p => Number(p.year)).filter(Boolean));
  years.add(new Date().getFullYear());
  years.add(new Date().getFullYear() + 1);
  const ordered = [...years].sort((a, b) => b - a);
  
  select.innerHTML = ordered.map(y => `<option value="${y}">${y}</option>`).join('');
  select.value = String(appState.currentYear);
}

/**
 * Renderiza listas y selectores
 */
function renderListsAndSelectors() {
  const names = getCompanyNames();
  document.getElementById('companiesList').innerHTML = names.map(name => `<option value="${name}"></option>`).join('');
  document.getElementById('brokersList').innerHTML = getBrokerNames().map(name => `<option value="${name}"></option>`).join('');
  
  const companyOptions = ['<option value="">Totes les companyies</option>', ...names.map(name => `<option value="${name}">${name}</option>`)].join('');
  document.getElementById('filterCompany').innerHTML = companyOptions;
  document.getElementById('calendarCompanyFilter').innerHTML = companyOptions;
  
  const freqOptions = ['<option value="">Todas las frecuencias</option>', ...FREQUENCIES.map(name => `<option value="${name}">${name}</option>`)].join('');
  document.getElementById('filterFrequency').innerHTML = freqOptions;
  document.getElementById('f_paymentFrequency').innerHTML = ['<option value="">Selecciona frecuencia</option>', ...FREQUENCIES.map(name => `<option value="${name}">${name}</option>`)].join('');
  
  document.getElementById('filterCompany').value = appState.filters.company;
  document.getElementById('calendarCompanyFilter').value = appState.calendarFilters.company;
  document.getElementById('filterFrequency').value = appState.filters.frequency;
}

/**
 * Renderiza el dashboard
 */
async function renderDashboard() {
  const metrics = await getDashboardMetrics(appState.currentYear);
  
  const kpis = [
    ['Total primes any', formatCurrency(metrics.total), 'Importes contabilitzats'],
    ['Pòlisses de l’any', String(metrics.policies), 'IDs únics actius/vigents'],
    ['Vencen ≤ 60 dies', String(metrics.renewals), 'Pòlisses actives properes'],
    ['Companyies actives', String(metrics.companies), 'En l’any seleccionat'],
    ['Prima mitjana', formatCurrency(metrics.avg), 'Per pòlissa única']
  ];
  
  document.getElementById('kpiGrid').innerHTML = kpis.map(([label, value, foot], index) => {
    const style = KPI_STYLES[index % KPI_STYLES.length];
    return `<article class="card kpi-card" style="--accent:${style.color}" aria-label="${label}: ${value}">
      <div class="kpi-icon" aria-hidden="true">${style.icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-foot">${foot}</div>
    </article>`;
  }).join('');
  
  // Banner de renovaciones
  const renewals = await getUpcomingRenewals(60);
  const banner = document.getElementById('renewalBanner');
  if (renewals.length) {
    banner.hidden = false;
    document.getElementById('renewalBannerText').textContent = `Hi ha ${renewals.length} pòlissa(es) que vencen en 60 dies o menys.`;
  } else {
    banner.hidden = true;
  }
  
  // Gráfico por compañía
  const companyData = await getCompanySummary(appState.currentYear);
  renderCompanyChart(companyData);
  
  // Renovaciones
  renderRenewals(renewals);
  
  // Resumen por compañía
  renderCompanySummary(companyData);
  
  // Top pólizas
  renderTopPolicies();
}

/**
 * Renderiza el gráfico de compañías
 */
function renderCompanyChart(companyData) {
  const container = document.getElementById('barChart');
  const summary = document.getElementById('chartSummary');
  const tableBody = document.getElementById('chartTableBody');
  
  if (!companyData.length) {
    container.innerHTML = '<div class="empty-state">No hi ha dades per l\'any seleccionat.</div>';
    summary.textContent = 'Sense dades disponibles.';
    tableBody.innerHTML = '';
    return;
  }
  
  const total = companyData.reduce((s, i) => s + i.amount, 0);
  const max = companyData[0].amount || 1;
  const top = companyData[0];
  
  summary.textContent = `${top.company} concentra el mayor gasto del año con ${formatCurrency(top.amount)} (${Math.round((top.amount / total) * 100)}% del total).`;
  
  container.innerHTML = companyData.slice(0, 8).map((item, index) => {
    const height = Math.max(20, Math.round((item.amount / max) * 180));
    const percent = total ? ((item.amount / total) * 100).toFixed(1) : '0.0';
    const color = APP_CONFIG.ACCENT_COLORS[index % APP_CONFIG.ACCENT_COLORS.length];
    return `<div class="bar-card">
      <div class="bar-value mono">${formatCurrency(item.amount)}</div>
      <button class="bar-btn" type="button" style="height:${height}px; --accent-color:${color}" aria-label="${item.company}. Importe ${formatCurrency(item.amount)}. ${percent}% del total anual." title="${item.company}: ${formatCurrency(item.amount)} (${percent}%)"></button>
      <div class="bar-label">${item.company}</div>
      <div class="bar-percent mono">${percent}%</div>
    </div>`;
  }).join('');
  
  tableBody.innerHTML = companyData.map(item => {
    const percent = total ? ((item.amount / total) * 100).toFixed(1) : '0.0';
    return `<tr><td>${item.company}</td><td class="mono">${formatCurrency(item.amount)}</td><td class="mono">${percent}%</td></tr>`;
  }).join('');
}

/**
 * Renderiza lista de renovaciones
 */
function renderRenewals(renewals) {
  const container = document.getElementById('renewalsList');
  if (!renewals.length) {
    container.innerHTML = '<div class="empty-state">No hi ha renovacions previstes en els pròxims 90 dies.</div>';
    return;
  }
  
  container.innerHTML = renewals.map(item => `
    <article class="renewal-item">
      <div class="days-chip">${item.daysLeft} d</div>
      <div><strong>${item.policy_id}</strong><br><span class="muted">${item.company} · ${item.concept || 'Sense concepte'} · Vence ${formatDate(item.end_date)}</span></div>
      <div class="mono">${formatCurrency(item.amount)}</div>
    </article>
  `).join('');
}

/**
 * Renderiza resumen por compañía
 */
function renderCompanySummary(companyData) {
  const container = document.getElementById('companySummaryList');
  if (!companyData.length) {
    container.innerHTML = '<li class="empty-state">Sense dades</li>';
    return;
  }
  
  const total = companyData.reduce((s, i) => s + i.amount, 0);
  container.innerHTML = companyData.map(item => {
    const color = companyAccent(item.company);
    return `<li style="border-left:6px solid ${color}">
      <span>${item.company}<br><span class="muted">${item.uniquePolicies} pòlisses úniques</span></span>
      <span class="mono">${formatCurrency(item.amount)} · ${Math.round((item.amount / total) * 100)}%</span>
    </li>`;
  }).join('');
}

/**
 * Renderiza top pólizas
 */
async function renderTopPolicies() {
  const container = document.getElementById('topPoliciesList');
  const top = await getTopPolicies(appState.currentYear);
  
  if (!top.length) {
    container.innerHTML = '<li class="empty-state">Sense dades</li>';
    return;
  }
  
  container.innerHTML = top.map((item, index) => `
    <li style="border-left:6px solid ${APP_CONFIG.ACCENT_COLORS[index % APP_CONFIG.ACCENT_COLORS.length]}">
      <span>${item.policy_id} · ${item.company}<br><span class="muted">${item.concept || 'Sense concepte'}</span></span>
      <span class="mono">${formatCurrency(item.amount)}</span>
    </li>
  `).join('');
}

/**
 * Renderiza tabla de pólizas
 */
function renderPoliciesTable() {
  const tbody = document.getElementById('policiesTableBody');
  const data = getFilteredPolicies();
  document.getElementById('resultsCount').textContent = `${data.length} registro(s)`;
  
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state">No s’han trobat pòlisses amb els filtres actuals.</div></td></tr>';
    document.getElementById('policiesPagination').innerHTML = '';
    return;
  }
  
  const totalPages = Math.max(1, Math.ceil(data.length / appState.pageSize));
  if (appState.page > totalPages) appState.page = totalPages;
  const start = (appState.page - 1) * appState.pageSize;
  const pageData = data.slice(start, start + appState.pageSize);
  
  tbody.innerHTML = pageData.map(item => {
    const days = daysUntil(item.end_date, item.status);
    const accent = companyAccent(item.company);
    return `<tr style="box-shadow: inset 4px 0 0 ${accent};">
      <td class="mono">${item.policy_id || '—'}</td>
      <td><div class="company-cell">${logoHTML(item.company, item.company_logo_url)}<div><strong>${item.company || '—'}</strong><br><span class="muted">${item.broker || 'Sense mediador'}</span><br><span class="company-pill">${item.company || 'Companyia'}</span></div></div></td>
      <td>${item.concept || '—'}</td>
      <td class="mono">${item.policy_number || '—'}</td>
      <td>${formatDate(item.start_date)}</td>
      <td>${formatDate(item.end_date)}</td>
      <td>${frequencyBadge(item.payment_frequency)}</td>
      <td class="mono">${formatCurrency(item.amount)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>${daysBadge(days, item.status)}</td>
      <td><div class="actions-cell">
        <button class="btn action-view" type="button" data-action="view" data-id="${item.id}" aria-label="Veure detall de la pòlissa ${item.policy_id || '—'}">Veure</button>
        <button class="btn action-edit" type="button" data-action="edit" data-id="${item.id}" aria-label="Editar la pòlissa ${item.policy_id || '—'}">Editar</button>
        <button class="btn action-delete" type="button" data-action="delete" data-id="${item.id}" aria-label="Eliminar la pòlissa ${item.policy_id || '—'}">Eliminar</button>
      </div></td>
    </tr>`;
  }).join('');
  
  document.getElementById('policiesPagination').innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `<button class="btn" type="button" data-page-number="${page}" ${page === appState.page ? 'data-variant="primary"' : ''}>${page}</button>`;
  }).join('');
}

/**
 * Obtiene pólizas filtradas
 */
function getFilteredPolicies() {
  let data = appState.policies.filter(item => {
    const search = appState.filters.search.trim().toLowerCase();
    if (appState.filters.company && item.company !== appState.filters.company) return false;
    if (appState.filters.status && item.status !== appState.filters.status) return false;
    if (appState.filters.frequency && item.payment_frequency !== appState.filters.frequency) return false;
    if (search) {
      const haystack = [item.policy_id, item.company, item.broker, item.concept, item.policy_number, item.accounting_account].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
  
  const { field, direction } = appState.sort;
  data.sort((a, b) => {
    let va = a[field], vb = b[field];
    if (field === 'amount' || field === 'year') {
      va = Number(va || 0);
      vb = Number(vb || 0);
    } else if (field === 'start_date' || field === 'end_date') {
      va = parseDate(va)?.getTime() || 0;
      vb = parseDate(vb)?.getTime() || 0;
    } else {
      va = String(va || '').toLowerCase();
      vb = String(vb || '').toLowerCase();
    }
    if (va < vb) return direction === 'asc' ? -1 : 1;
    if (va > vb) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  return data;
}

/**
 * Renderiza calendario
 */
function renderCalendar() {
  const container = document.getElementById('calendarList');
  const head = document.getElementById('calendarHead');
  const year = appState.currentYear;
  
  let data = appState.policies.filter(item => Number(item.year) === Number(year));
  if (appState.calendarFilters.company) data = data.filter(item => item.company === appState.calendarFilters.company);
  if (appState.calendarFilters.status) data = data.filter(item => item.status === appState.calendarFilters.status);
  
  head.innerHTML = `<tr class="calendar-quarter-row"><th class="policy-col" rowspan="2">Pòlissa</th><th colspan="3" class="cal-th-q1">1r trimestre</th><th colspan="3" class="cal-th-q2">2n trimestre</th><th colspan="3" class="cal-th-q3">3r trimestre</th><th colspan="3" class="cal-th-q4">4t trimestre</th></tr><tr class="calendar-month-row">${MONTHS.map((month, index) => {
    const cls = index < 3 ? 'cal-th-q1' : index < 6 ? 'cal-th-q2' : index < 9 ? 'cal-th-q3' : 'cal-th-q4';
    return `<th class="${cls}">${month}</th>`;
  }).join('')}</tr>`;
  
  if (!data.length) {
    container.innerHTML = '<tr><td colspan="13"><div class="empty-state">No hi ha pòlisses per mostrar al calendari.</div></td></tr>';
    return;
  }
  
  const getQuarterClass = monthIndex => monthIndex < 3 ? 'cal-month-q1' : monthIndex < 6 ? 'cal-month-q2' : monthIndex < 9 ? 'cal-month-q3' : 'cal-month-q4';
  const getQuarterCode = monthIndex => monthIndex < 3 ? '1T' : monthIndex < 6 ? '2T' : monthIndex < 9 ? '3T' : '4T';
  
  function getCellMeta(item, monthIndex) {
    const start = parseDate(item.start_date);
    const end = parseDate(item.end_date);
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    
    if (!start || !end || start > monthEnd || end < monthStart) return { type: 'empty', cls: 'calendar-month-empty', short: '—', label: `${MONTHS[monthIndex]}: sense cobertura` };
    
    const status = (item.status || '').toUpperCase();
    const days = daysUntil(item.end_date, item.status);
    const frequency = (item.payment_frequency || '').toUpperCase();
    
    if (status === 'ANULADA') return { type: 'cancelled', cls: 'cal-month-cancelled', short: 'AN', label: `${MONTHS[monthIndex]}: pòlissa anulada` };
    if (status === 'VENCIDA' || (days !== null && days < 0)) return { type: 'expired', cls: 'cal-month-expired', short: 'VE', label: `${MONTHS[monthIndex]}: pòlissa vençuda` };
    if (days !== null && days <= 60) return { type: 'renewal', cls: 'cal-month-renewal', short: '≤60', label: `${MONTHS[monthIndex]}: venç en ${days} dies o menys` };
    if (frequency === 'ANUAL') return { type: 'annual', cls: 'cal-month-annual', short: 'AN', label: `${MONTHS[monthIndex]}: pòlissa anual activa` };
    
    const quarterCode = getQuarterCode(monthIndex);
    return { type: 'quarter', cls: getQuarterClass(monthIndex), short: quarterCode, label: `${MONTHS[monthIndex]}: cobertura activa del ${quarterCode}` };
  }
  
  container.innerHTML = data.map(item => {
    const subline = `${item.company || '—'} · ${item.concept || 'Sense concepte'} · ${item.payment_frequency || 'Sense freqüència'}`;
    const monthsHtml = MONTHS.map((_, monthIndex) => {
      const meta = getCellMeta(item, monthIndex);
      if (meta.type === 'empty') return `<td><span class="calendar-month-empty" aria-label="${meta.label}">—</span></td>`;
      return `<td><button type="button" class="calendar-month-btn ${meta.cls}" data-action="view" data-id="${item.id}" aria-label="${item.policy_id}. ${meta.label}" title="${item.policy_id} · ${meta.label}">${meta.short}</button></td>`;
    }).join('');
    
    return `<tr><td class="policy-col"><div class="calendar-policy-meta">${logoHTML(item.company, item.company_logo_url)}<div><div class="calendar-policy-name">${item.policy_id || '—'}</div><div class="calendar-policy-sub">${subline}</div></div></div></td>${monthsHtml}</tr>`;
  }).join('');
}

/**
 * Renderiza página actual
 */
function renderPage() {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById('page-' + appState.currentPage).classList.add('active');
  document.querySelectorAll('[data-page-btn]').forEach(button => button.setAttribute('aria-current', button.dataset.pageBtn === appState.currentPage ? 'page' : 'false'));
}

/**
 * Renderiza todo
 */
async function renderAll() {
  renderYearSelect();
  renderListsAndSelectors();
  await renderDashboard();
  renderPoliciesTable();
  renderCalendar();
  renderPage();
}

/**
 * Bind events
 */
function bindEvents() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  document.getElementById('yearSelect').addEventListener('change', async event => {
    appState.currentYear = Number(event.target.value);
    await renderDashboard();
    renderCalendar();
    announceStatus('Año activo cambiado a ' + appState.currentYear + '.');
  });
  
  document.querySelectorAll('[data-page-btn]').forEach(btn => btn.addEventListener('click', () => {
    appState.currentPage = btn.dataset.pageBtn;
    renderPage();
  }));
  
  document.querySelectorAll('[data-page-jump]').forEach(btn => btn.addEventListener('click', () => {
    appState.currentPage = btn.dataset.pageJump;
    renderPage();
  }));
  
  document.getElementById('newPolicyBtn').addEventListener('click', event => openPolicyModal(null, event.currentTarget));
  document.getElementById('newPolicyBtn2')?.addEventListener('click', event => openPolicyModal(null, event.currentTarget));
  
  document.getElementById('dashboardRefreshBtn').addEventListener('click', async () => {
    await loadUserData();
    await renderDashboard();
    renderPoliciesTable();
    renderCalendar();
    toast('Dashboard recalculado', 'info');
  });
  
  document.getElementById('toggleChartTableBtn')?.addEventListener('click', event => {
    const wrap = document.getElementById('chartDataTableWrap');
    if (!wrap) return;

    wrap.hidden = !wrap.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!wrap.hidden));
    event.currentTarget.textContent = wrap.hidden ? 'Veure taula de dades' : 'Amaga taula de dades';
  });

  document.getElementById('searchInput')?.addEventListener('input', event => {
    appState.filters.search = event.target.value;
    appState.page = 1;
    renderPoliciesTable();
  });

  document.getElementById('filterCompany').addEventListener('change', event => {
    appState.filters.company = event.target.value;
    appState.page = 1;
    renderPoliciesTable();
  });
  
  document.getElementById('filterStatus').addEventListener('change', event => {
    appState.filters.status = event.target.value;
    appState.page = 1;
    renderPoliciesTable();
  });
  
  document.getElementById('filterFrequency').addEventListener('change', event => {
    appState.filters.frequency = event.target.value;
    appState.page = 1;
    renderPoliciesTable();
  });
  
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    appState.filters = { search: '', company: '', status: '', frequency: '' };
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCompany').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterFrequency').value = '';
    renderPoliciesTable();
  });
  
  document.querySelectorAll('[data-sort]').forEach(btn => btn.addEventListener('click', () => {
    const field = btn.dataset.sort;
    if (appState.sort.field === field) {
      appState.sort.direction = appState.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      appState.sort = { field, direction: 'asc' };
    }
    renderPoliciesTable();
  }));
  
  document.body.addEventListener('click', event => {
    const action = event.target.closest('[data-action]');
    if (action) {
      const id = action.dataset.id, type = action.dataset.action;
      if (type === 'view') openDetailModal(id, action);
      if (type === 'edit') openPolicyModal(id, action);
      if (type === 'delete') deletePolicy(id);
      return;
    }
    
    const pageNumber = event.target.closest('[data-page-number]');
    if (pageNumber) {
      appState.page = Number(pageNumber.dataset.pageNumber);
      renderPoliciesTable();
      return;
    }
    
    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) {
      const backdrop = closeButton.closest('.modal-backdrop');
      if (backdrop) closeModal(backdrop.id);
      return;
    }
    
    const editFromDetail = event.target.closest('[data-detail-edit]');
    if (editFromDetail) {
      const id = editFromDetail.dataset.detailEdit;
      closeModal('detailModalBackdrop');
      openPolicyModal(id, editFromDetail);
    }
  });
  
  document.querySelectorAll('[data-modal-backdrop]').forEach(backdrop => backdrop.addEventListener('mousedown', event => {
    if (event.target === backdrop) closeModal(backdrop.id);
  }));
  
  document.getElementById('policyForm').addEventListener('submit', savePolicyFromForm);
  document.getElementById('removeLogoBtn').addEventListener('click', () => {
    appState.transientLogo = null;
    resetLogoPreview();
  });
  
  document.getElementById('f_logoInput').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) handleLogoFile(file);
  });
  
  const logoDropzone = document.getElementById('logoDropzone');
  ['dragenter', 'dragover'].forEach(type => logoDropzone.addEventListener(type, event => {
    event.preventDefault();
    logoDropzone.dataset.over = 'true';
  }));
  ['dragleave', 'drop'].forEach(type => logoDropzone.addEventListener(type, event => {
    event.preventDefault();
    logoDropzone.dataset.over = 'false';
  }));
  logoDropzone.addEventListener('drop', event => {
    const file = event.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  });
  
  document.getElementById('calendarCompanyFilter').addEventListener('change', event => {
    appState.calendarFilters.company = event.target.value;
    renderCalendar();
  });
  
  document.getElementById('calendarStatusFilter').addEventListener('change', event => {
    appState.calendarFilters.status = event.target.value;
    renderCalendar();
  });
  
  document.getElementById('exportAllBtn').addEventListener('click', () => exportPolicies(appState.policies, 'seguros_todos.csv'));
  document.getElementById('exportYearBtn').addEventListener('click', () => exportPolicies(getPoliciesForYear(appState.currentYear), 'seguros_' + appState.currentYear + '.csv'));
  document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
  
  document.getElementById('csvInput').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) importCSV(file);
  });
  
  const csvDropzone = document.getElementById('csvDropzone');
  ['dragenter', 'dragover'].forEach(type => csvDropzone.addEventListener(type, event => {
    event.preventDefault();
    csvDropzone.dataset.over = 'true';
  }));
  ['dragleave', 'drop'].forEach(type => csvDropzone.addEventListener(type, event => {
    event.preventDefault();
    csvDropzone.dataset.over = 'false';
  }));
  csvDropzone.addEventListener('drop', event => {
    const file = event.dataTransfer.files?.[0];
    if (file) importCSV(file);
  });
}

// Funciones auxiliares (modales, formularios, etc.)
// ... (incluir las funciones de modal, formulario, import/export del código original adaptadas)

async function openPolicyModal(policyId = null, trigger = null) {
  appState.modalTrigger = trigger || document.activeElement;
  appState.editingId = policyId;
  appState.transientLogo = null;
  document.getElementById('policyForm').reset();
  document.getElementById('f_year').value = appState.currentYear;
  hideFormErrors();
  resetLogoPreview();
  
  if (policyId) {
    const item = appState.policies.find(p => p.id === policyId);
    if (!item) return;
    document.getElementById('policyModalTitle').textContent = 'Editar pòlissa';
    // Mapeo de field_name -> element_id (HTML usa camelCase)
    const fieldMap = {
      policy_id: 'f_id',
      accounting_account: 'f_accountingAccount',
      company: 'f_company',
      broker: 'f_broker',
      concept: 'f_concept',
      policy_number: 'f_policyNumber',
      payment_frequency: 'f_paymentFrequency',
      start_date: 'f_startDate',
      end_date: 'f_endDate',
      amount: 'f_amount',
      year: 'f_year',
      status: 'f_status',
      notes: 'f_notes'
    };
    Object.entries(fieldMap).forEach(([fieldName, elementId]) => {
      const field = document.getElementById(elementId);
      if (field) field.value = item[fieldName] ?? '';
    });

    if (item.company_logo_path) {
      try {
        const signedUrl = await getSignedLogoUrl(item.company_logo_path);
        showLogoPreview({ dataUrl: signedUrl, fileName: 'logo guardado', mimeType: 'image/*' });
      } catch (error) {
        console.warn('[logo edit] failed to generate signed URL for existing path', item.company_logo_path, error);
      }
    } else if (item.company_logo_url) {
      showLogoPreview({ dataUrl: item.company_logo_url, fileName: 'logo guardado', mimeType: 'image/*' });
    }
  } else {
    document.getElementById('policyModalTitle').textContent = 'Nova pòlissa';
    document.getElementById('f_id').value = generatePolicyId();
  }
  
  openModal('policyModalBackdrop');
  setTimeout(() => document.getElementById('f_id').focus(), 200);
}

function openDetailModal(policyId, trigger = null) {
  appState.modalTrigger = trigger || document.activeElement;
  const item = appState.policies.find(p => p.id === policyId);
  if (!item) return;
  
  const days = daysUntil(item.end_date, item.status);
  document.getElementById('detailModalBody').innerHTML = `
    <div class="company-cell" style="margin-bottom:16px;">
      ${logoHTML(item.company, item.company_logo_url, 72)}
      <div><h3>${item.policy_id} · ${item.company}</h3><p>${item.concept || 'Sense concepte'}</p><p>${statusBadge(item.status)} ${daysBadge(days, item.status)}</p></div>
    </div>
    <div class="table-wrap"><table><caption>Detall complet de la pòlissa</caption><tbody>
      <tr><th>ID</th><td class="mono">${item.policy_id || '—'}</td></tr>
      <tr><th>Comptabilitat</th><td class="mono">${item.accounting_account || '—'}</td></tr>
      <tr><th>Companyia</th><td>${item.company || '—'}</td></tr>
      <tr><th>Mediador</th><td>${item.broker || '—'}</td></tr>
      <tr><th>Concepte</th><td>${item.concept || '—'}</td></tr>
      <tr><th>Núm. pòlissa</th><td class="mono">${item.policy_number || '—'}</td></tr>
      <tr><th>Inici</th><td>${formatDate(item.start_date)}</td></tr>
      <tr><th>Fi</th><td>${formatDate(item.end_date)}</td></tr>
      <tr><th>Freqüència</th><td>${item.payment_frequency || '—'}</td></tr>
      <tr><th>Import</th><td class="mono">${formatCurrency(item.amount)}</td></tr>
      <tr><th>Any</th><td class="mono">${item.year || '—'}</td></tr>
      <tr><th>Notes</th><td>${item.notes || '—'}</td></tr>
    </tbody></table></div>
    <div class="modal-actions"><button class="btn" type="button" data-detail-edit="${item.id}" data-variant="primary">Editar</button></div>
  `;
  openModal('detailModalBackdrop');
}

function openModal(id) {
  const backdrop = document.getElementById(id);
  backdrop.classList.add('open');
  trapFocus(backdrop);
  backdrop.querySelector('.modal').focus();
}

function closeModal(id) {
  const backdrop = document.getElementById(id);
  if (!backdrop.classList.contains('open')) return;
  backdrop.classList.remove('open');
  releaseTrap(backdrop);
  if (appState.modalTrigger && typeof appState.modalTrigger.focus === 'function') appState.modalTrigger.focus();
}

function trapFocus(backdrop) {
  const modal = backdrop.querySelector('.modal');
  const focusable = modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  function onKeyDown(event) {
    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if (event.key === 'Escape') closeModal(backdrop.id);
  }
  backdrop._focusHandler = onKeyDown;
  modal.addEventListener('keydown', onKeyDown);
}

function releaseTrap(backdrop) {
  const modal = backdrop.querySelector('.modal');
  if (backdrop._focusHandler) { modal.removeEventListener('keydown', backdrop._focusHandler); backdrop._focusHandler = null; }
}

function hideFormErrors() {
  document.getElementById('formErrorSummary').hidden = true;
  document.getElementById('formErrorList').innerHTML = '';
  Array.from(document.querySelectorAll('#policyForm .field')).forEach(field => field.setAttribute('aria-invalid', 'false'));
}

function showFormErrors(errors) {
  const summary = document.getElementById('formErrorSummary');
  const list = document.getElementById('formErrorList');
  summary.hidden = false;
  list.innerHTML = errors.map(error => `<li><a href="#${error.id}">${error.message}</a></li>`).join('');
  errors.forEach(error => {
    const field = document.getElementById(error.id);
    if (field) field.setAttribute('aria-invalid', 'true');
  });
  summary.focus();
}

function collectFormData() {
  // Mapeo de field_name -> element_id (HTML usa camelCase)
  const fieldMap = {
    policy_id: 'f_id',
    accounting_account: 'f_accountingAccount',
    company: 'f_company',
    broker: 'f_broker',
    concept: 'f_concept',
    policy_number: 'f_policyNumber',
    payment_frequency: 'f_paymentFrequency',
    start_date: 'f_startDate',
    end_date: 'f_endDate',
    amount: 'f_amount',
    year: 'f_year',
    status: 'f_status',
    notes: 'f_notes'
  };
  
  const raw = {};
  Object.entries(fieldMap).forEach(([fieldName, elementId]) => {
    const element = document.getElementById(elementId);
    if (element) {
      const value = element.value?.trim() || '';
      raw[fieldName] = value;
    } else {
      console.warn(`Elemento no encontrado: ${elementId}`);
    }
  });
  
  // Normalizar datos (respeta policy_id si el usuario lo escribió)
  const normalized = normalizePolicy(raw);
  
  // Solo incluir 'id' si está editando (necesario para UPDATE)
  if (appState.editingId) {
    normalized.id = appState.editingId;
  } else {
    // Para creación, no incluir 'id' - Supabase lo generará automáticamente
    delete normalized.id;
  }
  
  return normalized;
}

function validatePolicyData(policy) {
  const errors = [];
  if (!policy.policy_id) errors.push({ id: 'f_id', message: 'L’ID de pòlissa és obligatori.' });
  if (!policy.accounting_account) errors.push({ id: 'f_accountingAccount', message: 'El compte comptable és obligatori.' });
  if (!policy.company) errors.push({ id: 'f_company', message: 'La companyia és obligatòria.' });
  if (!policy.concept) errors.push({ id: 'f_concept', message: 'El concepte és obligatori.' });
  if (!policy.amount || Number(policy.amount) <= 0) errors.push({ id: 'f_amount', message: 'L’import ha de ser superior a 0.' });
  if (!policy.year) errors.push({ id: 'f_year', message: 'L’any és obligatori.' });
  if (policy.start_date && policy.end_date && parseDate(policy.start_date) > parseDate(policy.end_date)) errors.push({ id: 'f_endDate', message: 'La data de fi ha de ser posterior a la data d’inici.' });
  return errors;
}

async function savePolicyFromForm(event) {
  event.preventDefault();
  hideFormErrors();
  const policy = collectFormData();
  const errors = validatePolicyData(policy);
  if (errors.length) { showFormErrors(errors); toast('Revisa els camps obligatoris del formulari.', 'error'); return; }

  const existingPolicy = appState.editingId ? appState.policies.find(p => p.id === appState.editingId) : null;
  let companyLogoPath = existingPolicy?.company_logo_path || null;
  let uploadResult = null;


  if (appState.transientLogo?.file) {
    uploadResult = await uploadCompanyLogoWithPath(policy.company, appState.transientLogo.file);
    companyLogoPath = uploadResult?.path || companyLogoPath;
  }

  if (companyLogoPath) {
    policy.company_logo_path = companyLogoPath;
  }

  try {
    if (appState.editingId) {
      // Actualitzar
      await updatePolicy(appState.editingId, policy);
      toast('Pòlissa actualitzada correctament', 'success');
    } else {
      // Crear
      await createPolicy(policy);
      toast('Pòlissa creada correctament', 'success');
    }
    await loadUserData();
    renderAll();
    closeModal('policyModalBackdrop');
  } catch (error) {
    toast('Error en desar la pòlissa', 'error');
  }
}

async function handleLogoFile(file) {
  const check = validateLogoFile(file);
  if (!check.ok) { toast(check.message, 'error'); return; }
  
  try {
    const dataUrl = await readFileAsDataURL(file);
    appState.transientLogo = {
      file,
      dataUrl,
      fileName: file.name,
      mimeType: file.type || 'image/*'
    };
    showLogoPreview(appState.transientLogo);
    toast('Logotip llest per desar-se amb la companyia.', 'success');
  } catch (error) {
    toast('Error llegint el fitxer', 'error');
  }
}

function showLogoPreview(fileData) {
  document.getElementById('logoPreviewWrap').hidden = false;
  document.getElementById('logoPreviewTile').innerHTML = fileData && fileData.dataUrl ? `<img src="${fileData.dataUrl}" alt="" />` : '<span class="logo-fallback">LOGO</span>';
  const previewLabel = fileData?.fileName === 'logo guardado' ? 'Logo actual de la companyia' : 'Nou logo pendent de desar';
  document.getElementById('logoPreviewName').textContent = previewLabel;
  document.getElementById('logoPreviewInfo').textContent = fileData?.mimeType || '';
}

function resetLogoPreview() {
  document.getElementById('logoPreviewWrap').hidden = true;
  document.getElementById('logoPreviewTile').innerHTML = '';
  document.getElementById('logoPreviewName').textContent = '';
  document.getElementById('logoPreviewInfo').textContent = '';
  document.getElementById('f_logoInput').value = '';
}

function exportPolicies(data, fileName) {
  const headers = ['ID', 'CUENTA CONTABLE', 'COMPAÑÍA', 'MEDIADOR', 'CONCEPTO', 'Nº POLIZA', 'INICIO', 'FIN', 'FRECUENCIA PAGO', 'IMPORTE', 'AÑO', 'ESTADO', 'NOTAS'];
  const rows = data.map(item => [
    item.policy_id, item.accounting_account, item.company, item.broker, item.concept, item.policy_number,
    formatDate(item.start_date), formatDate(item.end_date), item.payment_frequency,
    String(item.amount).replace('.', ','), item.year, item.status, item.notes || ''
  ].map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(';'));
  
  const content = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function loadSampleData() {
  const year = new Date().getFullYear();
  const near1 = addDays(todayStart(), 18).toISOString().slice(0, 10);
  const near2 = addDays(todayStart(), 55).toISOString().slice(0, 10);
  
  const samples = [
    { policy_id: 'POL-001', accounting_account: '62500001', company: 'ALLIANZ', broker: 'MARSH', concept: 'RC Directivos', policy_number: 'ALZ-001', start_date: year + '-01-01', end_date: year + '-12-31', payment_frequency: 'ANUAL', amount: 18500, year, status: 'ACTIVA', notes: 'Cobertura anual de directivos' },
    { policy_id: 'POL-002', accounting_account: '62500002', company: 'AXA', broker: 'AON', concept: 'Daños materiales', policy_number: 'AXA-002', start_date: year + '-01-01', end_date: year + '-12-31', payment_frequency: 'TRIMESTRAL', amount: 8200, year, status: 'ACTIVA', notes: '' },
    { policy_id: 'POL-003', accounting_account: '62500003', company: 'MAPFRE', broker: 'SUMMA MEDIADORS SL', concept: 'Flota de vehículos', policy_number: 'MAP-003', start_date: year + '-02-01', end_date: near1, payment_frequency: 'ANUAL', amount: 12400, year, status: 'ACTIVA', notes: 'Próxima renovación' },
    { policy_id: 'POL-004', accounting_account: '62500004', company: 'GENERALI', broker: 'MARSH', concept: 'Responsabilidad civil general', policy_number: 'GEN-004', start_date: year + '-01-15', end_date: year + '-12-31', payment_frequency: 'ANUAL', amount: 9850, year, status: 'ACTIVA', notes: '' },
    { policy_id: 'POL-005', accounting_account: '62500005', company: 'SOLUNION', broker: 'MUR & VALLS', concept: 'Riesgo clientes / crédito', policy_number: 'SOL-005', start_date: year + '-01-01', end_date: near2, payment_frequency: 'TRIMESTRAL', amount: 27556.40, year, status: 'ACTIVA', notes: '' }
  ];
  
  toast('Dades d’exemple carregades.', 'success');
  loadUserData().then(renderAll);
}

function sanitizeCsvValue(value) {
  return String(value || '').replace(/^"|"$/g, '').trim();
}

function parseCsvAmount(value) {
  const raw = sanitizeCsvValue(value).replace(/\s/g, '');
  if (!raw) return null;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let normalized = raw;

  if (hasComma && hasDot) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      normalized = raw.replace(/\./g, '').replace(/,/g, '.');
    } else {
      normalized = raw.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = raw.replace(/,/g, '.');
  }

  const valueNumber = Number(normalized);
  return Number.isFinite(valueNumber) ? valueNumber : null;
}

function validateCsvRow(raw, rowNumber, existingIds, csvSeenIds) {
  const policyId = sanitizeCsvValue(raw.policy_id);
  const company = sanitizeCsvValue(raw.company);
  const amountValue = sanitizeCsvValue(raw.amount);
  const yearValue = sanitizeCsvValue(raw.year);
  const statusValue = sanitizeCsvValue(raw.status).toUpperCase();
  const start = sanitizeCsvValue(raw.start_date);
  const end = sanitizeCsvValue(raw.end_date);

  const errors = [];
  const normalizedPolicyId = policyId.toUpperCase();
  if (!policyId) errors.push('policy_id obligatori');
  if (!company) errors.push('company obligatori');

  const amountNumber = parseCsvAmount(amountValue);
  if (amountNumber === null || amountNumber < 0) {
    errors.push('amount numèric major o igual a 0');
  }

  const yearNumber = Number(yearValue);
  if (!/^[0-9]{4}$/.test(yearValue) || Number.isNaN(yearNumber) || yearNumber < 1900 || yearNumber > 2100) {
    errors.push('year invàlid');
  }

  if (!['ACTIVA', 'VENCIDA', 'ANULADA'].includes(statusValue)) {
    errors.push('status ha de ser ACTIVA, VENCIDA o ANULADA');
  }

  const parsedStart = start ? parseDate(start) : null;
  const parsedEnd = end ? parseDate(end) : null;
  if (start && !parsedStart) errors.push('start_date invàlida');
  if (end && !parsedEnd) errors.push('end_date invàlida');
  if (parsedStart && parsedEnd && parsedEnd < parsedStart) errors.push('end_date no pot ser anterior a start_date');

  if (policyId) {
    if (csvSeenIds.has(normalizedPolicyId)) {
      return { status: 'duplicate', rowNumber, policy_id: policyId, reason: 'policy_id repetit en CSV' };
    }
    if (existingIds.has(normalizedPolicyId)) {
      csvSeenIds.add(normalizedPolicyId);
      return { status: 'duplicate', rowNumber, policy_id: policyId, reason: 'policy_id ja existeix' };
    }
    csvSeenIds.add(normalizedPolicyId);
  }

  if (errors.length) {
    return { status: 'invalid', rowNumber, policy_id: policyId || '(sense policy_id)', reasons: errors };
  }

  return { status: 'valid', raw, policy_id: policyId };
}

function importCSV(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) { toast('El CSV està buit o no conté dades.', 'error'); return; }

    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h => sanitizeCsvValue(h).toUpperCase());
    const map = { 'ID': 'policy_id', 'CUENTA CONTABLE': 'accounting_account', 'COMPAÑÍA': 'company', 'MEDIADOR': 'broker', 'CONCEPTO': 'concept', 'Nº PÓLIZA': 'policy_number', 'INICIO': 'start_date', 'FIN': 'end_date', 'FRECUENCIA PAGO': 'payment_frequency', 'IMPORTE': 'amount', 'AÑO': 'year', 'ESTADO': 'status', 'NOTAS': 'notes' };

    const existingPolicyIds = new Set(appState.policies.map(p => String(p.policy_id || '').trim().toUpperCase()));
    const csvSeenIds = new Set();
    const imported = [];
    const duplicateRows = [];
    const invalidRows = [];

    for (let index = 1; index < lines.length; index += 1) {
      const rowNumber = index + 1;
      const cols = lines[index].split(sep).map(value => sanitizeCsvValue(value));
      const raw = {};
      headers.forEach((header, colIndex) => {
        const field = map[header];
        if (field) raw[field] = cols[colIndex] || '';
      });

      if (!Object.keys(raw).length) {
        invalidRows.push({ status: 'invalid', rowNumber, policy_id: '(fila buida)', reasons: ['Fila buida o capçaleres no reconegudes'] });
        continue;
      }

      const result = validateCsvRow(raw, rowNumber, existingPolicyIds, csvSeenIds);
      if (result.status === 'valid') {
        imported.push(normalizePolicy(result.raw));
      } else if (result.status === 'duplicate') {
        duplicateRows.push(result);
      } else {
        invalidRows.push(result);
      }
    }

    const summary = [];
      if (imported.length) summary.push(`${imported.length} nou(s)`);
    if (duplicateRows.length) summary.push(`${duplicateRows.length} duplicat(s)`);
    if (invalidRows.length) summary.push(`${invalidRows.length} invàlid(s)`);
    const summaryMessage = summary.length ? summary.join(', ') : '0 registres vàlids';

    if (!imported.length) {
      toast(`Importació cancel·lada: ${summaryMessage}.`, duplicateRows.length ? 'warning' : 'error');
      return;
    }

    if (!confirm(`S'importaran ${imported.length} pòlissa(es). ${duplicateRows.length} duplicat(s) omès(s). ${invalidRows.length} invàlid(s) omès(s). Vols continuar?`)) {
      return;
    }

    (async () => {
      for (const policy of imported) {
        await createPolicy(policy);
      }
      toast(`Importació finalitzada: ${summaryMessage}.`, 'success');
      if (duplicateRows.length || invalidRows.length) {
        // Información de importació disponible en l'estat intern
      }
      await loadUserData();
      renderAll();
    })();
  };
  reader.readAsText(file, 'utf-8');
}

async function clearAllData() {
  if (!confirm('Estàs segur que vols esborrar totes les dades?')) return;
  
  // Eliminar todas las pólizas (soft delete)
  for (const policy of appState.policies) {
    await deletePolicy(policy.id);
  }
  
  toast('Totes les dades s’han eliminat.', 'info');
  await loadUserData();
  renderAll();
}

function toast(message, tone = 'info') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast';
  el.dataset.tone = tone;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// Inicializar autenticación primero
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});