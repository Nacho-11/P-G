// ===== ESTADO GLOBAL =====
const AppState = {
    usuario: null,
    locales: [
        { id: 1, nombre: 'Parrillita Alajuela', tipo: 'restaurante', activo: true },
        { id: 2, nombre: 'Los Años Locos Heredia', tipo: 'restaurante', activo: true },
        { id: 3, nombre: 'Los Años Locos San Joaquin', tipo: 'restaurante', activo: true },
        { id: 4, nombre: 'Parrillita Empanadazo', tipo: 'restaurante', activo: true },
        { id: 5, nombre: 'Parrillita Garita', tipo: 'restaurante', activo: true },
        { id: 6, nombre: 'Parrillita Pirro', tipo: 'restaurante', activo: true },
        { id: 7, nombre: 'Parrillita Sabana', tipo: 'restaurante', activo: true },
        { id: 8, nombre: 'Parrillita San Joaquin', tipo: 'restaurante', activo: true },
        { id: 9, nombre: 'Parrillita San Pedro', tipo: 'restaurante', activo: true }
    ],
    empleados: [],
    data: {
        ventas: [],
        costos: [],
        planillas: [],
        servicios: {
            agua: [],
            luz: [],
            gas: []
        },
        mermas: [],
        logistica: []
    },
    filtros: {
        local: 'Todos',
        tiempo: 'todos',
        mes: new Date().toISOString().slice(0, 7)
    }
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    cargarDatosIniciales();
    cargarLocalesEnSelectores();
    actualizarUIUsuario();
    inicializarFiltros();
    configurarEventListeners();
    
    // Cargar módulo inicial
    cambiarModulo('dashboard');
});

// ===== CARGA DE DATOS =====
function cargarDatosIniciales() {
    const stored = localStorage.getItem('parrillitaData');
    if (stored) {
        try {
            AppState.data = JSON.parse(stored);
        } catch (e) {
            console.error('Error cargando datos:', e);
            generarDatosEjemplo();
        }
    } else {
        generarDatosEjemplo();
    }
    
    const userStored = localStorage.getItem('parrillitaUser');
    if (userStored) {
        try {
            AppState.usuario = JSON.parse(userStored);
        } catch (e) {
            console.error('Error cargando usuario:', e);
        }
    }
}

function generarDatosEjemplo() {
    const hoy = new Date();
    const ventas = [];
    
    // Generar ventas de ejemplo para los últimos 30 días
    for (let i = 0; i < 30; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];
        
        AppState.locales.forEach(local => {
            const efectivo = Math.floor(Math.random() * 300000) + 100000;
            const bac = Math.floor(Math.random() * 200000) + 50000;
            const pedidosYa = Math.floor(Math.random() * 150000) + 30000;
            const didi = Math.floor(Math.random() * 100000) + 20000;
            const uber = Math.floor(Math.random() * 80000) + 15000;
            const personal = Math.floor(Math.random() * 50000) + 10000;
            const gastos = Math.floor(Math.random() * 20000);
            
            ventas.push({
                id: `venta_${Date.now()}_${Math.random()}`,
                fecha: fechaStr,
                local: local.nombre,
                efectivo,
                bac,
                pedidosYa,
                didi,
                uber,
                personal,
                gastos,
                total: efectivo + bac + pedidosYa + didi + uber + personal,
                createdAt: new Date().toISOString()
            });
        });
    }
    
    AppState.data.ventas = ventas;
    AppState.data.costos = generarCostosEjemplo();
    guardarDatos();
}

