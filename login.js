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
        
        if (typeof inicializarFiltros === 'function') {
            inicializarFiltros();
        }

        // VERIFICAR FIREBASE DATABASE
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
            userData = {
                email: email,
                nombre: email.split('@')[0] || 'Usuario',
                rol: "gerencia",
                local: null,
                activo: true,
                fechaCreacion: new Date().toISOString()
            };
            
            await firebase.database().ref(`usuarios/${uid}`).set(userData);
            console.log('✅ Perfil creado');
        }
        
        // CONFIGURAR AppState
        AppState.usuario = {
            uid: uid,
            email: userData.email || firebase.auth().currentUser?.email || '',
            rol: userData.rol || 'gerencia',
            nombre: userData.nombre || userData.email?.split('@')[0] || 'Usuario',
            local: userData.local || null
        };

        localStorage.setItem('parrillitaUser', JSON.stringify(AppState.usuario));
        if (typeof window.inicializarFiltros === 'function') {
            window.inicializarFiltros();
        }

        // Cargar locales en los filtros y selects
        if (typeof cargarLocalesEnFiltro === 'function') {
            cargarLocalesEnFiltro();
        }
        if (typeof cargarLocalesEnUsuarios === 'function') {
            cargarLocalesEnUsuarios();
        }

        // ACTUALIZAR UI
        actualizarUIUsuario();
        configurarPermisos();
        
        // MOSTRAR APP
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
        
        // INICIALIZAR SIDEBAR
        if (typeof initSidebar === 'function') {
            setTimeout(initSidebar, 200);
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
        
        // CARGAR DASHBOARD
        if (typeof cambiarModulo === 'function') {
            setTimeout(() => cambiarModulo('dashboard'), 300);
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
    
    if (mainContent) mainContent.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    
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
        if (errorDiv) errorDiv.style.display = 'none';
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
        console.log('Cerrando sesión...');
        
        localStorage.removeItem('parrillitaUser');
        AppState.usuario = null;
        
        actualizarUIUsuario();
        configurarPermisos();
        
        const mainContent = document.querySelector('.main-content');
        const sidebar = document.querySelector('.sidebar');
        
        if (mainContent) mainContent.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        
        await firebase.auth().signOut();
        mostrarLogin();
        
    } catch (error) {
        console.error('Error logout:', error);
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
        const password = 'iGNACIO1234'; // Puedes cambiarla
        
        console.log('🔄 Iniciando sincronización...');
        
        // PASO 1: Buscar el usuario en la base de datos
        console.log('🔍 Buscando usuario en la base de datos...');
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
        
        // PASO 2: Intentar crear en Authentication
        try {
            console.log('🔐 Creando usuario en Authentication...');
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const authUid = userCredential.user.uid;
            console.log('✅ Usuario creado en Authentication con UID:', authUid);
            
            // PASO 3: Si el UID es diferente, actualizar la base de datos
            if (authUid !== uid) {
                console.log('📝 Actualizando UID en la base de datos...');
                
                // Guardar el usuario con el nuevo UID
                await firebase.database().ref(`usuarios/${authUid}`).set({
                    ...userData,
                    authUid: authUid,
                    fechaSincronizacion: new Date().toISOString()
                });
                
                // Eliminar el registro antiguo si existe
                await firebase.database().ref(`usuarios/${uid}`).remove();
                
                console.log('✅ Base de datos actualizada con nuevo UID:', authUid);
                uid = authUid;
            }
            
            alert(`✅ Usuario sincronizado exitosamente!\nEmail: ${email}\nContraseña: ${password}\nUID: ${uid}`);
            
        } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
                console.log('⚠️ El email ya existe en Authentication');
                
                // Intentar obtener el UID de Authentication
                try {
                    const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
                    console.log('Métodos disponibles:', methods);
                    
                    alert('El email ya existe en Authentication. Por favor inicia sesión con tu contraseña existente.');
                    
                } catch (e) {
                    console.error('Error al verificar métodos:', e);
                }
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
// FUNCIÓN DE DIAGNÓSTICO COMPLETO
// ============================================
async function diagnosticarLogin() {
    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO');
    
    // 1. Verificar Firebase
    console.log('1️⃣ Verificando Firebase:');
    console.log('- Firebase apps:', firebase.apps.length);
    console.log('- Auth disponible:', !!firebase.auth);
    console.log('- Database disponible:', !!firebase.database);
    
    // 2. Verificar configuración
    try {
        const config = firebase.app().options;
        console.log('- Project ID:', config.projectId);
        console.log('- Auth Domain:', config.authDomain);
        console.log('- Database URL:', config.databaseURL);
    } catch (e) {
        console.error('- Error obteniendo config:', e);
    }
    
    // 3. Probar conexión a Database
    try {
        console.log('2️⃣ Probando conexión a Database...');
        const testRef = firebase.database().ref('.info/connected');
        testRef.once('value').then(snap => {
            console.log('- Conexión Database:', snap.val());
        });
    } catch (e) {
        console.error('- Error Database:', e);
    }
    
    // 4. Buscar usuario en Database
    try {
        console.log('3️⃣ Buscando usuario en Database...');
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
        
        console.log('- Usuarios encontrados:', users.length);
        if (users.length > 0) {
            console.log('- Primer usuario:', users[0]);
        } else {
            console.log('- No se encontró el usuario en Database');
        }
        
    } catch (e) {
        console.error('- Error buscando usuario:', e);
    }
    
    // 5. Intentar crear usuario específicamente
    console.log('4️⃣ Intentando crear usuario en Authentication...');
    try {
        const email = 'ig_cal94@hotmail.com';
        const password = '123456789';
        
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log('✅ USUARIO CREADO EXITOSAMENTE!');
        console.log('- UID:', userCredential.user.uid);
        console.log('- Email:', userCredential.user.email);
        
        // Crear perfil en Database
        await firebase.database().ref(`usuarios/${userCredential.user.uid}`).set({
            email: email,
            nombre: 'Ignacio Calderón Vargas',
            rol: 'gerencia',
            local: null,
            activo: true,
            superAdmin: true,
            fechaCreacion: new Date().toISOString()
        });
        console.log('✅ Perfil creado en Database');
        
        alert('✅ USUARIO CREADO! Ahora intenta hacer login');
        
    } catch (error) {
        console.error('❌ Error creando usuario:', error.code, error.message);
        
        if (error.code === 'auth/email-already-in-use') {
            console.log('⚠️ El email ya está en uso. Intentando login...');
            
            // Intentar hacer login
            try {
                const result = await firebase.auth().signInWithEmailAndPassword(email, '123456789');
                console.log('✅ LOGIN EXITOSO!', result.user.uid);
                alert('✅ Login exitoso! Revisa la consola');
            } catch (loginError) {
                console.error('❌ Error en login:', loginError.code, loginError.message);
                
                if (loginError.code === 'auth/wrong-password') {
                    alert('❌ Contraseña incorrecta. Prueba con otra contraseña');
                }
            }
        }
    }
}

// Hacer la función global
window.diagnosticarLogin = diagnosticarLogin;

// Hacer la función global
window.sincronizarUsuario = sincronizarUsuario;

// ============================================
// INICIAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado');
    setTimeout(initAuth, 500); // Pequeño delay para asegurar Firebase
});

// Hacer funciones globales
window.mostrarLogin = mostrarLogin;
window.procesarLogin = procesarLogin;
window.logout = logout;
window.actualizarUIUsuario = actualizarUIUsuario;
window.configurarPermisos = configurarPermisos;