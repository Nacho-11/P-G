// modules/merma.js
// Módulo completo de Control de Mermas

console.log('🚀 Cargando módulo de Mermas...');

// ============================================
// VARIABLES GLOBALES
// ============================================
let productos = [];
let mermas = [];

// Verificar que AppState existe
if (typeof AppState === 'undefined') {
    console.error('❌ AppState no está definido. Verificar que app.js se cargó antes.');
}

// Verificar que firebase está disponible
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase no está definido. Verificar que los SDKs se cargaron antes.');
}

// ============================================
// INICIALIZAR MÓDULO
// ============================================
function initMerma() {
    console.log('🚀 Inicializando módulo de Mermas...');
    
    if (!AppState?.usuario) {
        console.log('⏳ Esperando autenticación...');
        return;
    }
    
    cargarProductos();
    cargarMermas();
    
    if (document.getElementById('merma').classList.contains('active')) {
        renderMerma();
    }
}

// ============================================
// CARGAR PRODUCTOS
// ============================================
function cargarProductos() {
    console.log('📦 Cargando productos...');
    
    firebase.database().ref('productos').on('value', (snapshot) => {
        const data = snapshot.val();
        productos = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                productos.push({ id: key, ...data[key] });
            });
            productos.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        }
        
        console.log(`✅ ${productos.length} productos cargados`);
        
        if (document.getElementById('merma').classList.contains('active')) {
            renderMerma();
        }
    });
}

function cargarMermas() {
    console.log('📋 Cargando registros de merma...');
    
    firebase.database().ref('mermas').on('value', (snapshot) => {
        const data = snapshot.val();
        mermas = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                mermas.push({ id: key, ...data[key] });
            });
        }
        
        console.log(`✅ ${mermas.length} registros de merma cargados`);
        
        // ✅ ACTUALIZAR VARIABLE GLOBAL
        window.mermas = mermas;
        
        // ✅ NOTIFICAR AL RESUMEN
        if (document.getElementById('resumen').classList.contains('active') && window.renderResumen) {
            window.renderResumen();
        }
        
        if (document.getElementById('merma').classList.contains('active')) {
            renderMerma();
        }
    });
}

