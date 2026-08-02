// modules/logistica.js - VERSIÓN CORREGIDA

console.log('🚚 Cargando módulo de Logística...');

function formatearFechaCR(fechaStr) {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
}

// ============================================
// CONFIGURACIÓN
// ============================================
const CATEGORIAS_LOGISTICA = {
    planta: {
        nombre: 'Planta Producción',
        categoriaFirebase: 'Planta',
        subCategoria: 'planta',
        color: '#3b82f6',
        icono: 'fa-industry'
    },
    oficinas: {
        nombre: 'Oficinas',
        categoriaFirebase: 'Oficinas',
        subCategoria: 'oficinas',
        color: '#10b981',
        icono: 'fa-building'
    },
    transporte: {
        nombre: 'Bodegas y Transporte',
        categoriaFirebase: 'Transporte',
        subCategoria: 'transporte',
        color: '#f59e0b',
        icono: 'fa-warehouse'
    },
    planilla: {
        nombre: 'Planillas (SALARIOS LOGÍSTICA)',
        categoriaFirebase: 'Planilla',
        subCategoria: 'planilla',
        color: '#8b5cf6',
        icono: 'fa-users'
    }
};

// ============================================
// VARIABLES GLOBALES
// ============================================
let facturacionBodegas = [];

// ============================================
// OBTENER PERÍODO ACTUAL (CORREGIDO)
// ============================================
function obtenerPeriodoActual() {
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState?.filtros?.fechaPersonalizada;
    const fechaInicio = AppState?.filtros?.fechaInicio;
    const fechaFin = AppState?.filtros?.fechaFin;
    const hoy = new Date();
    
    let periodo = { 
        tipo: filtroTiempo, 
        valor: '', 
        nombre: 'Mes actual', 
        dias: 30,
        mesReferencia: null, 
        anioReferencia: null,
        fechaInicio: null, 
        fechaFin: null 
    };
    
    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    switch(filtroTiempo) {
        case 'todos':
            periodo.tipo = 'mes';
            periodo.valor = hoy.toLocaleDateString('en-CA').substring(0, 7);
            periodo.nombre = `${mesesNombres[hoy.getMonth()]} ${hoy.getFullYear()}`;
            periodo.dias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            periodo.mesReferencia = hoy.getMonth() + 1;
            periodo.anioReferencia = hoy.getFullYear();
            break;
            
        case 'rango':
            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio + 'T12:00:00');
                const fin = new Date(fechaFin + 'T12:00:00');
                const diffTime = Math.abs(fin - inicio);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                periodo.tipo = 'rango';
                periodo.fechaInicio = fechaInicio;
                periodo.fechaFin = fechaFin;
                periodo.valor = `${fechaInicio} → ${fechaFin}`;
                periodo.nombre = `${formatearFechaCR(fechaInicio)} → ${formatearFechaCR(fechaFin)}`;
                periodo.dias = diffDays;
                periodo.mesReferencia = null;
                periodo.anioReferencia = null;
            } else {
                periodo.tipo = 'mes';
                periodo.valor = hoy.toLocaleDateString('en-CA').substring(0, 7);
                periodo.nombre = `${mesesNombres[hoy.getMonth()]} ${hoy.getFullYear()}`;
                periodo.dias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
                periodo.mesReferencia = hoy.getMonth() + 1;
                periodo.anioReferencia = hoy.getFullYear();
            }
            break;
            
        case 'ayer':
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            periodo.valor = ayer.toLocaleDateString('en-CA');
            periodo.nombre = `Ayer (${ayer.toLocaleDateString('es-CR')})`;
            periodo.dias = 1;
            periodo.mesReferencia = ayer.getMonth() + 1;
            periodo.anioReferencia = ayer.getFullYear();
            break;
            
        case 'mes':
            const mesRef = fechaPersonalizada ? new Date(fechaPersonalizada + '-01T12:00:00') : hoy;
            periodo.valor = mesRef.toLocaleDateString('en-CA').substring(0, 7);
            periodo.nombre = `${mesesNombres[mesRef.getMonth()]} ${mesRef.getFullYear()}`;
            periodo.dias = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();
            periodo.mesReferencia = mesRef.getMonth() + 1;
            periodo.anioReferencia = mesRef.getFullYear();
            break;
            
        case 'anio':
            periodo.valor = hoy.getFullYear().toString();
            periodo.nombre = `Año ${hoy.getFullYear()}`;
            periodo.dias = 365;
            periodo.anioReferencia = hoy.getFullYear();
            break;
            
        case 'personalizado':
            if (fechaPersonalizada) {
                periodo.valor = fechaPersonalizada;
                const fechaObj = new Date(fechaPersonalizada + 'T12:00:00');
                periodo.nombre = fechaObj.toLocaleDateString('es-CR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                });
                periodo.dias = 1;
                periodo.mesReferencia = fechaObj.getMonth() + 1;
                periodo.anioReferencia = fechaObj.getFullYear();
            } else {
                periodo.valor = hoy.toLocaleDateString('en-CA').substring(0, 7);
                periodo.nombre = `${mesesNombres[hoy.getMonth()]} ${hoy.getFullYear()}`;
                periodo.dias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
                periodo.mesReferencia = hoy.getMonth() + 1;
                periodo.anioReferencia = hoy.getFullYear();
            }
            break;
            
        default:
            periodo.tipo = 'mes';
            periodo.valor = hoy.toLocaleDateString('en-CA').substring(0, 7);
            periodo.nombre = `${mesesNombres[hoy.getMonth()]} ${hoy.getFullYear()}`;
            periodo.dias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            periodo.mesReferencia = hoy.getMonth() + 1;
            periodo.anioReferencia = hoy.getFullYear();
            break;
    }
    
    return periodo;
}

