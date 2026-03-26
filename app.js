// ===== ESTADO GLOBAL =====
const AppState = {
    usuario: null,
    locales: [
        { id: 1, nombre: 'Parrillita Alajuela' },
        { id: 2, nombre: 'Los Años Locos Heredia' },
        { id: 3, nombre: 'Los Años Locos San Joaquin' },
        { id: 4, nombre: 'Parrillita Empanadazo' },
        { id: 5, nombre: 'Parrillita Garita' },
        { id: 6, nombre: 'Parrillita Pirro' },
        { id: 7, nombre: 'Parrillita Sabana' },
        { id: 8, nombre: 'Parrillita San Joaquin' },
        { id: 9, nombre: 'Parrillita San Pedro' }
    ],
    data: { ventas: [], costos: [] },
    filtros: { 
        local: 'Todos', 
        tiempo: 'todos',
        fechaPersonalizada: new Date().toISOString().split('T')[0]
    }
};

// ===== FUNCIONES DE PERMISOS =====
function esGerencia() {
    return AppState.usuario?.rol === 'gerencia';
}

function esUsuario() {
    return AppState.usuario?.rol === 'usuario';
}

function getLocalesPermitidos() {
    if (!AppState.usuario) return [];
    
    // Gerencia puede ver todos los locales
    if (esGerencia()) {
        return AppState.locales.map(l => l.nombre);
    }
    
    // Usuario solo ve su local asignado
    if (esUsuario() && AppState.usuario?.local) {
        return [AppState.usuario.local];
    }
    
    return [];
}

function puedeVerLocal(local) {
    const localesPermitidos = getLocalesPermitidos();
    return localesPermitidos.includes(local) || localesPermitidos.includes('Todos');
}

// Hacerlas globales
window.esGerencia = esGerencia;
window.esUsuario = esUsuario;
window.getLocalesPermitidos = getLocalesPermitidos;
window.puedeVerLocal = puedeVerLocal;

// ===== SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuIcon = document.querySelector('#menuToggle i');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !menuIcon) return;
    
    sidebar.classList.toggle('hidden');
    menuIcon.className = sidebar.classList.contains('hidden') ? 'fas fa-bars' : 'fas fa-times';
    
    if (mainContent) {
        mainContent.style.marginLeft = sidebar.classList.contains('hidden') ? '0' : 'var(--sidebar-width)';
    }
    
    if (window.innerWidth <= 768) {
        document.body.style.overflow = sidebar.classList.contains('hidden') ? '' : 'hidden';
    }
    
    localStorage.setItem('sidebarHidden', sidebar.classList.contains('hidden'));
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuIcon = document.querySelector('#menuToggle i');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !menuIcon || !mainContent) return;
    
    const hidden = localStorage.getItem('sidebarHidden') === 'true';
    sidebar.classList.toggle('hidden', hidden);
    menuIcon.className = hidden ? 'fas fa-bars' : 'fas fa-times';
    mainContent.style.marginLeft = hidden ? '0' : 'var(--sidebar-width)';
}

window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) return;
    
    if (window.innerWidth > 768) {
        const hidden = localStorage.getItem('sidebarHidden') === 'true';
        mainContent.style.marginLeft = hidden ? '0' : 'var(--sidebar-width)';
        document.body.style.overflow = '';
    } else {
        mainContent.style.marginLeft = '0';
    }
});

document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    
    if (window.innerWidth <= 768 && sidebar && !sidebar.classList.contains('hidden') && 
        !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
        toggleSidebar();
    }
});

