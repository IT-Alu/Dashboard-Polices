/**
 * ============================================
 * AUTENTICACIÓN - CONTROL SEGUROS AAA
 * ============================================
 *
 * Gestión de autenticación con Supabase Auth.
 * Login, registro deshabilitado, logout y gestión de sesiones.
 */

/**
 * Inicializa el sistema de autenticación
 */
async function initAuth() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error('Error obteniendo sesión:', error);
      showAuthModal();
      return;
    }

    if (session) {
      await handleAuthSuccess(session);
    } else {
      showAuthModal();
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          if (session) {
            await handleAuthSuccess(session);
          }
          break;

        case 'SIGNED_OUT':
          handleAuthLogout();
          break;
      }
    });

    initAuthTabs();
  } catch (error) {
    console.error('initAuth error:', error);
    showAuthModal();
  }
}

/**
 * Maneja el éxito de autenticación
 * @param {object} session - Sesión de Supabase
 */
async function handleAuthSuccess(session) {
  if (!session?.user) {
    showAuthModal();
    return;
  }

  appState.session = session;
  appState.currentUser = session.user;

  hideAuthModal();

  const dashboardApp = document.getElementById('dashboardApp');
  if (dashboardApp) {
    dashboardApp.style.display = '';
  }

  if (typeof loadUserData === 'function') {
    await loadUserData();
  }

  if (typeof initApp === 'function') {
    initApp();
  }

  if (typeof toast === 'function') {
    toast('¡Bienvenido de nuevo!', 'success');
  }
}

/**
 * Maneja el logout visual/local
 */
function handleAuthLogout() {
  appState.session = null;
  appState.currentUser = null;
  appState.policies = [];
  appState.companies = {};

  const dashboardApp = document.getElementById('dashboardApp');
  if (dashboardApp) {
    dashboardApp.style.display = 'none';
  }

  showAuthModal();

  if (typeof toast === 'function') {
    toast('Sesión cerrada correctamente', 'info');
  }
}

/**
 * Muestra el modal de autenticación
 */
function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    document.getElementById('loginEmail')?.focus();
  }, 100);
}

/**
 * Oculta el modal de autenticación
 */
function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  modal.classList.add('hidden');
  document.body.style.overflow = '';

  document.getElementById('loginForm')?.reset();
  hideAuthMessages();
}

/**
 * Muestra mensajes de error/éxito en el modal
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - 'error' o 'success'
 */
function showAuthMessage(message, type = 'error') {
  const errorEl = document.getElementById('authError');
  const successEl = document.getElementById('authSuccess');

  if (!errorEl || !successEl) return;

  if (type === 'error') {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
    successEl.classList.remove('visible');
  } else {
    successEl.textContent = message;
    successEl.classList.add('visible');
    errorEl.classList.remove('visible');
  }
}

/**
 * Oculta los mensajes del modal
 */
function hideAuthMessages() {
  document.getElementById('authError')?.classList.remove('visible');
  document.getElementById('authSuccess')?.classList.remove('visible');
}

/**
 * Maneja el envío del formulario de login
 * @param {Event} event - Evento de submit
 */
async function handleLogin(event) {
  event.preventDefault();
  hideAuthMessages();

  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;

  if (!email || !password) {
    showAuthMessage('Por favor, completa todos los campos', 'error');
    return;
  }

  if (password.length < 8) {
    showAuthMessage('La contraseña debe tener al menos 8 caracteres', 'error');
    return;
  }

  const submitBtn = document.getElementById('loginSubmit');
  const submitText = submitBtn?.querySelector('.auth-submit-text');

  if (submitBtn) submitBtn.disabled = true;
  if (submitText) {
    submitText.innerHTML = '<span class="auth-loading">Entrando...</span>';
  }

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    showAuthMessage('¡Login exitoso! Cargando...', 'success');
  } catch (error) {
    console.error('Login error:', error);
    showAuthMessage(error.message || 'Error en el login', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Entrar';
  }
}

/**
 * Registro deshabilitado
 * @param {Event} event - Evento de submit
 */
async function handleRegister(event) {
  event?.preventDefault();
  hideAuthMessages();
  showAuthMessage('El registro está deshabilitado. Contacta con administración.', 'error');
}

/**
 * Maneja el logout real contra Supabase
 */
async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Logout error:', error);

    if (typeof toast === 'function') {
      toast('Error al cerrar sesión', 'error');
    }
  }
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} True si está autenticado
 */
function isAuthenticated() {
  return appState.session !== null && appState.currentUser !== null;
}

/**
 * Obtiene el ID del usuario actual
 * @returns {string|null} ID del usuario
 */
function getCurrentUserId() {
  return appState.currentUser?.id || null;
}

/**
 * Inicializa listeners de autenticación
 */
function initAuthTabs() {
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

// Exportar funciones globales
window.initAuth = initAuth;
window.handleAuthSuccess = handleAuthSuccess;
window.handleAuthLogout = handleAuthLogout;
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.showAuthMessage = showAuthMessage;
window.hideAuthMessages = hideAuthMessages;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.isAuthenticated = isAuthenticated;
window.getCurrentUserId = getCurrentUserId;
window.initAuthTabs = initAuthTabs;