// ============================================
// OBTENER COSTOS DESDE COSTOSDATA
// ============================================
function obtenerCostosLogistica() {
    const costosData = window.costosData || {};
    const resultado = {
        planta: { mensual: 0, diario: 0, items: [] },
        oficinas: { mensual: 0, diario: 0, items: [] },
        transporte: { mensual: 0, diario: 0, items: [] },
        planilla: { mensual: 0, diario: 0, items: [] }
    };
    
    console.log('📊 costosData en logística:', costosData);
    
    Object.keys(costosData).forEach(categoriaFirebase => {
        const subCategorias = costosData[categoriaFirebase];
        Object.keys(subCategorias).forEach(subCategoria => {
            const costosArray = subCategorias[subCategoria];
            if (!Array.isArray(costosArray)) return;
            
            costosArray.forEach(costo => {
                const monto = costo.monto || 0;
                
                if (subCategoria === 'planta') {
                    resultado.planta.mensual += monto;
                    resultado.planta.items.push(costo);
                } else if (subCategoria === 'oficinas') {
                    resultado.oficinas.mensual += monto;
                    resultado.oficinas.items.push(costo);
                } else if (subCategoria === 'transporte') {
                    resultado.transporte.mensual += monto;
                    resultado.transporte.items.push(costo);
                } else if (subCategoria === 'planilla') {
                    resultado.planilla.mensual += monto;
                    resultado.planilla.items.push(costo);
                }
            });
        });
    });
    
    console.log('📊 Costos logística calculados:', resultado);
    return resultado;
}

// ============================================
// OBTENER PORCENTAJES POR LOCAL
// ============================================
function obtenerPorcentajesPorLocal(periodo) {
    const porcentajes = {};
    const totalFacturacion = 0;
    const facturacionPeriodo = [];
    
    // Si hay porcentajes guardados en localStorage, usarlos
    const porcentajesGuardados = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};
    
    if (Object.keys(porcentajesGuardados).length > 0) {
        AppState.locales.forEach(local => {
            porcentajes[local.nombre] = (porcentajesGuardados[local.nombre] || 0) / 100;
        });
        return { porcentajes, totalFacturacion: 0, facturacionPeriodo: [], esManual: true };
    }
    
    // Si no hay porcentajes guardados, distribución equitativa
    const localesCount = AppState.locales.length || 1;
    const pctEquitativo = 1 / localesCount;
    AppState.locales.forEach(local => {
        porcentajes[local.nombre] = pctEquitativo;
    });
    
    return { porcentajes, totalFacturacion: 0, facturacionPeriodo: [], esManual: false };
}

