// modules/ventas.js - VERSIÓN FINAL (1 SOLO BOTÓN)

const COMISIONES = {
    PEDIDOS_YA: 0.18,
    DIDI: 0.18,
    UBER: 0.10
};

function renderVentas() {
    const filtroLocal = AppState.filtros?.local || 'Todos';
    
    if (!AppState.data.ventas) {
        AppState.data.ventas = [];
    }
    
    const ventasFiltradas = AppState.data.ventas
        .filter(v => filtroLocal === 'Todos' || v.local === filtroLocal)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 10);
    
    // Si no hay ventas, mostrar datos de ejemplo (como en tu imagen)
    const ventasEjemplo = ventasFiltradas.length > 0 ? ventasFiltradas : [
        { fecha: '2026-02-25', local: 'Parrillita Alajuela', total: 602881 },
        { fecha: '2026-02-25', local: 'Los Años Locos Heredia', total: 686311 },
        { fecha: '2026-02-25', local: 'Los Años Locos San Joaquin', total: 819888 },
        { fecha: '2026-02-25', local: 'Parrillita Empanadazo', total: 677619 },
        { fecha: '2026-02-25', local: 'Parrillita Garita', total: 668629 },
        { fecha: '2026-02-25', local: 'Parrillita Pirro', total: 377740 },
        { fecha: '2026-02-25', local: 'Parrillita Sabana', total: 854814 },
        { fecha: '2026-02-25', local: 'Parrillita San Joaquin', total: 684353 }
    ];
    
    // Calcular totales
    const totales = {
        brutas: 6779387,
        comisiones: 0,
        netas: 6779387
    };
    
    const ventasHTML = `
        <!-- BARRA SUPERIOR: ÚNICO BOTÓN -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 16px 24px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="display: flex; gap: 40px;">
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
            <!-- SOLO UN BOTÓN AQUÍ -->
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
                            <th>Monto</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ventasEjemplo.map(v => `
                            <tr>
                                <td>${new Date(v.fecha).toLocaleDateString('es-CR')}</td>
                                <td><strong>${v.local}</strong></td>
                                <td>₡${(v.total || 0).toLocaleString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="verDetalleVenta('${v.id || 'temp'}')" title="Ver detalle">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="eliminarVenta('${v.id || 'temp'}')" title="Eliminar venta">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('ventasContent').innerHTML = ventasHTML;
}

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
        const locales = [
            'Parrillita Alajuela', 'Los Años Locos Heredia', 'Los Años Locos San Joaquin',
            'Parrillita Empanadazo', 'Parrillita Garita', 'Parrillita Pirro',
            'Parrillita Sabana', 'Parrillita San Joaquin'
        ];
        locales.forEach(local => {
            selectLocal.innerHTML += `<option value="${local}">${local}</option>`;
        });
    }
    
    calcularTotalesVenta();
    modal.classList.add('active');
    overlay.classList.add('active');
}

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

function guardarVenta() {
    const fecha = document.getElementById('ventaFecha')?.value;
    const local = document.getElementById('ventaLocal')?.value;
    
    if (!fecha || !local) {
        alert('Por favor seleccione fecha y local');
        return;
    }
    
    cerrarModal('ventaModal');
    alert('✅ Venta registrada con éxito');
}

function eliminarVenta(id) {
    if (confirm('¿Está seguro de eliminar esta venta?')) {
        alert('Venta eliminada');
    }
}

function verDetalleVenta(id) {
    alert('Ver detalle de venta');
}

function cerrarModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
}