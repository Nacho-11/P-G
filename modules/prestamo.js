// modules/prestamo.js
// Módulo para gestión de préstamos de colaboradores
// VERSIÓN MEJORADA - Incluye horas nocturnas y extras nocturnas

console.log('💰 Cargando módulo de Préstamo de Colaboradores (con horas nocturnas)...');

// ============================================
// VARIABLES GLOBALES
// ============================================
let prestamos = [];
let empleadosPrestamo = [];

// ============================================
// CONSTANTES CORREGIDAS SEGÚN LEY COSTARRICENSE
// ============================================
const HORAS_MENSUALES = {
    diurno: 240,    // 30 días × 8 horas
    nocturno: 180,  // 30 días × 6 horas
    mixto: 210      // 30 días × 7 horas (si aplica)
};

const RECARGOS = {
    extraDiurna: 1.5,      // 50% sobre hora diurna
    extraNocturna: 1.5,    // 50% sobre hora nocturna (no sobre la diurna)
    nocturna: 1.0,         // La nocturna ya es más cara por la base de 180h
    extraNocturnaTotal: 2.25 // (Salario/180) × 1.5 × 1.5? No, simplifiquemos
};

// ============================================
// INICIALIZAR MÓDULO
// ============================================
function initPrestamo() {
    console.log('🚀 Inicializando módulo de Préstamo...');
    
    if (!AppState?.usuario) {
        console.log('⏳ Esperando autenticación...');
        return;
    }
    
    cargarEmpleadosPrestamo();
    cargarPrestamos();
    
    if (document.getElementById('prestamo').classList.contains('active')) {
        renderPrestamo();
    }
}

// ============================================
// CARGAR EMPLEADOS (desde planilla)
// ============================================
function cargarEmpleadosPrestamo() {
    console.log('📥 Cargando empleados para préstamo...');
    
    const planillaData = window.planillaData || {};
    empleadosPrestamo = [];
    
    if (Object.keys(planillaData).length === 0) {
        console.log('⏳ Esperando datos de planilla...');
        setTimeout(cargarEmpleadosPrestamo, 500);
        return;
    }
    
    // Obtener locales permitidos
    const localesPermitidos = getLocalesPermitidos();
    
    Object.keys(planillaData).forEach(local => {
        // Filtrar por local permitido
        if (!localesPermitidos.includes(local)) return;
        
        planillaData[local].forEach(emp => {
            if (emp.activo !== false) {
                empleadosPrestamo.push({
                    id: emp.id,
                    nombre: emp.nombre,
                    salario: emp.salario,
                    local: local
                });
            }
        });
    });
    
    console.log(`✅ ${empleadosPrestamo.length} empleados disponibles`);
}

