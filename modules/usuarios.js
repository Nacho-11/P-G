// modules/usuarios.js - Gestión de usuarios y permisos
// VERSIÓN FINAL - SOLO GERENCIA

// ============================================
// RENDERIZAR MÓDULO DE USUARIOS
// ============================================
function renderUsuarios() {
    console.log('🎯 renderUsuarios ejecutándose');
    console.log('Usuario actual:', AppState.usuario);
    
    // Verificar permisos
    if (!AppState.usuario) {
        document.getElementById('usuariosContent').innerHTML = `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-lock" style="font-size: 4rem; color: #ef4444; margin-bottom: 20px;"></i>
                <h3 style="color: #4b5563; margin-bottom: 15px;">Acceso Restringido</h3>
                <p style="color: #6b7280;">Debe iniciar sesión para ver esta página.</p>
            </div>
        `;
        return;
    }
    
    // Todos los usuarios ven la tabla (todos son gerencia)
    cargarTodosLosUsuarios();
}

// ============================================
// CARGAR TODOS LOS USUARIOS
// ============================================
function cargarTodosLosUsuarios() {
    console.log('📥 Cargando todos los usuarios desde Firebase...');
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
// RENDERIZAR TABLA DE USUARIOS (CORREGIDA)
// ============================================
function renderTablaUsuarios(usuarios) {
    console.log('📊 Renderizando tabla de usuarios');
    
    const html = `
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-users-cog"></i> Gestión de Usuarios</h2>
            <button class="btn btn-success" onclick="mostrarModalNuevoUsuario()">
                <i class="fas fa-user-plus"></i> Nuevo Usuario
            </button>
        </div>
        
        <!-- Resumen rápido -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: white; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 0.8rem;">TOTAL USUARIOS</div>
                <div style="font-size: 2rem; font-weight: 700;">${usuarios.length}</div>
            </div>
            <div style="background: white; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 0.8rem;">ACTIVOS</div>
                <div style="font-size: 2rem; font-weight: 700;">${usuarios.filter(u => u.activo !== false).length}</div>
            </div>
            <div style="background: white; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 0.8rem;">INACTIVOS</div>
                <div style="font-size: 2rem; font-weight: 700;">${usuarios.filter(u => u.activo === false).length}</div>
            </div>
        </div>
        
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Local</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.length > 0 ? usuarios.map(u => `
                            <tr>
                                <td><strong>${u.nombre || u.email.split('@')[0]}</strong></td>
                                <td>${u.email}</td>
                                <td>
                                    ${u.local ? 
                                        `<span style="display: flex; align-items: center; gap: 5px;">
                                            <i class="fas fa-store" style="color: #2563eb;"></i> ${u.local}
                                        </span>` : 
                                        '<span style="color: #94a3b8;">—</span>'
                                    }
                                </td>
                                <td>
                                    <span class="badge ${u.activo !== false ? 'badge-success' : 'badge-danger'}">
                                        ${u.activo !== false ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 5px;">
                                        <button class="btn btn-sm btn-outline" onclick="editarUsuario('${u.uid}')" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm ${u.activo !== false ? 'btn-warning' : 'btn-success'}" 
                                                onclick="toggleActivoUsuario('${u.uid}', ${u.activo !== false})" 
                                                title="${u.activo !== false ? 'Desactivar' : 'Activar'}">
                                            <i class="fas ${u.activo !== false ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${u.uid}')" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 40px;">
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
    document.getElementById('usuarioActivo').checked = true;
    
    // 🔥 Cargar locales en el select
    const selectLocal = document.getElementById('usuarioLocal');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
        AppState.locales.forEach(local => {
            selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
        });
    }
    
    // Restaurar título y botón
    document.getElementById('usuarioModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
    
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Guardar Usuario';
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// GUARDAR USUARIO (VERSIÓN CORRECTA)
// ============================================
async function guardarUsuario() {
    console.log('💾 Guardando nuevo usuario...');
    
    const nombre = document.getElementById('usuarioNombre').value;
    const email = document.getElementById('usuarioEmail').value;
    const password = document.getElementById('usuarioPassword').value;
    const local = document.getElementById('usuarioLocal').value;
    const activo = document.getElementById('usuarioActivo').checked;
    
    if (!email || !password) {
        alert('Por favor complete los campos obligatorios');
        return;
    }
    
    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    if (!local) {
        alert('Debe seleccionar un local asignado');
        return;
    }
    
    try {
        const modal = document.getElementById('usuarioModal');
        const uidEditando = modal.dataset.editUid;
        
        if (uidEditando) {
            await actualizarUsuario();
            return;
        }
        
        // ✅ Crear usuario en Authentication (SÍ, es necesario)
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // ✅ Guardar datos en Realtime Database
        await firebase.database().ref(`usuarios/${uid}`).set({
            email: email,
            nombre: nombre || email.split('@')[0],
            local: local,
            rol: 'usuario',
            activo: activo,
            creadoPor: AppState.usuario?.uid || 'sistema',
            fechaCreacion: new Date().toISOString()
            // ⚠️ NO guardar password en texto plano
        });
        
        alert('✅ Usuario creado exitosamente');
        cerrarModal('usuarioModal');
        
        // ⚠️ Esto cerrará tu sesión actual
        console.log('⚠️ Tu sesión se cerrará porque creaste un nuevo usuario');
        
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
        
        // Limpiar formulario
        document.getElementById('usuarioNombre').value = userData.nombre || '';
        document.getElementById('usuarioEmail').value = userData.email;
        document.getElementById('usuarioEmail').disabled = true; // No se puede cambiar el email
        document.getElementById('usuarioPassword').value = '';
        document.getElementById('usuarioPassword').placeholder = '•••••••• (dejar vacío para no cambiar)';
        document.getElementById('usuarioPassword').required = false;
        document.getElementById('usuarioActivo').checked = userData.activo !== false;
        
        // Guardar UID
        modal.dataset.editUid = uid;
        
        // Cambiar título a "EDITAR USUARIO"
        document.getElementById('usuarioModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario';
        
        // Cambiar texto del botón
        const submitBtn = modal.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Usuario';
        }
        
        modal.classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
        
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
    const activo = document.getElementById('usuarioActivo').checked;
    
    if (!uid) {
        alert('Error: No se encontró el usuario a editar');
        return;
    }
    
    try {
        // Preparar datos a actualizar
        const updates = {
            nombre: nombre,
            activo: activo,
            ultimaModificacion: new Date().toISOString(),
            modificadoPor: AppState.usuario?.uid || 'sistema'
        };
        
        // Actualizar en Firebase Database
        await firebase.database().ref(`usuarios/${uid}`).update(updates);
        
        // Si se proporcionó nueva contraseña
        if (password && password.length >= 6) {
            alert('✅ Usuario actualizado. La contraseña debe ser cambiada por el usuario mediante "Olvidé mi contraseña"');
        } else {
            alert('✅ Usuario actualizado exitosamente');
        }
        
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
// ALTERNAR ESTADO ACTIVO DEL USUARIO
// ============================================
async function toggleActivoUsuario(uid, estadoActual) {
    const nuevoEstado = !estadoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Está seguro de ${accion} este usuario?`)) return;
    
    try {
        await firebase.database().ref(`usuarios/${uid}/activo`).set(nuevoEstado);
        alert(`✅ Usuario ${accion}do correctamente`);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado del usuario');
    }
}

// ============================================
// ELIMINAR USUARIO (DESACTIVAR)
// ============================================
async function eliminarUsuario(uid) {
    console.log('🗑️ Eliminando usuario:', uid);
    
    if (!confirm('¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
    
    try {
        // En lugar de eliminar, marcamos como inactivo y eliminado
        await firebase.database().ref(`usuarios/${uid}`).update({
            activo: false,
            eliminado: true,
            fechaEliminacion: new Date().toISOString(),
            eliminadoPor: AppState.usuario?.uid || 'sistema'
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
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.renderUsuarios = renderUsuarios;
window.mostrarModalNuevoUsuario = mostrarModalNuevoUsuario;
window.guardarUsuario = guardarUsuario;
window.editarUsuario = editarUsuario;
window.actualizarUsuario = actualizarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.toggleActivoUsuario = toggleActivoUsuario;
window.initUsuarios = initUsuarios;