// modules/dashboard.js

// ============================================
// RENDERIZAR DASHBOARD
// ============================================
function renderDashboard() {
    console.log('Renderizando dashboard...');
    
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) {
        console.error('No se encontró dashboardContent');
        return;
    }
    
    // Obtener datos de las variables globales
    const ventasData = window.ventasData || [];
    const costosData = window.costosData || {};
    
    console.log('Ventas para dashboard:', ventasData.length);
    console.log('Costos para dashboard:', Object.keys(costosData).length);
    
    // Obtener filtros actuales
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    const fechaHoy = new Date().toISOString().split('T')[0];
    const mesActual = fechaHoy.substring(0, 7);
    const anioActual = fechaHoy.substring(0, 4);
    
    // FILTRAR VENTAS
    const ventasFiltradas = ventasData.filter(v => {
        // Filtro por local
        if (filtroLocal !== 'Todos' && v.local !== filtroLocal) return false;
        
        // Filtro por tiempo
        if (filtroTiempo === 'dia' && v.fecha !== fechaHoy) return false;
        if (filtroTiempo === 'mes' && v.fecha?.substring(0, 7) !== mesActual) return false;
        if (filtroTiempo === 'anio' && v.fecha?.substring(0, 4) !== anioActual) return false;
        
        return true;
    });
    
    // FILTRAR COSTOS
    let costosFiltrados = [];
    for (const local in costosData) {
        // Filtro por local
        if (filtroLocal !== 'Todos' && local !== filtroLocal) continue;
        
        for (const categoria in costosData[local]) {
            costosData[local][categoria].forEach(costo => {
                costosFiltrados.push({
                    ...costo,
                    local: local,
                    categoria: categoria
                });
            });
        }
    }
    
    // Calcular totales
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    const totalCostos = costosFiltrados.reduce((sum, c) => sum + (c.monto || 0), 0);
    const utilidad = totalVentas - totalCostos;
    const margen = totalVentas > 0 ? ((utilidad / totalVentas) * 100).toFixed(1) : 0;
    
    // Calcular delivery
    const deliveryData = ventasFiltradas.reduce((acc, v) => {
        const delivery = (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
        const comisiones = (v.comisiones?.total || 0);
        return {
            ventas: acc.ventas + delivery,
            comisiones: acc.comisiones + comisiones
        };
    }, { ventas: 0, comisiones: 0 });
    
    // Ventas por local
    const ventasPorLocal = {};
    ventasFiltradas.forEach(v => {
        ventasPorLocal[v.local] = (ventasPorLocal[v.local] || 0) + (v.total || 0);
    });
    
    // Ventas mensuales para el gráfico
    const ventasMensuales = {};
    ventasFiltradas.forEach(v => {
        if (v.fecha) {
            const mes = v.fecha.substring(0, 7);
            ventasMensuales[mes] = (ventasMensuales[mes] || 0) + (v.total || 0);
        }
    });
    
    // Ordenar meses y tomar últimos 6
    const meses = Object.keys(ventasMensuales).sort().slice(-6);
    const valoresMensuales = meses.map(m => ventasMensuales[m] || 0);
    
    // Top 5 locales
    const topLocales = Object.entries(ventasPorLocal)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Determinar qué mostrar en la tabla inferior
    const mostrarTopLocales = filtroLocal === 'Todos';
    
    const dashboardHTML = `
        <div style="padding: 20px;">
            <!-- Título y filtros -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 20px;">
                <h1 style="font-size: 24px; color: #333;">
                    <i class="fas fa-chart-line" style="color: #2563eb; margin-right: 10px;"></i>
                    Dashboard
                </h1>
                
                <div style="display: flex; gap: 10px; background: white; padding: 10px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <span style="padding: 5px 10px; background: #f3f4f6; border-radius: 5px;">
                        <i class="fas fa-store"></i> ${filtroLocal}
                    </span>
                    <span style="padding: 5px 10px; background: #f3f4f6; border-radius: 5px;">
                        <i class="fas fa-calendar"></i> ${filtroTiempo === 'dia' ? 'Hoy' : filtroTiempo === 'mes' ? 'Este mes' : filtroTiempo === 'anio' ? 'Este año' : 'Todo'}
                    </span>
                </div>
            </div>
            
            <!-- Tarjetas de resumen -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px;">VENTAS TOTALES</div>
                    <div style="font-size: 28px; font-weight: bold; margin-bottom: 5px;">₡${Math.round(totalVentas).toLocaleString()}</div>
                    <div style="font-size: 14px; opacity: 0.8;">${ventasFiltradas.length} transacciones</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px;">COSTOS TOTALES</div>
                    <div style="font-size: 28px; font-weight: bold; margin-bottom: 5px;">₡${Math.round(totalCostos).toLocaleString()}</div>
                    <div style="font-size: 14px; opacity: 0.8;">${costosFiltrados.length} costos fijos</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px;">UTILIDAD NETA</div>
                    <div style="font-size: 28px; font-weight: bold; margin-bottom: 5px;">₡${Math.round(utilidad).toLocaleString()}</div>
                    <div style="font-size: 14px; opacity: 0.8;">Margen: ${margen}%</div>
                </div>
            </div>
            
            <!-- Gráficos y estadísticas -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 30px;">
                <!-- Gráfico de ventas mensuales -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="margin-bottom: 20px; color: #333;">
                        <i class="fas fa-chart-bar" style="color: #2563eb; margin-right: 10px;"></i>
                        Ventas Mensuales
                    </h3>
                    <div style="height: 300px;">
                        <canvas id="graficoVentasMensuales"></canvas>
                    </div>
                    ${meses.length === 0 ? '<p style="text-align: center; color: #666; margin-top: 20px;">No hay datos para mostrar en el gráfico</p>' : ''}
                </div>
                
                <!-- Tarjetas de delivery -->
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <i class="fas fa-motorcycle" style="font-size: 2.5rem; opacity: 0.8;"></i>
                            <div>
                                <div style="font-size: 14px; opacity: 0.9;">VENTAS DELIVERY</div>
                                <div style="font-size: 24px; font-weight: bold;">₡${Math.round(deliveryData.ventas).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <i class="fas fa-percent" style="font-size: 2.5rem; opacity: 0.8;"></i>
                            <div>
                                <div style="font-size: 14px; opacity: 0.9;">COMISIONES DELIVERY</div>
                                <div style="font-size: 24px; font-weight: bold;">₡${Math.round(deliveryData.comisiones).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tabla inferior -->
            <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin-bottom: 20px; color: #333;">
                    <i class="fas fa-${mostrarTopLocales ? 'store' : 'clock'}" style="color: #2563eb; margin-right: 10px;"></i>
                    ${mostrarTopLocales ? 'Top Locales' : `Últimas ventas en ${filtroLocal}`}
                </h3>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>${mostrarTopLocales ? 'Local' : 'Fecha'}</th>
                                <th>Monto</th>
                                <th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${mostrarTopLocales 
                                ? (topLocales.length > 0 ? topLocales.map(([local, monto]) => {
                                    const porcentaje = totalVentas > 0 ? ((monto / totalVentas) * 100).toFixed(1) : 0;
                                    return `
                                    <tr>
                                        <td><strong>${local}</strong></td>
                                        <td>₡${Math.round(monto).toLocaleString()}</td>
                                        <td>${porcentaje}%</td>
                                    </tr>
                                `}).join('') : `
                                    <tr>
                                        <td colspan="3" style="text-align: center; padding: 30px;">
                                            No hay ventas en este período
                                        </td>
                                    </tr>
                                `)
                                : (ventasFiltradas.length > 0 ? ventasFiltradas.slice(0, 10).map(v => {
                                    const porcentaje = totalVentas > 0 ? ((v.total / totalVentas) * 100).toFixed(1) : 0;
                                    return `
                                    <tr>
                                        <td>${new Date(v.fecha).toLocaleDateString('es-CR')}</td>
                                        <td>₡${Math.round(v.total || 0).toLocaleString()}</td>
                                        <td>${porcentaje}%</td>
                                    </tr>
                                `}).join('') : `
                                    <tr>
                                        <td colspan="3" style="text-align: center; padding: 30px;">
                                            No hay ventas en este local
                                        </td>
                                    </tr>
                                `)
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Información de usuario (opcional) -->
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 0.9rem; color: #64748b;">
                <i class="fas fa-user" style="margin-right: 8px;"></i>
                ${AppState.usuario?.nombre || 'Usuario'} | 
                ${AppState.usuario?.rol || 'Sin rol'} | 
                Última actualización: ${new Date().toLocaleTimeString()}
            </div>
        </div>
    `;
    
    dashboardContent.innerHTML = dashboardHTML;
    
    // Crear gráfico si hay datos
    if (meses.length > 0) {
        setTimeout(() => {
            crearGraficoVentasMensuales(meses, valoresMensuales);
        }, 100);
    }
}