// ============================================
// CARGAR PRÉSTAMOS DESDE FIREBASE
// ============================================
function cargarPrestamos() {
    console.log('📥 Cargando registros de préstamo...');
    
    firebase.database().ref('prestamos').on('value', (snapshot) => {
        const data = snapshot.val();
        prestamos = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                prestamos.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        
        console.log(`✅ ${prestamos.length} registros de préstamo cargados`);
        
        if (document.getElementById('prestamo').classList.contains('active')) {
            renderPrestamo();
        }
    });
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================
function renderPrestamo() {
    console.log('📊 Renderizando Préstamo de Colaboradores...');
    
    const content = document.getElementById('prestamoContent');
    if (!content) return;
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    
    // Filtrar préstamos por local
    const prestamosFiltrados = prestamos.filter(p => {
        if (filtroLocal !== 'Todos' && p.local !== filtroLocal) return false;
        if (!puedeVerLocal(p.local)) return false;
        return true;
    });
    
    // Calcular totales
    const totalPrestamos = prestamosFiltrados.reduce((sum, p) => sum + (p.totales?.totalPago || 0), 0);
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-hand-holding-usd" style="color: #8b5cf6;"></i> Préstamo de Colaboradores</h2>
            <div style="display: flex; gap: 10px;">
                ${esGerencia() ? `
                    <button class="btn btn-primary" onclick="window.mostrarModalPrestamo()">
                        <i class="fas fa-plus"></i> Nuevo Préstamo
                    </button>
                ` : ''}
            </div>
        </div>
        
        <!-- Tarjeta de total general -->
        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 16px; padding: 25px; color: white; margin-bottom: 25px; box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.3);">
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-calculator" style="font-size: 2rem;"></i>
                </div>
                <div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">TOTAL PRÉSTAMOS</div>
                    <div style="font-size: 2.5rem; font-weight: 700;">₡${totalPrestamos.toLocaleString()}</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">${prestamosFiltrados.length} registros</div>
                </div>
            </div>
        </div>
    `;
    
    if (prestamosFiltrados.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-hand-holding-usd" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3>No hay préstamos registrados</h3>
                <p>Haga clic en "Nuevo Préstamo" para comenzar.</p>
            </div>
        `;
    } else {
        html += `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;"><i class="fas fa-list"></i> Listado de Préstamos</h3>
                    <span style="background: #f1f5f9; padding: 5px 15px; border-radius: 20px;">
                        Total: ₡${totalPrestamos.toLocaleString()}
                    </span>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Local</th>
                                <th>Período</th>
                                <th>Horas</th>
                                <th>Total Pago</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        prestamosFiltrados.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
        
        prestamosFiltrados.forEach(p => {
            const horas = p.horas || {};
            const totalHoras = (horas.ordinarias || 0) + (horas.extras || 0) + 
                              (horas.nocturnas || 0) + (horas.extrasNocturnas || 0);
            
            html += `
                <tr>
                    <td><strong>${p.empleadoNombre || '—'}</strong></td>
                    <td>${p.local || '—'}</td>
                    <td>${p.periodo || '—'}</td>
                    <td>${totalHoras.toFixed(1)} h</td>
                    <td style="color: #8b5cf6; font-weight: 600;">₡${(p.totales?.totalPago || 0).toLocaleString()}</td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm btn-outline" onclick="window.editarPrestamo('${p.id}')" title="Ver detalle">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${esGerencia() ? `
                                <button class="btn btn-sm btn-danger" onclick="window.eliminarPrestamo('${p.id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// ============================================
// BUSCAR EMPLEADOS
// ============================================
function buscarEmpleados() {
    const busqueda = document.getElementById('buscadorEmpleado')?.value.toLowerCase() || '';
    const resultadosDiv = document.getElementById('resultadosEmpleados');
    
    if (busqueda.length < 2) {
        resultadosDiv.style.display = 'none';
        return;
    }
    
    const resultados = empleadosPrestamo.filter(e => 
        (e.nombre || '').toLowerCase().includes(busqueda) || 
        (e.local || '').toLowerCase().includes(busqueda)
    ).slice(0, 30);
    
    if (resultados.length === 0) {
        resultadosDiv.innerHTML = `<div style="padding: 20px; text-align: center;">No se encontraron empleados</div>`;
        resultadosDiv.style.display = 'block';
        return;
    }
    
    let html = '';
    resultados.forEach(e => {
        const salarioHora = (e.salario || 0) / 240;
        const salarioHoraExtra = salarioHora * 1.5;
        const salarioHoraNocturna = salarioHora * 1.2;
        const salarioHoraExtraNocturna = salarioHora * 1.8;
        
        html += `
            <div onclick="seleccionarEmpleado('${e.id}')" style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div><strong>${e.nombre}</strong> (${e.local})</div>
                <div style="font-size: 0.9rem; color: #666;">
                    Salario: ₡${(e.salario || 0).toLocaleString()}<br>
                    Hora ord: ₡${salarioHora.toFixed(2)} | Extra: ₡${salarioHoraExtra.toFixed(2)}
                    ${e.local.includes('Años Locos') ? `<br>🌙 Noct: ₡${salarioHoraNocturna.toFixed(2)} | Ext Noct: ₡${salarioHoraExtraNocturna.toFixed(2)}` : ''}
                </div>
            </div>
        `;
    });
    
    resultadosDiv.innerHTML = html;
    resultadosDiv.style.display = 'block';
}

// ============================================
// SELECCIONAR EMPLEADO
// ============================================
function seleccionarEmpleado(empleadoId) {
    const empleado = empleadosPrestamo.find(e => e.id === empleadoId);
    if (!empleado) return;
    
    document.getElementById('prestamoEmpleadoId').value = empleadoId;
    document.getElementById('empleadoSeleccionado').style.display = 'block';
    document.getElementById('empleadoSeleccionadoNombre').textContent = empleado.nombre;
    
    const salarioHora = (empleado.salario || 0) / 240;
    const salarioHoraExtra = salarioHora * 1.5;
    const salarioHoraNocturna = salarioHora * 1.2;
    const salarioHoraExtraNocturna = salarioHora * 1.8;
    
    let detalle = `${empleado.local} | Salario: ₡${(empleado.salario || 0).toLocaleString()}<br>`;
    detalle += `Ord: ₡${salarioHora.toFixed(2)} | Extra: ₡${salarioHoraExtra.toFixed(2)}`;
    
    if (empleado.local.includes('Años Locos')) {
        detalle += `<br>🌙 Noct: ₡${salarioHoraNocturna.toFixed(2)} | Ext Noct: ₡${salarioHoraExtraNocturna.toFixed(2)}`;
    }
    
    document.getElementById('empleadoSeleccionadoDetalle').innerHTML = detalle;
    
    document.getElementById('resultadosEmpleados').style.display = 'none';
    document.getElementById('buscadorEmpleado').value = '';
    
    // Guardar datos del empleado para cálculos
    document.getElementById('prestamoEmpleadoSalario').value = empleado.salario || 0;
    document.getElementById('prestamoEmpleadoLocal').value = empleado.local;
    
    // Mostrar/ocultar campos nocturnos según el local
    const esAñosLocos = empleado.local.includes('Años Locos');
    document.getElementById('camposNocturnos').style.display = esAñosLocos ? 'block' : 'none';

     // ✅ Preseleccionar su local original
    const selectLocalTrabajo = document.getElementById('prestamoLocalTrabajo');
    if (selectLocalTrabajo) {
        selectLocalTrabajo.value = empleado.local;
        actualizarCamposPorLocal(); // Esto actualizará los campos nocturnos
    }
    
    // Calcular total inicial
    calcularTotalPrestamo();
}

// ============================================
// ACTUALIZAR CAMPOS SEGÚN LOCAL SELECCIONADO
// ============================================
function actualizarCamposPorLocal() {
    console.log('🔄 Actualizando campos por local...');
    
    const localTrabajo = document.getElementById('prestamoLocalTrabajo')?.value || '';
    const esAñosLocos = localTrabajo.includes('Los Años Locos');
    
    console.log('📍 Local seleccionado:', localTrabajo, '| Es años locos:', esAñosLocos);
    
    // ✅ Buscar el div de campos nocturnos (el que está en el HTML)
    const camposNocturnos = document.getElementById('camposNocturnos');
    
    if (camposNocturnos) {
        // Mostrar u ocultar según la selección
        camposNocturnos.style.display = esAñosLocos ? 'block' : 'none';
        console.log('🌙 Campos nocturnos:', esAñosLocos ? 'MOSTRADOS' : 'OCULTADOS');
    } else {
        console.error('❌ No se encontró el elemento #camposNocturnos');
    }
    
    // Actualizar el cálculo
    calcularTotalPrestamo();
}

// ============================================
// CREAR CAMPOS NOCTURNOS (si no existen)
// ============================================
function crearCamposNocturnos() {
    const horasSection = document.querySelector('[id^="prestamoOrdinarias"]')?.closest('div[style*="grid-template-columns"]')?.parentNode;
    
    if (!horasSection) return;
    
    const camposNocturnos = document.createElement('div');
    camposNocturnos.id = 'camposNocturnosPrestamo';
    camposNocturnos.style.display = 'none';
    camposNocturnos.style.marginTop = '20px';
    camposNocturnos.style.padding = '20px';
    camposNocturnos.style.background = 'linear-gradient(135deg, #f3e8ff, #ede9fe)';
    camposNocturnos.style.borderRadius = '16px';
    camposNocturnos.style.border = '2px solid #8b5cf6';
    
    camposNocturnos.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
            <i class="fas fa-moon" style="color: #8b5cf6; font-size: 1.2rem;"></i>
            <span style="font-weight: 700; color: #8b5cf6;">HORAS NOCTURNAS (Los Años Locos)</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <label style="font-weight: 600; color: #4b5563; display: block; margin-bottom: 5px;">
                    <i class="fas fa-moon" style="color: #8b5cf6;"></i> Horas Nocturnas (20%)
                </label>
                <input type="number" id="prestamoNocturnas" min="0" step="0.5" value="0" oninput="calcularTotalPrestamo()" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 12px;">
            </div>
            
            <div>
                <label style="font-weight: 600; color: #4b5563; display: block; margin-bottom: 5px;">
                    <i class="fas fa-star" style="color: #8b5cf6;"></i> Horas Extra Nocturnas (80%)
                </label>
                <input type="number" id="prestamoExtrasNocturnas" min="0" step="0.5" value="0" oninput="calcularTotalPrestamo()" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 12px;">
            </div>
        </div>
        
        <p style="margin: 10px 0 0; color: #6b7280; font-size: 0.85rem;">
            <i class="fas fa-info-circle"></i> Recargos: Nocturnas +20% | Extra Nocturnas +80%
        </p>
    `;
    
    // Insertar después de las horas ordinarias/extras
    const referencia = document.getElementById('prestamoExtras')?.closest('div[style*="grid-template-columns"]')?.parentNode;
    if (referencia && referencia.parentNode) {
        referencia.parentNode.insertBefore(camposNocturnos, referencia.nextSibling);
    }
}

// ============================================
// CALCULAR TOTAL DEL PRÉSTAMO (CORREGIDO)
// ============================================
function calcularTotalPrestamo() {
    console.log('🧮 Calculando total del préstamo...');
    
    const empleadoId = document.getElementById('prestamoEmpleadoId')?.value;
    const localTrabajo = document.getElementById('prestamoLocalTrabajo')?.value || '';
    const salario = parseFloat(document.getElementById('prestamoEmpleadoSalario')?.value) || 0;
    
    if (!empleadoId || salario === 0) {
        document.getElementById('valorHoraOrd').textContent = '₡0';
        document.getElementById('valorHoraExtra').textContent = '₡0';
        document.getElementById('totalPagoCalculado').textContent = '₡0';
        return;
    }
    
    const esAñosLocos = localTrabajo.includes('Los Años Locos');
    
    // Obtener horas
    const ordinarias = parseFloat(document.getElementById('prestamoOrdinarias').value) || 0;
    const extras = parseFloat(document.getElementById('prestamoExtras').value) || 0;
    const nocturnas = esAñosLocos ? (parseFloat(document.getElementById('prestamoNocturnas')?.value) || 0) : 0;
    const extrasNocturnas = esAñosLocos ? (parseFloat(document.getElementById('prestamoExtrasNocturnas')?.value) || 0) : 0;
    
    // ✅ CÁLCULOS CORREGIDOS SEGÚN LEY
    
    // Horas diurnas (para empleados que trabajan de día)
    const valorHoraDiurna = salario / HORAS_MENSUALES.diurno;
    const valorHoraExtraDiurna = valorHoraDiurna * RECARGOS.extraDiurna;
    
    // Horas nocturnas (para Los Años Locos)
    const valorHoraNocturna = salario / HORAS_MENSUALES.nocturno; // ¡Base 180, no 240!
    const valorHoraExtraNocturna = valorHoraNocturna * RECARGOS.extraNocturna;
    
    // Calcular pagos
    const pagoOrdinariasDiurnas = ordinarias * valorHoraDiurna;
    const pagoExtrasDiurnas = extras * valorHoraExtraDiurna;
    const pagoNocturnas = nocturnas * valorHoraNocturna;
    const pagoExtrasNocturnas = extrasNocturnas * valorHoraExtraNocturna;
    
    const total = pagoOrdinariasDiurnas + pagoExtrasDiurnas + pagoNocturnas + pagoExtrasNocturnas;
    
    console.log('📊 Cálculo corregido:', {
        ordinarias, extras, nocturnas, extrasNocturnas,
        valorHoraDiurna, valorHoraNocturna,
        valorHoraExtraDiurna, valorHoraExtraNocturna,
        total
    });
    
    // Actualizar UI
    document.getElementById('valorHoraOrd').textContent = `₡${valorHoraDiurna.toFixed(2)}`;
    document.getElementById('valorHoraExtra').textContent = `₡${valorHoraExtraDiurna.toFixed(2)}`;
    
    if (esAñosLocos) {
        document.getElementById('resumenNocturno').style.display = 'grid';
        document.getElementById('valorHoraNocturna').textContent = `₡${valorHoraNocturna.toFixed(2)}`;
        document.getElementById('valorHoraExtraNocturna').textContent = `₡${valorHoraExtraNocturna.toFixed(2)}`;
    } else {
        document.getElementById('resumenNocturno').style.display = 'none';
    }
    
    document.getElementById('totalPagoCalculado').textContent = `₡${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// ============================================
// LIMPIAR SELECCIÓN DE EMPLEADO
// ============================================
function limpiarSeleccionEmpleado() {
    document.getElementById('prestamoEmpleadoId').value = '';
    document.getElementById('empleadoSeleccionado').style.display = 'none';
    document.getElementById('resultadosEmpleados').style.display = 'none';
    document.getElementById('buscadorEmpleado').value = '';
    document.getElementById('camposNocturnos').style.display = 'none';
}

// ============================================
// MOSTRAR MODAL DE PRÉSTAMO (CON HORAS NOCTURNAS)
// ============================================
function mostrarModalPrestamo(editId = null) {
    console.log('📝 Abriendo modal de préstamo');
    
    const overlay = document.getElementById('modalOverlay');
    
    // Crear modal dinámico
    const modalExistente = document.getElementById('prestamoModal');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'prestamoModal';
    modal.className = 'modal';
    modal.style.maxWidth = '900px';
    modal.style.width = '95%';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    
    // Si es edición, buscar el préstamo
    let prestamoEdit = null;
    if (editId) {
        prestamoEdit = prestamos.find(p => p.id === editId);
    }
    
    // Preparar valores para edición
    const empleadoIdEdit = prestamoEdit?.empleadoId || '';
    const empleadoNombreEdit = prestamoEdit?.empleadoNombre || '';
    const empleadoLocalEdit = prestamoEdit?.local || '';
    const empleadoSalarioEdit = prestamoEdit?.salario || 0;
    const periodoEdit = prestamoEdit?.periodo || new Date().toISOString().slice(0, 7);
    
    // Horas
    const ordinariasEdit = prestamoEdit?.horas?.ordinarias || 0;
    const extrasEdit = prestamoEdit?.horas?.extras || 0;
    const nocturnasEdit = prestamoEdit?.horas?.nocturnas || 0;
    const extrasNocturnasEdit = prestamoEdit?.horas?.extrasNocturnas || 0;
    
    const observacionesEdit = prestamoEdit?.observaciones || '';
    
    // Determinar si mostrar campos nocturnos
    const mostrarNocturnos = empleadoLocalEdit.includes('Años Locos');
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-hand-holding-usd" style="font-size: 1.8rem;"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem;">${editId ? 'Editar' : 'Nuevo'} Préstamo</h2>
                    <p style="margin: 4px 0 0; opacity: 0.8;">Complete los datos del préstamo</p>
                </div>
            </div>
        </div>
        
        <div class="modal-body" style="padding: 25px; background: #f8fafc; max-height: 80vh; overflow-y: auto;">
            <form id="prestamoForm" onsubmit="event.preventDefault(); window.guardarPrestamo('${editId || ''}');">
                
                <!-- SECCIÓN SUPERIOR: Búsqueda y Período -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
                    
                    <!-- Columna Izquierda: Buscador de empleados -->
                    <div style="background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <i class="fas fa-user" style="color: #8b5cf6;"></i> Buscar Colaborador
                        </label>
                        <input type="text" 
                            id="buscadorEmpleado" 
                            placeholder="Escriba para buscar (ej: Juan, María, Alajuela...)" 
                            oninput="buscarEmpleados()"
                            style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px; font-size: 1rem;">
                        
                        <div id="resultadosEmpleados" style="display: none; margin-top: 10px; max-height: 200px; overflow-y: auto; border: 2px solid #eef2f6; border-radius: 12px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        </div>
                        
                        <div id="empleadoSeleccionado" style="display: ${editId ? 'block' : 'none'}; background: #f3e8ff; border: 2px solid #8b5cf6; border-radius: 12px; padding: 15px; margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;">EMPLEADO SELECCIONADO</div>
                                    <div style="font-size: 1.2rem; font-weight: 600;" id="empleadoSeleccionadoNombre">${empleadoNombreEdit}</div>
                                    <div style="font-size: 0.9rem; color: #64748b;" id="empleadoSeleccionadoDetalle"></div>
                                </div>
                                <button type="button" onclick="limpiarSeleccionEmpleado()" style="background: none; border: none; color: #8b5cf6; cursor: pointer; padding: 8px;">
                                    <i class="fas fa-times"></i> Cambiar
                                </button>
                            </div>
                        </div>

                        <!-- SELECTOR DE LOCAL DONDE TRABAJÓ -->
                        <div id="selectorLocalTrabajo" style="margin-top: 20px; background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 2px solid #8b5cf6;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                                <div style="background: #8b5cf6; width: 4px; height: 24px; border-radius: 4px;"></div>
                                <span style="font-weight: 600; color: #1e293b;">
                                    <i class="fas fa-store" style="color: #8b5cf6; margin-right: 8px;"></i>
                                    Local donde trabajó realmente
                                </span>
                            </div>
                            
                            <label style="font-weight: 500; color: #475569; display: block; margin-bottom: 8px;">
                                Seleccione el local donde el empleado realizó las horas:
                            </label>
                            
                            <select id="prestamoLocalTrabajo" onchange="actualizarCamposPorLocal()" style="width: 100%; padding: 14px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1rem; background: white; margin-bottom: 10px;">
                                <option value="">-- Seleccionar local --</option>
                                <option value="Los Años Locos Heredia" style="font-weight: 600; color: #8b5cf6;">🌙 Los Años Locos Heredia (con horas nocturnas)</option>
                                <option value="Los Años Locos San Joaquin" style="font-weight: 600; color: #8b5cf6;">🌙 Los Años Locos San Joaquín (con horas nocturnas)</option>
                                <option value="Parrillita Alajuela">🏠 Parrillita Alajuela</option>
                                <option value="Parrillita Garita">🏠 Parrillita Garita</option>
                                <option value="Parrillita Pirro">🏠 Parrillita Pirro</option>
                                <option value="Parrillita Sabana">🏠 Parrillita Sabana</option>
                                <option value="Parrillita San Joaquin">🏠 Parrillita San Joaquin</option>
                                <option value="Parrillita San Pedro">🏠 Parrillita San Pedro</option>
                                <option value="Parrillita Empanadazo">🏠 Parrillita Empanadazo</option>
                            </select>
                            
                            <p style="margin: 8px 0 0; color: #64748b; font-size: 0.85rem; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-info-circle" style="color: #8b5cf6;"></i>
                                Si selecciona <strong>Los Años Locos</strong>, aparecerán los campos de horas nocturnas con recargo del 20% y 80%.
                            </p>
                        </div>
                        
                        <input type="hidden" id="prestamoEmpleadoId" value="${empleadoIdEdit}">
                        <input type="hidden" id="prestamoEmpleadoSalario" value="${empleadoSalarioEdit}">
                        <input type="hidden" id="prestamoEmpleadoLocal" value="${empleadoLocalEdit}">
                    </div>
                    
                    <!-- Columna Derecha: Período -->
                    <div style="background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <i class="fas fa-calendar-alt" style="color: #8b5cf6;"></i> Período
                        </label>
                        <input type="month" id="prestamoPeriodo" value="${periodoEdit}" required style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px; font-size: 1rem;">
                        <p style="margin-top: 10px; color: #64748b; font-size: 0.85rem;">
                            <i class="fas fa-info-circle"></i> Seleccione el mes del préstamo
                        </p>
                    </div>
                </div>
                
                <!-- SECCIÓN MEDIA: Horas trabajadas -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                        <i class="fas fa-clock" style="color: #8b5cf6;"></i> Horas trabajadas en el mes
                    </label>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div>
                            <label style="font-weight: 500; color: #475569; display: block; margin-bottom: 5px;">
                                <i class="fas fa-sun" style="color: #f59e0b;"></i> Horas Ordinarias
                            </label>
                            <input type="number" id="prestamoOrdinarias" value="${ordinariasEdit}" min="0" step="0.5" required oninput="calcularTotalPrestamo()" style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px;">
                        </div>
                        
                        <div>
                            <label style="font-weight: 500; color: #475569; display: block; margin-bottom: 5px;">
                                <i class="fas fa-bolt" style="color: #ef4444;"></i> Horas Extra
                            </label>
                            <input type="number" id="prestamoExtras" value="${extrasEdit}" min="0" step="0.5" required oninput="calcularTotalPrestamo()" style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px;">
                        </div>
                    </div>
                    
                    <!-- CAMPOS NOCTURNOS (solo visibles para Los Años Locos) -->
                    <div id="camposNocturnos" style="display: none; margin-top: 20px; padding-top: 20px; border-top: 2px dashed #eef2f6;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                            <div style="background: #f3e8ff; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-moon" style="color: #8b5cf6; font-size: 1rem;"></i>
                            </div>
                            <span style="font-weight: 600; color: #8b5cf6;">HORARIO NOCTURNO (Los Años Locos)</span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                            <div>
                                <input type="number" id="prestamoNocturnas" min="0" step="0.5" value="0" oninput="calcularTotalPrestamo()" style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px;">
                            </div>
                            
                            <div>
                                <input type="number" id="prestamoExtrasNocturnas" min="0" step="0.5" value="0" oninput="calcularTotalPrestamo()" style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px;">
                            </div>
                        </div>
                    </div>
                
                <!-- SECCIÓN: Resumen de pago -->
                <div style="background: linear-gradient(135deg, #f3e8ff, #ede9fe); border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 1.1rem;">
                        <i class="fas fa-calculator" style="color: #8b5cf6;"></i> Resumen de Pago
                    </h3>
                    
                    <div style="background: white; border-radius: 12px; padding: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
                            <div>
                                <span style="color: #64748b;">Valor hora ordinaria:</span>
                                <div style="font-size: 1.2rem; font-weight: 600; color: #8b5cf6;" id="valorHoraOrd">₡0</div>
                            </div>
                            <div>
                                <span style="color: #64748b;">Valor hora extra:</span>
                                <div style="font-size: 1.2rem; font-weight: 600; color: #8b5cf6;" id="valorHoraExtra">₡0</div>
                            </div>
                        </div>
                        
                        <div id="resumenNocturno" style="display: none; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eef2f6;">
                            <div>
                                <span style="color: #64748b;">Valor hora nocturna:</span>
                                <div style="font-size: 1.2rem; font-weight: 600; color: #8b5cf6;" id="valorHoraNocturna">₡0</div>
                            </div>
                            <div>
                                <span style="color: #64748b;">Valor hora extra nocturna:</span>
                                <div style="font-size: 1.2rem; font-weight: 600; color: #8b5cf6;" id="valorHoraExtraNocturna">₡0</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 2px solid #eef2f6;">
                            <span style="font-size: 1.1rem; font-weight: 600;">Total a pagar:</span>
                            <span style="font-size: 1.8rem; font-weight: 700; color: #059669;" id="totalPagoCalculado">₡0</span>
                        </div>
                    </div>
                </div>
                
                <!-- SECCIÓN: Observaciones -->
                <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <label style="font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-comment" style="color: #8b5cf6;"></i> Observaciones
                    </label>
                    <textarea id="prestamoObservaciones" rows="2" placeholder="Notas adicionales..." style="width: 100%; padding: 12px; border: 2px solid #eef2f6; border-radius: 12px; font-size: 1rem; resize: vertical;">${observacionesEdit}</textarea>
                </div>
                
                <!-- Botones -->
                <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 2px solid #eef2f6; padding-top: 20px;">
                    <button type="button" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" style="padding: 12px 28px; border: 2px solid #eef2f6; background: white; color: #64748b; border-radius: 14px; font-weight: 600; cursor: pointer;">
                        Cancelar
                    </button>
                    <button type="submit" style="padding: 12px 36px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 16px rgba(139, 92, 246, 0.3); display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-save"></i> ${editId ? 'Actualizar Préstamo' : 'Guardar Préstamo'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
    
    // Si es edición, mostrar resumen nocturno si aplica
    if (editId && empleadoLocalEdit.includes('Años Locos')) {
        document.getElementById('resumenNocturno').style.display = 'grid';
        calcularTotalPrestamo();
    }
}

// ============================================
// GUARDAR PRÉSTAMO (CON NOCTURNAS) - VERSIÓN CORREGIDA
// ============================================
async function guardarPrestamo(editId = null) {
    const empleadoId = document.getElementById('prestamoEmpleadoId').value;
    const empleadoNombre = document.getElementById('empleadoSeleccionadoNombre').textContent;
    const localOrigen = document.getElementById('prestamoEmpleadoLocal').value; // Local de planilla
    const localTrabajo = document.getElementById('prestamoLocalTrabajo')?.value || localOrigen; // ✅ Local donde trabajó
    const salario = parseFloat(document.getElementById('prestamoEmpleadoSalario').value) || 0;
    const periodo = document.getElementById('prestamoPeriodo').value;
    
    const ordinarias = parseFloat(document.getElementById('prestamoOrdinarias').value) || 0;
    const extras = parseFloat(document.getElementById('prestamoExtras').value) || 0;
    
    // Horas nocturnas (solo si existen los campos)
    const nocturnas = document.getElementById('prestamoNocturnas') ? 
        (parseFloat(document.getElementById('prestamoNocturnas').value) || 0) : 0;
    const extrasNocturnas = document.getElementById('prestamoExtrasNocturnas') ? 
        (parseFloat(document.getElementById('prestamoExtrasNocturnas').value) || 0) : 0;
    
    const observaciones = document.getElementById('prestamoObservaciones').value;
    
    if (!empleadoId || !periodo) {
        alert('Complete los campos obligatorios');
        return;
    }
    
    if (ordinarias === 0 && extras === 0 && nocturnas === 0 && extrasNocturnas === 0) {
        alert('Debe ingresar al menos un tipo de hora');
        return;
    }
    
    // Calcular pagos
    const salarioHora = salario / 240;
    const salarioHoraExtra = salarioHora * PORCENTAJES_PRESTAMO.extras;
    const salarioHoraNocturna = salarioHora * PORCENTAJES_PRESTAMO.nocturnas;
    const salarioHoraExtraNocturna = salarioHora * PORCENTAJES_PRESTAMO.extrasNocturnas;
    
    const pagoOrdinarias = ordinarias * salarioHora;
    const pagoExtras = extras * salarioHoraExtra;
    const pagoNocturnas = nocturnas * salarioHoraNocturna;
    const pagoExtrasNocturnas = extrasNocturnas * salarioHoraExtraNocturna;
    const totalPago = pagoOrdinarias + pagoExtras + pagoNocturnas + pagoExtrasNocturnas;
    
    const data = {
        empleadoId,
        empleadoNombre,
        localOrigen,      // Guardamos el local de planilla (para referencia)
        local: localTrabajo, // ✅ Guardamos el local donde trabajó (para cálculos)
        salario,
        periodo,
        horas: {
            ordinarias,
            extras,
            nocturnas,
            extrasNocturnas
        },
        totales: {
            ordinarias,
            extras,
            nocturnas,
            extrasNocturnas,
            pagoOrdinarias,
            pagoExtras,
            pagoNocturnas,
            pagoExtrasNocturnas,
            totalPago
        },
        observaciones: observaciones || null,
        ultimaModificacion: new Date().toISOString(),
        modificadoPor: AppState.usuario?.email || 'sistema'
    };
    
    // Si es nuevo, agregar fecha de creación
    if (!editId) {
        data.fechaCreacion = new Date().toISOString();
        data.creadoPor = AppState.usuario?.email || 'sistema';
    }
    
    try {
        if (editId) {
            await firebase.database().ref(`prestamos/${editId}`).update(data);
            alert('✅ Préstamo actualizado');
        } else {
            await firebase.database().ref('prestamos').push(data);
            alert('✅ Préstamo guardado');
        }
        
        // Cerrar modal
        document.getElementById('prestamoModal').remove();
        document.getElementById('modalOverlay').classList.remove('active');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    }
}

// ============================================
// EDITAR PRÉSTAMO
// ============================================
function editarPrestamo(id) {
    mostrarModalPrestamo(id);
}

// ============================================
// ELIMINAR PRÉSTAMO
// ============================================
function eliminarPrestamo(id) {
    if (!confirm('¿Eliminar este préstamo?')) return;
    
    firebase.database().ref(`prestamos/${id}`).remove()
        .then(() => alert('✅ Préstamo eliminado'))
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar');
        });
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initPrestamo = initPrestamo;
window.renderPrestamo = renderPrestamo;
window.mostrarModalPrestamo = mostrarModalPrestamo;
window.guardarPrestamo = guardarPrestamo;
window.calcularTotalPrestamo = calcularTotalPrestamo;
window.buscarEmpleados = buscarEmpleados;
window.seleccionarEmpleado = seleccionarEmpleado;
window.limpiarSeleccionEmpleado = limpiarSeleccionEmpleado;
window.editarPrestamo = editarPrestamo;
window.eliminarPrestamo = eliminarPrestamo;

console.log('✅ prestamo.js cargado - Incluye horas nocturnas para Los Años Locos');