// modules/ventas.js

const COMISIONES = {
    PEDIDOS_YA: 0.18,
    DIDI: 0.18,
    UBER: 0.44,
};

// ============================================
// CARGAR VENTAS DESDE FIREBASE
// ============================================
function cargarVentasDesdeFirebase() {
    const ventasRef = firebase.database().ref('ventas');
    
    ventasRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const ventasData = [];
        
        if (data) {
            for (const id in data) {
                ventasData.push({
                    id: id,
                    ...data[id]
                });
            }
        }
        
        // Guardar en variable global
        window.ventasData = ventasData;
        
        // Si estamos en la vista de ventas, recargar
        if (document.getElementById('ventas').classList.contains('active')) {
            renderVentas();
        }
        
        // Si el dashboard está activo, actualizarlo
        if (document.getElementById('dashboard').classList.contains('active') && typeof window.renderDashboard === 'function') {
            window.renderDashboard();
        }
    });
}

// ============================================
// RENDERIZAR VISTA DE VENTAS
// ============================================
function renderVentas() {
    console.log('Renderizando ventas...');
    const ventasContent = document.getElementById('ventasContent');
    
    if (!ventasContent) return;
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const ventasData = window.ventasData || [];
    
    // Filtrar ventas por local
    const ventasFiltradas = ventasData
        .filter(v => filtroLocal === 'Todos' || v.local === filtroLocal)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 50);
    
    // Calcular totales
    const totales = ventasFiltradas.reduce((acc, v) => {
        const delivery = (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
        const comisiones = (v.pedidosYa || 0) * 0.18 + (v.didi || 0) * 0.18 + (v.uber || 0) * 0.44;
        
        return {
            brutas: acc.brutas + (v.total || 0),
            comisiones: acc.comisiones + comisiones,
            netas: acc.netas + ((v.total || 0) - comisiones - (v.gastos || 0))
        };
    }, { brutas: 0, comisiones: 0, netas: 0 });
    
    const ventasHTML = `
        <!-- BARRA SUPERIOR -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 16px 24px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                <div>
                    <div style="font-size: 0.8rem; color: #64748b;">Ventas Brutas</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: #1e293b;">₡${Math.round(totales.brutas).toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size: 0.8rem; color: #64748b;">Comisiones</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: #ef4444;">₡${Math.round(totales.comisiones).toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size: 0.8rem; color: #64748b;">Ventas Netas</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: #10b981;">₡${Math.round(totales.netas).toLocaleString()}</div>
                </div>
            </div>
            <button class="btn btn-primary" onclick="mostrarModalVenta()" style="padding: 12px 32px;">
                <i class="fas fa-plus"></i> Nueva Venta
            </button>
        </div>

        <!-- TABLA DE VENTAS RECIENTES -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-clock"></i> Ventas Recientes</h3>
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
                        ${ventasFiltradas.length > 0 ? ventasFiltradas.map(v => {
                            const delivery = (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
                            return `
                            <tr>
                                <td>${new Date(v.fecha).toLocaleDateString('es-CR')}</td>
                                <td><strong>${v.local}</strong></td>
                                <td>₡${(v.efectivo || 0).toLocaleString()}</td>
                                <td>₡${(v.bac || 0).toLocaleString()}</td>
                                <td>₡${delivery.toLocaleString()}</td>
                                <td><strong>₡${(v.total || 0).toLocaleString()}</strong></td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="verDetalleVenta('${v.id}')" title="Ver detalle">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="eliminarVenta('${v.id}')" title="Eliminar venta">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `}).join('') : `
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 40px;">
                                    <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #9ca3af; margin-bottom: 10px; display: block;"></i>
                                    No hay ventas registradas
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    ventasContent.innerHTML = ventasHTML;
}

