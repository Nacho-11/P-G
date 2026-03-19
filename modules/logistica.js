// modules/logistica.js
// Módulo de Logística - Integrado con Costos Fijos

console.log('🚚 Cargando módulo de Logística...');

// ============================================
// CONFIGURACIÓN
// ============================================
const CATEGORIAS_LOGISTICA = {
    planta: {
        nombre: 'Planta Producción',
        categoria: 'planta',
        color: '#3b82f6',
        icono: 'fa-industry'
    },
    oficinas: {
        nombre: 'Oficinas',
        categoria: 'oficinas',
        color: '#10b981',
        icono: 'fa-building'
    },
    transporte: {
        nombre: 'Bodegas y Transporte',
        categoria: 'transporte',
        color: '#f59e0b',
        icono: 'fa-warehouse'
    }
};

// ============================================
// VARIABLES GLOBALES DEL MÓDULO
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
// CALCULAR PORCENTAJES AUTOMÁTICAMENTE
// ============================================
async function calcularPorcentajesFacturacionExistente() {
    console.log('📊 Calculando porcentajes para registros existentes...');
    
    const fechas = {};
    facturacionBodegas.forEach(f => {
        if (!f.fecha) return;
        if (!fechas[f.fecha]) {
            fechas[f.fecha] = [];
        }
        fechas[f.fecha].push(f);
    });
    
    const updates = {};
    let totalActualizados = 0;
    
    Object.keys(fechas).forEach(fecha => {
        const registros = fechas[fecha];
        const total = registros.reduce((sum, f) => sum + (f.monto || 0), 0);
        
        registros.forEach(f => {
            const nuevoPorcentaje = total > 0 ? (f.monto || 0) / total : 0;
            updates[`facturacionBodegas/${f.id}/porcentaje`] = nuevoPorcentaje;
            totalActualizados++;
        });
    });
    
    if (totalActualizados > 0) {
        await firebase.database().ref().update(updates);
        console.log(`✅ ${totalActualizados} porcentajes actualizados`);
        
        facturacionBodegas = facturacionBodegas.map(f => ({
            ...f,
            porcentaje: updates[`facturacionBodegas/${f.id}/porcentaje`] || f.porcentaje
        }));
    }
}

// ============================================
// CARGAR FACTURACIÓN DE BODEGAS
// ============================================
function cargarFacturacionBodegas() {
    console.log('📥 Cargando facturación de bodegas...');
    
    firebase.database().ref('facturacionBodegas').on('value', async (snapshot) => {
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
            
            const hayPorcentajesCero = facturacionBodegas.some(f => f.porcentaje === 0 || f.porcentaje === undefined);
            
            if (hayPorcentajesCero) {
                console.log('⚠️ Detectados porcentajes sin calcular. Calculando...');
                await calcularPorcentajesFacturacionExistente();
            }
        }
        
        console.log(`✅ ${facturacionBodegas.length} registros de facturación cargados`);
        
        if (document.getElementById('logistica').classList.contains('active')) {
            renderLogistica();
        }
    });
}

// ============================================
// FUNCIONES DE RENDERIZADO (DEBEN IR ANTES DE SER USADAS)
// ============================================

function renderTarjetaCosto(titulo, data, config) {
    return `
        <div style="background: linear-gradient(135deg, ${config.color}, ${config.color}dd); border-radius: 16px; padding: 20px; color: white; box-shadow: 0 10px 15px -3px ${config.color}66;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${config.icono}" style="font-size: 1.5rem;"></i>
                </div>
                <div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${titulo}</div>
                    <div style="font-size: 0.7rem; opacity: 0.7;">${data.items.length} costos</div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Mensual</span>
                <span style="font-size: 1.3rem; font-weight: 700;">₡${data.mensual.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Diario</span>
                <span style="font-size: 1.1rem; font-weight: 600;">₡${data.diario.toLocaleString()}</span>
            </div>
        </div>
    `;
}

