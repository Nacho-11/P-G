// modules/ventas.js

const COMISIONES = {
    PEDIDOS_YA: 0.18,
    DIDI: 0.18,
    UBER: 0.44,
    Bac: 0.0225,
};

console.log('📦 ventas.js cargado');

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
                // Limpiar la fecha si viene con hora
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
            console.log('📦 Ventas procesadas:', ventasData);
        } else {
            console.log('📭 No hay ventas en Firebase');
            ventasData = [];
        }
        
        window.ventasData = ventasData;
        
        // Forzar renderizado
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
// RENDERIZAR VISTA DE VENTAS (VERSIÓN CORREGIDA)
// ============================================
function renderVentas() {
    console.log('Renderizando ventas...');
    const ventasContent = document.getElementById('ventasContent');
    if (!ventasContent) return;
    
    // Verificar que AppState existe
    if (!AppState || !AppState.locales) {
        console.error('❌ AppState no está disponible');
        return;
    }
    
    // Obtener ventasData con valor por defecto
    const ventasData = window.ventasData || [];
    
    console.log('📊 Total ventas en memoria:', ventasData.length);
    
    // Si no hay ventas, mostrar mensaje
    if (ventasData.length === 0) {
        ventasContent.innerHTML = `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-shopping-cart" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3 style="color: #4b5563;">No hay ventas registradas</h3>
                <p style="color: #6b7280;">Haga clic en "Nueva Venta" para agregar una.</p>
            </div>
        `;
        return;
    }
    
    // Determinar locales permitidos
    let localesPermitidos = AppState.usuario?.rol === 'gerencia' 
        ? AppState.locales.map(l => l.nombre)
        : (AppState.usuario?.rol === 'encargado' && AppState.usuario?.local) 
            ? [AppState.usuario.local]
            : AppState.locales.map(l => l.nombre);
    
    // Obtener filtros actuales
const filtroLocal = AppState.filtros?.local || 'Todos';
const filtroTiempo = AppState.filtros?.tiempo || 'todos';

// Calcular fecha de HOY (para referencia)
const hoy = new Date();
const hoyStr = hoy.toLocaleDateString('en-CA'); // YYYY-MM-DD

// Calcular fecha de AYER (para el filtro)
const ayer = new Date(hoy);
ayer.setDate(hoy.getDate() - 1);
const ayerStr = ayer.toLocaleDateString('en-CA');

const mesActual = ayerStr.substring(0, 7);
const anioActual = ayerStr.substring(0, 4);

console.log('📅 Ayer:', ayerStr);
console.log('📅 Mes actual:', mesActual);
console.log('📅 Año actual:', anioActual);

// FILTRAR VENTAS
const ventasFiltradas = ventasData.filter(v => {
    if (filtroLocal !== 'Todos' && v.local !== filtroLocal) return false;
    
    const fechaVenta = limpiarFecha(v.fecha);
    if (!fechaVenta) return false;
    
    if (filtroTiempo === 'ayer') {
        return fechaVenta === ayerStr;
    }
    if (filtroTiempo === 'mes') {
        return fechaVenta.substring(0, 7) === mesActual;
    }
    if (filtroTiempo === 'anio') {
        return fechaVenta.substring(0, 4) === anioActual;
    }
    if (filtroTiempo === 'personalizado') {
        return fechaVenta === AppState.filtros?.fechaPersonalizada;
    }
    
    return true; // 'todos'
});
    
    console.log('🎯 Ventas filtradas:', ventasFiltradas.length);
    
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
    
    // Generar HTML
    let ventasHTML = `
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
    `;
    
    if (ventasFiltradas.length > 0) {
        ventasFiltradas.forEach(v => {
            const delivery = (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
            const fecha = v.fecha ? v.fecha.split('T')[0] : 'Fecha no disponible';
            ventasHTML += `
                <tr>
                    <td>${fecha}</td>
                    <td><strong>${v.local || 'N/A'}</strong></td>
                    <td>₡${(v.efectivo || 0).toLocaleString()}</td>
                    <td>₡${(v.bac || 0).toLocaleString()}</td>
                    <td>₡${delivery.toLocaleString()}</td>
                    <td><strong>₡${(v.total || 0).toLocaleString()}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="verDetalleVenta('${v.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarVenta('${v.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        ventasHTML += `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #9ca3af; margin-bottom: 10px;"></i>
                    No hay ventas para mostrar
                </td>
            </tr>
        `;
    }
    
    ventasHTML += `
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
    
    // Fecha actual en formato YYYY-MM-DD
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaActual = `${año}-${mes}-${dia}`;
    
    document.getElementById('ventaFecha').value = fechaActual;
    
    // Resetear campos
    ['ventaEfectivo', 'ventaBAC', 'ventaPersonal', 'ventaGastos', 
     'ventaPedidosYa', 'ventaDidi', 'ventaUber'].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '0';
    });
    
    const selectLocal = document.getElementById('ventaLocal');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
        let localesAMostrar = AppState.usuario?.rol === 'gerencia' ? AppState.locales :
                             (AppState.usuario?.rol === 'encargado' && AppState.usuario?.local) ? 
                             AppState.locales.filter(l => l.nombre === AppState.usuario.local) : AppState.locales;
        
        localesAMostrar.forEach(local => {
            selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
        });
        
        if (AppState.usuario?.rol === 'encargado' && AppState.usuario?.local) {
            selectLocal.value = AppState.usuario.local;
            selectLocal.disabled = true;
        } else {
            selectLocal.disabled = false;
        }
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
// GUARDAR VENTA EN FIREBASE (VERSIÓN CORREGIDA)
// ============================================
async function guardarVenta() {
    const fechaInput = document.getElementById('ventaFecha')?.value; // YYYY-MM-DD
    let local = document.getElementById('ventaLocal')?.value;
    
    if (AppState.usuario?.rol === 'encargado' && AppState.usuario?.local) local = AppState.usuario.local;
    
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
        fecha: fechaInput, // ← ESTO ES LO IMPORTANTE: SOLO "2026-03-11"
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
    
    console.log('📝 Guardando venta:', ventaData); // Para verificar
    
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

// ============================================
// VER DETALLE DE VENTA
// ============================================
async function verDetalleVenta(id) {
    try {
        const snapshot = await firebase.database().ref(`ventas/${id}`).once('value');
        const venta = snapshot.val();
        if (!venta) { alert('Venta no encontrada'); return; }
        
        alert(`Fecha: ${venta.fecha}\nLocal: ${venta.local}\nEfectivo: ₡${(venta.efectivo || 0).toLocaleString()}\nTarjeta: ₡${(venta.bac || 0).toLocaleString()}\nDelivery: ₡${((venta.pedidosYa || 0) + (venta.didi || 0) + (venta.uber || 0)).toLocaleString()}\nPersonal: ₡${(venta.personal || 0).toLocaleString()}\nTotal: ₡${(venta.total || 0).toLocaleString()}\nComisiones: ₡${(venta.comisiones?.total || 0).toLocaleString()}\nGastos: ₡${(venta.gastos || 0).toLocaleString()}`);
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
    
    // Esperar a que AppState esté listo
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