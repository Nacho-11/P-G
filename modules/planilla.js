// modules/planilla.js - VERSIÓN CORREGIDA CON RANGO FUNCIONAL

console.log('📋 Cargando módulo de Planilla...');

function limpiarFecha(fecha) {
    if (!fecha) return '';
    return fecha.split('T')[0];
}

function formatearFechaCR(fechaStr) {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
}

// ============================================
// FUNCIÓN DE PERMISOS LOCAL
// ============================================
function puedeVerLocalPlanilla(local) {
    if (typeof window.esGerencia === 'function' && window.esGerencia()) return true;
    if (AppState?.usuario?.local === local) return true;
    return false;
}

// ============================================
// CARGAR PLANILLA DESDE FIREBASE
// ============================================
function cargarPlanillaDesdeFirebase() {
    console.log('🔄 Cargando planilla desde Firebase...');
    
    const planillaRef = firebase.database().ref('planilla');
    
    planillaRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const planillaData = {};
        
        console.log('📦 Datos crudos de planilla:', data);
        
        if (!data) {
            console.log('📭 No hay datos de planilla en Firebase');
            window.planillaData = {};
            if (document.getElementById('planilla')?.classList.contains('active')) {
                renderPlanilla();
            }
            return;
        }
        
        Object.keys(data).forEach(localNombre => {
            const empleadosObj = data[localNombre];
            if (!empleadosObj || typeof empleadosObj !== 'object') return;
            
            planillaData[localNombre] = [];
            
            Object.keys(empleadosObj).forEach(empleadoId => {
                const empleado = empleadosObj[empleadoId];
                if (empleado && typeof empleado === 'object') {
                    planillaData[localNombre].push({
                        id: empleadoId,
                        ...empleado,
                        local: empleado.local || localNombre
                    });
                }
            });
            
            console.log(`📍 Local ${localNombre}: ${planillaData[localNombre].length} empleados`);
        });
        
        let totalEmpleados = 0;
        Object.values(planillaData).forEach(empleados => {
            totalEmpleados += empleados.length;
        });
        
        console.log(`✅ Planilla cargada: ${totalEmpleados} empleados en ${Object.keys(planillaData).length} locales`);
        
        window.planillaData = planillaData;
        
        if (document.getElementById('planilla')?.classList.contains('active')) {
            renderPlanilla();
        }
        
        if (document.getElementById('resumen')?.classList.contains('active') && window.renderResumen) {
            window.renderResumen();
        }
        
    }, (error) => {
        console.error('❌ Error cargando planilla:', error);
        window.planillaData = {};
    });
}

// ============================================
// CALCULAR PAGO POR HORAS
// ============================================
function calcularPagoHoras(empleado, horas) {
    const salarioMensual = parseFloat(empleado.salario) || 0;
    const valorHora = salarioMensual / 240;
    const valorHoraExtra = valorHora * 1.5;
    
    const esAñosLocos = empleado.local?.includes('Los Años Locos') || false;
    const valorHoraNocturna = esAñosLocos ? (salarioMensual / 180) : valorHora;
    const valorHoraExtraNocturna = valorHoraNocturna * 1.5;
    
    const ordinarias = (horas.ordinarias || 0) * valorHora;
    const extras = (horas.extras || 0) * valorHoraExtra;
    const nocturnas = (horas.nocturnas || 0) * valorHoraNocturna;
    const extrasNocturnas = (horas.extrasNocturnas || 0) * valorHoraExtraNocturna;
    
    return { ordinarias, extras, nocturnas, extrasNocturnas };
}

// ============================================
// NORMALIZAR SALARIO
// ============================================
function normalizarSalario(valor) {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    
    let strValor = valor.toString().trim();
    strValor = strValor.replace(',', '.');
    strValor = strValor.replace(/[^\d.-]/g, '');
    
    const partes = strValor.split('.');
    if (partes.length > 2) {
        strValor = partes[0] + '.' + partes.slice(1).join('');
    }
    
    const resultado = parseFloat(strValor);
    return isNaN(resultado) ? 0 : resultado;
}

