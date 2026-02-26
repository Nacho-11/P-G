// modules/dashboard.js
function renderDashboard() {
    const filtroLocal = AppState.filtros.local;
    const filtroTiempo = AppState.filtros.tiempo;
    const fechaHoy = new Date().toISOString().split('T')[0];
    const mesActual = fechaHoy.substring(0, 7);
    const anioActual = fechaHoy.substring(0, 4);
    
     // Agregar estadísticas de delivery
    const ventasDelivery = AppState.data.ventas.reduce((acc, v) => {
        acc.brutas += (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0);
        acc.comisiones += v.comisiones?.total || 0;
        return acc;
    }, { brutas: 0, comisiones: 0 });

    // Filtrar ventas
    const ventasFiltradas = AppState.data.ventas.filter(v => {
        const cumpleLocal = filtroLocal === 'Todos' || v.local === filtroLocal;
        let cumpleTiempo = true;
        
        if (filtroTiempo === 'dia') cumpleTiempo = v.fecha === fechaHoy;
        if (filtroTiempo === 'mes') cumpleTiempo = v.fecha.substring(0, 7) === mesActual;
        if (filtroTiempo === 'anio') cumpleTiempo = v.fecha.substring(0, 4) === anioActual;
        
        return cumpleLocal && cumpleTiempo;
    });
    
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.monto, 0);
    
    // Filtrar costos
    const costosFiltrados = AppState.data.costos.filter(c => 
        filtroLocal === 'Todos' || c.local === filtroLocal
    );
    const totalCostos = costosFiltrados.reduce((sum, c) => sum + c.monto, 0);
    
    const utilidad = totalVentas - totalCostos;
    
    // Resumen mensual
    const meses = {};
    AppState.data.ventas
        .filter(v => filtroLocal === 'Todos' || v.local === filtroLocal)
        .forEach(v => {
            const mes = v.fecha.substring(0, 7);
            meses[mes] = (meses[mes] || 0) + v.monto;
        });
    
    let htmlMes = '';
    Object.keys(meses).sort().reverse().forEach(mes => {
        htmlMes += `<p><strong>${mes}:</strong> ₡${meses[mes].toLocaleString()}</p>`;
    });
    
    // Top locales
    const ventasPorLocal = {};
    AppState.data.ventas.forEach(v => {
        ventasPorLocal[v.local] = (ventasPorLocal[v.local] || 0) + v.monto;
    });
    
    const topLocales = Object.entries(ventasPorLocal)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    let htmlTopLocales = '';
    topLocales.forEach(([local, monto]) => {
        htmlTopLocales += `
            <tr>
                <td>${local}</td>
                <td>₡${monto.toLocaleString()}</td>
            </tr>
        `;
    });
    
    const dashboardHTML = `
        <div class="card">
            <h2><i class="fas fa-chart-line"></i> Dashboard</h2>
            
            <div class="card-grid">
                <div class="stat-card">
                    <h3>Ventas totales</h3>
                    <div class="number">₡${totalVentas.toLocaleString()}</div>
                </div>
                
                <div class="stat-card" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">
                    <h3>Costos totales</h3>
                    <div class="number">₡${totalCostos.toLocaleString()}</div>
                </div>
                
                <div class="stat-card" style="background: linear-gradient(135deg, #27ae60, #229954);">
                    <h3>Utilidad</h3>
                    <div class="number">₡${utilidad.toLocaleString()}</div>
                </div>
            </div>
            
            <div style="margin: 20px 0; height: 300px;">
                <canvas id="graficoDashboard"></canvas>
            </div>

            <div class="stats-grid">
            <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                <i class="fas fa-motorcycle stat-icon"></i>
                <div class="stat-label">Ventas Delivery</div>
                <div class="stat-value">₡${Math.round(ventasDelivery.brutas).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <i class="fas fa-percent stat-icon"></i>
                <div class="stat-label">Comisiones Delivery</div>
                <div class="stat-value">₡${Math.round(ventasDelivery.comisiones).toLocaleString()}</div>
            </div>
        </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h3>Resumen Mensual</h3>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${htmlMes || '<p>No hay datos</p>'}
                    </div>
                </div>
                
                <div>
                    <h3>Top Locales</h3>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Local</th>
                                    <th>Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlTopLocales || '<tr><td colspan="2">No hay datos</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboard').innerHTML = dashboardHTML;
    
    // Crear gráfico
    setTimeout(() => {
        crearGraficoDashboard(totalVentas, totalCostos);
    }, 100);
}

function crearGraficoDashboard(ventas, costos) {
    const ctx = document.getElementById('graficoDashboard');
    if (!ctx) return;
    
    // Destruir gráfico existente
    if (window.dashboardChart) {
        window.dashboardChart.destroy();
    }
    
    window.dashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ventas', 'Costos Fijos'],
            datasets: [{
                label: 'Resumen',
                data: [ventas, costos],
                backgroundColor: ['#3498db', '#e74c3c'],
                borderColor: ['#2980b9', '#c0392b'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '₡' + value.toLocaleString()
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => '₡' + context.parsed.y.toLocaleString()
                    }
                }
            }
        }
    });
}