function generarCostosEjemplo() {
    const costos = [];
    const tipos = ['Alquiler', 'Seguridad', 'Internet', 'Mantenimiento', 'Patente', 'Permisos', 'Seguro', 'Limpieza'];
    
    for (let i = 0; i < 50; i++) {
        costos.push({
            id: `costo_${Date.now()}_${Math.random()}`,
            local: AppState.locales[Math.floor(Math.random() * AppState.locales.length)].nombre,
            tipo: tipos[Math.floor(Math.random() * tipos.length)],
            monto: Math.floor(Math.random() * 200000) + 50000,
            fecha: new Date(2026, 1, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        });
    }
    
    return costos;
}

function guardarDatos() {
    localStorage.setItem('parrillitaData', JSON.stringify(AppState.data));
}

// ===== AUTENTICACIÓN =====
function mostrarLogin() {
    const modal = document.getElementById('loginModal');
    const overlay = document.getElementById('modalOverlay');
    
    // Cargar locales en el select
    const selectLocal = document.getElementById('loginLocal');
    selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
    AppState.locales.forEach(local => {
        selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
    });
    
    // Mostrar/ocultar selector de local según rol
    document.getElementById('loginRol').addEventListener('change', function() {
        const localGroup = document.getElementById('loginLocalGroup');
        if (this.value === 'encargado') {
            localGroup.style.display = 'block';
        } else {
            localGroup.style.display = 'none';
        }
    });
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

function cerrarModal(modalId = null) {
    if (modalId) {
        document.getElementById(modalId).classList.remove('active');
    } else {
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('ventaModal')?.classList.remove('active');
    }
    document.getElementById('modalOverlay').classList.remove('active');
}

function procesarLogin() {
    const rol = document.getElementById('loginRol').value;
    const local = document.getElementById('loginLocal').value;
    
    AppState.usuario = {
        rol,
        local: rol === 'encargado' ? local : null,
        nombre: rol === 'gerencia' ? 'Gerente General' : `Encargado - ${local}`,
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('parrillitaUser', JSON.stringify(AppState.usuario));
    
    actualizarUIUsuario();
    configurarPermisos();
    cerrarModal();
    
    // Mostrar notificación de éxito
    mostrarNotificacion(`Bienvenido ${AppState.usuario.nombre}`, 'success');
}

function logout() {
    localStorage.removeItem('parrillitaUser');
    AppState.usuario = null;
    actualizarUIUsuario();
    configurarPermisos();
    
    // Recargar módulo actual
    const activeModule = document.querySelector('.nav-item.active');
    if (activeModule) {
        const module = activeModule.dataset.module;
        cambiarModulo(module);
    }
    
    mostrarNotificacion('Sesión cerrada', 'info');
}

function actualizarUIUsuario() {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const loginBtn = document.getElementById('userLoginBtn');
    
    if (AppState.usuario) {
        userName.textContent = AppState.usuario.nombre || 'Usuario';
        userRole.textContent = AppState.usuario.rol === 'gerencia' ? 'Gerencia' : `Encargado - ${AppState.usuario.local}`;
        loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        loginBtn.onclick = logout;
        loginBtn.title = 'Cerrar sesión';
    } else {
        userName.textContent = 'Invitado';
        userRole.textContent = 'Sin sesión';
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
        loginBtn.onclick = mostrarLogin;
        loginBtn.title = 'Iniciar sesión';
    }
}

function configurarPermisos() {
    const filtroLocal = document.getElementById('filtroLocal');
    
    if (AppState.usuario && AppState.usuario.rol === 'encargado') {
        // Encargado solo ve su local
        filtroLocal.value = AppState.usuario.local;
        filtroLocal.disabled = true;
        
        // Ocultar opciones de administración
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    } else {
        filtroLocal.disabled = false;
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'block';
        });
    }
}

// ===== FILTROS =====
function inicializarFiltros() {
    const filtroMes = document.getElementById('filtroMes');
    filtroMes.value = AppState.filtros.mes;
}

function cargarLocalesEnSelectores() {
    const selects = [
        document.getElementById('filtroLocal'),
        document.getElementById('ventaLocal')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        
        select.innerHTML = '<option value="Todos">Todos los locales</option>';
        AppState.locales.forEach(local => {
            select.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
        });
    });
}

// ===== NAVEGACIÓN =====
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function cambiarModulo(moduleId) {
    // Actualizar navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.module === moduleId) {
            item.classList.add('active');
        }
    });
    
    // Mostrar módulo
    document.querySelectorAll('.module').forEach(module => {
        module.classList.remove('active');
    });
    document.getElementById(moduleId).classList.add('active');
    
    // Renderizar módulo
    renderizarModulo(moduleId);
}

function renderizarModulo(moduleId) {
    switch(moduleId) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'ventas':
            renderVentas();
            break;
        case 'costos':
            renderCostos();
            break;
        case 'planilla':
            renderPlanilla();
            break;
        case 'servicios':
            renderServicios();
            break;
        case 'merma':
            renderMerma();
            break;
        case 'logistica':
            renderLogistica();
            break;
        case 'pyg':
            renderPyG();
            break;
    }
}

