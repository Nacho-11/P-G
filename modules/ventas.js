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
        if (filtroTiempo === 'anio') return fechaVenta.substring(0, 4) === anioActual;
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-shopping-cart" style="color: #3b82f6;"></i> Ventas</h2>
            <button class="btn btn-primary" onclick="mostrarModalVenta()" style="padding: 12px 32px;">
                <i class="fas fa-plus"></i> Nueva Venta
            </button>
        </div>
        
        <!-- Tarjetas de resumen -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            
            <!-- Tarjeta Ventas Brutas -->
            <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 16px; padding: 25px; color: white; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-chart-line" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">VENTAS BRUTAS</div>
                        <div style="font-size: 1.8rem; font-weight: 700;">₡${Math.round(totales.brutas).toLocaleString()}</div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">Total sin comisiones</div>
                    </div>
                </div>
            </div>
            
            <!-- Tarjeta Comisiones -->
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 16px; padding: 25px; color: white; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-percent" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">COMISIONES</div>
                        <div style="font-size: 1.8rem; font-weight: 700;">₡${Math.round(totales.comisiones).toLocaleString()}</div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">Delivery y BAC</div>
                    </div>
                </div>
            </div>
            
            <!-- Tarjeta Ventas Netas -->
            <div style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 16px; padding: 25px; color: white; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-coins" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">VENTAS NETAS</div>
                        <div style="font-size: 1.8rem; font-weight: 700;">₡${Math.round(totales.netas).toLocaleString()}</div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">Después de comisiones</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (ventasFiltradas.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-shopping-cart" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3>No hay ventas registradas</h3>
                <p style="color: #64748b; margin-bottom: 25px;">Haga clic en "Nueva Venta" para agregar una.</p>
                <button class="btn btn-primary" onclick="mostrarModalVenta()" style="padding: 12px 32px;">
                    <i class="fas fa-plus"></i> Nueva Venta
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;"><i class="fas fa-clock" style="color: #3b82f6;"></i> Últimas Ventas</h3>
                    <span style="background: #f1f5f9; padding: 5px 15px; border-radius: 20px;">
                        ${ventasFiltradas.length} registros
                    </span>
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
                    <td>₡${delivery.toLocaleString()}</td>
                    <td style="color: #3b82f6; font-weight: 600;">₡${(v.total || 0).toLocaleString()}</td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm btn-outline" onclick="verDetalleVenta('${v.id}')" title="Ver detalle">
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
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 0.9rem; color: #64748b; display: flex; justify-content: space-between;">
                <span>
                    <i class="fas fa-filter"></i> Mostrando ${Math.min(ventasFiltradas.length, 50)} de ${ventasFiltradas.length} ventas
                </span>
                <span>
                    <i class="fas fa-percent"></i> Comisiones: PedidosYa/Didi 18% | Uber 44% | BAC 2.25%
                </span>
            </div>
        `;
    }
    
    ventasContent.innerHTML = html;
}

// ============================================
// MOSTRAR MODAL DE VENTA
// ============================================
function mostrarModalVenta() {
    const modal = document.getElementById('ventaModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;
    
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaActual = `${año}-${mes}-${dia}`;
    
    document.getElementById('ventaFecha').value = fechaActual;
    
    ['ventaEfectivo', 'ventaBAC', 'ventaPersonal', 'ventaGastos', 
     'ventaPedidosYa', 'ventaDidi', 'ventaUber'].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '0';
    });
    
    const selectLocal = document.getElementById('ventaLocal');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
        const localesPermitidos = getLocalesPermitidos();
        
        AppState.locales.forEach(local => {
            if (localesPermitidos.includes(local.nombre)) {
                selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
            }
        });
        
        if (!esGerencia() && AppState.usuario?.local) {
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

// ============================================
// VER DETALLE DE VENTA (CON MODAL)
// ============================================
async function verDetalleVenta(id) {
    console.log('🔍 Cargando detalle de venta:', id);
    
    // Verificar que el modal existe
    const modal = document.getElementById('detalleVentaModal');
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('detalleVentaContent');
    
    if (!modal) {
        console.error('❌ Modal detalleVentaModal no encontrado en el DOM');
        alert('Error: El modal de detalle no está disponible. Por favor recargue la página.');
        return;
    }
    
    if (!overlay) {
        console.error('❌ ModalOverlay no encontrado');
        alert('Error: No se puede mostrar el detalle.');
        return;
    }
    
    if (!content) {
        console.error('❌ Contenido detalleVentaContent no encontrado');
        alert('Error: No se puede mostrar el detalle.');
        return;
    }
    
    // Mostrar loading
    content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #3b82f6;"></i>
            <p style="margin-top: 15px; color: #64748b;">Cargando información de la venta...</p>
        </div>
    `;
    
    // Mostrar modal
    modal.classList.add('active');
    overlay.classList.add('active');
    
    try {
        const snapshot = await firebase.database().ref(`ventas/${id}`).once('value');
        const venta = snapshot.val();
        
        console.log('📦 Venta cargada:', venta);
        
        if (!venta) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ef4444;"></i>
                    <p style="margin-top: 15px; color: #64748b;">Venta no encontrada</p>
                    <p style="font-size: 0.8rem; color: #94a3b8;">ID: ${id}</p>
                </div>
            `;
            return;
        }
        
        // Formatear fecha
        let fechaFormateada = '—';
        if (venta.fecha) {
            try {
                const fecha = new Date(venta.fecha + 'T12:00:00');
                fechaFormateada = fecha.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' });
            } catch(e) {
                fechaFormateada = venta.fecha;
            }
        }
        
        // Calcular valores
        const delivery = (venta.pedidosYa || 0) + (venta.didi || 0) + (venta.uber || 0);
        const comisionBAC = (venta.bac || 0) * 0.0225;
        const comisionPedidosYa = (venta.pedidosYa || 0) * 0.18;
        const comisionDidi = (venta.didi || 0) * 0.18;
        const comisionUber = (venta.uber || 0) * 0.44;
        const comisionesTotal = comisionBAC + comisionPedidosYa + comisionDidi + comisionUber;
        const ventasNetas = (venta.total || 0) - comisionesTotal - (venta.gastos || 0);
        
        // Generar HTML del detalle
        content.innerHTML = `
            <div style="background: white; border-radius: 20px; overflow: hidden;">
                <!-- Información principal -->
                <div style="background: linear-gradient(135deg, #f8fafc, #ffffff); padding: 20px; border-bottom: 1px solid #eef2f6;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <span style="color: #64748b; font-size: 0.75rem; text-transform: uppercase;">Fecha</span>
                            <div style="font-size: 1.2rem; font-weight: 600; color: #1e293b;">${fechaFormateada}</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: #64748b; font-size: 0.75rem; text-transform: uppercase;">Local</span>
                            <div style="font-size: 1.2rem; font-weight: 600; color: #1e293b;">${venta.local || '—'}</div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 24px;">
                    <!-- Sección: Ventas Mostrador -->
                    <h4 style="margin: 0 0 15px 0; color: #1e293b; display: flex; align-items: center; gap: 8px; font-size: 1rem;">
                        <i class="fas fa-cash-register" style="color: #3b82f6;"></i> Mostrador
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
                        <div style="background: #f1f5f9; border-radius: 12px; padding: 12px; text-align: center;">
                            <div style="font-size: 0.7rem; color: #64748b;">EFECTIVO</div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">₡${(venta.efectivo || 0).toLocaleString()}</div>
                        </div>
                        <div style="background: #f1f5f9; border-radius: 12px; padding: 12px; text-align: center;">
                            <div style="font-size: 0.7rem; color: #64748b;">TARJETA BAC</div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">₡${(venta.bac || 0).toLocaleString()}</div>
                        </div>
                        <div style="background: #f1f5f9; border-radius: 12px; padding: 12px; text-align: center;">
                            <div style="font-size: 0.7rem; color: #64748b;">PERSONAL</div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">₡${(venta.personal || 0).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <!-- Sección: Delivery -->
                    <h4 style="margin: 0 0 15px 0; color: #1e293b; display: flex; align-items: center; gap: 8px; font-size: 1rem;">
                        <i class="fas fa-motorcycle" style="color: #f59e0b;"></i> Delivery
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
                        <div style="background: #fef9e8; border-radius: 12px; padding: 12px; text-align: center;">
                            <div style="font-size: 0.7rem; color: #f59e0b;">PEDIDOS YA</div>
                            <div style="font-size: 1rem; font-weight: 600;">₡${(venta.pedidosYa || 0).toLocaleString()}</div>
                        </div>
                        <div style="background: #fef9e8; border-radius: 12px; padding: 12px; text-align: center;">
                            <div style="font-size: 0.7rem; color: #f59e0b;">DIDI</div>
                            <div style="font-size: 1rem; font-weight: 600;">₡${(venta.didi || 0).toLocaleString()}</div>
                        </div>
                        <div style="background: #fef9e8; border-radius: 12px; padding: 12px; text-align: center;">
                            <div style="font-size: 0.7rem; color: #f59e0b;">UBER</div>
                            <div style="font-size: 1rem; font-weight: 600;">₡${(venta.uber || 0).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <!-- Sección: Comisiones -->
                    <h4 style="margin: 0 0 15px 0; color: #1e293b; display: flex; align-items: center; gap: 8px; font-size: 1rem;">
                        <i class="fas fa-percent" style="color: #ef4444;"></i> Comisiones
                    </h4>
                    
                    <div style="background: #fff1f1; border-radius: 16px; padding: 16px; margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #64748b;">BAC (2.25%)</span>
                            <span style="font-weight: 500;">₡${Math.round(comisionBAC).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #64748b;">PedidosYa (18%)</span>
                            <span style="font-weight: 500;">₡${Math.round(comisionPedidosYa).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #64748b;">Didi (18%)</span>
                            <span style="font-weight: 500;">₡${Math.round(comisionDidi).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #64748b;">Uber (44%)</span>
                            <span style="font-weight: 500;">₡${Math.round(comisionUber).toLocaleString()}</span>
                        </div>
                        <div style="border-top: 1px solid #fee2e2; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between; font-weight: 700;">
                            <span>TOTAL COMISIONES</span>
                            <span style="color: #ef4444;">₡${Math.round(comisionesTotal).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <!-- Sección: Gastos -->
                    ${(venta.gastos || 0) > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #fef3c7; border-radius: 12px; padding: 12px 16px;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-receipt" style="color: #f59e0b;"></i>
                                <span style="font-weight: 500;">Gastos operativos</span>
                            </span>
                            <span style="font-weight: 700; color: #f59e0b;">- ₡${(venta.gastos || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Resumen final -->
                    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 20px; padding: 20px; color: white;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                            <span style="opacity: 0.8;">VENTAS BRUTAS</span>
                            <span style="font-size: 1.1rem; font-weight: 600;">₡${(venta.total || 0).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                            <span style="opacity: 0.8;">COMISIONES</span>
                            <span style="color: #f87171;">- ₡${Math.round(comisionesTotal).toLocaleString()}</span>
                        </div>
                        ${(venta.gastos || 0) > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                            <span style="opacity: 0.8;">GASTOS</span>
                            <span style="color: #fbbf24;">- ₡${(venta.gastos || 0).toLocaleString()}</span>
                        </div>
                        ` : ''}
                        <div style="border-top: 1px solid rgba(255,255,255,0.2); margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between;">
                            <span style="font-weight: 600;">VENTAS NETAS</span>
                            <span style="font-size: 1.3rem; font-weight: 700; color: #10b981;">₡${Math.round(ventasNetas).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <!-- Información adicional -->
                    <div style="margin-top: 20px; padding: 12px; background: #f1f5f9; border-radius: 12px; font-size: 0.7rem; color: #64748b; text-align: center;">
                        <i class="fas fa-user"></i> Registrado por: ${venta.creadoPor || 'Sistema'} | 
                        <i class="fas fa-hashtag"></i> ID: ${id.substring(0, 8)}...
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error cargando venta:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ef4444;"></i>
                <p style="margin-top: 15px; color: #64748b;">Error al cargar el detalle</p>
                <p style="font-size: 0.8rem; color: #94a3b8;">${error.message}</p>
                <button onclick="cerrarModal('detalleVentaModal')" style="margin-top: 20px; padding: 10px 24px; background: #3b82f6; color: white; border: none; border-radius: 12px; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        `;
    }
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

console.log('Ventas:', window.ventasData);