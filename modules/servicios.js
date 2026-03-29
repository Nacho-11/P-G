// modules/servicios.js - VERSIÓN LIMPIA Y FUNCIONAL
console.log('⚡ Cargando módulo de Servicios...');

// ============================================
// CONFIGURACIÓN
// ============================================
const PRECIOS_DEF = {
    Agua: 1500,
    Electricidad: 120
};

// ============================================
// FUNCIONES DE PRECIOS Y MEDIDORES
// ============================================
function obtenerPrecioLocal(local, servicio) {
    const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
    return precios[local]?.[servicio] || PRECIOS_DEF[servicio];
}

function obtenerMedidoresLocal(local) {
    const medidores = JSON.parse(localStorage.getItem('medidoresServicios')) || {};
    return medidores[local] || { agua: [], electricidad: [] };
}

// ============================================
// CARGAR SERVICIOS DESDE FIREBASE
// ============================================
function cargarServiciosFirebase() {
    console.log('🔄 Cargando servicios...');
    firebase.database().ref('servicios').on('value', (snapshot) => {
        const data = snapshot.val();
        const serviciosData = {};
        if (data) {
            for (const local in data) {
                serviciosData[local] = [];
                for (const id in data[local]) {
                    serviciosData[local].push({ id, ...data[local][id] });
                }
            }
        }
        window.serviciosData = serviciosData;
        if (document.getElementById('servicios')?.classList.contains('active')) renderServicios();
        if (document.getElementById('resumen')?.classList.contains('active') && window.renderResumen) window.renderResumen();
    });
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================
function renderServicios() {
    const content = document.getElementById('serviciosContent');
    if (!content) return;
    
    const filtroLocal = AppState?.filtros?.local || 'Todos';
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    const serviciosData = window.serviciosData || {};
    
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-bolt" style="color: #f59e0b;"></i> Servicios Públicos</h2>
            <div style="display: flex; gap: 10px;">
                ${window.esGerencia && window.esGerencia() ? `
                    <button class="btn btn-outline" onclick="window.configurarMedidores()">
                        <i class="fas fa-microchip"></i> Configurar Medidores
                    </button>
                    <button class="btn btn-outline" onclick="window.configurarPreciosGlobal()">
                        <i class="fas fa-cog"></i> Precios Agua/Luz
                    </button>
                ` : ''}
                <button class="btn btn-primary" onclick="window.mostrarModalServicio()">
                    <i class="fas fa-plus"></i> Nuevo Servicio
                </button>
            </div>
        </div>
    `;
    
    if (Object.keys(serviciosData).length === 0) {
        html += `<div class="card" style="padding: 40px; text-align: center;"><i class="fas fa-bolt" style="font-size: 4rem; color: #9ca3af;"></i><h3>No hay servicios registrados</h3></div>`;
        content.innerHTML = html;
        return;
    }
    
    const puedeVer = (local) => window.esGerencia?.() || AppState?.usuario?.local === local;
    const locales = filtroLocal === 'Todos' ? Object.keys(serviciosData).filter(puedeVer) : [filtroLocal].filter(l => puedeVer(l) && serviciosData[l]);
    
    if (locales.length === 0) {
        html += `<div class="card" style="padding: 40px; text-align: center;"><h3>No hay servicios para ${filtroLocal}</h3></div>`;
        content.innerHTML = html;
        return;
    }
    
    let totalGeneral = 0;
    let resumen = { Agua: { consumo: 0, monto: 0 }, Electricidad: { consumo: 0, monto: 0 }, Gas: { monto: 0 } };
    
    for (const local of locales) {
        const servicios = (serviciosData[local] || []).filter(s => {
            const fecha = s.fecha?.split('T')[0] || s.fecha;
            if (!fecha) return false;
            if (filtroTiempo === 'todos') return true;
            if (filtroTiempo === 'ayer') return fecha === ayerStr;
            if (filtroTiempo === 'mes') return fecha.substring(0, 7) === mesActual;
            if (filtroTiempo === 'anio') return fecha.substring(0, 4) === anioActual;
            if (filtroTiempo === 'personalizado') return fecha === AppState?.filtros?.fechaPersonalizada;
            return true;
        });
        
        if (servicios.length === 0) continue;
        
        html += `<div class="card" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3><i class="fas fa-store"></i> ${local}</h3>
                <span>${servicios.length} registros</span>
            </div>
            <div class="table-container"><table class="table"><thead><tr><th>Fecha</th><th>Servicio</th><th>Medidor</th><th>Detalle</th><th>Consumo</th><th>Monto</th><th>Acciones</th> </thead><tbody>`;
        
        servicios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(s => {
            const fecha = new Date(s.fecha + 'T12:00:00').toLocaleDateString('es-CR');
            let detalle = '', cantidad = '';
            if (s.servicio === 'Agua') {
                detalle = `${s.medidores?.length || 0} medidor(es)`;
                cantidad = `${(s.consumoTotal || 0).toFixed(3)} M³`;
            } else if (s.servicio === 'Electricidad') {
                detalle = `${s.medidores?.length || 0} medidor(es)`;
                cantidad = `${(s.consumoTotal || 0).toFixed(1)} kWh`;
            } else if (s.servicio === 'Gas') {
                detalle = `${s.proveedor || '—'} | Fact #${s.numeroFactura || '—'}`;
                cantidad = `${s.dias || 30} días | ₡${((s.monto || 0) / (s.dias || 30)).toFixed(2)}/día`;
            }
            
            totalGeneral += s.monto || 0;
            if (s.servicio === 'Agua') { resumen.Agua.consumo += s.consumoTotal || 0; resumen.Agua.monto += s.monto || 0; }
            else if (s.servicio === 'Electricidad') { resumen.Electricidad.consumo += s.consumoTotal || 0; resumen.Electricidad.monto += s.monto || 0; }
            else if (s.servicio === 'Gas') { resumen.Gas.monto += s.monto || 0; }
            
            html += `<tr><td><strong>${fecha}</strong></td><td>${s.servicio === 'Agua' ? '💧 Agua' : s.servicio === 'Electricidad' ? '⚡ Electricidad' : '🔥 Gas'}</td>
                <td>${s.medidor || '—'}</td><td><small>${detalle}</small></td><td><strong>${cantidad}</strong></td>
                <td style="color:#059669;font-weight:600;">₡${(s.monto || 0).toLocaleString()}</td>
                <td><button class="btn btn-sm btn-outline" onclick="window.editarServicio('${local}','${s.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="window.eliminarServicio('${local}','${s.id}')"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        
        html += `</tbody></table></div><div style="text-align:right;margin-top:10px;"><strong>Total ${local}: ₡${servicios.reduce((s, x) => s + (x.monto || 0), 0).toLocaleString()}</strong></div></div>`;
    }
    
    html += `<div class="card" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; margin-top: 20px;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center;">
            <div><div>TOTAL</div><div style="font-size:1.8rem;">₡${totalGeneral.toLocaleString()}</div></div>
            <div><div><i class="fas fa-water"></i> AGUA</div><div>${resumen.Agua.consumo.toFixed(1)} M³</div><div>₡${resumen.Agua.monto.toLocaleString()}</div></div>
            <div><div><i class="fas fa-bolt"></i> ELECTRICIDAD</div><div>${resumen.Electricidad.consumo.toFixed(0)} kWh</div><div>₡${resumen.Electricidad.monto.toLocaleString()}</div></div>
            <div><div><i class="fas fa-fire"></i> GAS</div><div>—</div><div>₡${resumen.Gas.monto.toLocaleString()}</div></div>
        </div>
    </div>`;
    
    content.innerHTML = html;
}

// ============================================
// CONFIGURAR MEDIDORES POR LOCAL
// ============================================
function configurarMedidores() {
    if (!window.esGerencia || !window.esGerencia()) {
        alert('Solo gerencia puede configurar medidores');
        return;
    }
    
    const overlay = document.getElementById('modalOverlay');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '700px';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    
    const locales = AppState?.locales?.map(l => l.nombre) || [];
    const medidoresGuardados = JSON.parse(localStorage.getItem('medidoresServicios')) || {};
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px 25px;">
            <h2 style="margin: 0;"><i class="fas fa-microchip"></i> Configurar Medidores por Local</h2>
            <button class="modal-close" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="padding: 25px; background: #f8fafc; max-height: 70vh; overflow-y: auto;">
            <p style="margin-bottom: 20px; color: #4b5563;">Configure los números de medidor para cada local (Agua y Electricidad):</p>
    `;
    
    locales.forEach(local => {
        const medLocal = medidoresGuardados[local] || { agua: [], electricidad: [] };
        html += `
            <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px 0;"><i class="fas fa-store"></i> ${local}</h3>
                <div style="margin-bottom: 15px;">
                    <label><i class="fas fa-water"></i> Medidores de Agua</label>
                    <div id="medidores_agua_${local.replace(/\s+/g, '_')}">
                        ${medLocal.agua.map((m, i) => `<div style="display: flex; gap: 10px; margin-bottom: 8px;"><input type="text" class="medidor-agua-${local.replace(/\s+/g, '_')}" value="${m}" placeholder="Número de medidor" style="flex:1; padding: 8px; border-radius: 8px; border:1px solid #ddd;"><button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; border:none; padding:8px 12px; border-radius:8px;">✖</button></div>`).join('')}
                    </div>
                    <button type="button" onclick="agregarCampoMedidor('${local.replace(/\s+/g, '_')}', 'agua')" style="margin-top: 8px; background: #f1f5f9; border: 1px dashed #94a3b8; padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-plus"></i> Agregar medidor de agua
                    </button>
                </div>
                <div>
                    <label><i class="fas fa-bolt"></i> Medidores de Electricidad</label>
                    <div id="medidores_electricidad_${local.replace(/\s+/g, '_')}">
                        ${medLocal.electricidad.map((m, i) => `<div style="display: flex; gap: 10px; margin-bottom: 8px;"><input type="text" class="medidor-electricidad-${local.replace(/\s+/g, '_')}" value="${m}" placeholder="Número de medidor" style="flex:1; padding: 8px; border-radius: 8px; border:1px solid #ddd;"><button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; border:none; padding:8px 12px; border-radius:8px;">✖</button></div>`).join('')}
                    </div>
                    <button type="button" onclick="agregarCampoMedidor('${local.replace(/\s+/g, '_')}', 'electricidad')" style="margin-top: 8px; background: #f1f5f9; border: 1px dashed #94a3b8; padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-plus"></i> Agregar medidor de electricidad
                    </button>
                </div>
            </div>
        `;
    });
    
    html += `
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" style="padding: 12px 24px;">Cancelar</button>
                <button onclick="window.guardarMedidoresGlobal()" style="padding: 12px 32px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 12px;">Guardar Medidores</button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
    
    window.agregarCampoMedidor = function(localId, tipo) {
        const container = document.getElementById(`medidores_${tipo}_${localId}`);
        const input = document.createElement('div');
        input.style.display = 'flex';
        input.style.gap = '10px';
        input.style.marginBottom = '8px';
        input.innerHTML = `<input type="text" class="medidor-${tipo}-${localId}" placeholder="Número de medidor" style="flex:1; padding: 8px; border-radius: 8px; border:1px solid #ddd;"><button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; border:none; padding:8px 12px; border-radius:8px;">✖</button>`;
        container.appendChild(input);
    };
    
    window.guardarMedidoresGlobal = function() {
        const nuevosMedidores = {};
        locales.forEach(local => {
            const localId = local.replace(/\s+/g, '_');
            const aguaInputs = document.querySelectorAll(`.medidor-agua-${localId}`);
            const electricidadInputs = document.querySelectorAll(`.medidor-electricidad-${localId}`);
            nuevosMedidores[local] = {
                agua: Array.from(aguaInputs).map(i => i.value.trim()).filter(v => v),
                electricidad: Array.from(electricidadInputs).map(i => i.value.trim()).filter(v => v)
            };
        });
        localStorage.setItem('medidoresServicios', JSON.stringify(nuevosMedidores));
        alert('✅ Medidores guardados correctamente');
        document.querySelector('.modal')?.remove();
        document.getElementById('modalOverlay')?.classList.remove('active');
    };
}

// ============================================
// CONFIGURAR PRECIOS
// ============================================
function configurarPreciosGlobal() {
    if (!window.esGerencia || !window.esGerencia()) {
        alert('Solo gerencia puede configurar precios');
        return;
    }
    
    const overlay = document.getElementById('modalOverlay');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '500px';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    
    const locales = AppState?.locales?.map(l => l.nombre) || [];
    const preciosActuales = JSON.parse(localStorage.getItem('preciosServicios')) || {};
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 20px 25px;">
            <h2 style="margin: 0;"><i class="fas fa-cog"></i> Configurar Precios</h2>
            <button class="modal-close" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="padding: 25px; background: #f8fafc; max-height: 70vh; overflow-y: auto;">
    `;
    
    locales.forEach(local => {
        const localId = local.replace(/\s+/g, '_');
        html += `
            <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                <h3><i class="fas fa-store"></i> ${local}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><label>💧 Agua (₡/M³)</label><input type="number" id="precio_${localId}_agua" value="${preciosActuales[local]?.Agua || PRECIOS_DEF.Agua}" step="10" min="0" style="width:100%; padding:8px; border-radius:8px;"></div>
                    <div><label>⚡ Electricidad (₡/kWh)</label><input type="number" id="precio_${localId}_electricidad" value="${preciosActuales[local]?.Electricidad || PRECIOS_DEF.Electricidad}" step="5" min="0" style="width:100%; padding:8px; border-radius:8px;"></div>
                </div>
            </div>
        `;
    });
    
    html += `<div style="display: flex; gap: 15px; justify-content: flex-end;"><button onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" style="padding: 12px 24px;">Cancelar</button>
        <button onclick="window.guardarPreciosGlobal()" style="padding: 12px 32px; background: #2563eb; color:white; border:none; border-radius:12px;">Guardar</button></div></div>`;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
    
    window.guardarPreciosGlobal = function() {
        const nuevosPrecios = {};
        locales.forEach(local => {
            const localId = local.replace(/\s+/g, '_');
            nuevosPrecios[local] = {
                Agua: parseFloat(document.getElementById(`precio_${localId}_agua`)?.value) || PRECIOS_DEF.Agua,
                Electricidad: parseFloat(document.getElementById(`precio_${localId}_electricidad`)?.value) || PRECIOS_DEF.Electricidad
            };
        });
        localStorage.setItem('preciosServicios', JSON.stringify(nuevosPrecios));
        alert('✅ Precios guardados');
        document.querySelector('.modal')?.remove();
        document.getElementById('modalOverlay')?.classList.remove('active');
    };
}

// ============================================
// CARGAR MEDIDORES EN MODAL
// ============================================
function cargarMedidoresEnModal(tipo) {
    const local = document.getElementById('servicioLocal')?.value;
    const medidoresConfig = tipo === 'agua' ? window.medidoresAguaConfig || [] : window.medidoresElectricidadConfig || [];
    const container = document.getElementById(`medidoresContainer_${tipo}`);
    if (!container) return;
    
    if (medidoresConfig.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">No hay medidores configurados para este local. Contacte a gerencia.</div>';
        return;
    }
    
    let html = '';
    medidoresConfig.forEach((medidor, idx) => {
        html += `
            <div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid #eef2f6;">
                <div style="margin-bottom: 10px;"><strong>Medidor: ${medidor}</strong></div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label>Lectura Apertura</label>
                        <input type="number" id="${tipo}_apertura_${idx}" step="0.001" placeholder="0.000" 
                               oninput="window.calcularConsumo${tipo === 'agua' ? 'Agua' : 'Energia'}Servicio()" 
                               style="width:100%; padding:10px; border:2px solid #eef2f6; border-radius:8px;">
                    </div>
                    <div>
                        <label>Lectura Cierre</label>
                        <input type="number" id="${tipo}_cierre_${idx}" step="0.001" placeholder="0.000" 
                               oninput="window.calcularConsumo${tipo === 'agua' ? 'Agua' : 'Energia'}Servicio()" 
                               style="width:100%; padding:10px; border:2px solid #eef2f6; border-radius:8px;">
                    </div>
                </div>
                <div style="margin-top: 8px; text-align: right;">
                    <strong id="${tipo}_consumo_${idx}" style="color: #3b82f6;">0.000</strong> ${tipo === 'agua' ? 'M³' : 'kWh'}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// CÁLCULOS
// ============================================
function calcularConsumoAguaServicio() {
    const medidoresConfig = window.medidoresAguaConfig || [];
    let consumoTotal = 0;
    
    for (let i = 0; i < medidoresConfig.length; i++) {
        const apertura = parseFloat(document.getElementById(`agua_apertura_${i}`)?.value) || 0;
        const cierre = parseFloat(document.getElementById(`agua_cierre_${i}`)?.value) || 0;
        const consumo = (cierre > apertura) ? (cierre - apertura) : 0;
        consumoTotal += consumo;
        
        const consumoDisplay = document.getElementById(`agua_consumo_${i}`);
        if (consumoDisplay) consumoDisplay.textContent = consumo.toFixed(3);
    }
    
    const consumoTotalSpan = document.getElementById('aguaConsumoTotal');
    if (consumoTotalSpan) consumoTotalSpan.textContent = consumoTotal.toFixed(3) + ' M³';
    
    const local = document.getElementById('servicioLocal')?.value;
    if (local) {
        const precio = obtenerPrecioLocal(local, 'Agua');
        const monto = consumoTotal * precio;
        const montoCalculado = document.getElementById('aguaMontoCalculado');
        if (montoCalculado) montoCalculado.textContent = '₡' + Math.round(monto).toLocaleString();
        const servicioMonto = document.getElementById('servicioMonto');
        if (servicioMonto) servicioMonto.value = monto;
    }
}

function calcularConsumoEnergiaServicio() {
    const medidoresConfig = window.medidoresElectricidadConfig || [];
    let consumoTotal = 0;
    
    for (let i = 0; i < medidoresConfig.length; i++) {
        const apertura = parseFloat(document.getElementById(`electricidad_apertura_${i}`)?.value) || 0;
        const cierre = parseFloat(document.getElementById(`electricidad_cierre_${i}`)?.value) || 0;
        const consumo = (cierre > apertura) ? (cierre - apertura) : 0;
        consumoTotal += consumo;
        
        const consumoDisplay = document.getElementById(`electricidad_consumo_${i}`);
        if (consumoDisplay) consumoDisplay.textContent = consumo.toFixed(1);
    }
    
    const consumoTotalSpan = document.getElementById('energiaConsumoTotal');
    if (consumoTotalSpan) consumoTotalSpan.textContent = consumoTotal.toFixed(1) + ' kWh';
    
    const local = document.getElementById('servicioLocal')?.value;
    if (local) {
        const precio = obtenerPrecioLocal(local, 'Electricidad');
        const monto = consumoTotal * precio;
        const montoCalculado = document.getElementById('energiaMontoCalculado');
        if (montoCalculado) montoCalculado.textContent = '₡' + Math.round(monto).toLocaleString();
        const servicioMonto = document.getElementById('servicioMonto');
        if (servicioMonto) servicioMonto.value = monto;
    }
}

function calcularGasDiarioServicio() {
    const monto = parseFloat(document.getElementById('gasMonto')?.value) || 0;
    const dias = parseFloat(document.getElementById('gasDias')?.value) || 30;
    const costoDiario = dias > 0 ? monto / dias : 0;
    
    const costoDiarioSpan = document.getElementById('gasCostoDiarioPreview');
    if (costoDiarioSpan) {
        costoDiarioSpan.innerHTML = `<strong>Costo diario:</strong> ₡${costoDiario.toFixed(2)} (₡${monto.toLocaleString()} ÷ ${dias} días)`;
    }
    
    const servicioMonto = document.getElementById('servicioMonto');
    if (servicioMonto) servicioMonto.value = monto;
    
    return { monto, dias, costoDiario };
}

// ============================================
// CAMBIAR TIPO DE SERVICIO
// ============================================
function cambiarTipoServicioModal() {
    const tipo = document.getElementById('servicioTipo')?.value;
    const seccionAgua = document.getElementById('seccionAgua');
    const seccionElectricidad = document.getElementById('seccionElectricidad');
    const seccionGas = document.getElementById('seccionGas');
    const icon = document.getElementById('servicioModalIcon');
    
    if (seccionAgua) seccionAgua.style.display = 'none';
    if (seccionElectricidad) seccionElectricidad.style.display = 'none';
    if (seccionGas) seccionGas.style.display = 'none';
    
    if (tipo === 'Agua') {
        if (seccionAgua) seccionAgua.style.display = 'block';
        if (icon) { icon.className = 'fas fa-water'; icon.style.color = '#3b82f6'; }
        cargarMedidoresEnModal('agua');
        setTimeout(() => calcularConsumoAguaServicio(), 100);
    } else if (tipo === 'Electricidad') {
        if (seccionElectricidad) seccionElectricidad.style.display = 'block';
        if (icon) { icon.className = 'fas fa-bolt'; icon.style.color = '#f59e0b'; }
        cargarMedidoresEnModal('electricidad');
        setTimeout(() => calcularConsumoEnergiaServicio(), 100);
    } else if (tipo === 'Gas') {
        if (seccionGas) seccionGas.style.display = 'block';
        if (icon) { icon.className = 'fas fa-fire'; icon.style.color = '#ef4444'; }
        setTimeout(() => calcularGasDiarioServicio(), 100);
    }
}

// ============================================
// MOSTRAR MODAL DE SERVICIO
// ============================================
function mostrarModalServicio(editLocal = null, editId = null) {
    console.log('📝 Mostrando modal servicio:', { editLocal, editId });
    
    const modal = document.getElementById('servicioModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) {
        alert('Error: No se encontró el modal de servicio');
        return;
    }
    
    // Limpiar formulario
    const hoy = new Date();
    const fechaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    document.getElementById('servicioFecha').value = fechaActual;
    document.getElementById('servicioTipo').value = '';
    document.getElementById('servicioMedidor').value = '';
    
    // Limpiar medidores
    delete window.medidoresAguaConfig;
    delete window.medidoresElectricidadConfig;
    
    // Ocultar secciones
    document.getElementById('seccionAgua').style.display = 'none';
    document.getElementById('seccionElectricidad').style.display = 'none';
    document.getElementById('seccionGas').style.display = 'none';
    
    // Cargar locales
    const selectLocal = document.getElementById('servicioLocal');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
        const esGerente = window.esGerencia && window.esGerencia();
        const localesPermitidos = window.getLocalesPermitidos ? window.getLocalesPermitidos() : [];
        
        AppState?.locales?.forEach(local => {
            if (esGerente || localesPermitidos.includes(local.nombre)) {
                selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
            }
        });
        
        if (!esGerente && AppState?.usuario?.local) {
            selectLocal.value = AppState.usuario.local;
            selectLocal.disabled = true;
        } else {
            selectLocal.disabled = false;
        }
    }
    
    // Evento al cambiar local
    selectLocal.onchange = function() {
        const local = this.value;
        if (!local) return;
        
        const precioAgua = obtenerPrecioLocal(local, 'Agua');
        const precioElectricidad = obtenerPrecioLocal(local, 'Electricidad');
        document.getElementById('precioAguaDisplay').textContent = precioAgua;
        document.getElementById('precioElectricidadDisplay').textContent = precioElectricidad;
        
        const medidores = obtenerMedidoresLocal(local);
        window.medidoresAguaConfig = medidores.agua || [];
        window.medidoresElectricidadConfig = medidores.electricidad || [];
        
        const tipoActual = document.getElementById('servicioTipo').value;
        if (tipoActual === 'Agua') {
            cargarMedidoresEnModal('agua');
            calcularConsumoAguaServicio();
        } else if (tipoActual === 'Electricidad') {
            cargarMedidoresEnModal('electricidad');
            calcularConsumoEnergiaServicio();
        }
    };
    
    // Si es edición
    if (editLocal && editId && window.serviciosData) {
        const servicio = window.serviciosData[editLocal]?.find(s => s.id === editId);
        if (servicio) {
            selectLocal.value = editLocal;
            selectLocal.disabled = true;
            document.getElementById('servicioFecha').value = servicio.fecha;
            document.getElementById('servicioTipo').value = servicio.servicio;
            document.getElementById('servicioMedidor').value = servicio.medidor || '';
            
            const medidores = obtenerMedidoresLocal(editLocal);
            window.medidoresAguaConfig = medidores.agua || [];
            window.medidoresElectricidadConfig = medidores.electricidad || [];
            
            cambiarTipoServicioModal();
            
            if (servicio.servicio === 'Gas') {
                document.getElementById('gasProveedor').value = servicio.proveedor || '';
                document.getElementById('gasNumeroFactura').value = servicio.numeroFactura || '';
                document.getElementById('gasMonto').value = servicio.monto || 0;
                document.getElementById('gasDias').value = servicio.dias || 30;
                calcularGasDiarioServicio();
            }
        }
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// GUARDAR SERVICIO
// ============================================
async function guardarServicio() {
    const local = document.getElementById('servicioLocal')?.value;
    const fecha = document.getElementById('servicioFecha')?.value;
    const tipo = document.getElementById('servicioTipo')?.value;
    
    if (!local || !fecha || !tipo) {
        alert('Complete los campos obligatorios');
        return;
    }
    
    let servicioData = { fecha, servicio: tipo, monto: 0, timestamp: firebase.database.ServerValue.TIMESTAMP };
    
    if (tipo === 'Agua') {
        const medidores = [];
        let consumoTotal = 0;
        const medidoresConfig = window.medidoresAguaConfig || [];
        for (let i = 0; i < medidoresConfig.length; i++) {
            const apertura = parseFloat(document.getElementById(`agua_apertura_${i}`)?.value) || 0;
            const cierre = parseFloat(document.getElementById(`agua_cierre_${i}`)?.value) || 0;
            const consumo = (cierre > apertura) ? (cierre - apertura) : 0;
            consumoTotal += consumo;
            medidores.push({ numero: medidoresConfig[i], apertura, cierre, consumo });
        }
        const precio = obtenerPrecioLocal(local, 'Agua');
        servicioData = { ...servicioData, medidores, consumoTotal, monto: Math.round(consumoTotal * precio) };
    } else if (tipo === 'Electricidad') {
        const medidores = [];
        let consumoTotal = 0;
        const medidoresConfig = window.medidoresElectricidadConfig || [];
        for (let i = 0; i < medidoresConfig.length; i++) {
            const apertura = parseFloat(document.getElementById(`electricidad_apertura_${i}`)?.value) || 0;
            const cierre = parseFloat(document.getElementById(`electricidad_cierre_${i}`)?.value) || 0;
            const consumo = (cierre > apertura) ? (cierre - apertura) : 0;
            consumoTotal += consumo;
            medidores.push({ numero: medidoresConfig[i], apertura, cierre, consumo });
        }
        const precio = obtenerPrecioLocal(local, 'Electricidad');
        servicioData = { ...servicioData, medidores, consumoTotal, monto: Math.round(consumoTotal * precio) };
    } else if (tipo === 'Gas') {
        servicioData = {
            ...servicioData,
            proveedor: document.getElementById('gasProveedor')?.value || '',
            numeroFactura: document.getElementById('gasNumeroFactura')?.value || '',
            monto: parseFloat(document.getElementById('gasMonto')?.value) || 0,
            dias: parseFloat(document.getElementById('gasDias')?.value) || 30
        };
    }
    
    try {
        await firebase.database().ref(`servicios/${local}`).push(servicioData);
        alert('✅ Servicio guardado');
        cerrarModal('servicioModal');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function eliminarServicio(local, id) {
    if (confirm('¿Eliminar este registro?')) {
        firebase.database().ref(`servicios/${local}/${id}`).remove()
            .then(() => alert('✅ Eliminado'))
            .catch(e => alert('Error: ' + e.message));
    }
}

function editarServicio(local, id) {
    mostrarModalServicio(local, id);
}

// ============================================
// INICIALIZAR
// ============================================
function initServicios() {
    setTimeout(() => { 
        if (AppState?.usuario) {
            cargarServiciosFirebase();
        } else {
            setTimeout(initServicios, 500);
        }
    }, 100);
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.renderServicios = renderServicios;
window.mostrarModalServicio = mostrarModalServicio;
window.guardarServicio = guardarServicio;
window.editarServicio = editarServicio;
window.eliminarServicio = eliminarServicio;
window.cambiarTipoServicioModal = cambiarTipoServicioModal;
window.cambiarTipoServicio = cambiarTipoServicioModal;
window.configurarMedidores = configurarMedidores;
window.configurarPreciosGlobal = configurarPreciosGlobal;
window.cargarServiciosFirebase = cargarServiciosFirebase;
window.initServicios = initServicios;
window.calcularConsumoAguaServicio = calcularConsumoAguaServicio;
window.calcularConsumoEnergiaServicio = calcularConsumoEnergiaServicio;
window.calcularGasDiarioServicio = calcularGasDiarioServicio;
window.calcularGasDiario = calcularGasDiarioServicio;
window.calcularConsumoAgua = calcularConsumoAguaServicio;
window.calcularConsumoEnergia = calcularConsumoEnergiaServicio;
window.cargarMedidoresEnModal = cargarMedidoresEnModal;

console.log('✅ servicios.js cargado correctamente');