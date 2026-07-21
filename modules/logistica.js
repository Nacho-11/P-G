// modules/logistica.js - VERSIÓN CORREGIDA CON FIREBASE
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
// INICIALIZAR MÓDULO
// ============================================
function initLogistica() {
    console.log('🚀 Inicializando módulo de Logística...');
    
    if (!AppState?.usuario) {
        console.log('⏳ Esperando autenticación...');
        return;
    }
    
    cargarFacturacionBodegas();
    
    if (document.getElementById('logistica').classList.contains('active')) {
        renderLogistica();
    }
}

// ============================================
// CARGAR FACTURACIÓN DE BODEGAS
// ============================================
function cargarFacturacionBodegas() {
    console.log('📥 Cargando facturación de bodegas...');
    
    firebase.database().ref('facturacionBodegas').on('value', (snapshot) => {
        const data = snapshot.val();
        facturacionBodegas = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                facturacionBodegas.push({ 
                    id: key, 
                    ...data[key] 
                });
            });
            facturacionBodegas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }
        
        console.log(`✅ ${facturacionBodegas.length} registros de facturación cargados`);
        
        if (document.getElementById('logistica').classList.contains('active')) {
            renderLogistica();
        }
    });
}

// ============================================
// OBTENER COSTOS FIJOS DESDE COSTOSDATA
// ============================================
function obtenerCostosLogistica() {
    const costosData = window.costosData || {};
    const resultado = {
        planta: { mensual: 0, diario: 0, items: [] },
        oficinas: { mensual: 0, diario: 0, items: [] },
        transporte: { mensual: 0, diario: 0, items: [] },
        planilla: { mensual: 0, diario: 0, items: [] }
    };
    
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
    
    return resultado;
}

// ============================================
// OBTENER PORCENTAJES (DESDE FIREBASE)
// ============================================
async function obtenerPorcentajesPorLocal(periodo) {
    // Intentar cargar desde Firebase
    let porcentajesFirebase = null;
    try {
        const snapshot = await firebase.database().ref('configuracion/logistica/porcentajes').once('value');
        porcentajesFirebase = snapshot.val();
        if (porcentajesFirebase && Object.keys(porcentajesFirebase).length > 0) {
            console.log('📊 Porcentajes cargados desde Firebase:', porcentajesFirebase);
            localStorage.setItem('porcentajesLogistica', JSON.stringify(porcentajesFirebase));
        }
    } catch (error) {
        console.warn('⚠️ No se pudieron cargar porcentajes desde Firebase:', error);
    }

    // Si no hay en Firebase, buscar en localStorage
    let porcentajesManuales = null;
    if (!porcentajesFirebase || Object.keys(porcentajesFirebase).length === 0) {
        porcentajesManuales = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};
        if (Object.keys(porcentajesManuales).length > 0) {
            console.log('📊 Usando porcentajes desde localStorage:', porcentajesManuales);
        }
    }

    const porcentajesFuente = porcentajesFirebase || porcentajesManuales || {};

    // Si hay porcentajes guardados, usarlos
    if (Object.keys(porcentajesFuente).length > 0) {
        const porcentajes = {};
        Object.keys(porcentajesFuente).forEach(local => {
            porcentajes[local] = porcentajesFuente[local] / 100;
        });
        return { 
            porcentajes, 
            totalFacturacion: 0, 
            facturacionPeriodo: [], 
            esManual: true 
        };
    }

    // Si no hay porcentajes, calcular desde facturación
    console.log('📊 Calculando porcentajes desde facturación para período:', periodo);
    const porcentajes = {};
    let totalFacturacion = 0;
    
    let anio = null, mes = null;
    if (periodo.tipo === 'mes' && periodo.valor) {
        const [year, month] = periodo.valor.split('-');
        anio = parseInt(year);
        mes = parseInt(month);
    }
    
    const facturacionPeriodo = facturacionBodegas.filter(f => {
        if (!f.fecha) return false;
        const fechaFactura = f.fecha.split('T')[0];
        const [year, month, day] = fechaFactura.split('-').map(Number);
        
        if (periodo.tipo === 'mes') {
            return year === anio && month === mes;
        } else if (periodo.tipo === 'anio') {
            return year === parseInt(periodo.valor);
        } else if (periodo.tipo === 'personalizado') {
            return fechaFactura === periodo.valor;
        } else if (periodo.tipo === 'todos') {
            return true;
        }
        return false;
    });
    
    facturacionPeriodo.forEach(f => {
        totalFacturacion += f.monto || 0;
    });
    
    if (totalFacturacion === 0) {
        const localesCount = AppState?.locales?.length || 1;
        const pctEquitativo = 1 / localesCount;
        AppState?.locales?.forEach(local => {
            porcentajes[local.nombre] = pctEquitativo;
        });
        console.log('⚠️ No hay facturas, usando distribución equitativa');
        return { porcentajes, totalFacturacion: 0, facturacionPeriodo: [], esManual: false };
    }
    
    AppState?.locales?.forEach(local => {
        const montoLocal = facturacionPeriodo
            .filter(f => f.local === local.nombre)
            .reduce((sum, f) => sum + (f.monto || 0), 0);
        
        porcentajes[local.nombre] = totalFacturacion > 0 ? montoLocal / totalFacturacion : 0;
    });
    
    return { porcentajes, totalFacturacion, facturacionPeriodo, esManual: false };
}

