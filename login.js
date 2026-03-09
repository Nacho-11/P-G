// login.js - VERSIÓN CORREGIDA

// ============================================
// INICIALIZAR AUTH
// ============================================
function initAuth() {
    console.log('Inicializando auth...');
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('✅ Usuario logueado:', user.email);
            await cargarDatosUsuario(user.uid);
        } else {
            console.log('👤 Usuario no logueado');
            mostrarLogin();
        }
    });
}

// ============================================
// CARGAR DATOS DEL USUARIO (MEJORADO)
// ============================================
async function cargarDatosUsuario(uid) {
    try {
        console.log('🔍 Buscando usuario con UID:', uid);
        const snapshot = await firebase.database().ref(`usuarios/${uid}`).once('value');
        const userData = snapshot.val();
        
        console.log('📁 Datos encontrados:', userData);
        
        if (userData) {
            AppState.usuario = {
                uid: uid,
                email: userData.email,
                rol: userData.rol,
                nombre: userData.nombre,
                local: userData.local
            };
            
            localStorage.setItem('parrillitaUser', JSON.stringify(AppState.usuario));
            
            // Actualizar UI
            actualizarUIUsuario();
            configurarPermisos();
            
            // Inicializar módulos
            if (typeof initDashboardListeners === 'function') initDashboardListeners();
            if (typeof initVentas === 'function') initVentas();
            if (typeof initCostos === 'function') initCostos();
            if (typeof initUsuarios === 'function') initUsuarios();
            
           // MOSTRAR LA APP
            document.querySelector('.main-content').style.display = 'block';
            document.querySelector('.sidebar').style.display = 'flex';
            initSidebar();

            // FORZAR VISIBILIDAD DEL BOTÓN
            const menuToggle = document.getElementById('menuToggle');
            if (menuToggle) {
                menuToggle.style.display = 'flex';
                menuToggle.style.visibility = 'visible';
                menuToggle.style.opacity = '1';
            }

            // Inicializar sidebar
            if (typeof initSidebar === 'function') {
                setTimeout(initSidebar, 100);
            }

            // Restaurar estado del sidebar
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.querySelector('.main-content');
            const sidebarState = localStorage.getItem('sidebarCollapsed');

            if (sidebarState === 'true') {
                sidebar.classList.add('collapsed');
                mainContent.style.marginLeft = '70px';
            } else {
                sidebar.classList.remove('collapsed');
                mainContent.style.marginLeft = 'var(--sidebar-width)';
            }
            
            // OCULTAR MODAL
            const modal = document.getElementById('loginModal');
            const overlay = document.getElementById('modalOverlay');
            
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
            }
            
            // Cargar dashboard
            if (typeof cambiarModulo === 'function') {
                cambiarModulo('dashboard');
            }
            
            console.log('🎉 Bienvenido', AppState.usuario.nombre);
            return true; // Éxito
        } else {
            console.error('❌ No se encontraron datos para el UID:', uid);
            
            // Intentar crear perfil automático
            const user = firebase.auth().currentUser;
            if (user) {
                console.log('🆕 Creando perfil automático...');
                const nuevoPerfil = {
                    email: user.email,
                    nombre: user.email.split('@')[0],
                    rol: "gerencia",
                    local: null,
                    activo: true,
                    fechaCreacion: new Date().toISOString()
                };
                
                await firebase.database().ref(`usuarios/${user.uid}`).set(nuevoPerfil);
                console.log('✅ Perfil creado automáticamente');
                
                // Reintentar cargar datos
                return cargarDatosUsuario(user.uid);
            }
            
            alert('Error: Usuario no configurado. Por favor contacte al administrador.');
            logout();
            return false;
        }
    } catch (error) {
        console.error('Error cargando usuario:', error);
        alert('Error al cargar datos del usuario');
        return false;
    }

                // Forzar visibilidad del botón de menú
                const menuToggle = document.getElementById('menuToggle');
                if (menuToggle) {
                    menuToggle.style.display = 'flex';
                    menuToggle.style.visibility = 'visible';
                    menuToggle.style.opacity = '1';
                }
}

// ============================================
// MOSTRAR LOGIN
// ============================================
function mostrarLogin() {
    console.log('Mostrando login modal');
    
    // Ocultar app
    document.querySelector('.main-content').style.display = 'none';
    document.querySelector('.sidebar').style.display = 'none';
    
    // Mostrar modal
    const modal = document.getElementById('loginModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (modal && overlay) {
        modal.style.display = 'flex';
        overlay.style.display = 'block';
        modal.classList.add('active');
        overlay.classList.add('active');
        
        // Limpiar campos
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').style.display = 'none';
    }
}

