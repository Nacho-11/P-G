// modules/servicios.js

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
    // Gas no tiene precio fijo
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
// RENDERIZAR VISTA DE SERVICIOS
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
    
    console.log('📍 Filtro Local:', filtroLocal);
    console.log('📍 Filtro Tiempo:', filtroTiempo);
    console.log('📦 Datos completos:', serviciosData);
    
    // Calcular fechas para filtros
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);
    
    console.log('📅 Hoy:', hoyStr);
    console.log('📅 Ayer:', ayerStr);
    console.log('📅 Mes:', mesActual);
    console.log('📅 Año:', anioActual);
    
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
    
    // Verificar si hay datos
    if (Object.keys(serviciosData).length === 0) {
        console.log('📭 No hay servicios registrados en Firebase');
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
    
    // Filtrar por permisos
    const localesPermitidos = getLocalesPermitidos();
    console.log('🔑 Locales permitidos:', localesPermitidos);
    
    const localesAMostrar = filtroLocal === 'Todos' 
        ? Object.keys(serviciosData).filter(local => puedeVerLocal(local))
        : [filtroLocal].filter(l => puedeVerLocal(l) && serviciosData[l]);
    
    console.log('🏢 Locales a mostrar:', localesAMostrar);
    
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
        Gas: { cantidad: 0, monto: 0 } 
    };
    let hayRegistrosVisibles = false;
    
    for (const local of localesAMostrar) {
        const servicios = serviciosData[local] || [];
        console.log(`📍 ${local}: ${servicios.length} servicios totales`);
        
        // Filtrar por fecha
        const serviciosFiltrados = servicios.filter(s => {
            const fechaServicio = limpiarFecha(s.fecha);
            if (!fechaServicio) {
                console.log('⚠️ Servicio sin fecha:', s);
                return false;
            }
            
            // Si el filtro es 'todos', mostrar todos
            if (filtroTiempo === 'todos') return true;
            
            // Aplicar filtros específicos
            if (filtroTiempo === 'ayer') {
                return fechaServicio === ayerStr;
            }
            if (filtroTiempo === 'mes') {
                return fechaServicio.substring(0, 7) === mesActual;
            }
            if (filtroTiempo === 'anio') {
                return fechaServicio.substring(0, 4) === anioActual;
            }
            if (filtroTiempo === 'personalizado') {
                return fechaServicio === AppState.filtros?.fechaPersonalizada;
            }
            
            return true;
        });
        
        console.log(`📊 ${local}: ${serviciosFiltrados.length} servicios después del filtro de fecha`);
        
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
                // Mostrar los consumos parciales calculados (no las lecturas originales)
                const consumoMisc = s.consumoMisc?.toFixed(3) || '0.000';
                const consumoOp = s.consumoOp?.toFixed(3) || '0.000';
                const consumoCerrado = s.consumoCerrado?.toFixed(3) || '0.000';
                
                detalle = `⬆️ Misc: ${consumoMisc} M³ | ⬆️ Op: ${consumoOp} M³ | ⬆️ Cierre: ${consumoCerrado} M³`;
                cantidad = s.consumo || 0;
                unidad = 'M³';
                precioUnitario = s.precioUnitario ? `₡${s.precioUnitario}/M³` : '—';
                precioUnitario = s.precioUnitario ? `₡${s.precioUnitario}/M³` : '—'; 
            }   else if (s.servicio === 'Electricidad') {
                    // Mostrar las lecturas originales y el consumo calculado
                    const apertura = s.apertura?.toFixed(1) || '0.0';
                    const cierre = s.cierre?.toFixed(1) || '0.0';
                    const consumo = s.consumo?.toFixed(1) || '0.0';
                    
                    detalle = `📊 Apertura: ${apertura} kWh | Cierre: ${cierre} kWh | Consumo: ${consumo} kWh`;
                    cantidad = s.consumo || 0;
                    unidad = 'kWh';
                    precioUnitario = s.precioUnitario ? `₡${s.precioUnitario}/kWh` : '—';
                }else if (s.servicio === 'Gas') {
                    // Gas es simple: solo cantidad y monto total
                    detalle = `Recarga de gas`;  // Simple y directo
                    cantidad = s.cantidad || 0;
                    unidad = s.unidad || 'kg';
                    precioUnitario = s.cantidad ? `₡${Math.round(s.monto / s.cantidad)}/${s.unidad || 'kg'}` : '—';
                }
            
            totalGeneral += (s.monto || 0);
            if (s.servicio === 'Agua') {
                resumen.Agua.consumo += (s.consumo || 0);
                resumen.Agua.monto += (s.monto || 0);
            } else if (s.servicio === 'Electricidad') {
                resumen.Electricidad.consumo += (s.consumo || 0);
                resumen.Electricidad.monto += (s.monto || 0);
            } else if (s.servicio === 'Gas') {
                resumen.Gas.cantidad += (s.cantidad || 0);
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
                    <td><strong>${cantidad.toFixed(3)} ${unidad}</strong></td>
                    <td style="font-weight: 600; color: #059669;">₡${(s.monto || 0).toLocaleString()}</td>
                    <td><small>${precioUnitario}</small></td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <!-- Todos pueden editar -->
                            <button class="btn btn-sm btn-outline" onclick="window.editarServicio('${local}', '${s.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            
                            ${esGerencia() ? `
                                <!-- Solo gerencia puede eliminar -->
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
    
    // Si no hay registros después del filtro
    if (!hayRegistrosVisibles) {
        html += `
            <div class="card" style="background: #f1f5f9; color: #64748b; text-align: center; padding: 30px;">
                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <h3>No hay servicios para el período seleccionado</h3>
                <p>Cambie los filtros de fecha para ver más registros.</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Filtro actual: ${filtroTiempo === 'todos' ? 'Todos' : filtroTiempo}</p>
            </div>
        `;
    } else {
        // Resumen general (solo si hay datos)
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
                        <div>${resumen.Gas.cantidad.toFixed(1)} kg</div>
                        <div>₡${resumen.Gas.monto.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    console.log('✅ HTML generado, actualizando contenido');
    serviciosContent.innerHTML = html;
    
    // Forzar asignación de eventos a los botones
    setTimeout(() => {
        const botones = document.querySelectorAll('button');
        botones.forEach(btn => {
            if (btn.innerHTML && btn.innerHTML.includes('Nuevo Servicio')) {
                console.log('✅ Botón Nuevo Servicio asignado');
                btn.onclick = function(e) {
                    e.preventDefault();
                    window.mostrarModalServicio();
                    return false;
                };
            }
        });
    }, 100);
}

// ============================================
// MOSTRAR MODAL NUEVO SERVICIO
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
        // CORREGIDO: Usar fecha local en lugar de ISO
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        const fechaCorrecta = `${año}-${mes}-${dia}`;
        
        fechaInput.value = fechaCorrecta;
        console.log('📅 Fecha local correcta:', fechaCorrecta);
    }
    
    const tipoInput = document.getElementById('servicioTipo');
    if (tipoInput) tipoInput.value = '';
    
    const medidorInput = document.getElementById('servicioMedidor');
    if (medidorInput) medidorInput.value = '';
    
    const consumoInput = document.getElementById('servicioConsumo');
    if (consumoInput) consumoInput.value = '';
    
    const montoInput = document.getElementById('servicioMonto');
    if (montoInput) montoInput.value = '';
    
    // Limpiar campos específicos
    if (document.getElementById('aguaMiscelaneo')) document.getElementById('aguaMiscelaneo').value = '';
    if (document.getElementById('aguaOperacion')) document.getElementById('aguaOperacion').value = '';
    if (document.getElementById('aguaCerrado')) document.getElementById('aguaCerrado').value = '';
    if (document.getElementById('energiaApertura')) document.getElementById('energiaApertura').value = '';
    if (document.getElementById('energiaCierre')) document.getElementById('energiaCierre').value = '';
    if (document.getElementById('gasCantidad')) document.getElementById('gasCantidad').value = '';
    if (document.getElementById('gasUnidad')) document.getElementById('gasUnidad').value = 'kg';
    if (document.getElementById('gasCostoTotal')) document.getElementById('gasCostoTotal').value = '';
    
    if (document.getElementById('aguaConsumoTotal')) document.getElementById('aguaConsumoTotal').textContent = '0.000 M³';
    if (document.getElementById('aguaMontoCalculado')) document.getElementById('aguaMontoCalculado').textContent = '₡0';
    if (document.getElementById('energiaConsumoTotal')) document.getElementById('energiaConsumoTotal').textContent = '0.0 kWh';
    if (document.getElementById('energiaMontoCalculado')) document.getElementById('energiaMontoCalculado').textContent = '₡0';
    if (document.getElementById('gasMontoCalculado')) document.getElementById('gasMontoCalculado').textContent = '₡0';
    if (document.getElementById('gasPrecioUnitario')) document.getElementById('gasPrecioUnitario').textContent = '₡0/kg';
    
    // Ocultar todas las secciones
    if (document.getElementById('seccionAgua')) document.getElementById('seccionAgua').style.display = 'none';
    if (document.getElementById('seccionElectricidad')) document.getElementById('seccionElectricidad').style.display = 'none';
    if (document.getElementById('seccionGas')) document.getElementById('seccionGas').style.display = 'none';
    
    // Cargar locales según permisos
    const selectLocal = document.getElementById('servicioLocal');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
        
        const localesPermitidos = getLocalesPermitidos();
        
        AppState.locales.forEach(local => {
            if (localesPermitidos.includes(local.nombre)) {
                selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
            }
        });
        
        // Si es usuario, preseleccionar y deshabilitar
        if (!esGerencia() && AppState.usuario?.local) {
            selectLocal.value = AppState.usuario.local;
            selectLocal.disabled = true;
        } else {
            selectLocal.disabled = false;
        }
    }
    
    // Cargar precios guardados (solo agua y electricidad)
    cargarPreciosEnModal();
    
    // Inicializar campos de agua con formato Excel
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

            // Mostrar sección correspondiente y cargar datos
            if (servicio.servicio === 'Agua') {
                if (document.getElementById('seccionAgua')) document.getElementById('seccionAgua').style.display = 'block';
                if (document.getElementById('aguaMiscelaneo')) document.getElementById('aguaMiscelaneo').value = servicio.miscelaneo?.toFixed(3) || '0';
                if (document.getElementById('aguaOperacion')) document.getElementById('aguaOperacion').value = servicio.operacion?.toFixed(3) || '0';
                if (document.getElementById('aguaCerrado')) document.getElementById('aguaCerrado').value = servicio.cerrado?.toFixed(3) || '0';
                calcularConsumoAgua();
            } else if (servicio.servicio === 'Electricidad') {
                if (document.getElementById('seccionElectricidad')) document.getElementById('seccionElectricidad').style.display = 'block';
                if (document.getElementById('energiaApertura')) document.getElementById('energiaApertura').value = servicio.apertura || 0;
                if (document.getElementById('energiaCierre')) document.getElementById('energiaCierre').value = servicio.cierre || 0;
                calcularConsumoEnergia();
            } else if (servicio.servicio === 'Gas') {
                if (document.getElementById('seccionGas')) document.getElementById('seccionGas').style.display = 'block';
                if (document.getElementById('gasCantidad')) document.getElementById('gasCantidad').value = servicio.cantidad || 0;
                if (document.getElementById('gasUnidad')) document.getElementById('gasUnidad').value = servicio.unidad || 'kg';
                if (document.getElementById('gasCostoTotal')) document.getElementById('gasCostoTotal').value = servicio.monto || 0;
                calcularGas();
            }
            
            modal.dataset.editLocal = editLocal;
            modal.dataset.editId = editId;
            
            // Cambiar título del modal
            const modalTitle = document.getElementById('servicioModalTitle');
            if (modalTitle) modalTitle.textContent = 'Editar Servicio';
            
            const submitBtn = document.getElementById('servicioSubmitBtn');
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Servicio';
        }
    } else {
        delete modal.dataset.editLocal;
        delete modal.dataset.editId;
        
        // Habilitar campos para nuevo registro
        if (fechaInput) {
            fechaInput.disabled = false;
            fechaInput.style.background = 'white';
            fechaInput.style.cursor = 'text';
        }
        if (tipoInput) {
            tipoInput.disabled = false;
            tipoInput.style.background = 'white';
            tipoInput.style.cursor = 'pointer';
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
// INICIALIZAR CAMPOS DE AGUA CON 2 LECTURAS POR PERIODO
// ============================================
function inicializarCamposAgua() {
    // Lista de TODOS los campos de entrada de agua (6 en total)
    const campos = [
        'aguaMiscApertura', 'aguaMiscCierre',
        'aguaOpApertura', 'aguaOpCierre',
        'aguaCerradoApertura', 'aguaCerradoCierre'
    ];
    
    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            // Remover event listeners anteriores para evitar duplicados
            campo.removeEventListener('blur', handleAguaBlur);
            campo.removeEventListener('keypress', handleAguaKeypress);
            
            // Agregar nuevos event listeners
            campo.addEventListener('blur', handleAguaBlur);
            campo.addEventListener('keypress', handleAguaKeypress);
        }
    });
}

// Manejador para el evento blur (actualizado - ahora no formatea a 3 decimales)
function handleAguaBlur(e) {
    const campo = e.target;
    // Podrías añadir validaciones de rango aquí si lo deseas
    // Pero NO formateamos a 3 decimales porque son lecturas grandes
    
    // Recalcular consumo cada vez que un campo pierde el foco
    calcularConsumoAgua();
}

// Manejador para el evento keypress (Enter) - igual que antes
function handleAguaKeypress(e) {
    if (e.key === 'Enter') {
        e.target.blur();
    }
}

// ============================================
// EDITAR SERVICIO
// ============================================
function editarServicio(local, id) {
    console.log('✏️ Editando servicio:', local, id);
    mostrarModalServicio(local, id);
}

// ============================================
// CARGAR PRECIOS EN MODAL (solo agua y electricidad)
// ============================================
function cargarPreciosEnModal() {
    const local = document.getElementById('servicioLocal')?.value;
    
    // Elementos de solo lectura para mostrar
    const precioAguaDisplay = document.getElementById('precioAguaDisplay');
    const precioElectricidadDisplay = document.getElementById('precioElectricidadDisplay');
    
    // Elementos ocultos para mantener compatibilidad
    const precioAguaHidden = document.getElementById('precioAgua');
    const precioElectricidadHidden = document.getElementById('precioElectricidad');
    
    if (!local) {
        // Si no hay local seleccionado, mostrar valores por defecto
        if (precioAguaDisplay) precioAguaDisplay.textContent = PRECIOS_DEFAULT.Agua;
        if (precioElectricidadDisplay) precioElectricidadDisplay.textContent = PRECIOS_DEFAULT.Electricidad;
        if (precioAguaHidden) precioAguaHidden.value = PRECIOS_DEFAULT.Agua;
        if (precioElectricidadHidden) precioElectricidadHidden.value = PRECIOS_DEFAULT.Electricidad;
        return;
    }
    
    const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
    const precioAgua = precios[local]?.Agua || PRECIOS_DEFAULT.Agua;
    const precioElectricidad = precios[local]?.Electricidad || PRECIOS_DEFAULT.Electricidad;
    
    // Actualizar displays
    if (precioAguaDisplay) precioAguaDisplay.textContent = precioAgua;
    if (precioElectricidadDisplay) precioElectricidadDisplay.textContent = precioElectricidad;
    
    // Actualizar campos ocultos (para compatibilidad con cálculos)
    if (precioAguaHidden) precioAguaHidden.value = precioAgua;
    if (precioElectricidadHidden) precioElectricidadHidden.value = precioElectricidad;
}

// ============================================
// CAMBIAR TIPO DE SERVICIO EN MODAL
// ============================================
function cambiarTipoServicio() {
    const tipo = document.getElementById('servicioTipo')?.value;
    const seccionAgua = document.getElementById('seccionAgua');
    const seccionElectricidad = document.getElementById('seccionElectricidad');
    const seccionGas = document.getElementById('seccionGas');
    const icon = document.getElementById('servicioModalIcon');
    
    // Ocultar todas las secciones
    if (seccionAgua) seccionAgua.style.display = 'none';
    if (seccionElectricidad) seccionElectricidad.style.display = 'none';
    if (seccionGas) seccionGas.style.display = 'none';
    
    // Mostrar la sección correspondiente
    if (tipo === 'Agua') {
        if (seccionAgua) seccionAgua.style.display = 'block';
        if (icon) {
            icon.className = 'fas fa-water';
            icon.style.color = '#3b82f6';
        }
        // Inicializar campos de agua
        inicializarCamposAgua();
        // Calcular inicial
        calcularConsumoAgua();
    } else if (tipo === 'Electricidad') {
        if (seccionElectricidad) seccionElectricidad.style.display = 'block';
        if (icon) {
            icon.className = 'fas fa-bolt';
            icon.style.color = '#f59e0b';
        }
        // Calcular inicial
        calcularConsumoEnergia();
    } else if (tipo === 'Gas') {
        if (seccionGas) seccionGas.style.display = 'block';
        if (icon) {
            icon.className = 'fas fa-fire';
            icon.style.color = '#ef4444';
        }
        // Calcular inicial
        calcularGas();
    }
}

// ============================================
// CALCULAR CONSUMO DE AGUA (VERSIÓN EXCEL REAL)
// ============================================
function calcularConsumoAgua() {
    // Obtener las 6 lecturas del medidor (valores absolutos)
    const miscApertura = parseFloat(document.getElementById('aguaMiscApertura')?.value) || 0;
    const miscCierre = parseFloat(document.getElementById('aguaMiscCierre')?.value) || 0;
    const opApertura = parseFloat(document.getElementById('aguaOpApertura')?.value) || 0;
    const opCierre = parseFloat(document.getElementById('aguaOpCierre')?.value) || 0;
    const cerradoApertura = parseFloat(document.getElementById('aguaCerradoApertura')?.value) || 0;
    const cerradoCierre = parseFloat(document.getElementById('aguaCerradoCierre')?.value) || 0;

    // Calcular el consumo de CADA PERÍODO (Cierre - Apertura)
    // Asegurarse de que no den negativo. Si es negativo, el consumo es 0.
    const consumoMisc = (miscCierre > miscApertura) ? (miscCierre - miscApertura) : 0;
    const consumoOp = (opCierre > opApertura) ? (opCierre - opApertura) : 0;
    const consumoCerrado = (cerradoCierre > cerradoApertura) ? (cerradoCierre - cerradoApertura) : 0;

    // El consumo total del día es la SUMA de los 3 consumos parciales
    const consumoTotal = consumoMisc + consumoOp + consumoCerrado;

    // Mostrar los consumos parciales en alguna parte (si tienes elementos para ello)
    // Por ejemplo, podrías tener pequeños spans para mostrar esto.
    const spanConsumoMisc = document.getElementById('aguaConsumoMisc');
    if (spanConsumoMisc) spanConsumoMisc.textContent = consumoMisc.toFixed(3) + ' M³';
    const spanConsumoOp = document.getElementById('aguaConsumoOp');
    if (spanConsumoOp) spanConsumoOp.textContent = consumoOp.toFixed(3) + ' M³';
    const spanConsumoCerrado = document.getElementById('aguaConsumoCerrado');
    if (spanConsumoCerrado) spanConsumoCerrado.textContent = consumoCerrado.toFixed(3) + ' M³';

    // Mostrar el consumo total (ahora sí, la suma de los parciales)
    const consumoTotalSpan = document.getElementById('aguaConsumoTotal');
    if (consumoTotalSpan) consumoTotalSpan.textContent = consumoTotal.toFixed(3) + ' M³';
    
    // Guardar el consumo total en el campo oculto (esto no cambia)
    const servicioConsumo = document.getElementById('servicioConsumo');
    if (servicioConsumo) servicioConsumo.value = consumoTotal;

    // Calcular el monto total (basado en la suma de consumos)
    calcularMontoAgua(consumoTotal);
}

// ============================================
// CALCULAR MONTO DE AGUA
// ============================================
function calcularMontoAgua(consumo) {
    const local = document.getElementById('servicioLocal')?.value;
    if (!local) return;
    
    // Obtener el precio
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

// ============================================
// CALCULAR CONSUMO DE ELECTRICIDAD
// ============================================
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
    
    // Calcular monto
    calcularMontoEnergia(consumo);
}

// ============================================
// CALCULAR MONTO DE ELECTRICIDAD
// ============================================
function calcularMontoEnergia(consumo) {
    const local = document.getElementById('servicioLocal')?.value;
    if (!local) return;
    
    // Obtener el precio
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

// ============================================
// CALCULAR GAS (recarga)
// ============================================
function calcularGas() {
    const cantidad = parseFloat(document.getElementById('gasCantidad')?.value) || 0;
    const costoTotal = parseFloat(document.getElementById('gasCostoTotal')?.value) || 0;
    const unidad = document.getElementById('gasUnidad')?.value || 'kg';
    
    const montoCalculado = document.getElementById('gasMontoCalculado');
    if (montoCalculado) montoCalculado.textContent = '₡' + Math.round(costoTotal).toLocaleString();
    
    const servicioMonto = document.getElementById('servicioMonto');
    if (servicioMonto) servicioMonto.value = costoTotal;
    
    const precioUnitario = document.getElementById('gasPrecioUnitario');
    if (precioUnitario) {
        if (cantidad > 0) {
            const precio = costoTotal / cantidad;
            precioUnitario.textContent = `₡${Math.round(precio)}/${unidad}`;
        } else {
            precioUnitario.textContent = `₡0/${unidad}`;
        }
    }
}

// ============================================
// GUARDAR PRECIOS (solo agua y electricidad)
// ============================================
function guardarPreciosModal() {
    const local = document.getElementById('servicioLocal')?.value;
    if (!local) {
        alert('Seleccione un local primero');
        return;
    }
    
    const precioAgua = parseFloat(document.getElementById('precioAgua')?.value);
    const precioElectricidad = parseFloat(document.getElementById('precioElectricidad')?.value);
    
    if (!precioAgua || !precioElectricidad) {
        alert('Complete los precios de Agua y Electricidad');
        return;
    }
    
    const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
    precios[local] = {
        Agua: precioAgua,
        Electricidad: precioElectricidad
        // Gas no se guarda aquí
    };
    
    localStorage.setItem('preciosServicios', JSON.stringify(precios));
    alert('✅ Precios guardados para ' + local);
}

// ============================================
// GUARDAR SERVICIO
// ============================================
async function guardarServicio() {
    const modal = document.getElementById('servicioModal');
    const editLocal = modal?.dataset?.editLocal;
    const editId = modal?.dataset?.editId;
    
    const fecha = document.getElementById('servicioFecha')?.value;
    const local = document.getElementById('servicioLocal')?.value;
    const tipo = document.getElementById('servicioTipo')?.value;
    const medidor = document.getElementById('servicioMedidor')?.value;
    
    if (!fecha || !local || !tipo) {
        alert('Complete los campos obligatorios');
        return;
    }
    
    // Guardar precios primero
    guardarPreciosModal();
    
    let servicioData = {
        fecha,
        servicio: tipo,
        medidor: medidor || null,
        creadoPor: AppState.usuario?.email || 'sistema',
        ultimaModificacion: new Date().toISOString()
    };
    
    // Dentro de la función guardarServicio(), en la parte de 'Agua':
if (tipo === 'Agua') {
    // Obtener las 6 lecturas del medidor
    const miscApertura = parseFloat(document.getElementById('aguaMiscApertura')?.value) || 0;
    const miscCierre = parseFloat(document.getElementById('aguaMiscCierre')?.value) || 0;
    const opApertura = parseFloat(document.getElementById('aguaOpApertura')?.value) || 0;
    const opCierre = parseFloat(document.getElementById('aguaOpCierre')?.value) || 0;
    const cerradoApertura = parseFloat(document.getElementById('aguaCerradoApertura')?.value) || 0;
    const cerradoCierre = parseFloat(document.getElementById('aguaCerradoCierre')?.value) || 0;

    // Calcular los consumos parciales (con la misma lógica de no negativos)
    const consumoMisc = (miscCierre > miscApertura) ? (miscCierre - miscApertura) : 0;
    const consumoOp = (opCierre > opApertura) ? (opCierre - opApertura) : 0;
    const consumoCerrado = (cerradoCierre > cerradoApertura) ? (cerradoCierre - cerradoApertura) : 0;
    const consumoTotal = consumoMisc + consumoOp + consumoCerrado;

    // Validar que al menos un período tenga consumo
    if (consumoMisc === 0 && consumoOp === 0 && consumoCerrado === 0) {
        alert('Debe ingresar lecturas de cierre mayores a las de apertura en al menos un período.');
        return;
    }

    // Obtener el precio
    const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
    const precio = precios[local]?.Agua || PRECIOS_DEFAULT.Agua;

    // Guardar TODO en servicioData
    servicioData = {
        ...servicioData,
        // Lecturas originales (las 6)
        miscApertura: miscApertura,
        miscCierre: miscCierre,
        opApertura: opApertura,
        opCierre: opCierre,
        cerradoApertura: cerradoApertura,
        cerradoCierre: cerradoCierre,
        // Consumos calculados (los 3 parciales y el total)
        consumoMisc: parseFloat(consumoMisc.toFixed(3)),
        consumoOp: parseFloat(consumoOp.toFixed(3)),
        consumoCerrado: parseFloat(consumoCerrado.toFixed(3)),
        consumo: parseFloat(consumoTotal.toFixed(3)), // Este es el que se muestra en la tabla
        monto: Math.round(consumoTotal * precio),
        precioUnitario: precio
    };
}
    else if (tipo === 'Electricidad') {
        const apertura = parseFloat(document.getElementById('energiaApertura')?.value) || 0;
        const cierre = parseFloat(document.getElementById('energiaCierre')?.value) || 0;
        
        // Validar lecturas
        if (apertura === 0 && cierre === 0) {
            alert('Ingrese las lecturas de apertura y cierre');
            return;
        }
        
        if (cierre <= apertura) {
            alert('La lectura de cierre debe ser mayor a la de apertura');
            return;
        }
        
        const consumo = cierre - apertura;
        
        // Obtener el precio del localStorage
        const precios = JSON.parse(localStorage.getItem('preciosServicios')) || {};
        const precio = precios[local]?.Electricidad || PRECIOS_DEFAULT.Electricidad;
        
        servicioData = {
            ...servicioData,
            apertura,
            cierre,
            consumo,
            monto: consumo * precio,
            precioUnitario: precio
        };
    }
    else if (tipo === 'Gas') {
        const cantidad = parseFloat(document.getElementById('gasCantidad')?.value) || 0;
        const unidad = document.getElementById('gasUnidad')?.value || 'kg';
        const costoTotal = parseFloat(document.getElementById('gasCostoTotal')?.value) || 0;
        
        if (cantidad === 0 || costoTotal === 0) {
            alert('Ingrese la cantidad y el costo total de la recarga');
            return;
        }
        
        servicioData = {
            ...servicioData,
            cantidad,
            unidad,
            monto: costoTotal
            // No guardamos precio unitario, se calcula al mostrar
        };
    }
    
    if (!editLocal || !editId) {
        servicioData.fechaCreacion = new Date().toISOString();
    }
    
    try {
        const ref = firebase.database().ref(`servicios/${local}`);
        
        if (editLocal && editId) {
            await ref.child(editId).update(servicioData);
            alert('✅ Servicio actualizado');
        } else {
            await ref.push(servicioData);
            alert('✅ Servicio registrado');
        }
        
        cerrarModal('servicioModal');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar');
    }
}

// ============================================
// ELIMINAR SERVICIO
// ============================================
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

// ============================================
// CONFIGURAR PRECIOS (solo agua y electricidad)
// ============================================
function configurarPrecios() {
    // Crear un modal personalizado
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
                <h3 style="margin: 0 0 15px 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-store" style="color: #2563eb;"></i> ${local}
                </h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; font-weight: 600; color: #475569; margin-bottom: 5px;">
                            <i class="fas fa-water" style="color: #3b82f6;"></i> Agua (₡/M³)
                        </label>
                        <input type="number" id="precio_${local}_agua" value="${preciosActuales[local]?.Agua || PRECIOS_DEFAULT.Agua}" step="10" min="0" 
                               style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 10px;">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 600; color: #475569; margin-bottom: 5px;">
                            <i class="fas fa-bolt" style="color: #f59e0b;"></i> Electricidad (₡/kWh)
                        </label>
                        <input type="number" id="precio_${local}_electricidad" value="${preciosActuales[local]?.Electricidad || PRECIOS_DEFAULT.Electricidad}" step="5" min="0" 
                               style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 10px;">
                    </div>
                </div>
                <p style="margin: 10px 0 0; color: #64748b; font-size: 0.85rem;">
                    <i class="fas fa-info-circle"></i> El gas se ingresa como recarga con cantidad y costo total
                </p>
            </div>
        `;
    });
    
    html += `
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" 
                        style="padding: 12px 24px; border: 2px solid #e2e8f0; background: white; border-radius: 12px; cursor: pointer;">
                    Cancelar
                </button>
                <button onclick="window.guardarTodosLosPrecios()" 
                        style="padding: 12px 32px; background: linear-gradient(135deg, #2563eb, #1e40af); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
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

// ============================================
// GUARDAR TODOS LOS PRECIOS
// ============================================
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
    
    // Cerrar modal
    document.querySelector('.modal')?.remove();
    document.getElementById('modalOverlay')?.classList.remove('active');
    
    alert('✅ Precios guardados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
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
// EVENT LISTENERS
// ============================================
document.addEventListener('change', function(e) {
    if (e.target.id === 'servicioLocal') {
        cargarPreciosEnModal();
    }
});

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

console.log('Servicios:', window.serviciosData);

// Crear alias por si acaso
window.mostrarModalService = mostrarModalServicio;

console.log('✅ servicios.js cargado correctamente');
console.log('📋 Funciones disponibles:', {
    renderServicios: typeof window.renderServicios,
    mostrarModalServicio: typeof window.mostrarModalServicio,
    configurarPrecios: typeof window.configurarPrecios
});