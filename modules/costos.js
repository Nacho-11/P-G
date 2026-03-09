// modules/costos.js

// ============================================
// CARGAR COSTOS DESDE FIREBASE
// ============================================
function cargarCostosDesdeFirebase() {
    const costosRef = firebase.database().ref('costos');
    
    costosRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const costosData = {};
        
        if (data) {
            for (const local in data) {
                costosData[local] = {};
                for (const categoria in data[local]) {
                    costosData[local][categoria] = [];
                    for (const costoId in data[local][categoria]) {
                        costosData[local][categoria].push({
                            id: costoId,
                            ...data[local][categoria][costoId]
                        });
                    }
                }
            }
        }
        
        // Guardar en variable global
        window.costosData = costosData;
        
        // Si estamos en la vista de costos, recargar
        if (document.getElementById('costos').classList.contains('active')) {
            renderCostos();
        }
        
        // Si el dashboard está activo, actualizarlo
        if (document.getElementById('dashboard').classList.contains('active') && typeof window.renderDashboard === 'function') {
            window.renderDashboard();
        }
    });
}

// ============================================
// RENDERIZAR VISTA DE COSTOS
// ============================================
function renderCostos() {
    console.log('Renderizando costos...');
    const costosContent = document.getElementById('costosContent');
    
    if (!costosContent) {
        console.error('Elemento costosContent no encontrado');
        return;
    }
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const costosData = window.costosData || {};
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2><i class="fas fa-coins"></i> Costos Fijos</h2>
            <button class="btn btn-primary" onclick="mostrarModalCosto()">
                <i class="fas fa-plus"></i> Nuevo Costo
            </button>
        </div>
    `;
    
    // Filtrar costos por local
    const localesFiltrados = filtroLocal === 'Todos' 
        ? Object.keys(costosData) 
        : [filtroLocal].filter(l => costosData[l]);
    
    // Si no hay datos, mostrar mensaje
    if (localesFiltrados.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-coins" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3 style="color: #4b5563; margin-bottom: 15px;">No hay costos registrados</h3>
                <p style="color: #6b7280;">Haga clic en "Nuevo Costo" para agregar uno.</p>
            </div>
        `;
    } else {
        // Mostrar costos por local y categoría
        for (const local of localesFiltrados) {
            html += `<div class="card" style="margin-bottom: 20px;">`;
            html += `<h3 style="margin-bottom: 15px; color: var(--primary);">${local}</h3>`;
            
            for (const categoria in costosData[local]) {
                html += `<h4 style="margin: 15px 0 10px; color: var(--gray-600);">${categoria}</h4>`;
                html += `<div class="table-container">`;
                html += `<table class="table">`;
                html += `<thead><tr><th>Concepto</th><th>Monto</th><th>Descripción</th><th>Acciones</th></tr></thead>`;
                html += `<tbody>`;
                
                costosData[local][categoria].forEach(costo => {
                    html += `
                        <tr>
                            <td><strong>${costo.concepto || '—'}</strong></td>
                            <td>₡${(costo.monto || 0).toLocaleString()}</td>
                            <td>${costo.descripcion || '—'}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="eliminarCosto('${local}', '${categoria}', '${costo.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                html += `</tbody></table></div>`;
            }
            html += `</div>`;
        }
    }
    
    costosContent.innerHTML = html;
}

// ============================================
// MOSTRAR MODAL DE NUEVO COSTO
// ============================================
function mostrarModalCosto() {
    const modal = document.getElementById('costoModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal) {
        alert('Error: Modal de costo no encontrado');
        return;
    }
    
    // Limpiar campos
    document.getElementById('costoLocal').value = '';
    document.getElementById('costoCategoria').value = '';
    document.getElementById('costoConcepto').value = '';
    document.getElementById('costoMonto').value = '';
    document.getElementById('costoDescripcion').value = '';
    
    // Cargar locales
    const selectLocal = document.getElementById('costoLocal');
    selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
    AppState.locales.forEach(local => {
        selectLocal.innerHTML += `<option value="${local.nombre}">${local.nombre}</option>`;
    });
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// GUARDAR COSTO EN FIREBASE
// ============================================
async function guardarCosto() {
    if (!puedeEditar()) {
        alert('No tienes permisos para guardar costos');
        return;
    }
    
    const local = document.getElementById('costoLocal').value;
    const categoria = document.getElementById('costoCategoria').value;
    const concepto = document.getElementById('costoConcepto').value;
    const monto = parseFloat(document.getElementById('costoMonto').value);
    const descripcion = document.getElementById('costoDescripcion').value;
    
    if (!local || !categoria || !concepto || !monto) {
        alert('Por favor complete todos los campos obligatorios');
        return;
    }
    
    try {
        const costoData = {
            concepto,
            monto,
            descripcion: descripcion || '',
            fechaCreacion: new Date().toISOString(),
            creadoPor: AppState.usuario?.email || 'sistema',
            creadorUid: AppState.usuario?.uid || null
        };
        
        // Guardar en Firebase
        const costosRef = firebase.database().ref(`costos/${local}/${categoria}`);
        const nuevoCostoRef = costosRef.push();
        await nuevoCostoRef.set(costoData);
        
        alert('✅ Costo fijo guardado correctamente');
        cerrarModal('costoModal');
        
    } catch (error) {
        console.error('Error guardando costo:', error);
        alert('Error al guardar el costo: ' + error.message);
    }
}

// ============================================
// ELIMINAR COSTO DE FIREBASE
// ============================================
async function eliminarCosto(local, categoria, costoId) {
    if (!puedeEditar()) {
        alert('No tienes permisos para eliminar costos');
        return;
    }
    
    if (!confirm('¿Está seguro de eliminar este costo fijo?')) return;
    
    try {
        await firebase.database().ref(`costos/${local}/${categoria}/${costoId}`).remove();
        alert('✅ Costo eliminado correctamente');
        
    } catch (error) {
        console.error('Error eliminando costo:', error);
        alert('Error al eliminar el costo');
    }
}

// ============================================
// VERIFICAR PERMISOS
// ============================================
function puedeEditar() {
    return AppState.usuario && (AppState.usuario.rol === 'gerencia' || AppState.usuario.rol === 'administrador');
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
window.eliminarCosto = eliminarCosto;
window.cargarCostosDesdeFirebase = cargarCostosDesdeFirebase;
window.puedeEditar = puedeEditar;
window.initCostos = initCostos;