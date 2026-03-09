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
    filtros: { local: 'Todos', tiempo: 'todos', mes: new Date().toISOString().slice(0,7) }
};

// ===== SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuIcon = document.querySelector('#menuToggle i');
    const mainContent = document.querySelector('.main-content');
    
    sidebar.classList.toggle('hidden');
    
    // Cambiar ícono
    if (menuIcon) {
        menuIcon.className = sidebar.classList.contains('hidden') ? 'fas fa-bars' : 'fas fa-times';
    }
    
    // Ajustar margen del contenido principal
    if (mainContent) {
        mainContent.style.marginLeft = sidebar.classList.contains('hidden') ? '0' : 'var(--sidebar-width)';
    }
    
    // Guardar estado
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

// ===== NAVEGACIÓN =====
function cambiarModulo(moduleId) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-module="${moduleId}"]`).classList.add('active');
    
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById(moduleId).classList.add('active');
    
    if (moduleId === 'dashboard' && window.renderDashboard) window.renderDashboard();
    if (moduleId === 'ventas' && window.renderVentas) window.renderVentas();
    if (moduleId === 'costos' && window.renderCostos) window.renderCostos();
    if (moduleId === 'usuarios' && window.renderUsuarios) window.renderUsuarios();
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar sidebar inmediatamente
    setTimeout(() => {
        initSidebar();
    }, 100);
    
    // Verificar usuario cada segundo
    const checkUser = setInterval(() => {
        if (AppState.usuario) {
            clearInterval(checkUser);
            document.querySelector('.main-content').style.display = 'block';
            document.querySelector('.sidebar').style.display = 'flex';
            initSidebar();
        }
    }, 100);
});

// Funciones globales
window.cerrarModal = (id) => {
    document.getElementById('modalOverlay').classList.remove('active');
    if (id) document.getElementById(id).classList.remove('active');
};
window.toggleSidebar = toggleSidebar;
window.cambiarModulo = cambiarModulo;