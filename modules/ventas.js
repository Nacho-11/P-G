// modules/ventas.js

const COMISIONES = {
    PEDIDOS_YA: 0.18,
    DIDI: 0.18,
    UBER: 0.44,
    Bac: 0.0225,
};

console.log('📦 ventas.js cargado');

function limpiarFecha(fecha) {
    if (!fecha) return '';
    return fecha.split('T')[0];
}

// ============================================
// CARGAR VENTAS DESDE FIREBASE
// ============================================
function cargarVentasDesdeFirebase() {
    console.log('🔄 Intentando cargar ventas desde Firebase...');
    
    const ventasRef = firebase.database().ref('ventas');
    
    ventasRef.on('value', (snapshot) => {
        const data = snapshot.val();
        let ventasData = [];
        
        if (data) {
            for (const id in data) {
                const venta = data[id];
                let fecha = venta.fecha;
                if (fecha && fecha.includes('T')) {
                    fecha = fecha.split('T')[0];
                }
                
                ventasData.push({ 
                    id: id, 
                    ...venta,
                    fecha: fecha
                });
            }
            console.log(`✅ ${ventasData.length} ventas cargadas desde Firebase`);
        } else {
            console.log('📭 No hay ventas en Firebase');
            ventasData = [];
        }
        
        window.ventasData = ventasData;
        
        if (document.getElementById('ventas').classList.contains('active')) {
            renderVentas();
        }
        if (document.getElementById('dashboard').classList.contains('active') && window.renderDashboard) {
            window.renderDashboard();
        }
        
    }, (error) => {
        console.error('❌ Error cargando ventas:', error);
        window.ventasData = [];
    });
}