// ===== DASHBOARD =====
function renderDashboard() {
    const filtroLocal = AppState.filtros.local;
    const filtroTiempo = AppState.filtros.tiempo;
    const fechaHoy = new Date().toISOString().split('T')[0];
    const mesActual = fechaHoy.substring(0, 7);
    const anioActual = fechaHoy.substring(0, 4);
    
    // Filtrar ventas
    const ventasFiltradas = AppState.data.ventas.filter(v => {
        const cumpleLocal = filtroLocal === 'Todos' || v.local === filtroLocal;
        let cumpleTiempo = true;
        
        if (filtroTiempo === 'dia') cumpleTiempo = v.fecha === fechaHoy;
        if (filtroTiempo === 'mes') cumpleTiempo = v.fecha.substring(0, 7) === mesActual;
        if (filtroTiempo === 'anio') cumpleTiempo = v.fecha.substring(0, 4) === anioActual;
        
        return cumpleLocal && cumpleTiempo;
    });
    
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
    
    // Filtrar costos
    const costosFiltrados = AppState.data.costos.filter(c => 
        filtroLocal === 'Todos' || c.local === filtroLocal
    );
    const totalCostos = costosFiltrados.reduce((sum, c) => sum + c.monto, 0);
    
    const utilidad = totalVentas - totalCostos;
    const margen = totalVentas > 0 ? (utilidad / totalVentas * 100).toFixed(1) : 0;
    
    // Ventas por método de pago
    const ventasPorMetodo = ventasFiltradas.reduce((acc, v) => {
        acc.efectivo += v.efectivo || 0;
        acc.tarjeta += v.bac || 0;
        acc.delivery += (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
        acc.personal += v.personal || 0;
        return acc;
    }, { efectivo: 0, tarjeta: 0, delivery: 0, personal: 0 });
    
    // Ventas mensuales para gráfico
    const ventasMensuales = {};
    AppState.data.ventas
        .filter(v => filtroLocal === 'Todos' || v.local === filtroLocal)
        .forEach(v => {
            const mes = v.fecha.substring(0, 7);
            if (!ventasMensuales[mes]) ventasMensuales[mes] = 0;
            ventasMensuales[mes] += v.total;
        });
    
    const meses = Object.keys(ventasMensuales).sort().slice(-6);
    const valoresMensuales = meses.map(m => ventasMensuales[m]);
    
    // HTML del dashboard
    const dashboardHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <i class="fas fa-shopping-cart stat-icon"></i>
                <div class="stat-label">Ventas Totales</div>
                <div class="stat-value">₡${totalVentas.toLocaleString()}</div>
                <div class="stat-change positive">
                    <i class="fas fa-arrow-up"></i> +12.5%
                </div>
            </div>
            
            <div class="stat-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                <i class="fas fa-coins stat-icon"></i>
                <div class="stat-label">Costos Totales</div>
                <div class="stat-value">₡${totalCostos.toLocaleString()}</div>
                <div class="stat-change negative">
                    <i class="fas fa-arrow-down"></i> -5.2%
                </div>
            </div>
            
            <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <i class="fas fa-chart-line stat-icon"></i>
                <div class="stat-label">Utilidad Neta</div>
                <div class="stat-value">₡${utilidad.toLocaleString()}</div>
                <div class="stat-change">
                    Margen: ${margen}%
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-chart-bar"></i> Ventas Mensuales</h3>
                    <div>
                        <span class="badge badge-success">+23% vs mes anterior</span>
                    </div>
                </div>
                <div style="height: 300px;">
                    <canvas id="graficoVentas"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-pie-chart"></i> Distribución Ventas</h3>
                </div>
                <div style="height: 300px;">
                    <canvas id="graficoPastel"></canvas>
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-store"></i> Ventas por Local</h3>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Local</th>
                                <th>Ventas</th>
                                <th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generarFilasVentasPorLocal()}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-chart-simple"></i> Métodos de Pago</h3>
                </div>
                <div style="padding: 20px;">
                    ${generarBarrasMetodosPago(ventasPorMetodo, totalVentas)}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = dashboardHTML;
    
    // Crear gráficos después de renderizar
    setTimeout(() => {
        crearGraficoVentas(meses, valoresMensuales);
        crearGraficoPastel(ventasPorMetodo);
    }, 100);
}

function generarFilasVentasPorLocal() {
    const ventasPorLocal = {};
    AppState.data.ventas.forEach(v => {
        if (!ventasPorLocal[v.local]) ventasPorLocal[v.local] = 0;
        ventasPorLocal[v.local] += v.total;
    });
    
    const totalGeneral = Object.values(ventasPorLocal).reduce((a, b) => a + b, 0);
    
    return Object.entries(ventasPorLocal)
        .sort((a, b) => b[1] - a[1])
        .map(([local, monto]) => {
            const porcentaje = ((monto / totalGeneral) * 100).toFixed(1);
            return `
                <tr>
                    <td><strong>${local}</strong></td>
                    <td>₡${monto.toLocaleString()}</td>
                    <td>${porcentaje}%</td>
                </tr>
            `;
        }).join('');
}