// ============================================
// PROCESAR LOGIN
// ============================================
async function procesarLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const errorDiv = document.getElementById('loginError');
    
    if (!email || !password) {
        errorDiv.innerHTML = 'Por favor complete todos los campos';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        console.log('🔑 Intentando login con:', email);
        
        const btn = document.querySelector('#loginForm button');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Ingresando...';
        }
        
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('✅ Login exitoso en Firebase');
        console.log('📧 Email:', user.email);
        console.log('🆔 UID:', user.uid);
        
        await cargarDatosUsuario(user.uid);
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        let mensaje = 'Error al iniciar sesión';
        if (error.code === 'auth/user-not-found') mensaje = 'Usuario no encontrado';
        if (error.code === 'auth/wrong-password') mensaje = 'Contraseña incorrecta';
        if (error.code === 'auth/invalid-email') mensaje = 'Correo inválido';
        
        errorDiv.innerHTML = mensaje;
        errorDiv.style.display = 'block';
        
        const btn = document.querySelector('#loginForm button');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Ingresar';
        }
    }
}

// ============================================
// LOGOUT MEJORADO
// ============================================
async function logout() {
    try {
        console.log('🚪 Cerrando sesión...');
        
        // Limpiar localStorage
        localStorage.removeItem('parrillitaUser');
        
        // Limpiar estado global
        AppState.usuario = null;
        AppState.data = {
            ventas: [],
            costos: [],
            planillas: [],
            servicios: { agua: [], luz: [], gas: [] },
            mermas: [],
            logistica: []
        };
        
        // Limpiar variables globales
        window.ventasData = [];
        window.costosData = {};
        
        // Actualizar UI
        actualizarUIUsuario();
        configurarPermisos();
        
        // Ocultar app
        document.querySelector('.main-content').style.display = 'none';
        document.querySelector('.sidebar').style.display = 'none';
        
        // Cerrar sesión en Firebase
        await firebase.auth().signOut();
        
        // Mostrar login
        mostrarLogin();
        
        console.log('👋 Sesión cerrada correctamente');
        
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Forzar mostrar login aunque haya error
        mostrarLogin();
    }
}

// ============================================
// ACTUALIZAR UI
// ============================================
function actualizarUIUsuario() {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const loginBtn = document.getElementById('userLoginBtn');
    
    if (!userName || !userRole || !loginBtn) return;
    
    if (AppState.usuario) {
        userName.textContent = AppState.usuario.nombre || AppState.usuario.email;
        userRole.textContent = AppState.usuario.rol === 'gerencia' ? 'Gerencia' : 
                              (AppState.usuario.rol === 'encargado' ? 'Encargado' : AppState.usuario.rol);
        loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        loginBtn.onclick = logout;
    } else {
        userName.textContent = 'Invitado';
        userRole.textContent = 'Sin sesión';
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
        loginBtn.onclick = mostrarLogin;
    }
}

// ============================================
// CONFIGURAR PERMISOS
// ============================================
function configurarPermisos() {
    const filtroLocal = document.getElementById('filtroLocal');
    const adminItems = document.querySelectorAll('.admin-only');
    
    if (!filtroLocal) return;
    
    if (AppState.usuario?.rol === 'gerencia') {
        filtroLocal.disabled = false;
        filtroLocal.value = 'Todos';
        adminItems.forEach(el => el.style.display = 'block');
    } else if (AppState.usuario?.rol === 'encargado' && AppState.usuario.local) {
        const optionExists = Array.from(filtroLocal.options).some(opt => opt.value === AppState.usuario.local);
        if (optionExists) filtroLocal.value = AppState.usuario.local;
        filtroLocal.disabled = true;
        adminItems.forEach(el => el.style.display = 'none');
    } else {
        filtroLocal.disabled = false;
        adminItems.forEach(el => el.style.display = 'none');
    }
}

// ============================================
// INICIAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado');
    initAuth();
});

// Hacer funciones globales
window.mostrarLogin = mostrarLogin;
window.procesarLogin = procesarLogin;
window.logout = logout;
window.actualizarUIUsuario = actualizarUIUsuario;
window.configurarPermisos = configurarPermisos;