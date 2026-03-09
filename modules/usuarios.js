// modules/usuarios.js - Gestión de usuarios y permisos
// VERSIÓN CORREGIDA - SIN ERRORES DE SINTAXIS

// ============================================
// RENDERIZAR MÓDULO DE USUARIOS
// ============================================
function renderUsuarios() {
    console.log('🎯 renderUsuarios ejecutándose');
    console.log('Usuario actual:', AppState.usuario);
    
    // Verificar permisos
    if (!AppState.usuario || AppState.usuario.rol !== 'gerencia') {
        document.getElementById('usuariosContent').innerHTML = `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-lock" style="font-size: 4rem; color: #ef4444; margin-bottom: 20px;"></i>
                <h3 style="color: #4b5563; margin-bottom: 15px;">Acceso Restringido</h3>
                <p style="color: #6b7280;">Solo el personal de gerencia puede administrar usuarios.</p>
            </div>
        `;
        return;
    }
    
    // Cargar usuarios desde Firebase
    cargarUsuariosDesdeFirebase();
}

// ============================================
// CARGAR USUARIOS DESDE FIREBASE
// ============================================
function cargarUsuariosDesdeFirebase() {
    console.log('📥 Cargando usuarios desde Firebase...');
    const usuariosRef = firebase.database().ref('usuarios');
    
    usuariosRef.on('value', (snapshot) => {
        const usuarios = snapshot.val();
        const usuariosArray = [];
        
        if (usuarios) {
            for (const uid in usuarios) {
                usuariosArray.push({
                    uid: uid,
                    ...usuarios[uid]
                });
            }
        }
        
        console.log(`✅ ${usuariosArray.length} usuarios cargados`);
        renderTablaUsuarios(usuariosArray);
    });
}

// ============================================
// RENDERIZAR TABLA DE USUARIOS
// ============================================
function renderTablaUsuarios(usuarios) {
    console.log('📊 Renderizando tabla de usuarios');
    
    const roles = {
        'gerencia': 'Gerencia',
        'encargado': 'Encargado de Local',
        'sistemas': 'Sistemas',
        'consultor': 'Consultor'
    };
    
    const html = `
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <h2><i class="fas fa-users-cog"></i> Gestión de Usuarios</h2>
            <button class="btn btn-success" onclick="mostrarModalNuevoUsuario()">
                <i class="fas fa-user-plus"></i> Nuevo Usuario
            </button>
        </div>
        
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Local</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.length > 0 ? usuarios.map(u => `
                            <tr>
                                <td><strong>${u.nombre || '—'}</strong></td>
                                <td>${u.email}</td>
                                <td>
                                    <span class="badge ${u.rol === 'gerencia' ? 'badge-primary' : 
                                                        u.rol === 'encargado' ? 'badge-warning' : 
                                                        'badge-secondary'}">
                                        ${roles[u.rol] || u.rol}
                                    </span>
                                </td>
                                <td>${u.local || '—'}</td>
                                <td>
                                    <span class="badge ${u.activo ? 'badge-success' : 'badge-danger'}">
                                        ${u.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="editarUsuario('${u.uid}')" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${u.uid}')" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 40px;">
                                    <i class="fas fa-users" style="font-size: 3rem; color: #9ca3af; margin-bottom: 10px; display: block;"></i>
                                    No hay usuarios registrados
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('usuariosContent').innerHTML = html;
}