// ============================================
// MOSTRAR MODAL DE VENTA
// ============================================
function mostrarModalVenta() {
    const modal = document.getElementById('ventaModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) return;
    
    document.getElementById('ventaFecha').value = new Date().toISOString().split('T')[0];
    
    // Resetear campos
    ['ventaEfectivo', 'ventaBAC', 'ventaPersonal', 'ventaGastos', 
     'ventaPedidosYa', 'ventaDidi', 'ventaUber'].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '0';
    });
    
    // Cargar locales
    const selectLocal = document.getElementById('ventaLocal');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
        AppState.locales.forEach(local => {
            selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
        });
    }
    
    calcularTotalesVenta();
    modal.classList.add('active');
    overlay.classList.add('active');
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
    const totalComisiones = comisionPedidosYa + comisionDidi + comisionUber;
    const ventasBrutas = efectivo + bac + personal + pedidosYa + didi + uber;
    const ventasNetas = ventasBrutas - totalComisiones - gastos;
    
    const elementos = {
        'comisionPedidosYa': comisionPedidosYa,
        'comisionDidi': comisionDidi,
        'comisionUber': comisionUber,
        'ventasBrutas': ventasBrutas,
        'totalComisiones': totalComisiones,
        'totalGastos': gastos,
        'ventasNetas': ventasNetas
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
    const fecha = document.getElementById('ventaFecha')?.value;
    const local = document.getElementById('ventaLocal')?.value;
    
    if (!fecha || !local) {
        alert('Por favor seleccione fecha y local');
        return;
    }
    
    // Obtener valores
    const efectivo = parseFloat(document.getElementById('ventaEfectivo')?.value) || 0;
    const bac = parseFloat(document.getElementById('ventaBAC')?.value) || 0;
    const personal = parseFloat(document.getElementById('ventaPersonal')?.value) || 0;
    const gastos = parseFloat(document.getElementById('ventaGastos')?.value) || 0;
    const pedidosYa = parseFloat(document.getElementById('ventaPedidosYa')?.value) || 0;
    const didi = parseFloat(document.getElementById('ventaDidi')?.value) || 0;
    const uber = parseFloat(document.getElementById('ventaUber')?.value) || 0;
    
    // Calcular total
    const total = efectivo + bac + personal + pedidosYa + didi + uber;
    
    const ventaData = {
        fecha,
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
            total: (pedidosYa * COMISIONES.PEDIDOS_YA) + (didi * COMISIONES.DIDI) + (uber * COMISIONES.UBER)
        },
        creadoPor: AppState.usuario?.email || 'sistema',
        creadorUid: AppState.usuario?.uid || null,
        fechaCreacion: new Date().toISOString()
    };
    
    try {
        // Guardar en Firebase
        const ventasRef = firebase.database().ref('ventas');
        await ventasRef.push(ventaData);
        
        alert('✅ Venta registrada con éxito');
        cerrarModal('ventaModal');
        
    } catch (error) {
        console.error('Error guardando venta:', error);
        alert('Error al guardar la venta: ' + error.message);
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

// ============================================
// VER DETALLE DE VENTA
// ============================================
async function verDetalleVenta(id) {
    try {
        const snapshot = await firebase.database().ref(`ventas/${id}`).once('value');
        const venta = snapshot.val();
        
        if (!venta) {
            alert('Venta no encontrada');
            return;
        }
        
        const mensaje = `
            Fecha: ${new Date(venta.fecha).toLocaleDateString('es-CR')}
            Local: ${venta.local}
            
            Efectivo: ₡${(venta.efectivo || 0).toLocaleString()}
            Tarjeta: ₡${(venta.bac || 0).toLocaleString()}
            Delivery: ₡${((venta.pedidosYa || 0) + (venta.didi || 0) + (venta.uber || 0)).toLocaleString()}
            Personal: ₡${(venta.personal || 0).toLocaleString()}
            
            Total: ₡${(venta.total || 0).toLocaleString()}
            
            Comisiones: ₡${(venta.comisiones?.total || 0).toLocaleString()}
            Gastos: ₡${(venta.gastos || 0).toLocaleString()}
        `;
        
        alert(mensaje);
        
    } catch (error) {
        console.error('Error cargando venta:', error);
        alert('Error al cargar el detalle');
    }
}

// ============================================
// INICIALIZAR
// ============================================
function initVentas() {
    console.log('Inicializando ventas...');
    cargarVentasDesdeFirebase();
}

// ============================================
// HACER FUNCIONES GLOBALES
// ============================================
window.renderVentas = renderVentas;
window.mostrarModalVenta = mostrarModalVenta;
window.calcularTotalesVenta = calcularTotalesVenta;
window.guardarVenta = guardarVenta;
window.eliminarVenta = eliminarVenta;
window.verDetalleVenta = verDetalleVenta;
window.initVentas = initVentas;
window.cargarVentasDesdeFirebase = cargarVentasDesdeFirebase;