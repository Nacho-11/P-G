// modules/servicios.js - VERSIÓN MODIFICADA
// Gas ahora solo tiene FECHA y MONTO

// ============================================
// CONFIGURACIÓN DE SERVICIOS
// ============================================
const TIPOS_SERVICIO = {
    AGUA: 'Agua',
    ELECTRICIDAD: 'Electricidad',
    GAS: 'Gas'
};

// Precios por defecto (solo Agua y Electricidad)
const PRECIOS_DEFAULT = {
    Agua: 1500,      // ₡ por M³
    Electricidad: 120 // ₡ por kWh
    // Gas no tiene precio fijo, solo monto de factura
};

// ============================================
// FUNCIÓN AUXILIAR PARA LIMPIAR FECHAS
// ============================================
function limpiarFecha(fecha) {
    if (!fecha) return '';
    return fecha.split('T')[0];
}

// ============================================
// CARGAR SERVICIOS DESDE FIREBASE
// ============================================
function cargarServiciosDesdeFirebase() {
    console.log('🔄 Cargando servicios desde Firebase...');
    
    const serviciosRef = firebase.database().ref('servicios');
    
    serviciosRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const serviciosData = {};
        
        if (data) {
            for (const local in data) {
                serviciosData[local] = [];
                for (const servicioId in data[local]) {
                    serviciosData[local].push({
                        id: servicioId,
                        ...data[local][servicioId]
                    });
                }
            }
            console.log('✅ Servicios cargados:', serviciosData);
        }
        
        window.serviciosData = serviciosData;
        
        // Siempre renderizar si el módulo está activo
        if (document.getElementById('servicios').classList.contains('active')) {
            renderServicios();
        }
    });
}

