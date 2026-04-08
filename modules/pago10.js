// modules/pago10.js - Módulo de Pago 10% (Comisiones)
// Basado en el Excel: comisiones de 10% semanales

console.log('💰 Cargando módulo de Pago 10%...');

// ============================================
// VARIABLES GLOBALES
// ============================================
let pagos10 = [];

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function formatearFechaCR(fechaStr) {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
}

function getDiasDelPeriodo(filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin) {
    const hoy = new Date();
    
    if (filtroTiempo === 'mes') {
        fechaReferencia = fechaPersonalizada
            ? new Date(fechaPersonalizada + '-01T12:00:00')
            : hoy;

        nombrePeriodo = `${getNombreMes(fechaReferencia)} ${fechaReferencia.getFullYear()}`;
        diasPeriodo = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() + 1, 0).getDate();
    } else if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio + 'T12:00:00');
        const fin = new Date(fechaFin + 'T12:00:00');
        const diffTime = Math.abs(fin - inicio);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else if (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado') {
        return 1;
    }
    return 30;
}

function getNombreMes(fecha) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    let fechaObj = fecha;

    if (!(fechaObj instanceof Date)) {
        fechaObj = new Date(fecha);
    }

    if (isNaN(fechaObj.getTime())) {
        return '';
    }

    return meses[fechaObj.getMonth()];
}

