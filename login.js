// login.js - VERSIÓN CORREGIDA Y OPTIMIZADA

// ============================================
// VERIFICAR FIREBASE
// ============================================
if (!firebase.apps.length) {
    console.error('❌ Firebase no está inicializado');
} else {
    console.log('✅ Firebase inicializado correctamente');
}

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
// CARGAR DATOS DEL USUARIO
// ============================================
async function cargarDatosUsuario(uid) {
    try {
        console.log('🔍 Buscando usuario con UID:', uid);
        
        if (!firebase.database) {
            throw new Error('Firebase Database no está disponible');
        }
        
        const snapshot = await firebase.database().ref(`usuarios/${uid}`).once('value');
        let userData = snapshot.val();
        
        console.log('📁 Datos encontrados:', userData);
        
        // SI NO HAY DATOS, CREAR PERFIL
        if (!userData) {
            console.log('⚠️ Usuario sin perfil. Creando...');
            const user = firebase.auth().currentUser;
            
            if (!user) {
                throw new Error('No hay usuario autenticado');
            }
            
            const email = user.email || '';
            
            // DETECTAR SI ES GERENCIA POR EL CORREO
            const esCorreoGerencia = email.includes('gerencia') || email === 'ig_cal94@hotmail.com';
            
            userData = {
                email: email,
                nombre: email.split('@')[0] || 'Usuario',
                rol: esCorreoGerencia ? "gerencia" : "usuario",
                local: esCorreoGerencia ? null : "Parrillita Alajuela",
                activo: true,
                fechaCreacion: new Date().toISOString()
            };
            
            await firebase.database().ref(`usuarios/${uid}`).set(userData);
            console.log('✅ Perfil creado con rol:', userData.rol);
        }
        
        // Configurar AppState
        AppState.usuario = {
            uid: uid,
            email: userData.email || firebase.auth().currentUser?.email || '',
            rol: userData.rol || 'usuario',
            nombre: userData.nombre || userData.email?.split('@')[0] || 'Usuario',
            local: userData.local || null
        };
        
        localStorage.setItem('parrillitaUser', JSON.stringify(AppState.usuario));
        console.log('👤 Usuario configurado:', AppState.usuario);
        
        // Actualizar UI
        actualizarUIUsuario();
        configurarPermisos();
        
        // Inicializar filtros
        if (typeof cargarLocalesEnFiltro === 'function') {
            cargarLocalesEnFiltro();
        }
        if (typeof window.inicializarFiltros === 'function') {
            window.inicializarFiltros();
        }
        
        // Inicializar módulos
        console.log('🚀 Inicializando módulos...');
        if (typeof initVentas === 'function') setTimeout(() => initVentas(), 100);
        if (typeof initCostos === 'function') setTimeout(() => initCostos(), 200);
        if (typeof initDashboardListeners === 'function') setTimeout(() => initDashboardListeners(), 300);
        if (typeof initPlanilla === 'function') setTimeout(() => initPlanilla(), 400);
        if (typeof initServicios === 'function') setTimeout(() => initServicios(), 500);
        if (typeof initMerma === 'function') setTimeout(() => initMerma(), 600);
        if (typeof initLogistica === 'function') setTimeout(() => initLogistica(), 700);
        if (typeof initFacturacion === 'function') setTimeout(() => initFacturacion(), 800);
        if (typeof initSidebar === 'function') setTimeout(() => initSidebar(), 900);
        if (typeof initPrestamo === 'function') setTimeout(() => initPrestamo(), 1000);
        if (typeof initCompras === 'function') setTimeout(() => initCompras(), 1100);
        if (typeof initResumen === 'function') setTimeout(() => initResumen(), 1200);
        if (typeof initPago10 === 'function') setTimeout(() => initPago10(), 1300);

        // Mostrar APP
        const mainContent = document.querySelector('.main-content');
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.getElementById('menuToggle');
        
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
            mainContent.style.opacity = '1';
        }
        
        if (sidebar) {
            sidebar.style.display = 'flex';
            sidebar.style.visibility = 'visible';
            sidebar.style.opacity = '1';
        }
        
        if (menuToggle) {
            menuToggle.style.display = 'flex';
            menuToggle.style.visibility = 'visible';
            menuToggle.style.opacity = '1';
        }
        
        if (typeof initSidebar === 'function') {
            setTimeout(initSidebar, 200);
        }
        
        // Ocultar login
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
        
        if (typeof cambiarModulo === 'function') {
            setTimeout(() => cambiarModulo('dashboard'), 500);
        }
        
        console.log('🎉 Bienvenido', AppState.usuario.nombre);
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.innerHTML = 'Error: ' + error.message;
            errorDiv.style.display = 'block';
        }
        
        const btn = document.getElementById('loginButton');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Ingresar';
        }
        
        return false;
    }
}