// ============================================
// RENDERIZAR VISTA DE VENTAS (VERSIÓN PROFESIONAL)
// ============================================
function renderVentas() {
    console.log('Renderizando ventas...');
    const ventasContent = document.getElementById('ventasContent');
    if (!ventasContent) return;
    
    if (!AppState || !AppState.locales) {
        console.error('❌ AppState no está disponible');
        return;
    }
    
    const ventasData = window.ventasData || [];
    
    console.log('📊 Total ventas en memoria:', ventasData.length);
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';

    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = ayerStr.substring(0, 7);
    const anioActual = ayerStr.substring(0, 4);

    // FILTRAR VENTAS POR LOCAL (con permisos)
    const ventasFiltradas = ventasData.filter(v => {
        if (!puedeVerLocal(v.local)) return false;
        if (filtroLocal !== 'Todos' && v.local !== filtroLocal) return false;
        
        const fechaVenta = limpiarFecha(v.fecha);
        if (!fechaVenta) return false;
        
        if (filtroTiempo === 'ayer') return fechaVenta === ayerStr;
        if (filtroTiempo === 'mes') return fechaVenta.substring(0, 7) === mesActual;
        if (filtroTiempo === 'personalizado') return fechaVenta === AppState.filtros?.fechaPersonalizada;
        
        return true;
    });
    
    // Calcular totales
    const totales = ventasFiltradas.reduce((acc, v) => {
        const comisiones = (v.pedidosYa || 0) * 0.18 + 
                          (v.didi || 0) * 0.18 + 
                          (v.uber || 0) * 0.44 + 
                          (v.bac || 0) * 0.0225;
        return {
            brutas: acc.brutas + (v.total || 0),
            comisiones: acc.comisiones + comisiones,
            netas: acc.netas + ((v.total || 0) - comisiones - (v.gastos || 0))
        };
    }, { brutas: 0, comisiones: 0, netas: 0 });
    
    let html = `
        <div class="ventas-shell">
            <div class="ventas-hero">
                <div class="ventas-hero-left">
                    <div class="ventas-hero-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div>
                        <h2 class="ventas-hero-title">Ventas</h2>
                        <p class="ventas-hero-subtitle">Registro y control de ingresos por local y canal</p>
                    </div>
                </div>

                <div class="ventas-toolbar">
                    <button class="btn btn-primary" onclick="mostrarModalVenta()">
                        <i class="fas fa-plus"></i> Nueva Venta
                    </button>
                </div>
            </div>

            <div class="ventas-stats-grid">
                <div class="ventas-stat-card blue">
                    <div class="ventas-stat-inner">
                        <div class="ventas-stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div>
                            <div class="ventas-stat-label">VENTAS BRUTAS</div>
                            <div class="ventas-stat-value">₡${Math.round(totales.brutas).toLocaleString()}</div>
                            <div class="ventas-stat-subtext">Total sin comisiones</div>
                        </div>
                    </div>
                </div>

                <div class="ventas-stat-card red">
                    <div class="ventas-stat-inner">
                        <div class="ventas-stat-icon">
                            <i class="fas fa-percent"></i>
                        </div>
                        <div>
                            <div class="ventas-stat-label">COMISIONES</div>
                            <div class="ventas-stat-value">₡${Math.round(totales.comisiones).toLocaleString()}</div>
                            <div class="ventas-stat-subtext">Delivery y BAC</div>
                        </div>
                    </div>
                </div>

                <div class="ventas-stat-card green">
                    <div class="ventas-stat-inner">
                        <div class="ventas-stat-icon">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div>
                            <div class="ventas-stat-label">VENTAS NETAS</div>
                            <div class="ventas-stat-value">₡${Math.round(totales.netas).toLocaleString()}</div>
                            <div class="ventas-stat-subtext">Después de comisiones</div>
                        </div>
                    </div>
                </div>
            </div>
    `;
    
    if (ventasFiltradas.length === 0) {
        html += `
            <div class="ventas-empty-card">
                <i class="fas fa-shopping-cart"></i>
                <h3>No hay ventas registradas</h3>
                <p>Haga clic en "Nueva Venta" para agregar una.</p>
                <button class="btn btn-primary" onclick="mostrarModalVenta()">
                    <i class="fas fa-plus"></i> Nueva Venta
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="ventas-panel ventas-table-panel">
                <div class="ventas-panel-header">
                    <h3 class="ventas-panel-title">
                        <i class="fas fa-clock"></i> Últimas Ventas
                    </h3>
                    <span class="ventas-pill">${ventasFiltradas.length} registros</span>
                </div>

                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Local</th>
                                <th>Efectivo</th>
                                <th>Tarjeta</th>
                                <th>Delivery</th>
                                <th>Total</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        ventasFiltradas.slice(0, 50).forEach(v => {
            const delivery = (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
            const fecha = v.fecha ? new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-CR') : '—';
            
            html += `
                <tr>
                    <td><strong>${fecha}</strong></td>
                    <td>${v.local || '—'}</td>
                    <td>₡${(v.efectivo || 0).toLocaleString()}</td>
                    <td>₡${(v.bac || 0).toLocaleString()}</td>
                    <td><span class="ventas-delivery-badge">₡${delivery.toLocaleString()}</span></td>
                    <td><span class="ventas-total-badge">₡${(v.total || 0).toLocaleString()}</span></td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                                <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); seleccionarFila(this); verDetalleVenta('${v.id}')" title="Ver detalle">
                                    <i class="fas fa-eye"></i>
                                </button>
                            ${esGerencia() ? `
                                <button class="btn btn-sm btn-danger" onclick="eliminarVenta('${v.id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
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
            
            <!-- Información adicional -->
            <div class="ventas-footer-note">
                <span>
                    <i class="fas fa-filter"></i> Mostrando ${Math.min(ventasFiltradas.length, 50)} de ${ventasFiltradas.length} ventas
                </span>
                <span>
                    <i class="fas fa-percent"></i> Comisiones: PedidosYa/Didi 18% | Uber 44% | BAC 2.25%
                </span>
            </div>
        `;
    }

    html += `
        <div id="detalleVentaPanel" class="detalle-venta-panel">
            <div id="detalleVentaPanelContent"></div>
        </div>
    `;
    
    ventasContent.innerHTML = html;
}

// ============================================
// MOSTRAR MODAL DE VENTA
// ============================================
function mostrarModalVenta() {
    const modal = document.getElementById('ventaModal');
    const overlay = document.getElementById('modalOverlay');

    if (!modal || !overlay) {
        console.error('❌ No se encontró ventaModal o modalOverlay');
        return;
    }

    // Mostrar primero el modal
    modal.classList.add('active');
    overlay.classList.add('active');

    try {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        const fechaActual = `${año}-${mes}-${dia}`;

        const ventaFecha = document.getElementById('ventaFecha');
        if (ventaFecha) ventaFecha.value = fechaActual;

        ['ventaEfectivo', 'ventaBAC', 'ventaPersonal', 'ventaGastos',
         'ventaPedidosYa', 'ventaDidi', 'ventaUber'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = '0';
        });

        const selectLocal = document.getElementById('ventaLocal');
        if (selectLocal) {
            selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';

            const localesPermitidos =
                typeof getLocalesPermitidos === 'function' ? getLocalesPermitidos() : [];

            const locales = Array.isArray(AppState?.locales) ? AppState.locales : [];

            locales.forEach(local => {
                if (localesPermitidos.length === 0 || localesPermitidos.includes(local.nombre)) {
                    selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
                }
            });

            if (typeof esGerencia === 'function' && !esGerencia() && AppState?.usuario?.local) {
                selectLocal.value = AppState.usuario.local;
                selectLocal.disabled = true;
            } else {
                selectLocal.disabled = false;
            }
        }

        if (typeof calcularTotalesVenta === 'function') {
            calcularTotalesVenta();
        }

    } catch (error) {
        console.error('❌ Error en mostrarModalVenta:', error);
    }
}

