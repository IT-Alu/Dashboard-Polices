/**
 * ============================================
 * AUTENTICACIÓN - CONTROL SEGUROS AAA
 * ============================================
 * 
 * Gestión de autenticación con Supabase Auth.
 * Login, registro, logout y gestión de sesiones.
 */

/**
 * Inicializa el sistema de autenticación
 */
async function initAuth() {
  // Verificar sesión existente
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  
  if (error) {
    console.error('Error obteniendo sesión:', error);
    showAuthModal();
    return;
  }
  
  if (session) {
    // Usuario ya autenticado
    handleAuthSuccess(session);
  } else {
    // Mostrar modal de login
    showAuthModal();
  }
  
  // Escuchar cambios de autenticación
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);
    
    switch (event) {
      case 'SIGNED_IN':
        handleAuthSuccess(session);
        break;
      case 'SIGNED_OUT':
        handleAuthLogout();
        break;
      case 'TOKEN_REFRESHED':
        // Sesión renovada automáticamente
        break;
      case 'USER_UPDATED':
        // Usuario actualizado
        break;
    }
  });
  
  // Inicializar pestañas y event listeners
  initAuthTabs();
}

/**
 * Maneja el éxito de autenticación
 * @param {object} session - Sesión de Supabase
 */
async function handleAuthSuccess(session) {
  appState.session = session;
  appState.currentUser = session.user;
  
  // Ocultar modal de login
  hideAuthModal();
  
  // Mostrar dashboard
  document.getElementById('dashboardApp').style.display = '';
  
  // Cargar datos del usuario
  await loadUserData();
  
  // Inicializar aplicación
  if (typeof initApp === 'function') {
    initApp();
  }
  
  toast('¡Bienvenido de nuevo!', 'success');
}

/**
 * Maneja el logout
 */
function handleAuthLogout() {
  appState.session = null;
  appState.currentUser = null;
  appState.policies = [];
  appState.companies = {};
  
  // Ocultar dashboard
  document.getElementById('dashboardApp').style.display = 'none';
  
  // Mostrar modal de login
  showAuthModal();
  
  toast('Sesión cerrada correctamente', 'info');
}

/**
 * Muestra el modal de autenticación
 */
function showAuthModal() {
  const modal = document.getElementById('authModal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Enfocar el primer campo
  setTimeout(() => {
    document.getElementById('loginEmail')?.focus();
  }, 100);
}

/**
 * Oculta el modal de autenticación
 */
function hideAuthModal() {
  const modal = document.getElementById('authModal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  
  // Limpiar formularios
  document.getElementById('loginForm')?.reset();
  document.getElementById('registerForm')?.reset();
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
 * Cambia entre pestañas de login/registro
 * @param {string} tab - 'login' o 'register'
 */
function switchAuthTab(tab) {
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  tabs.forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
    t.setAttribute('aria-selected', t.dataset.tab === tab);
  });
  
  loginForm.classList.toggle('hidden', tab !== 'login');
  registerForm.classList.toggle('hidden', tab !== 'register');
  
  hideAuthMessages();
}

/**
 * Maneja el envío del formulario de login
 * @param {Event} event - Evento de submit
 */
async function handleLogin(event) {
  event.preventDefault();
  hideAuthMessages();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  // Validaciones básicas
  if (!email || !password) {
    showAuthMessage('Por favor, completa todos los campos', 'error');
    return;
  }
  
  if (password.length < 8) {
    showAuthMessage('La contraseña debe tener al menos 8 caracteres', 'error');
    return;
  }
  
  // Mostrar loading
  const submitBtn = document.getElementById('loginSubmit');
  const submitText = submitBtn.querySelector('.auth-submit-text');
  submitBtn.disabled = true;
  submitText.innerHTML = '<span class="auth-loading">Entrando...</span>';
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Login exitoso - el evento onAuthStateChange manejará el resto
    showAuthMessage('¡Login exitoso! Redirigiendo...', 'success');
    
  } catch (error) {
    console.error('Login error:', error);
    showAuthMessage(error.message || 'Error en el login', 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Entrar';
  }
}

/**
 * Maneja el envío del formulario de registro
 * @param {Event} event - Evento de submit
 */
async function handleRegister(event) {
  event.preventDefault();
  hideAuthMessages();
  
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  
  // Validaciones
  if (!email || !password || !confirm) {
    showAuthMessage('Por favor, completa todos los campos', 'error');
    return;
  }
  
  if (password.length < 8) {
    showAuthMessage('La contraseña debe tener al menos 8 caracteres', 'error');
    return;
  }
  
  if (password !== confirm) {
    showAuthMessage('Las contraseñas no coinciden', 'error');
    return;
  }
  
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAuthMessage('El email no es válido', 'error');
    return;
  }
  
  // Mostrar loading
  const submitBtn = document.getElementById('registerSubmit');
  const submitText = submitBtn.querySelector('.auth-submit-text');
  submitBtn.disabled = true;
  submitText.innerHTML = '<span class="auth-loading">Registrando...</span>';
  
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          created_at: new Date().toISOString()
        }
      }
    });
    
    if (error) throw error;
    
    // Registro exitoso
    showAuthMessage('¡Registro exitoso! Iniciando sesión...', 'success');
    
    // Iniciar sesión automáticamente
    // (Supabase puede requerir confirmación de email dependiendo de la configuración)
    if (data.session) {
      // Sesión creada automáticamente
    } else {
      showAuthMessage('Revisa tu email para confirmar el registro', 'success');
    }
    
  } catch (error) {
    console.error('Register error:', error);
    showAuthMessage(error.message || 'Error en el registro', 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Registrarse';
  }
}

/**
 * Maneja el logout
 */
async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Logout error:', error);
    toast('Error al cerrar sesión', 'error');
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

// Inicializar pestañas de autenticación
function initAuthTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchAuthTab(tab.dataset.tab);
    });
  });
  
  // Formulario de login
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  
  // Formulario de registro
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  
  // Botón de logout
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

// Exportar funciones globales
window.initAuth = initAuth;
window.handleAuthSuccess = handleAuthSuccess;
window.handleAuthLogout = handleAuthLogout;
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.isAuthenticated = isAuthenticated;
window.getCurrentUserId = getCurrentUserId;
window.initAuthTabs = initAuthTabs;