// ============================================
// CALCULAR PERÍODO ACTUAL
// ============================================
function obtenerPeriodoActual() {
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState?.filtros?.fechaPersonalizada;
    const fechaInicio = AppState?.filtros?.fechaInicio;
    const fechaFin = AppState?.filtros?.fechaFin;
    const hoy = new Date();
    
    let periodo = { tipo: filtroTiempo, valor: '', nombre: '', dias: 30, 
                    mesReferencia: null, anioReferencia: null,
                    fechaInicio: null, fechaFin: null };
    
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
            periodo.valor = hoy.toLocaleDateString('en-CA').substring(0, 7);
            periodo.nombre = `${mesesNombres[hoy.getMonth()]} ${hoy.getFullYear()}`;
            periodo.dias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            periodo.mesReferencia = hoy.getMonth() + 1;
            periodo.anioReferencia = hoy.getFullYear();
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
                periodo.nombre = fechaObj.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
                periodo.dias = 1;
                periodo.mesReferencia = fechaObj.getMonth() + 1;
                periodo.anioReferencia = fechaObj.getFullYear();
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
// CONFIGURAR PORCENTAJES MANUALES
// ============================================
function configurarPorcentajesLogistica() {
    const modalId = 'configurarPorcentajesModal';

    document.getElementById(modalId)?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = modalId;

    modal.style.maxWidth = '700px';
    modal.style.width = '95%';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';

    const porcentajesGuardados = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};

    let html = `
        <!-- HEADER -->
        <div class="modal-header" style="
            background: linear-gradient(135deg, #f59e0b, #ea580c);
            color: white;
            border-bottom: none;
        ">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="
                    width:42px;
                    height:42px;
                    border-radius:12px;
                    background:rgba(255,255,255,0.2);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                ">
                    <i class="fas fa-percent"></i>
                </div>
                <div>
                    <div style="font-size:1.3rem; font-weight:600;">
                        Configurar Porcentajes
                    </div>
                    <div style="font-size:0.9rem; opacity:0.85;">
                        Distribución de costos logísticos por local
                    </div>
                </div>
            </div>

            <button onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');"
                style="
                    background: rgba(255,255,255,0.2);
                    border:none;
                    width:36px;
                    height:36px;
                    border-radius:10px;
                    color:white;
                    cursor:pointer;
                ">
                ✕
            </button>
        </div>

        <!-- BODY SCROLL -->
        <div class="modal-body logistica-modal-body">

            <!-- INFO -->
            <div style="
                background:#fef3c7;
                border-radius:10px;
                padding:12px 16px;
                margin-bottom:20px;
                font-size:0.9rem;
                color:#92400e;
            ">
                <i class="fas fa-info-circle"></i>
                Asigne el porcentaje de distribución para cada local.
            </div>
    `;

    AppState.locales.forEach(local => {
        const valor = porcentajesGuardados[local.nombre] || 0;

        html += `
            <div style="
                background:#0f172a;
                border-radius:14px;
                padding:16px;
                margin-bottom:12px;
                border:1px solid rgba(255,255,255,0.05);
            ">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <i class="fas fa-store" style="color:#f59e0b;"></i>
                    <strong>${local.nombre}</strong>
                </div>

                <div style="display:flex; align-items:center; gap:12px;">
                    <input type="range"
                        min="0"
                        max="100"
                        value="${valor}"
                        data-local="${local.nombre}"
                        style="flex:1;"
                        oninput="this.nextElementSibling.value = this.value">

                    <input type="number"
                        min="0"
                        value="${valor}"
                        data-local="${local.nombre}"
                        style="
                            width:70px;
                            padding:6px;
                            border-radius:8px;
                            border:1px solid #334155;
                            background:#020617;
                            color:white;
                        "
                        oninput="this.previousElementSibling.value = this.value">

                    <span>%</span>
                </div>
            </div>
        `;
    });

    html += `
        </div>

        <!-- FOOTER FIJO -->
        <div class="logistica-footer-bar">
            <button class="btn btn-outline"
                onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');">
                Cancelar
            </button>

            <button class="btn btn-primary logistica-save-btn"
                onclick="guardarPorcentajesLogistica()">
                <i class="fas fa-save"></i> Guardar
            </button>
        </div>
    `;

    modal.innerHTML = html;

    document.body.appendChild(modal);
    document.getElementById('modalOverlay').classList.add('active');
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
    
    console.log(`📅 Período: ${periodo.nombre}, Días: ${periodo.dias}`);
    
    const costosMensuales = obtenerCostosLogistica();
    
    const costosDiarios = {
        planta: periodo.dias > 0 ? costosMensuales.planta.mensual / periodo.dias : 0,
        oficinas: periodo.dias > 0 ? costosMensuales.oficinas.mensual / periodo.dias : 0,
        transporte: periodo.dias > 0 ? costosMensuales.transporte.mensual / periodo.dias : 0,
        planilla: periodo.dias > 0 ? costosMensuales.planilla.mensual / periodo.dias : 0,
        total: periodo.dias > 0 ? (
            costosMensuales.planta.mensual + 
            costosMensuales.oficinas.mensual + 
            costosMensuales.transporte.mensual +
            costosMensuales.planilla.mensual
        ) / periodo.dias : 0
    };
    
    const { porcentajes, totalFacturacion, facturacionPeriodo, esManual } = await obtenerPorcentajesPorLocal(periodo);
    
    // ✅ OBTENER LOCALES QUE TIENEN COSTOS REGISTRADOS
    const localesConCostos = new Set();
    Object.keys(costosData).forEach(categoriaFirebase => {
        const subCategorias = costosData[categoriaFirebase];
        Object.keys(subCategorias).forEach(subCategoria => {
            const costosArray = subCategorias[subCategoria];
            if (!Array.isArray(costosArray)) return;
            costosArray.forEach(costo => {
                if (costo.local) {
                    localesConCostos.add(costo.local);
                }
            });
        });
    });
    
    console.log('📍 Locales con costos registrados:', Array.from(localesConCostos));
    
    const puedeVerLocal = (local) => {
        if (window.esGerencia && window.esGerencia()) return true;
        return AppState?.usuario?.local === local;
    };
    
    // ✅ Filtrar locales: solo los que tienen costos Y están permitidos
    const localesAMostrar = filtroLocal === 'Todos'
        ? AppState?.locales?.filter(l => 
            localesConCostos.has(l.nombre) && puedeVerLocal(l.nombre)
          ) || []
        : AppState?.locales?.filter(l => 
            l.nombre === filtroLocal && 
            localesConCostos.has(l.nombre) && 
            puedeVerLocal(l.nombre)
          ) || [];
    
    // Si no hay locales con costos y está en "Todos"
    if (localesAMostrar.length === 0 && filtroLocal === 'Todos') {
        logisticaContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <h2><i class="fas fa-truck" style="color: #f59e0b;"></i> Logística - Distribución de Costos</h2>
                <div style="display: flex; gap: 10px;">
                    ${window.esGerencia ? `<button class="btn btn-outline" onclick="window.configurarPorcentajesLogistica()">
                        <i class="fas fa-percent"></i> Configurar %
                    </button>` : ''}
                </div>
            </div>
            <div class="card" style="padding: 60px 30px; text-align: center;">
                <i class="fas fa-box-open" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3 style="color: #334155; margin-bottom: 10px;">No hay costos registrados</h3>
                <p style="color: #64748b;">Registre costos fijos para comenzar a ver la distribución logística.</p>
                <button class="btn btn-primary" onclick="cambiarModulo('costos')" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> Ir a Costos Fijos
                </button>
            </div>
        `;
        return;
    }
    
    // Si se seleccionó un local específico y no tiene costos
    if (filtroLocal !== 'Todos' && localesAMostrar.length === 0) {
        logisticaContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <h2><i class="fas fa-truck" style="color: #f59e0b;"></i> Logística - Distribución de Costos</h2>
                <div style="display: flex; gap: 10px;">
                    ${window.esGerencia ? `<button class="btn btn-outline" onclick="window.configurarPorcentajesLogistica()">
                        <i class="fas fa-percent"></i> Configurar %
                    </button>` : ''}
                </div>
            </div>
            <div class="card" style="padding: 60px 30px; text-align: center;">
                <i class="fas fa-store" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3 style="color: #334155; margin-bottom: 10px;">Sin costos para ${filtroLocal}</h3>
                <p style="color: #64748b;">Este local no tiene costos fijos registrados.</p>
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
                ${window.esGerencia ? `<button class="btn btn-outline" onclick="window.configurarPorcentajesLogistica()">
                    <i class="fas fa-percent"></i> Configurar %
                </button>` : ''}
            </div>
        </div>
        
        <!-- Información del período -->
        <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: #f1f5f9; width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-calendar-alt" style="color: #3b82f6; font-size: 1.5rem;"></i>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 0.8rem;">PERÍODO ACTUAL</div>
                    <div style="font-size: 1.2rem; font-weight: 600;">${periodo.nombre}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${periodo.dias} días en el período</div>
                </div>
            </div>
            <div style="display: flex; gap: 30px;">
                <div>
                    <div style="color: #64748b; font-size: 0.8rem;">MÉTODO DE DISTRIBUCIÓN</div>
                    <div style="font-size: 1rem; font-weight: 600; color: ${esManual ? '#f59e0b' : '#3b82f6'};">
                        ${esManual ? '📊 Porcentajes manuales' : (totalFacturacion > 0 ? '📈 Por facturación' : '⚖️ Distribución equitativa')}
                    </div>
                </div>
                ${!esManual && totalFacturacion > 0 ? `
                <div>
                    <div style="color: #64748b; font-size: 0.8rem;">TOTAL FACTURACIÓN</div>
                    <div style="font-size: 1.2rem; font-weight: 600; color: #059669;">₡${totalFacturacion.toLocaleString()}</div>
                </div>
                ` : ''}
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
                    <span>Diario (${periodo.dias} días)</span>
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
                    <span>Diario (${periodo.dias} días)</span>
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
                    <span>Diario (${periodo.dias} días)</span>
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
                    <span>Diario (${periodo.dias} días)</span>
                    <span style="font-size: 1rem; font-weight: 600;">₡${Math.round(costosDiarios.planilla).toLocaleString()}</span>
                </div>
            </div>
        </div>
        
        <!-- Tabla de distribución -->
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">
                    <i class="fas fa-chart-pie" style="color: #f59e0b;"></i>
                    Distribución por Local - ${periodo.nombre}
                </h3>
                <div class="logistica-total-box">
                    <span class="logistica-total-label">Total Costos Logística Diarios:</span>
                    <span class="logistica-total-value">₡${Math.round(costosDiarios.total).toLocaleString()}</span>
                </div>
            </div>
            
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
    
    if (distribucionPorLocal.length === 0) {
        html += `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-store" style="font-size: 3rem; color: #9ca3af; margin-bottom: 10px;"></i>
                    <p>No hay locales para mostrar</p>
                </td>
            </tr>
        `;
    } else {
        distribucionPorLocal.forEach(item => {
            html += `
                <tr class="logistica-row">
                    <td><strong>${item.local}</strong></td>
                    <td>
                        <span class="logistica-percent-badge">${item.porcentaje.toFixed(2)}%</span>
                    </td>
                    <td class="logistica-number-cell">₡${Math.round(item.planta).toLocaleString()}</td>
                    <td class="logistica-number-cell">₡${Math.round(item.oficinas).toLocaleString()}</td>
                    <td class="logistica-number-cell">₡${Math.round(item.transporte).toLocaleString()}</td>
                    <td class="logistica-number-cell">₡${Math.round(item.planilla).toLocaleString()}</td>
                    <td class="logistica-number-cell logistica-total-assigned">₡${Math.round(item.total).toLocaleString()}</td>
                </tr>
            `;
        });

        html += `
            <tr class="logistica-total-row" style="background: #f1f5f9; font-weight: 700; border-top: 2px solid #e2e8f0;">
                <td><strong>TOTAL</strong></td>
                <td>—</td>
                <td class="logistica-number-cell"><strong>₡${Math.round(totalPlanta).toLocaleString()}</strong></td>
                <td class="logistica-number-cell"><strong>₡${Math.round(totalOficinas).toLocaleString()}</strong></td>
                <td class="logistica-number-cell"><strong>₡${Math.round(totalTransporte).toLocaleString()}</strong></td>
                <td class="logistica-number-cell"><strong>₡${Math.round(totalPlanilla).toLocaleString()}</strong></td>
                <td class="logistica-number-cell logistica-total-assigned"><strong>₡${Math.round(totalGeneral).toLocaleString()}</strong></td>
            </tr>
        `;
    }
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    logisticaContent.innerHTML = html;
}

// ============================================
// GUARDAR PORCENTAJES EN FIREBASE
// ============================================
async function guardarPorcentajesLogistica() {
    try {
        const modal = document.getElementById('configurarPorcentajesModal');
        if (!modal) return;

        const inputs = modal.querySelectorAll('input[type="number"][data-local]');
        const porcentajes = {};

        inputs.forEach(input => {
            const local = input.dataset.local;
            let valor = parseFloat(input.value) || 0;
            if (valor < 0) valor = 0;
            porcentajes[local] = valor;
        });

        console.log('📊 Porcentajes asignados:', porcentajes);

        const usuario = firebase.auth().currentUser;
        if (!usuario) {
            alert('❌ Debes iniciar sesión para guardar');
            return;
        }

        // Guardar en Firebase
        await firebase.database().ref(`configuracion/logistica/porcentajes`).set(porcentajes);
        localStorage.setItem('porcentajesLogistica', JSON.stringify(porcentajes));

        modal.remove();
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.remove('active');

        await renderLogistica();
        mostrarToast('success', '✅ Porcentajes guardados en la nube');

    } catch (error) {
        console.error('❌ Error al guardar porcentajes:', error);
        mostrarToast('error', '❌ Error al guardar: ' + error.message);
    }
}

// ============================================
// OBTENER GASTO DE PLANTA PRODUCCIÓN PARA RESUMEN
// ============================================
async function getPlantaProduccionParaResumen(localNombre) {
    const periodo = obtenerPeriodoActual();
    const costosMensuales = obtenerCostosLogistica();
    const { porcentajes } = await obtenerPorcentajesPorLocal(periodo);
    
    const pct = porcentajes[localNombre] || 0;
    const dias = periodo.dias || 30;
    
    const plantaDiaria = dias > 0 ? costosMensuales.planta.mensual / dias : 0;
    const plantaLocal = plantaDiaria * pct;
    
    return plantaLocal;
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initLogistica = initLogistica;
window.renderLogistica = renderLogistica;
window.configurarPorcentajesLogistica = configurarPorcentajesLogistica;
window.guardarPorcentajesLogistica = guardarPorcentajesLogistica;
window.getPlantaProduccionParaResumen = getPlantaProduccionParaResumen;
window.obtenerPorcentajesPorLocal = obtenerPorcentajesPorLocal;

console.log('✅ logistica.js cargado - Con Firebase');