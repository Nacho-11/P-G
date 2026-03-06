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
        
        // Recargar costos
        cargarCostosDesdeFirebase();
        
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
        
        // Recargar costos
        cargarCostosDesdeFirebase();
        
    } catch (error) {
        console.error('Error eliminando costo:', error);
        alert('Error al eliminar el costo');
    }
}

// ============================================
// CARGAR COSTOS DESDE FIREBASE
// ============================================
function cargarCostosDesdeFirebase() {
    const costosRef = firebase.database().ref('costos');
    
    costosRef.on('value', (snapshot) => {
        const data = snapshot.val();
        costosData = {};
        
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
        
        // Si estamos en la vista de costos, recargar
        if (document.getElementById('costos').classList.contains('active')) {
            renderCostos();
        }
    });
}