// ============================================
// FORMATO DE MONEDA
// ============================================
function formatCurrency(amount, decimals = 2) {
    if (amount === null || amount === undefined) return '₡0.00';
    const valor = typeof amount === 'string' ? parseFloat(amount) : amount;
    return '₡' + valor.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ============================================
// RENDERIZAR VISTA DE PLANILLA
// ============================================
function renderPlanilla() {
    console.log('🎨 Renderizando planilla...');
    const planillaContent = document.getElementById('planillaContent');
    if (!planillaContent) return;
    
    const filtroLocal = AppState?.filtros?.local || 'Todos';
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    
    // ============================================
    // CALCULAR FECHAS SEGÚN FILTRO
    // ============================================
    let fechaMostrar = '';
    let fechaBuscar = '';
    let fechaInicioRango = null;
    let fechaFinRango = null;
    
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    
    if (filtroTiempo === 'ayer') {
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        fechaBuscar = ayer.toLocaleDateString('en-CA');
        fechaMostrar = new Date(fechaBuscar + 'T12:00:00').toLocaleDateString('es-CR', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    } 
    else if (filtroTiempo === 'personalizado') {
        fechaBuscar = AppState?.filtros?.fechaPersonalizada || hoyStr;
        fechaMostrar = new Date(fechaBuscar + 'T12:00:00').toLocaleDateString('es-CR', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    }
    else if (filtroTiempo === 'rango') {
        const fechaInicio = AppState?.filtros?.fechaInicio;
        const fechaFin = AppState?.filtros?.fechaFin;
        if (fechaInicio && fechaFin) {
            fechaInicioRango = fechaInicio;
            fechaFinRango = fechaFin;
            fechaMostrar = `${formatearFechaCR(fechaInicio)} → ${formatearFechaCR(fechaFin)}`;
            fechaBuscar = ''; // No usar fechaBuscar para rango
        } else {
            fechaBuscar = hoyStr;
            fechaMostrar = new Date(hoyStr + 'T12:00:00').toLocaleDateString('es-CR', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
        }
    }
    else if (filtroTiempo === 'mes') {
        fechaBuscar = hoyStr.substring(0, 7);
        const [año, mes] = hoyStr.split('-');
        const mesesNombre = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        fechaMostrar = `${mesesNombre[parseInt(mes)-1]} ${año}`;
    }
    else {
        fechaBuscar = hoyStr;
        fechaMostrar = new Date(hoyStr + 'T12:00:00').toLocaleDateString('es-CR', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    }
    
    const planillaData = window.planillaData || {};
    const verInactivos = localStorage.getItem('verInactivos') === 'true';
    
    if (Object.keys(planillaData).length === 0) {
        planillaContent.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2><i class="fas fa-users" style="color: var(--primary);"></i> Planilla Diaria</h2>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" onclick="mostrarModalEmpleado()">
                            <i class="fas fa-plus"></i> Nuevo Empleado
                        </button>
                    </div>
                </div>
                <div class="card" style="padding: 40px; text-align: center;">
                    <i class="fas fa-users" style="font-size: 4rem; color: #9ca3af;"></i>
                    <h3>No hay empleados registrados</h3>
                    <p>Haga clic en "Nuevo Empleado" para agregar uno.</p>
                </div>
            </div>
        `;
        return;
    }
    
    const localesAMostrar = filtroLocal === 'Todos' 
        ? Object.keys(planillaData).filter(local => puedeVerLocalPlanilla(local))
        : [filtroLocal].filter(l => puedeVerLocalPlanilla(l) && planillaData[l]);
    
    if (localesAMostrar.length === 0) {
        planillaContent.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2><i class="fas fa-users" style="color: var(--primary);"></i> Planilla Diaria</h2>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" onclick="mostrarModalEmpleado()">
                            <i class="fas fa-plus"></i> Nuevo Empleado
                        </button>
                    </div>
                </div>
                <div class="card" style="padding: 40px; text-align: center;">
                    <i class="fas fa-users" style="font-size: 4rem; color: #9ca3af;"></i>
                    <h3>No hay empleados en ${filtroLocal}</h3>
                </div>
            </div>
        `;
        return;
    }
    
    let totalGeneralOrdinarias = 0;
    let totalGeneralExtras = 0;
    let totalGeneralNocturnas = 0;
    let totalGeneralExtrasNocturnas = 0;
    let totalGeneralPago = 0;
    
    let html = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <h2><i class="fas fa-users" style="color: var(--primary);"></i> Planilla Diaria</h2>
                
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-outline" onclick="toggleVerInactivos()" style="display: flex; align-items: center; gap: 5px;">
                        <i class="fas ${verInactivos ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        ${verInactivos ? 'Ocultar inactivos' : 'Ver inactivos'}
                    </button>
                    <button class="btn btn-primary" onclick="mostrarModalEmpleado()">
                        <i class="fas fa-plus"></i> Nuevo Empleado
                    </button>
                </div>
            </div>
    `;
    
    for (const local of localesAMostrar) {
        const empleados = planillaData[local] || [];
        
        html += `
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: var(--primary);">
                        <i class="fas fa-store"></i> ${local}
                    </h3>
                    <span class="planilla-periodo-badge">
                        ${fechaMostrar} (${empleados.length} empleados)
                    </span>
                </div>
                
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Puesto</th>
                                <th>Pago Horas Ord.</th>
                                <th>Pago Horas Extra</th>
                                <th>Pago Horas Noct.</th>
                                <th>Pago Horas Ext. Noct.</th>
                                <th>Total Día</th>
                                <th>Acciones</th>
                            </thead>
                            <tbody>
        `;
        
        empleados.forEach(emp => {
            const mostrarFila = verInactivos || emp.activo !== false;
            
            let horasDelDia = { ordinarias: 0, extras: 0, nocturnas: 0, extrasNocturnas: 0 };
            let mostrarDetalleHoras = false;

            // ============================================
            // CÁLCULO DE HORAS SEGÚN FILTRO (INCLUYE RANGO)
            // ============================================
            if (filtroTiempo === 'rango' && fechaInicioRango && fechaFinRango) {
                // Para rango, sumar horas entre las dos fechas
                if (emp.horas) {
                    Object.entries(emp.horas).forEach(([fecha, horas]) => {
                        if (fecha >= fechaInicioRango && fecha <= fechaFinRango) {
                            horasDelDia.ordinarias += horas.ordinarias || 0;
                            horasDelDia.extras += horas.extras || 0;
                            horasDelDia.nocturnas += horas.nocturnas || 0;
                            horasDelDia.extrasNocturnas += horas.extrasNocturnas || 0;
                        }
                    });
                }
                mostrarDetalleHoras = false;
            }
            else if (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado') {
                horasDelDia = emp.horas?.[fechaBuscar] || { ordinarias: 0, extras: 0, nocturnas: 0, extrasNocturnas: 0 };
                mostrarDetalleHoras = true;
            }
            else if (filtroTiempo === 'mes' && emp.horas) {
                Object.entries(emp.horas).forEach(([fecha, horas]) => {
                    if (fecha.substring(0, 7) === fechaBuscar) {
                        horasDelDia.ordinarias += horas.ordinarias || 0;
                        horasDelDia.extras += horas.extras || 0;
                        horasDelDia.nocturnas += horas.nocturnas || 0;
                        horasDelDia.extrasNocturnas += horas.extrasNocturnas || 0;
                    }
                });
                mostrarDetalleHoras = false;
            }
            else if (filtroTiempo === 'anio' && emp.horas) {
                Object.entries(emp.horas).forEach(([fecha, horas]) => {
                    if (fecha.substring(0, 4) === fechaBuscar) {
                        horasDelDia.ordinarias += horas.ordinarias || 0;
                        horasDelDia.extras += horas.extras || 0;
                        horasDelDia.nocturnas += horas.nocturnas || 0;
                        horasDelDia.extrasNocturnas += horas.extrasNocturnas || 0;
                    }
                });
                mostrarDetalleHoras = false;
            }
            else {
                horasDelDia = emp.horas?.[hoyStr] || { ordinarias: 0, extras: 0, nocturnas: 0, extrasNocturnas: 0 };
                mostrarDetalleHoras = true;
            }
            
            const pagos = calcularPagoHoras(emp, horasDelDia);
            const totalEmpleado = pagos.ordinarias + pagos.extras + pagos.nocturnas + pagos.extrasNocturnas;
            
            totalGeneralOrdinarias += pagos.ordinarias;
            totalGeneralExtras += pagos.extras;
            totalGeneralNocturnas += pagos.nocturnas;
            totalGeneralExtrasNocturnas += pagos.extrasNocturnas;
            totalGeneralPago += totalEmpleado;
            
            if (mostrarFila) {
                const rowClass = emp.activo === false ? 'inactive-row' : '';
                
                html += `
                    <tr class="${rowClass}">
                        <td><strong>${emp.nombre || '—'}</strong> ${emp.activo === false ? '<span style="color: #ef4444; font-size: 0.8rem;">(Inactivo)</span>' : ''}</td>
                        <td>${emp.puesto || '—'}</td>
                        <td>₡${pagos.ordinarias.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                        <td>₡${pagos.extras.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                        <td>₡${pagos.nocturnas.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                        <td>₡${pagos.extrasNocturnas.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                        <td><strong>₡${totalEmpleado.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</strong></td>
                        <td>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-sm btn-outline" onclick="mostrarRegistroHoras('${local}', '${emp.id}', '${emp.nombre}')" title="Registrar horas">
                                    <i class="fas fa-clock"></i>
                                </button>
                                <button class="btn btn-sm btn-outline" onclick="editarEmpleado('${local}', '${emp.id}')" title="Editar empleado">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm ${emp.activo ? 'btn-warning' : 'btn-success'}" onclick="toggleActivoEmpleado('${local}', '${emp.id}', ${emp.activo})" title="${emp.activo ? 'Desactivar empleado' : 'Activar empleado'}">
                                    <i class="fas ${emp.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="eliminarEmpleado('${local}', '${emp.id}')" title="Eliminar permanentemente">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                    </tr>
                `;
                
                if (mostrarDetalleHoras && (horasDelDia.ordinarias > 0 || horasDelDia.extras > 0 || horasDelDia.nocturnas > 0 || horasDelDia.extrasNocturnas > 0)) {
                    html += `
                        <tr style="background: #f8fafc;">
                            <td colspan="8" style="padding: 5px 20px; font-size: 0.85rem; color: #64748b;">
                                Horas: Ord: ${horasDelDia.ordinarias.toFixed(1)}h, 
                                Ext: ${horasDelDia.extras.toFixed(1)}h, 
                                Noct: ${horasDelDia.nocturnas.toFixed(1)}h, 
                                Ext Noct: ${horasDelDia.extrasNocturnas.toFixed(1)}
                        </tr>
                    `;
                }
            }
        });
        
        html += `</tbody> </table> </div> </div>`;
    }
    
    if (totalGeneralPago > 0) {
        html += `
            <div class="card" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white;">
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; text-align: center;">
                    <div><div>TOTAL ORD</div><div>₡${totalGeneralOrdinarias.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div></div>
                    <div><div>TOTAL EXT</div><div>₡${totalGeneralExtras.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div></div>
                    <div><div>TOTAL NOCT</div><div>₡${totalGeneralNocturnas.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div></div>
                    <div><div>TOTAL EXT NOCT</div><div>₡${totalGeneralExtrasNocturnas.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div></div>
                    <div><div>TOTAL DÍA</div><div>₡${totalGeneralPago.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div></div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="card" style="background: #f1f5f9; color: #64748b; text-align: center; padding: 30px;">
                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <h3>No hay horas registradas para este período</h3>
                <p>Seleccione un empleado y haga clic en el icono de reloj para registrar horas.</p>
            </div>
        `;
    }
    
    html += `</div>`;
    planillaContent.innerHTML = html;
}

// ============================================
// FUNCIONES DE EMPLEADOS Y HORAS
// ============================================
function mostrarModalEmpleado(editLocal = null, editId = null) {
    const modal = document.getElementById('empleadoModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;
    
    document.getElementById('empleadoNombre').value = '';
    document.getElementById('empleadoPuesto').value = '';
    document.getElementById('empleadoSalario').value = '';
    document.getElementById('empleadoFechaIngreso').value = new Date().toISOString().split('T')[0];
    document.getElementById('empleadoNocturno').checked = false;
    document.getElementById('empleadoActivo').checked = true;
    
    const selectLocal = document.getElementById('empleadoLocal');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
        const localesPermitidos = window.getLocalesPermitidos ? window.getLocalesPermitidos() : [];
        AppState?.locales?.forEach(local => {
            if (localesPermitidos.includes(local.nombre)) {
                selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
            }
        });
        if (!window.esGerencia?.() && AppState?.usuario?.local) {
            selectLocal.value = AppState.usuario.local;
            selectLocal.disabled = true;
        }
    }
    
    if (editLocal && editId && window.planillaData) {
        const empleado = window.planillaData[editLocal]?.find(e => e.id === editId);
        if (empleado) {
            document.getElementById('empleadoNombre').value = empleado.nombre || '';
            document.getElementById('empleadoPuesto').value = empleado.puesto || '';
            document.getElementById('empleadoSalario').value = empleado.salario || '';
            document.getElementById('empleadoFechaIngreso').value = empleado.fechaIngreso || '';
            document.getElementById('empleadoActivo').checked = empleado.activo !== false;
            if (selectLocal) {
                selectLocal.value = editLocal;
                selectLocal.disabled = true;
            }
        }
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

async function guardarEmpleado() {
    const modal = document.getElementById('empleadoModal');
    const editLocal = modal.dataset.editLocal;
    const editId = modal.dataset.editId;
    
    const local = document.getElementById('empleadoLocal').value;
    const nombre = document.getElementById('empleadoNombre').value;
    const puesto = document.getElementById('empleadoPuesto').value;
    const salario = normalizarSalario(document.getElementById('empleadoSalario').value);
    const fechaIngreso = document.getElementById('empleadoFechaIngreso').value;
    const activo = document.getElementById('empleadoActivo')?.checked !== false;
    
    if (!local || !nombre || !puesto || !salario || !fechaIngreso) {
        alert('Complete todos los campos');
        return;
    }
    
    const empleadoData = {
        nombre: nombre.trim(),
        puesto: puesto.trim(),
        salario: salario,
        fechaIngreso: fechaIngreso,
        activo: activo,
        local: local,
        ultimaActualizacion: new Date().toISOString()
    };
    
    if (!editLocal || !editId) {
        empleadoData.fechaCreacion = new Date().toISOString();
    }
    
    try {
        if (editLocal && editId) {
            await firebase.database().ref(`planilla/${editLocal}/${editId}`).update(empleadoData);
            alert('✅ Empleado actualizado');
        } else {
            await firebase.database().ref(`planilla/${local}`).push(empleadoData);
            alert('✅ Empleado guardado');
        }
        cerrarModal('empleadoModal');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function editarEmpleado(local, id) {
    mostrarModalEmpleado(local, id);
}

async function toggleActivoEmpleado(local, empleadoId, estadoActual) {
    const nuevoEstado = !estadoActual;
    if (!confirm(`¿Está seguro de ${nuevoEstado ? 'activar' : 'desactivar'} este empleado?`)) return;
    try {
        await firebase.database().ref(`planilla/${local}/${empleadoId}/activo`).set(nuevoEstado);
        alert(`✅ Empleado ${nuevoEstado ? 'activado' : 'desactivado'}`);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function eliminarEmpleado(local, id) {
    if (!confirm('¿Eliminar permanentemente?')) return;
    try {
        await firebase.database().ref(`planilla/${local}/${id}`).remove();
        alert('✅ Empleado eliminado');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function toggleVerInactivos() {
    localStorage.setItem('verInactivos', !(localStorage.getItem('verInactivos') === 'true'));
    renderPlanilla();
}

// ============================================
// FUNCIONES DE REGISTRO DE HORAS
// ============================================
function mostrarRegistroHoras(local, empleadoId, nombre) {
    const modal = document.getElementById('horasModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal) return;
    
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    let fechaSugerida = new Date().toLocaleDateString('en-CA');
    if (filtroTiempo === 'ayer') {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        fechaSugerida = ayer.toLocaleDateString('en-CA');
    } else if (filtroTiempo === 'personalizado') {
        fechaSugerida = AppState?.filtros?.fechaPersonalizada || fechaSugerida;
    }
    
    modal.dataset.local = local;
    modal.dataset.empleadoId = empleadoId;
    
    document.getElementById('horasEmpleadoNombre').textContent = nombre;
    document.getElementById('horasEmpleadoLocal').textContent = local;
    document.getElementById('horasFecha').value = fechaSugerida;
    
    cargarHorasExistentes(local, empleadoId, fechaSugerida);
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

function cargarHorasExistentes(local, empleadoId, fecha) {
    const empleado = window.planillaData?.[local]?.find(e => e.id === empleadoId);
    const horas = empleado?.horas?.[fecha] || { ordinarias: 0, extras: 0, nocturnas: 0, extrasNocturnas: 0 };
    
    document.getElementById('horasOrdinarias').value = horas.ordinarias;
    document.getElementById('horasExtras').value = horas.extras;
    document.getElementById('horasNocturnas').value = horas.nocturnas;
    document.getElementById('horasExtrasNocturnas').value = horas.extrasNocturnas;
    actualizarResumenHoras();
}

function actualizarResumenHoras() {
    const modal = document.getElementById('horasModal');
    const local = modal?.dataset?.local;
    const empleadoId = modal?.dataset?.empleadoId;
    
    const ordinarias = parseFloat(document.getElementById('horasOrdinarias')?.value) || 0;
    const extras = parseFloat(document.getElementById('horasExtras')?.value) || 0;
    const nocturnas = parseFloat(document.getElementById('horasNocturnas')?.value) || 0;
    const extrasNocturnas = parseFloat(document.getElementById('horasExtrasNocturnas')?.value) || 0;
    
    const totalHoras = ordinarias + extras + nocturnas + extrasNocturnas;
    document.getElementById('resumenTotalHoras').textContent = totalHoras.toFixed(1);
    
    const empleado = window.planillaData?.[local]?.find(e => e.id === empleadoId);
    if (empleado) {
        const salarioHora = (empleado.salario || 0) / 240;
        const pagoTotal = (ordinarias * salarioHora) + (extras * salarioHora * 1.5) + 
                         (nocturnas * salarioHora * 1.2) + (extrasNocturnas * salarioHora * 1.8);
        document.getElementById('resumenPago').textContent = `₡${pagoTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
}

async function guardarHoras() {
    const modal = document.getElementById('horasModal');
    const local = modal.dataset.local;
    const empleadoId = modal.dataset.empleadoId;
    const fecha = document.getElementById('horasFecha').value;
    
    if (!fecha) return alert('Seleccione fecha');
    
    const horasData = {
        ordinarias: parseFloat(document.getElementById('horasOrdinarias').value) || 0,
        extras: parseFloat(document.getElementById('horasExtras').value) || 0,
        nocturnas: parseFloat(document.getElementById('horasNocturnas')?.value) || 0,
        extrasNocturnas: parseFloat(document.getElementById('horasExtrasNocturnas')?.value) || 0
    };
    
    try {
        await firebase.database().ref(`planilla/${local}/${empleadoId}/horas/${fecha}`).set(horasData);
        alert('✅ Horas registradas');
        cerrarModal('horasModal');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ============================================
// INICIALIZAR
// ============================================
function initPlanilla() {
    console.log('🚀 Inicializando planilla...');
    setTimeout(() => {
        if (AppState?.usuario) cargarPlanillaDesdeFirebase();
        else setTimeout(initPlanilla, 500);
    }, 100);
}

// ============================================
// EXPORTAR
// ============================================
window.renderPlanilla = renderPlanilla;
window.mostrarModalEmpleado = mostrarModalEmpleado;
window.guardarEmpleado = guardarEmpleado;
window.editarEmpleado = editarEmpleado;
window.eliminarEmpleado = eliminarEmpleado;
window.mostrarRegistroHoras = mostrarRegistroHoras;
window.guardarHoras = guardarHoras;
window.actualizarResumenHoras = actualizarResumenHoras;
window.toggleActivoEmpleado = toggleActivoEmpleado;
window.toggleVerInactivos = toggleVerInactivos;
window.initPlanilla = initPlanilla;

console.log('✅ planilla.js cargado correctamente');