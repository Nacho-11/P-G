// modules/compras.js
// Módulo para registro de compras externas por día

console.log('🛒 Cargando módulo de Compras Externas...');

// ============================================
// VARIABLES GLOBALES
// ============================================
let compras = [];

// ============================================
// CONFIGURACIÓN
// ============================================
const MAX_COMPRAS_POR_DIA = 4; // Como en el Excel: 4 columnas de proveedores

// ============================================
// INICIALIZAR MÓDULO
// ============================================
function initCompras() {
    console.log('🚀 Inicializando módulo de Compras Externas...');
    
    if (!AppState?.usuario) {
        console.log('⏳ Esperando autenticación...');
        return;
    }
    
    cargarCompras();
    
    if (document.getElementById('compras').classList.contains('active')) {
        renderCompras();
    }
}

// ============================================
// CARGAR COMPRAS DESDE FIREBASE
// ============================================
function cargarCompras() {
    console.log('📥 Cargando compras externas...');
    
    firebase.database().ref('comprasExternas').on('value', (snapshot) => {
        const data = snapshot.val();
        compras = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                compras.push({
                    id: key,
                    ...data[key]
                });
            });
            
            // Ordenar por fecha descendente
            compras.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }
        
        console.log(`✅ ${compras.length} compras cargadas`);
        
        if (document.getElementById('compras').classList.contains('active')) {
            renderCompras();
        }
    });
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================
function renderCompras() {
    console.log('📊 Renderizando Compras Externas...');
    
    const content = document.getElementById('comprasContent');
    if (!content) return;
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    
    // Calcular fechas para filtros
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);
    
    // Filtrar compras
    const comprasFiltradas = compras.filter(c => {
        if (!c.fecha) return false;
        
        if (filtroTiempo === 'todos') return true;
        if (filtroTiempo === 'ayer') return c.fecha === ayerStr;
        if (filtroTiempo === 'mes') return c.fecha.substring(0, 7) === mesActual;
        if (filtroTiempo === 'anio') return c.fecha.substring(0, 4) === anioActual;
        if (filtroTiempo === 'personalizado') return c.fecha === AppState.filtros?.fechaPersonalizada;
        
        return true;
    });
    
    // Calcular total general
    const totalGeneral = comprasFiltradas.reduce((sum, c) => sum + (c.monto || 0), 0);
    
    // Agrupar por fecha para la vista de tabla
    const comprasPorFecha = {};
    comprasFiltradas.forEach(c => {
        if (!comprasPorFecha[c.fecha]) {
            comprasPorFecha[c.fecha] = [];
        }
        comprasPorFecha[c.fecha].push(c);
    });
    
    // Ordenar fechas descendente
    const fechasOrdenadas = Object.keys(comprasPorFecha).sort().reverse();
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-truck" style="color: #f59e0b;"></i> Compras Externas</h2>
            <div style="display: flex; gap: 10px;">
                ${esGerencia() ? `
                    <button class="btn btn-primary" onclick="window.mostrarModalCompra()">
                        <i class="fas fa-plus"></i> Nueva Compra
                    </button>
                ` : ''}
            </div>
        </div>
        
        <!-- Tarjeta de total general -->
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; padding: 25px; color: white; margin-bottom: 25px; box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3);">
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-calculator" style="font-size: 2rem;"></i>
                </div>
                <div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">TOTAL COMPRAS EXTERNAS</div>
                    <div style="font-size: 2.5rem; font-weight: 700;">₡${totalGeneral.toLocaleString()}</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">${comprasFiltradas.length} registros</div>
                </div>
            </div>
        </div>
    `;
    
    if (fechasOrdenadas.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-truck" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3>No hay compras registradas</h3>
                <p>Haga clic en "Nueva Compra" para comenzar.</p>
            </div>
        `;
    } else {
        fechasOrdenadas.forEach(fecha => {
            const comprasDia = comprasPorFecha[fecha];
            const totalDia = comprasDia.reduce((sum, c) => sum + (c.monto || 0), 0);
            const fechaFormateada = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CR');
            
            html += `
                <div class="card" style="margin-bottom: 20px; padding: 0; overflow: hidden;">
                    <div style="background: #f1f5f9; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0;">
                        <h3 style="margin: 0; color: #1e293b; font-size: 1.1rem;">
                            <i class="fas fa-calendar-alt" style="color: #f59e0b;"></i> ${fechaFormateada}
                        </h3>
                        <span style="background: #f59e0b; color: white; padding: 5px 15px; border-radius: 20px; font-weight: 600;">
                            Total: ₡${totalDia.toLocaleString()}
                        </span>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Proveedor</th>
                                        <th>N° Factura</th>
                                        <th>Monto</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            comprasDia.forEach(c => {
                html += `
                    <tr>
                        <td><strong>${c.proveedor || '—'}</strong></td>
                        <td>${c.numeroFactura || '—'}</td>
                        <td style="color: #f59e0b; font-weight: 600;">₡${(c.monto || 0).toLocaleString()}</td>
                        <td>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-sm btn-outline" onclick="window.editarCompra('${c.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="window.eliminarCompra('${c.id}')" title="Eliminar">
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
        });
    }
    
    content.innerHTML = html;
}

