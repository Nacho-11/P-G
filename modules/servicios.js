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
    const ayer = new Date(hoy); 
    ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 15px;">
            <div>
                <h2 style="margin: 0; font-size: 1.8rem; display: flex; align-items: center; gap: 10px;">
                    <span style="display:inline-flex; width:48px; height:48px; align-items:center; justify-content:center; border-radius:16px; background: linear-gradient(135deg, #f59e0b, #d97706); color:white;">
                        <i class="fas fa-bolt"></i>
                    </span>
                    Servicios Públicos
                </h2>
                <p style="margin: 6px 0 0 58px; color: #64748b; font-size: 0.95rem;">
                    Control de agua, electricidad y gas por local
                </p>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${window.esGerencia && window.esGerencia() ? `
                    <button class="btn btn-outline" onclick="window.configurarMedidores()" style="border-radius: 12px; padding: 10px 16px;">
                        <i class="fas fa-microchip"></i> Configurar Medidores
                    </button>
                    <button class="btn btn-outline" onclick="window.configurarPreciosGlobal()" style="border-radius: 12px; padding: 10px 16px;">
                        <i class="fas fa-cog"></i> Precios Agua/Luz
                    </button>
                ` : ''}
                <button class="btn btn-primary" onclick="window.mostrarModalServicio()" style="border-radius: 14px; padding: 12px 18px; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.18);">
                    <i class="fas fa-plus"></i> Nuevo Servicio
                </button>
            </div>
        </div>
    `;

    if (Object.keys(serviciosData).length === 0) {
        html += `
            <div class="card" style="padding: 50px 30px; text-align: center; border-radius: 24px;">
                <div style="width: 90px; height: 90px; margin: 0 auto 20px; border-radius: 24px; background: linear-gradient(135deg, #f8fafc, #e2e8f0); display:flex; align-items:center; justify-content:center;">
                    <i class="fas fa-bolt" style="font-size: 2.5rem; color: #9ca3af;"></i>
                </div>
                <h3 style="margin-bottom: 8px;">No hay servicios registrados</h3>
                <p style="color:#64748b;">Agrega el primer servicio para comenzar a llevar el control.</p>
            </div>
        `;
        content.innerHTML = html;
        return;
    }

    const puedeVer = (local) => window.esGerencia?.() || AppState?.usuario?.local === local;
    const locales = filtroLocal === 'Todos'
        ? Object.keys(serviciosData).filter(puedeVer)
        : [filtroLocal].filter(l => puedeVer(l) && serviciosData[l]);

    if (locales.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center; border-radius: 24px;">
                <h3>No hay servicios para ${filtroLocal}</h3>
            </div>
        `;
        content.innerHTML = html;
        return;
    }

    let totalGeneral = 0;
    let resumen = {
        Agua: { consumo: 0, monto: 0 },
        Electricidad: { consumo: 0, monto: 0 },
        Gas: { monto: 0, dias: 0, diario: 0 }
    };

    const todosServiciosFiltrados = [];

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

        servicios.forEach(s => todosServiciosFiltrados.push({ ...s, __local: local }));
    }

    if (todosServiciosFiltrados.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center; border-radius: 24px;">
                <h3>No hay servicios en el filtro seleccionado</h3>
            </div>
        `;
        content.innerHTML = html;
        return;
    }

    // =========================
    // RESUMEN GENERAL SUPERIOR
    // =========================
    todosServiciosFiltrados.forEach(s => {
        totalGeneral += s.monto || 0;

        if (s.servicio === 'Agua') {
            resumen.Agua.consumo += s.consumoTotal || 0;
            resumen.Agua.monto += s.monto || 0;
        } else if (s.servicio === 'Electricidad') {
            resumen.Electricidad.consumo += s.consumoTotal || 0;
            resumen.Electricidad.monto += s.monto || 0;
        } else if (s.servicio === 'Gas') {
            const diasGas = s.dias || 30;
            const diarioGas = diasGas > 0 ? (s.monto || 0) / diasGas : 0;
            resumen.Gas.monto += s.monto || 0;
            resumen.Gas.dias += diasGas;
            resumen.Gas.diario += diarioGas;
        }
    });

    html += `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 26px;">
            
            <div class="card" style="border-radius: 24px; padding: 22px; background: linear-gradient(135deg, #0f172a, #1e293b); color: white; box-shadow: 0 16px 35px rgba(15, 23, 42, 0.18);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.85rem; opacity:0.85;">Total Servicios</div>
                        <div style="font-size:2rem; font-weight:800; margin-top:8px;">₡${Math.round(totalGeneral).toLocaleString()}</div>
                    </div>
                    <div style="width:52px; height:52px; border-radius:18px; background: rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-wallet" style="font-size:1.3rem;"></i>
                    </div>
                </div>
            </div>

            <div class="card" style="border-radius: 24px; padding: 22px; background: linear-gradient(135deg, #eff6ff, #dbeafe); border:1px solid #bfdbfe;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.85rem; color:#2563eb; font-weight:700;">💧 Agua</div>
                        <div style="font-size:1.7rem; font-weight:800; color:#1e3a8a; margin-top:8px;">₡${Math.round(resumen.Agua.monto).toLocaleString()}</div>
                        <div style="font-size:0.9rem; color:#475569; margin-top:4px;">${resumen.Agua.consumo.toFixed(3)} M³ consumidos</div>
                    </div>
                    <div style="width:52px; height:52px; border-radius:18px; background: rgba(59,130,246,0.15); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-water" style="font-size:1.3rem; color:#2563eb;"></i>
                    </div>
                </div>
            </div>

            <div class="card" style="border-radius: 24px; padding: 22px; background: linear-gradient(135deg, #fffbeb, #fef3c7); border:1px solid #fde68a;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.85rem; color:#d97706; font-weight:700;">⚡ Electricidad</div>
                        <div style="font-size:1.7rem; font-weight:800; color:#92400e; margin-top:8px;">₡${Math.round(resumen.Electricidad.monto).toLocaleString()}</div>
                        <div style="font-size:0.9rem; color:#475569; margin-top:4px;">${resumen.Electricidad.consumo.toFixed(1)} kWh consumidos</div>
                    </div>
                    <div style="width:52px; height:52px; border-radius:18px; background: rgba(245,158,11,0.18); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-bolt" style="font-size:1.3rem; color:#d97706;"></i>
                    </div>
                </div>
            </div>

            <div class="card" style="border-radius: 24px; padding: 22px; background: linear-gradient(135deg, #fff7ed, #fee2e2); border:1px solid #fdba74;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.85rem; color:#dc2626; font-weight:700;">🔥 Gas</div>
                        <div style="font-size:1.7rem; font-weight:800; color:#991b1b; margin-top:8px;">₡${Math.round(resumen.Gas.monto).toLocaleString()}</div>
                        <div style="font-size:0.9rem; color:#475569; margin-top:4px;">
                        </div>
                    </div>
                    <div style="width:52px; height:52px; border-radius:18px; background: rgba(239,68,68,0.14); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-fire" style="font-size:1.3rem; color:#dc2626;"></i>
                    </div>
                </div>
            </div>
        </div>
    `;

    // =========================
    // AGRUPAR POR LOCAL
    // =========================
    for (const local of locales) {
        const servicios = todosServiciosFiltrados
            .filter(s => s.__local === local)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (servicios.length === 0) continue;

        html += `
            <div class="card" style="margin-bottom: 24px; border-radius: 26px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15,23,42,0.06);">
                <div style="padding: 20px 22px; background: linear-gradient(135deg, #ffffff, #f8fafc); border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div>
                        <h3 style="margin:0; display:flex; align-items:center; gap:10px;">
                            <span style="width:42px; height:42px; border-radius:14px; background:#eff6ff; display:flex; align-items:center; justify-content:center; color:#2563eb;">
                                <i class="fas fa-store"></i>
                            </span>
                            ${local}
                        </h3>
                        <p style="margin:6px 0 0 52px; color:#64748b;">${servicios.length} registro(s) de servicios</p>
                    </div>
                    <div style="background:#0f172a; color:white; padding:10px 16px; border-radius:14px; font-weight:700;">
                        Total: ₡${Math.round(servicios.reduce((sum, x) => sum + (x.monto || 0), 0)).toLocaleString()}
                    </div>
                </div>

                <div style="padding: 16px;">
                    <div style="display:grid; gap:14px;">
        `;

        servicios.forEach(s => {
            const fecha = new Date(s.fecha + 'T12:00:00').toLocaleDateString('es-CR');

            let colorBg = '#f8fafc';
            let colorBorder = '#e2e8f0';
            let colorText = '#334155';
            let servicioIcono = '🔥';
            let servicioNombre = s.servicio;

            let detalle = '';
            let cantidad = '';

            if (s.servicio === 'Agua') {
                colorBg = 'linear-gradient(135deg, #eff6ff, #f8fbff)';
                colorBorder = '#bfdbfe';
                colorText = '#1d4ed8';
                servicioIcono = '💧';
                servicioNombre = 'Agua';

                detalle = `
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        <span style="background:#dbeafe; color:#1d4ed8; padding:5px 10px; border-radius:999px; font-size:0.75rem; font-weight:700;">
                            ${s.medidores?.length || 0} medidor(es)
                        </span>
                    </div>
                `;

                cantidad = `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-size:1rem; font-weight:800; color:#1d4ed8;">
                            ${(s.consumoTotal || 0).toFixed(3)} M³
                        </span>
                        <small style="color:#64748b;">Consumo total registrado</small>
                    </div>
                `;
            } 
            else if (s.servicio === 'Electricidad') {
                colorBg = 'linear-gradient(135deg, #fffbeb, #fffdf5)';
                colorBorder = '#fde68a';
                colorText = '#b45309';
                servicioIcono = '⚡';
                servicioNombre = 'Electricidad';

                detalle = `
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        <span style="background:#fef3c7; color:#b45309; padding:5px 10px; border-radius:999px; font-size:0.75rem; font-weight:700;">
                            ${s.medidores?.length || 0} medidor(es)
                        </span>
                    </div>
                `;

                cantidad = `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-size:1rem; font-weight:800; color:#b45309;">
                            ${(s.consumoTotal || 0).toFixed(1)} kWh
                        </span>
                        <small style="color:#64748b;">Consumo eléctrico</small>
                    </div>
                `;
            } 
            else if (s.servicio === 'Gas') {
                const diasGas = s.dias || 30;
                const costoDiarioGas = diasGas > 0 ? ((s.monto || 0) / diasGas) : 0;

                colorBg = 'linear-gradient(135deg, #fff7ed, #fff1f2)';
                colorBorder = '#fdba74';
                colorText = '#dc2626';
                servicioIcono = '🔥';
                servicioNombre = 'Gas';

                detalle = `
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        <span style="background:#fee2e2; color:#b91c1c; padding:5px 10px; border-radius:999px; font-size:0.75rem; font-weight:700;">
                            🏢 ${s.proveedor || 'Sin proveedor'}
                        </span>
                        <span style="background:#fff7ed; color:#c2410c; padding:5px 10px; border-radius:999px; font-size:0.75rem; font-weight:700;">
                            🧾 Fact #${s.numeroFactura || '—'}
                        </span>
                    </div>
                `;

                cantidad = `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-size:1rem; font-weight:800; color:#dc2626;">
                            ₡${Math.round(costoDiarioGas).toLocaleString()}
                        </span>
                        <small style="color:#64748b;"></small>
                    </div>
                `;
            }

            html += `
                <div style="background:${colorBg}; border:1px solid ${colorBorder}; border-radius:22px; padding:18px; display:grid; grid-template-columns: 1.1fr 1fr 1fr auto; gap:16px; align-items:center;">
                    
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                            <span style="font-size:1.3rem;">${servicioIcono}</span>
                            <span style="font-size:1rem; font-weight:800; color:${colorText};">${servicioNombre}</span>
                        </div>
                        <div style="font-size:0.9rem; color:#475569;">
                            <strong>Fecha:</strong> ${fecha}
                        </div>
                        <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">
                            <strong>Medidor:</strong> ${s.medidor || 'No aplica'}
                        </div>
                    </div>

                    <div>
                        <div style="font-size:0.78rem; color:#64748b; margin-bottom:6px; font-weight:700;">DETALLE</div>
                        ${detalle}
                    </div>

                    <div>
                        <div style="font-size:0.78rem; color:#64748b; margin-bottom:6px; font-weight:700;">RESUMEN</div>
                        ${cantidad}
                    </div>

                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:12px;">
                        <div style="background:white; border:1px solid rgba(255,255,255,0.6); padding:12px 16px; border-radius:18px; box-shadow: 0 8px 20px rgba(15,23,42,0.06); text-align:right;">
                            <div style="font-size:0.72rem; color:#64748b; font-weight:700;">MONTO</div>
                            <div style="font-size:1.15rem; font-weight:900; color:#059669;">
                                ₡${Math.round(s.monto || 0).toLocaleString()}
                            </div>
                        </div>

                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-sm btn-outline" onclick="window.editarServicio('${local}','${s.id}')" style="border-radius: 12px;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="window.eliminarServicio('${local}','${s.id}')" style="border-radius: 12px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;
    }

    content.innerHTML = html;
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