// modules/costos.js - VERSIÓN CORREGIDA

// ============================================
// CONFIGURACIÓN DE COSTOS BASADA EN EXCEL
// ============================================

// Estructura de costos fijos por categoría y concepto
const COSTOS_CONFIG = {
    restaurante: {
        nombre: "COSTOS FIJOS DE RESTAURANTE",
        mostrarDiario: true,
        conceptos: [
            "Alquiler de local",
            "SECSA",
            "Soft Restaurante",
            "Internet del local (KOLBI)",
            "Television del local (KOLBI)",
            "Alarma (ADT)",
            "Fumigacion",
            "Poliza RT",
            "Depreciacion de activos",
            "Gasto por patente comercial",
            "Gasto por patente de licores",
            "Basura municipal",
            "Intereses por mora de patente",
            "Certificacion de gas",
            "Certificacion electrica",
            "Gasto por renovacion de permiso Ministerio de Salud",
            "Gasto por mantenimiento",
            "Hacienda IVA",
            "Asesoria legal RH",
            "Gasto x Honorarios Contabilidad asesoria",
            "Serv. Prof Publicidad",
            "Otros servicios profesionales"
        ]
    },
    planta: {
        nombre: "COSTOS FIJOS PLANTA PRODUCCION",
        mostrarDiario: false,
        conceptos: [
            "Electricidad planta de produccion",
            "Agua planta de produccion",
            "ADT planta de produccion",
            "Fumigacion planta de produccion",
            "Software SECSA planta de produccion",
            "IVA Hacienda 490",
            "Asesoria legal RH planta de produccion"
        ]
    },
    oficinas: {
        nombre: "COSTOS FIJOS OFICINAS",
        mostrarDiario: false,
        conceptos: [
            "Electricidad",
            "Agua",
            "Internet KOLBI",
            "Telefono central telefonica y celulares administrativos",
            "ADT",
            "Gastos por mantenimiento y papelería",
            "Software planilla, hosting y office 365"
        ]
    },
    transporte: {
        nombre: "COSTOS FIJOS TRANSPORTE",
        mostrarDiario: false,
        conceptos: [
            "Combustible logistica",
            "Electricidad de las bodegas del lavacar",
            "Agua de las bodegas del lavacar",
            "Alquiler de locales del taller",
            "GPS Navsat (transporte)",
            "Marchamos",
            "Dekra",
            "Mantenimiento de vehiculos"
        ]
    },
    planilla: {
        nombre: "PLANILLA BODEGA, OFICINAS",
        mostrarDiario: false,
        conceptos: [
            "Planilla bodega",
            "Alex Duque",
            "Poliza RT bodega y oficinas",
            "CCSS bodega y oficinas",
            "Planilla oficinas"
        ]
    }
};

// ============================================
// FUNCIÓN PARA OBTENER DÍAS DEL MES
// ============================================
function getDiasDelMes(fecha) {
    const year = fecha.getFullYear();
    const month = fecha.getMonth();
    return new Date(year, month + 1, 0).getDate();
}

// ============================================
// FUNCIÓN PARA FORMATEAR MES Y AÑO
// ============================================
function formatearMesAnio(fecha) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

// ============================================
// OBTENER FECHA SELECCIONADA PARA COSTOS
// ============================================
function getFechaCostos() {
    if (AppState.costosFechaSeleccionada) {
        return new Date(AppState.costosFechaSeleccionada);
    }
    return new Date();
}