// ============================================
// MOSTRAR MODAL DE NUEVA COMPRA
// ============================================
function mostrarModalCompra(editId = null) {
    console.log('📝 Abriendo modal de compra externa');
    
    const overlay = document.getElementById('modalOverlay');
    
    // Crear modal dinámico
    const modalExistente = document.getElementById('compraModal');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'compraModal';
    modal.className = 'modal';
    modal.style.maxWidth = '500px';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    
    // Si es edición, buscar la compra
    let compraEdit = null;
    if (editId) {
        compraEdit = compras.find(c => c.id === editId);
    }
    
    // Calcular fecha actual
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaHoy = `${año}-${mes}-${dia}`;
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 25px 30px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-truck" style="font-size: 1.8rem;"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem;">${editId ? 'Editar' : 'Nueva'} Compra Externa</h2>
                    <p style="margin: 4px 0 0; opacity: 0.8;">Complete los datos de la compra</p>
                </div>
            </div>  
        </div>
        
        <div class="modal-body" style="padding: 30px; background: #f8fafc;">
            <form id="compraForm" onsubmit="event.preventDefault(); window.guardarCompra('${editId || ''}');">
                
                <!-- Fecha -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-calendar-alt" style="color: #f59e0b;"></i> Fecha
                    </label>
                    <input type="date" id="compraFecha" value="${compraEdit?.fecha || fechaHoy}" required style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px; font-size: 1rem;">
                </div>
                
                <!-- Proveedor -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-store" style="color: #f59e0b;"></i> Proveedor
                    </label>
                    <input type="text" id="compraProveedor" value="${compraEdit?.proveedor || ''}" placeholder="Ej: priscillA, Distribuidora XYZ" required style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px; font-size: 1rem;">
                </div>
                
                <!-- Número de factura -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-hashtag" style="color: #f59e0b;"></i> Número de factura
                    </label>
                    <input type="text" id="compraNumero" value="${compraEdit?.numeroFactura || ''}" placeholder="Ej: 2126" style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px; font-size: 1rem;">
                </div>
                
                <!-- Monto -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-dollar-sign" style="color: #f59e0b;"></i> Monto (₡)
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="background: #f59e0b; color: white; padding: 12px 20px; border-radius: 12px; font-weight: 600;">₡</span>
                        <input type="number" id="compraMonto" value="${compraEdit?.monto || ''}" min="0" step="100" placeholder="0" required style="flex: 1; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px; font-size: 1rem;">
                    </div>
                </div>
                
                <!-- Botones -->
                <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 2px solid #eef2f6; padding-top: 20px;">
                    <button type="button" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" style="padding: 12px 24px; border: 2px solid #eef2f6; background: white; color: #64748b; border-radius: 12px; font-weight: 600; cursor: pointer;">
                        Cancelar
                    </button>
                    <button type="submit" style="padding: 12px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);">
                        <i class="fas fa-save"></i> ${editId ? 'Actualizar' : 'Guardar'} Compra
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
// GUARDAR COMPRA
// ============================================
async function guardarCompra(editId = null) {
    const fecha = document.getElementById('compraFecha').value;
    const proveedor = document.getElementById('compraProveedor').value.trim();
    const numeroFactura = document.getElementById('compraNumero').value.trim();
    const monto = parseFloat(document.getElementById('compraMonto').value) || 0;
    
    if (!fecha || !proveedor || monto === 0) {
        alert('Complete los campos obligatorios (fecha, proveedor y monto)');
        return;
    }
    
    const data = {
        fecha,
        proveedor,
        numeroFactura: numeroFactura || null,
        monto,
        ultimaModificacion: new Date().toISOString(),
        modificadoPor: AppState.usuario?.email || 'sistema'
    };
    
    try {
        if (editId) {
            await firebase.database().ref(`comprasExternas/${editId}`).update(data);
            alert('✅ Compra actualizada');
        } else {
            data.fechaCreacion = new Date().toISOString();
            data.creadoPor = AppState.usuario?.email || 'sistema';
            await firebase.database().ref('comprasExternas').push(data);
            alert('✅ Compra guardada');
        }
        
        // Cerrar modal
        document.getElementById('compraModal').remove();
        document.getElementById('modalOverlay').classList.remove('active');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    }
}

// ============================================
// EDITAR COMPRA
// ============================================
function editarCompra(id) {
    mostrarModalCompra(id);
}

// ============================================
// ELIMINAR COMPRA
// ============================================
function eliminarCompra(id) {
    if (!confirm('¿Eliminar esta compra?')) return;
    
    firebase.database().ref(`comprasExternas/${id}`).remove()
        .then(() => alert('✅ Compra eliminada'))
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar');
        });
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initCompras = initCompras;
window.renderCompras = renderCompras;
window.mostrarModalCompra = mostrarModalCompra;
window.guardarCompra = guardarCompra;
window.editarCompra = editarCompra;
window.eliminarCompra = eliminarCompra;

console.log('✅ compras.js cargado - Módulo simple');