// ============================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================
function renderMerma() {
    console.log('📊 Renderizando vista de Mermas...');
    
    const mermaContent = document.getElementById('mermaContent');
    if (!mermaContent) return;
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    
    // Calcular fechas para filtros
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);
    
    // Filtrar mermas
    let mermasFiltradas = mermas.filter(m => {
        if (filtroLocal !== 'Todos' && m.local !== filtroLocal) return false;
        if (!puedeVerLocal(m.local)) return false;
        
        const fechaMerma = m.fecha?.split('T')[0];
        if (!fechaMerma) return false;
        
        if (filtroTiempo === 'todos') return true;
        if (filtroTiempo === 'ayer') return fechaMerma === ayerStr;
        if (filtroTiempo === 'mes') return fechaMerma.substring(0, 7) === mesActual;
        if (filtroTiempo === 'anio') return fechaMerma.substring(0, 4) === anioActual;
        if (filtroTiempo === 'personalizado') return fechaMerma === AppState.filtros?.fechaPersonalizada;
        
        return true;
    });
    
    mermasFiltradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Calcular estadísticas
    let totalMermas = mermasFiltradas.reduce((sum, m) => sum + (m.costoTotal || 0), 0);
    
    // Agrupar por familia para las tarjetas
    const mermasPorFamilia = {};
    mermasFiltradas.forEach(m => {
        const familia = m.familia || 'Sin categoría';
        if (!mermasPorFamilia[familia]) {
            mermasPorFamilia[familia] = {
                cantidad: 0,
                costo: 0,
                count: 0
            };
        }
        mermasPorFamilia[familia].cantidad += m.cantidad || 0;
        mermasPorFamilia[familia].costo += m.costoTotal || 0;
        mermasPorFamilia[familia].count++;
    });

    // Ordenar familias por costo (mayor a menor)
    const familiasOrdenadas = Object.entries(mermasPorFamilia)
        .sort(([, a], [, b]) => b.costo - a.costo)
        .slice(0, 5); // Top 5 familias
    
    // HTML
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <h2><i class="fas fa-trash-alt" style="color: #ef4444;"></i> Control de Mermas</h2>
            <div style="display: flex; gap: 10px;">
                ${esGerencia() ? `
                    <button class="btn btn-outline" onclick="window.mostrarModalImportarProductos()">
                        <i class="fas fa-file-import"></i> Importar Productos
                    </button>
                    <button class="btn btn-outline" onclick="window.mostrarModalCatalogo()">
                        <i class="fas fa-boxes"></i> Gestionar Productos
                    </button>
                ` : ''}
                <button class="btn btn-primary" onclick="window.mostrarModalMerma()">
                    <i class="fas fa-plus"></i> Registrar Merma
                </button>
            </div>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 20px; display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
            <span style="background: #f1f5f9; padding: 8px 15px; border-radius: 20px;">
                <i class="fas fa-store" style="color: #3b82f6;"></i> ${filtroLocal}
            </span>
            <span style="background: #f1f5f9; padding: 8px 15px; border-radius: 20px;">
                <i class="fas fa-calendar" style="color: #3b82f6;"></i> 
                ${filtroTiempo === 'todos' ? 'Todo' : 
                  filtroTiempo === 'ayer' ? 'Ayer' : 
                  filtroTiempo === 'mes' ? 'Este mes' : 
                  filtroTiempo === 'anio' ? 'Este año' : 'Personalizado'}
            </span>
            <span style="margin-left: auto; font-weight: 600; color: #ef4444;">
                Total: ₡${totalMermas.toLocaleString()}
            </span>
        </div>
    `;

    // TARJETAS DE RESUMEN (NUEVAS)
    html += `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <!-- Tarjeta: Total Mermas -->
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 16px; padding: 20px; color: white; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-trash-alt" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">TOTAL MERMAS</div>
                        <div style="font-size: 1.8rem; font-weight: 700;">₡${totalMermas.toLocaleString()}</div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">${mermasFiltradas.length} registros</div>
                    </div>
                </div>
            </div>

            <!-- Tarjeta: Promedio por registro -->
            <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 16px; padding: 20px; color: white; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-chart-line" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">PROMEDIO X REGISTRO</div>
                        <div style="font-size: 1.8rem; font-weight: 700;">₡${mermasFiltradas.length ? (totalMermas / mermasFiltradas.length).toFixed(0).toLocaleString() : '0'}</div>
                    </div>
                </div>
            </div>

            <!-- Tarjeta: Familia con mayor merma -->
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; padding: 20px; color: white; box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-tag" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">MAYOR MERMA POR FAMILIA</div>
                        <div style="font-size: 1.2rem; font-weight: 700;">${familiasOrdenadas[0]?.[0] || 'Sin datos'}</div>
                        <div style="font-size: 1rem;">₡${familiasOrdenadas[0]?.[1].costo.toLocaleString() || '0'}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Top 5 Familias con más merma (mini gráfico de barras) -->
        ${familiasOrdenadas.length > 0 ? `
        <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin: 0 0 15px 0; font-size: 1rem; color: #64748b; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-chart-bar" style="color: #ef4444;"></i> Top 5 Familias con mayor merma (por costo)
            </h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
    ` : ''}
    `;

    // Agregar las barras para cada familia
    if (familiasOrdenadas.length > 0) {
        const maxCosto = Math.max(...familiasOrdenadas.map(([, data]) => data.costo));
        
        familiasOrdenadas.forEach(([familia, data]) => {
            const porcentaje = (data.costo / maxCosto) * 100;
            html += `
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem;">
                        <span><strong>${familia}</strong> (${data.count} registros)</span>
                        <span style="font-weight: 600; color: #ef4444;">₡${data.costo.toLocaleString()}</span>
                    </div>
                    <div style="width: 100%; background: #f1f5f9; border-radius: 30px; height: 10px; overflow: hidden;">
                        <div style="width: ${porcentaje}%; background: linear-gradient(90deg, #ef4444, #f87171); height: 10px; border-radius: 30px;"></div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
        </div>
        `;
    }
    
    if (mermasFiltradas.length === 0) {
        html += `
            <div class="card" style="padding: 40px; text-align: center;">
                <i class="fas fa-trash-alt" style="font-size: 4rem; color: #9ca3af; margin-bottom: 20px;"></i>
                <h3>No hay registros de merma</h3>
                <p>Haga clic en "Registrar Merma" para agregar uno.</p>
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
                                <th>Producto</th>
                                <th>Familia</th>
                                <th>Cantidad</th>
                                <th>Unidad</th>
                                <th>Costo Unit.</th>
                                <th>Costo Total</th>
                                <th>Motivo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        mermasFiltradas.forEach(m => {
            const fecha = new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-CR');
            
            html += `
                <tr>
                    <td><strong>${fecha}</strong></td>
                    <td>${m.local || '—'}</td>
                    <td>${m.productoNombre || '—'}</td>
                    <td>${m.familia || '—'}</td>
                    <td>${m.cantidad?.toFixed(2) || '0.00'}</td>
                    <td>${m.unidad || '—'}</td>
                    <td>₡${(m.costoUnitario || 0).toFixed(2)} / ${m.unidad || 'UD'}</td>
                    <td style="font-weight: 600; color: #ef4444;">₡${(m.costoTotal || 0).toLocaleString()}</td>
                    <td>${m.motivo || '—'}</td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            ${esGerencia() ? `
                                <button class="btn btn-sm btn-danger" onclick="window.eliminarMerma('${m.id}')" title="Eliminar">
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
    
    mermaContent.innerHTML = html;
}

// ============================================
// MOSTRAR MODAL DE REGISTRO DE MERMA (CORREGIDO)
// ============================================
function mostrarModalMerma(editId = null) {
    console.log('📝 Abriendo modal de registro de merma');
    
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('mermaModal');
    
    if (!modal || !overlay) {
        console.error('❌ No se encontró el modal de merma');
        return;
    }
    
    // CONFIGURAR FECHA CORRECTA
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaCorrecta = `${año}-${mes}-${dia}`;
    
    const fechaInput = document.getElementById('mermaFecha');
    if (fechaInput) fechaInput.value = fechaCorrecta;
    
    const cantidadInput = document.getElementById('mermaCantidad');
    if (cantidadInput) cantidadInput.value = '';
    
    const motivoInput = document.getElementById('mermaMotivo');
    if (motivoInput) motivoInput.value = '';
    
    // Limpiar selección de producto (con validaciones)
    limpiarSeleccionProducto();
    
    // Configurar selector de local
    const selectLocal = document.getElementById('mermaLocal');
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
    
    modal.dataset.editId = editId || '';
    
    const titleEl = document.getElementById('mermaModalTitle');
    if (titleEl) titleEl.textContent = editId ? 'Editar Merma' : 'Registrar Merma';
    
    const btnEl = document.getElementById('mermaSubmitBtn');
    if (btnEl) {
        btnEl.innerHTML = editId ? 
            '<i class="fas fa-save"></i> Actualizar Merma' : 
            '<i class="fas fa-save"></i> Guardar Merma';
    }
    
    // Activar modal
    modal.classList.add('active');
    overlay.classList.add('active');
    
    console.log('✅ Modal de merma abierto correctamente con fecha:', fechaCorrecta);
}

// ============================================
// BUSCAR PRODUCTOS
// ============================================
function buscarProductos() {
    const busqueda = document.getElementById('buscadorProducto')?.value.toLowerCase() || '';
    const resultadosDiv = document.getElementById('resultadosBusqueda');
    
    if (busqueda.length < 2) {
        resultadosDiv.style.display = 'none';
        return;
    }
    
    const resultados = productos.filter(p => 
        (p.nombre || '').toLowerCase().includes(busqueda) || 
        (p.familia || '').toLowerCase().includes(busqueda)
    ).slice(0, 30);
    
    if (resultados.length === 0) {
        resultadosDiv.innerHTML = `<div style="padding: 20px; text-align: center;">No se encontraron productos</div>`;
        resultadosDiv.style.display = 'block';
        return;
    }
    
    let html = '';
    resultados.forEach(p => {
        const precioPorUnidad = p.precio / (p.presentacion || 1);
        html += `
            <div onclick="seleccionarProducto('${p.id}')" style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div><strong>${p.nombre}</strong> (${p.familia})</div>
                <div style="font-size: 0.9rem; color: #666;">₡${p.precio.toLocaleString()} / ${p.presentacion} ${p.unidad} | ₡${precioPorUnidad.toFixed(2)} / ${p.unidad}</div>
            </div>
        `;
    });
    
    resultadosDiv.innerHTML = html;
    resultadosDiv.style.display = 'block';
}

// ============================================
// CALCULAR PRECIO UNITARIO
// ============================================
function calcularPrecioUnitario() {
    const precio = parseFloat(document.getElementById('productoPrecio')?.value) || 0;
    const presentacion = parseFloat(document.getElementById('productoPresentacion')?.value) || 1;
    const unidad = document.getElementById('productoUnidad')?.value || 'UD';
    
    const precioUnitario = presentacion > 0 ? precio / presentacion : 0;
    document.getElementById('precioUnitarioCalculado').textContent = 
        `₡${precioUnitario.toFixed(2)} / ${unidad}`;
}

// Agregar event listeners cuando se abre el modal de producto
function mostrarModalProducto(editId = null) {
    if (!esGerencia()) return alert('Solo gerencia');
    
    const modal = document.getElementById('productoModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;
    
    document.getElementById('productoFamilia').value = '';
    document.getElementById('productoNombre').value = '';
    document.getElementById('productoPresentacion').value = '1';
    document.getElementById('productoUnidad').value = 'GR';
    document.getElementById('productoPrecio').value = '';
    calcularPrecioUnitario();
    
    // Agregar event listeners para calcular en tiempo real
    document.getElementById('productoPrecio').addEventListener('input', calcularPrecioUnitario);
    document.getElementById('productoPresentacion').addEventListener('input', calcularPrecioUnitario);
    document.getElementById('productoUnidad').addEventListener('change', calcularPrecioUnitario);
    
    if (editId) {
        const p = productos.find(p => p.id === editId);
        if (p) {
            document.getElementById('productoFamilia').value = p.familia || '';
            document.getElementById('productoNombre').value = p.nombre || '';
            document.getElementById('productoPresentacion').value = p.presentacion || '1';
            document.getElementById('productoUnidad').value = p.unidad || 'GR';
            document.getElementById('productoPrecio').value = p.precio || '';
            modal.dataset.editId = editId;
            document.getElementById('productoModalTitle').textContent = 'Editar Producto';
            document.getElementById('productoSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Actualizar';
            calcularPrecioUnitario();
        }
    } else {
        delete modal.dataset.editId;
        document.getElementById('productoModalTitle').textContent = 'Nuevo Producto';
        document.getElementById('productoSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Guardar';
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// Agregar función al objeto window
window.calcularPrecioUnitario = calcularPrecioUnitario;

// ============================================
// SELECCIONAR PRODUCTO
// ============================================
function seleccionarProducto(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    document.getElementById('mermaProductoId').value = productoId;
    document.getElementById('productoSeleccionado').style.display = 'block';
    document.getElementById('productoSeleccionadoNombre').textContent = producto.nombre;
    
    const precioPorUnidad = producto.precio / (producto.presentacion || 1);
    document.getElementById('productoSeleccionadoDetalle').innerHTML = 
        `${producto.familia} | ${producto.presentacion} ${producto.unidad} | ₡${precioPorUnidad.toFixed(2)} / ${producto.unidad}`;
    
    document.getElementById('resultadosBusqueda').style.display = 'none';
    document.getElementById('buscadorProducto').value = '';
    
    calcularCostoMerma();
}

// ============================================
// LIMPIAR SELECCIÓN (CORREGIDO - CON VALIDACIONES)
// ============================================
function limpiarSeleccionProducto() {
    console.log('🧹 Limpiando selección de producto...');
    
    const mermaProductoId = document.getElementById('mermaProductoId');
    if (mermaProductoId) mermaProductoId.value = '';
    
    const productoSeleccionado = document.getElementById('productoSeleccionado');
    if (productoSeleccionado) productoSeleccionado.style.display = 'none';
    
    const resultadosBusqueda = document.getElementById('resultadosBusqueda');
    if (resultadosBusqueda) resultadosBusqueda.style.display = 'none';
    
    const buscadorProducto = document.getElementById('buscadorProducto');
    if (buscadorProducto) buscadorProducto.value = '';
    
    // ✅ VERIFICAR QUE LOS ELEMENTOS EXISTEN ANTES DE USARLOS
    const costoUnitarioEl = document.getElementById('mermaCostoUnitario');
    if (costoUnitarioEl) {
        costoUnitarioEl.textContent = '₡0 / unidad';
    } else {
        console.log('⚠️ Elemento mermaCostoUnitario no encontrado (esto es normal si el modal no está completamente cargado)');
    }
    
    const costoTotalEl = document.getElementById('mermaCostoTotal');
    if (costoTotalEl) {
        costoTotalEl.textContent = '₡0';
    } else {
        console.log('⚠️ Elemento mermaCostoTotal no encontrado');
    }
}

// ============================================
// CALCULAR COSTO (CORREGIDO)
// ============================================
function calcularCostoMerma() {
    console.log('🧮 Calculando costo de merma...');
    
    const productoId = document.getElementById('mermaProductoId')?.value;
    const cantidad = parseFloat(document.getElementById('mermaCantidad')?.value) || 0;
    
    const costoUnitarioEl = document.getElementById('mermaCostoUnitario');
    const costoTotalEl = document.getElementById('mermaCostoTotal');
    
    // Si los elementos no existen, salir silenciosamente
    if (!costoUnitarioEl || !costoTotalEl) {
        console.log('⚠️ Elementos de costo no disponibles aún');
        return;
    }
    
    if (!productoId || cantidad === 0) {
        costoUnitarioEl.textContent = '₡0 / unidad';
        costoTotalEl.textContent = '₡0';
        return;
    }
    
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const precioPorUnidad = producto.precio / (producto.presentacion || 1);
    const costoTotal = precioPorUnidad * cantidad;
    
    costoUnitarioEl.textContent = `₡${precioPorUnidad.toFixed(2)} / ${producto.unidad || 'UD'}`;
    costoTotalEl.textContent = `₡${costoTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
}

// ============================================
// GUARDAR MERMA
// ============================================
async function guardarMerma() {
    const modal = document.getElementById('mermaModal');
    const editId = modal?.dataset?.editId;
    
    const fecha = document.getElementById('mermaFecha')?.value;
    const local = document.getElementById('mermaLocal')?.value;
    const productoId = document.getElementById('mermaProductoId')?.value;
    const cantidad = parseFloat(document.getElementById('mermaCantidad')?.value) || 0;
    const motivo = document.getElementById('mermaMotivo')?.value;
    
    if (!fecha || !local || !productoId || cantidad === 0) {
        alert('Complete todos los campos obligatorios');
        return;
    }
    
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const precioPorUnidad = producto.precio / (producto.presentacion || 1);
    const costoTotal = precioPorUnidad * cantidad;
    
    const mermaData = {
        fecha, local, productoId, cantidad, motivo: motivo || '',
        productoNombre: producto.nombre,
        familia: producto.familia,
        unidad: producto.unidad,
        presentacion: producto.presentacion,
        costoUnitario: precioPorUnidad,
        costoTotal,
        creadoPor: AppState.usuario?.email || 'sistema',
        ultimaModificacion: new Date().toISOString()
    };
    
    if (!editId) mermaData.fechaCreacion = new Date().toISOString();
    
    try {
        if (editId) {
            await firebase.database().ref(`mermas/${editId}`).update(mermaData);
            alert('✅ Merma actualizada');
        } else {
            await firebase.database().ref('mermas').push(mermaData);
            alert('✅ Merma registrada');
        }
        cerrarModal('mermaModal');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar');
    }
}

// ============================================
// ELIMINAR MERMA
// ============================================
async function eliminarMerma(id) {
    if (!esGerencia() || !confirm('¿Eliminar registro?')) return;
    try {
        await firebase.database().ref(`mermas/${id}`).remove();
        alert('✅ Eliminado');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// MOSTRAR MODAL DEL CATÁLOGO DE PRODUCTOS
// ============================================
function mostrarModalCatalogo() {
    console.log('📦 Abriendo catálogo de productos');
    
    // CERRAR CUALQUIER OTRO MODAL PRIMERO
    const overlay = document.getElementById('modalOverlay');
    const mermaModal = document.getElementById('mermaModal');
    const productoModal = document.getElementById('productoModal');
    
    if (mermaModal) mermaModal.classList.remove('active');
    if (productoModal) productoModal.classList.remove('active');
    
    // AHORA ABRIR EL CATÁLOGO
    const modal = document.getElementById('catalogoModal');
    
    if (!modal || !overlay) {
        console.error('❌ No se encontró el modal de catálogo');
        console.log('Elementos disponibles:', {
            catalogoModal: document.getElementById('catalogoModal'),
            overlay: document.getElementById('modalOverlay')
        });
        return;
    }
    
    // Cargar productos en el catálogo
    cargarCatalogoProductos();
    
    // Actualizar contador de productos
    const totalSpan = document.getElementById('totalProductosCatalogo');
    if (totalSpan) {
        totalSpan.textContent = productos.length;
    }
    
    // Forzar estilos inline para asegurar visibilidad
    modal.style.display = 'block';
    modal.classList.add('active');
    
    overlay.style.display = 'block';
    overlay.classList.add('active');
    
    console.log('✅ Catálogo abierto correctamente');
    console.log('Estado del modal:', {
        display: modal.style.display,
        classList: modal.className,
        active: modal.classList.contains('active')
    });
}

// ============================================
// CARGAR PRODUCTOS EN EL MODAL
// ============================================
function cargarCatalogoProductos() {
    const contenedor = document.getElementById('catalogoProductos');
    if (!contenedor) {
        console.error('❌ No se encontró el contenedor #catalogoProductos');
        return;
    }
    
    console.log('📦 Cargando productos en catálogo:', productos.length);
    
    if (productos.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-box-open" style="font-size: 3rem; color: #94a3b8;"></i>
                <p style="color: #64748b; margin-top: 15px;">No hay productos cargados</p>
                <button class="btn btn-primary" onclick="window.mostrarModalProducto()" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> Crear primer producto
                </button>
            </div>
        `;
        return;
    }
    
    const productosOrdenados = [...productos].sort((a, b) => {
        if (a.familia === b.familia) {
            return (a.nombre || '').localeCompare(b.nombre || '');
        }
        return (a.familia || '').localeCompare(b.familia || '');
    });
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="table" style="min-width: 800px;">
                <thead>
                    <tr>
                        <th>Familia</th>
                        <th>Producto</th>
                        <th>Presentación</th>
                        <th>Unidad</th>
                        <th>Precio (₡)</th>
                        <th>Precio Unitario</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    productosOrdenados.forEach(p => {
        const precioUnitario = p.presentacion ? (p.precio / p.presentacion) : p.precio;
        
        html += `
            <tr class="producto-row" data-nombre="${(p.nombre || '').toLowerCase()}" data-familia="${(p.familia || '').toLowerCase()}">
                <td><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${p.familia || '—'}</span></td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.presentacion ? p.presentacion.toLocaleString() : '1'}</td>
                <td>${p.unidad || 'UD'}</td>
                <td>₡${(p.precio || 0).toLocaleString()}</td>
                <td>₡${precioUnitario.toFixed(2)} / ${p.unidad || 'UD'}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-outline" onclick="window.mostrarModalProducto('${p.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="if(confirm('¿Eliminar producto?')) window.eliminarProducto('${p.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    contenedor.innerHTML = html;
    console.log('✅ Catálogo renderizado con', productos.length, 'productos');
}

// ============================================
// FILTRAR PRODUCTOS EN EL CATÁLOGO
// ============================================
function filtrarCatalogo() {
    const busqueda = document.getElementById('buscarProductoCatalogo')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('.producto-row');
    
    rows.forEach(row => {
        const nombre = row.dataset.nombre || '';
        const familia = row.dataset.familia || '';
        
        if (nombre.includes(busqueda) || familia.includes(busqueda) || busqueda === '') {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ============================================
// MOSTRAR MODAL DE PRODUCTO INDIVIDUAL
// ============================================
function mostrarModalProducto(editId = null) {
    console.log('📦 Abriendo modal de producto');
    
    if (!esGerencia()) {
        alert('Solo gerencia puede gestionar productos');
        return;
    }
    
    // CERRAR CUALQUIER OTRO MODAL PRIMERO
    const overlay = document.getElementById('modalOverlay');
    const mermaModal = document.getElementById('mermaModal');
    const catalogoModal = document.getElementById('catalogoModal');
    
    if (mermaModal) mermaModal.classList.remove('active');
    if (catalogoModal) catalogoModal.classList.remove('active');
    
    // AHORA ABRIR EL MODAL DE PRODUCTO
    const modal = document.getElementById('productoModal');
    
    if (!modal || !overlay) {
        console.error('❌ No se encontró el modal de producto');
        return;
    }
    
    // Limpiar campos
    document.getElementById('productoFamilia').value = '';
    document.getElementById('productoNombre').value = '';
    document.getElementById('productoPresentacion').value = '1';
    document.getElementById('productoUnidad').value = 'GR';
    document.getElementById('productoPrecio').value = '';
    
    // Calcular precio unitario
    if (typeof calcularPrecioUnitario === 'function') {
        calcularPrecioUnitario();
    }
    
    // Configurar para edición o nuevo
    if (editId) {
        const producto = productos.find(p => p.id === editId);
        if (producto) {
            document.getElementById('productoFamilia').value = producto.familia || '';
            document.getElementById('productoNombre').value = producto.nombre || '';
            document.getElementById('productoPresentacion').value = producto.presentacion || '1';
            document.getElementById('productoUnidad').value = producto.unidad || 'GR';
            document.getElementById('productoPrecio').value = producto.precio || '';
            modal.dataset.editId = editId;
            document.getElementById('productoModalTitle').textContent = 'Editar Producto';
            document.getElementById('productoSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Actualizar Producto';
            
            if (typeof calcularPrecioUnitario === 'function') {
                calcularPrecioUnitario();
            }
        }
    } else {
        delete modal.dataset.editId;
        document.getElementById('productoModalTitle').textContent = 'Nuevo Producto';
        document.getElementById('productoSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// ============================================
// MOSTRAR MODAL IMPORTAR PRODUCTOS
// ============================================
function mostrarModalImportarProductos() {
    console.log('📤 Abriendo selector de archivo para importar');
    
    if (!esGerencia()) {
        alert('Solo gerencia puede importar productos');
        return;
    }
    
    // Crear input de archivo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    input.style.display = 'none';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log('📁 Archivo seleccionado:', file.name);
            importarProductosDesdeExcel(file);
        }
        document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
}

// ============================================
// IMPORTAR EXCEL - VERSIÓN ADAPTADA A TU FORMATO
// ============================================
async function importarProductosDesdeExcel(file) {
    console.log('📤 Iniciando importación de productos...');
    
    if (!esGerencia()) {
        alert('Solo gerencia puede importar productos');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            console.log('📖 Leyendo archivo Excel...');
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Obtener la primera hoja
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir a JSON con encabezados
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            console.log('📊 Primera fila:', jsonData[0]);
            console.log('📊 Segunda fila:', jsonData[1]);
            console.log('📊 Tercera fila:', jsonData[2]);
            
            // Buscar la fila donde están los encabezados (FAMILIA, PRODUCTO, etc.)
            let startRow = -1;
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row) continue;
                
                // Buscar en la fila algún texto que indique encabezados
                for (let j = 0; j < row.length; j++) {
                    const cell = String(row[j] || '').toUpperCase().trim();
                    if (cell === 'FAMILIA' || cell === 'FAMILIA') {
                        startRow = i + 1; // La siguiente fila son los datos
                        console.log('✅ Encabezados encontrados en fila:', i, 'columna:', j);
                        break;
                    }
                }
                if (startRow !== -1) break;
            }
            
            // Si no encuentra encabezados, empezar desde la fila 3 (después de los espacios)
            if (startRow === -1) {
                console.log('⚠️ No se encontraron encabezados, empezando desde fila 3');
                startRow = 3; // Las primeras 2 filas están vacías o con metadata
            }
            
            let actualizados = 0;
            let nuevos = 0;
            let ignorados = 0;
            let errores = [];
            
            for (let i = startRow; i < jsonData.length; i++) {
                const row = jsonData[i];
                
                // Saltar filas vacías
                if (!row || row.length === 0) {
                    ignorados++;
                    continue;
                }
                
                // Las columnas en tu Excel son:
                // Col D (índice 3): FAMILIA
                // Col E (índice 4): PRODUCTO
                // Col F (índice 5): PRESENTACION
                // Col G (índice 6): UNIDAD
                // Col H (índice 7): PRECIO FINAL
                
                const familia = row[3] ? String(row[3]).trim().toUpperCase() : '';
                const producto = row[4] ? String(row[4]).trim().toUpperCase() : '';
                const presentacionRaw = row[5] ? String(row[5]).trim() : '';
                const unidad = row[6] ? String(row[6]).trim().toUpperCase() : '';
                const precioRaw = row[7] ? String(row[7]).trim() : '';
                
                // Saltar filas sin datos esenciales
                if (!familia || !producto) {
                    ignorados++;
                    continue;
                }
                
                // Saltar filas que son encabezados o metadata
                if (familia === 'FAMILIA' || producto === 'PRODUCTO') {
                    ignorados++;
                    continue;
                }
                
                // Limpiar presentación (quitar caracteres no numéricos)
                let presentacion = 1;
                if (presentacionRaw) {
                    const cleaned = presentacionRaw.replace(/[^\d.-]/g, '');
                    presentacion = parseFloat(cleaned) || 1;
                }
                
                // Limpiar precio (quitar caracteres no numéricos)
                let precio = 0;
                if (precioRaw) {
                    const cleaned = precioRaw.replace(/[^\d.-]/g, '');
                    precio = parseFloat(cleaned) || 0;
                }
                
                // Validaciones básicas
                if (precio <= 0) {
                    console.log('⚠️ Precio inválido para:', producto, 'precio:', precioRaw);
                    ignorados++;
                    continue;
                }
                
                console.log(`🔄 Procesando: ${familia} - ${producto} - ₡${precio} (${presentacion} ${unidad})`);
                
                try {
                    // Buscar si el producto ya existe (por nombre)
                    const snapshot = await firebase.database()
                        .ref('productos')
                        .orderByChild('nombre')
                        .equalTo(producto)
                        .once('value');
                    
                    let existe = false;
                    let existingKey = null;
                    
                    snapshot.forEach(child => {
                        existe = true;
                        existingKey = child.key;
                    });
                    
                    const data = {
                        familia,
                        nombre: producto,
                        presentacion,
                        unidad: unidad || 'UD',
                        precio,
                        ultimaActualizacion: new Date().toISOString(),
                        actualizadoPor: AppState.usuario?.email || 'sistema'
                    };
                    
                    if (existe && existingKey) {
                        // Actualizar existente
                        await firebase.database().ref(`productos/${existingKey}`).update(data);
                        actualizados++;
                        console.log(`✅ Actualizado: ${producto}`);
                    } else {
                        // Crear nuevo
                        data.fechaCreacion = new Date().toISOString();
                        data.creadoPor = AppState.usuario?.email || 'sistema';
                        await firebase.database().ref('productos').push(data);
                        nuevos++;
                        console.log(`✅ Nuevo: ${producto}`);
                    }
                    
                } catch (rowError) {
                    console.error('❌ Error procesando fila:', row, rowError);
                    errores.push(`Fila ${i + 1}: ${producto} - ${rowError.message}`);
                    ignorados++;
                }
            }
            
            // Mostrar resumen
            const mensaje = `✅ Importación completada:\n` +
                           `• ${nuevos} productos nuevos\n` +
                           `• ${actualizados} productos actualizados\n` +
                           `• ${ignorados} filas ignoradas`;
            
            if (errores.length > 0) {
                console.warn('⚠️ Errores encontrados:', errores);
                alert(mensaje + `\n\n⚠️ ${errores.length} errores (ver consola)`);
            } else {
                alert(mensaje);
            }
            
        } catch (error) {
            console.error('❌ Error al importar:', error);
            alert('Error al importar: ' + error.message);
        }
    };
    
    reader.onerror = function(error) {
        console.error('❌ Error al leer el archivo:', error);
        alert('Error al leer el archivo');
    };
    
    reader.readAsArrayBuffer(file);
}

// ============================================
// GUARDAR PRODUCTO (debe estar definida)
// ============================================
async function guardarProducto() {
    console.log('💾 Guardando producto...');
    
    if (!esGerencia()) {
        alert('Solo gerencia puede gestionar productos');
        return;
    }
    
    const modal = document.getElementById('productoModal');
    const editId = modal?.dataset?.editId;
    
    const familia = document.getElementById('productoFamilia')?.value;
    const nombre = document.getElementById('productoNombre')?.value;
    const presentacion = parseFloat(document.getElementById('productoPresentacion')?.value) || 1;
    const unidad = document.getElementById('productoUnidad')?.value;
    const precio = parseFloat(document.getElementById('productoPrecio')?.value) || 0;
    
    // Validaciones
    if (!familia || !nombre || !unidad || precio <= 0) {
        alert('Complete todos los campos obligatorios');
        return;
    }
    
    if (presentacion <= 0) {
        alert('La presentación debe ser mayor a 0');
        return;
    }
    
    const data = {
        familia: familia.toUpperCase().trim(),
        nombre: nombre.toUpperCase().trim(),
        presentacion: presentacion,
        unidad: unidad,
        precio: precio,
        ultimaActualizacion: new Date().toISOString(),
        actualizadoPor: AppState.usuario?.email || 'sistema'
    };
    
    // Si es nuevo, agregar fecha de creación
    if (!editId) {
        data.fechaCreacion = new Date().toISOString();
        data.creadoPor = AppState.usuario?.email || 'sistema';
    }
    
    try {
        if (editId) {
            // Actualizar producto existente
            await firebase.database().ref(`productos/${editId}`).update(data);
            console.log('✅ Producto actualizado:', editId);
            alert('✅ Producto actualizado correctamente');
        } else {
            // Crear nuevo producto
            const newRef = await firebase.database().ref('productos').push(data);
            console.log('✅ Producto creado:', newRef.key);
            alert('✅ Producto guardado correctamente');
        }
        
        // Cerrar modal
        cerrarModal('productoModal');
        
    } catch (error) {
        console.error('❌ Error al guardar producto:', error);
        alert('Error al guardar el producto. Intente de nuevo.');
    }
}

// Limpiar formulario al cerrar modal
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
        setTimeout(() => {
            const productoModal = document.getElementById('productoModal');
            if (!productoModal.classList.contains('active')) {
                // Limpiar campos si el modal está cerrado
                document.getElementById('productoFamilia').value = '';
                document.getElementById('productoNombre').value = '';
                document.getElementById('productoPresentacion').value = '1';
                document.getElementById('productoUnidad').value = 'GR';
                document.getElementById('productoPrecio').value = '';
            }
        }, 300);
    }
});

// ============================================
// ELIMINAR PRODUCTO (FUNCIÓN FALTANTE)
// ============================================
async function eliminarProducto(id) {
    console.log('🗑️ Eliminando producto:', id);
    
    if (!esGerencia()) {
        alert('Solo gerencia puede eliminar productos');
        return;
    }
    
    if (!confirm('¿Está seguro de eliminar este producto?\nEsta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await firebase.database().ref(`productos/${id}`).remove();
        console.log('✅ Producto eliminado:', id);
        alert('✅ Producto eliminado correctamente');
        
        // Recargar el catálogo
        cargarCatalogoProductos();
        
    } catch (error) {
        console.error('❌ Error al eliminar producto:', error);
        alert('Error al eliminar el producto. Intente de nuevo.');
    }
}

// ============================================
// EXPORTAR FUNCIONES Y VARIABLES
// ============================================
window.initMerma = initMerma;
window.renderMerma = renderMerma;
window.mostrarModalMerma = mostrarModalMerma;
window.guardarMerma = guardarMerma;
window.eliminarMerma = eliminarMerma;
window.mostrarModalCatalogo = mostrarModalCatalogo;
window.mostrarModalProducto = mostrarModalProducto;
window.guardarProducto = guardarProducto;
window.eliminarProducto = eliminarProducto;
window.mostrarModalImportarProductos = mostrarModalImportarProductos;
window.buscarProductos = buscarProductos;
window.seleccionarProducto = seleccionarProducto;
window.limpiarSeleccionProducto = limpiarSeleccionProducto;
window.calcularCostoMerma = calcularCostoMerma;
window.filtrarCatalogo = filtrarCatalogo;
window.calcularPrecioUnitario = calcularPrecioUnitario;

// ✅ EXPORTAR LA VARIABLE GLOBAL
window.mermas = mermas;

console.log('✅ merma.js cargado');

console.log('✅ merma.js cargado - Funciones exportadas:', {
    guardarProducto: typeof window.guardarProducto,
    mostrarModalCatalogo: typeof window.mostrarModalCatalogo,
    mostrarModalProducto: typeof window.mostrarModalProducto
});