function renderTablaFacturacion() {
    if (facturacionBodegas.length === 0) {
        return `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-file-invoice" style="font-size: 3rem; color: #9ca3af; margin-bottom: 10px;"></i>
                <p>No hay registros de facturación</p>
                <button class="btn btn-primary btn-sm" onclick="window.agregarFacturacionManual()">
                    <i class="fas fa-plus"></i> Agregar primer registro
                </button>
            </div>
        `;
    }
    
    const ultimos = facturacionBodegas.slice(0, 10);
    
    return `
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Local</th>
                            <th>Monto Compras</th>
                            <th>%</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ultimos.map(f => {
                            const fecha = new Date(f.fecha + 'T12:00:00').toLocaleDateString('es-CR');
                            return `
                                <tr>
                                    <td>${fecha}</td>
                                    <td><strong>${f.local}</strong></td>
                                    <td>₡${(f.monto || 0).toLocaleString()}</td>
                                    <td>${((f.porcentaje || 0) * 100).toFixed(2)}%</td>
                                    <td>
                                        <button class="btn btn-sm btn-danger" onclick="window.eliminarFacturacion('${f.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function calcularPeriodo(filtroTiempo) {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    
    let inicio, fin, dias, nombre;
    
    switch(filtroTiempo) {
        case 'ayer':
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            inicio = ayer.toLocaleDateString('es-CR');
            fin = ayer.toLocaleDateString('es-CR');
            dias = 1;
            nombre = `Ayer (${inicio})`;
            break;
            
        case 'mes':
            inicio = new Date(año, mes - 1, 1).toLocaleDateString('es-CR');
            fin = new Date(año, mes, 0).toLocaleDateString('es-CR');
            dias = new Date(año, mes, 0).getDate();
            nombre = `${getNombreMes(mes)} ${año}`;
            break;
            
        case 'anio':
            inicio = new Date(año, 0, 1).toLocaleDateString('es-CR');
            fin = new Date(año, 11, 31).toLocaleDateString('es-CR');
            dias = 365;
            nombre = `Año ${año}`;
            break;
            
        case 'personalizado':
            const fechaPer = AppState.filtros?.fechaPersonalizada 
                ? new Date(AppState.filtros.fechaPersonalizada + 'T12:00:00')
                : hoy;
            inicio = fechaPer.toLocaleDateString('es-CR');
            fin = fechaPer.toLocaleDateString('es-CR');
            dias = 1;
            nombre = `Personalizado (${inicio})`;
            break;
            
        default:
            inicio = new Date(año, 0, 1).toLocaleDateString('es-CR');
            fin = new Date().toLocaleDateString('es-CR');
            dias = Math.floor((new Date() - new Date(año, 0, 1)) / (1000 * 60 * 60 * 24)) + 1;
            nombre = 'Acumulado Año';
            break;
    }
    
    return { inicio, fin, dias, nombre };
}

function getNombreMes(mes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes - 1];
}

function extraerCostosLogistica(costosData, periodo) {
    const resultado = {
        planta: { mensual: 0, diario: 0, items: [] },
        oficinas: { mensual: 0, diario: 0, items: [] },
        transporte: { mensual: 0, diario: 0, items: [] }
    };
    
    Object.keys(costosData).forEach(local => {
        if (costosData[local].planta) {
            costosData[local].planta.forEach(costo => {
                resultado.planta.mensual += costo.monto || 0;
                resultado.planta.items.push({ ...costo, local });
            });
        }
        
        if (costosData[local].oficinas) {
            costosData[local].oficinas.forEach(costo => {
                resultado.oficinas.mensual += costo.monto || 0;
                resultado.oficinas.items.push({ ...costo, local });
            });
        }
        
        if (costosData[local].transporte) {
            costosData[local].transporte.forEach(costo => {
                resultado.transporte.mensual += costo.monto || 0;
                resultado.transporte.items.push({ ...costo, local });
            });
        }
    });
    
    resultado.planta.diario = periodo.dias > 0 ? resultado.planta.mensual / periodo.dias : 0;
    resultado.oficinas.diario = periodo.dias > 0 ? resultado.oficinas.mensual / periodo.dias : 0;
    resultado.transporte.diario = periodo.dias > 0 ? resultado.transporte.mensual / periodo.dias : 0;
    
    return resultado;
}

