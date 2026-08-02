// modules/usuarios.js - Gestión de usuarios y permisos
// VERSIÓN MEJORADA CON ESTILOS PROFESIONALES

console.log('👤 Cargando módulo de Usuarios...');

// ============================================
// RENDERIZAR MÓDULO DE USUARIOS
// ============================================
function renderUsuarios() {
    console.log('🎯 renderUsuarios ejecutándose');
    
    if (!AppState.usuario) {
        document.getElementById('usuariosContent').innerHTML = `
            <div class="card" style="padding: 60px 30px; text-align: center; border-radius: 24px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 24px; background: #fef2f2; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-lock" style="font-size: 2.5rem; color: #ef4444;"></i>
                </div>
                <h3 style="color: #4b5563; margin-bottom: 15px;">Acceso Restringido</h3>
                <p style="color: #6b7280;">Debe iniciar sesión para ver esta página.</p>
            </div>
        `;
        return;
    }
    
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
// RENDERIZAR TABLA DE USUARIOS (MEJORADA)
// ============================================
function renderTablaUsuarios(usuarios) {
    console.log('📊 Renderizando tabla de usuarios');
    
    const esSuper = window.esSuperAdmin && window.esSuperAdmin();
    const accesoActivo = AppState.accesoGlobal !== false;
    
    // Calcular estadísticas
    const totalUsuarios = usuarios.length;
    const activos = usuarios.filter(u => u.activo !== false).length;
    const inactivos = usuarios.filter(u => u.activo === false).length;
    const superAdmins = usuarios.filter(u => u.superAdmin === true).length;
    
    let html = `
        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 15px;">
            <div>
                <h2 style="margin: 0; font-size: 1.8rem; display: flex; align-items: center; gap: 10px;">
                    <span style="display:inline-flex; width:48px; height:48px; align-items:center; justify-content:center; border-radius:16px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color:white;">
                        <i class="fas fa-users-cog"></i>
                    </span>
                    Gestión de Usuarios
                </h2>
                <p style="margin: 6px 0 0 58px; color: #64748b; font-size: 0.95rem;">
                    Administración de cuentas y permisos del sistema
                </p>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${esSuper ? `
                    <button id="btnControlAcceso" 
                            onclick="window.toggleAccesoGlobal()"
                            style="background: ${accesoActivo ? '#10b981' : '#ef4444'}; 
                                   color: white; 
                                   border: none; 
                                   padding: 12px 20px; 
                                   border-radius: 14px; 
                                   font-weight: 700; 
                                   cursor: pointer;
                                   display: flex;
                                   align-items: center;
                                   gap: 8px;
                                   box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                   transition: all 0.2s;
                                   font-size: 0.9rem;">
                        <i class="fas ${accesoActivo ? 'fa-unlock' : 'fa-lock'}"></i>
                        ${accesoActivo ? '🔓 Acceso Activo' : '🔒 Acceso Bloqueado'}
                    </button>
                ` : ''}
                <button class="btn btn-primary" onclick="mostrarModalNuevoUsuario()" 
                        style="border-radius: 14px; padding: 12px 20px; box-shadow: 0 8px 24px rgba(139, 92, 246, 0.25);">
                    <i class="fas fa-user-plus"></i> Nuevo Usuario
                </button>
            </div>
        </div>
        
        <!-- BANNER DE ACCESO -->
        ${esSuper ? `
            <div style="background: ${accesoActivo ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)'}; 
                        border: 1px solid ${accesoActivo ? '#6ee7b7' : '#fca5a5'};
                        border-radius: 16px; 
                        padding: 16px 20px; 
                        margin-bottom: 24px;
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: ${accesoActivo ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${accesoActivo ? 'fa-check-circle' : 'fa-exclamation-triangle'}" 
                       style="color: ${accesoActivo ? '#16a34a' : '#dc2626'}; font-size: 1.3rem;"></i>
                </div>
                <div>
                    <div style="font-weight: 700; color: ${accesoActivo ? '#065f46' : '#991b1b'}; font-size: 1rem;">
                        ${accesoActivo ? '✅ ACCESO ACTIVO' : '🚫 ACCESO BLOQUEADO'}
                    </div>
                    <div style="font-size: 0.9rem; color: ${accesoActivo ? '#065f46' : '#991b1b'}; opacity: 0.85;">
                        ${accesoActivo ? 
                            'Los usuarios pueden iniciar sesión normalmente.' : 
                            '⚠️ Solo el Superadmin puede acceder al sistema.'}
                    </div>
                </div>
            </div>
        ` : `
            <div style="background: #f1f5f9; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; color: #64748b; font-size: 0.9rem; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-info-circle" style="color: #3b82f6;"></i>
                Solo el Superadmin puede controlar el acceso al sistema.
            </div>
        `}
        
        <!-- TARJETAS DE ESTADÍSTICAS -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #64748b; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="fas fa-users" style="color: #3b82f6; margin-right: 6px;"></i>
                            Total Usuarios
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #0f172a; margin-top: 4px;">${totalUsuarios}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 14px; background: #eff6ff; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-users" style="color: #3b82f6; font-size: 1.3rem;"></i>
                    </div>
                </div>
            </div>
            
            <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #64748b; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="fas fa-circle" style="color: #22c55e; margin-right: 6px;"></i>
                            Activos
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #22c55e; margin-top: 4px;">${activos}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 14px; background: #f0fdf4; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user-check" style="color: #22c55e; font-size: 1.3rem;"></i>
                    </div>
                </div>
            </div>
            
            <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #64748b; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="fas fa-circle" style="color: #ef4444; margin-right: 6px;"></i>
                            Inactivos
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #ef4444; margin-top: 4px;">${inactivos}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 14px; background: #fef2f2; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user-slash" style="color: #ef4444; font-size: 1.3rem;"></i>
                    </div>
                </div>
            </div>
            
            <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #64748b; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="fas fa-crown" style="color: #f59e0b; margin-right: 6px;"></i>
                            Superadmin
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #f59e0b; margin-top: 4px;">${superAdmins}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 14px; background: #fef3c7; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-crown" style="color: #f59e0b; font-size: 1.3rem;"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- TABLA DE USUARIOS -->
        <div class="card" style="border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
            <div style="padding: 18px 24px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-bottom: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; font-size: 1.05rem;">
                    <i class="fas fa-list" style="color: #8b5cf6;"></i>
                    Lista de Usuarios
                </h3>
                <span style="background: #8b5cf6; color: white; padding: 4px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                    ${totalUsuarios} registros
                </span>
            </div>
            
            <div style="padding: 0;">
                <div class="table-container" style="overflow-x: auto;">
                    <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.92rem;">
                        <thead>
                            <tr style="background: #0f172a; color: white;">
                                <th style="padding: 14px 18px; text-align: left;">Usuario</th>
                                <th style="padding: 14px 18px; text-align: left;">Email</th>
                                <th style="padding: 14px 18px; text-align: left;">Local</th>
                                <th style="padding: 14px 18px; text-align: center;">Rol</th>
                                <th style="padding: 14px 18px; text-align: center;">Estado</th>
                                <th style="padding: 14px 18px; text-align: center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    if (usuarios.length === 0) {
        html += `
            <tr>
                <td colspan="6" style="text-align: center; padding: 50px 20px;">
                    <div style="width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 20px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-users" style="font-size: 2rem; color: #94a3b8;"></i>
                    </div>
                    <h3 style="color: #475569; margin-bottom: 6px;">No hay usuarios registrados</h3>
                    <p style="color: #94a3b8;">Haga clic en "Nuevo Usuario" para agregar el primero.</p>
                </td>
            </tr>
        `;
    } else {
        usuarios.forEach((u, index) => {
            const bgColor = index % 2 === 0 ? 'white' : '#f8fafc';
            const isSuper = u.superAdmin === true;
            const isActive = u.activo !== false;
            
            html += `
                <tr style="background: ${bgColor}; border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 14px 18px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isSuper ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.8rem;">
                                ${(u.nombre || u.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #0f172a;">${u.nombre || u.email?.split('@')[0] || 'Sin nombre'}</div>
                                ${isSuper ? '<span style="font-size: 0.7rem; color: #f59e0b; font-weight: 700;">👑 Superadmin</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">${u.email || '—'}</td>
                    <td style="padding: 14px 18px;">
                        ${u.local ? 
                            `<span style="display: inline-flex; align-items: center; gap: 5px; background: #eff6ff; padding: 4px 12px; border-radius: 20px; color: #1d4ed8; font-size: 0.85rem; font-weight: 500;">
                                <i class="fas fa-store" style="font-size: 0.7rem;"></i> ${u.local}
                            </span>` : 
                            '<span style="color: #94a3b8; font-size: 0.85rem;">—</span>'
                        }
                    </td>
                    <td style="text-align: center; padding: 14px 18px;">
                        <span style="background: ${isSuper ? '#fef3c7' : '#e0e7ff'}; 
                                     color: ${isSuper ? '#92400e' : '#3730a3'}; 
                                     padding: 4px 14px; 
                                     border-radius: 20px; 
                                     font-weight: 700; 
                                     font-size: 0.8rem;">
                            ${isSuper ? '👑 Superadmin' : (u.rol === 'gerencia' ? 'Gerencia' : 'Usuario')}
                        </span>
                    </td>
                    <td style="text-align: center; padding: 14px 18px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px; background: ${isActive ? '#dcfce7' : '#fee2e2'}; 
                                     color: ${isActive ? '#166534' : '#991b1b'}; 
                                     padding: 4px 14px; 
                                     border-radius: 20px; 
                                     font-weight: 600; 
                                     font-size: 0.8rem;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isActive ? '#22c55e' : '#ef4444'}; display: inline-block;"></span>
                            ${isActive ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td style="text-align: center; padding: 14px 18px;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            <button class="btn btn-sm btn-outline" onclick="editarUsuario('${u.uid}')" title="Editar" 
                                    style="border-radius: 10px; padding: 6px 10px;">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${esSuper ? `
                                <button class="btn btn-sm ${isSuper ? 'btn-warning' : 'btn-success'}" 
                                        onclick="${isSuper ? `quitarSuperAdmin('${u.uid}')` : `asignarSuperAdmin('${u.uid}')`}" 
                                        title="${isSuper ? 'Quitar Superadmin' : 'Asignar Superadmin'}"
                                        style="border-radius: 10px; padding: 6px 10px;">
                                    <i class="fas ${isSuper ? 'fa-crown' : 'fa-user-shield'}"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}" 
                                    onclick="toggleActivoUsuario('${u.uid}', ${isActive})" 
                                    title="${isActive ? 'Desactivar' : 'Activar'}"
                                    style="border-radius: 10px; padding: 6px 10px;">
                                <i class="fas ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                            </button>
                            ${esSuper ? `
                                <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${u.uid}')" title="Eliminar"
                                        style="border-radius: 10px; padding: 6px 10px;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('usuariosContent').innerHTML = html;
}

// ============================================
// FUNCIÓN PARA ALTERNAR ACCESO GLOBAL
// ============================================
function toggleAccesoGlobal() {
    if (!window.esSuperAdmin || !window.esSuperAdmin()) {
        mostrarToast('error', '❌ Solo el Superadmin puede controlar el acceso');
        return;
    }
    
    const nuevoEstado = !AppState.accesoGlobal;
    const accion = nuevoEstado ? 'activar' : 'bloquear';
    
    if (!confirm(`¿Estás seguro de ${accion} el acceso al sistema?`)) return;
    
    firebase.database().ref('configuration/accesoGlobal/sistemaActivo').set(nuevoEstado)
        .then(() => {
            AppState.accesoGlobal = nuevoEstado;
            mostrarToast('success', `✅ Acceso ${nuevoEstado ? 'activado' : 'bloqueado'}`);
            renderUsuarios();
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarToast('error', '❌ Error al cambiar el acceso');
        });
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
// GUARDAR USUARIO
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
        const updates = {
            nombre: nombre,
            activo: activo,
            ultimaModificacion: new Date().toISOString(),
            modificadoPor: AppState.usuario?.uid || 'sistema'
        };
        
        await firebase.database().ref(`usuarios/${uid}`).update(updates);
        
        if (password && password.length >= 6) {
            alert('✅ Usuario actualizado. La contraseña debe ser cambiada por el usuario mediante "Olvidé mi contraseña"');
        } else {
            alert('✅ Usuario actualizado exitosamente');
        }
        
        cerrarModal('usuarioModal');
        delete modal.dataset.editUid;
        
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
        mostrarToast('success', `✅ Usuario ${accion}do correctamente`);
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('error', 'Error al cambiar estado del usuario');
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
            eliminadoPor: AppState.usuario?.uid || 'sistema'
        });
        
        mostrarToast('success', '✅ Usuario desactivado');
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        mostrarToast('error', 'Error al eliminar usuario');
    }
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
        const snapshot = await firebase.database().ref(`usuarios/${uid}`).once('value');
        if (!snapshot.exists()) {
            mostrarToast('error', '❌ El usuario no existe en la base de datos');
            return;
        }
        
        await firebase.database().ref(`usuarios/${uid}`).update({
            superAdmin: true,
            rol: 'gerencia',
            ultimaModificacion: new Date().toISOString()
        });
        mostrarToast('success', '✅ Usuario promovido a SUPERADMIN');
        
        setTimeout(() => cargarTodosLosUsuarios(), 500);
        
    } catch (error) {
        console.error('Error al asignar Superadmin:', error);
        mostrarToast('error', 'Error al asignar Superadmin: ' + error.message);
    }
}

async function quitarSuperAdmin(uid) {
    if (!window.esSuperAdmin || !window.esSuperAdmin()) {
        mostrarToast('error', '❌ Solo el Superadmin puede quitar este rol');
        return;
    }
    
    if (uid === firebase.auth().currentUser?.uid) {
        mostrarToast('error', '⚠️ No puedes quitarte el rol de Superadmin a ti mismo');
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
// FUNCIONES DE TOAST Y MENSAJES
// ============================================
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
window.toggleAccesoGlobal = toggleAccesoGlobal;

console.log('✅ usuarios.js cargado - Versión mejorada');