// ============================================
// CARGAR COSTOS DESDE FIREBASE (Realtime Database)
// ============================================
function cargarCostosDesdeFirebase() {
    console.log('🔄 Cargando costos desde Firebase...');
    
    const costosRef = firebase.database().ref('costos');
    
    costosRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const costosData = {};
        
        console.log('📦 Datos de Firebase (costos):', data);
        
        if (data) {
            // La estructura es: costos -> [categoria: Oficinas/Planta/Planilla] -> [categoria interna] -> array
            for (const categoriaKey in data) {
                // categoriaKey puede ser: "Oficinas", "Planta", "Planilla"
                const categoriaData = data[categoriaKey];
                
                if (!costosData[categoriaKey]) {
                    costosData[categoriaKey] = {};
                }
                
                for (const subCategoria in categoriaData) {
                    // subCategoria puede ser: "oficinas", "planta", "planilla"
                    if (!costosData[categoriaKey][subCategoria]) {
                        costosData[categoriaKey][subCategoria] = [];
                    }
                    
                    for (const costoId in categoriaData[subCategoria]) {
                        costosData[categoriaKey][subCategoria].push({
                            id: costoId,
                            ...categoriaData[subCategoria][costoId]
                        });
                    }
                }
            }
            console.log('✅ Costos procesados:', costosData);
        } else {
            console.log('📭 No hay costos en Firebase');
        }
        
        window.costosData = costosData;
        
        if (document.getElementById('costos').classList.contains('active')) {
            renderCostos();
        }
        
        if (document.getElementById('dashboard').classList.contains('active') && typeof window.renderDashboard === 'function') {
            window.renderDashboard();
        }
    }, (error) => {
        console.error('❌ Error cargando costos:', error);
    });
}

// ============================================
// OBTENER COSTOS POR LOCAL (desde la estructura real)
// ============================================
function getCostosPorLocal(localNombre, categoriaKey, subCategoria) {
    const costosData = window.costosData || {};
    const costosCategoria = costosData[categoriaKey] || {};
    const costosArray = costosCategoria[subCategoria] || [];
    
    // Filtrar por el campo 'local' dentro de cada costo
    return costosArray.filter(costo => costo.local === localNombre);
}

