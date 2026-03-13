// modules/costos.js

// ============================================
// CARGAR COSTOS DESDE FIREBASE
// ============================================
function cargarCostosDesdeFirebase() {
    console.log('🔄 Cargando costos desde Firebase...');
    
    const costosRef = firebase.database().ref('costos');
    
    costosRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const costosData = {};
        
        console.log('📦 Datos de Firebase:', data);
        
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
// RENDERIZAR VISTA DE COSTOS
// ============================================
function renderCostos() {
    console.log('Renderizando costos...');
    const costosContent = document.getElementById('costosContent');
    if (!costosContent) return;
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const costosData = window.costosData || {};
    
    console.log('📍 Filtro:', filtroLocal);
    console.log('📦 Datos a renderizar:', costosData);
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2><i class="fas fa-coins"></i> Costos Fijos</h2>
            <button class="btn btn-primary" onclick="mostrarModalCosto()">
                <i class="fas fa-plus"></i> Nuevo Costo
            </button>
        </div>
    `;
    
    if (Object.keys(costosData).length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-coins" style="font-size: 4rem; color: #9ca3af;"></i>
                <h3>No hay costos registrados</h3>
                <p>Haga clic en "Nuevo Costo" para agregar uno.</p>
            </div>
        `;
        costosContent.innerHTML = html;
        return;
    }
    
    const localesAMostrar = filtroLocal === 'Todos' 
        ? Object.keys(costosData) 
        : [filtroLocal].filter(l => costosData[l]);
    
    if (localesAMostrar.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-coins" style="font-size: 4rem; color: #9ca3af;"></i>
                <h3>No hay costos para ${filtroLocal}</h3>
            </div>
        `;
        costosContent.innerHTML = html;
        return;
    }
    
    let totalGeneral = 0;
    
    for (const local of localesAMostrar) {
        html += `<div class="card"><h3>${local}</h3>`;
        
        for (const categoria in costosData[local]) {
            const costos = costosData[local][categoria];
            if (costos.length === 0) continue;
            
            const totalCategoria = costos.reduce((sum, c) => sum + (c.monto || 0), 0);
            totalGeneral += totalCategoria;
            
            html += `<h4>${categoria}</h4>`;
            html += `<table class="table"><thead><tr><th>Concepto</th><th>Monto</th><th>Acciones</th></tr></thead><tbody>`;
            
            costos.forEach(c => {
                html += `
                    <tr>
                        <td>${c.concepto}</td>
                        <td>₡${c.monto.toLocaleString()}</td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="eliminarCosto('${local}', '${categoria}', '${c.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `</tbody></table>`;
        }
        
        html += `</div>`;
    }
    
    if (totalGeneral > 0) {
        html += `
            <div class="card" style="background: var(--primary); color: white;">
                <h3>Total General: ₡${totalGeneral.toLocaleString()}</h3>
            </div>
        `;
    }
    
    costosContent.innerHTML = html;
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
    const local = document.getElementById('costoLocal').value;
    const categoria = document.getElementById('costoCategoria').value;
    const concepto = document.getElementById('costoConcepto').value;
    const monto = parseFloat(document.getElementById('costoMonto').value);
    
    if (!local || !categoria || !concepto || !monto) {
        alert('Complete todos los campos');
        return;
    }
    
    try {
        const costoData = {
            concepto,
            monto,
            fechaCreacion: new Date().toISOString(),
            creadoPor: AppState.usuario?.email || 'sistema'
        };
        
        await firebase.database().ref(`costos/${local}/${categoria}`).push(costoData);
        alert('✅ Costo guardado');
        cerrarModal('costoModal');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar');
    }
}

// ============================================
// ELIMINAR COSTO
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
// CARGAR CONCEPTOS POR CATEGORÍA
// ============================================
window.cargarConceptosPorCategoria = function(categoria) {
    const selectConcepto = document.getElementById('costoConcepto');
    if (!selectConcepto) return;
    
    // Conceptos predefinidos por categoría (basado en tu Excel)
    const conceptos = {
        restaurante: [
            "Alquiler de local",
            "SECSA",
            "Software Restaurante",
            "Internet KOLBI",
            "Televisión KOLBI",
            "Alarma ADT",
            "Fumigación",
            "Póliza RT",
            "Depreciación de activos",
            "Patente comercial",
            "Patente de licores",
            "Basura municipal",
            "Intereses por mora",
            "Certificación de gas",
            "Certificación eléctrica",
            "Permiso Ministerio de Salud",
            "Mantenimiento",
            "Hacienda IVA",
            "Asesoría legal RH",
            "Honorarios contabilidad",
            "Servicios profesionales publicidad",
            "Otros servicios profesionales"
        ],
        planta: [
            "Electricidad",
            "Agua",
            "ADT",
            "Fumigación",
            "Software SECSA",
            "IVA Hacienda",
            "Asesoría legal RH"
        ],
        oficinas: [
            "Electricidad",
            "Agua",
            "Internet KOLBI",
            "Teléfono y celulares",
            "ADT",
            "Mantenimiento y papelería",
            "Software y hosting"
        ],
        transporte: [
            "Combustible",
            "Electricidad bodegas",
            "Agua bodegas",
            "Alquiler taller",
            "GPS Navsat",
            "Marchamos",
            "Dekra",
            "Mantenimiento vehículos"
        ],
        planilla: [
            "Planilla bodega",
            "Alex Duque",
            "Póliza RT",
            "CCSS",
            "Planilla oficinas"
        ]
    };
    
    // Limpiar y cargar nuevas opciones
    selectConcepto.innerHTML = '<option value="">Seleccionar concepto...</option>';
    
    if (conceptos[categoria]) {
        conceptos[categoria].forEach(concepto => {
            const option = document.createElement('option');
            option.value = concepto;
            option.textContent = concepto;
            selectConcepto.appendChild(option);
        });
    }
};

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
window.initCostos = initCostos;