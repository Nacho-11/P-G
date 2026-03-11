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
        tiempo: 'todos',  // ← VALOR POR DEFECTO CORRECTO
        fechaPersonalizada: new Date().toISOString().split('T')[0]
    }
};

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
    const filtroLocal = document.getElementById('filtroLocal');
    if (!filtroLocal) return;
    
    const valorActual = AppState.filtros?.local || 'Todos';
    filtroLocal.innerHTML = '<option value="Todos">Todos los locales</option>';
    
    let localesAMostrar = AppState.usuario?.rol === 'gerencia' ? AppState.locales :
                         (AppState.usuario?.rol === 'encargado' && AppState.usuario?.local) ? 
                         AppState.locales.filter(l => l.nombre === AppState.usuario.local) : AppState.locales;
    
    localesAMostrar.forEach(local => {
        const option = document.createElement('option');
        option.value = local.nombre;
        option.textContent = local.nombre;
        filtroLocal.appendChild(option);
    });
    
    filtroLocal.value = valorActual;
    filtroLocal.disabled = (AppState.usuario?.rol === 'encargado' && AppState.usuario?.local);
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

// ===== INICIALIZAR FILTROS (VERSIÓN CORREGIDA) =====
function inicializarFiltros() {
    cargarLocalesEnFiltro();
    
    const filtroTiempo = document.getElementById('filtroTiempo');
    const grupoFecha = document.getElementById('grupoFechaPersonalizado');
    const filtroFecha = document.getElementById('filtroFechaPersonalizado');
    
    // Establecer valor por defecto en el select
    if (filtroTiempo) {
        filtroTiempo.value = 'todos';  // "Todo" por defecto
        
        filtroTiempo.addEventListener('change', function(e) {
            AppState.filtros.tiempo = e.target.value;
            
            if (e.target.value === 'personalizado') {
                grupoFecha.style.display = 'flex';
                if (!filtroFecha.value) {
                    const fechaActual = new Date();
                    const año = fechaActual.getFullYear();
                    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
                    const dia = String(fechaActual.getDate()).padStart(2, '0');
                    filtroFecha.value = `${año}-${mes}-${dia}`;
                    AppState.filtros.fechaPersonalizada = `${año}-${mes}-${dia}`;
                }
            } else {
                grupoFecha.style.display = 'none';
            }
            actualizarVistasPorFiltro();
        });
    }
    
    if (filtroFecha) {
        filtroFecha.addEventListener('change', function(e) {
            AppState.filtros.fechaPersonalizada = e.target.value;
            actualizarVistasPorFiltro();
        });
    }
    
    // Inicializar con fecha actual
    const fechaActual = new Date();
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    AppState.filtros.fechaPersonalizada = `${año}-${mes}-${dia}`;
}

// ===== ACTUALIZAR VISTAS SEGÚN FILTROS =====
function actualizarVistasPorFiltro() {
    const moduloActivo = document.querySelector('.module.active')?.id;
    if (moduloActivo === 'ventas' && window.renderVentas) {
        window.renderVentas();
    } else if (moduloActivo === 'dashboard' && window.renderDashboard) {
        window.renderDashboard();
    } else if (moduloActivo === 'costos' && window.renderCostos) {
        window.renderCostos();
    }
}

// Event listener para filtro local
document.addEventListener('change', function(e) {
    if (e.target.id === 'filtroLocal') {
        AppState.filtros.local = e.target.value;
        actualizarVistasPorFiltro();
    }
});

// ===== CERRAR MODAL =====
function cerrarModal(id) {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
    if (id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }
}

// Hacer funciones globales
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

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSidebar, 100);
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