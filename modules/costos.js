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
            "Agua oficinas",
            "Electricidad oficinas",
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
            "Marchamos (3 busetas, 3 camiones, 2 motos, clio)",
            "Dekra (3 busetas, 3 camiones, 2 motos, clio)",
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
    
    // Obtener fecha seleccionada
    const fechaSeleccionada = getFechaCostos();
    const diasDelMes = getDiasDelMes(fechaSeleccionada);
    const mesTexto = formatearMesAnio(fechaSeleccionada);
    const year = fechaSeleccionada.getFullYear();
    const month = fechaSeleccionada.getMonth();
    const fechaActual = new Date();
    const esMesActual = fechaSeleccionada.getMonth() === fechaActual.getMonth() && 
                        fechaSeleccionada.getFullYear() === fechaActual.getFullYear();
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const costosData = window.costosData || {};
    
    console.log('📅 Mes seleccionado:', mesTexto, 'Días:', diasDelMes);
    console.log('📍 Filtro local:', filtroLocal);
    console.log('📦 costosData disponible:', costosData);
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-coins"></i> Costos Fijos</h2>
            <div style="display: flex; gap: 10px; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px; background: #f3f4f6; padding: 5px 15px; border-radius: 8px;">
                    <i class="fas fa-calendar-alt" style="color: #4b5563;"></i>
                    <input type="month" id="mesSelectorCostos" value="${year}-${String(month + 1).padStart(2, '0')}" 
                           style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem;"
                           onchange="cambiarMesCostos(this.value)">
                    ${!esMesActual ? '<button class="btn btn-sm btn-outline" onclick="irAlMesActual()" style="margin-left: 5px;" title="Volver al mes actual"><i class="fas fa-calendar-week"></i> Actual</button>' : ''}
                </div>
                <button class="btn btn-primary" onclick="mostrarModalCosto()">
                    <i class="fas fa-plus"></i> Nuevo Costo
                </button>
            </div>
        </div>
        <div style="margin-bottom: 20px; padding: 10px 15px; background: ${esMesActual ? '#eef2ff' : '#fef3c7'}; border-radius: 8px; border-left: 4px solid ${esMesActual ? '#3b82f6' : '#f59e0b'};">
            <i class="fas fa-chart-line"></i> 
            <strong>Período:</strong> ${mesTexto} | 
            <strong>Días del mes:</strong> ${diasDelMes}
            ${!esMesActual ? ' | <span style="color: #f59e0b;"><i class="fas fa-history"></i> Visualizando datos de un mes anterior</span>' : ''}
        </div>
    `;
    
    // Obtener locales permitidos desde AppState
    const localesPermitidos = getLocalesPermitidos();
    
    // Determinar qué categorías mostrar según filtro local
    // Mapeo de categoría Firebase a clave en COSTOS_CONFIG
    const categoriaMapping = {
        'Oficinas': 'oficinas',
        'Planta': 'planta',
        'Planilla': 'planilla',
        'Restaurante': 'restaurante',
        'Transporte': 'transporte'
    };
    
    let totalGeneralMensual = 0;
    let totalGeneralDiario = 0;
    
    // Iterar sobre las categorías de COSTOS_CONFIG que corresponden a Firebase
    for (const [configKey, config] of Object.entries(COSTOS_CONFIG)) {
        // Encontrar la categoría en Firebase que corresponde (primera letra mayúscula)
        const firebaseKey = configKey.charAt(0).toUpperCase() + configKey.slice(1);
        
        // Verificar si debemos mostrar esta categoría según filtro local
        // Si el filtro es "Todos", mostramos todas las categorías
        // Si no, solo mostramos si el local coincide con el local de los costos
        // Nota: En tu estructura, los costos tienen un campo "local" que indica el local real
        
        // Obtener todos los costos de esta categoría desde Firebase
        const costosCategoriaFirebase = costosData[firebaseKey] || {};
        const subCategoria = configKey; // 'restaurante', 'planta', etc.
        const costosArray = costosCategoriaFirebase[subCategoria] || [];
        
        // Si no hay costos en esta categoría, podemos saltar o mostrar vacío
        if (costosArray.length === 0 && filtroLocal !== 'Todos') {
            continue;
        }
        
        // Agrupar costos por local real (el campo 'local' dentro de cada costo)
        const costosPorLocal = {};
        costosArray.forEach(costo => {
            const localCosto = costo.local || 'Sin Local';
            if (!costosPorLocal[localCosto]) {
                costosPorLocal[localCosto] = [];
            }
            costosPorLocal[localCosto].push(costo);
        });
        
        // Determinar qué locales mostrar
        const localesAMostrar = filtroLocal === 'Todos' 
            ? Object.keys(costosPorLocal).filter(local => localesPermitidos.includes(local))
            : [filtroLocal].filter(l => costosPorLocal[l] && localesPermitidos.includes(l));
        
        if (localesAMostrar.length === 0 && filtroLocal !== 'Todos') {
            continue;
        }
        
        // Para cada local con costos en esta categoría
        for (const localNombre of localesAMostrar) {
            const costosDelLocal = costosPorLocal[localNombre] || [];
            
            // Crear un mapa de concepto -> monto
            const costosMap = {};
            let totalMensualLocal = 0;
            costosDelLocal.forEach(costo => {
                costosMap[costo.concepto] = costo.monto || 0;
                totalMensualLocal += costo.monto || 0;
            });
            
            const totalDiarioLocal = config.mostrarDiario ? totalMensualLocal / diasDelMes : 0;
            totalGeneralMensual += totalMensualLocal;
            totalGeneralDiario += totalDiarioLocal;
            
            // Columnas según si muestra diario
            const columnas = config.mostrarDiario 
                ? `<th style="text-align: right; padding: 12px; width: 150px;">Mensual (₡)</th>
                   <th style="text-align: right; padding: 12px; width: 150px;">Diario (₡)</th>`
                : `<th style="text-align: right; padding: 12px; width: 200px;">Mensual (₡)</th>`;
            
            const columnasAcciones = `<th style="text-align: center; padding: 12px; width: 80px;">Acciones</th>`;
            
            html += `
                <div class="card" style="margin-bottom: 20px; overflow-x: auto;">
                    <h3 style="background: #1e3a8a; color: white; margin: -15px -20px 15px -20px; padding: 12px 20px; border-radius: 12px 12px 0 0;">
                        ${config.nombre} - ${localNombre}
                    </h3>
                    <table class="table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="text-align: left; padding: 12px;">Concepto</th>
                                ${columnas}
                                ${columnasAcciones}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Mostrar cada concepto de la configuración
            for (const concepto of config.conceptos) {
                const montoMensual = costosMap[concepto] || 0;
                const montoDiario = config.mostrarDiario ? montoMensual / diasDelMes : 0;
                
                html += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 10px 12px;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-receipt" style="color: #6b7280; font-size: 0.8rem;"></i>
                                ${concepto}
                            </span>
                        </td>
                        <td style="text-align: right; padding: 10px 12px;">
                            ${montoMensual > 0 ? `₡${montoMensual.toLocaleString()}` : '<span style="color: #9ca3af;">-</span>'}
                        </td>
                `;
                
                if (config.mostrarDiario) {
                    html += `
                        <td style="text-align: right; padding: 10px 12px;">
                            ${montoMensual > 0 ? `₡${montoDiario.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '<span style="color: #9ca3af;">-</span>'}
                        </td>
                    `;
                }
                
                html += `
                        <td style="text-align: center; padding: 10px 12px;">
                            <button class="btn btn-sm btn-outline" onclick="editarCosto('${localNombre}', '${firebaseKey}', '${configKey}', '${concepto}')" style="margin-right: 5px;" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarCostoPorConcepto('${localNombre}', '${firebaseKey}', '${configKey}', '${concepto}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            // Fila de total por categoría/local
            html += `
                <tr style="background: #eef2ff; font-weight: bold; border-top: 2px solid #cbd5e1;">
                    <td style="padding: 12px;"><i class="fas fa-calculator"></i> TOTAL ${config.nombre} - ${localNombre}</td>
                    <td style="text-align: right; padding: 12px;">₡${totalMensualLocal.toLocaleString()}</td>
            `;
            
            if (config.mostrarDiario) {
                html += `<td style="text-align: right; padding: 12px;">₡${totalDiarioLocal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>`;
            }
            
            html += `<td style="text-align: center;"></td></tr>`;
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
    
    // Si no hay datos mostrados
    if (totalGeneralMensual === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-coins" style="font-size: 4rem; color: #9ca3af;"></i>
                <h3>No hay costos registrados</h3>
                <p>Haga clic en "Nuevo Costo" para comenzar</p>
            </div>
        `;
    } else {
        // Totales generales
        html += `
            <div class="card" style="background: linear-gradient(135deg, #1e3a8a, #1e40af); color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h3 style="margin: 0 0 5px 0;"><i class="fas fa-chart-line"></i> TOTAL GENERAL COSTOS FIJOS</h3>
                        <p style="margin: 0; opacity: 0.9;">Período: ${mesTexto} (${diasDelMes} días)</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.1rem;">Mensual: <strong>₡${totalGeneralMensual.toLocaleString()}</strong></div>
                        ${totalGeneralDiario > 0 ? `<div style="font-size: 1.1rem;">Diario (Restaurante): <strong>₡${totalGeneralDiario.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>` : ''}
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
    
    // Obtener locales únicos de los costos existentes
    const costosData = window.costosData || {};
    const localesUnicos = new Set();
    
    Object.keys(costosData).forEach(categoriaKey => {
        Object.keys(costosData[categoriaKey]).forEach(subCat => {
            costosData[categoriaKey][subCat].forEach(costo => {
                if (costo.local) localesUnicos.add(costo.local);
            });
        });
    });
    
    const localesPermitidos = getLocalesPermitidos();
    const localesOrdenados = Array.from(localesUnicos).sort();
    
    if (localesOrdenados.length === 0) {
        selectLocal.innerHTML += `<option value="Parrillita Empanadazo">Parrillita Empanadazo</option>`;
    } else {
        localesOrdenados.forEach(local => {
            if (localesPermitidos.includes(local)) {
                selectLocal.innerHTML += `<option value="${local}">${local}</option>`;
            }
        });
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
    
    const costosData = window.costosData || {};
    const costosCategoria = costosData[firebaseCategoriaKey] || {};
    const costosArray = costosCategoria[categoria] || [];
    
    const costoExistente = costosArray.find(c => c.concepto === concepto && c.local === local);
    
    if (!costoExistente) {
        alert('Costo no encontrado');
        return;
    }
    
    document.getElementById('costoLocal').value = local;
    document.getElementById('costoCategoria').value = categoria;
    document.getElementById('costoMonto').value = costoExistente.monto;
    document.getElementById('costoEditMode').value = 'true';
    document.getElementById('costoEditConceptoOriginal').value = concepto;
    
    const selectConcepto = document.getElementById('costoConcepto');
    const conceptos = COSTOS_CONFIG[categoria]?.conceptos || [];
    selectConcepto.innerHTML = '<option value="">Seleccionar concepto...</option>';
    conceptos.forEach(conc => {
        const option = document.createElement('option');
        option.value = conc;
        option.textContent = conc;
        if (conc === concepto) {
            option.selected = true;
        }
        selectConcepto.appendChild(option);
    });
    
    if (esUsuario() && AppState.usuario?.local) {
        document.getElementById('costoLocal').disabled = true;
    } else {
        document.getElementById('costoLocal').disabled = false;
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