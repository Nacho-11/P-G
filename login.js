// login.js - Sistema de autenticación (SIN IMPORTS)

// ============================================
// INICIALIZAR AUTH
// ============================================
function initAuth() {
    console.log('Inicializando auth...');
    // Verificar si hay sesión activa
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('Usuario logueado:', user.email);
            cargarDatosUsuario(user.uid);
        } else {
            console.log('Usuario no logueado');
            AppState.usuario = null;
            actualizarUIUsuario();
        }
    });
}

// ============================================
// CARGAR DATOS DEL USUARIO DESDE FIREBASE
// ============================================
async function cargarDatosUsuario(uid) {
    try {
        const snapshot = await firebase.database().ref(`usuarios/${uid}`).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            AppState.usuario = {
                uid: uid,
                email: userData.email,
                rol: userData.rol,
                nombre: userData.nombre,
                local: userData.local
            };
            
            localStorage.setItem('parrillitaUser', JSON.stringify(AppState.usuario));
            actualizarUIUsuario();
            configurarPermisos();
            
            mostrarNotificacion(`Bienvenido ${AppState.usuario.nombre}`, 'success');
        }
    } catch (error) {
        console.error('Error cargando usuario:', error);
    }
}

// ============================================
// MOSTRAR LOGIN MODAL
// ============================================
function mostrarLogin() {
    console.log('Mostrando login modal');
    const modal = document.getElementById('loginModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) {
        console.error('Modal no encontrado');
        return;
    }
    
    // Limpiar campos
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.style.display = 'none';
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// PROCESAR LOGIN CON FIREBASE
// ============================================
async function procesarLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const errorDiv = document.getElementById('loginError');
    
    if (!email || !password) {
        if (errorDiv) {
            errorDiv.textContent = 'Por favor complete todos los campos';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    try {
        console.log('Intentando login con:', email);
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('Login exitoso:', user.email);
        
        await cargarDatosUsuario(user.uid);
        cerrarModal('loginModal');
        
    } catch (error) {
        console.error('Error de login:', error);
        
        let mensaje = 'Error al iniciar sesión';
        if (error.code === 'auth/user-not-found') {
            mensaje = 'Usuario no encontrado';
        } else if (error.code === 'auth/wrong-password') {
            mensaje = 'Contraseña incorrecta';
        } else if (error.code === 'auth/invalid-email') {
            mensaje = 'Correo electrónico inválido';
        }
        
        if (errorDiv) {
            errorDiv.textContent = mensaje;
            errorDiv.style.display = 'block';
        }
    }
}

// ============================================
// LOGOUT
// ============================================
async function logout() {
    try {
        await firebase.auth().signOut();
        localStorage.removeItem('parrillitaUser');
        AppState.usuario = null;
        actualizarUIUsuario();
        configurarPermisos();
        
        // Recargar módulo actual
        const activeModule = document.querySelector('.nav-item.active');
        if (activeModule) {
            const module = activeModule.dataset.module;
            cambiarModulo(module);
        }
        
        mostrarNotificacion('Sesión cerrada', 'info');
        
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        mostrarNotificacion('Error al cerrar sesión', 'error');
    }
}

// ============================================
// CONFIGURAR PERMISOS
// ============================================
function configurarPermisos() {
    const filtroLocal = document.getElementById('filtroLocal');
    
    if (AppState.usuario) {
        if (AppState.usuario.rol === 'encargado') {
            // Encargado solo ve su local
            if (filtroLocal) {
                filtroLocal.value = AppState.usuario.local;
                filtroLocal.disabled = true;
            }
            
            // Ocultar opciones de administración
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
            
        } else if (AppState.usuario.rol === 'gerencia') {
            // Gerencia puede ver todo
            if (filtroLocal) {
                filtroLocal.disabled = false;
            }
            
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';
            });
        }
    } else {
        // Usuario no logueado - solo vista básica
        if (filtroLocal) {
            filtroLocal.disabled = false;
        }
    }
}

// ============================================
// ACTUALIZAR UI DEL USUARIO
// ============================================
function actualizarUIUsuario() {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const loginBtn = document.getElementById('userLoginBtn');
    
    if (!userName || !userRole || !loginBtn) {
        console.error('Elementos de usuario no encontrados');
        return;
    }
    
    if (AppState.usuario) {
        userName.textContent = AppState.usuario.nombre || AppState.usuario.email;
        userRole.textContent = AppState.usuario.rol === 'gerencia' ? 'Gerencia' : 'Encargado';
        loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        loginBtn.onclick = logout;
        loginBtn.title = 'Cerrar sesión';
    } else {
        userName.textContent = 'Invitado';
        userRole.textContent = 'Sin sesión';
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
        loginBtn.onclick = mostrarLogin;
        loginBtn.title = 'Iniciar sesión';
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando auth...');
    if (typeof firebase !== 'undefined') {
        initAuth();
    } else {
        console.error('Firebase no está cargado');
    }
});