// ============================================
// CREAR GRÁFICO DE VENTAS MENSUALES
// ============================================
function crearGraficoVentasMensuales(meses, valores) {
    const ctx = document.getElementById('graficoVentasMensuales');
    if (!ctx) return;
    
    // Destruir gráfico existente
    if (window.ventasChart) {
        window.ventasChart.destroy();
    }
    
    window.ventasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Ventas',
                data: valores,
                backgroundColor: '#2563eb',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => '₡' + Math.round(context.parsed.y).toLocaleString()
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => '₡' + Math.round(value).toLocaleString()
                    }
                }
            }
        }
    });
}

// ============================================
// INICIALIZAR LISTENERS DEL DASHBOARD
// ============================================
function initDashboardListeners() {
    console.log('Inicializando listeners del dashboard...');
    
    // Escuchar cambios en ventas
    firebase.database().ref('ventas').on('value', (snapshot) => {
        const data = snapshot.val();
        const ventasArray = [];
        
        if (data) {
            for (const id in data) {
                ventasArray.push({
                    id: id,
                    ...data[id]
                });
            }
        }
        
        window.ventasData = ventasArray;
        
        // Si el dashboard está activo, actualizar
        if (document.getElementById('dashboard').classList.contains('active')) {
            renderDashboard();
        }
    });
    
    // Escuchar cambios en costos
    firebase.database().ref('costos').on('value', (snapshot) => {
        const data = snapshot.val();
        const costosObj = {};
        
        if (data) {
            for (const local in data) {
                costosObj[local] = {};
                for (const categoria in data[local]) {
                    costosObj[local][categoria] = [];
                    for (const costoId in data[local][categoria]) {
                        costosObj[local][categoria].push({
                            id: costoId,
                            ...data[local][categoria][costoId]
                        });
                    }
                }
            }
        }
        
        window.costosData = costosObj;
        
        // Si el dashboard está activo, actualizar
        if (document.getElementById('dashboard').classList.contains('active')) {
            renderDashboard();
        }
    });
}

// ============================================
// HACER FUNCIONES GLOBALES
// ============================================
window.renderDashboard = renderDashboard;
window.crearGraficoVentasMensuales = crearGraficoVentasMensuales;
window.initDashboardListeners = initDashboardListeners;