// ============================================
// RENDERIZAR VISTA DE COSTOS (CON SELECTOR DE MES)
// ============================================
function renderCostos() {
    console.log('Renderizando costos...');
    const costosContent = document.getElementById('costosContent');
    if (!costosContent) return;

    const fechaSeleccionada = getFechaCostos();
    const diasDelMes = getDiasDelMes(fechaSeleccionada);
    const mesTexto = formatearMesAnio(fechaSeleccionada);
    const year = fechaSeleccionada.getFullYear();
    const month = fechaSeleccionada.getMonth();
    const fechaActual = new Date();
    const esMesActual =
        fechaSeleccionada.getMonth() === fechaActual.getMonth() &&
        fechaSeleccionada.getFullYear() === fechaActual.getFullYear();

    const filtroLocal = AppState.filtros?.local || 'Todos';
    const costosData = window.costosData || {};
    const localesPermitidos = getLocalesPermitidos();

    let totalGeneralMensual = 0;
    let totalGeneralDiario = 0;
    let bloquesHtml = '';

    let html = `
        <div class="card" style="padding: 20px 22px; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #f8fbff); border: 1px solid #e5eefb;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div>
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-coins" style="color: #2563eb;"></i>
                        Costos Fijos
                    </h2>
                    <p style="margin: 6px 0 0; color: #64748b;">
                        Vista mensual consolidada por categoría y local
                    </p>
                </div>

                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 10px; background: #eff6ff; padding: 8px 14px; border-radius: 14px; border: 1px solid #dbeafe;">
                        <i class="fas fa-calendar-alt" style="color: #2563eb;"></i>
                        <input
                            type="month"
                            id="mesSelectorCostos"
                            value="${year}-${String(month + 1).padStart(2, '0')}"
                            style="padding: 8px 10px; border: 1px solid #bfdbfe; border-radius: 10px; font-size: 0.92rem; background: white;"
                            onchange="cambiarMesCostos(this.value)"
                        >
                        ${!esMesActual ? `
                            <button class="btn btn-sm btn-outline" onclick="irAlMesActual()" title="Volver al mes actual">
                                <i class="fas fa-calendar-week"></i> Actual
                            </button>
                        ` : ''}
                    </div>

                    <button class="btn btn-primary" onclick="mostrarModalCosto()" style="border-radius: 12px; box-shadow: 0 8px 20px rgba(37,99,235,0.18);">
                        <i class="fas fa-plus"></i> Nuevo Costo
                    </button>
                </div>
            </div>
        </div>

        <div class="card" style="margin-bottom: 20px; padding: 16px 18px; background: ${esMesActual ? 'linear-gradient(135deg, #eff6ff, #eef2ff)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)'}; border-left: 5px solid ${esMesActual ? '#2563eb' : '#f59e0b'};">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${esMesActual ? 'fa-chart-line' : 'fa-history'}" style="color: ${esMesActual ? '#2563eb' : '#d97706'};"></i>
                    <div>
                        <div style="font-weight: 700; color: #1e293b;">Período: ${mesTexto}</div>
                        <div style="font-size: 0.92rem; color: #64748b;">${diasDelMes} días del mes</div>
                    </div>
                </div>
                ${!esMesActual ? `
                    <div style="font-size: 0.9rem; color: #b45309; font-weight: 600;">
                        Visualizando datos históricos
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    for (const [configKey, config] of Object.entries(COSTOS_CONFIG)) {
        const firebaseKey = configKey.charAt(0).toUpperCase() + configKey.slice(1);
        const costosCategoriaFirebase = costosData[firebaseKey] || {};
        const costosArray = costosCategoriaFirebase[configKey] || [];

        if (costosArray.length === 0 && filtroLocal !== 'Todos') continue;

        const costosPorLocal = {};
        costosArray.forEach(costo => {
            const localCosto = costo.local || 'Sin Local';
            if (!costosPorLocal[localCosto]) costosPorLocal[localCosto] = [];
            costosPorLocal[localCosto].push(costo);
        });

        const localesAMostrar = filtroLocal === 'Todos'
            ? Object.keys(costosPorLocal).filter(local => localesPermitidos.includes(local))
            : [filtroLocal].filter(l => costosPorLocal[l] && localesPermitidos.includes(l));

        if (localesAMostrar.length === 0 && filtroLocal !== 'Todos') continue;

        for (const localNombre of localesAMostrar) {
            const costosDelLocal = costosPorLocal[localNombre] || [];

            const costosMap = {};
            let totalMensualLocal = 0;

            costosDelLocal.forEach(costo => {
                costosMap[costo.concepto] = costo.monto || 0;
                totalMensualLocal += costo.monto || 0;
            });

            const totalDiarioLocal = config.mostrarDiario ? totalMensualLocal / diasDelMes : 0;
            totalGeneralMensual += totalMensualLocal;
            totalGeneralDiario += totalDiarioLocal;

            let filas = '';

            for (const concepto of config.conceptos) {
                const montoMensual = costosMap[concepto] || 0;
                const montoDiario = config.mostrarDiario ? montoMensual / diasDelMes : 0;

                filas += `
                    <tr class="costo-row" style="border-bottom: 1px solid #edf2f7; transition: background 0.2s ease;">
                        <td style="padding: 12px 14px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 32px; height: 32px; border-radius: 10px; background: #eff6ff; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-receipt" style="color: #2563eb; font-size: 0.8rem;"></i>
                                </div>
                                <span style="color: #1f2937; font-weight: 500;">${concepto}</span>
                            </div>
                        </td>

                        <td style="text-align: right; padding: 12px 14px; font-weight: 700; color: ${montoMensual > 0 ? '#111827' : '#9ca3af'};">
                            ${montoMensual > 0 ? `₡${montoMensual.toLocaleString()}` : '—'}
                        </td>

                        ${config.mostrarDiario ? `
                            <td style="text-align: right; padding: 12px 14px; font-weight: 600; color: ${montoMensual > 0 ? '#2563eb' : '#9ca3af'};">
                                ${montoMensual > 0 ? `₡${montoDiario.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </td>
                        ` : ''}

                        <td style="text-align: center; padding: 12px 14px;">
                            <div style="display: flex; justify-content: center; gap: 8px;">
                                <button
                                    class="btn btn-sm btn-outline"
                                    onclick="editarCosto('${localNombre}', '${firebaseKey}', '${configKey}', '${concepto.replace(/'/g, "\\'")}')"
                                    title="Editar"
                                    style="border-radius: 10px;"
                                >
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button
                                    class="btn btn-sm btn-danger"
                                    onclick="eliminarCostoPorConcepto('${localNombre}', '${firebaseKey}', '${configKey}', '${concepto.replace(/'/g, "\\'")}')"
                                    title="Eliminar"
                                    style="border-radius: 10px;"
                                >
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }

            bloquesHtml += `
                <div class="card" style="margin-bottom: 22px; padding: 0; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 18px 35px rgba(15,23,42,0.06);">
                    <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 18px 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                            <div>
                                <h3 style="margin: 0; font-size: 1.05rem;">${config.nombre}</h3>
                                <p style="margin: 5px 0 0; opacity: 0.88; font-size: 0.9rem;">
                                    ${localNombre}
                                </p>
                            </div>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <div style="background: rgba(255,255,255,0.14); padding: 10px 14px; border-radius: 14px;">
                                    <div style="font-size: 0.72rem; opacity: 0.8;">MENSUAL</div>
                                    <div style="font-size: 1rem; font-weight: 700;">₡${totalMensualLocal.toLocaleString()}</div>
                                </div>
                                ${config.mostrarDiario ? `
                                    <div style="background: rgba(255,255,255,0.14); padding: 10px 14px; border-radius: 14px;">
                                        <div style="font-size: 0.72rem; opacity: 0.8;">DIARIO</div>
                                        <div style="font-size: 1rem; font-weight: 700;">₡${totalDiarioLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div style="padding: 14px 16px 18px; background: #fff;">
                        <div class="table-container" style="border: none;">
                            <table class="table" style="min-width: 760px;">
                                <thead>
                                    <tr style="background: #f8fafc;">
                                        <th style="padding: 14px;">Concepto</th>
                                        <th style="text-align: right; padding: 14px;">Mensual</th>
                                        ${config.mostrarDiario ? `<th style="text-align: right; padding: 14px;">Diario</th>` : ''}
                                        <th style="text-align: center; padding: 14px;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filas}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    if (!bloquesHtml) {
        bloquesHtml = `
            <div class="card" style="padding: 48px 30px; text-align: center;">
                <div style="width: 84px; height: 84px; margin: 0 auto 18px; border-radius: 24px; background: #eff6ff; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-coins" style="font-size: 2rem; color: #2563eb;"></i>
                </div>
                <h3 style="margin-bottom: 8px;">No hay costos registrados</h3>
                <p style="color: #64748b; margin: 0 0 18px;">Haga clic en "Nuevo Costo" para comenzar</p>
                <button class="btn btn-primary" onclick="mostrarModalCosto()">
                    <i class="fas fa-plus"></i> Crear primer costo
                </button>
            </div>
        `;
    }

    html += bloquesHtml;

    if (totalGeneralMensual > 0) {
        html += `
            <div class="card" style="background: linear-gradient(135deg, #0f172a, #1d4ed8); color: white; border: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <h3 style="margin: 0 0 6px 0; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-chart-line"></i>
                            Total General Costos Fijos
                        </h3>
                        <p style="margin: 0; opacity: 0.85;">${mesTexto} · ${diasDelMes} días</p>
                    </div>
                    <div style="display: flex; gap: 14px; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.12); padding: 12px 16px; border-radius: 16px; min-width: 180px;">
                            <div style="font-size: 0.74rem; opacity: 0.8;">TOTAL MENSUAL</div>
                            <div style="font-size: 1.35rem; font-weight: 800;">₡${totalGeneralMensual.toLocaleString()}</div>
                        </div>
                        ${totalGeneralDiario > 0 ? `
                            <div style="background: rgba(255,255,255,0.12); padding: 12px 16px; border-radius: 16px; min-width: 180px;">
                                <div style="font-size: 0.74rem; opacity: 0.8;">TOTAL DIARIO</div>
                                <div style="font-size: 1.35rem; font-weight: 800;">₡${totalGeneralDiario.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    costosContent.innerHTML = html;
}

// ============================================
// CAMBIAR MES EN COSTOS
// ============================================
function cambiarMesCostos(mesValue) {
    if (!mesValue) return;
    
    const [year, month] = mesValue.split('-');
    const fecha = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    AppState.costosFechaSeleccionada = fecha;
    
    console.log('📅 Cambiando a mes:', formatearMesAnio(fecha));
    
    renderCostos();
    
    if (document.getElementById('dashboard').classList.contains('active') && typeof window.renderDashboard === 'function') {
        window.renderDashboard();
    }
}

// ============================================
// IR AL MES ACTUAL
// ============================================
function irAlMesActual() {
    delete AppState.costosFechaSeleccionada;
    
    console.log('📅 Volviendo al mes actual');
    
    const fechaActual = new Date();
    const mesSelector = document.getElementById('mesSelectorCostos');
    if (mesSelector) {
        mesSelector.value = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
    }
    
    renderCostos();
    
    if (document.getElementById('dashboard').classList.contains('active') && typeof window.renderDashboard === 'function') {
        window.renderDashboard();
    }
}

// ============================================
// MOSTRAR MODAL DE NUEVO COSTO
// ============================================
function mostrarModalCosto() {
    const modal = document.getElementById('costoModal');
    const overlay = document.getElementById('modalOverlay');
    
    // Limpiar campos
    document.getElementById('costoLocal').value = '';
    document.getElementById('costoCategoria').value = '';
    document.getElementById('costoConcepto').innerHTML = '<option value="">Seleccionar concepto...</option>';
    document.getElementById('costoMonto').value = '';
    
    document.getElementById('costoEditMode').value = '';
    document.getElementById('costoEditConceptoOriginal').value = '';
    
    // Cargar locales (desde los costos existentes o lista de locales)
    const selectLocal = document.getElementById('costoLocal');
    selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';

    const localesPermitidos = getLocalesPermitidos();
    const localesSistema = (AppState.locales || [])
        .map(local => typeof local === 'string' ? local : local.nombre)
        .filter(Boolean)
        .sort();

    if (localesSistema.length > 0) {
        localesSistema.forEach(local => {
            if (localesPermitidos.includes(local)) {
                selectLocal.innerHTML += `<option value="${local}">${local}</option>`;
            }
        });
    } else {
        selectLocal.innerHTML += `<option value="Parrillita Empanadazo">Parrillita Empanadazo</option>`;
    }
    
    if (esUsuario() && AppState.usuario?.local) {
        selectLocal.value = AppState.usuario.local;
        selectLocal.disabled = true;
    } else {
        selectLocal.disabled = false;
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// CARGAR CONCEPTOS POR CATEGORÍA
// ============================================
window.cargarConceptosPorCategoria = function(categoria) {
    const selectConcepto = document.getElementById('costoConcepto');
    if (!selectConcepto) return;
    
    const conceptos = COSTOS_CONFIG[categoria]?.conceptos || [];
    
    selectConcepto.innerHTML = '<option value="">Seleccionar concepto...</option>';
    
    conceptos.forEach(concepto => {
        const option = document.createElement('option');
        option.value = concepto;
        option.textContent = concepto;
        selectConcepto.appendChild(option);
    });
};

// ============================================
// GUARDAR COSTO EN FIREBASE
// ============================================
async function guardarCosto() {
    const local = document.getElementById('costoLocal').value;
    const categoria = document.getElementById('costoCategoria').value; // restaurante, planta, oficinas, etc.
    const concepto = document.getElementById('costoConcepto').value;
    const monto = parseFloat(document.getElementById('costoMonto').value);
    const editMode = document.getElementById('costoEditMode').value === 'true';
    const conceptoOriginal = document.getElementById('costoEditConceptoOriginal').value;
    
    // Mapear categoría a la clave de Firebase (primera letra mayúscula)
    const firebaseCategoriaKey = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    
    if (!local || !categoria || !concepto || isNaN(monto)) {
        alert('Complete todos los campos correctamente');
        return;
    }
    
    try {
        const costoData = {
            concepto,
            monto,
            local,
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString(),
            creadoPor: AppState.usuario?.email || 'sistema'
        };
        
        const refPath = `costos/${firebaseCategoriaKey}/${categoria}`;
        
        if (editMode && conceptoOriginal && conceptoOriginal !== concepto) {
            // Cambió el concepto - eliminar el anterior y crear nuevo
            const query = await firebase.database().ref(refPath).orderByChild('concepto').equalTo(conceptoOriginal).once('value');
            query.forEach(child => {
                child.ref.remove();
            });
            await firebase.database().ref(refPath).push(costoData);
        } else if (editMode) {
            // Editar - buscar por concepto y local
            const query = await firebase.database().ref(refPath).orderByChild('concepto').equalTo(concepto).once('value');
            let encontrado = false;
            query.forEach(child => {
                const childData = child.val();
                if (childData.local === local) {
                    child.ref.update({ monto, fechaActualizacion: new Date().toISOString() });
                    encontrado = true;
                }
            });
            if (!encontrado) {
                await firebase.database().ref(refPath).push(costoData);
            }
        } else {
            // Nuevo - verificar si ya existe para este local y concepto
            const query = await firebase.database().ref(refPath).orderByChild('concepto').equalTo(concepto).once('value');
            let existe = false;
            query.forEach(child => {
                if (child.val().local === local) {
                    existe = true;
                }
            });
            if (existe) {
                alert('⚠️ Este concepto ya existe para este local. Use la opción editar para modificar el monto.');
                return;
            }
            await firebase.database().ref(refPath).push(costoData);
        }
        
        alert('✅ Costo guardado correctamente');
        cerrarModal('costoModal');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    }
}

// ============================================
// EDITAR COSTO
// ============================================
async function editarCosto(local, firebaseCategoriaKey, categoria, concepto) {
    const modal = document.getElementById('costoModal');
    const overlay = document.getElementById('modalOverlay');

    if (!modal || !overlay) {
        alert('No se encontró el modal de costos');
        return;
    }

    const costosData = window.costosData || {};
    const costosCategoria = costosData[firebaseCategoriaKey] || {};
    const costosArray = costosCategoria[categoria] || [];

    const costoExistente = costosArray.find(c => c.concepto === concepto && c.local === local);

    if (!costoExistente) {
        alert('Costo no encontrado');
        return;
    }

    const inputLocal = document.getElementById('costoLocal');
    const inputCategoria = document.getElementById('costoCategoria');
    const inputConcepto = document.getElementById('costoConcepto');
    const inputMonto = document.getElementById('costoMonto');
    const inputEditMode = document.getElementById('costoEditMode');
    const inputConceptoOriginal = document.getElementById('costoEditConceptoOriginal');

    if (!inputLocal || !inputCategoria || !inputConcepto || !inputMonto || !inputEditMode || !inputConceptoOriginal) {
        alert('Faltan campos del formulario de costos');
        return;
    }

    inputLocal.value = local;
    inputCategoria.value = categoria;
    inputMonto.value = costoExistente.monto;
    inputEditMode.value = 'true';
    inputConceptoOriginal.value = concepto;

    const conceptos = COSTOS_CONFIG[categoria]?.conceptos || [];
    inputConcepto.innerHTML = '<option value="">Seleccionar concepto...</option>';

    conceptos.forEach(conc => {
        const option = document.createElement('option');
        option.value = conc;
        option.textContent = conc;
        if (conc === concepto) option.selected = true;
        inputConcepto.appendChild(option);
    });

    if (esUsuario() && AppState.usuario?.local) {
        inputLocal.disabled = true;
    } else {
        inputLocal.disabled = false;
    }

    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// ELIMINAR COSTO POR CONCEPTO
// ============================================
async function eliminarCostoPorConcepto(local, firebaseCategoriaKey, categoria, concepto) {
    if (!confirm(`¿Eliminar el costo "${concepto}" para ${local}?`)) return;
    
    try {
        const refPath = `costos/${firebaseCategoriaKey}/${categoria}`;
        const query = await firebase.database().ref(refPath).orderByChild('concepto').equalTo(concepto).once('value');
        
        query.forEach(child => {
            const childData = child.val();
            if (childData.local === local) {
                child.ref.remove();
            }
        });
        
        alert('✅ Costo eliminado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar');
    }
}

// ============================================
// ELIMINAR COSTO (POR ID) - COMPATIBILIDAD
// ============================================
async function eliminarCosto(local, categoria, id) {
    if (!confirm('¿Eliminar costo?')) return;
    try {
        await firebase.database().ref(`costos/${local}/${categoria}/${id}`).remove();
        alert('✅ Eliminado');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// OBTENER COSTOS PARA DASHBOARD
// ============================================
function getCostosParaDashboard() {
    const costosData = window.costosData || {};
    const fechaSeleccionada = getFechaCostos();
    const diasDelMes = getDiasDelMes(fechaSeleccionada);
    
    const resultado = {
        restaurante: { mensual: 0, diario: 0 },
        planta: { mensual: 0 },
        oficinas: { mensual: 0 },
        transporte: { mensual: 0 },
        planilla: { mensual: 0 },
        total: { mensual: 0, diario: 0 },
        mes: formatearMesAnio(fechaSeleccionada),
        dias: diasDelMes,
        fecha: fechaSeleccionada
    };
    
    for (const [categoria, config] of Object.entries(COSTOS_CONFIG)) {
        const firebaseKey = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        const costosCategoriaFirebase = costosData[firebaseKey] || {};
        const costosArray = costosCategoriaFirebase[categoria] || [];
        
        let totalMensual = 0;
        costosArray.forEach(costo => {
            totalMensual += costo.monto || 0;
        });
        
        if (config.mostrarDiario) {
            resultado[categoria] = {
                mensual: totalMensual,
                diario: totalMensual / diasDelMes
            };
            resultado.total.diario += totalMensual / diasDelMes;
        } else {
            resultado[categoria] = { mensual: totalMensual };
        }
        resultado.total.mensual += totalMensual;
    }
    
    return resultado;
}

// ============================================
// INICIALIZAR
// ============================================
function initCostos() {
    console.log('Inicializando costos...');
    cargarCostosDesdeFirebase();
}

// ============================================
// HACER FUNCIONES GLOBALES
// ============================================
window.renderCostos = renderCostos;
window.mostrarModalCosto = mostrarModalCosto;
window.guardarCosto = guardarCosto;
window.editarCosto = editarCosto;
window.eliminarCosto = eliminarCosto;
window.eliminarCostoPorConcepto = eliminarCostoPorConcepto;
window.cargarCostosDesdeFirebase = cargarCostosDesdeFirebase;
window.cargarConceptosPorCategoria = cargarConceptosPorCategoria;
window.cambiarMesCostos = cambiarMesCostos;
window.irAlMesActual = irAlMesActual;
window.getCostosParaDashboard = getCostosParaDashboard;
window.initCostos = initCostos;