function generarBarrasMetodosPago(metodos, total) {
    const items = [
        { label: 'Efectivo', value: metodos.efectivo, color: '#10b981' },
        { label: 'Tarjeta', value: metodos.tarjeta, color: '#3b82f6' },
        { label: 'Delivery', value: metodos.delivery, color: '#f59e0b' },
        { label: 'Personal', value: metodos.personal, color: '#8b5cf6' }
    ];
    
    return items.map(item => {
        const porcentaje = total > 0 ? (item.value / total * 100).toFixed(1) : 0;
        return `
            <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-weight: 500;">${item.label}</span>
                    <span>₡${item.value.toLocaleString()} (${porcentaje}%)</span>
                </div>
                <div style="height: 8px; background: var(--gray-200); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${porcentaje}%; height: 100%; background: ${item.color};"></div>
                </div>
            </div>
        `;
    }).join('');
}

function crearGraficoVentas(meses, valores) {
    const ctx = document.getElementById('graficoVentas');
    if (!ctx) return;
    
    if (window.chartVentas) window.chartVentas.destroy();
    
    window.chartVentas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Ventas',
                data: valores,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => '₡' + ctx.parsed.y.toLocaleString()
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => '₡' + value.toLocaleString()
                    }
                }
            }
        }
    });
}