// ============================================
// MOSTRAR MODAL NUEVO USUARIO
// ============================================
function mostrarModalNuevoUsuario() {
    console.log('➕ Mostrando modal nuevo usuario');
    const modal = document.getElementById('usuarioModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) return;
    
    // Limpiar cualquier UID de edición
    delete modal.dataset.editUid;
    
    // Limpiar formulario
    document.getElementById('usuarioNombre').value = '';
    document.getElementById('usuarioEmail').value = '';
    document.getElementById('usuarioEmail').disabled = false;
    document.getElementById('usuarioPassword').value = '';
    document.getElementById('usuarioPassword').required = true;
    document.getElementById('usuarioPassword').placeholder = '•••••••• (mínimo 6 caracteres)';
    document.getElementById('usuarioRol').value = 'encargado';
    document.getElementById('usuarioActivo').checked = true;
    
    // Cargar locales
    const selectLocal = document.getElementById('usuarioLocal');
    selectLocal.innerHTML = '<option value="">Sin local asignado</option>';
    AppState.locales.forEach(local => {
        selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
    });
    
    // Ocultar local group por defecto
    const localGroup = document.getElementById('usuarioLocalGroup');
    localGroup.style.display = 'none';
    
    // Configurar cambio de rol
    document.getElementById('usuarioRol').onchange = function() {
        localGroup.style.display = this.value === 'encargado' ? 'block' : 'none';
    };
    
    // Restaurar título y botón
    document.getElementById('usuarioModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
    
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Guardar Usuario';
    }
    
    // Mostrar modal y overlay
    modal.style.display = 'block';
    overlay.style.display = 'block';

    modal.style.zIndex = '1000001';   // 👈 más alto que el overlay
    overlay.style.zIndex = '1000000';

    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// GUARDAR USUARIO (CREAR EN FIREBASE)
// ============================================
async function guardarUsuario() {
    console.log('💾 Guardando nuevo usuario...');
    
    const nombre = document.getElementById('usuarioNombre').value;
    const email = document.getElementById('usuarioEmail').value;
    const password = document.getElementById('usuarioPassword').value;
    const rol = document.getElementById('usuarioRol').value;
    const local = document.getElementById('usuarioLocal').value;
    const activo = document.getElementById('usuarioActivo').checked;
    
    if (!email || !password || !rol) {
        alert('Por favor complete los campos obligatorios');
        return;
    }
    
    try {
        // Verificar si es edición o creación
        const modal = document.getElementById('usuarioModal');
        const uidEditando = modal.dataset.editUid;
        
        if (uidEditando) {
            // Es una edición, llamar a actualizarUsuario
            await actualizarUsuario();
            return;
        }
        
        // Crear usuario en Authentication
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Guardar datos en Realtime Database
        await firebase.database().ref(`usuarios/${uid}`).set({
            email: email,
            nombre: nombre || email.split('@')[0],
            rol: rol,
            local: rol === 'encargado' ? local : null,
            activo: activo,
            creadoPor: AppState.usuario?.uid || 'sistema',
            fechaCreacion: new Date().toISOString()
        });
        
        alert('✅ Usuario creado exitosamente');
        cerrarModal('usuarioModal');
        // Y por si acaso:
        setTimeout(() => {
            if (document.getElementById('modalOverlay').style.display === 'block') {
                cerrarTodosLosModales();
            }
        }, 500);

        
        // Limpiar el dataset
        delete modal.dataset.editUid;
        
    } catch (error) {
        console.error('Error creando usuario:', error);
        
        let mensaje = 'Error al crear usuario';
        if (error.code === 'auth/email-already-in-use') {
            mensaje = 'Este correo electrónico ya está registrado';
        } else if (error.code === 'auth/weak-password') {
            mensaje = 'La contraseña debe tener al menos 6 caracteres';
        }
        
        alert('❌ ' + mensaje);
    }
}

// ============================================
// EDITAR USUARIO
// ============================================
async function editarUsuario(uid) {
    console.log('✏️ Editando usuario:', uid);
    
    try {
        const snapshot = await firebase.database().ref(`usuarios/${uid}`).once('value');
        const userData = snapshot.val();
        
        if (!userData) {
            alert('Usuario no encontrado');
            return;
        }
        
        const modal = document.getElementById('usuarioModal');
        const overlay = document.getElementById('modalOverlay');
        
        // Limpiar formulario
        document.getElementById('usuarioNombre').value = userData.nombre || '';
        document.getElementById('usuarioEmail').value = userData.email;
        document.getElementById('usuarioEmail').disabled = true;
        document.getElementById('usuarioPassword').value = '';
        document.getElementById('usuarioPassword').placeholder = '•••••••• (dejar vacío para no cambiar)';
        document.getElementById('usuarioPassword').required = false;
        document.getElementById('usuarioRol').value = userData.rol;
        document.getElementById('usuarioActivo').checked = userData.activo !== false;
        
        // Cargar locales
        const selectLocal = document.getElementById('usuarioLocal');
        selectLocal.innerHTML = '<option value="">Sin local asignado</option>';
        
        AppState.locales.forEach(local => {
            const selected = (local.nombre === userData.local) ? 'selected' : '';
            selectLocal.innerHTML += `<option value="${local.nombre}" ${selected}>${local.nombre}</option>`;
        });
        
        // Mostrar/ocultar local según rol
        const localGroup = document.getElementById('usuarioLocalGroup');
        localGroup.style.display = userData.rol === 'encargado' ? 'block' : 'none';
        
        // Guardar UID
        modal.dataset.editUid = uid;
        
        // 🔴 CAMBIAR TÍTULO A "EDITAR USUARIO"
        document.getElementById('usuarioModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario';
        
        // Cambiar texto del botón
        const submitBtn = modal.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Usuario';
        }
        
        // Mostrar modal y overlay
        modal.style.display = 'block';
        overlay.style.display = 'block';
        modal.classList.add('active');
        overlay.classList.add('active');
        
    } catch (error) {
        console.error('Error cargando usuario:', error);
        alert('Error al cargar datos del usuario');
    }
}

// ============================================
// ACTUALIZAR USUARIO
// ============================================
async function actualizarUsuario() {
    console.log('🔄 Actualizando usuario...');
    
    const modal = document.getElementById('usuarioModal');
    const uid = modal.dataset.editUid;
    const nombre = document.getElementById('usuarioNombre').value;
    const password = document.getElementById('usuarioPassword').value;
    const rol = document.getElementById('usuarioRol').value;
    const local = document.getElementById('usuarioLocal').value;
    const activo = document.getElementById('usuarioActivo').checked;
    
    if (!uid) {
        alert('Error: No se encontró el usuario a editar');
        return;
    }
    
    try {
        // Preparar datos a actualizar
        const updates = {
            nombre: nombre,
            rol: rol,
            local: (rol === 'encargado' && local) ? local : null,
            activo: activo,
            ultimaModificacion: new Date().toISOString(),
            modificadoPor: AppState.usuario?.uid || 'sistema'
        };
        
        // Actualizar en Firebase Database
        await firebase.database().ref(`usuarios/${uid}`).update(updates);
        
        // Si se proporcionó nueva contraseña
        if (password && password.length >= 6) {
            alert('✅ Usuario actualizado. La contraseña debe ser cambiada por el usuario mediante "Olvidé mi contraseña"');
        }
        
        alert('✅ Usuario actualizado exitosamente');
        cerrarModal('usuarioModal');
        
        // Limpiar el dataset
        delete modal.dataset.editUid;
        
        // Restaurar el modal para nuevo usuario
        document.getElementById('usuarioEmail').disabled = false;
        document.getElementById('usuarioPassword').required = true;
        document.getElementById('usuarioPassword').placeholder = '•••••••• (mínimo 6 caracteres)';
        document.getElementById('usuarioModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
        
        const submitBtn = modal.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Guardar Usuario';
        }
        
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        alert('Error al actualizar usuario: ' + error.message);
    }
}

// ============================================
// ELIMINAR USUARIO
// ============================================
async function eliminarUsuario(uid) {
    console.log('🗑️ Eliminando usuario:', uid);
    
    if (!confirm('¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
    
    try {
        await firebase.database().ref(`usuarios/${uid}`).update({
            activo: false,
            eliminado: true,
            fechaEliminacion: new Date().toISOString(),
            eliminadoPor: AppState.usuario.uid
        });
        
        alert('✅ Usuario desactivado');
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error al eliminar usuario');
    }
}

// ============================================
// INICIALIZAR MÓDULO DE USUARIOS
// ============================================
function initUsuarios() {
    console.log('🚀 Inicializando módulo de usuarios...');
}

// ============================================
// FORZAR CIERRE DE MODAL (SOLO PARA EMERGENCIAS)
// ============================================
window.forzarCierreModal = function() {
    console.log('🔧 Forzando cierre de modales...');
    
    const overlay = document.getElementById('modalOverlay');
    const usuarioModal = document.getElementById('usuarioModal');
    const loginModal = document.getElementById('loginModal');
    const ventaModal = document.getElementById('ventaModal');
    const costoModal = document.getElementById('costoModal');
    
    // Ocultar overlay
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
    }
    
    // Ocultar todos los modales
    const modales = [usuarioModal, loginModal, ventaModal, costoModal];
    modales.forEach(modal => {
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    });
    
    console.log('✅ Modales cerrados forzosamente');
};

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.renderUsuarios = renderUsuarios;
window.mostrarModalNuevoUsuario = mostrarModalNuevoUsuario;
window.guardarUsuario = guardarUsuario;
window.editarUsuario = editarUsuario;
window.actualizarUsuario = actualizarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.initUsuarios = initUsuarios;
window.cargarUsuariosDesdeFirebase = cargarUsuariosDesdeFirebase;