// ============================================
// MOSTRAR LOGIN
// ============================================
function mostrarLogin() {
    console.log('Mostrando login modal');
    
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menuToggle');
    
    if (mainContent) {
        mainContent.style.display = 'none';
        mainContent.style.visibility = 'hidden';
        mainContent.style.opacity = '0';
    }
    if (sidebar) {
        sidebar.style.display = 'none';
        sidebar.style.visibility = 'hidden';
        sidebar.style.opacity = '0';
    }
    if (menuToggle) {
        menuToggle.style.display = 'none';
        menuToggle.style.visibility = 'hidden';
        menuToggle.style.opacity = '0';
    }
    
    const modal = document.getElementById('loginModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (modal && overlay) {
        modal.style.display = 'flex';
        overlay.style.display = 'block';
        modal.classList.add('active');
        overlay.classList.add('active');
        
        const emailInput = document.getElementById('loginEmail');
        const passInput = document.getElementById('loginPassword');
        const errorDiv = document.getElementById('loginError');
        
        if (emailInput) emailInput.value = '';
        if (passInput) passInput.value = '';
        if (errorDiv) {
            errorDiv.innerHTML = '';
            errorDiv.style.display = 'none';
        }
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
        if (errorDiv) {
            errorDiv.innerHTML = 'Complete todos los campos';
            errorDiv.style.display = 'block';
        }
        return;
    }

    try {
        console.log('🔑 Login:', email);
        
        const btn = document.querySelector('#loginForm button');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Ingresando...';
        }
        
        if (errorDiv) {
            errorDiv.innerHTML = 'Iniciando sesión...';
            errorDiv.style.color = '#2563eb';
            errorDiv.style.display = 'block';
        }
        
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('✅ Login exitoso');
        
        await cargarDatosUsuario(userCredential.user.uid);
        
    } catch (error) {
        console.error('❌ Error:', error.code);
        
        let mensaje = 'Error al iniciar sesión';
        if (error.code === 'auth/user-not-found') mensaje = 'Usuario no encontrado';
        if (error.code === 'auth/wrong-password') mensaje = 'Contraseña incorrecta';
        if (error.code === 'auth/invalid-email') mensaje = 'Correo inválido';
        if (error.code === 'auth/too-many-requests') mensaje = 'Demasiados intentos';
        
        if (errorDiv) {
            errorDiv.innerHTML = mensaje;
            errorDiv.style.color = '#ef4444';
            errorDiv.style.display = 'block';
        }
        
        const btn = document.getElementById('loginButton');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Ingresar';
        }
    }
}

// ============================================
// LOGOUT
// ============================================
async function logout() {
    try {
        console.log('🚪 Cerrando sesión...');
        
        firebase.database().ref('ventas').off();
        firebase.database().ref('costos').off();
        firebase.database().ref('planilla').off();
        
        window.ventasData = [];
        window.costosData = {};
        window.planillaData = {};
        
        AppState.usuario = null;
        localStorage.removeItem('parrillitaUser');
        
        actualizarUIUsuario();
        configurarPermisos();
        
        const mainContent = document.querySelector('.main-content');
        const sidebar = document.querySelector('.sidebar');
        
        if (mainContent) mainContent.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        
        await firebase.auth().signOut();
        
        mostrarLogin();
        
        console.log('👋 Sesión cerrada correctamente');
        
    } catch (error) {
        console.error('Error en logout:', error);
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
        userRole.textContent = AppState.usuario.rol === 'gerencia' ? 'Gerencia' : 'Usuario';
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
    } else if (AppState.usuario?.rol === 'usuario' && AppState.usuario?.local) {
        filtroLocal.value = AppState.usuario.local;
        filtroLocal.disabled = true;
        adminItems.forEach(el => el.style.display = 'none');
    } else {
        filtroLocal.disabled = false;
        adminItems.forEach(el => el.style.display = 'none');
    }
}