function crearGraficoPastel(metodos) {
    const ctx = document.getElementById('graficoPastel');
    if (!ctx) return;
    
    if (window.chartPastel) window.chartPastel.destroy();
    
    window.chartPastel = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Efectivo', 'Tarjeta', 'Delivery', 'Personal'],
            datasets: [{
                data: [metodos.efectivo, metodos.tarjeta, metodos.delivery, metodos.personal],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const porcentaje = ((ctx.raw / total) * 100).toFixed(1);
                            return `${ctx.label}: ₡${ctx.raw.toLocaleString()} (${porcentaje}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ===== VENTAS =====
function renderVentas() {
    const ventasHTML = `
        <div class="card">
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
                        ${generarFilasVentas()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('ventasContent').innerHTML = ventasHTML;
}

function generarFilasVentas() {
    const ventasRecientes = [...AppState.data.ventas]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 50);
    
    return ventasRecientes.map(v => {
        const delivery = (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
        return `
            <tr>
                <td>${new Date(v.fecha).toLocaleDateString()}</td>
                <td><strong>${v.local}</strong></td>
                <td>₡${(v.efectivo || 0).toLocaleString()}</td>
                <td>₡${(v.bac || 0).toLocaleString()}</td>
                <td>₡${delivery.toLocaleString()}</td>
                <td><strong>₡${v.total.toLocaleString()}</strong></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editarVenta('${v.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarVenta('${v.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function mostrarModalVenta() {
    const modal = document.getElementById('ventaModal');
    const overlay = document.getElementById('modalOverlay');
    
    // Setear fecha actual
    document.getElementById('ventaFecha').value = new Date().toISOString().split('T')[0];
    
    // Cargar locales
    const selectLocal = document.getElementById('ventaLocal');
    selectLocal.innerHTML = '<option value="">Seleccionar...</option>';
    AppState.locales.forEach(local => {
        if (AppState.usuario?.rol === 'encargado' && local.nombre !== AppState.usuario.local) return;
        selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
    });
    
    // Evento para calcular total
    ['efectivo', 'bac', 'pedidosYa', 'didi', 'uber', 'personal'].forEach(id => {
        document.getElementById(`venta${id.charAt(0).toUpperCase() + id.slice(1)}`).addEventListener('input', actualizarTotalVenta);
    });
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

function actualizarTotalVenta() {
    const efectivo = parseFloat(document.getElementById('ventaEfectivo').value) || 0;
    const bac = parseFloat(document.getElementById('ventaBAC').value) || 0;
    const pedidosYa = parseFloat(document.getElementById('ventaPedidosYa').value) || 0;
    const didi = parseFloat(document.getElementById('ventaDidi').value) || 0;
    const uber = parseFloat(document.getElementById('ventaUber').value) || 0;
    const personal = parseFloat(document.getElementById('ventaPersonal').value) || 0;
    const gastos = parseFloat(document.getElementById('ventaGastos').value) || 0;
    
    const total = efectivo + bac + pedidosYa + didi + uber + personal - gastos;
    document.getElementById('ventaTotalPreview').textContent = `₡${total.toLocaleString()}`;
}

function guardarVenta() {
    const fecha = document.getElementById('ventaFecha').value;
    const local = document.getElementById('ventaLocal').value;
    const efectivo = parseFloat(document.getElementById('ventaEfectivo').value) || 0;
    const bac = parseFloat(document.getElementById('ventaBAC').value) || 0;
    const pedidosYa = parseFloat(document.getElementById('ventaPedidosYa').value) || 0;
    const didi = parseFloat(document.getElementById('ventaDidi').value) || 0;
    const uber = parseFloat(document.getElementById('ventaUber').value) || 0;
    const personal = parseFloat(document.getElementById('ventaPersonal').value) || 0;
    const gastos = parseFloat(document.getElementById('ventaGastos').value) || 0;
    
    if (!fecha || !local) {
        mostrarNotificacion('Complete todos los campos requeridos', 'error');
        return;
    }
    
    const total = efectivo + bac + pedidosYa + didi + uber + personal - gastos;
    
    const nuevaVenta = {
        id: `venta_${Date.now()}`,
        fecha,
        local,
        efectivo,
        bac,
        pedidosYa,
        didi,
        uber,
        personal,
        gastos,
        total,
        createdAt: new Date().toISOString()
    };
    
    AppState.data.ventas.push(nuevaVenta);
    guardarDatos();
    
    cerrarModal('ventaModal');
    renderizarModulo('ventas');
    mostrarNotificacion('Venta registrada exitosamente', 'success');
}

function eliminarVenta(id) {
    if (confirm('¿Está seguro de eliminar esta venta?')) {
        AppState.data.ventas = AppState.data.ventas.filter(v => v.id !== id);
        guardarDatos();
        renderizarModulo('ventas');
        mostrarNotificacion('Venta eliminada', 'info');
    }
}

// ===== COSTOS =====
function renderCostos() {
    // Implementar similar a ventas
    document.getElementById('costosContent').innerHTML = `
        <div class="card">
            <p>Módulo de costos en desarrollo...</p>
        </div>
    `;
}

// ===== PLANILLA =====
function renderPlanilla() {
    document.getElementById('planillaContent').innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-users"></i> Gestión de Planilla</h3>
            </div>
            <p>Módulo de planilla en desarrollo...</p>
        </div>
    `;
}

// ===== SERVICIOS =====
function renderServicios() {
    document.getElementById('serviciosContent').innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-bolt"></i> Servicios</h3>
            </div>
            <p>Módulo de servicios en desarrollo...</p>
        </div>
    `;
}

// ===== MERMA =====
function renderMerma() {
    document.getElementById('mermaContent').innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-trash-alt"></i> Control de Merma</h3>
            </div>
            <p>Módulo de merma en desarrollo...</p>
        </div>
    `;
}

// ===== LOGÍSTICA =====
function renderLogistica() {
    document.getElementById('logisticaContent').innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-truck"></i> Logística</h3>
            </div>
            <p>Módulo de logística en desarrollo...</p>
        </div>
    `;
}

// ===== P&G =====
function renderPyG() {
    document.getElementById('pygContent').innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-file-invoice-dollar"></i> Pérdidas y Ganancias</h3>
            </div>
            <p>Módulo de P&G en desarrollo...</p>
        </div>
    `;
}

// ===== UTILIDADES =====
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notification notification-${tipo}`;
    notificacion.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    
    // Estilos para la notificación
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// ===== EVENT LISTENERS =====
function configurarEventListeners() {
    document.getElementById('filtroLocal').addEventListener('change', (e) => {
        AppState.filtros.local = e.target.value;
        renderizarModuloActual();
    });
    
    document.getElementById('filtroTiempo').addEventListener('change', (e) => {
        AppState.filtros.tiempo = e.target.value;
        renderizarModuloActual();
    });
    
    document.getElementById('filtroMes').addEventListener('change', (e) => {
        AppState.filtros.mes = e.target.value;
        renderizarModuloActual();
    });
}

function renderizarModuloActual() {
    const activeModule = document.querySelector('.module.active');
    if (activeModule) {
        renderizarModulo(activeModule.id);
    }
}

// ===== EXPORTAR/IMPORTAR =====
function exportarDatos() {
    const dataStr = JSON.stringify(AppState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `parrillita_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    mostrarNotificacion('Datos exportados correctamente', 'success');
}

function importarDatos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                // Aquí deberías validar la estructura
                Object.assign(AppState, data);
                guardarDatos();
                renderizarModuloActual();
                mostrarNotificacion('Datos importados correctamente', 'success');
            } catch (error) {
                mostrarNotificacion('Error al importar datos', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function refrescarDatos() {
    renderizarModuloActual();
    mostrarNotificacion('Datos actualizados', 'info');
}

function generarReporte() {
    mostrarNotificacion('Generando reporte...', 'info');
    // Implementar generación de PDF
}

function mostrarNotificaciones() {
    mostrarNotificacion('Próximamente: Centro de notificaciones', 'info');
}