// ============================================
// CALCULAR TOTALES DE VENTA
// ============================================
function calcularTotalesVenta() {
    const efectivo = parseFloat(document.getElementById('ventaEfectivo')?.value) || 0;
    const bac = parseFloat(document.getElementById('ventaBAC')?.value) || 0;
    const personal = parseFloat(document.getElementById('ventaPersonal')?.value) || 0;
    const gastos = parseFloat(document.getElementById('ventaGastos')?.value) || 0;
    const pedidosYa = parseFloat(document.getElementById('ventaPedidosYa')?.value) || 0;
    const didi = parseFloat(document.getElementById('ventaDidi')?.value) || 0;
    const uber = parseFloat(document.getElementById('ventaUber')?.value) || 0;
    
    const comisionPedidosYa = pedidosYa * COMISIONES.PEDIDOS_YA;
    const comisionDidi = didi * COMISIONES.DIDI;
    const comisionUber = uber * COMISIONES.UBER;
    const comisionBac = bac * COMISIONES.Bac;
    const totalComisiones = comisionPedidosYa + comisionDidi + comisionUber + comisionBac;
    const ventasBrutas = efectivo + bac + personal + pedidosYa + didi + uber;
    const ventasNetas = ventasBrutas - totalComisiones - gastos;
    
    const elementos = {
        'ventasBrutas': ventasBrutas,
        'comisionBac': comisionBac,
        'totalComisiones': totalComisiones,
        'totalGastos': gastos,
        'ventasNetas': ventasNetas,
        'comisionPedidosYa': comisionPedidosYa,
        'comisionDidi': comisionDidi,
        'comisionUber': comisionUber
    };
    
    for (const [id, valor] of Object.entries(elementos)) {
        const el = document.getElementById(id);
        if (el) el.textContent = `₡${Math.round(valor).toLocaleString()}`;
    }
}

// ============================================
// GUARDAR VENTA EN FIREBASE
// ============================================
async function guardarVenta() {
    const fechaInput = document.getElementById('ventaFecha')?.value;
    let local = document.getElementById('ventaLocal')?.value;
    
    if (!esGerencia() && AppState.usuario?.local) local = AppState.usuario.local;
    
    if (!fechaInput || !local) {
        alert('Por favor seleccione fecha y local');
        return;
    }
    
    const efectivo = parseFloat(document.getElementById('ventaEfectivo')?.value) || 0;
    const bac = parseFloat(document.getElementById('ventaBAC')?.value) || 0;
    const personal = parseFloat(document.getElementById('ventaPersonal')?.value) || 0;
    const gastos = parseFloat(document.getElementById('ventaGastos')?.value) || 0;
    const pedidosYa = parseFloat(document.getElementById('ventaPedidosYa')?.value) || 0;
    const didi = parseFloat(document.getElementById('ventaDidi')?.value) || 0;
    const uber = parseFloat(document.getElementById('ventaUber')?.value) || 0;
    const total = efectivo + bac + personal + pedidosYa + didi + uber;
    
    const ventaData = {
        fecha: fechaInput,
        local, 
        efectivo, 
        bac, 
        personal, 
        gastos, 
        pedidosYa, 
        didi, 
        uber, 
        total,
        comisiones: {
            pedidosYa: pedidosYa * COMISIONES.PEDIDOS_YA,
            didi: didi * COMISIONES.DIDI,
            uber: uber * COMISIONES.UBER,
            bac: bac * COMISIONES.Bac,
            total: (pedidosYa * COMISIONES.PEDIDOS_YA) + (didi * COMISIONES.DIDI) + (uber * COMISIONES.UBER) + (bac * COMISIONES.Bac)
        },
        creadoPor: AppState.usuario?.email || 'sistema',
        creadorUid: AppState.usuario?.uid || null
    };
    
    console.log('📝 Guardando venta:', ventaData);
    
    try {
        const btn = document.querySelector('#ventaModal .btn-primary');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }
        
        await firebase.database().ref('ventas').push(ventaData);
        cerrarModal('ventaModal');
        alert('✅ Venta registrada con éxito');
        
    } catch (error) {
        console.error('Error guardando venta:', error);
        alert('Error al guardar la venta: ' + error.message);
    } finally {
        const btn = document.querySelector('#ventaModal .btn-primary');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar Venta'; }
    }
}

