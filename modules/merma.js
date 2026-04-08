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

    const mermasFiltradas = mermas.filter(m => {
        if (filtroLocal !== 'Todos' && m.local !== filtroLocal) return false;
        if (!puedeVerLocal(m.local)) return false;

        const fechaMerma = m.fecha?.split('T')[0];
        if (!fechaMerma) return false;

        if (filtroTiempo === 'todos') return true;
        if (filtroTiempo === 'ayer') return fechaMerma === ayerStr;
        if (filtroTiempo === 'mes') return fechaMerma.substring(0, 7) === mesActual;
        if (filtroTiempo === 'personalizado') return fechaMerma === AppState.filtros?.fechaPersonalizada;
        return true;
    });

    mermasFiltradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const totalMermas = mermasFiltradas.reduce((sum, m) => sum + (m.costoTotal || 0), 0);

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
        <div class="merma-hero">
            <div class="merma-hero-left">
                <div class="merma-hero-icon">
                    <i class="fas fa-trash-alt"></i>
                </div>
                <div>
                    <h2 class="merma-hero-title">Control de Mermas</h2>
                    <p class="merma-hero-subtitle">Registro, seguimiento y análisis de pérdidas por producto y familia</p>
                </div>
            </div>

            <div class="merma-hero-actions">
                <button class="btn btn-outline" onclick="window.mostrarModalImportarProductos()">
                    <i class="fas fa-file-import"></i> Importar Productos
                </button>
                <button class="btn btn-outline" onclick="window.mostrarModalCatalogo()">
                    <i class="fas fa-boxes"></i> Gestionar Productos
                </button>
                <button class="btn btn-primary" onclick="mostrarModalMerma()">
                    <i class="fas fa-plus"></i> Registrar Merma
                </button>
            </div>
        </div>

        <div class="merma-summary-bar">
            <span class="merma-chip">
                <i class="fas fa-store"></i> ${filtroLocal}
            </span>
            <span class="merma-chip">
                <i class="fas fa-filter"></i> ${filtroTiempo}
            </span>
            <span class="merma-summary-total">Total: ₡${totalMermas.toLocaleString()}</span>
        </div>

        <div class="merma-stats-grid">
            <div class="merma-stat-card merma-stat-red">
                <div class="stat-row">
                    <div class="stat-icon"><i class="fas fa-trash-alt"></i></div>
                    <div>
                        <div class="stat-label">TOTAL MERMAS</div>
                        <div class="stat-value">₡${totalMermas.toLocaleString()}</div>
                        <div class="stat-subtext">${mermasFiltradas.length} registros</div>
                    </div>
                </div>
            </div>

            <div class="merma-stat-card merma-stat-blue">
                <div class="stat-row">
                    <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                    <div>
                        <div class="stat-label">PROMEDIO X REGISTRO</div>
                        <div class="stat-value">₡${mermasFiltradas.length ? Math.round(totalMermas / mermasFiltradas.length).toLocaleString() : '0'}</div>
                    </div>
                </div>
            </div>

            <div class="merma-stat-card merma-stat-orange">
                <div class="stat-row">
                    <div class="stat-icon"><i class="fas fa-tag"></i></div>
                    <div>
                        <div class="stat-label">MAYOR MERMA POR FAMILIA</div>
                        <div class="stat-family-name">${familiasOrdenadas[0]?.[0] || 'Sin datos'}</div>
                        <div class="stat-family-value">₡${familiasOrdenadas[0]?.[1].costo.toLocaleString() || '0'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (familiasOrdenadas.length > 0) {
        const maxCosto = Math.max(...familiasOrdenadas.map(([, data]) => data.costo));
        html += `
            <div class="merma-top-card">
                <h3><i class="fas fa-chart-bar"></i> Top 5 Familias con mayor merma</h3>
        `;

        familiasOrdenadas.forEach(([familia, data]) => {
            const porcentaje = maxCosto > 0 ? (data.costo / maxCosto) * 100 : 0;
            html += `
                <div class="merma-bar-item">
                    <div class="merma-bar-head">
                        <span><strong>${familia}</strong> (${data.count} registros)</span>
                        <span class="merma-bar-value">₡${data.costo.toLocaleString()}</span>
                    </div>
                    <div class="merma-bar-track">
                        <div class="merma-bar-fill" style="width:${porcentaje}%"></div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    }

    if (mermasFiltradas.length === 0) {
        html += `
            <div class="merma-empty-card">
                <i class="fas fa-trash-alt"></i>
                <h3>No hay registros de merma</h3>
                <p>Haga clic en "Registrar Merma" para agregar uno.</p>
            </div>
        `;
    } else {
        html += `
            <div class="merma-table-card">
                <h3><i class="fas fa-list"></i> Registros de Merma</h3>
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
                    <td class="merma-products-list"><small>${productosLista}</small></td>
                    <td>${cantidadTotal.toFixed(2)}</td>
                    <td><span class="merma-badge-cost">₡${(m.costoTotal || 0).toLocaleString()}</span></td>
                    <td>${m.motivo || '—'}</td>
                    <td>
                        ${esGerencia() ? `
                            <button class="btn btn-sm btn-danger" onclick="window.eliminarMerma('${m.id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
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
        resultadosDiv.innerHTML = `<div style="padding: 18px; text-align: center; color:#64748b;">No se encontraron productos</div>`;
        resultadosDiv.style.display = 'block';
        return;
    }

    let html = '';
    resultados.forEach(p => {
        const precioPorUnidad = p.precio / (p.presentacion || 1);
        html += `
            <div onclick="window.seleccionarProducto('${p.id}')" style="padding: 14px 16px; border-bottom: 1px solid #eef2f7; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <div style="display:flex; justify-content:space-between; gap: 10px;">
                    <div>
                        <div style="font-weight:700; color:#1e293b;">${p.nombre}</div>
                        <div style="font-size: 0.82rem; color: #64748b; margin-top: 3px;">${p.familia} · ${p.presentacion} ${p.unidad}</div>
                    </div>
                    <div style="text-align:right; white-space:nowrap;">
                        <div style="font-weight:700; color:#0f172a;">₡${p.precio.toLocaleString()}</div>
                        <div style="font-size: 0.82rem; color: #64748b;">₡${precioPorUnidad.toFixed(2)} / ${p.unidad}</div>
                    </div>
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
            <div style="text-align: center; padding: 28px; color: #64748b; background: linear-gradient(180deg, #ffffff, #f8fafc);">
                <div style="width: 62px; height: 62px; margin: 0 auto 12px; border-radius: 18px; background: #fef2f2; display:flex; align-items:center; justify-content:center;">
                    <i class="fas fa-shopping-basket" style="font-size: 1.6rem; color: #ef4444;"></i>
                </div>
                <div style="font-weight: 700; color:#334155; margin-bottom: 4px;">No hay productos agregados</div>
                <p style="margin:0; font-size:0.9rem;">Busque un producto y agréguelo al carrito para registrar la merma.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f8fafc;">
                <tr>
                    <th style="padding: 12px 14px; text-align: left; font-size: 0.82rem; color:#64748b;">Producto</th>
                    <th style="padding: 12px 14px; text-align: center; font-size: 0.82rem; color:#64748b;">Cantidad</th>
                    <th style="padding: 12px 14px; text-align: right; font-size: 0.82rem; color:#64748b;">Costo Unit.</th>
                    <th style="padding: 12px 14px; text-align: right; font-size: 0.82rem; color:#64748b;">Subtotal</th>
                    <th style="padding: 12px 14px; text-align: center; font-size: 0.82rem; color:#64748b;">Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    carritoMerma.forEach((item, idx) => {
        html += `
            <tr style="border-top: 1px solid #eef2f7; transition: background 0.2s ease;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='white'">
                <td style="padding: 14px;">
                    <div style="font-weight: 700; color:#1e293b;">${item.nombre}</div>
                    <div style="font-size: 0.82rem; color: #64748b; margin-top: 2px;">${item.familia} · ${item.unidad}</div>
                </td>
                <td style="padding: 14px; text-align: center; font-weight:600;">${item.cantidad.toFixed(2)}</td>
                <td style="padding: 14px; text-align: right; color:#475569;">₡${item.costoUnitario.toFixed(2)}</td>
                <td style="padding: 14px; text-align: right;">
                    <span style="background:#fef2f2; color:#b91c1c; padding:6px 10px; border-radius:999px; font-weight:700; font-size:0.88rem;">
                        ₡${item.costoTotal.toFixed(2)}
                    </span>
                </td>
                <td style="padding: 14px; text-align: center;">
                    <button type="button" onclick="window.eliminarProductoCarrito(${idx})" style="background: #fef2f2; border: none; color: #ef4444; cursor: pointer; width: 36px; height: 36px; border-radius: 10px;">
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

    const totalFooter = document.getElementById('mermaCostoTotalFooter');
    if (totalFooter) {
        totalFooter.textContent = `₡${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

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
        <div style="max-height: 55vh; overflow-y: auto; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: white;">
            <table class="table">
                <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 2;">
                    <tr>
                        <th>Familia</th>
                        <th>Producto</th>
                        <th>Presentación</th>
                        <th>Unidad</th>
                        <th>Precio</th>
                        <th>Precio Unitario</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    productos.forEach(p => {
        const precioUnitario = p.presentacion ? (p.precio / p.presentacion) : p.precio;
        html += `
            <tr>
                <td>${p.familia || '—'}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.presentacion || 1}</td>
                <td>${p.unidad || 'UD'}</td>
                <td>₡${(p.precio || 0).toLocaleString()}</td>
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
    const catalogoModal = document.getElementById('catalogoModal');

    if (!modal || !overlay) return;

    // Ocultar catálogo mientras se edita el producto
    if (catalogoModal) {
        catalogoModal.classList.remove('active');
        catalogoModal.style.display = 'none';
    }

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
    modal.style.display = 'block';
    overlay.classList.add('active');
}

async function guardarProducto() {
    const familia = document.getElementById('productoFamilia').value;
    const nombre = document.getElementById('productoNombre').value;
    const presentacion = parseFloat(document.getElementById('productoPresentacion').value) || 1;
    const unidad = document.getElementById('productoUnidad').value;
    const precioTexto = (document.getElementById('productoPrecio').value || '').replace(',', '.');
    const precio = parseFloat(precioTexto) || 0;
    
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
        mostrarModalCatalogo();
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

function filtrarCatalogo() {
    const texto = (document.getElementById('buscarProductoCatalogo')?.value || '').toLowerCase().trim();
    const contenedor = document.getElementById('catalogoProductos');
    if (!contenedor) return;

    let lista = [...productos];

    if (texto) {
        lista = lista.filter(p =>
            (p.nombre || '').toLowerCase().includes(texto) ||
            (p.familia || '').toLowerCase().includes(texto) ||
            (p.unidad || '').toLowerCase().includes(texto)
        );
    }

    if (lista.length === 0) {
        contenedor.innerHTML = `<div style="text-align:center; padding:40px;">No se encontraron productos</div>`;
        return;
    }

    let html = `
        <div style="max-height: 55vh; overflow-y: auto; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: white;">
            <table class="table">
                <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 2;">
                    <tr>
                        <th>Familia</th>
                        <th>Producto</th>
                        <th>Presentación</th>
                        <th>Unidad</th>
                        <th>Precio</th>
                        <th>Precio Unitario</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    lista.forEach(p => {
        const precioUnitario = p.presentacion ? (p.precio / p.presentacion) : p.precio;
        html += `
            <tr>
                <td>${p.familia || '—'}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.presentacion || 1}</td>
                <td>${p.unidad || 'UD'}</td>
                <td>₡${(p.precio || 0).toLocaleString()}</td>
                <td>₡${precioUnitario.toFixed(2)} / ${p.unidad || 'UD'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="window.mostrarModalProducto('${p.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.eliminarProducto('${p.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
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
window.filtrarCatalogo = filtrarCatalogo;

console.log('✅ merma.js cargado - Versión con múltiples productos');