// ============================================
// CARGAR DATOS DESDE FIREBASE
// ============================================
function cargarPagos10() {
    console.log('🔄 Cargando registros de Pago 10%...');
    
    firebase.database().ref('pagos10').on('value', (snapshot) => {
        const data = snapshot.val();
        pagos10 = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                pagos10.push({
                    id: key,
                    ...data[key]
                });
            });
            
            pagos10.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }
        
        console.log(`✅ ${pagos10.length} registros de Pago 10% cargados`);
        
        window.pagos10 = pagos10;
        
        if (document.getElementById('resumen')?.classList.contains('active') && window.renderResumen) {
            window.renderResumen();
        }
        
        if (document.getElementById('pago10')?.classList.contains('active')) {
            renderPago10();
        }
    });
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================
function renderPago10() {
    console.log('📊 Renderizando Pago 10%...');
    
    const content = document.getElementById('pago10Content');
    if (!content) return;
    
    const filtroLocal = AppState?.filtros?.local || 'Todos';
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState?.filtros?.fechaPersonalizada;
    const fechaInicio = AppState?.filtros?.fechaInicio;
    const fechaFin = AppState?.filtros?.fechaFin;
    
    const hoy = new Date();
    let fechaReferencia = hoy;
    let nombrePeriodo = '';
    let diasPeriodo = 30;
    
    if (filtroTiempo === 'mes') {
        fechaReferencia = fechaPersonalizada ? new Date(fechaPersonalizada + 'T12:00:00') : hoy;
        nombrePeriodo = `${getNombreMes(fechaReferencia)} ${fechaReferencia.getFullYear()}`;
        diasPeriodo = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() + 1, 0).getDate();
    } else if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
        nombrePeriodo = `${formatearFechaCR(fechaInicio)} → ${formatearFechaCR(fechaFin)}`;
        diasPeriodo = getDiasDelPeriodo(filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin);
    } else if (filtroTiempo === 'personalizado' && fechaPersonalizada) {
        const fechaObj = new Date(fechaPersonalizada + 'T12:00:00');
        nombrePeriodo = fechaObj.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
        diasPeriodo = 1;
    } else if (filtroTiempo === 'ayer') {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        nombrePeriodo = `Ayer (${ayer.toLocaleDateString('es-CR')})`;
        diasPeriodo = 1;
    } else {
        nombrePeriodo = 'Todo el historial';
        diasPeriodo = 365;
    }
    
    const puedeVerLocal = (local) => {
        if (window.esGerencia && window.esGerencia()) return true;
        return AppState?.usuario?.local === local;
    };
    
    const pagosFiltrados = pagos10.filter(p => {
        if (filtroLocal !== 'Todos' && p.local !== filtroLocal) return false;
        if (!puedeVerLocal(p.local)) return false;
        
        if (!p.fecha) return true;
        const fechaPago = p.fecha.split('T')[0];
        
        if (filtroTiempo === 'mes' && fechaPersonalizada) {
            return fechaPago.substring(0, 7) === fechaPersonalizada.substring(0, 7);
        } else if (filtroTiempo === 'personalizado' && fechaPersonalizada) {
            return fechaPago === fechaPersonalizada;
        } else if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
            return fechaPago >= fechaInicio && fechaPago <= fechaFin;
        }
        return true;
    });
    
    const pagosPorMes = {};
    pagosFiltrados.forEach(p => {
        if (!p.fecha) return;
        const mesKey = p.fecha.substring(0, 7);
        const key = `${mesKey}_${p.local}`;
        if (!pagosPorMes[key]) {
            pagosPorMes[key] = {
                fecha: p.fecha,
                local: p.local,
                semana1: 0, semana2: 0, semana3: 0, semana4: 0, semana5: 0,
                total: 0
            };
        }
        pagosPorMes[key][`semana${p.semana}`] = p.monto || 0;
        pagosPorMes[key].total += p.monto || 0;
    });
    
    const totalGeneral = Object.values(pagosPorMes).reduce((sum, item) => sum + item.total, 0);
    const promedioDiario = diasPeriodo > 0 ? totalGeneral / diasPeriodo : 0;
    
    // Calcular promedio diario por mes
    Object.values(pagosPorMes).forEach(item => {
        const fechaObj = new Date(item.fecha + 'T12:00:00');
        const diasDelMes = new Date(fechaObj.getFullYear(), fechaObj.getMonth() + 1, 0).getDate();
        item.promedioDiario = diasDelMes > 0 ? item.total / diasDelMes : 0;
    });
    
    // Ordenar por fecha descendente
    const itemsOrdenados = Object.values(pagosPorMes).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-percent" style="color: #f59e0b;"></i> Pago 10% (Comisiones)</h2>
            <div style="display: flex; gap: 10px;">
                ${esGerencia() ? `
                    <button class="btn btn-primary" onclick="window.mostrarModalPago10()">
                        <i class="fas fa-plus"></i> Nuevo Pago
                    </button>
                ` : ''}
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; padding: 25px; color: white; margin-bottom: 25px; box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-calculator" style="font-size: 2rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">TOTAL ACUMULADO</div>
                        <div style="font-size: 2.5rem; font-weight: 700;">₡${totalGeneral.toLocaleString()}</div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">${pagosFiltrados.length} registros</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9rem; opacity: 0.9;">PROMEDIO DIARIO</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(promedioDiario).toLocaleString()}</div>
                </div>
            </div>
        </div>
    `;
    
    if (itemsOrdenados.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-percent" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3>No hay registros de Pago 10%</h3>
                <p>Haga clic en "Nuevo Pago" para agregar uno.</p>
            </div>
        `;
    } else {
        html += `
            <div class="card">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Local</th>
                                <th>Semana 1</th>
                                <th>Semana 2</th>
                                <th>Semana 3</th>
                                <th>Semana 4</th>
                                <th>Semana 5</th>
                                <th>Total Mes</th>
                                <th>Promedio Diario</th>
                                <th>Acciones</th>
                            </thead>
                            <tbody>
        `;
        
        itemsOrdenados.forEach(item => {
            const fechaObj = new Date(item.fecha + 'T12:00:00');
            const fechaFormateada = fechaObj.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
            const diasDelMes = new Date(fechaObj.getFullYear(), fechaObj.getMonth() + 1, 0).getDate();
            const promedioDiarioMes = item.total / diasDelMes;
            
            html += `
                <tr>
                    <td><strong>${fechaFormateada}</strong></td>
                    <td>${item.local || '—'}</td>
                    <td style="text-align: right;">₡${(item.semana1 || 0).toLocaleString()}</td>
                    <td style="text-align: right;">₡${(item.semana2 || 0).toLocaleString()}</td>
                    <td style="text-align: right;">₡${(item.semana3 || 0).toLocaleString()}</td>
                    <td style="text-align: right;">₡${(item.semana4 || 0).toLocaleString()}</td>
                    <td style="text-align: right;">₡${(item.semana5 || 0).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 600; color: #f59e0b;">₡${(item.total || 0).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 500; color: #059669;">₡${promedioDiarioMes.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} <span style="font-size: 0.7rem;"></span></td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            ${esGerencia() ? `
                                <button class="btn btn-sm btn-danger" onclick="window.eliminarPagosPorMes('${item.fecha}', '${item.local}')" title="Eliminar todos los pagos de este mes">
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
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// ============================================
// MOSTRAR MODAL PARA NUEVO PAGO
// ============================================
function mostrarModalPago10(editId = null) {
    if (!esGerencia()) {
        alert('Solo gerencia puede agregar pagos');
        return;
    }
    
    console.log('📝 Abriendo modal de Pago 10%', editId ? 'Edición' : 'Nuevo');
    
    const overlay = document.getElementById('modalOverlay');
    
    const modalExistente = document.getElementById('pago10Modal');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'pago10Modal';
    modal.className = 'modal';
    modal.style.maxWidth = '750px';
    modal.style.width = '95%';
    modal.style.borderRadius = '24px';
    modal.style.overflow = 'hidden';
    modal.style.backgroundColor = 'white';
    modal.style.boxShadow = '0 30px 60px -15px rgba(0, 0, 0, 0.4)';
    
    const hoy = new Date();
    const fechaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    
    let pagoEdit = null;
    if (editId) {
        pagoEdit = pagos10.find(p => p.id === editId);
    }
    
    const semanas = [1, 2, 3, 4, 5];
    
    let html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px 25px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-percent" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <h2 style="margin: 0; font-size: 1.3rem;">${editId ? 'Editar' : 'Agregar'} Pago 10%</h2>
                        <p style="margin: 2px 0 0; opacity: 0.8; font-size: 0.8rem;">Complete los datos del pago semanal</p>
                    </div>
                </div>
                <button type="button" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" 
                        style="background: rgba(255,255,255,0.2); border: none; color: white; width: 35px; height: 35px; border-radius: 10px; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        
        <div class="modal-body" style="padding: 25px; background: #f8fafc;">
            <form id="pago10Form" onsubmit="event.preventDefault(); window.guardarPago10('${editId || ''}');">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div style="background: white; border-radius: 12px; padding: 15px;">
                        <label style="font-weight: 600; color: #2c3e50; margin-bottom: 8px; display: block;">
                            <i class="fas fa-calendar-alt" style="color: #f59e0b;"></i> Mes del Pago
                        </label>
                        <input type="month" id="pago10Fecha" value="${pagoEdit?.fecha?.substring(0, 7) || fechaActual.substring(0, 7)}" required 
                               style="width: 100%; padding: 10px; border: 2px solid #eef2f6; border-radius: 8px;">
                    </div>
                    
                    <div style="background: white; border-radius: 12px; padding: 15px;">
                        <label style="font-weight: 600; color: #2c3e50; margin-bottom: 8px; display: block;">
                            <i class="fas fa-store" style="color: #f59e0b;"></i> Local
                        </label>
                        <select id="pago10Local" required style="width: 100%; padding: 10px; border: 2px solid #eef2f6; border-radius: 8px;">
                            <option value="">Seleccionar local...</option>
    `;
    
    const esGerente = window.esGerencia && window.esGerencia();
    const localesPermitidos = window.getLocalesPermitidos ? window.getLocalesPermitidos() : [];
    
    if (AppState?.locales && AppState.locales.length > 0) {
        AppState.locales.forEach(local => {
            if (esGerente || localesPermitidos.includes(local.nombre)) {
                const selected = (pagoEdit?.local === local.nombre) ? 'selected' : '';
                html += `<option value="${local.nombre}" ${selected}>${local.nombre}</option>`;
            }
        });
    }
    
    html += `
                        </select>
                    </div>
                </div>
                
                <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; overflow-x: auto;">
                    <label style="font-weight: 600; color: #2c3e50; margin-bottom: 15px; display: block;">
                        <i class="fas fa-calendar-week" style="color: #f59e0b;"></i> Pagos por Semana
                    </label>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
    `;
    
    semanas.forEach(semana => {
        html += `<th class="pago10-semana-head">Semana ${semana}</th>`;
    });
    
    html += `</tr><tr>`;
    
    semanas.forEach(semana => {
        const valorEdit = (pagoEdit?.semana === semana) ? pagoEdit.monto : '';
        html += `
            <td style="padding: 10px; text-align: center;">
                <div style="display: flex; align-items: center; border: 2px solid #eef2f6; border-radius: 8px; background: white;">
                    <span style="background: #f1f5f9; padding: 8px 12px; color: #f59e0b;">₡</span>
                    <input type="number" id="pago10Semana${semana}" value="${valorEdit}" 
                           step="100" min="0" placeholder="0" 
                           style="flex: 1; padding: 8px; border: none; outline: none; text-align: right; width: 100px;">
                </div>
            </td>
        `;
    });
    
    html += `
                        </tr>
                    </table>
                </div>
                
                <div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
                    <label style="font-weight: 600; color: #2c3e50; margin-bottom: 8px; display: block;">
                        <i class="fas fa-comment" style="color: #f59e0b;"></i> Observaciones
                    </label>
                    <textarea id="pago10Observaciones" rows="2" placeholder="Notas adicionales..." 
                              style="width: 100%; padding: 10px; border: 2px solid #eef2f6; border-radius: 8px;">${pagoEdit?.observaciones || ''}</textarea>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 2px solid #eef2f6; padding-top: 20px;">
                    <button type="button" onclick="this.closest('.modal').remove(); document.getElementById('modalOverlay').classList.remove('active');" 
                            style="padding: 10px 24px; border: 2px solid #e2e8f0; background: white; color: #64748b; border-radius: 10px; cursor: pointer;">
                        Cancelar
                    </button>
                    <button type="submit" 
                            style="padding: 10px 28px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-save"></i> ${editId ? 'Actualizar' : 'Guardar'} Pago
                    </button>
                </div>
            </form>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    overlay.classList.add('active');
    modal.classList.add('active');
}

// ============================================
// GUARDAR PAGO 10%
// ============================================
async function guardarPago10(editId = null) {
    const fecha = document.getElementById('pago10Fecha').value;
    const local = document.getElementById('pago10Local').value;
    const observaciones = document.getElementById('pago10Observaciones').value;
    
    if (!fecha || !local) {
        alert('Complete los campos obligatorios (mes y local)');
        return;
    }
    
    const semanas = [1, 2, 3, 4, 5];
    
    try {
        const btn = document.querySelector('#pago10Modal button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }
        
        if (editId) {
            let monto = 0;
            let semana = 0;
            
            for (let s of semanas) {
                const input = document.getElementById(`pago10Semana${s}`);
                if (input && input.value !== '' && parseFloat(input.value) > 0) {
                    monto = parseFloat(input.value) || 0;
                    semana = s;
                    break;
                }
            }
            
            if (semana === 0) {
                alert('Ingrese un monto para la semana que desea editar');
                if (btn) btn.disabled = false;
                return;
            }
            
            const data = {
                fecha: `${fecha}-01`,
                local: local,
                semana: semana,
                monto: monto,
                observaciones: observaciones || null,
                ultimaModificacion: new Date().toISOString(),
                modificadoPor: AppState?.usuario?.email || 'sistema'
            };
            
            await firebase.database().ref(`pagos10/${editId}`).update(data);
            alert('✅ Pago actualizado correctamente');
            
        } else {
            let creados = 0;
            const nuevosPagos = [];
            
            for (let semana of semanas) {
                const input = document.getElementById(`pago10Semana${semana}`);
                const monto = parseFloat(input?.value) || 0;
                
                if (monto > 0) {
                    const data = {
                        fecha: `${fecha}-01`,
                        local: local,
                        semana: semana,
                        monto: monto,
                        observaciones: observaciones || null,
                        fechaCreacion: new Date().toISOString(),
                        creadoPor: AppState?.usuario?.email || 'sistema'
                    };
                    
                    await firebase.database().ref('pagos10').push(data);
                    creados++;
                    nuevosPagos.push(`Semana ${semana}: ₡${monto.toLocaleString()}`);
                }
            }
            
            if (creados === 0) {
                alert('Ingrese al menos un monto para alguna semana');
                if (btn) btn.disabled = false;
                return;
            }
            
            alert(`✅ ${creados} registro(s) guardados:\n${nuevosPagos.join('\n')}`);
        }
        
        document.getElementById('pago10Modal').remove();
        document.getElementById('modalOverlay').classList.remove('active');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
        
        const btn = document.querySelector('#pago10Modal button[type="submit"]');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = editId ? '<i class="fas fa-save"></i> Actualizar Pago' : '<i class="fas fa-save"></i> Guardar Pago';
        }
    }
}

// ============================================
// ELIMINAR TODOS LOS PAGOS DE UN MES Y LOCAL
// ============================================
async function eliminarPagosPorMes(fecha, local) {
    const fechaObj = new Date(fecha + 'T12:00:00');
    const fechaTexto = fechaObj.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
    
    if (!confirm(`¿Eliminar todos los pagos de ${fechaTexto} para ${local}?`)) return;
    
    const pagosAEliminar = pagos10.filter(p => p.fecha === fecha && p.local === local);
    
    if (pagosAEliminar.length === 0) {
        alert('No hay pagos para eliminar');
        return;
    }
    
    try {
        for (const pago of pagosAEliminar) {
            await firebase.database().ref(`pagos10/${pago.id}`).remove();
        }
        alert(`✅ ${pagosAEliminar.length} registros eliminados`);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar: ' + error.message);
    }
}

// ============================================
// FUNCIÓN PARA OBTENER TOTAL DEL PAGO 10% (para el Resumen)
// ============================================
function obtenerTotalPago10(filtroLocal, filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin) {
    let total = 0;
    
    const pagosFiltrados = pagos10.filter(p => {
        if (filtroLocal !== 'Todos' && p.local !== filtroLocal) return false;
        if (typeof window.puedeVerLocal === 'function' && !window.puedeVerLocal(p.local)) return false;
        
        if (!p.fecha) return true;
        const fechaPago = p.fecha.split('T')[0];
        
        if (filtroTiempo === 'mes' && fechaPersonalizada) {
            return fechaPago.substring(0, 7) === fechaPersonalizada.substring(0, 7);
        } else if (filtroTiempo === 'personalizado' && fechaPersonalizada) {
            return fechaPago === fechaPersonalizada;
        } else if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
            return fechaPago >= fechaInicio && fechaPago <= fechaFin;
        }
        return true;
    });
    
    total = pagosFiltrados.reduce((sum, p) => sum + (p.monto || 0), 0);
    return total;
}

// ============================================
// INICIALIZAR MÓDULO
// ============================================
function initPago10() {
    console.log('🚀 Inicializando módulo de Pago 10%...');
    setTimeout(() => {
        if (AppState?.usuario) {
            cargarPagos10();
        } else {
            setTimeout(initPago10, 500);
        }
    }, 100);
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initPago10 = initPago10;
window.renderPago10 = renderPago10;
window.mostrarModalPago10 = mostrarModalPago10;
window.guardarPago10 = guardarPago10;
window.eliminarPagosPorMes = eliminarPagosPorMes;
window.obtenerTotalPago10 = obtenerTotalPago10;
window.pagos10 = pagos10;

console.log('✅ pago10.js cargado');