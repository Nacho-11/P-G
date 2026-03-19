// modules/planilla.js

function limpiarFecha(fecha) {
    if (!fecha) return '';
    return fecha.split('T')[0];
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
        
        if (data) {
            for (const local in data) {
                planillaData[local] = [];
                for (const empId in data[local]) {
                    if (data[local][empId].nombre) {
                        planillaData[local].push({
                            id: empId,
                            ...data[local][empId]
                        });
                    }
                }
            }
            console.log('✅ Planilla cargada:', planillaData);
        }
        
        window.planillaData = planillaData;
        
        if (document.getElementById('planilla').classList.contains('active')) {
            renderPlanilla();
        }
    });
}

// ============================================
// CALCULAR PAGO POR HORAS (CORREGIDO SEGÚN LEY)
// ============================================
function calcularPagoHoras(empleado, horas) {
    const salarioMensual = parseFloat(empleado.salario) || 0;
    
    // Bases según tipo de jornada
    const HORAS_MENSUALES = {
        diurno: 240,    // 30 días × 8 horas
        nocturno: 180   // 30 días × 6 horas
    };
    
    // Valores por hora según el local
    const valorHoraDiurna = salarioMensual / HORAS_MENSUALES.diurno;
    const valorHoraNocturna = salarioMensual / HORAS_MENSUALES.nocturno; // Para Los Años Locos
    
    // Determinar si el empleado es de Los Años Locos (deberías tener esta info)
    const esAñosLocos = empleado.local?.includes('Los Años Locos') || false;
    
    // Calcular pagos
    let ordinarias = 0, extras = 0, nocturnas = 0, extrasNocturnas = 0;
    
    if (esAñosLocos) {
        // Para Los Años Locos: jornada nocturna
        ordinarias = horas.ordinarias * valorHoraNocturna; // Horas dentro de la jornada de 6h
        extras = horas.extras * valorHoraNocturna * 1.5;   // Horas extra sobre la jornada nocturna
        nocturnas = 0; // Ya están incluidas en ordinarias si es jornada nocturna
        extrasNocturnas = 0; // Ya están incluidas en extras si corresponde
        
        // Nota: Si necesitas diferenciar, ajusta según cómo registras las horas
        // Por ejemplo, si "nocturnas" son horas fuera de la jornada regular, ajústalo
        
    } else {
        // Para locales diurnos
        ordinarias = horas.ordinarias * valorHoraDiurna;
        extras = horas.extras * valorHoraDiurna * 1.5;
        nocturnas = horas.nocturnas * valorHoraNocturna; // Si trabajaron de noche ocasionalmente
        extrasNocturnas = horas.extrasNocturnas * valorHoraNocturna * 1.5;
    }
    
    return {
        ordinarias: ordinarias,
        extras: extras,
        nocturnas: nocturnas,
        extrasNocturnas: extrasNocturnas
    };
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
    console.log('Renderizando planilla...');
    const planillaContent = document.getElementById('planillaContent');
    if (!planillaContent) return;
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    
    let fechaMostrar = '';
    let fechaBuscar = '';

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
        fechaBuscar = AppState.filtros?.fechaPersonalizada || hoyStr;
        fechaMostrar = new Date(fechaBuscar + 'T12:00:00').toLocaleDateString('es-CR', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    }
    else if (filtroTiempo === 'mes') {
        fechaBuscar = hoyStr.substring(0, 7);
        const [año, mes] = hoyStr.split('-');
        const mesesNombre = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        fechaMostrar = `${mesesNombre[parseInt(mes)-1]} ${año}`;
    }
    else if (filtroTiempo === 'anio') {
        fechaBuscar = hoyStr.substring(0, 4);
        fechaMostrar = `Año ${fechaBuscar}`;
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
                    <button class="btn btn-primary" onclick="mostrarModalEmpleado()">
                        <i class="fas fa-plus"></i> Nuevo Empleado
                    </button>
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
    
    // FILTRAR POR LOCAL (con permisos)
    const localesAMostrar = filtroLocal === 'Todos' 
        ? Object.keys(planillaData).filter(local => puedeVerLocal(local))
        : [filtroLocal].filter(l => puedeVerLocal(l) && planillaData[l]);
    
    if (localesAMostrar.length === 0) {
        planillaContent.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2><i class="fas fa-users" style="color: var(--primary);"></i> Planilla Diaria</h2>
                    <button class="btn btn-primary" onclick="mostrarModalEmpleado()">
                        <i class="fas fa-plus"></i> Nuevo Empleado
                    </button>
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
                    <span style="background: #e0f2fe; padding: 5px 15px; border-radius: 20px; text-transform: capitalize;">
                        ${fechaMostrar}
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
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        empleados.forEach(emp => {
            if (!verInactivos && emp.activo === false) return;
            
            const rowClass = emp.activo === false ? 'inactive-row' : '';
            
            let horasDelDia = {
                ordinarias: 0,
                extras: 0,
                nocturnas: 0,
                extrasNocturnas: 0
            };

            let mostrarDetalleHoras = false;

            if (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado') {
                horasDelDia = emp.horas?.[fechaBuscar] || {
                    ordinarias: 0,
                    extras: 0,
                    nocturnas: 0,
                    extrasNocturnas: 0
                };
                mostrarDetalleHoras = true;
            }
            else if (filtroTiempo === 'mes') {
                if (emp.horas) {
                    Object.entries(emp.horas).forEach(([fecha, horas]) => {
                        if (fecha.substring(0, 7) === fechaBuscar) {
                            horasDelDia.ordinarias += horas.ordinarias || 0;
                            horasDelDia.extras += horas.extras || 0;
                            horasDelDia.nocturnas += horas.nocturnas || 0;
                            horasDelDia.extrasNocturnas += horas.extrasNocturnas || 0;
                        }
                    });
                }
                mostrarDetalleHoras = false;
            }
            else if (filtroTiempo === 'anio') {
                if (emp.horas) {
                    Object.entries(emp.horas).forEach(([fecha, horas]) => {
                        if (fecha.substring(0, 4) === fechaBuscar) {
                            horasDelDia.ordinarias += horas.ordinarias || 0;
                            horasDelDia.extras += horas.extras || 0;
                            horasDelDia.nocturnas += horas.nocturnas || 0;
                            horasDelDia.extrasNocturnas += horas.extrasNocturnas || 0;
                        }
                    });
                }
                mostrarDetalleHoras = false;
            }
            else {
                horasDelDia = emp.horas?.[hoyStr] || {
                    ordinarias: 0,
                    extras: 0,
                    nocturnas: 0,
                    extrasNocturnas: 0
                };
                mostrarDetalleHoras = true;
            }
            
            const pagos = calcularPagoHoras(emp, horasDelDia);
            const totalEmpleado = pagos.ordinarias + pagos.extras + pagos.nocturnas + pagos.extrasNocturnas;
            
            totalGeneralOrdinarias += pagos.ordinarias;
            totalGeneralExtras += pagos.extras;
            totalGeneralNocturnas += pagos.nocturnas;
            totalGeneralExtrasNocturnas += pagos.extrasNocturnas;
            totalGeneralPago += totalEmpleado;
            
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
                    </td>
                </tr>
            `;
            
            if (mostrarDetalleHoras && (horasDelDia.ordinarias > 0 || horasDelDia.extras > 0 || horasDelDia.nocturnas > 0 || horasDelDia.extrasNocturnas > 0)) {
                html += `
                    <tr style="background: #f8fafc;">
                        <td colspan="8" style="padding: 5px 20px; font-size: 0.85rem; color: #64748b;">
                            Horas: Ord: ${horasDelDia.ordinarias.toFixed(1)}h, 
                            Ext: ${horasDelDia.extras.toFixed(1)}h, 
                            Noct: ${horasDelDia.nocturnas.toFixed(1)}h, 
                            Ext Noct: ${horasDelDia.extrasNocturnas.toFixed(1)}h
                        </td>
                    </tr>
                `;
            }
        });
        
        html += `</tbody></table></div></div>`;
    }
    
    if (totalGeneralPago > 0) {
        html += `
            <div class="card" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white;">
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">TOTAL ORD</div>
                        <div style="font-size: 1.2rem; font-weight: bold;">₡${totalGeneralOrdinarias.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">TOTAL EXT</div>
                        <div style="font-size: 1.2rem; font-weight: bold;">₡${totalGeneralExtras.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">TOTAL NOCT</div>
                        <div style="font-size: 1.2rem; font-weight: bold;">₡${totalGeneralNocturnas.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">TOTAL EXT NOCT</div>
                        <div style="font-size: 1.2rem; font-weight: bold;">₡${totalGeneralExtrasNocturnas.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">TOTAL DÍA</div>
                        <div style="font-size: 1.8rem; font-weight: bold;">₡${totalGeneralPago.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                    </div>
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
// MOSTRAR REGISTRO DE HORAS
// ============================================
function mostrarRegistroHoras(local, empleadoId, nombre) {
    const modal = document.getElementById('horasModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal) return;
    
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    let fechaSugerida = '';
    
    if (filtroTiempo === 'ayer') {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        fechaSugerida = ayer.toLocaleDateString('en-CA');
    } 
    else if (filtroTiempo === 'personalizado') {
        fechaSugerida = AppState.filtros?.fechaPersonalizada || new Date().toLocaleDateString('en-CA');
    }
    else {
        fechaSugerida = new Date().toLocaleDateString('en-CA');
    }
    
    console.log('📅 Mostrando registro para:', { local, empleadoId, nombre, fechaSugerida });
    
    modal.dataset.local = local;
    modal.dataset.empleadoId = empleadoId;
    
    document.getElementById('horasEmpleadoNombre').textContent = nombre;
    document.getElementById('horasEmpleadoLocal').textContent = local;
    
    const nocturnoField = document.getElementById('nocturnoField');
    if (nocturnoField) {
        const esLosAñosLocos = local.includes('Los Años Locos');
        nocturnoField.style.display = esLosAñosLocos ? 'block' : 'none';
        console.log('🌙 Mostrar campos nocturnos:', esLosAñosLocos);
    }
    
    const fechaInput = document.getElementById('horasFecha');
    if (fechaInput) {
        fechaInput.value = fechaSugerida;
    }
    
    cargarHorasExistentes(local, empleadoId, fechaSugerida);
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// CARGAR HORAS EXISTENTES
// ============================================
function cargarHorasExistentes(local, empleadoId, fecha) {
    const empleado = window.planillaData?.[local]?.find(e => e.id === empleadoId);
    const horasExistentes = empleado?.horas?.[fecha] || {
        ordinarias: 0,
        extras: 0,
        nocturnas: 0,
        extrasNocturnas: 0
    };
    
    document.getElementById('horasOrdinarias').value = horasExistentes.ordinarias;
    document.getElementById('horasExtras').value = horasExistentes.extras;
    document.getElementById('horasNocturnas').value = horasExistentes.nocturnas;
    document.getElementById('horasExtrasNocturnas').value = horasExistentes.extrasNocturnas;
    
    actualizarResumenHoras();
}

// ============================================
// ACTUALIZAR RESUMEN DE HORAS
// ============================================
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
        const pagoTotal = (ordinarias * salarioHora) + 
                         (extras * salarioHora * 1.5) + 
                         (nocturnas * salarioHora * 1.2) + 
                         (extrasNocturnas * salarioHora * 1.8);
        
        document.getElementById('resumenPago').textContent = `₡${pagoTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    } else {
        document.getElementById('resumenPago').textContent = '₡0.00';
    }
}

// ============================================
// GUARDAR HORAS DEL DÍA
// ============================================
async function guardarHoras() {
    const modal = document.getElementById('horasModal');
    const local = modal.dataset.local;
    const empleadoId = modal.dataset.empleadoId;
    
    const fecha = document.getElementById('horasFecha').value;
    
    if (!fecha) {
        alert('Debe seleccionar una fecha');
        return;
    }
    
    const ordinarias = parseFloat(document.getElementById('horasOrdinarias').value) || 0;
    const extras = parseFloat(document.getElementById('horasExtras').value) || 0;
    const nocturnas = parseFloat(document.getElementById('horasNocturnas')?.value) || 0;
    const extrasNocturnas = parseFloat(document.getElementById('horasExtrasNocturnas')?.value) || 0;
    
    const totalHoras = ordinarias + extras + nocturnas + extrasNocturnas;
    if (totalHoras > 24) {
        alert('El total de horas no puede exceder 24 horas');
        return;
    }
    
    const horasData = {
        ordinarias,
        extras,
        nocturnas,
        extrasNocturnas
    };
    
    try {
        await firebase.database()
            .ref(`planilla/${local}/${empleadoId}/horas/${fecha}`)
            .set(horasData);
        
        const fechaObj = new Date(fecha + 'T12:00:00');
        const fechaFormateada = fechaObj.toLocaleDateString('es-CR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        alert(`✅ Horas registradas para ${fechaFormateada}`);
        cerrarModal('horasModal');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    }
}

// ============================================
// ATAJOS RÁPIDOS PARA FECHAS
// ============================================
function setFechaRapida(tipo) {
    const fechaInput = document.getElementById('horasFecha');
    const modal = document.getElementById('horasModal');
    const local = modal?.dataset?.local;
    const empleadoId = modal?.dataset?.empleadoId;
    
    const hoy = new Date();
    let nuevaFecha = new Date();
    
    switch(tipo) {
        case 'ayer':
            nuevaFecha.setDate(hoy.getDate() - 1);
            break;
        case 'hoy':
            nuevaFecha = hoy;
            break;
        case 'manana':
            nuevaFecha.setDate(hoy.getDate() + 1);
            break;
    }
    
    const fechaStr = nuevaFecha.toLocaleDateString('en-CA');
    fechaInput.value = fechaStr;
    
    if (local && empleadoId) {
        cargarHorasExistentes(local, empleadoId, fechaStr);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const fechaInput = document.getElementById('horasFecha');
    if (fechaInput) {
        fechaInput.addEventListener('change', function(e) {
            const modal = document.getElementById('horasModal');
            const local = modal?.dataset?.local;
            const empleadoId = modal?.dataset?.empleadoId;
            const nuevaFecha = e.target.value;
            
            if (local && empleadoId && nuevaFecha) {
                console.log('📅 Fecha cambiada manualmente a:', nuevaFecha);
                cargarHorasExistentes(local, empleadoId, nuevaFecha);
            }
        });
    }
});

// ============================================
// MOSTRAR MODAL DE EMPLEADO
// ============================================
function mostrarModalEmpleado(editLocal = null, editId = null) {
    console.log('📝 Mostrar modal empleado:', { editLocal, editId });
    
    const modal = document.getElementById('empleadoModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) {
        console.error('❌ No se encontró el modal');
        return;
    }
    
    const header = document.getElementById('empleadoModalHeader');
    const icon = document.getElementById('empleadoModalIcon');
    const badge = document.getElementById('empleadoModalBadge');
    const title = document.getElementById('empleadoModalTitle');
    const subtitle = document.getElementById('empleadoModalSubtitle');
    const submitBtn = document.getElementById('empleadoSubmitBtn');
    const campoLocalEditable = document.getElementById('campoLocalEditable');
    const campoLocalSoloLectura = document.getElementById('campoLocalSoloLectura');
    const localDisplay = document.getElementById('empleadoLocalDisplay');
    const campoNocturnoNuevo = document.getElementById('campoNocturnoNuevo');
    const campoActivoEdicion = document.getElementById('campoActivoEdicion');
    const mensajeActivoNuevo = document.getElementById('mensajeActivoNuevo');
    const mensajeNocturnoEdicion = document.getElementById('mensajeNocturnoEdicion');
    
    document.getElementById('empleadoNombre').value = '';
    document.getElementById('empleadoPuesto').value = '';
    document.getElementById('empleadoSalario').value = '';
    document.getElementById('empleadoFechaIngreso').value = new Date().toISOString().split('T')[0];
    document.getElementById('empleadoNocturno').checked = false;
    document.getElementById('empleadoActivo').checked = true;
    
    const localSelect = document.getElementById('empleadoLocal');
    if (!localSelect) {
        console.error('❌ No se encontró el elemento empleadoLocal');
        return;
    }

    localSelect.innerHTML = '<option value="">Seleccionar local...</option>';
    localSelect.disabled = false;

    let localesAMostrar = [];
    if (esGerencia()) {
        localesAMostrar = AppState.locales;
    } else {
        localesAMostrar = AppState.locales.filter(l => l.nombre === AppState.usuario?.local);
    }

    localesAMostrar.forEach(local => {
        localSelect.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
    });
    
    if (editLocal && editId) {
        console.log('✏️ Editando empleado:', editLocal, editId);
        
        const empleado = window.planillaData?.[editLocal]?.find(e => e.id === editId);
        
        if (empleado) {
            console.log('✅ Empleado encontrado:', empleado);
            
            header.style.background = 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)';
            icon.className = 'fas fa-user-edit';
            badge.innerHTML = '<i class="fas fa-pen"></i> EDITANDO';
            badge.style.background = '#FCD34D';
            badge.style.color = '#92400E';
            title.textContent = 'Editar Empleado';
            subtitle.textContent = 'Modifique la información del empleado';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> GUARDAR CAMBIOS';
            submitBtn.style.background = 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)';
            
            campoLocalEditable.style.display = 'none';
            campoLocalSoloLectura.style.display = 'block';
            localDisplay.textContent = editLocal;
            
            campoNocturnoNuevo.style.display = 'none';
            campoActivoEdicion.style.display = 'flex';
            mensajeActivoNuevo.style.display = 'none';
            mensajeNocturnoEdicion.style.display = 'flex';
            
            document.getElementById('empleadoNombre').value = empleado.nombre || '';
            document.getElementById('empleadoPuesto').value = empleado.puesto || '';
            document.getElementById('empleadoSalario').value = empleado.salario || '';
            document.getElementById('empleadoFechaIngreso').value = empleado.fechaIngreso || '';
            document.getElementById('empleadoActivo').checked = empleado.activo !== false;
            
            modal.dataset.editLocal = editLocal;
            modal.dataset.editId = editId;
            
        } else {
            console.error('❌ Empleado no encontrado');
            return;
        }
    } else {
        header.style.background = 'linear-gradient(145deg, #0B5E42 0%, #1A8F6E 100%)';
        icon.className = 'fas fa-user-plus';
        badge.innerHTML = '<i class="fas fa-plus-circle"></i> NUEVO';
        badge.style.background = '#FFD966';
        badge.style.color = '#0B5E42';
        title.textContent = 'Incorporar Empleado';
        subtitle.textContent = 'Complete los datos para agregar un nuevo colaborador';
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> CONFIRMAR NUEVO EMPLEADO';
        submitBtn.style.background = '#0B5E42';
        
        campoLocalEditable.style.display = 'block';
        campoLocalSoloLectura.style.display = 'none';
        
        campoNocturnoNuevo.style.display = 'flex';
        campoActivoEdicion.style.display = 'none';
        mensajeActivoNuevo.style.display = 'flex';
        mensajeNocturnoEdicion.style.display = 'none';
        
        if (!esGerencia() && AppState.usuario?.local) {
            document.getElementById('empleadoLocal').value = AppState.usuario.local;
            document.getElementById('empleadoLocal').disabled = true;
        }
        
        delete modal.dataset.editLocal;
        delete modal.dataset.editId;
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// GUARDAR EMPLEADO
// ============================================
async function guardarEmpleado() {
    console.log('💾 Guardando empleado...');
    
    const modal = document.getElementById('empleadoModal');
    const editLocal = modal.dataset.editLocal;
    const editId = modal.dataset.editId;
    
    const local = document.getElementById('empleadoLocal').value;
    const nombre = document.getElementById('empleadoNombre').value;
    const puesto = document.getElementById('empleadoPuesto').value;
    const salarioInput = document.getElementById('empleadoSalario').value;
    const salario = normalizarSalario(salarioInput);
    const fechaIngreso = document.getElementById('empleadoFechaIngreso').value;
    const activo = document.getElementById('empleadoActivo').checked;
    const nocturno = document.getElementById('empleadoNocturno').checked;
    
    console.log('📝 Datos:', { local, nombre, puesto, salario, fechaIngreso, activo, nocturno, editLocal, editId });
    
    if (!local || !nombre || !puesto || !salario || !fechaIngreso) {
        alert('Complete todos los campos');
        return;
    }
    
    if (salario <= 0) {
        alert('El salario debe ser mayor a 0');
        return;
    }
    
    try {
        const empleadoData = {
            nombre, 
            puesto, 
            salario, 
            fechaIngreso, 
            activo, 
            nocturno,
            salarioQuincenal: salario / 2,
            salarioHoraOrdinaria: salario / 240,
            salarioHoraExtra: (salario / 240) * 1.5,
            ultimaActualizacionSalario: new Date().toISOString(),
            creadoPor: AppState.usuario?.email || 'sistema'
        };
        
        if (!editLocal || !editId) {
            empleadoData.fechaCreacion = new Date().toISOString();
        }
        
        const ref = firebase.database().ref(`planilla/${local}`);
        
        if (editLocal && editId) {
            console.log('🔄 Actualizando empleado:', editId);
            await ref.child(editId).update(empleadoData);
            alert('✅ Empleado actualizado');
        } else {
            console.log('🆕 Creando nuevo empleado');
            await ref.push(empleadoData);
            alert('✅ Empleado guardado');
        }
        
        cerrarModal('empleadoModal');
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al guardar: ' + error.message);
    }
}

function editarEmpleado(local, id) {
    console.log('🔍 Editar empleado llamado:', local, id);
    mostrarModalEmpleado(local, id);
}

async function toggleActivoEmpleado(local, empleadoId, estadoActual) {
    const nuevoEstado = !estadoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Está seguro de ${accion} este empleado?`)) return;
    
    try {
        await firebase.database()
            .ref(`planilla/${local}/${empleadoId}/activo`)
            .set(nuevoEstado);
        
        alert(`✅ Empleado ${accion}do correctamente`);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado del empleado');
    }
}

async function eliminarEmpleado(local, id) {
    const empleado = window.planillaData?.[local]?.find(e => e.id === id);
    const tieneHoras = empleado?.horas && Object.keys(empleado.horas).length > 0;
    
    let mensaje = '¿Está seguro de eliminar este empleado?';
    if (tieneHoras) {
        mensaje = '⚠️ Este empleado tiene horas registradas. ¿Eliminar permanentemente?';
    }
    
    if (!confirm(mensaje)) return;
    
    try {
        await firebase.database().ref(`planilla/${local}/${id}`).remove();
        alert('✅ Empleado eliminado permanentemente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el empleado');
    }
}

function toggleVerInactivos() {
    const verInactivos = localStorage.getItem('verInactivos') === 'true';
    localStorage.setItem('verInactivos', !verInactivos);
    renderPlanilla();
}

function initPlanilla() {
    console.log('Inicializando planilla...');
    setTimeout(() => {
        if (AppState?.usuario) {
            cargarPlanillaDesdeFirebase();
        } else {
            setTimeout(initPlanilla, 500);
        }
    }, 100);
}

window.renderPlanilla = renderPlanilla;
window.mostrarModalEmpleado = mostrarModalEmpleado;
window.guardarEmpleado = guardarEmpleado;
window.eliminarEmpleado = eliminarEmpleado;
window.editarEmpleado = editarEmpleado;
window.mostrarRegistroHoras = mostrarRegistroHoras;
window.guardarHoras = guardarHoras;
window.actualizarResumenHoras = actualizarResumenHoras;
window.cargarPlanillaDesdeFirebase = cargarPlanillaDesdeFirebase;
window.initPlanilla = initPlanilla;
window.toggleActivoEmpleado = toggleActivoEmpleado;
window.toggleVerInactivos = toggleVerInactivos;
window.formatCurrency = formatCurrency;
window.normalizarSalario = normalizarSalario;