// ============================================
// OBTENER LOCALES CON COSTOS
// ============================================
function getLocalesConCostos() {
    const costosData = window.costosData || {};
    const locales = new Set();
    
    // Función para verificar si el usuario puede ver un local
    function puedeVerLocal(local) {
        const esGer = (typeof window.esGerencia === 'function') ? window.esGerencia() : false;
        if (esGer) return true;
        return AppState?.usuario?.local === local;
    }
    
    Object.keys(costosData).forEach(categoriaFirebase => {
        const subCategorias = costosData[categoriaFirebase];
        Object.keys(subCategorias).forEach(subCategoria => {
            const costosArray = subCategorias[subCategoria];
            if (!Array.isArray(costosArray)) return;
            costosArray.forEach(costo => {
                if (costo.local && puedeVerLocal(costo.local)) {
                    locales.add(costo.local);
                }
            });
        });
    });
    
    console.log('📍 Locales con costos (con permisos):', Array.from(locales));
    return locales;
}

// ============================================
// INICIALIZAR MÓDULO
// ============================================
function initLogistica() {
    console.log('🚀 Inicializando módulo de Logística...');
    
    if (!AppState?.usuario) {
        console.log('⏳ Esperando autenticación...');
        setTimeout(initLogistica, 500);
        return;
    }
    
    // Forzar carga de costos si no existen
    if (!window.costosData || Object.keys(window.costosData).length === 0) {
        console.log('⏳ Esperando datos de costos...');
        if (typeof cargarCostosDesdeFirebase === 'function') {
            cargarCostosDesdeFirebase();
        }
    }
    
    if (document.getElementById('logistica').classList.contains('active')) {
        renderLogistica();
    }
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL (CORREGIDA)
// ============================================
async function renderLogistica() {
    console.log('📊 Renderizando Logística...');
    
    const logisticaContent = document.getElementById('logisticaContent');
    if (!logisticaContent) return;
    
    const filtroLocal = AppState?.filtros?.local || 'Todos';
    const periodo = obtenerPeriodoActual();
    const costosData = window.costosData || {};
    
    console.log('📅 Período:', periodo);
    console.log('📊 costosData:', costosData);
    
    // Obtener costos mensuales
    const costosMensuales = obtenerCostosLogistica();
    
    // Calcular costos diarios
    const dias = periodo.dias || 30;
    const costosDiarios = {
        planta: costosMensuales.planta.mensual / dias,
        oficinas: costosMensuales.oficinas.mensual / dias,
        transporte: costosMensuales.transporte.mensual / dias,
        planilla: costosMensuales.planilla.mensual / dias,
        total: (costosMensuales.planta.mensual + 
                costosMensuales.oficinas.mensual + 
                costosMensuales.transporte.mensual +
                costosMensuales.planilla.mensual) / dias
    };
    
    // Obtener porcentajes
    const { porcentajes } = obtenerPorcentajesPorLocal(periodo);
    
    // Obtener locales con costos
    const localesConCostos = getLocalesConCostos();
    
    // Determinar locales a mostrar
    let localesAMostrar = [];

    console.log('🔍 Filtro local:', filtroLocal);
    console.log('📍 Locales con costos:', Array.from(localesConCostos));

    if (filtroLocal === 'Todos') {
        // Mostrar todos los locales que tienen costos
        localesAMostrar = AppState.locales.filter(l => 
            localesConCostos.has(l.nombre)
        );
    } else {
        // Mostrar SOLO el local seleccionado SI tiene costos
        const localFiltrado = AppState.locales.find(l => l.nombre === filtroLocal);
        if (localFiltrado && localesConCostos.has(filtroLocal)) {
            localesAMostrar = [localFiltrado];
        } else {
            // Si el local seleccionado no tiene costos, mostrar mensaje
            localesAMostrar = [];
        }
    }

    console.log('📍 Locales a mostrar:', localesAMostrar.map(l => l.nombre));
    
    // Si no hay locales con costos, mostrar mensaje
    if (localesAMostrar.length === 0) {
        logisticaContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <h2><i class="fas fa-truck" style="color: #f59e0b;"></i> Logística - Distribución de Costos</h2>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-outline" onclick="configurarPorcentajesLogistica()">
                        <i class="fas fa-percent"></i> Configurar %
                    </button>
                </div>
            </div>
            <div class="card" style="padding: 60px 30px; text-align: center;">
                <i class="fas fa-box-open" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3 style="color: #334155; margin-bottom: 10px;">No hay costos registrados</h3>
                <p style="color: #64748b;">Registre costos fijos en el módulo de Costos para ver la distribución logística.</p>
                <button class="btn btn-primary" onclick="cambiarModulo('costos')" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> Ir a Costos Fijos
                </button>
            </div>
        `;
        return;
    }
    
    // ============================================
    // CÁLCULO DE DISTRIBUCIÓN
    // ============================================
    let totalPlanta = 0, totalOficinas = 0, totalTransporte = 0, totalPlanilla = 0, totalGeneral = 0;
    const distribucionPorLocal = [];
    
    localesAMostrar.forEach(local => {
        const pct = porcentajes[local.nombre] || 0;
        const planta = costosDiarios.planta * pct;
        const oficinas = costosDiarios.oficinas * pct;
        const transporte = costosDiarios.transporte * pct;
        const planilla = costosDiarios.planilla * pct;
        const total = planta + oficinas + transporte + planilla;
        
        totalPlanta += planta;
        totalOficinas += oficinas;
        totalTransporte += transporte;
        totalPlanilla += planilla;
        totalGeneral += total;
        
        distribucionPorLocal.push({
            local: local.nombre,
            porcentaje: pct * 100,
            planta,
            oficinas,
            transporte,
            planilla,
            total
        });
    });
    
    distribucionPorLocal.sort((a, b) => b.total - a.total);
    
    // ============================================
    // CONSTRUIR HTML
    // ============================================
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-truck" style="color: #f59e0b;"></i> Logística - Distribución de Costos</h2>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-outline" onclick="configurarPorcentajesLogistica()">
                    <i class="fas fa-percent"></i> Configurar %
                </button>
            </div>
        </div>
        
        <!-- Información del período -->
        <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; border: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: #f1f5f9; width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-calendar-alt" style="color: #3b82f6; font-size: 1.5rem;"></i>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 0.8rem;">PERÍODO ACTUAL</div>
                    <div style="font-size: 1.2rem; font-weight: 600;">${periodo.nombre || 'Mes actual'}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${periodo.dias || 30} días en el período</div>
                </div>
            </div>
            <div style="display: flex; gap: 30px;">
                <div>
                    <div style="color: #64748b; font-size: 0.8rem;">MÉTODO DE DISTRIBUCIÓN</div>
                    <div style="font-size: 1rem; font-weight: 600; color: #f59e0b;">
                        📊 Porcentajes manuales
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Tarjetas de costos fijos (4 tarjetas) -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
            
            <!-- Planta -->
            <div style="background: linear-gradient(135deg, ${CATEGORIAS_LOGISTICA.planta.color}, ${CATEGORIAS_LOGISTICA.planta.color}dd); border-radius: 16px; padding: 20px; color: white;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${CATEGORIAS_LOGISTICA.planta.icono}" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">${CATEGORIAS_LOGISTICA.planta.nombre}</div>
                        <div style="font-size: 0.7rem; opacity: 0.7;">${costosMensuales.planta.items.length} costos</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Mensual</span>
                    <span style="font-size: 1.2rem; font-weight: 700;">₡${Math.round(costosMensuales.planta.mensual).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Diario (${dias} días)</span>
                    <span style="font-size: 1rem; font-weight: 600;">₡${Math.round(costosDiarios.planta).toLocaleString()}</span>
                </div>
            </div>
            
            <!-- Oficinas -->
            <div style="background: linear-gradient(135deg, ${CATEGORIAS_LOGISTICA.oficinas.color}, ${CATEGORIAS_LOGISTICA.oficinas.color}dd); border-radius: 16px; padding: 20px; color: white;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${CATEGORIAS_LOGISTICA.oficinas.icono}" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">${CATEGORIAS_LOGISTICA.oficinas.nombre}</div>
                        <div style="font-size: 0.7rem; opacity: 0.7;">${costosMensuales.oficinas.items.length} costos</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Mensual</span>
                    <span style="font-size: 1.2rem; font-weight: 700;">₡${Math.round(costosMensuales.oficinas.mensual).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Diario (${dias} días)</span>
                    <span style="font-size: 1rem; font-weight: 600;">₡${Math.round(costosDiarios.oficinas).toLocaleString()}</span>
                </div>
            </div>
            
            <!-- Transporte -->
            <div style="background: linear-gradient(135deg, ${CATEGORIAS_LOGISTICA.transporte.color}, ${CATEGORIAS_LOGISTICA.transporte.color}dd); border-radius: 16px; padding: 20px; color: white;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${CATEGORIAS_LOGISTICA.transporte.icono}" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">${CATEGORIAS_LOGISTICA.transporte.nombre}</div>
                        <div style="font-size: 0.7rem; opacity: 0.7;">${costosMensuales.transporte.items.length} costos</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Mensual</span>
                    <span style="font-size: 1.2rem; font-weight: 700;">₡${Math.round(costosMensuales.transporte.mensual).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Diario (${dias} días)</span>
                    <span style="font-size: 1rem; font-weight: 600;">₡${Math.round(costosDiarios.transporte).toLocaleString()}</span>
                </div>
            </div>
            
            <!-- Planilla -->
            <div style="background: linear-gradient(135deg, ${CATEGORIAS_LOGISTICA.planilla.color}, ${CATEGORIAS_LOGISTICA.planilla.color}dd); border-radius: 16px; padding: 20px; color: white;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${CATEGORIAS_LOGISTICA.planilla.icono}" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">${CATEGORIAS_LOGISTICA.planilla.nombre}</div>
                        <div style="font-size: 0.7rem; opacity: 0.7;">${costosMensuales.planilla.items.length} costos</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Mensual</span>
                    <span style="font-size: 1.2rem; font-weight: 700;">₡${Math.round(costosMensuales.planilla.mensual).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Diario (${dias} días)</span>
                    <span style="font-size: 1rem; font-weight: 600;">₡${Math.round(costosDiarios.planilla).toLocaleString()}</span>
                </div>
            </div>
        </div>
        
        <!-- Tabla de distribución -->
        <div class="card" style="border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0;">
                    <i class="fas fa-chart-pie" style="color: #f59e0b;"></i>
                    Distribución por Local - ${periodo.nombre || 'Mes actual'}
                </h3>
                <div style="background: #0f172a; color: white; padding: 10px 20px; border-radius: 12px;">
                    <span style="font-size: 0.8rem; opacity: 0.8;">Total Costos Logística Diarios:</span>
                    <span style="font-weight: 700; font-size: 1.1rem;">₡${Math.round(costosDiarios.total).toLocaleString()}</span>
                </div>
            </div>
            
            <div style="padding: 20px;">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr style="background: #f1f5f9;">
                                <th>Local</th>
                                <th>% Distribución</th>
                                <th>Planta (₡)</th>
                                <th>Oficinas (₡)</th>
                                <th>Transporte (₡)</th>
                                <th>Planilla (₡)</th>
                                <th>Total Asignado (₡)</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    distribucionPorLocal.forEach(item => {
        html += `
            <tr>
                <td><strong>${item.local}</strong></td>
                <td>
                    <span style="background: #f3e8ff; color: #6b21a8; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.9rem;">
                        ${item.porcentaje.toFixed(2)}%
                    </span>
                </td>
                <td style="text-align: right; font-weight: 600;">₡${Math.round(item.planta).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 600;">₡${Math.round(item.oficinas).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 600;">₡${Math.round(item.transporte).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 600;">₡${Math.round(item.planilla).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 700; color: #f59e0b; font-size: 1.05rem;">₡${Math.round(item.total).toLocaleString()}</td>
            </tr>
        `;
    });
    
    html += `
            <tr style="background: linear-gradient(135deg, #1e293b, #0f172a); font-weight: 800; border-top: 3px solid #f59e0b; color: white;">
                <td style="padding: 16px 20px; font-size: 1.1rem;">
                    <i class="fas fa-calculator" style="color: #f59e0b; margin-right: 10px;"></i>
                    <strong>TOTAL GENERAL</strong>
                </td>
                <td style="text-align: center; color: #94a3b8;">—</td>
                <td style="text-align: right; padding: 16px 20px; font-size: 1.05rem; color: #fcd34d;">
                    ₡${Math.round(totalPlanta).toLocaleString()}
                </td>
                <td style="text-align: right; padding: 16px 20px; font-size: 1.05rem; color: #fcd34d;">
                    ₡${Math.round(totalOficinas).toLocaleString()}
                </td>
                <td style="text-align: right; padding: 16px 20px; font-size: 1.05rem; color: #fcd34d;">
                    ₡${Math.round(totalTransporte).toLocaleString()}
                </td>
                <td style="text-align: right; padding: 16px 20px; font-size: 1.05rem; color: #fcd34d;">
                    ₡${Math.round(totalPlanilla).toLocaleString()}
                </td>
                <td style="text-align: right; padding: 16px 20px; font-size: 1.3rem; font-weight: 900; color: #fbbf24; background: rgba(251, 191, 36, 0.15); border-radius: 8px;">
                    ₡${Math.round(totalGeneral).toLocaleString()}
                </td>
            </tr>
        `;
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    logisticaContent.innerHTML = html;
    console.log('✅ Logística renderizada correctamente');
}

// ============================================
// CONFIGURAR PORCENTAJES
// ============================================
function configurarPorcentajesLogistica() {
    const overlay = document.getElementById('modalOverlay');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'configurarPorcentajesModal';
    modal.style.maxWidth = '500px';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    
    const porcentajesGuardados = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px 25px;">
            <h2 style="margin: 0;"><i class="fas fa-percent"></i> Configurar Porcentajes</h2>
            <p style="margin: 5px 0 0; opacity: 0.8;">Asigne el porcentaje de distribución para cada local</p>
        </div>
        <div class="modal-body" style="padding: 25px; background: #f8fafc;">
    `;
    
    AppState.locales.forEach(local => {
        const valor = porcentajesGuardados[local.nombre] || 0;
        const localId = local.nombre.replace(/\s+/g, '_');
        
        html += `
            <div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-store" style="color: #f59e0b;"></i>
                    <strong>${local.nombre}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <input type="range" min="0" max="100" value="${valor}" 
                           data-local="${local.nombre}"
                           oninput="this.nextElementSibling.value = this.value"
                           style="flex: 1;">
                    <input type="number" min="0" max="100" value="${valor}" 
                           data-local="${local.nombre}"
                           oninput="this.previousElementSibling.value = this.value"
                           style="width: 70px; padding: 8px; border-radius: 8px; border: 2px solid #e2e8f0; text-align: center;">
                    <span>%</span>
                </div>
            </div>
        `;
    });
    
    html += `
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" 
                        style="padding: 10px 24px; border: 2px solid #e2e8f0; background: white; border-radius: 10px; cursor: pointer;">
                    Cancelar
                </button>
                <button onclick="guardarPorcentajesLogistica()" 
                        style="padding: 10px 28px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
}

// ============================================
// GUARDAR PORCENTAJES
// ============================================
function guardarPorcentajesLogistica() {
    const modal = document.getElementById('configurarPorcentajesModal');
    if (!modal) return;
    
    const inputs = modal.querySelectorAll('input[type="number"][data-local]');
    const porcentajes = {};
    
    inputs.forEach(input => {
        const local = input.dataset.local;
        const valor = parseFloat(input.value) || 0;
        porcentajes[local] = Math.min(Math.max(valor, 0), 100);
    });
    
    localStorage.setItem('porcentajesLogistica', JSON.stringify(porcentajes));
    
    modal.remove();
    document.getElementById('modalOverlay').classList.remove('active');
    
    renderLogistica();
    mostrarToast('success', '✅ Porcentajes guardados');
}

// ============================================
// MOSTRAR TOAST
// ============================================
function mostrarToast(tipo, mensaje) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>${mensaje}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initLogistica = initLogistica;
window.renderLogistica = renderLogistica;
window.configurarPorcentajesLogistica = configurarPorcentajesLogistica;
window.guardarPorcentajesLogistica = guardarPorcentajesLogistica;
window.obtenerPeriodoActual = obtenerPeriodoActual;
window.obtenerCostosLogistica = obtenerCostosLogistica;
window.obtenerPorcentajesPorLocal = obtenerPorcentajesPorLocal;

console.log('✅ logistica.js cargado - Versión corregida');