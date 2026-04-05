// modules/dashboard.js

// ============================================
// FUNCIÓN AUXILIAR PARA LIMPIAR FECHAS
// ============================================
function limpiarFecha(fecha) {
    if (!fecha) return '';
    return fecha.split('T')[0];
}

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
    
    const ventasData = window.ventasData || [];
    const costosData = window.costosData || {};
    
    console.log('Ventas para dashboard:', ventasData.length);
    console.log('Costos para dashboard:', Object.keys(costosData).length);
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';

    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = ayerStr.substring(0, 7);
    const anioActual = ayerStr.substring(0, 4);

    console.log('📅 Ayer:', ayerStr);
    console.log('📅 Mes actual:', mesActual);
    console.log('📅 Año actual:', anioActual);

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

    console.log('📊 Ventas filtradas por', filtroTiempo, ':', ventasFiltradas.length);
    
    // ============================================
    // FILTRAR COSTOS CORRECTAMENTE (CORREGIDO)
    // ============================================
    let costosFiltrados = [];

    // costosData tiene estructura: { "Restaurante": { restaurante: [...] }, "Planta": { ... }, etc. }
    Object.keys(costosData).forEach(categoriaFirebase => {
        const subCategorias = costosData[categoriaFirebase];
        
        // Iterar sobre las subcategorías (restaurante, planta, oficinas, transporte, planilla)
        Object.keys(subCategorias).forEach(subCategoria => {
            const costosArray = subCategorias[subCategoria];
            
            if (!Array.isArray(costosArray)) return;
            
            costosArray.forEach(costo => {
                // El local está dentro de cada costo (costo.local)
                const localDelCosto = costo.local || 'Sin Local';
                
                // Verificar permisos del usuario para este local
                if (typeof puedeVerLocal === 'function' && !puedeVerLocal(localDelCosto)) return;
                
                // Filtrar por local seleccionado
                if (filtroLocal !== 'Todos' && localDelCosto !== filtroLocal) return;
                
                costosFiltrados.push({
                    ...costo,
                    local: localDelCosto,
                    categoria: subCategoria
                });
            });
        });
    });

    console.log(`📊 Costos filtrados: ${costosFiltrados.length} registros`);
    
    // Calcular totales
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    const totalCostos = costosFiltrados.reduce((sum, c) => sum + (c.monto || 0), 0);
    const utilidad = totalVentas - totalCostos;
    const margen = totalVentas > 0 ? ((utilidad / totalVentas) * 100).toFixed(1) : 0;
    
    const deliveryData = ventasFiltradas.reduce((acc, v) => {
        const delivery = (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
        const comisiones = (v.comisiones?.total || 0);
        return {
            ventas: acc.ventas + delivery,
            comisiones: acc.comisiones + comisiones
        };
    }, { ventas: 0, comisiones: 0 });
    
    const ventasPorLocal = {};
    ventasFiltradas.forEach(v => {
        ventasPorLocal[v.local] = (ventasPorLocal[v.local] || 0) + (v.total || 0);
    });
    
    const ventasMensuales = {};
    ventasFiltradas.forEach(v => {
        if (v.fecha) {
            const fechaLimpia = limpiarFecha(v.fecha);
            const mes = fechaLimpia.substring(0, 7);
            ventasMensuales[mes] = (ventasMensuales[mes] || 0) + (v.total || 0);
        }
    });
    
    const meses = Object.keys(ventasMensuales).sort().slice(-6);
    const valoresMensuales = meses.map(m => ventasMensuales[m] || 0);
    
    const topLocales = Object.entries(ventasPorLocal)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const mostrarTopLocales = filtroLocal === 'Todos' && esGerencia();
    
    // El resto del HTML se mantiene igual...
    const dashboardHTML = `
        <div class="dashboard-shell">
            <div class="dashboard-hero">
                <div class="dashboard-hero-left">
                    <div class="dashboard-hero-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div>
                        <h2 class="dashboard-hero-title">Dashboard</h2>
                        <p class="dashboard-hero-subtitle">Resumen general del negocio</p>
                    </div>
                </div>

                <div class="dashboard-filters-card">
                    <span class="dashboard-chip">
                        <i class="fas fa-store"></i> ${filtroLocal}
                    </span>
                    <span class="dashboard-chip">
                        <i class="fas fa-calendar"></i>
                        ${filtroTiempo === 'dia' ? 'Hoy' : filtroTiempo === 'mes' ? 'Este mes' : filtroTiempo === 'anio' ? 'Este año' : 'Todo'}
                    </span>
                </div>
            </div>

            <div class="dashboard-stats-grid">
                <div class="dashboard-stat-card blue">
                    <div class="dashboard-stat-label">VENTAS TOTALES</div>
                    <div class="dashboard-stat-value">₡${Math.round(totalVentas).toLocaleString()}</div>
                    <div class="dashboard-stat-subtext">${ventasFiltradas.length} transacciones</div>
                </div>

                <div class="dashboard-stat-card red">
                    <div class="dashboard-stat-label">COSTOS TOTALES</div>
                    <div class="dashboard-stat-value">₡${Math.round(totalCostos).toLocaleString()}</div>
                    <div class="dashboard-stat-subtext">${costosFiltrados.length} costos fijos</div>
                </div>

                <div class="dashboard-stat-card green">
                    <div class="dashboard-stat-label">UTILIDAD NETA</div>
                    <div class="dashboard-stat-value">₡${Math.round(utilidad).toLocaleString()}</div>
                    <div class="dashboard-stat-subtext">Margen: ${margen}%</div>
                </div>
            </div>

            <div class="dashboard-metrics-grid">
                <div class="dashboard-panel">
                    <h3 class="dashboard-panel-title">
                        <i class="fas fa-chart-bar"></i>
                        ${filtroLocal === 'Todos'
                            ? 'Ventas por Local'
                            : (['mes', 'rango', 'ayer', 'personalizado'].includes(filtroTiempo)
                                ? `Ventas Diarias - ${filtroLocal}`
                                : `Ventas por Mes - ${filtroLocal}`)}
                    </h3>

                    <div class="dashboard-chart-wrap">
                        <canvas id="graficoVentasMensuales"></canvas>
                    </div>

                    ${ventasFiltradas.length === 0 ? '<p class="dashboard-empty-text">No hay datos para mostrar en el gráfico</p>' : ''}
                </div>

                <div class="dashboard-side-cards">
                    <div class="dashboard-mini-card purple">
                        <div class="dashboard-mini-card-inner">
                            <i class="fas fa-motorcycle dashboard-mini-icon"></i>
                            <div>
                                <div class="dashboard-mini-label">VENTAS DELIVERY</div>
                                <div class="dashboard-mini-value">₡${Math.round(deliveryData.ventas).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-mini-card orange">
                        <div class="dashboard-mini-card-inner">
                            <i class="fas fa-percent dashboard-mini-icon"></i>
                            <div>
                                <div class="dashboard-mini-label">COMISIONES DELIVERY</div>
                                <div class="dashboard-mini-value">₡${Math.round(deliveryData.comisiones).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="dashboard-panel dashboard-table-panel">
                <h3 class="dashboard-panel-title">
                    <i class="fas fa-${mostrarTopLocales ? 'store' : 'clock'}"></i>
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
                                            <td class="dashboard-amount">₡${Math.round(monto).toLocaleString()}</td>
                                            <td><span class="dashboard-percent-badge">${porcentaje}%</span></td>
                                        </tr>
                                    `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="3" style="text-align: center; padding: 30px;">
                                            No hay ventas en este período
                                        </td>
                                    </tr>
                                `)
                                : (ventasFiltradas.length > 0 ? ventasFiltradas.slice(0, 10).map(v => {
                                    const fechaLimpia = limpiarFecha(v.fecha);
                                    const fechaObj = fechaLimpia ? new Date(fechaLimpia + 'T12:00:00') : new Date();
                                    const porcentaje = totalVentas > 0 ? ((v.total / totalVentas) * 100).toFixed(1) : 0;
                                    return `
                                        <tr>
                                            <td>${fechaLimpia ? fechaObj.toLocaleDateString('es-CR') : 'Fecha no disponible'}</td>
                                            <td class="dashboard-amount">₡${Math.round(v.total || 0).toLocaleString()}</td>
                                            <td><span class="dashboard-percent-badge">${porcentaje}%</span></td>
                                        </tr>
                                    `;
                                }).join('') : `
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
    `;
    
    dashboardContent.innerHTML = dashboardHTML;

    // Crear gráfico si hay datos
    if (ventasFiltradas.length > 0) {
        setTimeout(() => {
            crearGraficoInteligente();
        }, 100);
    }
}

// ============================================
// CREAR GRÁFICO INTELIGENTE (CORREGIDO - CON FILTRO DE TIEMPO)
// ============================================
function crearGraficoInteligente() {
    const canvas = document.getElementById('graficoVentasMensuales');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window.ventasChart) {
        try {
            window.ventasChart.destroy();
        } catch (e) {
            console.log('⚠️ Error al destruir gráfico anterior:', e);
        }
        window.ventasChart = null;
    }

    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState.filtros?.fechaPersonalizada || '';
    const fechaInicio = AppState.filtros?.fechaInicio || '';
    const fechaFin = AppState.filtros?.fechaFin || '';
    const ventas = window.ventasData || [];

    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);

    const ventasFiltradas = ventas.filter(v => {
        if (!puedeVerLocal(v.local)) return false;
        if (filtroLocal !== 'Todos' && v.local !== filtroLocal) return false;

        const fechaVenta = limpiarFecha(v.fecha);
        if (!fechaVenta) return false;

        if (filtroTiempo === 'ayer') return fechaVenta === ayerStr;
        if (filtroTiempo === 'mes') {
            const mesReferencia = fechaPersonalizada ? fechaPersonalizada.substring(0, 7) : mesActual;
            return fechaVenta.substring(0, 7) === mesReferencia;
        }
        if (filtroTiempo === 'personalizado') return fechaVenta === fechaPersonalizada;
        if (filtroTiempo === 'rango') {
            if (!fechaInicio || !fechaFin) return true;
            return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
        }

        return true;
    });

    if (ventasFiltradas.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos para mostrar', canvas.width / 2, canvas.height / 2);
        return;
    }

    // ==================================================
// CASO 1: MES o RANGO -> POR DÍA
// Si local = Todos, comparar locales por día
// Si local específico, mostrar una sola serie diaria
// ==================================================
if (filtroTiempo === 'mes' || filtroTiempo === 'rango') {
    let fechasBase = [];
    let tituloGrafico = '';

    if (filtroTiempo === 'mes') {
        const mesReferencia = fechaPersonalizada ? fechaPersonalizada.substring(0, 7) : mesActual;
        const [year, month] = mesReferencia.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            fechasBase.push(`${year}-${month}-${String(day).padStart(2, '0')}`);
        }

        tituloGrafico = `Ventas diarias ${filtroLocal === 'Todos' ? 'comparativas por local' : '- ' + filtroLocal} (${mesReferencia})`;
    }

    if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
        let fechaCursor = new Date(fechaInicio + 'T12:00:00');
        const fechaFinal = new Date(fechaFin + 'T12:00:00');

        while (fechaCursor <= fechaFinal) {
            fechasBase.push(fechaCursor.toLocaleDateString('en-CA'));
            fechaCursor.setDate(fechaCursor.getDate() + 1);
        }

        tituloGrafico = `Ventas diarias ${filtroLocal === 'Todos' ? 'comparativas por local' : '- ' + filtroLocal} (${fechaInicio} → ${fechaFin})`;
    }

    const labels = fechasBase.map(f => {
        const [a, m, d] = f.split('-');
        return `${d}/${m}`;
    });

    // TODOS LOS LOCALES -> varias líneas comparativas
    if (filtroLocal === 'Todos') {
        const ventasPorLocalYDia = {};
        const colores = [
            '#2563eb', '#dc2626', '#059669', '#8b5cf6', '#f59e0b',
            '#0891b2', '#db2777', '#65a30d', '#4f46e5', '#b45309'
        ];

        ventasFiltradas.forEach(v => {
            const local = v.local || 'Sin local';
            const fecha = limpiarFecha(v.fecha);
            if (!fecha || !fechasBase.includes(fecha)) return;

            if (!ventasPorLocalYDia[local]) {
                ventasPorLocalYDia[local] = {};
                fechasBase.forEach(f => {
                    ventasPorLocalYDia[local][f] = 0;
                });
            }

            ventasPorLocalYDia[local][fecha] += v.total || 0;
        });

        const locales = Object.keys(ventasPorLocalYDia).sort();

        const datasets = locales.map((local, i) => ({
            label: local,
            data: fechasBase.map(f => ventasPorLocalYDia[local][f] || 0),
            borderColor: colores[i % colores.length],
            backgroundColor: colores[i % colores.length] + '22',
            borderWidth: 2,
            pointBackgroundColor: colores[i % colores.length],
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.2,
            fill: false
        }));

        window.ventasChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    },
                    y: {
                        grid: {
                            color: '#eef2f7'
                        },
                        ticks: {
                            color: '#64748b',
                            callback: function(value) {
                                return '₡' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        return;
    }

    // LOCAL ESPECÍFICO -> una sola serie diaria
    const ventasPorDia = {};
    fechasBase.forEach(f => {
        ventasPorDia[f] = 0;
    });

    ventasFiltradas.forEach(v => {
        const fechaLimpia = limpiarFecha(v.fecha);
        if (fechaLimpia in ventasPorDia) {
            ventasPorDia[fechaLimpia] += v.total || 0;
        }
    });

    const valores = fechasBase.map(f => ventasPorDia[f] || 0);

    window.ventasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Ventas diarias',
                data: valores,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.10)',
                borderWidth: 2,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: tituloGrafico,
                    font: { size: 14, weight: 'bold' }
                },
                legend: { display: false },
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
                },
                x: {
                    title: {
                        display: true,
                        text: 'Día'
                    }
                }
            }
        }
    });

    return;
}

    // ==================================================
    // CASO 2: LOCAL ESPECÍFICO
    // ==================================================

    // A) MES o RANGO o AYER o PERSONALIZADO -> POR DÍA
    if (['mes', 'rango', 'ayer', 'personalizado'].includes(filtroTiempo)) {
        const ventasPorDia = {};
        let tituloGrafico = `Ventas diarias - ${filtroLocal}`;
        let fechasBase = [];

        if (filtroTiempo === 'mes') {
            const mesReferencia = fechaPersonalizada ? fechaPersonalizada.substring(0, 7) : mesActual;
            const [year, month] = mesReferencia.split('-');
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                fechasBase.push(`${year}-${month}-${String(day).padStart(2, '0')}`);
            }

            tituloGrafico = `Ventas diarias - ${filtroLocal} (${mesReferencia})`;
        }

        if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
            let fechaCursor = new Date(fechaInicio + 'T12:00:00');
            const fechaFinal = new Date(fechaFin + 'T12:00:00');

            while (fechaCursor <= fechaFinal) {
                fechasBase.push(fechaCursor.toLocaleDateString('en-CA'));
                fechaCursor.setDate(fechaCursor.getDate() + 1);
            }

            tituloGrafico = `Ventas diarias - ${filtroLocal} (${fechaInicio} → ${fechaFin})`;
        }

        if (filtroTiempo === 'ayer') {
            fechasBase = [ayerStr];
            tituloGrafico = `Ventas diarias - ${filtroLocal} (${ayerStr})`;
        }

        if (filtroTiempo === 'personalizado') {
            fechasBase = [fechaPersonalizada];
            tituloGrafico = `Ventas diarias - ${filtroLocal} (${fechaPersonalizada})`;
        }

        fechasBase.forEach(f => {
            ventasPorDia[f] = 0;
        });

        ventasFiltradas.forEach(v => {
            const fechaLimpia = limpiarFecha(v.fecha);
            if (fechaLimpia in ventasPorDia) {
                ventasPorDia[fechaLimpia] += v.total || 0;
            }
        });

        const fechasOrdenadas = Object.keys(ventasPorDia).sort();
        const valores = fechasOrdenadas.map(f => ventasPorDia[f] || 0);
        const labels = fechasOrdenadas.map(f => {
            const [a, m, d] = f.split('-');
            return `${d}/${m}`;
        });

        window.ventasChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Ventas diarias',
                    data: valores,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.10)',
                    borderWidth: 2,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: tituloGrafico,
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: { display: false },
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
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Día'
                        }
                    }
                }
            }
        });

        return;
    }

    // B) TODOS o AÑO -> POR MES
    const ventasPorMes = {};

    ventasFiltradas.forEach(v => {
        const fechaLimpia = limpiarFecha(v.fecha);
        if (!fechaLimpia) return;
        const mes = fechaLimpia.substring(0, 7);
        ventasPorMes[mes] = (ventasPorMes[mes] || 0) + (v.total || 0);
    });

    const mesesOrdenados = Object.keys(ventasPorMes).sort();
    const valoresMensuales = mesesOrdenados.map(m => ventasPorMes[m] || 0);

    window.ventasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mesesOrdenados,
            datasets: [{
                label: 'Ventas por mes',
                data: valoresMensuales,
                backgroundColor: '#2563eb',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Ventas por mes - ${filtroLocal}`,
                    font: { size: 14, weight: 'bold' }
                },
                legend: { display: false },
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
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mes'
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
        
        if (document.getElementById('dashboard').classList.contains('active')) {
            renderDashboard();
        }
    });
    
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
        
        if (document.getElementById('dashboard').classList.contains('active')) {
            renderDashboard();
        }
    });
}

function obtenerFechaCR() {
    const ahora = new Date();
    const crTime = new Date(ahora.getTime() - (360 * 60000));
    return crTime.toISOString().split('T')[0];
}

window.renderDashboard = renderDashboard;
window.initDashboardListeners = initDashboardListeners;