// ===== NAVEGACIÓN =====
function cambiarModulo(moduleId) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector(`[data-module="${moduleId}"]`);
    if (navItem) navItem.classList.add('active');
    
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const module = document.getElementById(moduleId);
    if (module) module.classList.add('active');
    
    setTimeout(() => {
        if (moduleId === 'dashboard' && window.renderDashboard) window.renderDashboard();
        else if (moduleId === 'ventas' && window.renderVentas) window.renderVentas();
        else if (moduleId === 'costos' && window.renderCostos) window.renderCostos();
        else if (moduleId === 'usuarios' && window.renderUsuarios) window.renderUsuarios();
        else if (moduleId === 'planilla' && window.renderPlanilla) window.renderPlanilla();
        else if (moduleId === 'servicios' && window.renderServicios) window.renderServicios();
        else if (moduleId === 'merma' && window.renderMerma) window.renderMerma();
        else if (moduleId === 'logistica' && window.renderLogistica) window.renderLogistica();
        else if (moduleId === 'facturacion' && window.renderFacturacion) window.renderFacturacion();
        else if (moduleId === 'prestamo' && window.renderPrestamo) window.renderPrestamo();
        else if (moduleId === 'compras' && window.renderCompras) window.renderCompras();
        else if (moduleId === 'resumen' && window.renderResumen) window.renderResumen();
    }, 100);
}

