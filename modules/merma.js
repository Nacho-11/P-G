// modules/merma.js - VERSIÓN MEJORADA CON MÚLTIPLES PRODUCTOS
console.log('🚀 Cargando módulo de Mermas...');

// ============================================
// VARIABLES GLOBALES
// ============================================
let productos = [];
let mermas = [];
let carritoMerma = []; // Carrito temporal para el registro actual

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

// ============================================
// CARGAR MERMAS
// ============================================
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
        window.mermas = mermas;
        
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
    
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);
    
    const mermasFiltradas = mermas.filter(m => {
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
    
    const totalMermas = mermasFiltradas.reduce((sum, m) => sum + (m.costoTotal || 0), 0);
    
    // Agrupar por familia
    const mermasPorFamilia = {};
    mermasFiltradas.forEach(m => {
        if (m.productos) {
            m.productos.forEach(p => {
                const familia = p.familia || 'Sin categoría';
                if (!mermasPorFamilia[familia]) {
                    mermasPorFamilia[familia] = { cantidad: 0, costo: 0, count: 0 };
                }
                mermasPorFamilia[familia].cantidad += p.cantidad || 0;
                mermasPorFamilia[familia].costo += p.costoTotal || 0;
                mermasPorFamilia[familia].count++;
            });
        } else {
            // Versión antigua (un solo producto)
            const familia = m.familia || 'Sin categoría';
            if (!mermasPorFamilia[familia]) {
                mermasPorFamilia[familia] = { cantidad: 0, costo: 0, count: 0 };
            }
            mermasPorFamilia[familia].cantidad += m.cantidad || 0;
            mermasPorFamilia[familia].costo += m.costoTotal || 0;
            mermasPorFamilia[familia].count++;
        }
    });
    
    const familiasOrdenadas = Object.entries(mermasPorFamilia)
        .sort(([, a], [, b]) => b.costo - a.costo)
        .slice(0, 5);
    
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
                <i class="fas fa-store"></i> ${filtroLocal}
            </span>
            <span style="margin-left: auto; font-weight: 600; color: #ef4444;">
                Total: ₡${totalMermas.toLocaleString()}
            </span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 16px; padding: 20px; color: white;">
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
            
            <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 16px; padding: 20px; color: white;">
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
            
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; padding: 20px; color: white;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-tag" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">MAYOR MERMA POR FAMILIA</div>
                        <div style="font-size: 1rem; font-weight: 700;">${familiasOrdenadas[0]?.[0] || 'Sin datos'}</div>
                        <div>₡${familiasOrdenadas[0]?.[1].costo.toLocaleString() || '0'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (familiasOrdenadas.length > 0) {
        const maxCosto = Math.max(...familiasOrdenadas.map(([, data]) => data.costo));
        html += `
            <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0;"><i class="fas fa-chart-bar"></i> Top 5 Familias con mayor merma</h3>
        `;
        familiasOrdenadas.forEach(([familia, data]) => {
            const porcentaje = maxCosto > 0 ? (data.costo / maxCosto) * 100 : 0;
            html += `
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span><strong>${familia}</strong> (${data.count} registros)</span>
                        <span style="color: #ef4444;">₡${data.costo.toLocaleString()}</span>
                    </div>
                    <div style="width: 100%; background: #f1f5f9; border-radius: 30px; height: 8px; overflow: hidden;">
                        <div style="width: ${porcentaje}%; background: linear-gradient(90deg, #ef4444, #f87171); height: 8px; border-radius: 30px;"></div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
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
                                <th>Productos</th>
                                <th>Cantidad Total</th>
                                <th>Costo Total</th>
                                <th>Motivo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        mermasFiltradas.forEach(m => {
            const fecha = new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-CR');
            let productosLista = '';
            let cantidadTotal = 0;
            
            if (m.productos && m.productos.length > 0) {
                productosLista = m.productos.map(p => `${p.nombre} (${p.cantidad.toFixed(2)} ${p.unidad})`).join('<br>');
                cantidadTotal = m.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
            } else {
                productosLista = `${m.productoNombre || '—'} (${(m.cantidad || 0).toFixed(2)} ${m.unidad || 'UD'})`;
                cantidadTotal = m.cantidad || 0;
            }
            
            html += `
                <tr>
                    <td><strong>${fecha}</strong></td>
                    <td>${m.local || '—'}</td>
                    <td><small>${productosLista}</small></td>
                    <td>${cantidadTotal.toFixed(2)}</td>
                    <td style="color: #ef4444; font-weight: 600;">₡${(m.costoTotal || 0).toLocaleString()}</td>
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
        
        html += `</tbody></table></div></div>`;
    }
    
    mermaContent.innerHTML = html;
}

// ============================================
// MOSTRAR MODAL DE MERMA (CON CARRITO)
// ============================================
function mostrarModalMerma(editId = null) {
    console.log('📝 Abriendo modal de registro de merma');
    
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('mermaModal');
    
    if (!modal || !overlay) return;
    
    // Resetear carrito
    carritoMerma = [];
    
    // Configurar fecha
    const hoy = new Date();
    const fechaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    document.getElementById('mermaFecha').value = fechaActual;
    document.getElementById('mermaMotivo').value = '';
    
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
    
    // Limpiar campos de búsqueda y selección
    document.getElementById('buscadorProducto').value = '';
    document.getElementById('resultadosBusqueda').innerHTML = '';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    document.getElementById('productoSeleccionado').style.display = 'none';
    document.getElementById('mermaProductoId').value = '';
    document.getElementById('mermaCantidad').value = '';
    
    // Limpiar resumen de costos
    document.getElementById('mermaCostoUnitario').textContent = '₡0 / unidad';
    document.getElementById('mermaCostoTotal').textContent = '₡0';
    
    // Renderizar carrito vacío
    renderCarritoMerma();
    
    modal.dataset.editId = editId || '';
    modal.classList.add('active');
    overlay.classList.add('active');
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
            <div onclick="window.seleccionarProducto('${p.id}')" style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
                <div><strong>${p.nombre}</strong> <span style="color:#64748b;">(${p.familia})</span></div>
                <div style="font-size: 0.85rem; color: #666;">
                    ₡${p.precio.toLocaleString()} / ${p.presentacion} ${p.unidad} | 
                    ₡${precioPorUnidad.toFixed(2)} / ${p.unidad}
                </div>
            </div>
        `;
    });
    
    resultadosDiv.innerHTML = html;
    resultadosDiv.style.display = 'block';
}

// ============================================
// SELECCIONAR PRODUCTO PARA AGREGAR AL CARRITO
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
    
    // Calcular costo unitario
    document.getElementById('mermaCostoUnitario').textContent = `₡${precioPorUnidad.toFixed(2)} / ${producto.unidad}`;
}

// ============================================
// AGREGAR PRODUCTO AL CARRITO (MEJORADO)
// ============================================
function agregarProductoAlCarrito() {
    const productoId = document.getElementById('mermaProductoId').value;
    const cantidad = parseFloat(document.getElementById('mermaCantidad').value);
    
    if (!productoId) {
        alert('Seleccione un producto primero');
        return;
    }
    
    if (!cantidad || cantidad <= 0) {
        alert('Ingrese una cantidad válida');
        return;
    }
    
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const precioPorUnidad = producto.precio / (producto.presentacion || 1);
    const costoTotal = precioPorUnidad * cantidad;
    
    carritoMerma.push({
        productoId: producto.id,
        nombre: producto.nombre,
        familia: producto.familia,
        unidad: producto.unidad,
        presentacion: producto.presentacion,
        cantidad: cantidad,
        costoUnitario: precioPorUnidad,
        costoTotal: costoTotal
    });
    
    // Limpiar selección actual
    limpiarSeleccionProducto();
    
    // Limpiar campo de cantidad
    document.getElementById('mermaCantidad').value = '';
    
    // Renderizar carrito y actualizar total
    renderCarritoMerma();
    actualizarTotalCarrito();
    
    // Mostrar mensaje de éxito
    console.log(`✅ Producto ${producto.nombre} agregado al carrito`);
}

// ============================================
// ELIMINAR PRODUCTO DEL CARRITO
// ============================================
function eliminarProductoCarrito(index) {
    carritoMerma.splice(index, 1);
    renderCarritoMerma();
    actualizarTotalCarrito();
}

// ============================================
// RENDERIZAR CARRITO DE PRODUCTOS
// ============================================
function renderCarritoMerma() {
    const container = document.getElementById('carritoMerma');
    if (!container) return;
    
    if (carritoMerma.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #64748b;">
                <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>No hay productos agregados</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="padding: 8px; text-align: left;">Producto</th>
                    <th style="padding: 8px; text-align: center;">Cantidad</th>
                    <th style="padding: 8px; text-align: right;">Costo Unit.</th>
                    <th style="padding: 8px; text-align: right;">Subtotal</th>
                    <th style="padding: 8px; text-align: center;">Acción</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    carritoMerma.forEach((item, idx) => {
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;">
                    <strong>${item.nombre}</strong><br>
                    <small style="color: #64748b;">${item.familia} | ${item.unidad}</small>
                </td>
                <td style="padding: 10px; text-align: center;">${item.cantidad.toFixed(2)}</td>
                <td style="padding: 10px; text-align: right;">₡${item.costoUnitario.toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; color: #ef4444; font-weight: 600;">₡${item.costoTotal.toFixed(2)}</td>
                <td style="padding: 10px; text-align: center;">
                    <button type="button" onclick="window.eliminarProductoCarrito(${idx})" 
                            style="background: none; border: none; color: #ef4444; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ============================================
// ACTUALIZAR TOTAL DEL CARRITO
// ============================================
function actualizarTotalCarrito() {
    const total = carritoMerma.reduce((sum, item) => sum + item.costoTotal, 0);
    const totalSpan = document.getElementById('mermaCostoTotal');
    if (totalSpan) {
        totalSpan.textContent = `₡${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // También actualizar el costo unitario display (limpiarlo)
    const costoUnitarioSpan = document.getElementById('mermaCostoUnitario');
    if (costoUnitarioSpan) {
        costoUnitarioSpan.textContent = '₡0 / unidad';
    }
}

// ============================================
// LIMPIAR SELECCIÓN DE PRODUCTO
// ============================================
function limpiarSeleccionProducto() {
    document.getElementById('mermaProductoId').value = '';
    document.getElementById('productoSeleccionado').style.display = 'none';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    document.getElementById('buscadorProducto').value = '';
    document.getElementById('mermaCantidad').value = '';
    document.getElementById('mermaCostoUnitario').textContent = '₡0 / unidad';
}

// ============================================
// CALCULAR COSTO DEL PRODUCTO SELECCIONADO (PARA VISTA PREVIA)
// ============================================
function calcularCostoMerma() {
    const productoId = document.getElementById('mermaProductoId').value;
    const cantidad = parseFloat(document.getElementById('mermaCantidad').value) || 0;
    
    if (!productoId || cantidad === 0) {
        document.getElementById('mermaCostoTotal').textContent = '₡0';
        return;
    }
    
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const precioPorUnidad = producto.precio / (producto.presentacion || 1);
    const costoTotal = precioPorUnidad * cantidad;
    document.getElementById('mermaCostoTotal').textContent = `₡${costoTotal.toFixed(2)}`;
}

// ============================================
// GUARDAR MERMA (CORREGIDO - SIN VALIDACIÓN DE CAMPO CANTIDAD)
// ============================================
async function guardarMerma() {
    console.log('💾 Guardando merma...');
    
    const modal = document.getElementById('mermaModal');
    const editId = modal?.dataset?.editId;
    
    const fecha = document.getElementById('mermaFecha').value;
    const local = document.getElementById('mermaLocal').value;
    const motivo = document.getElementById('mermaMotivo').value;
    
    // Validaciones básicas
    if (!fecha) {
        alert('Seleccione una fecha');
        return;
    }
    
    if (!local) {
        alert('Seleccione un local');
        return;
    }
    
    // Verificar que haya productos en el carrito
    if (carritoMerma.length === 0) {
        alert('Debe agregar al menos un producto al carrito');
        return;
    }
    
    // Calcular costo total del carrito
    const costoTotal = carritoMerma.reduce((sum, item) => sum + item.costoTotal, 0);
    
    // Preparar datos para guardar
    const mermaData = {
        fecha: fecha,
        local: local,
        productos: carritoMerma.map(item => ({
            productoId: item.productoId,
            nombre: item.nombre,
            familia: item.familia,
            unidad: item.unidad,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            costoTotal: item.costoTotal
        })),
        costoTotal: costoTotal,
        motivo: motivo || '',
        cantidadTotal: carritoMerma.reduce((sum, item) => sum + item.cantidad, 0),
        creadoPor: AppState?.usuario?.email || 'sistema',
        ultimaModificacion: new Date().toISOString()
    };
    
    // Para compatibilidad con versiones anteriores, también guardar un resumen
    mermaData.resumen = {
        productos: carritoMerma.map(item => item.nombre).join(', '),
        cantidadTotal: mermaData.cantidadTotal
    };
    
    if (!editId) {
        mermaData.fechaCreacion = new Date().toISOString();
    }
    
    try {
        const btn = document.querySelector('#mermaModal .btn-primary');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }
        
        if (editId) {
            await firebase.database().ref(`mermas/${editId}`).update(mermaData);
            alert('✅ Merma actualizada correctamente');
        } else {
            await firebase.database().ref('mermas').push(mermaData);
            alert('✅ Merma registrada correctamente');
        }
        
        // Limpiar carrito
        carritoMerma = [];
        
        // Cerrar modal
        cerrarModal('mermaModal');
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al guardar: ' + error.message);
    } finally {
        const btn = document.querySelector('#mermaModal .btn-primary');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar Merma';
        }
    }
}

// ============================================
// ELIMINAR MERMA
// ============================================
async function eliminarMerma(id) {
    if (!esGerencia() || !confirm('¿Eliminar este registro de merma?')) return;
    try {
        await firebase.database().ref(`mermas/${id}`).remove();
        alert('✅ Eliminado');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// FUNCIONES DE PRODUCTOS (MANTENIDAS)
// ============================================
function mostrarModalCatalogo() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('catalogoModal');
    if (!modal || !overlay) return;
    
    cargarCatalogoProductos();
    modal.classList.add('active');
    overlay.classList.add('active');
}

function cargarCatalogoProductos() {
    const contenedor = document.getElementById('catalogoProductos');
    if (!contenedor) return;
    
    if (productos.length === 0) {
        contenedor.innerHTML = `<div style="text-align: center; padding: 40px;">No hay productos cargados</div>`;
        return;
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr><th>Familia</th><th>Producto</th><th>Presentación</th><th>Unidad</th><th>Precio</th><th>Precio Unitario</th><th>Acciones</th></tr>
                </thead>
                <tbody>
    `;
    
    productos.forEach(p => {
        const precioUnitario = p.presentacion ? (p.precio / p.presentacion) : p.precio;
        html += `
            <tr>
                <td>${p.familia || '—'}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.presentacion}</td>
                <td>${p.unidad || 'UD'}</td>
                <td>₡${p.precio.toLocaleString()}</td>
                <td>₡${precioUnitario.toFixed(2)} / ${p.unidad || 'UD'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="window.mostrarModalProducto('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.eliminarProducto('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
}

function mostrarModalProducto(editId = null) {
    if (!esGerencia()) return alert('Solo gerencia');
    const modal = document.getElementById('productoModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;
    
    document.getElementById('productoFamilia').value = '';
    document.getElementById('productoNombre').value = '';
    document.getElementById('productoPresentacion').value = '1';
    document.getElementById('productoUnidad').value = 'UD';
    document.getElementById('productoPrecio').value = '';
    
    if (editId) {
        const p = productos.find(p => p.id === editId);
        if (p) {
            document.getElementById('productoFamilia').value = p.familia || '';
            document.getElementById('productoNombre').value = p.nombre || '';
            document.getElementById('productoPresentacion').value = p.presentacion || '1';
            document.getElementById('productoUnidad').value = p.unidad || 'UD';
            document.getElementById('productoPrecio').value = p.precio || '';
        }
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

async function guardarProducto() {
    const familia = document.getElementById('productoFamilia').value;
    const nombre = document.getElementById('productoNombre').value;
    const presentacion = parseFloat(document.getElementById('productoPresentacion').value) || 1;
    const unidad = document.getElementById('productoUnidad').value;
    const precio = parseFloat(document.getElementById('productoPrecio').value) || 0;
    
    if (!familia || !nombre || !precio) {
        alert('Complete todos los campos');
        return;
    }
    
    const data = {
        familia: familia.toUpperCase(),
        nombre: nombre.toUpperCase(),
        presentacion: presentacion,
        unidad: unidad,
        precio: precio,
        ultimaActualizacion: new Date().toISOString()
    };
    
    try {
        await firebase.database().ref('productos').push(data);
        alert('✅ Producto guardado');
        cerrarModal('productoModal');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar producto?')) return;
    try {
        await firebase.database().ref(`productos/${id}`).remove();
        alert('✅ Eliminado');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function mostrarModalImportarProductos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    input.onchange = (e) => importarProductosDesdeExcel(e.target.files[0]);
    input.click();
}

async function importarProductosDesdeExcel(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        let nuevos = 0, actualizados = 0;
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 5) continue;
            
            const familia = row[3] ? String(row[3]).trim().toUpperCase() : '';
            const nombre = row[4] ? String(row[4]).trim().toUpperCase() : '';
            const presentacion = parseFloat(row[5]) || 1;
            const unidad = row[6] ? String(row[6]).trim().toUpperCase() : 'UD';
            const precio = parseFloat(String(row[7]).replace(/[^\d.-]/g, '')) || 0;
            
            if (!familia || !nombre || !precio) continue;
            
            const existing = productos.find(p => p.nombre === nombre);
            const data = { familia, nombre, presentacion, unidad, precio };
            
            if (existing) {
                await firebase.database().ref(`productos/${existing.id}`).update(data);
                actualizados++;
            } else {
                await firebase.database().ref('productos').push(data);
                nuevos++;
            }
        }
        
        alert(`✅ Importación completada\nNuevos: ${nuevos}\nActualizados: ${actualizados}`);
    };
    reader.readAsArrayBuffer(file);
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.initMerma = initMerma;
window.renderMerma = renderMerma;
window.mostrarModalMerma = mostrarModalMerma;
window.guardarMerma = guardarMerma;
window.eliminarMerma = eliminarMerma;
window.buscarProductos = buscarProductos;
window.seleccionarProducto = seleccionarProducto;
window.limpiarSeleccionProducto = limpiarSeleccionProducto;
window.calcularCostoMerma = calcularCostoMerma;
window.agregarProductoAlCarrito = agregarProductoAlCarrito;
window.eliminarProductoCarrito = eliminarProductoCarrito;
window.mostrarModalCatalogo = mostrarModalCatalogo;
window.mostrarModalProducto = mostrarModalProducto;
window.guardarProducto = guardarProducto;
window.eliminarProducto = eliminarProducto;
window.mostrarModalImportarProductos = mostrarModalImportarProductos;
window.filtrarCatalogo = () => {};

console.log('✅ merma.js cargado - Versión con múltiples productos');