// ============================================
// ELIMINAR VENTA
// ============================================
async function eliminarVenta(id) {
    if (!confirm('¿Está seguro de eliminar esta venta?')) return;
    try {
        await firebase.database().ref(`ventas/${id}`).remove();
        alert('✅ Venta eliminada');
    } catch (error) {
        console.error('Error eliminando venta:', error);
        alert('Error al eliminar la venta');
    }
}

async function verDetalleVenta(id) {
    console.log('🔍 Cargando detalle de venta en panel:', id);

    const panel = document.getElementById('detalleVentaPanel');
    const content = document.getElementById('detalleVentaPanelContent');

    if (!panel || !content) {
        console.error('❌ No se encontró detalleVentaPanel o detalleVentaPanelContent');
        return;
    }

    panel.style.display = 'block';
    panel.classList.add('active');

    content.innerHTML = `
        <div style="text-align:center; padding:40px;">
            <i class="fas fa-spinner fa-spin" style="font-size:2rem; color:#3b82f6;"></i>
            <p style="margin-top:15px; color:#64748b;">Cargando información de la venta...</p>
        </div>
    `;

    try {
        const snapshot = await firebase.database().ref(`ventas/${id}`).once('value');
        const venta = snapshot.val();

        console.log('📦 Venta cargada:', venta);

        if (!venta) {
            content.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem; color:#ef4444;"></i>
                    <p style="margin-top:15px; color:#64748b;">Venta no encontrada</p>
                </div>
            `;
            return;
        }

        let fechaFormateada = venta.fecha || '—';
        if (venta.fecha) {
            try {
                fechaFormateada = new Date(venta.fecha + 'T12:00:00').toLocaleDateString('es-CR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {}
        }

        const efectivo = Number(venta.efectivo || 0);
        const bac = Number(venta.bac || 0);
        const personal = Number(venta.personal || 0);
        const gastos = Number(venta.gastos || 0);
        const pedidosYa = Number(venta.pedidosYa || 0);
        const didi = Number(venta.didi || 0);
        const uber = Number(venta.uber || 0);
        const total = Number(venta.total || 0);

        const comisionPedidosYa = pedidosYa * 0.18;
        const comisionDidi = didi * 0.18;
        const comisionUber = uber * 0.44;
        const comisionBac = bac * 0.0225;
        const comisionesTotal = comisionPedidosYa + comisionDidi + comisionUber + comisionBac;
        const neto = total - comisionesTotal - gastos;

        content.innerHTML = `
            <div class="detalle-venta-header">
                <div class="detalle-venta-title-wrap">
                    <h3><i class="fas fa-receipt"></i> Detalle de Venta</h3>
                    <p>Información completa del registro seleccionado</p>
                </div>

                <button class="detalle-venta-btn" onclick="cerrarDetalleVentaPanel()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>

            <div class="detalle-venta-top-grid">
                <div class="detalle-venta-meta-card">
                    <div class="detalle-venta-meta-label">Fecha</div>
                    <div class="detalle-venta-meta-value">${fechaFormateada}</div>
                </div>

                <div class="detalle-venta-meta-card">
                    <div class="detalle-venta-meta-label">Local</div>
                    <div class="detalle-venta-meta-value">${venta.local || '—'}</div>
                </div>
            </div>

            <div class="detalle-venta-grid">
                <div class="detalle-venta-card ingresos">
                    <h4><i class="fas fa-coins"></i> Ingresos</h4>
                    <div class="detalle-venta-list">
                        <div class="detalle-venta-row ingreso"><span class="label">Efectivo</span><span class="value">₡${efectivo.toLocaleString()}</span></div>
                        <div class="detalle-venta-row ingreso"><span class="label">BAC</span><span class="value">₡${bac.toLocaleString()}</span></div>
                        <div class="detalle-venta-row ingreso"><span class="label">Personal</span><span class="value">₡${personal.toLocaleString()}</span></div>
                        <div class="detalle-venta-row ingreso"><span class="label">Pedidos Ya</span><span class="value">₡${pedidosYa.toLocaleString()}</span></div>
                        <div class="detalle-venta-row ingreso"><span class="label">Didi</span><span class="value">₡${didi.toLocaleString()}</span></div>
                        <div class="detalle-venta-row ingreso"><span class="label">Uber</span><span class="value">₡${uber.toLocaleString()}</span></div>
                    </div>
                </div>

                <div class="detalle-venta-card comisiones">
                    <h4><i class="fas fa-chart-line-down"></i> Comisiones y gastos</h4>
                    <div class="detalle-venta-list">
                        <div class="detalle-venta-row gasto"><span class="label">Comisión Pedidos Ya</span><span class="value">₡${Math.round(comisionPedidosYa).toLocaleString()}</span></div>
                        <div class="detalle-venta-row gasto"><span class="label">Comisión Didi</span><span class="value">₡${Math.round(comisionDidi).toLocaleString()}</span></div>
                        <div class="detalle-venta-row gasto"><span class="label">Comisión Uber</span><span class="value">₡${Math.round(comisionUber).toLocaleString()}</span></div>
                        <div class="detalle-venta-row gasto"><span class="label">Comisión BAC</span><span class="value">₡${Math.round(comisionBac).toLocaleString()}</span></div>
                        <div class="detalle-venta-row gasto"><span class="label">Gastos</span><span class="value">₡${gastos.toLocaleString()}</span></div>
                    </div>
                </div>
            </div>

            <div class="detalle-venta-summary">
                <div class="detalle-venta-summary-row">
                    <span>Total bruto</span>
                    <span class="value">₡${total.toLocaleString()}</span>
                </div>
                <div class="detalle-venta-summary-row">
                    <span>Total comisiones</span>
                    <span class="value">₡${Math.round(comisionesTotal).toLocaleString()}</span>
                </div>
                <div class="detalle-venta-summary-total">
                    <span>Venta neta</span>
                    <span class="value">₡${Math.round(neto).toLocaleString()}</span>
                </div>
            </div>
        `;

        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

        panel.style.boxShadow = '0 0 0 3px #bfdbfe';
        setTimeout(() => {
            panel.style.boxShadow = '';
        }, 800);

    } catch (error) {
        console.error('❌ Error cargando detalle de venta:', error);
        content.innerHTML = `
            <div style="text-align:center; padding:40px;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem; color:#ef4444;"></i>
                <p style="margin-top:15px; color:#64748b;">Error al cargar el detalle</p>
                <p style="font-size:.8rem; color:#94a3b8;">${error.message}</p>
            </div>
        `;
    }
}

function cerrarDetalleVentaPanel() {
    const panel = document.getElementById('detalleVentaPanel');
    const content = document.getElementById('detalleVentaPanelContent');

    if (panel) {
        panel.classList.remove('active');
        setTimeout(() => {
            panel.style.display = 'none';
        }, 200);
    }

    if (content) content.innerHTML = '';
}

function seleccionarFila(element) {
    document.querySelectorAll('.selected-row').forEach(el => {
        el.classList.remove('selected-row');
    });

    const fila = element.closest ? element.closest('tr') : element;
    if (fila) fila.classList.add('selected-row');
}

// ============================================
// INICIALIZAR
// ============================================
function initVentas() {
    console.log('Inicializando ventas...');
    
    setTimeout(() => {
        if (AppState && AppState.usuario) {
            console.log('👤 Usuario autenticado, cargando ventas...');
            cargarVentasDesdeFirebase();
        } else {
            console.log('⏳ Esperando autenticación...');
            setTimeout(initVentas, 1000);
        }
    }, 500);
}

window.renderVentas = renderVentas;
window.mostrarModalVenta = mostrarModalVenta;
window.calcularTotalesVenta = calcularTotalesVenta;
window.guardarVenta = guardarVenta;
window.eliminarVenta = eliminarVenta;
window.verDetalleVenta = verDetalleVenta;
window.initVentas = initVentas;
window.cargarVentasDesdeFirebase = cargarVentasDesdeFirebase;
window.cerrarDetalleVentaPanel = cerrarDetalleVentaPanel;
window.seleccionarFila = seleccionarFila;

console.log('Ventas:', window.ventasData);