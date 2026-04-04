// modules/facturacion.js - VERSIÓN CON DECIMALES

console.log('📦 Cargando módulo de Facturación...');

// ============================================
// VARIABLES GLOBALES
// ============================================
let facturas = [];

// ============================================
// FUNCIÓN PARA VERIFICAR PERMISOS DE LOCAL
// ============================================
function puedeVerLocal(localNombre) {
    if (esGerencia()) return true;
    if (AppState.usuario?.local === localNombre) return true;
    return false;
}

// ============================================
// INICIALIZAR MÓDULO
// ============================================
function initFacturacion() {
    console.log('🚀 Inicializando módulo de Facturación...');
    
    if (!AppState?.usuario) {
        console.log('⏳ Esperando autenticación...');
        return;
    }
    
    cargarFacturas();
    
    if (document.getElementById('facturacion').classList.contains('active')) {
        renderFacturacion();
    }
}

// ============================================
// CARGAR FACTURAS DESDE FIREBASE
// ============================================
function cargarFacturas() {
    console.log('📥 Cargando facturas desde Firebase...');
    
    firebase.database().ref('facturacionBodegas').on('value', (snapshot) => {
        const data = snapshot.val();
        facturas = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                facturas.push({
                    id: key,
                    ...data[key]
                });
            });
            
            facturas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }
        
        console.log(`✅ ${facturas.length} facturas cargadas`);
        
        window.facturacionBodegas = facturas;
        
        if (document.getElementById('facturacion').classList.contains('active')) {
            renderFacturacion();
        }
    });
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================
function renderFacturacion() {
    console.log('📊 Renderizando Facturación...');
    
    const content = document.getElementById('facturacionContent');
    if (!content) return;
    
    const filtroLocal = AppState?.filtros?.local || 'Todos';
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState?.filtros?.fechaPersonalizada;
    const fechaInicio = AppState?.filtros?.fechaInicio;
    const fechaFin = AppState?.filtros?.fechaFin;
    
    // Fechas para filtrar
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);
    
    // Filtrar facturas
    const facturasFiltradas = facturas.filter(f => {
        // Filtro por local
        if (filtroLocal !== 'Todos' && f.local !== filtroLocal) return false;
        if (!puedeVerLocal(f.local)) return false;
        
        // Filtro por fecha
        if (!f.fecha) return true;
        const fechaFactura = f.fecha.split('T')[0];
        
        if (filtroTiempo === 'todos') return true;
        if (filtroTiempo === 'ayer') return fechaFactura === ayerStr;
        if (filtroTiempo === 'mes') return fechaFactura.substring(0, 7) === mesActual;
        if (filtroTiempo === 'personalizado') return fechaFactura === fechaPersonalizada;
        if (filtroTiempo === 'rango') {
            if (!fechaInicio || !fechaFin) return true;
            return fechaFactura >= fechaInicio && fechaFactura <= fechaFin;
        }
        return true;
    });
    
    const totalGeneral = facturasFiltradas.reduce((sum, f) => sum + (f.monto || 0), 0);
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-file-invoice-dollar" style="color: #10b981;"></i> Facturación de Bodegas</h2>
            <button class="btn btn-primary" onclick="window.agregarFactura()">
                <i class="fas fa-plus"></i> Agregar Factura
            </button>
        </div>
        
        <div style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 16px; padding: 25px; color: white; margin-bottom: 25px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);">
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-calculator" style="font-size: 2rem;"></i>
                </div>
                <div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">TOTAL ACUMULADO</div>
                    <div style="font-size: 2.5rem; font-weight: 700;">₡${totalGeneral.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">${facturasFiltradas.length} facturas</div>
                </div>
            </div>
        </div>
    `;
    
    if (facturasFiltradas.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-file-invoice" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3>No hay facturas registradas</h3>
                <p>Haga clic en "Agregar Factura" para comenzar.</p>
            </div>
        `;
    } else {
        html += `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;"><i class="fas fa-list"></i> Listado de Facturas</h3>
                    <span style="background: #f1f5f9; padding: 5px 15px; border-radius: 20px;">
                        Total: ₡${totalGeneral.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Local</th>
                                <th>N° Factura</th>
                                <th>Monto (₡)</th>
                                <th>Acciones</th>
                            </thead>
                            <tbody>
        `;
        
        facturasFiltradas.forEach(f => {
            let fechaFormateada = 'Fecha inválida';
            if (f.fecha) {
                try {
                    const fechaObj = new Date(f.fecha);
                    if (!isNaN(fechaObj.getTime())) {
                        fechaFormateada = fechaObj.toLocaleDateString('es-CR');
                    } else if (typeof f.fecha === 'string' && f.fecha.includes('-')) {
                        const [year, month, day] = f.fecha.split('-');
                        fechaFormateada = `${day}/${month}/${year}`;
                    }
                } catch(e) {
                    console.warn('Error parsing date:', f.fecha);
                }
            }
            
            html += `
                <tr>
                    <td><strong>${fechaFormateada}</strong></td>
                    <td>${f.local || '—'}</td>
                    <td>${f.numeroFactura || '—'}</td>
                    <td style="color: #10b981; font-weight: 600;">₡${(f.monto || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm btn-outline" onclick="window.editarFactura('${f.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="window.eliminarFactura('${f.id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// ============================================
// AGREGAR FACTURA (MODAL CON DECIMALES)
// ============================================
function agregarFactura(editId = null) {
    console.log('📝 Abriendo modal de factura');
    
    const overlay = document.getElementById('modalOverlay');
    
    const modalExistente = document.getElementById('facturaModal');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'facturaModal';
    modal.className = 'modal';
    modal.style.maxWidth = '500px';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    
    let facturaEdit = null;
    if (editId) {
        facturaEdit = facturas.find(f => f.id === editId);
    }
    
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaHoy = `${año}-${mes}-${dia}`;
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 25px 30px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-file-invoice" style="font-size: 1.8rem;"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem;">${editId ? 'Editar' : 'Agregar'} Factura</h2>
                    <p style="margin: 4px 0 0; opacity: 0.8;">Complete los datos de la factura</p>
                </div>
            </div>
            <button class="modal-close" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 12px; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="modal-body" style="padding: 30px; background: #f8fafc;">
            <form id="facturaForm" onsubmit="event.preventDefault(); window.guardarFactura('${editId || ''}');">
                
                <!-- Fecha -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-calendar-alt" style="color: #10b981;"></i> Fecha
                    </label>
                    <input type="date" id="facturaFecha" value="${facturaEdit?.fecha || fechaHoy}" required style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px;">
                </div>
                
                <!-- Local -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-store" style="color: #10b981;"></i> Local
                    </label>
                    <select id="facturaLocal" required style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px;">
                        <option value="">Seleccionar local...</option>
    `;
    
    const localesPermitidos = getLocalesPermitidos();
    if (AppState.locales) {
        AppState.locales.forEach(local => {
            if (localesPermitidos.includes(local.nombre)) {
                const selected = facturaEdit?.local === local.nombre ? 'selected' : '';
                html += `<option value="${local.nombre}" ${selected}>${local.nombre}</option>`;
            }
        });
    }
    
    html += `
                    </select>
                </div>
                
                <!-- Número de factura (opcional) -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-hashtag" style="color: #10b981;"></i> Número de factura
                    </label>
                    <input type="text" id="facturaNumero" value="${facturaEdit?.numeroFactura || ''}" placeholder="Ej: 001-0001" style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px;">
                </div>
                
                <!-- Monto (CON DECIMALES) -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-dollar-sign" style="color: #10b981;"></i> Monto (₡)
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="background: #10b981; color: white; padding: 12px 20px; border-radius: 12px; font-weight: 600;">₡</span>
                        <input type="number" id="facturaMonto" value="${facturaEdit?.monto || ''}" min="0" step="any" placeholder="0.00" required style="flex: 1; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px;">
                    </div>
                    <small style="color: #64748b;">Puede usar decimales (ej: 400342.50)</small>
                </div>
                
                <!-- Botones -->
                <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 2px solid #eef2f6; padding-top: 20px;">
                    <button type="submit" style="padding: 12px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-save"></i> ${editId ? 'Actualizar' : 'Guardar'} Factura
                    </button>
                </div>
            </form>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
}

// ============================================
// GUARDAR FACTURA (CON DECIMALES)
// ============================================
async function guardarFactura(editId = null) {
    const fecha = document.getElementById('facturaFecha').value;
    const local = document.getElementById('facturaLocal').value;
    const numeroFactura = document.getElementById('facturaNumero').value;
    let monto = parseFloat(document.getElementById('facturaMonto').value) || 0;
    
    // Redondear a 2 decimales para mayor precisión
    monto = Math.round(monto * 100) / 100;
    
    if (!fecha || !local || monto === 0) {
        alert('Complete los campos obligatorios (fecha, local y monto)');
        return;
    }
    
    const data = {
        fecha,
        local: local,  // ✅ minúscula
        numeroFactura: numeroFactura || null,
        monto,
        ultimaModificacion: new Date().toISOString(),
        modificadoPor: AppState?.usuario?.email || 'sistema'
    };
    
    try {
        const btn = document.querySelector('#facturaModal button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }
        
        if (editId) {
            await firebase.database().ref(`facturacionBodegas/${editId}`).update(data);
            alert('✅ Factura actualizada');
        } else {
            data.fechaCreacion = new Date().toISOString();
            data.creadoPor = AppState?.usuario?.email || 'sistema';
            await firebase.database().ref('facturacionBodegas').push(data);
            alert('✅ Factura agregada');
        }
        
        document.getElementById('facturaModal').remove();
        document.getElementById('modalOverlay').classList.remove('active');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
        
        const btn = document.querySelector('#facturaModal button[type="submit"]');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar Factura';
        }
    }
}

// ============================================
// EDITAR FACTURA
// ============================================
function editarFactura(id) {
    agregarFactura(id);
}

// ============================================
// ELIMINAR FACTURA
// ============================================
function eliminarFactura(id) {
    if (!confirm('¿Eliminar esta factura?')) return;
    
    firebase.database().ref(`facturacionBodegas/${id}`).remove()
        .then(() => alert('✅ Factura eliminada'))
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar');
        });
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initFacturacion = initFacturacion;
window.renderFacturacion = renderFacturacion;
window.agregarFactura = agregarFactura;
window.guardarFactura = guardarFactura;
window.editarFactura = editarFactura;
window.eliminarFactura = eliminarFactura;

console.log('✅ facturacion.js cargado - Versión con decimales');