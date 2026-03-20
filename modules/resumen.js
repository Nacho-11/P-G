// modules/resumen.js
// Módulo de Resumen Financiero - Consolida datos de todos los módulos

console.log('📊 Cargando módulo de Resumen Financiero...');

// ============================================
// VARIABLES GLOBALES DEL MÓDULO
// ============================================
// No necesita variables propias, usa los datos de los otros módulos (window.ventasData, etc.)

function obtenerTextoPeriodo(filtro, fechaPersonalizada) {
    switch(filtro) {
        case 'todos':
            return 'Todo el historial';
        case 'ayer': {
            const ayer = new Date();
            ayer.setDate(ayer.getDate() - 1);
            return `Ayer (${ayer.toLocaleDateString('es-CR')})`;
        }
        case 'mes': {
            const hoy = new Date();
            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            return `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
        }
        case 'anio':
            return `Año ${new Date().getFullYear()}`;
        case 'personalizado':
            if (!fechaPersonalizada) return 'Fecha específica';
            return new Date(fechaPersonalizada + 'T12:00:00').toLocaleDateString('es-CR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        default:
            return 'Todo el historial';
    }
}

// ============================================
// INICIALIZAR MÓDULO
// ============================================
function initResumen() {
    console.log('🚀 Inicializando módulo de Resumen...');
    
    if (!AppState?.usuario) {
        console.log('⏳ Esperando autenticación...');
        return;
    }
    
    // Escuchar cambios en los filtros para actualizar la vista
    if (document.getElementById('resumen').classList.contains('active')) {
        renderResumen();
    }
}

// ============================================
// RENDERIZAR VISTA DE RESUMEN
// ============================================
function renderResumen() {
    console.log('📊 Renderizando Resumen Financiero...');
    
    const resumenContent = document.getElementById('resumenContent');
    if (!resumenContent) {
        console.error('❌ No se encontró el elemento resumenContent');
        return;
    }
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    
    // ========================================
    // 1. OBTENER DATOS DE TODOS LOS MÓDULOS
    // ========================================
    const ventas = window.ventasData || [];
    const costos = window.costosData || {};
    const compras = window.comprasExternas || [];  // ✅ CORREGIDO
    const facturas = window.facturacionBodegas || [];
    const mermas = window.mermas || [];            // ✅ CORREGIDO
    const prestamos = window.prestamos || [];      // ✅ CORREGIDO
    const servicios = window.serviciosData || {};
    const planilla = window.planillaData || {};

    // Log para depuración
    console.log('📦 Datos cargados en resumen:', {
        ventas: ventas.length,
        costos: Object.keys(costos).length,
        compras: compras.length,
        facturas: facturas.length,
        mermas: mermas.length,
        prestamos: prestamos.length,
        servicios: Object.keys(servicios).length,
        planilla: Object.keys(planilla).length
    });
    
    // ========================================
    // 2. CALCULAR FECHAS PARA FILTROS
    // ========================================
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);
    
    // Función auxiliar para filtrar por fecha (CORREGIDA)
    const filtrarPorFecha = (item) => {
        // Si tiene fecha (ventas, compras, facturas, mermas)
        if (item.fecha) {
            // Asegurar que la fecha está en formato YYYY-MM-DD
            let fechaItem = item.fecha;
            if (fechaItem.includes('T')) {
                fechaItem = fechaItem.split('T')[0];
            }
            
            console.log('📅 Comparando fechas:', {
                itemFecha: fechaItem,
                ayer: ayerStr,
                mesActual: mesActual,
                anioActual: anioActual,
                filtro: filtroTiempo
            });
            
            if (filtroTiempo === 'todos') return true;
            if (filtroTiempo === 'ayer') return fechaItem === ayerStr;
            if (filtroTiempo === 'mes') return fechaItem.substring(0, 7) === mesActual;
            if (filtroTiempo === 'anio') return fechaItem.substring(0, 4) === anioActual;
            if (filtroTiempo === 'personalizado') return fechaItem === AppState.filtros?.fechaPersonalizada;
            
            return true;
        }
        
        // Si tiene periodo (préstamos)
        if (item.periodo) {
            if (filtroTiempo === 'todos') return true;
            if (filtroTiempo === 'mes') return item.periodo === mesActual;
            if (filtroTiempo === 'anio') return item.periodo.substring(0, 4) === anioActual;
            return false;
        }
        
        return false;
    };
    
    // Función para filtrar por local (con permisos) - VERSIÓN SUPER PERMISIVA PARA PRUEBAS
    const filtrarPorLocal = (item) => {
        // Si no tiene local, lo excluimos
        if (!item.local) {
            console.log('⚠️ Item sin local:', item.id || 'sin id');
            return false;
        }
        
        console.log(`🔍 Evaluando ${item.id}: local=${item.local}, filtroLocal=${filtroLocal}`);
        
        // Si el filtro es "Todos", mostrar todos (sin verificar permisos por ahora)
        if (filtroLocal === 'Todos') {
            return true; // 👈 TEMPORAL - mostrar todos
        }
        
        // Si el filtro es un local específico
        return item.local === filtroLocal;
    };
    
    // ========================================
    // 3. CALCULAR TOTALES POR MÓDULO
    // ========================================

    // --- VENTAS ---
    const ventasFiltradas = ventas.filter(v => filtrarPorFecha(v) && filtrarPorLocal(v));
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);

    // --- COMPRAS EXTERNAS ---
    console.log('🔍 Compras antes de filtrar:', compras);
    compras.forEach(c => {
        console.log('📋 Compra en bruto:', {
            id: c.id,
            fecha: c.fecha,
            local: c.local,
            monto: c.monto,
            proveedor: c.proveedor
        });
    });

    const comprasFiltradas = compras.filter(c => {
        const pasaFecha = filtrarPorFecha(c);
        const pasaLocal = filtrarPorLocal(c);
        
        console.log(`🔎 Compra ${c.id}:`, {
            fecha: c.fecha,
            local: c.local,
            pasaFecha,
            pasaLocal,
            monto: c.monto
        });
        
        return pasaFecha && pasaLocal;
    });

    const totalCompras = comprasFiltradas.reduce((sum, c) => sum + (c.monto || 0), 0);
    console.log('💰 Total compras:', totalCompras);

    // --- MERMAS ---
    const mermasFiltradas = mermas.filter(m => filtrarPorFecha(m) && filtrarPorLocal(m));
    const totalMermas = mermasFiltradas.reduce((sum, m) => sum + (m.costoTotal || 0), 0);

    // --- PRÉSTAMOS ---
    console.log('🔍 Préstamos en window:', prestamos);
    console.log('📅 Filtros actuales:', {
        filtroTiempo,
        mesActual,
        filtroLocal
    });

    const prestamosFiltrados = prestamos.filter(p => {
        console.log('🔎 Evaluando préstamo:', {
            id: p.id,
            periodo: p.periodo,
            local: p.local,
            total: p.totales?.totalPago
        });
        
        const pasaFecha = filtrarPorFecha(p);
        const pasaLocal = filtrarPorLocal(p);
        
        console.log('✅ pasaFecha:', pasaFecha, '| pasaLocal:', pasaLocal);
        
        return pasaFecha && pasaLocal;
    });

    const totalPrestamos = prestamosFiltrados.reduce((sum, p) => {
        const monto = p.totales?.totalPago || 0;
        console.log('💰 Sumando préstamo:', monto);
        return sum + monto;
    }, 0);

    // --- FACTURACIÓN DE BODEGAS ---
    const facturasFiltradas = facturas.filter(f => filtrarPorFecha(f) && filtrarPorLocal(f));
    const totalFacturacion = facturasFiltradas.reduce((sum, f) => sum + (f.monto || 0), 0);

    // Calcular comisiones totales de ventas
    const totalComisionesVentas = ventasFiltradas.reduce((sum, v) => {
        return sum + (v.comisiones?.total || 0);
    }, 0);

    // --- COSTOS FIJOS (por categoría) ---
    let costosRestaurante = 0;
    let costosPlanta = 0;
    let costosOficinas = 0;
    let costosTransporte = 0;

    // Calcular planilla REAL desde window.planillaData
    let costosPlanilla = calcularPagoPlanilla(
        planilla, 
        filtroLocal, 
        filtroTiempo, 
        ayerStr, 
        mesActual, 
        anioActual, 
        AppState.filtros?.fechaPersonalizada
    );

    // Los costos fijos de restaurante, planta, etc.
    Object.keys(costos).forEach(local => {
        if (!puedeVerLocal(local) || (filtroLocal !== 'Todos' && local !== filtroLocal)) return;
        
        if (costos[local].restaurante) {
            costosRestaurante += costos[local].restaurante.reduce((sum, c) => sum + (c.monto || 0), 0);
        }
        if (costos[local].planta) {
            costosPlanta += costos[local].planta.reduce((sum, c) => sum + (c.monto || 0), 0);
        }
        if (costos[local].oficinas) {
            costosOficinas += costos[local].oficinas.reduce((sum, c) => sum + (c.monto || 0), 0);
        }
        if (costos[local].transporte) {
            costosTransporte += costos[local].transporte.reduce((sum, c) => sum + (c.monto || 0), 0);
        }
    });
    
    // --- SERVICIOS PÚBLICOS (Agua, Luz, Gas) ---
    let totalServicios = 0;
    let serviciosAgua = 0;
    let serviciosLuz = 0;
    let serviciosGas = 0;
    
    Object.keys(servicios).forEach(local => {
        if (!puedeVerLocal(local) || (filtroLocal !== 'Todos' && local !== filtroLocal)) return;
        
        servicios[local].forEach(s => {
            if (filtrarPorFecha(s)) {
                totalServicios += s.monto || 0;
                if (s.servicio === 'Agua') serviciosAgua += s.monto || 0;
                if (s.servicio === 'Electricidad') serviciosLuz += s.monto || 0;
                if (s.servicio === 'Gas') serviciosGas += s.monto || 0;
            }
        });
    });
    
    // ✅ LOGS DE DEPURACIÓN FINALES
    console.log('📊 RESULTADOS FINALES:');
    console.log('📊 Ventas filtradas:', ventasFiltradas.length, '| Total:', totalVentas);
    console.log('📊 Compras filtradas:', comprasFiltradas.length, '| Total:', totalCompras);
    console.log('📊 Mermas filtradas:', mermasFiltradas.length, '| Total:', totalMermas);
    console.log('📊 Préstamos filtrados:', prestamosFiltrados.length, '| Total:', totalPrestamos);
    console.log('📊 Facturas filtradas:', facturasFiltradas.length, '| Total:', totalFacturacion);
    console.log('📊 Servicios:', totalServicios);
    console.log('📊 Planilla:', costosPlanilla);
    
    // ========================================
    // 4. ARMAR HTML DEL RESUMEN
    // ========================================
    let html = `
        <!-- INDICADOR DE FILTROS ACTIVOS -->
        <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 20px; padding: 20px; margin-bottom: 25px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.05);">
            
            <!-- Título del indicador -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                <div style="background: #8b5cf6; width: 4px; height: 24px; border-radius: 4px;"></div>
                <span style="font-weight: 600; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.85rem;">
                    <i class="fas fa-sliders-h" style="color: #8b5cf6; margin-right: 8px;"></i>
                    FILTROS ACTIVOS
                </span>
            </div>
            
            <!-- Pills de filtros -->
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                
                <!-- Filtro de Local -->
                <div style="display: flex; align-items: center; background: white; border-radius: 100px; padding: 8px 16px 8px 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="background: ${filtroLocal === 'Todos' ? '#8b5cf6' : '#10b981'}; width: 8px; height: 8px; border-radius: 8px; margin-right: 10px;"></div>
                    <i class="fas fa-store" style="color: #64748b; font-size: 0.9rem; margin-right: 8px;"></i>
                    <span style="font-weight: 500; color: #475569; margin-right: 8px;">Local:</span>
                    <span style="font-weight: 700; color: ${filtroLocal === 'Todos' ? '#8b5cf6' : '#10b981'};">
                        ${filtroLocal}
                    </span>
                </div>
                
                <!-- Filtro de Período -->
                <div style="display: flex; align-items: center; background: white; border-radius: 100px; padding: 8px 16px 8px 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="background: #8b5cf6; width: 8px; height: 8px; border-radius: 8px; margin-right: 10px;"></div>
                    <i class="fas fa-calendar-alt" style="color: #64748b; font-size: 0.9rem; margin-right: 8px;"></i>
                    <span style="font-weight: 500; color: #475569; margin-right: 8px;">Período:</span>
                    <span style="font-weight: 700; color: #8b5cf6;">
                        ${obtenerTextoPeriodo(filtroTiempo, AppState.filtros?.fechaPersonalizada)}
                    </span>
                </div>
                
                <!-- Total de registros -->
                <div style="display: flex; align-items: center; background: #f1f4f9; border-radius: 100px; padding: 8px 16px; margin-left: auto;">
                    <i class="fas fa-database" style="color: #64748b; font-size: 0.8rem; margin-right: 6px;"></i>
                    <span style="color: #475569; font-size: 0.9rem;">
                        <span style="font-weight: 700;">${ventasFiltradas.length + comprasFiltradas.length + mermasFiltradas.length + prestamosFiltrados.length}</span> registros
                    </span>
                </div>
            </div>
            
            <!-- Fecha específica (si es personalizado o ayer) -->
            ${(filtroTiempo === 'personalizado' || filtroTiempo === 'ayer') ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-clock" style="color: #8b5cf6; font-size: 0.8rem;"></i>
                <span style="color: #64748b; font-size: 0.9rem;">
                    Mostrando datos específicos de:
                    <span style="font-weight: 600; color: #1e293b;">
                        ${new Date(AppState.filtros?.fechaPersonalizada + 'T12:00:00').toLocaleDateString('es-CR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </span>
                </span>
            </div>
            ` : ''}
        </div>
        
        <!-- TARJETAS DE TOTALES GENERALES -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            
            <!-- Ingresos Totales -->
            <div style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 20px; padding: 25px; color: white; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-shopping-cart" style="font-size: 2rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">INGRESOS TOTALES</div>
                        <div style="font-size: 2rem; font-weight: 700;">
                            ₡${Math.round(totalVentas).toLocaleString()}
                        </div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">Solo ventas</div>
                    </div>
                </div>
            </div>
            
            <!-- Egresos Totales -->
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 20px; padding: 25px; color: white; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-arrow-down" style="font-size: 2rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">EGRESOS TOTALES</div>
                        <div style="font-size: 2rem; font-weight: 700;">
                            ₡${Math.round(
                                totalCompras +
                                totalFacturacion +
                                totalServicios + 
                                totalMermas + 
                                totalPrestamos + 
                                costosRestaurante + 
                                costosPlanta + 
                                costosOficinas + 
                                costosTransporte + 
                                totalComisionesVentas +
                                costosPlanilla
                            ).toLocaleString()}
                        </div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">Compras + Servicios + Costos + Planilla</div>
                    </div>
                </div>
            </div>
            
            <!-- Utilidad Neta -->
            <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 20px; padding: 25px; color: white; box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-chart-line" style="font-size: 2rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">UTILIDAD NETA</div>
                        <div style="font-size: 2rem; font-weight: 700;">
                            ₡${Math.round(
                                totalVentas - 
                                (totalCompras + totalFacturacion + totalServicios + totalMermas + 
                                totalPrestamos + costosRestaurante + costosPlanta + costosOficinas + 
                                costosTransporte + totalComisionesVentas + costosPlanilla)
                            ).toLocaleString()}
                        </div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">Ingresos - Egresos</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- ESTADO DE RESULTADOS DETALLADO -->
        <div class="card" style="margin-bottom: 30px;">
            <h3 style="margin-bottom: 20px; border-bottom: 2px solid #eef2f6; padding-bottom: 10px;">
                <i class="fas fa-file-invoice-dollar" style="color: #8b5cf6;"></i> Estado de Resultados
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
                <!-- INGRESOS -->
                <tr style="background: #f8fafc;">
                    <td style="padding: 12px 15px; font-weight: 600; border-bottom: 2px solid #e2e8f0;" colspan="2">
                        <i class="fas fa-arrow-up" style="color: #10b981;"></i> INGRESOS
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 15px 10px 35px;">Ventas Brutas</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: 600; color: #10b981;">₡${Math.round(totalVentas).toLocaleString()}</td>
                </tr>

                <!-- EGRESOS -->
                <tr style="background: #f8fafc;">
                    <td style="padding: 15px 15px 12px; font-weight: 600; border-bottom: 2px solid #e2e8f0;" colspan="2">
                        <i class="fas fa-arrow-down" style="color: #ef4444;"></i> EGRESOS
                    </td>
                </tr>
                
                <!-- Costo de Ventas -->
                <tr>
                    <td style="padding: 10px 15px 10px 35px; color: #475569;">Costo de Ventas (Materia Prima)</td>
                    <td style="padding: 10px 15px; text-align: right; color: #ef4444;">₡${Math.round(totalCompras).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 10px 35px; color: #475569;">Mermas</td>
                    <td style="padding: 5px 15px 10px; text-align: right; color: #ef4444;">₡${Math.round(totalMermas).toLocaleString()}</td>
                </tr>

                <!-- Costo de Bodega -->
                <tr>
                    <td style="padding: 5px 15px 10px 35px; color: #475569;">Facturación de Bodegas (costo)</td>
                    <td style="padding: 5px 15px 10px; text-align: right; color: #ef4444;">₡${Math.round(totalFacturacion).toLocaleString()}</td>
                </tr>
                
                <!-- Gastos Operativos -->
                <tr>
                    <td style="padding: 10px 15px 5px 35px; font-weight: 500;">Gastos Operativos</td>
                    <td></td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 50px; color: #64748b; font-size: 0.95rem;">- Planilla (Restaurantes)</td>
                    <td style="padding: 5px 15px; text-align: right; color: #ef4444;">₡${Math.round(costosPlanilla).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 50px; color: #64748b; font-size: 0.95rem;">- Arrendamiento / Servicios (Luz, Agua, Gas)</td>
                    <td style="padding: 5px 15px; text-align: right; color: #ef4444;">₡${Math.round(totalServicios).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 50px; color: #64748b; font-size: 0.95rem;">- Comisiones por Ventas</td>
                    <td style="padding: 5px 15px; text-align: right; color: #ef4444;">₡${Math.round(totalComisionesVentas).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 50px; color: #64748b; font-size: 0.95rem;">- Otros Costos Fijos (Restaurante)</td>
                    <td style="padding: 5px 15px; text-align: right; color: #ef4444;">₡${Math.round(costosRestaurante).toLocaleString()}</td>
                </tr>
                
                <!-- Gastos de Logística -->
                <tr>
                    <td style="padding: 15px 15px 5px 35px; font-weight: 500;">Gastos de Logística</td>
                    <td></td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 50px; color: #64748b; font-size: 0.95rem;">- Planta de Producción</td>
                    <td style="padding: 5px 15px; text-align: right; color: #ef4444;">₡${Math.round(costosPlanta).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 50px; color: #64748b; font-size: 0.95rem;">- Oficinas</td>
                    <td style="padding: 5px 15px; text-align: right; color: #ef4444;">₡${Math.round(costosOficinas).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 10px 50px; color: #64748b; font-size: 0.95rem;">- Bodegas y Transporte</td>
                    <td style="padding: 5px 15px 10px; text-align: right; color: #ef4444;">₡${Math.round(costosTransporte).toLocaleString()}</td>
                </tr>
                
                <!-- Otros Egresos -->
                <tr>
                    <td style="padding: 10px 15px 5px 35px; font-weight: 500;">Otros Egresos</td>
                    <td></td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 15px 50px; color: #64748b; font-size: 0.95rem;">- Préstamos a Empleados</td>
                    <td style="padding: 5px 15px 15px; text-align: right; color: #ef4444;">₡${Math.round(totalPrestamos).toLocaleString()}</td>
                </tr>

                <!-- TOTAL EGRESOS -->
                <tr style="background: #fef2f2;">
                    <td style="padding: 15px; font-weight: 700; color: #b91c1c;">TOTAL EGRESOS</td>
                    <td style="padding: 15px; text-align: right; font-weight: 700; color: #b91c1c;">
                        ₡${Math.round(
                            totalCompras + 
                            totalFacturacion + 
                            totalServicios + 
                            totalMermas + 
                            totalPrestamos + 
                            costosRestaurante + 
                            costosPlanta + 
                            costosOficinas + 
                            costosTransporte + 
                            totalComisionesVentas + 
                            costosPlanilla
                        ).toLocaleString()}
                    </td>
                </tr>

                <!-- UTILIDAD NETA -->
                <tr style="background: #f0fdf4;">
                    <td style="padding: 18px 15px; font-weight: 800; font-size: 1.2rem; color: #166534;">UTILIDAD NETA</td>
                    <td style="padding: 18px 15px; text-align: right; font-weight: 800; font-size: 1.2rem; color: #166534;">
                        ₡${Math.round(
                            totalVentas - 
                            (totalCompras + totalFacturacion + totalServicios + totalMermas + 
                            totalPrestamos + costosRestaurante + costosPlanta + costosOficinas + 
                            costosTransporte + totalComisionesVentas + costosPlanilla)
                        ).toLocaleString()}
                    </td>
                </tr>

                <!-- MARGEN DE UTILIDAD -->
                <tr>
                    <td style="padding: 10px 15px; color: #64748b;">Margen de Utilidad</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: 600; color: #059669;">
                        ${totalVentas > 0 ? ((totalVentas - (totalCompras + totalFacturacion + totalServicios + totalMermas + totalPrestamos + costosRestaurante + costosPlanta + costosOficinas + costosTransporte + totalComisionesVentas + costosPlanilla)) / totalVentas * 100).toFixed(2) : 0}%
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- TARJETAS DE DESGLOSE POR CATEGORÍA -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 25px;">
            
            <!-- Compras -->
            <div style="background: white; border-radius: 16px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="background: #fef3c7; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-truck" style="color: #f59e0b;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: #64748b;">COMPRAS</div>
                        <div style="font-size: 1.2rem; font-weight: 700;">₡${Math.round(totalCompras).toLocaleString()}</div>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #475569;">${comprasFiltradas.length} facturas</div>
            </div>
            
            <!-- Servicios -->
            <div style="background: white; border-radius: 16px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="background: #dbeafe; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-bolt" style="color: #3b82f6;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: #64748b;">SERVICIOS</div>
                        <div style="font-size: 1.2rem; font-weight: 700;">₡${Math.round(totalServicios).toLocaleString()}</div>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #475569;">Agua: ₡${Math.round(serviciosAgua).toLocaleString()} | Luz: ₡${Math.round(serviciosLuz).toLocaleString()}</div>
            </div>
            
            <!-- Mermas -->
            <div style="background: white; border-radius: 16px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="background: #fee2e2; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-trash-alt" style="color: #ef4444;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: #64748b;">MERMAS</div>
                        <div style="font-size: 1.2rem; font-weight: 700;">₡${Math.round(totalMermas).toLocaleString()}</div>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #475569;">${mermasFiltradas.length} registros</div>
            </div>
            
            <!-- Préstamos -->
            <div style="background: white; border-radius: 16px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="background: #f3e8ff; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-hand-holding-usd" style="color: #8b5cf6;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: #64748b;">PRÉSTAMOS</div>
                        <div style="font-size: 1.2rem; font-weight: 700;">₡${Math.round(totalPrestamos).toLocaleString()}</div>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #475569;">${prestamosFiltrados.length} registros</div>
            </div>
        </div>
    `;
    
    resumenContent.innerHTML = html;
}

function calcularPagoPlanilla(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) {
    let totalPlanilla = 0;
    
    // PORCENTAJES (igual que en planilla.js)
    const PORCENTAJES = {
        ordinarias: 1.0,
        extras: 1.5,
        nocturnas: 1.2,
        extrasNocturnas: 1.8
    };
    
    Object.keys(planillaData).forEach(local => {
        // Filtrar por local
        if (filtroLocal !== 'Todos' && local !== filtroLocal) return;
        if (!puedeVerLocal(local)) return;
        
        const empleados = planillaData[local] || [];
        
        empleados.forEach(emp => {
            if (!emp.horas) return;
            
            // Determinar qué fechas incluir según el filtro
            Object.keys(emp.horas).forEach(fechaStr => {
                const fecha = fechaStr.split('T')[0];
                
                // Aplicar filtro de tiempo
                if (filtroTiempo === 'ayer' && fecha !== ayerStr) return;
                if (filtroTiempo === 'mes' && fecha.substring(0, 7) !== mesActual) return;
                if (filtroTiempo === 'anio' && fecha.substring(0, 4) !== anioActual) return;
                if (filtroTiempo === 'personalizado' && fecha !== fechaPersonalizada) return;
                
                const horas = emp.horas[fechaStr];
                const salarioHora = (emp.salario || 0) / 240;
                
                // Calcular cada tipo de hora con su porcentaje
                const pagoOrdinarias = (horas.ordinarias || 0) * salarioHora * PORCENTAJES.ordinarias;
                const pagoExtras = (horas.extras || 0) * salarioHora * PORCENTAJES.extras;
                const pagoNocturnas = (horas.nocturnas || 0) * salarioHora * PORCENTAJES.nocturnas;
                const pagoExtrasNocturnas = (horas.extrasNocturnas || 0) * salarioHora * PORCENTAJES.extrasNocturnas;
                
                totalPlanilla += pagoOrdinarias + pagoExtras + pagoNocturnas + pagoExtrasNocturnas;
            });
        });
    });
    
    return totalPlanilla;
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initResumen = initResumen;
window.renderResumen = renderResumen;

console.log('✅ resumen.js cargado - Módulo de resumen financiero');