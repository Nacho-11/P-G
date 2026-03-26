// modules/resumen.js - VERSIÓN CON ARRENDAMIENTO EN ESTILO NORMAL

console.log('📊 Cargando módulo de Resumen Financiero...');

// ============================================
// FUNCIONES AUXILIARES DE FECHAS
// ============================================

function parseFechaDDMMYYYY(fechaStr) {
    if (!fechaStr) return null;
    if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = fechaStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    if (fechaStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = fechaStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    const date = new Date(fechaStr);
    if (!isNaN(date.getTime())) return date;
    console.error('❌ No se pudo parsear la fecha:', fechaStr);
    return new Date();
}

function formatFechaYYYYMMDD(fecha) {
    if (!fecha || isNaN(fecha.getTime())) return '';
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatearMesAnio(fecha) {
    if (!fecha || isNaN(fecha.getTime())) return 'Mes Desconocido';
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function getDiasDelMes(fecha) {
    if (!fecha || isNaN(fecha.getTime())) return 30;
    const year = fecha.getFullYear();
    const month = fecha.getMonth();
    return new Date(year, month + 1, 0).getDate();
}

function getPrimerDiaDelMes(fecha) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function obtenerTextoPeriodo(filtro, fechaPersonalizada) {
    switch(filtro) {
        case 'todos': return 'Todo el historial';
        case 'ayer': {
            const ayer = new Date();
            ayer.setDate(ayer.getDate() - 1);
            return `Ayer (${ayer.toLocaleDateString('es-CR')})`;
        }
        case 'mes': {
            const fechaBase = getFechaBasePorFiltro('mes', fechaPersonalizada);
            return formatearMesAnio(fechaBase);
        }
        case 'anio': return `Año ${new Date().getFullYear()}`;
        case 'personalizado':
            if (!fechaPersonalizada) return 'Fecha específica';
            const fecha = parseFechaDDMMYYYY(fechaPersonalizada);
            return fecha.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
        default: return 'Todo el historial';
    }
}

function filtrarPorFecha(item, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) {
    if (!item.fecha) return false;
    let fechaItem = item.fecha;
    if (fechaItem.includes('T')) fechaItem = fechaItem.split('T')[0];
    
    if (filtroTiempo === 'todos') return true;
    if (filtroTiempo === 'ayer') return fechaItem === ayerStr;
    if (filtroTiempo === 'mes') return fechaItem.substring(0, 7) === mesActual;
    if (filtroTiempo === 'anio') return fechaItem.substring(0, 4) === anioActual;
    if (filtroTiempo === 'personalizado') {
        const fechaComp = parseFechaDDMMYYYY(fechaPersonalizada);
        const fechaCompStr = formatFechaYYYYMMDD(fechaComp);
        return fechaItem === fechaCompStr;
    }
    return true;
}

function filtrarPorLocal(item, filtroLocal) {
    if (!item.local) return false;
    if (filtroLocal === 'Todos') return true;
    return item.local === filtroLocal;
}

function getFechaBasePorFiltro(filtroTiempo, fechaPersonalizada) {
    if (filtroTiempo === 'mes') {
        if (fechaPersonalizada) return parseFechaDDMMYYYY(fechaPersonalizada);
        return new Date();
    } else if (filtroTiempo === 'personalizado' && fechaPersonalizada) {
        return parseFechaDDMMYYYY(fechaPersonalizada);
    } else if (filtroTiempo === 'ayer') {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        return ayer;
    } else {
        return new Date();
    }
}

// ============================================
// CÁLCULOS DE PLANILLA Y GASTOS
// ============================================

function calcularPlanilla(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) {
    let totalPlanilla = 0;
    let diasContados = new Set();
    const PORCENTAJES = { ordinarias: 1.0, extras: 1.5, nocturnas: 1.2, extrasNocturnas: 1.8 };
    
    Object.keys(planillaData).forEach(local => {
        if (filtroLocal !== 'Todos' && local !== filtroLocal) return;
        if (typeof puedeVerLocal === 'function' && !puedeVerLocal(local)) return;
        
        const empleados = planillaData[local] || [];
        empleados.forEach(emp => {
            if (!emp.horas || emp.activo === false) return;
            const salarioMensual = emp.salario || 0;
            const salarioHora = salarioMensual / 240;
            const horasJornada = 8;
            
            Object.keys(emp.horas).forEach(fechaStr => {
                const fecha = fechaStr.split('T')[0];
                if (filtroTiempo === 'todos') {
                    if (!diasContados.has(`${emp.id}-${local}`)) {
                        diasContados.add(`${emp.id}-${local}`);
                        totalPlanilla += salarioMensual;
                    }
                    return;
                }
                if (filtroTiempo === 'ayer' && fecha !== ayerStr) return;
                if (filtroTiempo === 'mes' && fecha.substring(0, 7) !== mesActual) return;
                if (filtroTiempo === 'anio' && fecha.substring(0, 4) !== anioActual) return;
                if (filtroTiempo === 'personalizado') {
                    const fechaComp = parseFechaDDMMYYYY(fechaPersonalizada);
                    const fechaCompStr = formatFechaYYYYMMDD(fechaComp);
                    if (fecha !== fechaCompStr) return;
                }
                
                const horas = emp.horas[fechaStr];
                const horasNormales = Math.min(horas.ordinarias || 0, horasJornada);
                const horasExtras = (horas.ordinarias || 0) - horasNormales;
                let pagoDia = horasNormales * salarioHora;
                pagoDia += (horasExtras) * salarioHora * PORCENTAJES.extras;
                pagoDia += (horas.nocturnas || 0) * salarioHora * PORCENTAJES.nocturnas;
                pagoDia += (horas.extrasNocturnas || 0) * salarioHora * PORCENTAJES.extrasNocturnas;
                totalPlanilla += pagoDia;
            });
        });
    });
    return { salarioBase: totalPlanilla, horasExtras: 0, total: totalPlanilla };
}

function calcularCCSS(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) {
    const planilla = calcularPlanilla(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    return planilla.total * 0.265;
}

function calcularCesantia(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) {
    const planilla = calcularPlanilla(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    return planilla.total * 0.0533;
}

function calcularVacaciones(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) {
    const planilla = calcularPlanilla(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    return planilla.salarioBase * 0.0416;
}

function calcularAguinaldos(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) {
    const planilla = calcularPlanilla(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    return planilla.total * 0.0833;
}

function calcularPago10(ventasFiltradas) {
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    return totalVentas * 0.10;
}

function calcularComisionesDelivery(ventasFiltradas, plataforma) {
    const comisionMap = { uber: 0.25, pedidosYa: 0.25, didi: 0.25 };
    return ventasFiltradas.reduce((sum, v) => sum + ((v[plataforma] || 0) * comisionMap[plataforma]), 0);
}

function calcularComisionDatafonos(ventasFiltradas) {
    return ventasFiltradas.reduce((sum, v) => sum + ((v.bac || 0) * 0.0531), 0);
}

function calcularCostoMateriaPrima(comprasFiltradas) {
    return comprasFiltradas.reduce((sum, c) => sum + (c.monto || 0), 0);
}

function calcularFacturacionBodegas(facturasFiltradas) {
    return facturasFiltradas.reduce((sum, f) => sum + (f.monto || 0), 0);
}

function calcularMermas(mermasFiltradas) {
    return mermasFiltradas.reduce((sum, m) => sum + (m.costoTotal || 0), 0);
}

function calcularReembolsoDelivery(ventasFiltradas) {
    const totalDelivery = ventasFiltradas.reduce((sum, v) => sum + (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0), 0);
    return totalDelivery * 0.10;
}

function calcularPrestamos(prestamosFiltrados) {
    return prestamosFiltrados.reduce((sum, p) => sum + (p.totales?.totalPago || 0), 0);
}

function calcularServicios(serviciosData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) {
    let agua = 0, electricidad = 0, gas = 0, total = 0;
    Object.keys(serviciosData).forEach(local => {
        if (filtroLocal !== 'Todos' && local !== filtroLocal) return;
        if (typeof puedeVerLocal === 'function' && !puedeVerLocal(local)) return;
        (serviciosData[local] || []).forEach(s => {
            if (!filtrarPorFecha(s, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada)) return;
            total += s.monto || 0;
            if (s.servicio === 'Agua') agua += s.monto || 0;
            if (s.servicio === 'Electricidad') electricidad += s.monto || 0;
            if (s.servicio === 'Gas') gas += s.monto || 0;
        });
    });
    return { agua, electricidad, gas, total };
}

// ============================================
// COSTOS FIJOS - CON CÁLCULO DE DÍAS CORRECTO
// ============================================

function calcularCostosFijos(costosData, filtroLocal, filtroTiempo, fechaBase) {
    console.log('🔧 [calcularCostosFijos] INICIANDO CÁLCULO');
    console.log(`🔧 fechaBase recibida: ${fechaBase.toISOString()}`);
    
    const categorias = {
        alquilerLocal: 0, secsa: 0, softRestaurant: 0, internetKolbi: 0, televisionKolbi: 0,
        adt: 0, fumigacion: 0, polizaRT: 0, depreciacionActivos: 0, patenteComercial: 0,
        patenteLicores: 0, basuraMunicipal: 0, interesesMoraPatente: 0, certificacionGas: 0,
        certificacionElectrica: 0, renovacionMinisterioSalud: 0, mantenimiento: 0, haciendaIVA: 0,
        asesoriaLegalRH: 0, honorariosContabilidad: 0, publicidad: 0, otrosServiciosProfesionales: 0,
        electricidadPlanta: 0, aguaPlanta: 0, adtPlanta: 0, fumigacionPlanta: 0, softwareSecsaPlanta: 0,
        ivaHaciendaPlanta: 0, asesoriaLegalPlanta: 0, electricidadOficinas: 0, aguaOficinas: 0,
        internetOficinas: 0, telefonoCelulares: 0, adtOficinas: 0, mantenimientoPapeleria: 0,
        softwareHosting: 0, combustible: 0, electricidadBodegas: 0, aguaBodegas: 0, alquilerTaller: 0,
        gpsNavsat: 0, marchamos: 0, dekra: 0, mantenimientoVehiculos: 0, planillaBodega: 0,
        alexDuque: 0, polizaRTBodega: 0, ccssBodegaOficinas: 0, planillaOficinas: 0
    };
    
    const diasEnMes = getDiasDelMes(fechaBase);
    const mesSeleccionado = formatearMesAnio(fechaBase);
    let multiplicador = 1;
    let esVistaDiaria = false;
    
    if (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado') {
        multiplicador = 1 / diasEnMes;
        esVistaDiaria = true;
        console.log(`📅 Vista diaria - Mes: ${mesSeleccionado} (${diasEnMes} días), Multiplicador: 1/${diasEnMes}`);
    } else if (filtroTiempo === 'mes') {
        multiplicador = 1;
    } else if (filtroTiempo === 'anio' || filtroTiempo === 'todos') {
        multiplicador = 12;
    }
    
    if (!costosData || Object.keys(costosData).length === 0) return categorias;
    
    const idsProcesados = new Set();
    let alquilerMensual = 0;
    
    Object.keys(costosData).forEach(localKey => {
        const dataPorCategoria = costosData[localKey];
        Object.keys(dataPorCategoria).forEach(categoriaFirebase => {
            const costosArray = dataPorCategoria[categoriaFirebase];
            if (!Array.isArray(costosArray)) return;
            
            costosArray.forEach(costo => {
                if (costo.id && idsProcesados.has(costo.id)) return;
                if (costo.id) idsProcesados.add(costo.id);
                
                const localDelCosto = costo.local || localKey;
                if (filtroLocal !== 'Todos' && localDelCosto !== filtroLocal) return;
                if (typeof puedeVerLocal === 'function' && !puedeVerLocal(localDelCosto)) return;
                
                const concepto = (costo.concepto || '').toLowerCase().trim();
                const montoMensual = costo.monto || 0;
                const montoAplicable = montoMensual * multiplicador;
                if (montoMensual === 0) return;
                
                if (categoriaFirebase === 'restaurante') {
                    if (concepto.includes('alquiler')) { alquilerMensual = montoMensual; categorias.alquilerLocal += montoAplicable; }
                    else if (concepto.includes('secsa')) categorias.secsa += montoAplicable;
                    else if (concepto.includes('soft restaurant')) categorias.softRestaurant += montoAplicable;
                    else if (concepto.includes('internet')) categorias.internetKolbi += montoAplicable;
                    else if (concepto.includes('televisión') || concepto.includes('tv')) categorias.televisionKolbi += montoAplicable;
                    else if (concepto.includes('adt') || concepto.includes('alarma')) categorias.adt += montoAplicable;
                    else if (concepto.includes('fumigación')) categorias.fumigacion += montoAplicable;
                    else if (concepto.includes('póliza') || concepto.includes('rt')) categorias.polizaRT += montoAplicable;
                    else if (concepto.includes('depreciación')) categorias.depreciacionActivos += montoAplicable;
                    else if (concepto.includes('patente comercial')) categorias.patenteComercial += montoAplicable;
                    else if (concepto.includes('patente licores')) categorias.patenteLicores += montoAplicable;
                    else if (concepto.includes('basura')) categorias.basuraMunicipal += montoAplicable;
                    else if (concepto.includes('interés') || concepto.includes('mora')) categorias.interesesMoraPatente += montoAplicable;
                    else if (concepto.includes('certificación gas')) categorias.certificacionGas += montoAplicable;
                    else if (concepto.includes('certificación eléctrica')) categorias.certificacionElectrica += montoAplicable;
                    else if (concepto.includes('renovación') || concepto.includes('ministerio')) categorias.renovacionMinisterioSalud += montoAplicable;
                    else if (concepto.includes('mantenimiento')) categorias.mantenimiento += montoAplicable;
                    else if (concepto.includes('hacienda') || concepto.includes('iva')) categorias.haciendaIVA += montoAplicable;
                    else if (concepto.includes('asesoría legal')) categorias.asesoriaLegalRH += montoAplicable;
                    else if (concepto.includes('honorarios contabilidad')) categorias.honorariosContabilidad += montoAplicable;
                    else if (concepto.includes('publicidad')) categorias.publicidad += montoAplicable;
                    else if (concepto.includes('otros servicios')) categorias.otrosServiciosProfesionales += montoAplicable;
                }
                else if (categoriaFirebase === 'planta') {
                    if (concepto.includes('electricidad')) categorias.electricidadPlanta += montoAplicable;
                    else if (concepto.includes('agua')) categorias.aguaPlanta += montoAplicable;
                    else if (concepto.includes('adt')) categorias.adtPlanta += montoAplicable;
                    else if (concepto.includes('fumigación')) categorias.fumigacionPlanta += montoAplicable;
                    else if (concepto.includes('software secsa')) categorias.softwareSecsaPlanta += montoAplicable;
                    else if (concepto.includes('iva')) categorias.ivaHaciendaPlanta += montoAplicable;
                    else if (concepto.includes('asesoría legal')) categorias.asesoriaLegalPlanta += montoAplicable;
                }
                else if (categoriaFirebase === 'oficinas') {
                    if (concepto.includes('electricidad')) categorias.electricidadOficinas += montoAplicable;
                    else if (concepto.includes('agua')) categorias.aguaOficinas += montoAplicable;
                    else if (concepto.includes('internet')) categorias.internetOficinas += montoAplicable;
                    else if (concepto.includes('teléfono') || concepto.includes('telefono') || concepto.includes('celular')) categorias.telefonoCelulares += montoAplicable;
                    else if (concepto.includes('adt')) categorias.adtOficinas += montoAplicable;
                    else if (concepto.includes('mantenimiento') || concepto.includes('papelería')) categorias.mantenimientoPapeleria += montoAplicable;
                    else if (concepto.includes('software') || concepto.includes('hosting') || concepto.includes('office')) categorias.softwareHosting += montoAplicable;
                }
                else if (categoriaFirebase === 'transporte') {
                    if (concepto.includes('combustible')) categorias.combustible += montoAplicable;
                    else if (concepto.includes('electricidad') && concepto.includes('bodega')) categorias.electricidadBodegas += montoAplicable;
                    else if (concepto.includes('agua') && concepto.includes('bodega')) categorias.aguaBodegas += montoAplicable;
                    else if (concepto.includes('alquiler')) categorias.alquilerTaller += montoAplicable;
                    else if (concepto.includes('gps') || concepto.includes('navsat')) categorias.gpsNavsat += montoAplicable;
                    else if (concepto.includes('marchamo')) categorias.marchamos += montoAplicable;
                    else if (concepto.includes('dekra')) categorias.dekra += montoAplicable;
                    else if (concepto.includes('mantenimiento')) categorias.mantenimientoVehiculos += montoAplicable;
                }
                else if (categoriaFirebase === 'planilla') {
                    if (concepto.includes('bodega') && !concepto.includes('alex')) categorias.planillaBodega += montoAplicable;
                    else if (concepto.includes('alex duque')) categorias.alexDuque += montoAplicable;
                    else if (concepto.includes('póliza') || concepto.includes('rt')) categorias.polizaRTBodega += montoAplicable;
                    else if (concepto.includes('ccss')) categorias.ccssBodegaOficinas += montoAplicable;
                    else if (concepto.includes('oficinas')) categorias.planillaOficinas += montoAplicable;
                }
            });
        });
    });
    
    console.log(`📊 COSTOS FIJOS para ${mesSeleccionado}: ${diasEnMes} días, Alquiler: ₡${alquilerMensual.toLocaleString()} → ₡${categorias.alquilerLocal.toLocaleString()}`);
    return categorias;
}

function calcularGastosAdministrativos() { return { total: 0 }; }

// ============================================
// RENDERIZAR RESUMEN - VERSIÓN COMPLETA
// ============================================

function renderResumen() {
    console.log('📊 Renderizando Resumen Financiero...');
    
    const resumenContent = document.getElementById('resumenContent');
    if (!resumenContent) { console.error('❌ No se encontró resumenContent'); return; }
    
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroTiempo = AppState.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState.filtros?.fechaPersonalizada;
    const periodoTexto = obtenerTextoPeriodo(filtroTiempo, fechaPersonalizada);
    
    // Fecha base para costos fijos
    let fechaBaseCostos;
    if (filtroTiempo === 'personalizado' && fechaPersonalizada) {
        fechaBaseCostos = parseFechaDDMMYYYY(fechaPersonalizada);
    } else if (filtroTiempo === 'mes') {
        fechaBaseCostos = fechaPersonalizada ? parseFechaDDMMYYYY(fechaPersonalizada) : new Date();
        fechaBaseCostos = getPrimerDiaDelMes(fechaBaseCostos);
    } else if (filtroTiempo === 'ayer') {
        fechaBaseCostos = new Date();
        fechaBaseCostos.setDate(fechaBaseCostos.getDate() - 1);
    } else {
        fechaBaseCostos = new Date();
    }
    if (isNaN(fechaBaseCostos.getTime())) fechaBaseCostos = new Date();
    
    const diasDelMes = getDiasDelMes(fechaBaseCostos);
    const mesTexto = formatearMesAnio(fechaBaseCostos);
    const esVistaDiaria = (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado');
    const textoVista = esVistaDiaria ? `Diario (${diasDelMes} días/mes)` : 'Mensual';
    
    console.log(`📅 Mes de referencia: ${mesTexto}, Días: ${diasDelMes}, Vista: ${textoVista}`);
    
    // Fechas para filtrar
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);
    
    // Datos
    const ventas = window.ventasData || [];
    const costos = window.costosData || {};
    const compras = window.comprasExternas || [];
    const facturas = window.facturacionBodegas || [];
    const mermas = window.mermas || [];
    const prestamos = window.prestamos || [];
    const servicios = window.serviciosData || {};
    const planilla = window.planillaData || {};
    
    // Filtrar
    const ventasFiltradas = ventas.filter(v => filtrarPorFecha(v, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) && filtrarPorLocal(v, filtroLocal));
    const comprasFiltradas = compras.filter(c => filtrarPorFecha(c, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) && filtrarPorLocal(c, filtroLocal));
    const facturasFiltradas = facturas.filter(f => filtrarPorFecha(f, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) && filtrarPorLocal(f, filtroLocal));
    const mermasFiltradas = mermas.filter(m => filtrarPorFecha(m, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) && filtrarPorLocal(m, filtroLocal));
    const prestamosFiltrados = prestamos.filter(p => filtrarPorFecha(p, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada) && filtrarPorLocal(p, filtroLocal));
    
    // Ingresos
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    const ventaEfectivo = ventasFiltradas.reduce((sum, v) => sum + (v.efectivo || 0), 0);
    const ventaBAC = ventasFiltradas.reduce((sum, v) => sum + (v.bac || 0), 0);
    const ventaUber = ventasFiltradas.reduce((sum, v) => sum + (v.uber || 0), 0);
    const ventaPedidosYa = ventasFiltradas.reduce((sum, v) => sum + (v.pedidosYa || 0), 0);
    const ventaDidi = ventasFiltradas.reduce((sum, v) => sum + (v.didi || 0), 0);
    const ventaPersonal = ventasFiltradas.reduce((sum, v) => sum + (v.personal || 0), 0);
    
    // Gastos
    const planillaCalc = calcularPlanilla(planilla, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    const ccss = calcularCCSS(planilla, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    const cesantia = calcularCesantia(planilla, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    const vacaciones = calcularVacaciones(planilla, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    const aguinaldos = calcularAguinaldos(planilla, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    const pago10 = calcularPago10(ventasFiltradas);
    const comisionUber = calcularComisionesDelivery(ventasFiltradas, 'uber');
    const comisionPedidosYa = calcularComisionesDelivery(ventasFiltradas, 'pedidosYa');
    const comisionDidi = calcularComisionesDelivery(ventasFiltradas, 'didi');
    const comisionDatafonos = calcularComisionDatafonos(ventasFiltradas);
    const costoMateriaPrima = calcularCostoMateriaPrima(comprasFiltradas);
    const facturacionBodegas = calcularFacturacionBodegas(facturasFiltradas);
    const mermasTotal = calcularMermas(mermasFiltradas);
    const reembolsoDelivery = calcularReembolsoDelivery(ventasFiltradas);
    const prestamosTotal = calcularPrestamos(prestamosFiltrados);
    const serviciosCalc = calcularServicios(servicios, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada);
    const costosFijos = calcularCostosFijos(costos, filtroLocal, filtroTiempo, fechaBaseCostos);
    
    // Totales
    const totalGastosOperativos = planillaCalc.total + ccss + cesantia + vacaciones + aguinaldos + pago10 +
        comisionUber + comisionPedidosYa + comisionDidi + comisionDatafonos + costoMateriaPrima + 
        facturacionBodegas + mermasTotal + reembolsoDelivery + prestamosTotal + serviciosCalc.total +
        costosFijos.alquilerLocal + costosFijos.secsa + costosFijos.softRestaurant + costosFijos.internetKolbi +
        costosFijos.televisionKolbi + costosFijos.adt + costosFijos.fumigacion + costosFijos.polizaRT +
        costosFijos.depreciacionActivos + costosFijos.patenteComercial + costosFijos.patenteLicores +
        costosFijos.basuraMunicipal + costosFijos.interesesMoraPatente + costosFijos.certificacionGas +
        costosFijos.certificacionElectrica + costosFijos.renovacionMinisterioSalud + costosFijos.mantenimiento +
        costosFijos.haciendaIVA + costosFijos.asesoriaLegalRH + costosFijos.honorariosContabilidad +
        costosFijos.publicidad + costosFijos.otrosServiciosProfesionales + costosFijos.electricidadPlanta +
        costosFijos.aguaPlanta + costosFijos.adtPlanta + costosFijos.fumigacionPlanta + costosFijos.softwareSecsaPlanta +
        costosFijos.ivaHaciendaPlanta + costosFijos.asesoriaLegalPlanta + costosFijos.electricidadOficinas +
        costosFijos.aguaOficinas + costosFijos.internetOficinas + costosFijos.telefonoCelulares + costosFijos.adtOficinas +
        costosFijos.mantenimientoPapeleria + costosFijos.softwareHosting + costosFijos.combustible +
        costosFijos.electricidadBodegas + costosFijos.aguaBodegas + costosFijos.alquilerTaller + costosFijos.gpsNavsat +
        costosFijos.marchamos + costosFijos.dekra + costosFijos.mantenimientoVehiculos + costosFijos.planillaBodega +
        costosFijos.alexDuque + costosFijos.polizaRTBodega + costosFijos.ccssBodegaOficinas + costosFijos.planillaOficinas;
    
    const totalGastos = totalGastosOperativos;
    const utilidadAntesImpuestos = totalVentas - totalGastos;
    const iva = costosFijos.haciendaIVA;
    const retencionTarjetaVenta = ventaBAC * 0.0531;
    const utilidadAntesRenta = utilidadAntesImpuestos - iva - retencionTarjetaVenta;
    const impuestoRenta = utilidadAntesRenta > 0 ? utilidadAntesRenta * 0.30 : 0;
    const retencionTarjetaRenta = ventaBAC * 0.0171;
    const utilidadNeta = utilidadAntesRenta - impuestoRenta - retencionTarjetaRenta;
    const margenUtilidad = totalVentas > 0 ? (utilidadNeta / totalVentas * 100) : 0;
    
    // HTML completo - CON ARRENDAMIENTO EN ESTILO NORMAL (sin negrita)
    let html = `
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 24px; padding: 20px 25px; margin-bottom: 25px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <div style="font-size: 0.85rem; opacity: 0.7;">ESTADO DE RESULTADOS</div>
                    <div style="font-size: 1.4rem; font-weight: 700;">Pérdidas y Ganancias</div>
                </div>
                <div style="display: flex; gap: 20px;">
                    <div style="background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 40px;">
                        <i class="fas fa-store"></i> ${filtroLocal}
                    </div>
                    <div style="background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 40px;">
                        <i class="fas fa-calendar"></i> ${periodoTexto} (${textoVista})
                    </div>
                </div>
            </div>
            <div style="margin-top: 12px; font-size: 0.8rem; opacity: 0.8; background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 12px;">
                <i class="fas fa-chart-line"></i> Costos basados en el período: <strong>${mesTexto}</strong> (${diasDelMes} días)
                ${esVistaDiaria ? `<span style="color: #fbbf24;"> | Costos diarios = Mensual ÷ ${diasDelMes}</span>` : ''}
            </div>
        </div>
        
        <div class="card" style="overflow-x: auto; padding: 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th colspan="2" style="padding: 15px 20px; text-align: left; font-size: 1rem; border-bottom: 2px solid #e2e8f0;">
                            <i class="fas fa-arrow-up" style="color: #10b981; margin-right: 10px;"></i> INGRESOS
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding: 10px 20px 10px 40px;">Ingreso x Venta (EFECTIVO)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(ventaEfectivo).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Ingreso x Venta (BAC)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(ventaBAC).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Ingreso x Venta (UBER)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(ventaUber).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Ingreso x Venta (PEDIDOS YA)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(ventaPedidosYa).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Ingreso x Venta (DIDI FOOD)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(ventaDidi).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Ingreso x Venta (PERSONAL)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(ventaPersonal).toLocaleString()}</td></tr>
                    <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #e2e8f0;">
                        <td style="padding: 12px 20px;">TOTAL GENERAL INGRESOS</td>
                        <td style="padding: 12px 20px; text-align: right; color: #10b981;">₡${Math.round(totalVentas).toLocaleString()}</td>
                    </tr>
                </tbody>
                
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th colspan="2" style="padding: 15px 20px; text-align: left; font-size: 1rem; border-bottom: 2px solid #e2e8f0;">
                            <i class="fas fa-arrow-down" style="color: #ef4444; margin-right: 10px;"></i> GASTOS OPERATIVOS
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Nómina - Planilla Base</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(planillaCalc.salarioBase).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Nómina - Horas Extras</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(planillaCalc.horasExtras).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x CCSS (26.5%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(ccss).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Cesantía (5.33%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(cesantia).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Vacaciones (4.16%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(vacaciones).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Aguinaldos (8.33%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(aguinaldos).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Pago 10%</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(pago10).toLocaleString()}</td></tr>
                    <!-- Gasto x Arrendamiento - ESTILO NORMAL (sin negrita) -->
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Arrendamiento</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.alquilerLocal).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Servicio Eléctrico</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(serviciosCalc.electricidad).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Servicio Gas</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(serviciosCalc.gas).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Servicio Agua</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(serviciosCalc.agua).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x SOFTWARE SECSA</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.secsa).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x SOFT-RESTAURANT</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.softRestaurant).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">INTERNET</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.internetKolbi).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">TELEVISIÓN</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.televisionKolbi).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Servicio ADT</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.adt).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Servicio Fumigación</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.fumigacion).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Póliza RT</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.polizaRT).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x DEPRECIACION ACTIVOS</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.depreciacionActivos).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x PATENTE COMERCIAL</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.patenteComercial).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x PATENTE LICORES</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.patenteLicores).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">BASURA MUNICIPAL</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.basuraMunicipal).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">INTERESES x MORA PATENTE</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.interesesMoraPatente).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">CERTIFICACION DE GAS</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.certificacionGas).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">CERTIFICACION ELECTRICA</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.certificacionElectrica).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x RENOVACIÓN SALUD</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.renovacionMinisterioSalud).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x MANTENIMIENTO</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.mantenimiento).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">HACIENDA IVA</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.haciendaIVA).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">ASESORIA LEGAL RH</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.asesoriaLegalRH).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Honorarios Contabilidad</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.honorariosContabilidad).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">SERV. PROF PUBLICIDAD</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.publicidad).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">OTROS SERVICIOS PROFESIONALES</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costosFijos.otrosServiciosProfesionales).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Comisión Datafonos (BAC)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(comisionDatafonos).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Comisión (UBER)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(comisionUber).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Comisión (PEDIDOS YA)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(comisionPedidosYa).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Comisión (DIDI FOOD)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(comisionDidi).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x COMPRA PROVEEDORES</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costoMateriaPrima).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Costo Diario (MATERIA PRIMA)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(facturacionBodegas).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Merma</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(mermasTotal).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Reembolso Delivery</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(reembolsoDelivery).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Préstamos a Empleados</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(prestamosTotal).toLocaleString()}</td></tr>
                </tbody>
                
                <tbody>
                    <tr style="background: #fef2f2;">
                        <td style="padding: 15px 20px; font-weight: 700;">TOTAL GENERAL GASTOS</td>
                        <td style="padding: 15px 20px; text-align: right; font-weight: 700; color: #b91c1c;">₡${Math.round(totalGastos).toLocaleString()}</td>
                    </tr>
                    <tr><td style="padding: 12px 20px;">Utilidad Antes de Impuestos</td><td style="padding: 12px 20px; text-align: right;">₡${Math.round(utilidadAntesImpuestos).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">IVA (Impuesto Valor Agregado)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(iva).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Retención de tarjeta (5.31%) - imp venta</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(retencionTarjetaVenta).toLocaleString()}</td></tr>
                    <tr><td style="padding: 12px 20px;">Utilidad antes del impuesto de renta</td><td style="padding: 12px 20px; text-align: right;">₡${Math.round(utilidadAntesRenta).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Impuesto de Renta (30%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(impuestoRenta).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Retención de tarjeta (1.71%) - imp renta</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(retencionTarjetaRenta).toLocaleString()}</td></tr>
                    <tr style="background: #f0fdf4;">
                        <td style="padding: 18px 20px; font-weight: 800; font-size: 1.1rem;">UTILIDAD O PÉRDIDA NETA</td>
                        <td style="padding: 18px 20px; text-align: right; font-weight: 800; font-size: 1.1rem; color: ${utilidadNeta >= 0 ? '#166534' : '#b91c1c'};">₡${Math.round(utilidadNeta).toLocaleString()}</td>
                    </tr>
                    <tr><td style="padding: 12px 20px;">Margen de Utilidad</td><td style="padding: 12px 20px; text-align: right; font-weight: 600;">${margenUtilidad.toFixed(2)}%</td></tr>
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 16px; text-align: center; font-size: 0.8rem; color: #64748b;">
            <i class="fas fa-chart-line"></i> Estado de Resultados al ${new Date().toLocaleDateString('es-CR')} | 
            Costos basados en el período: <strong>${mesTexto}</strong> (${diasDelMes} días)
        </div>
    `;
    
    resumenContent.innerHTML = html;
}

function initResumen() {
    console.log('🚀 Inicializando módulo de Resumen...');
    setTimeout(() => {
        if (AppState?.usuario) renderResumen();
        else console.log('⏳ Esperando autenticación...');
    }, 100);
}

window.initResumen = initResumen;
window.renderResumen = renderResumen;
console.log('✅ resumen.js cargado - Versión completa con todos los gastos');