// ============================================
// FUNCIÓN PARA SINCRONIZAR USUARIO
// ============================================
async function sincronizarUsuario() {
    try {
        const email = 'ig_cal94@hotmail.com';
        const password = 'Ignacio1234';
        
        console.log('🔄 Iniciando sincronización...');
        
        const usuariosRef = firebase.database().ref('usuarios');
        const snapshot = await usuariosRef.orderByChild('email').equalTo(email).once('value');
        
        let userData = null;
        let uid = null;
        
        snapshot.forEach(childSnapshot => {
            userData = childSnapshot.val();
            uid = childSnapshot.key;
        });
        
        if (!userData || !uid) {
            console.error('❌ Usuario no encontrado en la base de datos');
            alert('Usuario no encontrado en la base de datos');
            return;
        }
        
        console.log('✅ Usuario encontrado en DB:', { uid, userData });
        
        try {
            console.log('🔐 Creando usuario en Authentication...');
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const authUid = userCredential.user.uid;
            console.log('✅ Usuario creado en Authentication con UID:', authUid);
            
            if (authUid !== uid) {
                console.log('📝 Actualizando UID en la base de datos...');
                
                await firebase.database().ref(`usuarios/${authUid}`).set({
                    ...userData,
                    authUid: authUid,
                    fechaSincronizacion: new Date().toISOString()
                });
                
                await firebase.database().ref(`usuarios/${uid}`).remove();
                
                console.log('✅ Base de datos actualizada con nuevo UID:', authUid);
                uid = authUid;
            }
            
            alert(`✅ Usuario sincronizado exitosamente!\nEmail: ${email}\nContraseña: ${password}\nUID: ${uid}`);
            
        } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
                console.log('⚠️ El email ya existe en Authentication');
                alert('El email ya existe en Authentication. Por favor inicia sesión con tu contraseña existente.');
            } else {
                throw authError;
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error: ' + error.message);
    }
}

// ============================================
// FUNCIÓN DE DIAGNÓSTICO (AGREGADA)
// ============================================
async function diagnosticarLogin() {
    console.log('🔍 INICIANDO DIAGNÓSTICO');
    
    try {
        // Verificar Firebase
        console.log('Firebase apps:', firebase.apps.length);
        console.log('Auth disponible:', !!firebase.auth);
        console.log('Database disponible:', !!firebase.database);
        
        // Verificar configuración
        const config = firebase.app().options;
        console.log('Project ID:', config.projectId);
        
        // Buscar usuario
        const email = 'ig_cal94@hotmail.com';
        const snapshot = await firebase.database().ref('usuarios')
            .orderByChild('email')
            .equalTo(email)
            .once('value');
        
        const users = [];
        snapshot.forEach(child => {
            users.push({
                uid: child.key,
                data: child.val()
            });
        });
        
        console.log('Usuarios encontrados:', users.length);
        if (users.length > 0) {
            console.log('Usuario:', users[0]);
        }
        
        alert('Diagnóstico completado. Revisa la consola (F12)');
        
    } catch (error) {
        console.error('Error en diagnóstico:', error);
        alert('Error: ' + error.message);
    }
}

// Hacer funciones globales
window.diagnosticarLogin = diagnosticarLogin;
window.sincronizarUsuario = sincronizarUsuario;

// ============================================
// INICIAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado');
    setTimeout(initAuth, 500);
});

window.mostrarLogin = mostrarLogin;
window.procesarLogin = procesarLogin;
window.logout = logout;
window.actualizarUIUsuario = actualizarUIUsuario;
window.configurarPermisos = configurarPermisos;