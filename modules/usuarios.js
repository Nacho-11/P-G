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
// RENDERIZAR TABLA DE USUARIOS
// ============================================
function renderTablaUsuarios(usuarios) {
    console.log('📊 Renderizando tabla de usuarios');
    
    // 👇 Verificar si es superadmin (usando la función de app.js)
    const esSuper = window.esSuperAdmin && window.esSuperAdmin();
    const accesoActivo = AppState.accesoGlobal !== false;
    
    const html = `
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-users-cog"></i> Gestión de Usuarios</h2>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${esSuper ? `
                    <button id="btnControlAcceso" 
                            onclick="window.toggleAccesoGlobal()"
                            style="background: ${accesoActivo ? '#10b981' : '#ef4444'}; 
                                   color: white; 
                                   border: none; 
                                   padding: 10px 20px; 
                                   border-radius: 12px; 
                                   font-weight: 700; 
                                   cursor: pointer;
                                   display: flex;
                                   align-items: center;
                                   gap: 8px;
                                   box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                   transition: all 0.2s;">
                        <i class="fas ${accesoActivo ? 'fa-unlock' : 'fa-lock'}"></i>
                        ${accesoActivo ? '🔓 Acceso Activo' : '🔒 Acceso Bloqueado'}
                    </button>
                ` : ''}
                <button class="btn btn-success" onclick="mostrarModalNuevoUsuario()">
                    <i class="fas fa-user-plus"></i> Nuevo Usuario
                </button>
            </div>
        </div>
        
        ${esSuper ? `
            <div style="background: ${accesoActivo ? '#ecfdf5' : '#fef2f2'}; 
                        border: 1px solid ${accesoActivo ? '#bbf7d0' : '#fecaca'};
                        border-radius: 12px; 
                        padding: 12px 16px; 
                        margin-bottom: 20px;
                        display: flex;
                        align-items: center;
                        gap: 12px;">
                <i class="fas ${accesoActivo ? 'fa-check-circle' : 'fa-exclamation-triangle'}" 
                   style="color: ${accesoActivo ? '#16a34a' : '#dc2626'}; font-size: 1.2rem;"></i>
                <span style="color: ${accesoActivo ? '#065f46' : '#991b1b'};">
                    <strong>${accesoActivo ? '✅ ACCESO ACTIVO' : '🚫 ACCESO BLOQUEADO'}</strong>
                    ${accesoActivo ? 
                        'Los usuarios pueden iniciar sesión normalmente.' : 
                        '⚠️ Solo el Superadmin puede acceder.'}
                </span>
            </div>
        ` : `
            <div style="background: #f1f5f9; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; color: #64748b; font-size: 0.9rem;">
                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                Solo el Superadmin puede controlar el acceso al sistema.
            </div>
        `}
        
        <!-- Resumen rápido -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
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
            <div style="background: white; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 0.8rem;">SUPERADMIN</div>
                <div style="font-size: 2rem; font-weight: 700;">${usuarios.filter(u => u.superAdmin === true).length}</div>
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
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.length > 0 ? usuarios.map(u => `
                            <tr>
                                <td><strong>${u.nombre || u.email.split('@')[0]}</strong>
                                    ${u.superAdmin ? ' 👑' : ''}
                                </td>
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
                                    <span class="badge ${u.superAdmin ? 'badge-warning' : (u.rol === 'gerencia' ? 'badge-primary' : 'badge-secondary')}">
                                        ${u.superAdmin ? 'Superadmin 👑' : (u.rol === 'gerencia' ? 'Gerencia' : 'Usuario')}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${u.activo !== false ? 'badge-success' : 'badge-danger'}">
                                        ${u.activo !== false ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                        <button class="btn btn-sm btn-outline" onclick="editarUsuario('${u.uid}')" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${esSuper ? `
                                            <button class="btn btn-sm ${u.superAdmin ? 'btn-warning' : 'btn-success'}" 
                                                    onclick="${u.superAdmin ? `quitarSuperAdmin('${u.uid}')` : `asignarSuperAdmin('${u.uid}')`}" 
                                                    title="${u.superAdmin ? 'Quitar Superadmin' : 'Asignar Superadmin'}">
                                                <i class="fas ${u.superAdmin ? 'fa-crown' : 'fa-user-shield'}"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-sm ${u.activo !== false ? 'btn-warning' : 'btn-success'}" 
                                                onclick="toggleActivoUsuario('${u.uid}', ${u.activo !== false})" 
                                                title="${u.activo !== false ? 'Desactivar' : 'Activar'}">
                                            <i class="fas ${u.activo !== false ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                        </button>
                                        ${esSuper ? `
                                            <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${u.uid}')" title="Eliminar">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
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
}function renderTablaUsuarios(usuarios) {
    console.log('📊 Renderizando tabla de usuarios');
    
    // 👇 Verificar si es superadmin (usando la función de app.js)
    const esSuper = window.esSuperAdmin && window.esSuperAdmin();
    const accesoActivo = AppState.accesoGlobal !== false;
    
    const html = `
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-users-cog"></i> Gestión de Usuarios</h2>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${esSuper ? `
                    <button id="btnControlAcceso" 
                            onclick="window.toggleAccesoGlobal()"
                            style="background: ${accesoActivo ? '#10b981' : '#ef4444'}; 
                                   color: white; 
                                   border: none; 
                                   padding: 10px 20px; 
                                   border-radius: 12px; 
                                   font-weight: 700; 
                                   cursor: pointer;
                                   display: flex;
                                   align-items: center;
                                   gap: 8px;
                                   box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                   transition: all 0.2s;">
                        <i class="fas ${accesoActivo ? 'fa-unlock' : 'fa-lock'}"></i>
                        ${accesoActivo ? '🔓 Acceso Activo' : '🔒 Acceso Bloqueado'}
                    </button>
                ` : ''}
                <button class="btn btn-success" onclick="mostrarModalNuevoUsuario()">
                    <i class="fas fa-user-plus"></i> Nuevo Usuario
                </button>
            </div>
        </div>
        
        ${esSuper ? `
            <div style="background: ${accesoActivo ? '#ecfdf5' : '#fef2f2'}; 
                        border: 1px solid ${accesoActivo ? '#bbf7d0' : '#fecaca'};
                        border-radius: 12px; 
                        padding: 12px 16px; 
                        margin-bottom: 20px;
                        display: flex;
                        align-items: center;
                        gap: 12px;">
                <i class="fas ${accesoActivo ? 'fa-check-circle' : 'fa-exclamation-triangle'}" 
                   style="color: ${accesoActivo ? '#16a34a' : '#dc2626'}; font-size: 1.2rem;"></i>
                <span style="color: ${accesoActivo ? '#065f46' : '#991b1b'};">
                    <strong>${accesoActivo ? '✅ ACCESO ACTIVO' : '🚫 ACCESO BLOQUEADO'}</strong>
                    ${accesoActivo ? 
                        'Los usuarios pueden iniciar sesión normalmente.' : 
                        '⚠️ Solo el Superadmin puede acceder.'}
                </span>
            </div>
        ` : `
            <div style="background: #f1f5f9; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; color: #64748b; font-size: 0.9rem;">
                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                Solo el Superadmin puede controlar el acceso al sistema.
            </div>
        `}
        
        <!-- Resumen rápido -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
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
            <div style="background: white; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 0.8rem;">SUPERADMIN</div>
                <div style="font-size: 2rem; font-weight: 700;">${usuarios.filter(u => u.superAdmin === true).length}</div>
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
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.length > 0 ? usuarios.map(u => `
                            <tr>
                                <td><strong>${u.nombre || u.email.split('@')[0]}</strong>
                                    ${u.superAdmin ? ' 👑' : ''}
                                </td>
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
                                    <span class="badge ${u.superAdmin ? 'badge-warning' : (u.rol === 'gerencia' ? 'badge-primary' : 'badge-secondary')}">
                                        ${u.superAdmin ? 'Superadmin 👑' : (u.rol === 'gerencia' ? 'Gerencia' : 'Usuario')}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${u.activo !== false ? 'badge-success' : 'badge-danger'}">
                                        ${u.activo !== false ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                        <button class="btn btn-sm btn-outline" onclick="editarUsuario('${u.uid}')" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${esSuper ? `
                                            <button class="btn btn-sm ${u.superAdmin ? 'btn-warning' : 'btn-success'}" 
                                                    onclick="${u.superAdmin ? `quitarSuperAdmin('${u.uid}')` : `asignarSuperAdmin('${u.uid}')`}" 
                                                    title="${u.superAdmin ? 'Quitar Superadmin' : 'Asignar Superadmin'}">
                                                <i class="fas ${u.superAdmin ? 'fa-crown' : 'fa-user-shield'}"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-sm ${u.activo !== false ? 'btn-warning' : 'btn-success'}" 
                                                onclick="toggleActivoUsuario('${u.uid}', ${u.activo !== false})" 
                                                title="${u.activo !== false ? 'Desactivar' : 'Activar'}">
                                            <i class="fas ${u.activo !== false ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                        </button>
                                        ${esSuper ? `
                                            <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${u.uid}')" title="Eliminar">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
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

    delete modal.dataset.editUid;

    document.getElementById('usuarioNombre').value = '';
    document.getElementById('usuarioEmail').value = '';
    document.getElementById('usuarioEmail').disabled = false;
    document.getElementById('usuarioPassword').value = '';
    document.getElementById('usuarioPassword').type = 'password';
    document.getElementById('usuarioPassword').required = true;
    document.getElementById('usuarioPassword').placeholder = '•••••••• (mínimo 6 caracteres)';
    document.getElementById('usuarioActivo').checked = true;

    const selectLocal = document.getElementById('usuarioLocal');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
        AppState.locales.forEach(local => {
            selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
        });
    }

    const titulo = document.getElementById('usuarioModalTitle');
    const subtitulo = document.getElementById('usuarioModalSubtitle');
    const icono = document.getElementById('usuarioModalIcon');
    const toggleBtn = document.getElementById('toggleUsuarioPassword');

    if (titulo) titulo.textContent = 'Nuevo Usuario';
    if (subtitulo) subtitulo.textContent = 'Complete los datos del nuevo usuario';
    if (icono) icono.className = 'fas fa-user-plus';
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';

    limpiarMensajesUsuario();
    setFieldState('usuarioEmail', 'usuarioEmailWrap', null, 'usuarioEmailError', 'usuarioEmailSuccess');
    setFieldState('usuarioPassword', 'usuarioPasswordWrap', null, 'usuarioPasswordError', 'usuarioPasswordSuccess');
    setUsuarioLoading(false, 'Guardar Usuario');
    inicializarUXUsuarioModal();

    modal.classList.add('active');
    overlay.classList.add('active');

    setTimeout(() => {
        document.getElementById('usuarioNombre')?.focus();
    }, 100);
}

// ============================================
// GUARDAR USUARIO (VERSIÓN CORRECTA)
// ============================================
async function guardarUsuario() {
    console.log('💾 Guardando nuevo usuario...');

    limpiarMensajesUsuario();

    const nombre = document.getElementById('usuarioNombre').value.trim();
    const email = document.getElementById('usuarioEmail').value.trim();
    const password = document.getElementById('usuarioPassword').value;
    const local = document.getElementById('usuarioLocal').value;
    const activo = document.getElementById('usuarioActivo').checked;

    const modal = document.getElementById('usuarioModal');
    const uidEditando = modal.dataset.editUid;

    const emailValido = validarEmailUsuario();
    const passwordValida = validarPasswordUsuario();

    if (!local) {
        mostrarMensajeUsuario('error', 'Debe seleccionar un local asignado.');
        return;
    }

    if (!emailValido) {
        mostrarMensajeUsuario('error', 'Revise el correo electrónico.');
        return;
    }

    if (!uidEditando && !passwordValida) {
        mostrarMensajeUsuario('error', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    try {
        setUsuarioLoading(true, uidEditando ? 'Actualizar Usuario' : 'Guardar Usuario');

        if (uidEditando) {
            await actualizarUsuario();
            setUsuarioLoading(false, 'Actualizar Usuario');
            return;
        }

        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        await firebase.database().ref(`usuarios/${uid}`).set({
            email: email,
            nombre: nombre || email.split('@')[0],
            local: local,
            rol: 'usuario',
            activo: activo,
            creadoPor: AppState.usuario?.uid || 'sistema',
            fechaCreacion: new Date().toISOString()
        });

        mostrarMensajeUsuario('success', '✅ Usuario creado exitosamente');
        setUsuarioLoading(false, 'Guardar Usuario');

        setTimeout(() => {
            cerrarModal('usuarioModal');
        }, 900);

    } catch (error) {
        console.error('Error creando usuario:', error);

        let mensaje = 'Error al crear usuario';
        if (error.code === 'auth/email-already-in-use') {
            mensaje = 'Este correo electrónico ya está registrado';
        } else if (error.code === 'auth/invalid-email') {
            mensaje = 'El correo electrónico no es válido';
        } else if (error.code === 'auth/weak-password') {
            mensaje = 'La contraseña es demasiado débil';
        } else if (error.code === 'auth/network-request-failed') {
            mensaje = 'Error de red. Verifique su conexión';
        }

        mostrarMensajeUsuario('error', mensaje);
        setUsuarioLoading(false, 'Guardar Usuario');
    }
}

// ============================================
// EDITAR USUARIO
// ============================================
async function editarUsuario(uid) {
    console.log('✏️ Editando usuario:', uid);

    const modal = document.getElementById('usuarioModal');
    const overlay = document.getElementById('modalOverlay');

    if (!modal || !overlay) {
        console.error('No existe usuarioModal o modalOverlay');
        return;
    }

    try {
        const snapshot = await firebase.database().ref(`usuarios/${uid}`).once('value');
        const userData = snapshot.val();

        if (!userData) {
            alert('Usuario no encontrado');
            return;
        }

        document.getElementById('usuarioNombre').value = userData.nombre || '';
        document.getElementById('usuarioEmail').value = userData.email || '';
        document.getElementById('usuarioEmail').disabled = true;
        document.getElementById('usuarioPassword').value = '';
        document.getElementById('usuarioPassword').type = 'password';
        document.getElementById('usuarioPassword').placeholder = '•••••••• (dejar vacío para no cambiar)';
        document.getElementById('usuarioPassword').required = false;
        document.getElementById('usuarioActivo').checked = userData.activo !== false;

        modal.dataset.editUid = uid;

        const titulo = document.getElementById('usuarioModalTitle');
        const subtitulo = document.getElementById('usuarioModalSubtitle');
        const icono = document.getElementById('usuarioModalIcon');
        const toggleBtn = document.getElementById('toggleUsuarioPassword');

        if (titulo) titulo.textContent = 'Editar Usuario';
        if (subtitulo) subtitulo.textContent = 'Modifique la información del usuario';
        if (icono) icono.className = 'fas fa-user-edit';
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';

        limpiarMensajesUsuario();
        setFieldState('usuarioEmail', 'usuarioEmailWrap', null, 'usuarioEmailError', 'usuarioEmailSuccess');
        setFieldState('usuarioPassword', 'usuarioPasswordWrap', null, 'usuarioPasswordError', 'usuarioPasswordSuccess');
        setUsuarioLoading(false, 'Actualizar Usuario');
        inicializarUXUsuarioModal();

        modal.classList.add('active');
        overlay.classList.add('active');

    } catch (error) {
        console.error('Error cargando usuario:', error);
        alert('Error al cargar datos del usuario');
        return;
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

function mostrarMensajeUsuario(tipo, mensaje) {
    const errorBox = document.getElementById('usuarioModalError');
    const successBox = document.getElementById('usuarioModalSuccess');

    if (errorBox) {
        errorBox.classList.remove('active');
        errorBox.textContent = '';
    }
    if (successBox) {
        successBox.classList.remove('active');
        successBox.textContent = '';
    }

    const box = tipo === 'success' ? successBox : errorBox;
    if (box) {
        box.textContent = mensaje;
        box.classList.add('active');
    }

    mostrarToast(tipo === 'success' ? 'success' : 'error', mensaje);
}

function limpiarMensajesUsuario() {
    ['usuarioModalError', 'usuarioModalSuccess'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.classList.remove('active');
        }
    });
}

function setFieldState(inputId, wrapId, state, errorId, successId) {
    const input = document.getElementById(inputId);
    const wrap = wrapId ? document.getElementById(wrapId) : null;
    const error = errorId ? document.getElementById(errorId) : null;
    const success = successId ? document.getElementById(successId) : null;

    if (input) {
        input.classList.remove('error', 'success');
        if (state) input.classList.add(state);
    }

    if (wrap) {
        wrap.classList.remove('error', 'success');
        if (state) wrap.classList.add(state);
    }

    if (error) error.classList.remove('active');
    if (success) success.classList.remove('active');

    if (state === 'error' && error) error.classList.add('active');
    if (state === 'success' && success) success.classList.add('active');
}

function validarEmailUsuario() {
    const email = document.getElementById('usuarioEmail')?.value.trim() || '';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        setFieldState('usuarioEmail', 'usuarioEmailWrap', null, 'usuarioEmailError', 'usuarioEmailSuccess');
        return false;
    }

    if (!regex.test(email)) {
        setFieldState('usuarioEmail', 'usuarioEmailWrap', 'error', 'usuarioEmailError', 'usuarioEmailSuccess');
        return false;
    }

    setFieldState('usuarioEmail', 'usuarioEmailWrap', 'success', 'usuarioEmailError', 'usuarioEmailSuccess');
    return true;
}

function validarPasswordUsuario() {
    const input = document.getElementById('usuarioPassword');
    if (!input) return false;

    const password = input.value || '';
    const modal = document.getElementById('usuarioModal');
    const editando = !!modal?.dataset.editUid;

    if (!password) {
        if (editando) {
            setFieldState('usuarioPassword', 'usuarioPasswordWrap', null, 'usuarioPasswordError', 'usuarioPasswordSuccess');
            return true;
        }
        setFieldState('usuarioPassword', 'usuarioPasswordWrap', null, 'usuarioPasswordError', 'usuarioPasswordSuccess');
        return false;
    }

    if (password.length < 6) {
        setFieldState('usuarioPassword', 'usuarioPasswordWrap', 'error', 'usuarioPasswordError', 'usuarioPasswordSuccess');
        return false;
    }

    setFieldState('usuarioPassword', 'usuarioPasswordWrap', 'success', 'usuarioPasswordError', 'usuarioPasswordSuccess');
    return true;
}

function setUsuarioLoading(loading, texto = 'Guardar Usuario') {
    const submitBtn = document.getElementById('usuarioSubmitBtn');
    const cancelBtn = document.getElementById('usuarioCancelBtn');

    if (!submitBtn) return;

    if (loading) {
        submitBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = `<span class="btn-spinner"></span>Guardando...`;
    } else {
        submitBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = `<i class="fas fa-save"></i> ${texto}`;
    }
}

function inicializarUXUsuarioModal() {
    const email = document.getElementById('usuarioEmail');
    const password = document.getElementById('usuarioPassword');
    const toggle = document.getElementById('toggleUsuarioPassword');

    if (email && !email.dataset.eventsBound) {
        email.addEventListener('input', validarEmailUsuario);
        email.addEventListener('blur', validarEmailUsuario);
        email.dataset.eventsBound = 'true';
    }

    if (password && !password.dataset.eventsBound) {
        password.addEventListener('input', validarPasswordUsuario);
        password.addEventListener('blur', validarPasswordUsuario);
        password.dataset.eventsBound = 'true';
    }

    if (toggle && !toggle.dataset.eventsBound) {
        toggle.addEventListener('click', () => {
            const isPassword = password.type === 'password';
            password.type = isPassword ? 'text' : 'password';
            toggle.innerHTML = `<i class="fas ${isPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
        });
        toggle.dataset.eventsBound = 'true';
    }
}

function mostrarToast(tipo, mensaje) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    let icono = 'fa-circle-info';
    if (tipo === 'success') icono = 'fa-circle-check';
    if (tipo === 'error') icono = 'fa-circle-xmark';

    toast.innerHTML = `<i class="fas ${icono}"></i><span>${mensaje}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        toast.style.transition = 'all 0.2s ease';
        setTimeout(() => toast.remove(), 200);
    }, 2600);
}

// ============================================
// FUNCIONES DE SUPERADMIN
// ============================================

async function asignarSuperAdmin(uid) {
    if (!window.esSuperAdmin || !window.esSuperAdmin()) {
        mostrarToast('error', '❌ Solo el Superadmin puede asignar este rol');
        return;
    }
    
    if (!confirm('¿Estás seguro de asignar rol SUPERADMIN a este usuario?')) return;
    
    try {
        // Verificar que el usuario existe
        const snapshot = await firebase.database().ref(`usuarios/${uid}`).once('value');
        if (!snapshot.exists()) {
            mostrarToast('error', '❌ El usuario no existe en la base de datos');
            return;
        }
        
        // Intentar actualizar
        await firebase.database().ref(`usuarios/${uid}`).update({
            superAdmin: true,
            rol: 'gerencia',
            ultimaModificacion: new Date().toISOString()
        });
        mostrarToast('success', '✅ Usuario promovido a SUPERADMIN');
        
        // Recargar la tabla
        setTimeout(() => cargarTodosLosUsuarios(), 500);
        
    } catch (error) {
        console.error('Error al asignar Superadmin:', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            mostrarToast('error', '❌ No tienes permisos. Verifica las reglas de Firebase.');
            mostrarToast('info', '💡 Ve a Firebase Console > Realtime Database > Reglas y actualiza las reglas.');
        } else {
            mostrarToast('error', 'Error al asignar Superadmin: ' + error.message);
        }
    }
}

async function quitarSuperAdmin(uid) {
    if (!window.esSuperAdmin || !window.esSuperAdmin()) {
        mostrarToast('error', '❌ Solo el Superadmin puede quitar este rol');
        return;
    }
    
    if (uid === firebase.auth().currentUser?.uid) {
        alert('⚠️ No puedes quitarte el rol de Superadmin a ti mismo');
        return;
    }
    
    if (!confirm('¿Estás seguro de quitar el rol SUPERADMIN a este usuario?')) return;
    
    try {
        await firebase.database().ref(`usuarios/${uid}`).update({
            superAdmin: false,
            ultimaModificacion: new Date().toISOString()
        });
        mostrarToast('success', '✅ Rol SUPERADMIN removido');
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('error', 'Error al quitar Superadmin: ' + error.message);
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
window.asignarSuperAdmin = asignarSuperAdmin;
window.quitarSuperAdmin = quitarSuperAdmin;