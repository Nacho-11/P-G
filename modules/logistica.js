// modules/logistica.js - VERSIÓN CORREGIDA CON CÁLCULO POR MES

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
// CARGAR FACTURACIÓN DE BODEGAS (SOLO LECTURA)
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
// OBTENER COSTOS FIJOS DESDE COSTOSDATA (MENSUALES)
// ============================================
function obtenerCostosLogistica() {
    const costosData = window.costosData || {};
    const resultado = {
        planta: { mensual: 0, diario: 0, items: [] },
        oficinas: { mensual: 0, diario: 0, items: [] },
        transporte: { mensual: 0, diario: 0, items: [] }
    };
    
    console.log('📊 costosData recibido:', costosData);
    
    // Recorrer la estructura de costosData
    Object.keys(costosData).forEach(categoriaFirebase => {
        const subCategorias = costosData[categoriaFirebase];
        
        Object.keys(subCategorias).forEach(subCategoria => {
            const costosArray = subCategorias[subCategoria];
            if (!Array.isArray(costosArray)) return;
            
            console.log(`📂 Categoría: ${categoriaFirebase}/${subCategoria} - ${costosArray.length} costos`);
            
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
                }
            });
        });
    });
    
    console.log('📊 Costos mensuales calculados:', {
        planta: resultado.planta.mensual,
        oficinas: resultado.oficinas.mensual,
        transporte: resultado.transporte.mensual
    });
    
    return resultado;
}

// ============================================
// OBTENER PORCENTAJES (MANUALES O DESDE FACTURACIÓN)
// ============================================
function obtenerPorcentajesPorLocal(periodo) {
    // Porcentajes manuales guardados por gerencia
    const porcentajesManuales = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};
    
    // Si hay porcentajes manuales configurados, usarlos
    if (Object.keys(porcentajesManuales).length > 0) {
        console.log('📊 Usando porcentajes manuales:', porcentajesManuales);
        const porcentajes = {};
        Object.keys(porcentajesManuales).forEach(local => {
            porcentajes[local] = porcentajesManuales[local] / 100;
        });
        return { porcentajes, totalFacturacion: 0, facturacionPeriodo: [], esManual: true };
    }
    
    // Si no hay porcentajes manuales, calcular desde facturación
    console.log('📊 Calculando porcentajes desde facturación para período:', periodo);
    const porcentajes = {};
    let totalFacturacion = 0;
    
    // Normalizar período para filtrar facturas
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
    
    console.log(`📊 Facturas filtradas para período: ${facturacionPeriodo.length}`);
    
    facturacionPeriodo.forEach(f => {
        totalFacturacion += f.monto || 0;
    });
    
    console.log(`📊 Total facturación período: ₡${totalFacturacion.toLocaleString()}`);
    
    if (totalFacturacion === 0) {
        // Distribución equitativa
        const localesCount = AppState?.locales?.length || 1;
        const pctEquitativo = 1 / localesCount;
        AppState?.locales?.forEach(local => {
            porcentajes[local.nombre] = pctEquitativo;
        });
        console.log('⚠️ No hay facturas, usando distribución equitativa');
        return { porcentajes, totalFacturacion: 0, facturacionPeriodo: [], esManual: false };
    }
    
    // Calcular porcentaje por local
    AppState?.locales?.forEach(local => {
        const montoLocal = facturacionPeriodo
            .filter(f => f.local === local.nombre)
            .reduce((sum, f) => sum + (f.monto || 0), 0);
        
        porcentajes[local.nombre] = totalFacturacion > 0 ? montoLocal / totalFacturacion : 0;
        
        if (montoLocal > 0) {
            console.log(`   📍 ${local.nombre}: ₡${montoLocal.toLocaleString()} (${(porcentajes[local.nombre] * 100).toFixed(2)}%)`);
        }
    });
    
    return { porcentajes, totalFacturacion, facturacionPeriodo, esManual: false };
}