// ===== FUNCIONES DE UTILIDAD =====
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
                <div class="loading-spinner"></div>
                <span style="margin-left: 10px; color: var(--gray-600);">Cargando...</span>
            </div>
        `;
    }
}

function showNoData(containerId, message = 'No hay datos para mostrar') {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = `<div class="no-data-message">${message}</div>`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 }).format(amount || 0);
}

function formatPercentage(value) {
    return new Intl.NumberFormat('es-CR', { style: 'percent', minimumFractionDigits: 1 }).format((value || 0) / 100);
}

function getCurrentDate() {
    return new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ===== CARGAR LOCALES =====
function cargarLocalesEnFiltro() {
    console.log('🔍 cargarLocalesEnFiltro - Usuario:', AppState.usuario);
    console.log('🔍 esUsuario():', esUsuario());
    console.log('🔍 local del usuario:', AppState.usuario?.local);
    
    const filtroLocal = document.getElementById('filtroLocal');
    if (!filtroLocal) return;
    
    const valorActual = AppState.filtros?.local || 'Todos';
    const localesPermitidos = getLocalesPermitidos();
    
    console.log('🔍 localesPermitidos:', localesPermitidos);
    
    filtroLocal.innerHTML = '<option value="Todos">Todos los locales</option>';
    
    if (esUsuario() && AppState.usuario?.local) {
        console.log('✅ Usuario con local, asignando:', AppState.usuario.local);
        // CORRECCIÓN: Cambiar App por AppState
        filtroLocal.innerHTML = `<option value="${AppState.usuario.local}">${AppState.usuario.local}</option>`;
        filtroLocal.disabled = true;
        filtroLocal.value = AppState.usuario.local;
    } 
    else if (esGerencia()) {
        console.log('✅ Gerencia, cargando todos los locales');
        AppState.locales.forEach(local => {
            if (localesPermitidos.includes(local.nombre)) {
                const option = document.createElement('option');
                option.value = local.nombre;
                option.textContent = local.nombre;
                filtroLocal.appendChild(option);
            }
        });
        filtroLocal.disabled = false;
        filtroLocal.value = valorActual;
    }
    
    console.log('🔍 filtroLocal final - valor:', filtroLocal.value, 'opciones:', filtroLocal.innerHTML);
}

function cargarLocalesEnUsuarios() {
    const selectLocal = document.getElementById('usuarioLocal');
    if (!selectLocal) return;
    selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
    AppState.locales.forEach(local => {
        const option = document.createElement('option');
        option.value = local.nombre;
        option.textContent = local.nombre;
        selectLocal.appendChild(option);
    });
}

function cargarLocalesEnVentas() {
    const selectLocal = document.getElementById('ventaLocal');
    if (!selectLocal) return;
    selectLocal.innerHTML = '<option value="">Seleccionar local...</option>';
    AppState.locales.forEach(local => {
        const option = document.createElement('option');
        option.value = local.nombre;
        option.textContent = local.nombre;
        selectLocal.appendChild(option);
    });
}

// ===== FUNCIÓN PARA OBTENER NOMBRE DE MES =====
function getNombreMes(numero) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[numero - 1] || '';
}

// ===== FUNCIÓN PARA FORMATEAR FECHAS =====
function formatearFechaCR(fechaStr) {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
}

// ===== OBTENER RANGO DE FECHAS SEGÚN FILTRO =====
function obtenerRangoFechas() {
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    const hoy = new Date();
    let inicio = null;
    let fin = null;
    let nombre = '';
    
    // Ajustar zona horaria de Costa Rica
    const crDate = new Date(hoy.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
    
    switch(filtroTiempo) {
        case 'ayer':
            inicio = new Date(crDate);
            inicio.setDate(crDate.getDate() - 1);
            fin = new Date(inicio);
            nombre = `Ayer (${inicio.toLocaleDateString('es-CR')})`;
            break;
            
        case 'mes':
            inicio = new Date(crDate.getFullYear(), crDate.getMonth(), 1);
            fin = new Date(crDate.getFullYear(), crDate.getMonth() + 1, 0);
            nombre = `${getNombreMes(crDate.getMonth() + 1)} ${crDate.getFullYear()}`;
            break;
            
        case 'anio':
            inicio = new Date(crDate.getFullYear(), 0, 1);
            fin = new Date(crDate.getFullYear(), 11, 31);
            nombre = `Año ${crDate.getFullYear()}`;
            break;
            
        case 'rango':
            const fechaInicio = document.getElementById('filtroFechaInicio')?.value;
            const fechaFin = document.getElementById('filtroFechaFin')?.value;
            if (fechaInicio && fechaFin) {
                inicio = fechaInicio;
                fin = fechaFin;
                nombre = `${formatearFechaCR(fechaInicio)} → ${formatearFechaCR(fechaFin)}`;
            }
            break;
            
        case 'personalizado':
            const fechaPer = AppState.filtros?.fechaPersonalizada;
            if (fechaPer) {
                inicio = fechaPer;
                fin = fechaPer;
                nombre = formatearFechaCR(fechaPer);
            }
            break;
            
        default:
            inicio = null;
            fin = null;
            nombre = 'Todos los datos';
            break;
    }
    
    // Convertir a string YYYY-MM-DD
    const formatoFecha = (date) => {
        if (!date) return null;
        if (typeof date === 'string') return date;
        return date.toISOString().split('T')[0];
    };
    
    const rango = {
        inicio: formatoFecha(inicio),
        fin: formatoFecha(fin),
        nombre: nombre
    };
    
    console.log('📅 Rango calculado:', rango);
    return rango;
}

// ===== INICIALIZAR FILTROS CON SOPORTE PARA RANGO =====
function inicializarFiltros() {
    console.log('🎯 Inicializando filtros...');
    cargarLocalesEnFiltro();
    
    const filtroTiempo = document.getElementById('filtroTiempo');
    const grupoFechaPersonalizado = document.getElementById('grupoFechaPersonalizado');
    const grupoRangoFechas = document.getElementById('grupoRangoFechas');
    const filtroFechaInicio = document.getElementById('filtroFechaInicio');
    const filtroFechaFin = document.getElementById('filtroFechaFin');
    const filtroFecha = document.getElementById('filtroFechaPersonalizado');
    
    if (filtroTiempo) {
        filtroTiempo.value = 'todos';
        AppState.filtros.tiempo = 'todos';
        
        filtroTiempo.addEventListener('change', function(e) {
            const valor = e.target.value;
            AppState.filtros.tiempo = valor;
            
            // Ocultar todos los grupos adicionales
            if (grupoFechaPersonalizado) grupoFechaPersonalizado.style.display = 'none';
            if (grupoRangoFechas) grupoRangoFechas.style.display = 'none';
            
            // Mostrar el grupo correspondiente
            if (valor === 'personalizado') {
                grupoFechaPersonalizado.style.display = 'flex';
                if (!filtroFecha.value) {
                    const fechaActual = new Date();
                    const año = fechaActual.getFullYear();
                    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
                    const dia = String(fechaActual.getDate()).padStart(2, '0');
                    filtroFecha.value = `${año}-${mes}-${dia}`;
                    AppState.filtros.fechaPersonalizada = `${año}-${mes}-${dia}`;
                }
            } else if (valor === 'rango') {
                grupoRangoFechas.style.display = 'flex';
                // Establecer fechas por defecto (últimos 30 días)
                if (!filtroFechaInicio.value || !filtroFechaFin.value) {
                    const hoy = new Date();
                    const hace30Dias = new Date(hoy);
                    hace30Dias.setDate(hoy.getDate() - 30);
                    filtroFechaInicio.value = hace30Dias.toISOString().split('T')[0];
                    filtroFechaFin.value = hoy.toISOString().split('T')[0];
                }
            }
            
            actualizarVistasPorFiltro();
        });
    }
    
    // Eventos para rango de fechas
    if (filtroFechaInicio) {
        filtroFechaInicio.addEventListener('change', () => {
            if (filtroFechaFin?.value) {
                actualizarVistasPorFiltro();
            }
        });
    }
    if (filtroFechaFin) {
        filtroFechaFin.addEventListener('change', () => {
            if (filtroFechaInicio?.value) {
                actualizarVistasPorFiltro();
            }
        });
    }
    
    // Evento para fecha personalizada
    if (filtroFecha) {
        filtroFecha.addEventListener('change', (e) => {
            AppState.filtros.fechaPersonalizada = e.target.value;
            actualizarVistasPorFiltro();
        });
    }
    
    // Inicializar rango
    const rango = obtenerRangoFechas();
    AppState.filtros.rango = rango;
    console.log('✅ Filtros inicializados, rango:', rango);
}

// ===== ACTUALIZAR VISTAS SEGÚN FILTROS =====
function actualizarVistasPorFiltro() {
    const moduloActivo = document.querySelector('.module.active')?.id;
    
    // Calcular y guardar rango actualizado
    const rango = obtenerRangoFechas();
    AppState.filtros.rango = rango;
    
    console.log('🔄 Actualizando vista:', moduloActivo);
    console.log('   - Local:', AppState.filtros.local);
    console.log('   - Tiempo:', AppState.filtros.tiempo);
    console.log('   - Rango:', rango);
    
    if (moduloActivo === 'ventas' && window.renderVentas) {
        window.renderVentas();
    } else if (moduloActivo === 'dashboard' && window.renderDashboard) {
        window.renderDashboard();
    } else if (moduloActivo === 'costos' && window.renderCostos) {
        window.renderCostos();
    } else if (moduloActivo === 'usuarios' && window.renderUsuarios) {
        window.renderUsuarios();
    } else if (moduloActivo === 'planilla' && window.renderPlanilla) {
        window.renderPlanilla();
    } else if (moduloActivo === 'servicios' && window.renderServicios) {
        window.renderServicios();
    } else if (moduloActivo === 'merma' && window.renderMerma) {
        window.renderMerma();
    } else if (moduloActivo === 'logistica' && window.renderLogistica) {
        window.renderLogistica();
    } else if (moduloActivo === 'facturacion' && window.renderFacturacion) {
        window.renderFacturacion();
    } else if (moduloActivo === 'prestamo' && window.renderPrestamo) {
        window.renderPrestamo();
    } else if (moduloActivo === 'compras' && window.renderCompras) {
        window.renderCompras();
    } else if (moduloActivo === 'resumen' && window.renderResumen) {
        window.renderResumen();
    }
}  

// ============================================
// FILTRAR PRODUCTOS EN EL MODAL
// ============================================
function filtrarProductos() {
    const busqueda = document.getElementById('buscarProducto')?.value.toLowerCase() || '';
    const select = document.getElementById('mermaProducto');
    
    // Guardar el valor seleccionado actual
    const valorActual = select.value;
    
    // Recorrer todas las opciones
    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        const texto = option.text.toLowerCase();
        
        if (texto.includes(busqueda) || busqueda === '') {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    }
    
    // Restaurar selección si aún es visible
    if (valorActual) {
        const option = select.querySelector(`option[value="${valorActual}"]`);
        if (option && option.style.display !== 'none') {
            select.value = valorActual;
        } else {
            select.value = '';
        }
    }
}

function ajustarSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) { // Solo en móvil
        sidebar.style.minHeight = window.innerHeight + 'px';
    } else {
        sidebar.style.minHeight = ''; // Restablece en escritorio
    }
}

// Ejecutar al cargar y al cambiar tamaño de ventana
window.addEventListener('load', ajustarSidebarMobile);
window.addEventListener('resize', ajustarSidebarMobile);

// Event listener para filtro local
document.addEventListener('change', function(e) {
    if (e.target.id === 'filtroLocal') {
        AppState.filtros.local = e.target.value;
        actualizarVistasPorFiltro();
    }
});

// ===== CERRAR MODAL =====
function cerrarModal(id = null) {
    console.log('🔒 Cerrando modal:', id);
    
    const overlay = document.getElementById('modalOverlay');
    
    // Si se especifica un ID, cerrar ese modal específico
    if (id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none'; // Forzar ocultamiento
        }
    } else {
        // Si no se especifica, cerrar TODOS los modales
        const modales = document.querySelectorAll('.modal');
        modales.forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none'; // Forzar ocultamiento
        });
    }
    
    // Cerrar overlay si no hay modales activos
    if (overlay) {
        const modalesActivos = document.querySelectorAll('.modal.active');
        if (modalesActivos.length === 0) {
            overlay.classList.remove('active');
            overlay.style.display = 'none'; // Forzar ocultamiento
        }
    }
}

// Hacer funciones globales
window.esGerencia = esGerencia;
window.getLocalesPermitidos = getLocalesPermitidos;
window.puedeVerLocal = puedeVerLocal;
window.cargarLocalesEnFiltro = cargarLocalesEnFiltro;
window.cargarLocalesEnVentas = cargarLocalesEnVentas;
window.cargarLocalesEnUsuarios = cargarLocalesEnUsuarios;
window.showLoading = showLoading;
window.showNoData = showNoData;
window.formatCurrency = formatCurrency;
window.formatPercentage = formatPercentage;
window.getCurrentDate = getCurrentDate;
window.cerrarModal = cerrarModal;
window.toggleSidebar = toggleSidebar;
window.cambiarModulo = cambiarModulo;
window.inicializarFiltros = inicializarFiltros;

// Referencias a funciones de módulos
window.renderDashboard = null;
window.renderVentas = null;
window.renderCostos = null;
window.renderUsuarios = null;
window.renderServicios = null;
window.renderPlanilla = null;
window.renderMerma = null;
window.renderLogistica = null;
window.renderFacturacion = null;
window.renderPrestamo = null;
window.renderCompras = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSidebar, 100);
    
    // NO mostrar la app hasta que haya usuario
    document.querySelector('.main-content').style.display = 'none';
    document.querySelector('.sidebar').style.display = 'none';
    
    const checkUser = setInterval(() => {
        if (AppState.usuario) {
            clearInterval(checkUser);
            document.querySelector('.main-content').style.display = 'block';
            document.querySelector('.sidebar').style.display = 'flex';
            initSidebar();
            if (typeof inicializarFiltros === 'function') {
                inicializarFiltros();
            }
        }
    }, 100);
});