// ============================================
// CALCULAR PORCENTAJES (usa configuración manual si existe)
// ============================================
function calcularPorcentajesFacturacion(periodo) {
    if (window.porcentajesLogistica) {
        console.log('📊 Usando porcentajes manuales:', window.porcentajesLogistica);
        return window.porcentajesLogistica;
    }
    
    console.log('📊 Calculando porcentajes desde facturación');
    const porcentajes = {};
    let totalFacturacion = 0;
    
    const facturacionPeriodo = facturacionBodegas.filter(f => {
        if (!f.fecha) return false;
        return true;
    });
    
    facturacionPeriodo.forEach(f => {
        totalFacturacion += f.monto || 0;
    });
    
    AppState.locales.forEach(local => {
        const montoLocal = facturacionPeriodo
            .filter(f => f.local === local.nombre)
            .reduce((sum, f) => sum + (f.monto || 0), 0);
        
        porcentajes[local.nombre] = totalFacturacion > 0 ? montoLocal / totalFacturacion : 0;
    });
    
    return porcentajes;
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================
function renderLogistica() {
    console.log('📊 Renderizando Logística...');
    
    const logisticaContent = document.getElementById('logisticaContent');
    if (!logisticaContent) {
        console.error('❌ No se encontró el elemento logisticaContent');
        return;
    }
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    const costosData = window.costosData || {};
    
    const periodo = calcularPeriodo(filtroTiempo);
    const costosLogistica = extraerCostosLogistica(costosData, periodo);
    const porcentajes = calcularPorcentajesFacturacion(periodo);
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-truck" style="color: #f59e0b;"></i> Logística - Distribución de Costos</h2>
            <div style="display: flex; gap: 10px;">
                ${esGerencia() ? `
                    <button class="btn btn-outline" onclick="window.configurarPorcentajes()">
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
                </div>
            </div>
            
            <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                <div>
                    <div style="color: #64748b; font-size: 0.8rem;">DÍAS</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${periodo.dias}</div>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 0.8rem;">FECHA INICIO</div>
                    <div style="font-size: 1rem;">${periodo.inicio}</div>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 0.8rem;">FECHA FIN</div>
                    <div style="font-size: 1rem;">${periodo.fin}</div>
                </div>
            </div>
        </div>
        
        <!-- Tarjetas de resumen de costos -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            ${renderTarjetaCosto('Planta Producción', costosLogistica.planta, CATEGORIAS_LOGISTICA.planta)}
            ${renderTarjetaCosto('Oficinas', costosLogistica.oficinas, CATEGORIAS_LOGISTICA.oficinas)}
            ${renderTarjetaCosto('Bodegas y Transporte', costosLogistica.transporte, CATEGORIAS_LOGISTICA.transporte)}
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
                        ₡${(costosLogistica.planta.diario + costosLogistica.oficinas.diario + costosLogistica.transporte.diario).toLocaleString()}
                    </span>
                </div>
            </div>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Local</th>
                            <th>% Facturación</th>
                            <th>Planta</th>
                            <th>Oficinas</th>
                            <th>Transporte</th>
                            <th>Total Asignado</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    const localesAMostrar = filtroLocal === 'Todos'
        ? AppState.locales.filter(l => puedeVerLocal(l.nombre))
        : AppState.locales.filter(l => l.nombre === filtroLocal && puedeVerLocal(l.nombre));
    
    if (localesAMostrar.length === 0) {
        html += `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-store" style="font-size: 3rem; color: #9ca3af; margin-bottom: 10px;"></i>
                    <p>No hay locales para mostrar</p>
                </td>
            </tr>
        `;
    } else {
        let totalPlanta = 0, totalOficinas = 0, totalTransporte = 0, totalGeneral = 0;
        
        localesAMostrar.forEach(local => {
            const pct = porcentajes[local.nombre] || 0;
            const planta = costosLogistica.planta.diario * pct;
            const oficinas = costosLogistica.oficinas.diario * pct;
            const transporte = costosLogistica.transporte.diario * pct;
            const total = planta + oficinas + transporte;
            
            totalPlanta += planta;
            totalOficinas += oficinas;
            totalTransporte += transporte;
            totalGeneral += total;
            
            html += `
                <tr>
                    <td><strong>${local.nombre}</strong></td>
                    <td>${(pct * 100).toFixed(2)}%</td>
                    <td>₡${planta.toLocaleString()}</td>
                    <td>₡${oficinas.toLocaleString()}</td>
                    <td>₡${transporte.toLocaleString()}</td>
                    <td><strong style="color: #059669;">₡${total.toLocaleString()}</strong></td>
                </tr>
            `;
        });
        
        html += `
            <tr style="background: #f8fafc; font-weight: 600;">
                <td>TOTAL</td>
                <td>100%</td>
                <td>₡${totalPlanta.toLocaleString()}</td>
                <td>₡${totalOficinas.toLocaleString()}</td>
                <td>₡${totalTransporte.toLocaleString()}</td>
                <td>₡${totalGeneral.toLocaleString()}</td>
            </tr>
        `;
    }
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Detalle de facturación -->
        <div style="margin-top: 30px;">
            <h3 style="margin-bottom: 15px;">
                <i class="fas fa-file-invoice"></i> 
                Facturación de Bodegas - Últimos registros
            </h3>
            ${renderTablaFacturacion()}
        </div>
    `;
    
    logisticaContent.innerHTML = html;
}

// ============================================
// FUNCIÓN PARA AGREGAR FACTURACIÓN MANUAL
// ============================================
function agregarFacturacionManual(editId = null) {
    console.log('📝 Abriendo modal de facturación');
    
    const modal = document.getElementById('facturacionModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) {
        console.error('❌ No se encontró el modal');
        return;
    }
    
    document.getElementById('facturacionFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('facturacionMonto').value = '';
    document.getElementById('facturacionPorcentaje').textContent = '0.00%';
    
    const selectLocal = document.getElementById('facturacionLocal');
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
    
    if (editId) {
        const facturacion = facturacionBodegas.find(f => f.id === editId);
        if (facturacion) {
            document.getElementById('facturacionFecha').value = facturacion.fecha || '';
            document.getElementById('facturacionLocal').value = facturacion.local || '';
            document.getElementById('facturacionMonto').value = facturacion.monto || '';
            document.getElementById('facturacionPorcentaje').textContent = ((facturacion.porcentaje || 0) * 100).toFixed(2) + '%';
            
            modal.dataset.editId = editId;
            document.getElementById('facturacionModalTitle').textContent = 'Editar Facturación';
            document.getElementById('facturacionSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Actualizar';
        }
    } else {
        delete modal.dataset.editId;
        document.getElementById('facturacionModalTitle').textContent = 'Agregar Facturación';
        document.getElementById('facturacionSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Guardar';
    }
    
    document.getElementById('facturacionMonto').removeEventListener('input', calcularPorcentajeFacturacion);
    document.getElementById('facturacionMonto').addEventListener('input', calcularPorcentajeFacturacion);
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// FUNCIÓN PARA CALCULAR PORCENTAJE EN MODAL
// ============================================
function calcularPorcentajeFacturacion() {
    const monto = parseFloat(document.getElementById('facturacionMonto').value) || 0;
    const fecha = document.getElementById('facturacionFecha').value;
    const editId = document.getElementById('facturacionModal')?.dataset?.editId;
    
    if (!fecha || monto === 0) {
        document.getElementById('facturacionPorcentaje').textContent = '0.00%';
        return;
    }
    
    const totalDia = facturacionBodegas
        .filter(f => f.fecha === fecha && f.id !== editId)
        .reduce((sum, f) => sum + (f.monto || 0), 0);
    
    const nuevoTotal = totalDia + monto;
    const porcentaje = nuevoTotal > 0 ? (monto / nuevoTotal) * 100 : 100;
    
    document.getElementById('facturacionPorcentaje').textContent = porcentaje.toFixed(2) + '%';
}

// ============================================
// FUNCIÓN PARA GUARDAR FACTURACIÓN
// ============================================
async function guardarFacturacion() {
    const modal = document.getElementById('facturacionModal');
    const editId = modal?.dataset?.editId;
    
    const fecha = document.getElementById('facturacionFecha').value;
    const local = document.getElementById('facturacionLocal').value;
    const monto = parseFloat(document.getElementById('facturacionMonto').value) || 0;
    
    if (!fecha || !local || monto === 0) {
        alert('Complete todos los campos');
        return;
    }
    
    const totalDia = facturacionBodegas
        .filter(f => f.fecha === fecha && f.id !== editId)
        .reduce((sum, f) => sum + (f.monto || 0), 0);
    
    const nuevoTotal = totalDia + monto;
    const porcentaje = nuevoTotal > 0 ? monto / nuevoTotal : 1;
    
    const data = {
        fecha,
        local,
        monto,
        porcentaje,
        ultimaModificacion: new Date().toISOString(),
        modificadoPor: AppState.usuario?.email || 'sistema'
    };
    
    try {
        const btn = document.querySelector('#facturacionModal .btn-primary');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }
        
        if (editId) {
            await firebase.database().ref(`facturacionBodegas/${editId}`).update(data);
            alert('✅ Facturación actualizada');
        } else {
            data.fechaCreacion = new Date().toISOString();
            data.creadoPor = AppState.usuario?.email || 'sistema';
            await firebase.database().ref('facturacionBodegas').push(data);
            alert('✅ Facturación agregada');
        }
        
        cerrarModal('facturacionModal');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    } finally {
        const btn = document.querySelector('#facturacionModal .btn-primary');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    }
}

// ============================================
// FUNCIÓN PARA IMPORTAR EXCEL
// ============================================
function importarFacturacionBodegas() {
    console.log('📤 Abriendo importador de Excel');
    
    const modal = document.getElementById('importarFacturacionModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) return;
    
    const statusDiv = document.getElementById('importStatus');
    if (statusDiv) {
        statusDiv.style.display = 'none';
        statusDiv.innerHTML = '';
    }
    
    const fileInput = document.getElementById('excelFileInput');
    fileInput.value = '';
    
    modal.classList.add('active');
    overlay.classList.add('active');
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            procesarExcelFacturacion(file);
        }
    };
}

async function procesarExcelFacturacion(file) {
    const statusDiv = document.getElementById('importStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<div style="padding: 15px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Procesando archivo...</div>';
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            let exitosos = 0;
            let errores = [];
            
            let startRow = -1;
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row) continue;
                
                const rowStr = row.join(' ').toUpperCase();
                if (rowStr.includes('FECHA') && rowStr.includes('LOCAL') && rowStr.includes('MONTO')) {
                    startRow = i + 1;
                    break;
                }
            }
            
            if (startRow === -1) startRow = 1;
            
            for (let i = startRow; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length < 3) continue;
                
                try {
                    let fecha, local, monto;
                    
                    for (let j = 0; j < Math.min(5, row.length); j++) {
                        const valor = row[j] ? String(row[j]).trim() : '';
                        
                        if (!fecha && valor.match(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/)) {
                            fecha = valor;
                        } else if (!local && isNaN(valor) && valor.length > 0 && !valor.match(/^\d+$/)) {
                            local = valor;
                        } else if (!monto && valor.match(/^[\d,.]+$/)) {
                            monto = valor;
                        }
                    }
                    
                    if (!fecha || !local || !monto) continue;
                    
                    const montoLimpio = parseFloat(String(monto).replace(/[^\d.-]/g, '')) || 0;
                    
                    let fechaFormateada = fecha;
                    if (fecha.includes('/')) {
                        const partes = fecha.split('/');
                        if (partes.length === 3) {
                            let año = partes[2];
                            if (año.length === 2) año = '20' + año;
                            fechaFormateada = `${año}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                        }
                    } else if (fecha.includes('-')) {
                        const partes = fecha.split('-');
                        if (partes[0].length === 4) {
                            fechaFormateada = fecha;
                        }
                    }
                    
                    const data = {
                        fecha: fechaFormateada,
                        local: local.toUpperCase().trim(),
                        monto: montoLimpio,
                        porcentaje: 0,
                        fechaCreacion: new Date().toISOString(),
                        creadoPor: AppState.usuario?.email || 'sistema'
                    };
                    
                    await firebase.database().ref('facturacionBodegas').push(data);
                    exitosos++;
                    
                } catch (rowError) {
                    errores.push(`Fila ${i + 1}: ${rowError.message}`);
                }
            }
            
            statusDiv.innerHTML = `
                <div style="background: ${exitosos > 0 ? '#10b98120' : '#ef444420'}; color: ${exitosos > 0 ? '#059669' : '#dc2626'}; padding: 15px; border-radius: 12px;">
                    <i class="fas ${exitosos > 0 ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    <strong>${exitosos} registros importados correctamente</strong>
                    ${errores.length > 0 ? `<br><small>${errores.length} errores</small>` : ''}
                </div>
            `;
            
            setTimeout(() => {
                cerrarModal('importarFacturacionModal');
            }, 2000);
            
        } catch (error) {
            console.error('Error:', error);
            statusDiv.innerHTML = `
                <div style="background: #ef444420; color: #dc2626; padding: 15px; border-radius: 12px;">
                    <i class="fas fa-exclamation-circle"></i> Error al procesar: ${error.message}
                </div>
            `;
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// ============================================
// CONFIGURAR PORCENTAJES MANUALES
// ============================================
function configurarPorcentajes() {
    console.log('📊 Configurando porcentajes manuales');
    
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
                    <p style="margin: 4px 0 0; opacity: 0.8;">Distribución de costos por local</p>
                </div>
            </div>
        </div>
        
        <div class="modal-body" style="padding: 30px; background: #f8fafc; max-height: 70vh; overflow-y: auto;">
            <p style="margin-bottom: 20px; color: #4b5563; background: #f1f5f9; padding: 15px; border-radius: 12px;">
                <i class="fas fa-info-circle" style="color: #f59e0b;"></i>
                Ingrese el porcentaje de distribución para cada local. (No es necesario que sumen 100%)
            </p>
            
            <div id="porcentajes-container" style="margin-bottom: 25px;">
    `;
    
    let total = 0;
    
    locales.forEach(local => {
        const valorActual = porcentajesGuardados[local.nombre] || 0;
        total += valorActual;
        
        html += `
            <div style="background: white; border-radius: 16px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center; gap: 15px;">
                <div style="background: #f1f5f9; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-store" style="color: #f59e0b;"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 5px;">${local.nombre}</div>
                    <input type="range" 
                           id="pct_${local.nombre.replace(/\s+/g, '_')}" 
                           min="0" max="100" step="0.1" value="${valorActual}" 
                           oninput="actualizarPorcentaje('${local.nombre.replace(/\s+/g, '_')}', this.value)"
                           style="width: 100%; height: 8px; border-radius: 4px; background: #e2e8f0; accent-color: #f59e0b;">
                </div>
                <div style="min-width: 120px; text-align: right;">
                    <input type="number" 
                           id="input_${local.nombre.replace(/\s+/g, '_')}" 
                           value="${valorActual}" min="0" max="100" step="0.1" 
                           onchange="actualizarSlider('${local.nombre.replace(/\s+/g, '_')}', this.value)"
                           style="width: 80px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 8px; text-align: right;">
                    <span style="margin-left: 5px; font-weight: 600;">%</span>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            
            <div style="background: #f1f5f9; border-radius: 16px; padding: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600;">Total ingresado:</span>
                <span style="font-size: 1.5rem; font-weight: 700; color: #059669;" id="totalPorcentajes">${total.toFixed(1)}%</span>
            </div>
            
            <div style="background: #f1f5f9; border-radius: 12px; padding: 15px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #4b5563;">
                    <i class="fas fa-lightbulb" style="color: #f59e0b; margin-right: 8px;"></i>
                    <strong>Nota:</strong> Los porcentajes no necesitan sumar 100%. Cada local recibirá el porcentaje que asignes.
                </p>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 2px solid #eef2f6; padding-top: 20px;">
                <button onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" style="padding: 14px 28px; border: 2px solid #eef2f6; background: white; color: #64748b; border-radius: 16px; font-weight: 600; cursor: pointer;">
                    Cancelar
                </button>
                <button onclick="guardarPorcentajesLogistica()" style="padding: 14px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);">
                    <i class="fas fa-save"></i> Guardar Porcentajes
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
    
    window.actualizarPorcentaje = function(id, valor) {
        document.getElementById(`input_${id}`).value = valor;
        actualizarTotalPorcentajes();
    };
    
    window.actualizarSlider = function(id, valor) {
        const slider = document.getElementById(`pct_${id}`);
        if (slider) slider.value = valor;
        actualizarTotalPorcentajes();
    };
    
    window.actualizarTotalPorcentajes = function() {
        let total = 0;
        
        locales.forEach(local => {
            const input = document.getElementById(`input_${local.nombre.replace(/\s+/g, '_')}`);
            if (input) {
                total += parseFloat(input.value) || 0;
            }
        });
        
        const totalSpan = document.getElementById('totalPorcentajes');
        if (totalSpan) {
            totalSpan.textContent = total.toFixed(1) + '%';
        }
    };
    
    window.guardarPorcentajesLogistica = function() {
        const porcentajes = {};
        
        // Recolectar todos los valores
        locales.forEach(local => {
            const input = document.getElementById(`input_${local.nombre.replace(/\s+/g, '_')}`);
            const valor = parseFloat(input?.value) || 0;
            porcentajes[local.nombre] = valor / 100;
        });
        
        // Guardar SOLO en localStorage
        localStorage.setItem('porcentajesLogistica', JSON.stringify(
            Object.fromEntries(Object.entries(porcentajes).map(([k, v]) => [k, v * 100]))
        ));
        
        window.porcentajesLogistica = porcentajes;
        
        alert('✅ Porcentajes guardados correctamente');
        
        // Cerrar modal
        document.getElementById('configurarPorcentajesModal').remove();
        overlay.classList.remove('active');
        
        // Recargar vista
        renderLogistica();
    };
}

// ============================================
// FUNCIÓN PARA ELIMINAR FACTURACIÓN
// ============================================
function eliminarFacturacion(id) {
    if (!confirm('¿Eliminar registro de facturación?')) return;
    
    firebase.database().ref(`facturacionBodegas/${id}`).remove()
        .then(() => alert('✅ Registro eliminado'))
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar');
        });
}

// ============================================
// CARGAR PORCENTAJES GUARDADOS AL INICIAR
// ============================================
(function cargarPorcentajesGuardados() {
    const guardados = localStorage.getItem('porcentajesLogistica');
    if (guardados) {
        const porcentajes = JSON.parse(guardados);
        window.porcentajesLogistica = Object.fromEntries(
            Object.entries(porcentajes).map(([k, v]) => [k, v / 100])
        );
    }
})();

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initLogistica = initLogistica;
window.renderLogistica = renderLogistica;
window.importarFacturacionBodegas = importarFacturacionBodegas;
window.configurarPorcentajes = configurarPorcentajes;
window.agregarFacturacionManual = agregarFacturacionManual;
window.eliminarFacturacion = eliminarFacturacion;
window.guardarFacturacion = guardarFacturacion;

// Exponer facturacionBodegas globalmente para depuración
window.facturacionBodegas = facturacionBodegas;

console.log('✅ logistica.js cargado - Integrado con costos fijos');