// ============================================
// CALCULAR PERÍODO ACTUAL (CON DÍAS CORRECTOS POR MES)
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
    
    switch(filtroTiempo) {
        case 'todos':
            periodo.tipo = 'mes';
            periodo.valor = hoy.toLocaleDateString('en-CA').substring(0, 7);
            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            periodo.nombre = `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
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
                console.log(`📅 Rango de fechas: ${periodo.nombre}, días: ${periodo.dias}`);
            } else {
                // Si no hay fechas, usar mes actual
                periodo.tipo = 'mes';
                periodo.valor = hoy.toLocaleDateString('en-CA').substring(0, 7);
                periodo.nombre = `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
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
            const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            periodo.nombre = `${mesesNombres[hoy.getMonth()]} ${hoy.getFullYear()}`;
            periodo.dias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            periodo.mesReferencia = hoy.getMonth() + 1;
            periodo.anioReferencia = hoy.getFullYear();
            console.log(`📅 Mes actual: ${periodo.nombre}, días: ${periodo.dias}`);
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
            const mesesDefault = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            periodo.nombre = `${mesesDefault[hoy.getMonth()]} ${hoy.getFullYear()}`;
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
    if (!window.esGerencia || !window.esGerencia()) {
        alert('Solo gerencia puede configurar porcentajes');
        return;
    }
    
    const overlay = document.getElementById('modalOverlay');
    
    const modalExistente = document.getElementById('configurarPorcentajesModal');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'configurarPorcentajesModal';
    modal.className = 'modal';
    modal.style.maxWidth = '600px';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    
    const localesPermitidos = getLocalesPermitidos();
    const locales = AppState.locales.filter(l => localesPermitidos.includes(l.nombre));
    const porcentajesGuardados = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 25px 30px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-percent" style="font-size: 1.8rem;"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem;">Configurar Porcentajes</h2>
                    <p style="margin: 4px 0 0; opacity: 0.8;">Distribución de costos logísticos por local</p>
                </div>
            </div>
            <button class="modal-close" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" 
                    style="background: rgba(255,255,255,0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 12px; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="modal-body" style="padding: 30px; background: #f8fafc; max-height: 70vh; overflow-y: auto;">
            <p style="margin-bottom: 20px; color: #4b5563; background: #fef3c7; padding: 12px; border-radius: 12px;">
                <i class="fas fa-info-circle" style="color: #f59e0b;"></i>
                Ingrese el porcentaje de distribución para cada local. <strong>La suma no necesita ser 100%</strong>, cada local recibirá el porcentaje que asigne.
            </p>
            
            <div id="porcentajes-container" style="margin-bottom: 25px;">
    `;
    
    locales.forEach(local => {
        const valorActual = porcentajesGuardados[local.nombre] || 0;
        const localId = local.nombre.replace(/\s+/g, '_');
        
        html += `
            <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                    <div style="background: #f1f5f9; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-store" style="color: #f59e0b;"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 8px;">${local.nombre}</div>
                        <input type="range" id="pct_slider_${localId}" 
                               min="0" max="100" step="1" value="${valorActual}" 
                               oninput="document.getElementById('pct_input_${localId}').value = this.value; actualizarTotalPorcentajes()"
                               style="width: 100%; height: 8px; border-radius: 4px; accent-color: #f59e0b;">
                    </div>
                    <div style="min-width: 120px; text-align: right;">
                        <input type="number" id="pct_input_${localId}" 
                               value="${valorActual}" min="0" max="100" step="1" 
                               oninput="document.getElementById('pct_slider_${localId}').value = this.value; actualizarTotalPorcentajes()"
                               style="width: 80px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 8px; text-align: right;">
                        <span style="margin-left: 5px;">%</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    let totalActual = Object.values(porcentajesGuardados).reduce((a, b) => a + b, 0);
    
    html += `
            </div>
            
            <div style="background: #f1f5f9; border-radius: 16px; padding: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600;">Total ingresado:</span>
                <span style="font-size: 1.8rem; font-weight: 700; color: #059669;" id="totalPorcentajes">${totalActual}%</span>
            </div>
            
            <div style="background: #f1f5f9; border-radius: 12px; padding: 15px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #4b5563;">
                    <i class="fas fa-lightbulb" style="color: #f59e0b; margin-right: 8px;"></i>
                    <strong>Nota:</strong> Si no configura porcentajes, se usarán los cálculos automáticos desde facturación.
                </p>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 2px solid #eef2f6; padding-top: 20px;">
                <button type="button" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" 
                        style="padding: 12px 28px; border: 2px solid #eef2f6; background: white; border-radius: 14px; font-weight: 600; cursor: pointer;">
                    Cancelar
                </button>
                <button type="button" onclick="guardarPorcentajesLogistica()" 
                        style="padding: 12px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 14px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-save"></i> Guardar Porcentajes
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
    
    window.actualizarTotalPorcentajes = function() {
        let total = 0;
        locales.forEach(local => {
            const localId = local.nombre.replace(/\s+/g, '_');
            const input = document.getElementById(`pct_input_${localId}`);
            if (input) total += parseFloat(input.value) || 0;
        });
        const totalSpan = document.getElementById('totalPorcentajes');
        if (totalSpan) totalSpan.textContent = total + '%';
    };
    
    window.guardarPorcentajesLogistica = function() {
        const nuevosPorcentajes = {};
        locales.forEach(local => {
            const localId = local.nombre.replace(/\s+/g, '_');
            const input = document.getElementById(`pct_input_${localId}`);
            if (input) {
                const valor = parseFloat(input.value) || 0;
                if (valor > 0) {
                    nuevosPorcentajes[local.nombre] = valor;
                }
            }
        });
        
        localStorage.setItem('porcentajesLogistica', JSON.stringify(nuevosPorcentajes));
        alert('✅ Porcentajes guardados correctamente');
        
        document.getElementById('configurarPorcentajesModal').remove();
        document.getElementById('modalOverlay').classList.remove('active');
        
        renderLogistica();
    };
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================
function renderLogistica() {
    console.log('📊 Renderizando Logística...');
    
    const logisticaContent = document.getElementById('logisticaContent');
    if (!logisticaContent) return;
    
    const filtroLocal = AppState?.filtros?.local || 'Todos';
    const periodo = obtenerPeriodoActual();
    
    console.log(`📅 Período: ${periodo.nombre}, Días: ${periodo.dias}`);
    
    // Obtener costos fijos mensuales
    const costosMensuales = obtenerCostosLogistica();
    
    // ✅ VERIFICAR QUE LOS COSTOS MENSUALES SON CORRECTOS
    console.log('📊 COSTOS MENSUALES:', {
        planta: costosMensuales.planta.mensual,
        oficinas: costosMensuales.oficinas.mensual,
        transporte: costosMensuales.transporte.mensual
    });
    
    // Calcular costos diarios (DIVIDIR entre los días del período)
    const costosDiarios = {
        planta: periodo.dias > 0 ? costosMensuales.planta.mensual / periodo.dias : 0,
        oficinas: periodo.dias > 0 ? costosMensuales.oficinas.mensual / periodo.dias : 0,
        transporte: periodo.dias > 0 ? costosMensuales.transporte.mensual / periodo.dias : 0,
        total: periodo.dias > 0 ? (costosMensuales.planta.mensual + costosMensuales.oficinas.mensual + costosMensuales.transporte.mensual) / periodo.dias : 0
    };
    
    console.log('📊 COSTOS DIARIOS CALCULADOS:', {
        dias: periodo.dias,
        planta: costosDiarios.planta,
        oficinas: costosDiarios.oficinas,
        transporte: costosDiarios.transporte
    });
    
    // Obtener porcentajes por local
    const { porcentajes, totalFacturacion, facturacionPeriodo, esManual } = obtenerPorcentajesPorLocal(periodo);
    
    // Obtener locales a mostrar
    const puedeVerLocal = (local) => {
        if (window.esGerencia && window.esGerencia()) return true;
        return AppState?.usuario?.local === local;
    };
    
    const localesAMostrar = filtroLocal === 'Todos'
        ? AppState?.locales?.filter(l => puedeVerLocal(l.nombre)) || []
        : AppState?.locales?.filter(l => l.nombre === filtroLocal && puedeVerLocal(l.nombre)) || [];
    
    // Calcular totales por local
    let totalPlanta = 0, totalOficinas = 0, totalTransporte = 0, totalGeneral = 0;
    const distribucionPorLocal = [];
    
    localesAMostrar.forEach(local => {
        const pct = porcentajes[local.nombre] || 0;
        const planta = costosDiarios.planta * pct;
        const oficinas = costosDiarios.oficinas * pct;
        const transporte = costosDiarios.transporte * pct;
        const total = planta + oficinas + transporte;
        
        totalPlanta += planta;
        totalOficinas += oficinas;
        totalTransporte += transporte;
        totalGeneral += total;
        
        distribucionPorLocal.push({
            local: local.nombre,
            porcentaje: pct * 100,
            planta,
            oficinas,
            transporte,
            total
        });
    });
    
    distribucionPorLocal.sort((a, b) => b.total - a.total);
    
    // Generar HTML
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-truck" style="color: #f59e0b;"></i> Logística - Distribución de Costos</h2>
            <div style="display: flex; gap: 10px;">
                ${esGerencia() ? `
                    <button class="btn btn-outline" onclick="window.configurarPorcentajesLogistica()">
                        <i class="fas fa-percent"></i> Configurar %
                    </button>
                ` : ''}
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
        
        <!-- Tarjetas de costos fijos -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
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
        </div>
        
        <!-- Tabla de distribución -->
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">
                    <i class="fas fa-chart-pie" style="color: #f59e0b;"></i>
                    Distribución por Local - ${periodo.nombre}
                </h3>
                <div style="background: #f1f5f9; padding: 8px 15px; border-radius: 20px;">
                    <span style="font-weight: 600;">Total Costos Logística Diarios:</span>
                    <span style="color: #059669; font-weight: 700; margin-left: 10px;">
                        ₡${Math.round(costosDiarios.total).toLocaleString()}
                    </span>
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
                            <th>Total Asignado (₡)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (distribucionPorLocal.length === 0) {
        html += `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-store" style="font-size: 3rem; color: #9ca3af; margin-bottom: 10px;"></i>
                    <p>No hay locales para mostrar</p>
                </td>
            </tr>
        `;
    } else {
        distribucionPorLocal.forEach(item => {
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td><strong>${item.local}</strong></td>
                    <td><span style="background: #e0f2fe; padding: 4px 12px; border-radius: 20px;">${item.porcentaje.toFixed(2)}%</span></td>
                    <td style="text-align: right;">₡${Math.round(item.planta).toLocaleString()}</td>
                    <td style="text-align: right;">₡${Math.round(item.oficinas).toLocaleString()}</td>
                    <td style="text-align: right;">₡${Math.round(item.transporte).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 600; color: #059669;">₡${Math.round(item.total).toLocaleString()}</td>
                </tr>
            `;
        });
        
        html += `
            <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #e2e8f0;">
                <td>TOTAL</td>
                <td>—</td>
                <td style="text-align: right;">₡${Math.round(totalPlanta).toLocaleString()}</td>
                <td style="text-align: right;">₡${Math.round(totalOficinas).toLocaleString()}</td>
                <td style="text-align: right;">₡${Math.round(totalTransporte).toLocaleString()}</td>
                <td style="text-align: right; color: #059669;">₡${Math.round(totalGeneral).toLocaleString()}</td>
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
// EXPORTAR FUNCIONES
// ============================================
window.initLogistica = initLogistica;
window.renderLogistica = renderLogistica;
window.configurarPorcentajesLogistica = configurarPorcentajesLogistica;

console.log('✅ logistica.js cargado - Con cálculo por días del mes');