// ============================================
// RENDERIZAR VISTA DE SERVICIOS (MODIFICADO PARA GAS SIMPLE)
// ============================================
function renderServicios() {
    console.log('📊 Renderizando servicios...');
    const serviciosContent = document.getElementById('serviciosContent');
    if (!serviciosContent) {
        console.error('❌ No se encontró serviciosContent');
        return;
    }
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    const serviciosData = window.serviciosData || {};
    
    // Calcular fechas para filtros
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
                ${esGerencia() ? `
                    <button class="btn btn-outline" onclick="window.configurarPrecios()">
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
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-bolt" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3>No hay servicios registrados</h3>
                <p>Haga clic en "Nuevo Servicio" para agregar uno.</p>
            </div>
        `;
        serviciosContent.innerHTML = html;
        return;
    }
    
    const localesPermitidos = getLocalesPermitidos();
    const localesAMostrar = filtroLocal === 'Todos' 
        ? Object.keys(serviciosData).filter(local => puedeVerLocal(local))
        : [filtroLocal].filter(l => puedeVerLocal(l) && serviciosData[l]);
    
    if (localesAMostrar.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-bolt" style="font-size: 4rem; color: #9ca3af;"></i>
                <h3>No hay servicios para ${filtroLocal}</h3>
                <p>Verifique que tiene permisos para ver este local.</p>
            </div>
        `;
        serviciosContent.innerHTML = html;
        return;
    }
    
    let totalGeneral = 0;
    let resumen = { 
        Agua: { consumo: 0, monto: 0 }, 
        Electricidad: { consumo: 0, monto: 0 }, 
        Gas: { monto: 0 }  // Gas ya no tiene cantidad
    };
    let hayRegistrosVisibles = false;
    
    for (const local of localesAMostrar) {
        const servicios = serviciosData[local] || [];
        
        // Filtrar por fecha
        const serviciosFiltrados = servicios.filter(s => {
            const fechaServicio = limpiarFecha(s.fecha);
            if (!fechaServicio) return false;
            
            if (filtroTiempo === 'todos') return true;
            if (filtroTiempo === 'ayer') return fechaServicio === ayerStr;
            if (filtroTiempo === 'mes') return fechaServicio.substring(0, 7) === mesActual;
            if (filtroTiempo === 'anio') return fechaServicio.substring(0, 4) === anioActual;
            if (filtroTiempo === 'personalizado') return fechaServicio === AppState.filtros?.fechaPersonalizada;
            
            return true;
        });
        
        if (serviciosFiltrados.length === 0) continue;
        
        hayRegistrosVisibles = true;
        
        html += `
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: var(--primary);">
                        <i class="fas fa-store"></i> ${local}
                    </h3>
                    <span style="background: #e0f2fe; padding: 5px 15px; border-radius: 20px;">
                        ${serviciosFiltrados.length} registros
                    </span>
                </div>
                
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Servicio</th>
                                <th>Medidor</th>
                                <th>Detalle</th>
                                <th>Consumo/Cantidad</th>
                                <th>Monto (₡)</th>
                                <th>Precio Unit.</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        serviciosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(s => {
            const fecha = new Date(s.fecha + 'T12:00:00').toLocaleDateString('es-CR');
            
            let detalle = '';
            let cantidad = 0;
            let unidad = '';
            let precioUnitario = '';
            
            if (s.servicio === 'Agua') {
                const consumoMisc = s.consumoMisc?.toFixed(3) || '0.000';
                const consumoOp = s.consumoOp?.toFixed(3) || '0.000';
                const consumoCerrado = s.consumoCerrado?.toFixed(3) || '0.000';
                
                detalle = `⬆️ Misc: ${consumoMisc} M³ | ⬆️ Op: ${consumoOp} M³ | ⬆️ Cierre: ${consumoCerrado} M³`;
                cantidad = s.consumo || 0;
                unidad = 'M³';
                precioUnitario = s.precioUnitario ? `₡${s.precioUnitario}/M³` : '—';
            } 
            else if (s.servicio === 'Electricidad') {
                const apertura = s.apertura?.toFixed(1) || '0.0';
                const cierre = s.cierre?.toFixed(1) || '0.0';
                const consumo = s.consumo?.toFixed(1) || '0.0';
                
                detalle = `📊 Apertura: ${apertura} kWh | Cierre: ${cierre} kWh | Consumo: ${consumo} kWh`;
                cantidad = s.consumo || 0;
                unidad = 'kWh';
                precioUnitario = s.precioUnitario ? `₡${s.precioUnitario}/kWh` : '—';
            }
            else if (s.servicio === 'Gas') {
                // GAS SIMPLE: solo muestra el monto de la factura
                detalle = `Factura de gas - ${s.proveedor || 'Proveedor no especificado'}`;
                cantidad = 0;  // Ya no mostramos cantidad
                unidad = '';   // Sin unidad
                precioUnitario = '—';  // Sin precio unitario
            }
            
            totalGeneral += (s.monto || 0);
            if (s.servicio === 'Agua') {
                resumen.Agua.consumo += (s.consumo || 0);
                resumen.Agua.monto += (s.monto || 0);
            } else if (s.servicio === 'Electricidad') {
                resumen.Electricidad.consumo += (s.consumo || 0);
                resumen.Electricidad.monto += (s.monto || 0);
            } else if (s.servicio === 'Gas') {
                resumen.Gas.monto += (s.monto || 0);
            }
            
            html += `
                <tr>
                    <td><strong>${fecha}</strong></td>
                    <td>
                        <span style="display: flex; align-items: center; gap: 5px;">
                            ${s.servicio === 'Agua' ? '<i class="fas fa-water" style="color: #3b82f6;"></i>' : ''}
                            ${s.servicio === 'Electricidad' ? '<i class="fas fa-bolt" style="color: #f59e0b;"></i>' : ''}
                            ${s.servicio === 'Gas' ? '<i class="fas fa-fire" style="color: #ef4444;"></i>' : ''}
                            ${s.servicio}
                        </span>
                    </td>
                    <td>${s.medidor || '—'}</td>
                    <td><small>${detalle}</small></td>
                    <td>
                        ${cantidad > 0 ? `<strong>${cantidad.toFixed(3)} ${unidad}</strong>` : '—'}
                    </td>
                    <td style="font-weight: 600; color: #059669;">₡${(s.monto || 0).toLocaleString()}</td>
                    <td><small>${precioUnitario}</small></td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm btn-outline" onclick="window.editarServicio('${local}', '${s.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${esGerencia() ? `
                                <button class="btn btn-sm btn-danger" onclick="window.eliminarServicio('${local}', '${s.id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table></div>`;
        
        const totalLocal = serviciosFiltrados.reduce((sum, s) => sum + (s.monto || 0), 0);
        html += `<div style="text-align: right; margin-top: 10px;"><strong>Total ${local}: ₡${totalLocal.toLocaleString()}</strong></div>`;
    }
    
    if (!hayRegistrosVisibles) {
        html += `
            <div class="card" style="background: #f1f5f9; color: #64748b; text-align: center; padding: 30px;">
                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <h3>No hay servicios para el período seleccionado</h3>
                <p>Cambie los filtros de fecha para ver más registros.</p>
            </div>
        `;
    } else {
        // Resumen general
        html += `
            <div class="card" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; margin-top: 20px;">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center;">
                    <div>
                        <div>TOTAL GENERAL</div>
                        <div style="font-size: 1.8rem; font-weight: bold;">₡${totalGeneral.toLocaleString()}</div>
                    </div>
                    <div>
                        <div><i class="fas fa-water"></i> AGUA</div>
                        <div>${resumen.Agua.consumo.toFixed(1)} M³</div>
                        <div>₡${resumen.Agua.monto.toLocaleString()}</div>
                    </div>
                    <div>
                        <div><i class="fas fa-bolt"></i> ELECT.</div>
                        <div>${resumen.Electricidad.consumo.toFixed(0)} kWh</div>
                        <div>₡${resumen.Electricidad.monto.toLocaleString()}</div>
                    </div>
                    <div>
                        <div><i class="fas fa-fire"></i> GAS</div>
                        <div>—</div>
                        <div>₡${resumen.Gas.monto.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    serviciosContent.innerHTML = html;
}

// ============================================
// MOSTRAR MODAL NUEVO SERVICIO (GAS SIMPLIFICADO)
// ============================================
function mostrarModalServicio(editLocal = null, editId = null) {
    console.log('📝 Mostrando modal servicio:', { editLocal, editId });
    
    const modal = document.getElementById('servicioModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) {
        console.error('❌ No se encontró el modal o el overlay');
        alert('Error: No se encontró el modal de servicio');
        return;
    }
    
    // Limpiar formulario
    const fechaInput = document.getElementById('servicioFecha');
    if (fechaInput) {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        fechaInput.value = `${año}-${mes}-${dia}`;
    }
    
    const tipoInput = document.getElementById('servicioTipo');
    if (tipoInput) tipoInput.value = '';
    
    const medidorInput = document.getElementById('servicioMedidor');
    if (medidorInput) medidorInput.value = '';
    
    const montoInput = document.getElementById('servicioMonto');
    if (montoInput) montoInput.value = '';
    
    // Limpiar campos específicos
    if (document.getElementById('aguaMiscApertura')) document.getElementById('aguaMiscApertura').value = '';
    if (document.getElementById('aguaMiscCierre')) document.getElementById('aguaMiscCierre').value = '';
    if (document.getElementById('aguaOpApertura')) document.getElementById('aguaOpApertura').value = '';
    if (document.getElementById('aguaOpCierre')) document.getElementById('aguaOpCierre').value = '';
    if (document.getElementById('aguaCerradoApertura')) document.getElementById('aguaCerradoApertura').value = '';
    if (document.getElementById('aguaCerradoCierre')) document.getElementById('aguaCerradoCierre').value = '';
    if (document.getElementById('energiaApertura')) document.getElementById('energiaApertura').value = '';
    if (document.getElementById('energiaCierre')) document.getElementById('energiaCierre').value = '';
    
    // CAMPOS DE GAS SIMPLIFICADOS
    if (document.getElementById('gasProveedor')) document.getElementById('gasProveedor').value = '';
    if (document.getElementById('gasNumeroFactura')) document.getElementById('gasNumeroFactura').value = '';
    if (document.getElementById('gasMonto')) document.getElementById('gasMonto').value = '';
    
    // Ocultar todas las secciones
    if (document.getElementById('seccionAgua')) document.getElementById('seccionAgua').style.display = 'none';
    if (document.getElementById('seccionElectricidad')) document.getElementById('seccionElectricidad').style.display = 'none';
    if (document.getElementById('seccionGas')) document.getElementById('seccionGas').style.display = 'none';
    
    // Cargar locales
    const selectLocal = document.getElementById('servicioLocal');
    if (selectLocal) {
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
    }
    
    cargarPreciosEnModal();
    inicializarCamposAgua();
    
    // Si es edición, cargar datos
    if (editLocal && editId && window.serviciosData) {
        const servicio = window.serviciosData[editLocal]?.find(s => s.id === editId);
        
        if (servicio) {
            console.log('✅ Servicio encontrado:', servicio);
            
            if (selectLocal) {
                selectLocal.value = editLocal;
                selectLocal.disabled = true;
            }
            
            if (fechaInput) {
                fechaInput.value = servicio.fecha || '';
                fechaInput.disabled = true;
                fechaInput.style.background = '#f1f5f9';
                fechaInput.style.cursor = 'not-allowed';
            }
            
            if (tipoInput) {
                tipoInput.value = servicio.servicio || '';
                tipoInput.disabled = true;
                tipoInput.style.background = '#f1f5f9';
                tipoInput.style.cursor = 'not-allowed';
            }
            
            if (medidorInput) medidorInput.value = servicio.medidor || '';

            if (servicio.servicio === 'Agua') {
                if (document.getElementById('seccionAgua')) document.getElementById('seccionAgua').style.display = 'block';
                if (document.getElementById('aguaMiscApertura')) document.getElementById('aguaMiscApertura').value = servicio.miscApertura || 0;
                if (document.getElementById('aguaMiscCierre')) document.getElementById('aguaMiscCierre').value = servicio.miscCierre || 0;
                if (document.getElementById('aguaOpApertura')) document.getElementById('aguaOpApertura').value = servicio.opApertura || 0;
                if (document.getElementById('aguaOpCierre')) document.getElementById('aguaOpCierre').value = servicio.opCierre || 0;
                if (document.getElementById('aguaCerradoApertura')) document.getElementById('aguaCerradoApertura').value = servicio.cerradoApertura || 0;
                if (document.getElementById('aguaCerradoCierre')) document.getElementById('aguaCerradoCierre').value = servicio.cerradoCierre || 0;
                calcularConsumoAgua();
            } 
            else if (servicio.servicio === 'Electricidad') {
                if (document.getElementById('seccionElectricidad')) document.getElementById('seccionElectricidad').style.display = 'block';
                if (document.getElementById('energiaApertura')) document.getElementById('energiaApertura').value = servicio.apertura || 0;
                if (document.getElementById('energiaCierre')) document.getElementById('energiaCierre').value = servicio.cierre || 0;
                calcularConsumoEnergia();
            } 
            else if (servicio.servicio === 'Gas') {
                if (document.getElementById('seccionGas')) document.getElementById('seccionGas').style.display = 'block';
                if (document.getElementById('gasProveedor')) document.getElementById('gasProveedor').value = servicio.proveedor || '';
                if (document.getElementById('gasNumeroFactura')) document.getElementById('gasNumeroFactura').value = servicio.numeroFactura || '';
                if (document.getElementById('gasMonto')) document.getElementById('gasMonto').value = servicio.monto || 0;
                
                // Actualizar monto en el campo principal
                if (montoInput) montoInput.value = servicio.monto || 0;
            }
            
            modal.dataset.editLocal = editLocal;
            modal.dataset.editId = editId;
            
            const modalTitle = document.getElementById('servicioModalTitle');
            if (modalTitle) modalTitle.textContent = 'Editar Servicio';
            
            const submitBtn = document.getElementById('servicioSubmitBtn');
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Servicio';
        }
    } else {
        delete modal.dataset.editLocal;
        delete modal.dataset.editId;
        
        if (fechaInput) {
            fechaInput.disabled = false;
            fechaInput.style.background = 'white';
        }
        if (tipoInput) {
            tipoInput.disabled = false;
            tipoInput.style.background = 'white';
        }
        
        const modalTitle = document.getElementById('servicioModalTitle');
        if (modalTitle) modalTitle.textContent = 'Registrar Servicio';
        
        const submitBtn = document.getElementById('servicioSubmitBtn');
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Servicio';
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// CAMBIAR TIPO DE SERVICIO EN MODAL (GAS SIMPLIFICADO)
// ============================================
function cambiarTipoServicio() {
    const tipo = document.getElementById('servicioTipo')?.value;
    const seccionAgua = document.getElementById('seccionAgua');
    const seccionElectricidad = document.getElementById('seccionElectricidad');
    const seccionGas = document.getElementById('seccionGas');
    const icon = document.getElementById('servicioModalIcon');
    
    // Elementos del medidor
    const medidorContainer = document.getElementById('servicioMedidor')?.closest('div[style*="background: white; border-radius: 16px;"]');
    const medidorInput = document.getElementById('servicioMedidor');
    
    if (seccionAgua) seccionAgua.style.display = 'none';
    if (seccionElectricidad) seccionElectricidad.style.display = 'none';
    if (seccionGas) seccionGas.style.display = 'none';
    
    if (tipo === 'Agua') {
        if (seccionAgua) seccionAgua.style.display = 'block';
        if (icon) { icon.className = 'fas fa-water'; icon.style.color = '#3b82f6'; }
        // Mostrar campo de medidor
        if (medidorContainer) medidorContainer.style.display = 'block';
        if (medidorInput) medidorInput.disabled = false;
        inicializarCamposAgua();
        calcularConsumoAgua();
    } 
    else if (tipo === 'Electricidad') {
        if (seccionElectricidad) seccionElectricidad.style.display = 'block';
        if (icon) { icon.className = 'fas fa-bolt'; icon.style.color = '#f59e0b'; }
        // Mostrar campo de medidor
        if (medidorContainer) medidorContainer.style.display = 'block';
        if (medidorInput) medidorInput.disabled = false;
        calcularConsumoEnergia();
    } 
    else if (tipo === 'Gas') {
        if (seccionGas) seccionGas.style.display = 'block';
        if (icon) { icon.className = 'fas fa-fire'; icon.style.color = '#ef4444'; }
        // Ocultar campo de medidor para Gas
        if (medidorContainer) medidorContainer.style.display = 'none';
        if (medidorInput) {
            medidorInput.disabled = true;
            medidorInput.value = ''; // Limpiar valor
        }
        inicializarCamposGas();
        // Gas no necesita cálculos automáticos
    }
}

// ============================================
// FUNCIÓN DE GAS - SIN RESTRICCIONES
// ============================================
function calcularGas() {
    // Obtener el monto directamente, sin ninguna transformación
    const montoInput = document.getElementById('gasMonto');
    let monto = 0;
    
    if (montoInput) {
        // Leer el valor como número, permitiendo decimales
        monto = parseFloat(montoInput.value);
        // Si no es un número válido, poner 0
        if (isNaN(monto)) monto = 0;
    }
    
    // Actualizar preview del monto (sin redondear, mostrar exacto)
    const previewDiv = document.getElementById('gasMontoPreview');
    const totalPreview = document.getElementById('gasTotalPreview');
    
    if (monto > 0) {
        if (previewDiv) previewDiv.style.display = 'block';
        if (totalPreview) totalPreview.textContent = '₡' + monto.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
        if (previewDiv) previewDiv.style.display = 'none';
    }
    
    // Actualizar el campo oculto del monto total
    const servicioMonto = document.getElementById('servicioMonto');
    if (servicioMonto) servicioMonto.value = monto;
    
    return monto;
}

// ============================================
// VALIDACIÓN - ACEPTA CUALQUIER NÚMERO POSITIVO
// ============================================
function validarMontoGas() {
    const montoInput = document.getElementById('gasMonto');
    if (!montoInput) return true;
    
    const monto = parseFloat(montoInput.value);
    
    // Acepta cualquier número positivo (incluye decimales)
    // También acepta 0 (pero mostrará advertencia si es 0)
    if (isNaN(monto)) {
        montoInput.value = '';
        return false;
    }
    
    if (monto < 0) {
        alert('El monto no puede ser negativo');
        montoInput.value = 0;
        calcularGas();
        return false;
    }
    
    // Si el monto es 0, mostrar advertencia pero permitir guardar
    if (monto === 0) {
        // Opcional: mostrar advertencia pero no bloquear
        console.log('⚠️ El monto es 0');
    }
    
    return true;
}

// ============================================
// FORMATEAR MONTO - SOLO LIMPIA CARACTERES NO NUMÉRICOS
// ============================================
function formatearMontoGas() {
    const montoInput = document.getElementById('gasMonto');
    if (!montoInput) return;
    
    // Guardar la posición del cursor
    const cursorPos = montoInput.selectionStart;
    const valorOriginal = montoInput.value;
    
    // Limpiar todo excepto números, punto y guión
    let valorLimpio = valorOriginal.replace(/[^\d.-]/g, '');
    
    // Si hay más de un punto, dejar solo el primero
    const partes = valorLimpio.split('.');
    if (partes.length > 2) {
        valorLimpio = partes[0] + '.' + partes.slice(1).join('');
    }
    
    // Si hay más de un guión, dejarlo al inicio
    if (valorLimpio.indexOf('-') > 0) {
        valorLimpio = valorLimpio.replace(/-/g, '');
    }
    
    // Actualizar valor
    if (valorLimpio !== valorOriginal) {
        montoInput.value = valorLimpio;
        // Restaurar cursor
        const nuevaPos = Math.min(cursorPos, valorLimpio.length);
        montoInput.setSelectionRange(nuevaPos, nuevaPos);
    }
    
    // Calcular
    calcularGas();
}

// ============================================
// INICIALIZAR CAMPOS DE GAS
// ============================================
function inicializarCamposGas() {
    const montoInput = document.getElementById('gasMonto');
    if (!montoInput) return;
    
    // Remover event listeners anteriores
    montoInput.removeEventListener('input', formatearMontoGas);
    montoInput.removeEventListener('change', validarMontoGas);
    montoInput.removeEventListener('blur', calcularGas);
    
    // Agregar nuevos event listeners
    montoInput.addEventListener('input', formatearMontoGas);
    montoInput.addEventListener('change', validarMontoGas);
    montoInput.addEventListener('blur', calcularGas);
    
    // Remover cualquier atributo que pueda restringir valores
    montoInput.removeAttribute('step');
    montoInput.removeAttribute('pattern');
    montoInput.removeAttribute('min');
    montoInput.removeAttribute('max');
    
    // Inicializar
    calcularGas();
}

// ============================================
// GUARDAR SERVICIO (COMPLETA)
// ============================================
async function guardarServicio() {
    console.log('💾 Guardando servicio...');
    
    // Validar campos obligatorios
    const local = document.getElementById('servicioLocal')?.value;
    const fecha = document.getElementById('servicioFecha')?.value;
    const tipo = document.getElementById('servicioTipo')?.value;
    const medidor = document.getElementById('servicioMedidor')?.value;
    
    if (!local) {
        alert('Seleccione un local');
        return;
    }
    if (!fecha) {
        alert('Seleccione una fecha');
        return;
    }
    if (!tipo) {
        alert('Seleccione un tipo de servicio');
        return;
    }
    
    // Datos base del servicio
    let servicioData = {
        fecha: fecha,
        servicio: tipo,
        medidor: medidor || null,
        monto: 0,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Datos según el tipo de servicio
    if (tipo === 'Agua') {
        const miscApertura = parseFloat(document.getElementById('aguaMiscApertura')?.value) || 0;
        const miscCierre = parseFloat(document.getElementById('aguaMiscCierre')?.value) || 0;
        const opApertura = parseFloat(document.getElementById('aguaOpApertura')?.value) || 0;
        const opCierre = parseFloat(document.getElementById('aguaOpCierre')?.value) || 0;
        const cerradoApertura = parseFloat(document.getElementById('aguaCerradoApertura')?.value) || 0;
        const cerradoCierre = parseFloat(document.getElementById('aguaCerradoCierre')?.value) || 0;
        
        const consumoMisc = (miscCierre > miscApertura) ? (miscCierre - miscApertura) : 0;
        const consumoOp = (opCierre > opApertura) ? (opCierre - opApertura) : 0;
        const consumoCerrado = (cerradoCierre > cerradoApertura) ? (cerradoCierre - cerradoApertura) : 0;
        const consumoTotal = consumoMisc + consumoOp + consumoCerrado;
        
        // Obtener precio unitario
        const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
        const precioUnitario = precios[local]?.Agua || PRECIOS_DEFAULT.Agua;
        const monto = consumoTotal * precioUnitario;
        
        servicioData = {
            ...servicioData,
            miscApertura: miscApertura,
            miscCierre: miscCierre,
            opApertura: opApertura,
            opCierre: opCierre,
            cerradoApertura: cerradoApertura,
            cerradoCierre: cerradoCierre,
            consumoMisc: consumoMisc,
            consumoOp: consumoOp,
            consumoCerrado: consumoCerrado,
            consumo: consumoTotal,
            precioUnitario: precioUnitario,
            monto: Math.round(monto)
        };
    } 
    else if (tipo === 'Electricidad') {
        const apertura = parseFloat(document.getElementById('energiaApertura')?.value) || 0;
        const cierre = parseFloat(document.getElementById('energiaCierre')?.value) || 0;
        
        if (cierre <= apertura) {
            alert('El cierre debe ser mayor que la apertura');
            return;
        }
        
        const consumo = cierre - apertura;
        
        // Obtener precio unitario
        const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
        const precioUnitario = precios[local]?.Electricidad || PRECIOS_DEFAULT.Electricidad;
        const monto = consumo * precioUnitario;
        
        servicioData = {
            ...servicioData,
            apertura: apertura,
            cierre: cierre,
            consumo: consumo,
            precioUnitario: precioUnitario,
            monto: Math.round(monto)
        };
    } 
    else if (tipo === 'Gas') {
        const proveedor = document.getElementById('gasProveedor')?.value?.trim() || '';
        const numeroFactura = document.getElementById('gasNumeroFactura')?.value?.trim() || '';
        const montoInput = document.getElementById('gasMonto')?.value;
        
        let monto = parseFloat(montoInput);
        if (isNaN(monto)) monto = 0;
        
        if (monto === 0) {
            const confirmar = confirm('El monto es 0. ¿Desea continuar?');
            if (!confirmar) return;
        }
        
        servicioData = {
            ...servicioData,
            proveedor: proveedor || null,
            numeroFactura: numeroFactura || null,
            monto: monto
        };
    }
    
    // Verificar si es edición o nuevo
    const editLocal = document.getElementById('servicioModal')?.dataset?.editLocal;
    const editId = document.getElementById('servicioModal')?.dataset?.editId;
    
    try {
        if (editLocal && editId) {
            // Actualizar
            await firebase.database().ref(`servicios/${editLocal}/${editId}`).update(servicioData);
            alert('✅ Servicio actualizado correctamente');
        } else {
            // Nuevo
            const newRef = firebase.database().ref(`servicios/${local}`).push();
            await newRef.set(servicioData);
            alert('✅ Servicio guardado correctamente');
        }
        
        // Cerrar modal
        const modal = document.getElementById('servicioModal');
        const overlay = document.getElementById('modalOverlay');
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        // Limpiar dataset
        if (modal) {
            delete modal.dataset.editLocal;
            delete modal.dataset.editId;
        }
        
    } catch (error) {
        console.error('❌ Error al guardar:', error);
        alert('Error al guardar: ' + error.message);
    }
}

// ============================================
// RESTO DE FUNCIONES (sin cambios)
// ============================================
function inicializarCamposAgua() {
    const campos = [
        'aguaMiscApertura', 'aguaMiscCierre',
        'aguaOpApertura', 'aguaOpCierre',
        'aguaCerradoApertura', 'aguaCerradoCierre'
    ];
    
    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.removeEventListener('blur', handleAguaBlur);
            campo.removeEventListener('keypress', handleAguaKeypress);
            campo.addEventListener('blur', handleAguaBlur);
            campo.addEventListener('keypress', handleAguaKeypress);
        }
    });
}

function handleAguaBlur(e) {
    calcularConsumoAgua();
}

function handleAguaKeypress(e) {
    if (e.key === 'Enter') e.target.blur();
}

function calcularConsumoAgua() {
    const miscApertura = parseFloat(document.getElementById('aguaMiscApertura')?.value) || 0;
    const miscCierre = parseFloat(document.getElementById('aguaMiscCierre')?.value) || 0;
    const opApertura = parseFloat(document.getElementById('aguaOpApertura')?.value) || 0;
    const opCierre = parseFloat(document.getElementById('aguaOpCierre')?.value) || 0;
    const cerradoApertura = parseFloat(document.getElementById('aguaCerradoApertura')?.value) || 0;
    const cerradoCierre = parseFloat(document.getElementById('aguaCerradoCierre')?.value) || 0;

    const consumoMisc = (miscCierre > miscApertura) ? (miscCierre - miscApertura) : 0;
    const consumoOp = (opCierre > opApertura) ? (opCierre - opApertura) : 0;
    const consumoCerrado = (cerradoCierre > cerradoApertura) ? (cerradoCierre - cerradoApertura) : 0;
    const consumoTotal = consumoMisc + consumoOp + consumoCerrado;

    const spanConsumoMisc = document.getElementById('aguaConsumoMisc');
    if (spanConsumoMisc) spanConsumoMisc.textContent = consumoMisc.toFixed(3) + ' M³';
    const spanConsumoOp = document.getElementById('aguaConsumoOp');
    if (spanConsumoOp) spanConsumoOp.textContent = consumoOp.toFixed(3) + ' M³';
    const spanConsumoCerrado = document.getElementById('aguaConsumoCerrado');
    if (spanConsumoCerrado) spanConsumoCerrado.textContent = consumoCerrado.toFixed(3) + ' M³';
    
    const consumoTotalSpan = document.getElementById('aguaConsumoTotal');
    if (consumoTotalSpan) consumoTotalSpan.textContent = consumoTotal.toFixed(3) + ' M³';
    
    const servicioConsumo = document.getElementById('servicioConsumo');
    if (servicioConsumo) servicioConsumo.value = consumoTotal;

    calcularMontoAgua(consumoTotal);
}

function calcularMontoAgua(consumo) {
    const local = document.getElementById('servicioLocal')?.value;
    if (!local) return;
    
    let precio = parseFloat(document.getElementById('precioAgua')?.value);
    if (!precio) {
        const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
        precio = precios[local]?.Agua || PRECIOS_DEFAULT.Agua;
    }
    
    const monto = consumo * precio;
    const montoCalculado = document.getElementById('aguaMontoCalculado');
    if (montoCalculado) montoCalculado.textContent = '₡' + Math.round(monto).toLocaleString();
    
    const servicioMonto = document.getElementById('servicioMonto');
    if (servicioMonto) servicioMonto.value = monto;
}

function calcularConsumoEnergia() {
    const apertura = parseFloat(document.getElementById('energiaApertura')?.value) || 0;
    const cierre = parseFloat(document.getElementById('energiaCierre')?.value) || 0;
    
    const consumoTotal = document.getElementById('energiaConsumoTotal');
    
    if (cierre <= apertura) {
        if (consumoTotal) consumoTotal.textContent = '0.0 kWh';
        return;
    }
    
    const consumo = cierre - apertura;
    if (consumoTotal) consumoTotal.textContent = consumo.toFixed(1) + ' kWh';
    
    const servicioConsumo = document.getElementById('servicioConsumo');
    if (servicioConsumo) servicioConsumo.value = consumo;
    
    calcularMontoEnergia(consumo);
}

function calcularMontoEnergia(consumo) {
    const local = document.getElementById('servicioLocal')?.value;
    if (!local) return;
    
    let precio = parseFloat(document.getElementById('precioElectricidad')?.value);
    if (!precio) {
        const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
        precio = precios[local]?.Electricidad || PRECIOS_DEFAULT.Electricidad;
    }
    
    const monto = consumo * precio;
    const montoCalculado = document.getElementById('energiaMontoCalculado');
    if (montoCalculado) montoCalculado.textContent = '₡' + Math.round(monto).toLocaleString();
    
    const servicioMonto = document.getElementById('servicioMonto');
    if (servicioMonto) servicioMonto.value = monto;
}

function cargarPreciosEnModal() {
    const local = document.getElementById('servicioLocal')?.value;
    const precioAguaDisplay = document.getElementById('precioAguaDisplay');
    const precioElectricidadDisplay = document.getElementById('precioElectricidadDisplay');
    const precioAguaHidden = document.getElementById('precioAgua');
    const precioElectricidadHidden = document.getElementById('precioElectricidad');
    
    if (!local) {
        if (precioAguaDisplay) precioAguaDisplay.textContent = PRECIOS_DEFAULT.Agua;
        if (precioElectricidadDisplay) precioElectricidadDisplay.textContent = PRECIOS_DEFAULT.Electricidad;
        if (precioAguaHidden) precioAguaHidden.value = PRECIOS_DEFAULT.Agua;
        if (precioElectricidadHidden) precioElectricidadHidden.value = PRECIOS_DEFAULT.Electricidad;
        return;
    }
    
    const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
    const precioAgua = precios[local]?.Agua || PRECIOS_DEFAULT.Agua;
    const precioElectricidad = precios[local]?.Electricidad || PRECIOS_DEFAULT.Electricidad;
    
    if (precioAguaDisplay) precioAguaDisplay.textContent = precioAgua;
    if (precioElectricidadDisplay) precioElectricidadDisplay.textContent = precioElectricidad;
    if (precioAguaHidden) precioAguaHidden.value = precioAgua;
    if (precioElectricidadHidden) precioElectricidadHidden.value = precioElectricidad;
}

function guardarPreciosModal() {
    const local = document.getElementById('servicioLocal')?.value;
    if (!local) return;
    
    const precioAgua = parseFloat(document.getElementById('precioAgua')?.value);
    const precioElectricidad = parseFloat(document.getElementById('precioElectricidad')?.value);
    
    if (!precioAgua || !precioElectricidad) return;
    
    const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
    precios[local] = {
        Agua: precioAgua,
        Electricidad: precioElectricidad
    };
    
    localStorage.setItem('preciosServicios', JSON.stringify(precios));
}

function configurarPrecios() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '500px';
    
    const locales = AppState.locales.map(l => l.nombre);
    const preciosActuales = JSON.parse(localStorage.getItem('preciosServicios')) || {};
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 20px 25px;">
            <h2 style="margin: 0;"><i class="fas fa-cog"></i> Configurar Precios</h2>
            <button class="modal-close" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body" style="padding: 25px; background: #f8fafc; max-height: 70vh; overflow-y: auto;">
            <p style="margin-bottom: 20px; color: #4b5563;">Configure los precios por unidad para cada local:</p>
    `;
    
    locales.forEach(local => {
        html += `
            <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b;"><i class="fas fa-store"></i> ${local}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label><i class="fas fa-water"></i> Agua (₡/M³)</label>
                        <input type="number" id="precio_${local}_agua" value="${preciosActuales[local]?.Agua || PRECIOS_DEFAULT.Agua}" step="10" min="0">
                    </div>
                    <div>
                        <label><i class="fas fa-bolt"></i> Electricidad (₡/kWh)</label>
                        <input type="number" id="precio_${local}_electricidad" value="${preciosActuales[local]?.Electricidad || PRECIOS_DEFAULT.Electricidad}" step="5" min="0">
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" 
                        style="padding: 12px 24px; border: 2px solid #e2e8f0; background: white; border-radius: 12px;">Cancelar</button>
                <button onclick="window.guardarTodosLosPrecios()" 
                        style="padding: 12px 32px; background: linear-gradient(135deg, #2563eb, #1e40af); color: white; border: none; border-radius: 12px; font-weight: 600;">
                    <i class="fas fa-save"></i> Guardar Todos
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
}

function guardarTodosLosPrecios() {
    const locales = AppState.locales.map(l => l.nombre);
    const nuevosPrecios = {};
    
    locales.forEach(local => {
        const precioAgua = document.getElementById(`precio_${local}_agua`)?.value;
        const precioElectricidad = document.getElementById(`precio_${local}_electricidad`)?.value;
        
        if (precioAgua && precioElectricidad) {
            nuevosPrecios[local] = {
                Agua: parseFloat(precioAgua) || PRECIOS_DEFAULT.Agua,
                Electricidad: parseFloat(precioElectricidad) || PRECIOS_DEFAULT.Electricidad
            };
        }
    });
    
    localStorage.setItem('preciosServicios', JSON.stringify(nuevosPrecios));
    
    document.querySelector('.modal')?.remove();
    document.getElementById('modalOverlay')?.classList.remove('active');
    alert('✅ Precios guardados correctamente');
}

function editarServicio(local, id) {
    mostrarModalServicio(local, id);
}

async function eliminarServicio(local, id) {
    if (!confirm('¿Está seguro de eliminar este registro?')) return;
    
    try {
        await firebase.database().ref(`servicios/${local}/${id}`).remove();
        alert('✅ Registro eliminado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar');
    }
}

function initServicios() {
    console.log('🚀 Inicializando servicios...');
    setTimeout(() => {
        if (AppState?.usuario) {
            console.log('👤 Usuario autenticado, cargando servicios...');
            cargarServiciosDesdeFirebase();
        } else {
            console.log('⏳ Esperando autenticación...');
        }
    }, 100);
}

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.renderServicios = renderServicios;
window.mostrarModalServicio = mostrarModalServicio;
window.guardarServicio = guardarServicio;
window.editarServicio = editarServicio;
window.eliminarServicio = eliminarServicio;
window.calcularConsumoAgua = calcularConsumoAgua;
window.calcularConsumoEnergia = calcularConsumoEnergia;
window.calcularGas = calcularGas;
window.cambiarTipoServicio = cambiarTipoServicio;
window.configurarPrecios = configurarPrecios;
window.cargarServiciosDesdeFirebase = cargarServiciosDesdeFirebase;
window.initServicios = initServicios;
window.guardarPreciosModal = guardarPreciosModal;
window.guardarTodosLosPrecios = guardarTodosLosPrecios;

console.log('✅ servicios.js cargado (Gas simplificado - solo factura)');