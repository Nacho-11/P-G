// firebase-db.js
import { 
    database, 
    ref, 
    set, 
    push, 
    onValue, 
    remove, 
    update,
    get,
    child
} from './firebase-config.js';

const FirebaseDB = {
    // ============================================
    // INICIALIZAR DATOS POR DEFECTO
    // ============================================
    async init() {
        const localesRef = ref(database, 'locales');
        const snapshot = await get(localesRef);
        
        if (!snapshot.exists()) {
            // Crear locales por defecto
            const locales = [
                { id: 'alajuela', nombre: 'Parrillita Alajuela', activo: true },
                { id: 'heredia', nombre: 'Los Años Locos Heredia', activo: true },
                { id: 'sj', nombre: 'Los Años Locos San Joaquin', activo: true },
                { id: 'empanadazo', nombre: 'Parrillita Empanadazo', activo: true },
                { id: 'garita', nombre: 'Parrillita Garita', activo: true },
                { id: 'pirro', nombre: 'Parrillita Pirro', activo: true },
                { id: 'sabana', nombre: 'Parrillita Sabana', activo: true },
                { id: 'sanjoaquin', nombre: 'Parrillita San Joaquin', activo: true }
            ];
            
            for (const local of locales) {
                await set(ref(database, `locales/${local.id}`), local);
            }
        }
        
        console.log('✅ Firebase inicializado');
    },
    
    // ============================================
    // LOCALES
    // ============================================
    async obtenerLocales() {
        const snapshot = await get(ref(database, 'locales'));
        if (snapshot.exists()) {
            return Object.values(snapshot.val());
        }
        return [];
    },
    
    // ============================================
    // VENTAS
    // ============================================
    async agregarVenta(venta) {
        const newVentaRef = push(ref(database, 'ventas'));
        const ventaConId = {
            ...venta,
            id: newVentaRef.key,
            createdAt: new Date().toISOString()
        };
        await set(newVentaRef, ventaConId);
        return ventaConId;
    },
    
    async obtenerVentas(filtros = {}) {
        const snapshot = await get(ref(database, 'ventas'));
        if (!snapshot.exists()) return [];
        
        let ventas = Object.values(snapshot.val());
        
        // Aplicar filtros
        if (filtros.local && filtros.local !== 'Todos') {
            ventas = ventas.filter(v => v.local === filtros.local);
        }
        
        if (filtros.fechaInicio) {
            ventas = ventas.filter(v => v.fecha >= filtros.fechaInicio);
        }
        
        if (filtros.fechaFin) {
            ventas = ventas.filter(v => v.fecha <= filtros.fechaFin);
        }
        
        // Ordenar por fecha descendente
        return ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },
    
    async eliminarVenta(id) {
        await remove(ref(database, `ventas/${id}`));
        return true;
    },
    
    async actualizarVenta(id, datos) {
        const ventaRef = ref(database, `ventas/${id}`);
        await update(ventaRef, {
            ...datos,
            updatedAt: new Date().toISOString()
        });
        return true;
    },
    
    // ============================================
    // COSTOS FIJOS
    // ============================================
    async agregarCosto(costo) {
        const newCostoRef = push(ref(database, 'costosFijos'));
        const costoConId = {
            ...costo,
            id: newCostoRef.key,
            createdAt: new Date().toISOString()
        };
        await set(newCostoRef, costoConId);
        return costoConId;
    },
    
    async obtenerCostos(filtros = {}) {
        const snapshot = await get(ref(database, 'costosFijos'));
        if (!snapshot.exists()) return [];
        
        let costos = Object.values(snapshot.val());
        
        if (filtros.categoria) {
            costos = costos.filter(c => c.categoria === filtros.categoria);
        }
        
        if (filtros.local && filtros.local !== 'Todos') {
            costos = costos.filter(c => c.local === filtros.local);
        }
        
        return costos;
    },
    
    async eliminarCosto(id) {
        await remove(ref(database, `costosFijos/${id}`));
        return true;
    },
    
    // ============================================
    // CALCULAR TOTALES
    // ============================================
    async calcularTotalesVentas(ventas) {
        return ventas.reduce((acc, v) => {
            acc.brutas += v.ventasBrutas || v.total || 0;
            acc.comisiones += v.comisiones?.total || 0;
            acc.netas += v.total || 0;
            return acc;
        }, { brutas: 0, comisiones: 0, netas: 0 });
    },
    
    // ============================================
    // AUTENTICACIÓN (para después)
    // ============================================
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async logout() {
        await signOut(auth);
    }
};

// Hacer disponible globalmente
window.DB = FirebaseDB;

export default FirebaseDB;