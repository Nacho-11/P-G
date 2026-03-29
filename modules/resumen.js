// modules/resumen.js - VERSIÓN CORREGIDA
// Estado de Resultados con cálculo diario y mensual

console.log('📊 Cargando módulo de Resumen Financiero...');

// ============================================
// FUNCIONES AUXILIARES
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

function formatearFechaCR(fechaStr) {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
}

function getDiasDelPeriodo(filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin) {
    const hoy = new Date();
    
    if (filtroTiempo === 'mes') {
        const fechaBase = fechaPersonalizada ? new Date(fechaPersonalizada + 'T12:00:00') : hoy;
        return new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0).getDate();
    } else if (filtroTiempo === 'anio') {
        return 365;
    } else if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio + 'T12:00:00');
        const fin = new Date(fechaFin + 'T12:00:00');
        const diffTime = Math.abs(fin - inicio);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else if (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado') {
        return 1;
    }
    return 30;
}

function obtenerTextoPeriodo(filtro, fechaPersonalizada, fechaInicio, fechaFin) {
    switch(filtro) {
        case 'todos': return 'Todo el historial';
        case 'ayer': {
            const ayer = new Date();
            ayer.setDate(ayer.getDate() - 1);
            return `Ayer (${ayer.toLocaleDateString('es-CR')})`;
        }
        case 'mes': {
            const fechaBase = fechaPersonalizada ? parseFechaDDMMYYYY(fechaPersonalizada) : new Date();
            return formatearMesAnio(fechaBase);
        }
        case 'anio': return `Año ${new Date().getFullYear()}`;
        case 'rango': {
            if (fechaInicio && fechaFin) {
                return `${formatearFechaCR(fechaInicio)} → ${formatearFechaCR(fechaFin)}`;
            }
            return 'Rango de fechas';
        }
        case 'personalizado':
            if (!fechaPersonalizada) return 'Fecha específica';
            const fecha = parseFechaDDMMYYYY(fechaPersonalizada);
            return fecha.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
        default: return 'Todo el historial';
    }
}

function filtrarPorFecha(item, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) {
    if (!item.fecha) return false;
    let fechaItem = item.fecha;
    if (fechaItem.includes('T')) fechaItem = fechaItem.split('T')[0];
    
    if (filtroTiempo === 'todos') return true;
    if (filtroTiempo === 'ayer') return fechaItem === ayerStr;
    if (filtroTiempo === 'mes') return fechaItem.substring(0, 7) === mesActual;
    if (filtroTiempo === 'anio') return fechaItem.substring(0, 4) === anioActual;
    if (filtroTiempo === 'personalizado') return fechaItem === fechaPersonalizada;
    if (filtroTiempo === 'rango') {
        if (!fechaInicio || !fechaFin) return true;
        return fechaItem >= fechaInicio && fechaItem <= fechaFin;
    }
    return true;
}

function filtrarPorLocal(item, filtroLocal) {
    if (!item.local) return false;
    if (filtroLocal === 'Todos') return true;
    return item.local === filtroLocal;
}

// ============================================
// CÁLCULOS DE PLANILLA Y PRESTAMOS
// ============================================

function calcularPlanilla(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) {
    let totalPlanilla = 0;
    let totalSalarioBase = 0;
    let totalHorasExtras = 0;
    let totalNocturnas = 0;
    let totalExtrasNocturnas = 0;
    
    if (!planillaData || Object.keys(planillaData).length === 0) {
        return { salarioBase: 0, horasExtras: 0, nocturnas: 0, extrasNocturnas: 0, total: 0 };
    }
    
    Object.keys(planillaData).forEach(local => {
        if (filtroLocal !== 'Todos' && local !== filtroLocal) return;
        if (typeof window.puedeVerLocal === 'function' && !window.puedeVerLocal(local)) return;
        
        const empleados = planillaData[local] || [];
        
        empleados.forEach(emp => {
            if (!emp.horas) return;
            
            const salarioMensual = emp.salario || 0;
            const valorHoraDiurna = salarioMensual / 240;
            const valorHoraNocturna = salarioMensual / 180;
            const horasJornada = 8;
            const esAñosLocos = local.includes('Los Años Locos');
            
            Object.keys(emp.horas).forEach(fechaStr => {
                const fecha = fechaStr.split('T')[0];
                
                if (filtroTiempo === 'todos') {
                    if (!window._planillaEmpleadosSumados) window._planillaEmpleadosSumados = new Set();
                    const key = `${emp.id}-${local}`;
                    if (!window._planillaEmpleadosSumados.has(key)) {
                        window._planillaEmpleadosSumados.add(key);
                        totalPlanilla += salarioMensual;
                        totalSalarioBase += salarioMensual;
                    }
                    return;
                }
                
                if (!filtrarPorFecha({ fecha }, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin)) return;
                
                const horas = emp.horas[fechaStr];
                const horasNormales = Math.min(horas.ordinarias || 0, horasJornada);
                const horasExtrasDia = (horas.ordinarias || 0) - horasNormales;
                
                let pagoDia = 0;
                let salarioBaseDia = 0;
                let horasExtrasDiaPago = 0;
                let nocturnasDia = 0;
                let extrasNocturnasDia = 0;
                
                if (esAñosLocos) {
                    salarioBaseDia = (horasNormales + (horas.nocturnas || 0)) * valorHoraNocturna;
                    horasExtrasDiaPago = (horasExtrasDia + (horas.extras || 0) + (horas.extrasNocturnas || 0)) * valorHoraNocturna * 1.5;
                    pagoDia = salarioBaseDia + horasExtrasDiaPago;
                } else {
                    salarioBaseDia = horasNormales * valorHoraDiurna;
                    horasExtrasDiaPago = (horasExtrasDia + (horas.extras || 0)) * valorHoraDiurna * 1.5;
                    nocturnasDia = (horas.nocturnas || 0) * valorHoraNocturna;
                    extrasNocturnasDia = (horas.extrasNocturnas || 0) * valorHoraNocturna * 1.5;
                    pagoDia = salarioBaseDia + horasExtrasDiaPago + nocturnasDia + extrasNocturnasDia;
                }
                
                totalPlanilla += pagoDia;
                totalSalarioBase += salarioBaseDia;
                totalHorasExtras += horasExtrasDiaPago;
                totalNocturnas += nocturnasDia;
                totalExtrasNocturnas += extrasNocturnasDia;
            });
        });
    });
    
    if (filtroTiempo === 'todos') {
        delete window._planillaEmpleadosSumados;
    }
    
    return { 
        salarioBase: totalSalarioBase, 
        horasExtras: totalHorasExtras, 
        nocturnas: totalNocturnas,
        extrasNocturnas: totalExtrasNocturnas,
        total: totalPlanilla 
    };
}

function calcularPrestamos(prestamosData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) {
    if (!prestamosData) return 0;
    return prestamosData
        .filter(p => filtrarPorFecha(p, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && filtrarPorLocal(p, filtroLocal))
        .reduce((sum, p) => sum + (p.totales?.totalPago || 0), 0);
}

// ============================================
// CÁLCULOS DE COSTOS FIJOS
// ============================================

function calcularCostosFijos(costosData, filtroLocal, periodo) {
    const resultado = {
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
    
    const multiplicador = 1 / periodo.dias;
    
    if (!costosData || Object.keys(costosData).length === 0) return resultado;
    
    const idsProcesados = new Set();
    
    Object.keys(costosData).forEach(categoriaFirebase => {
        const subCategorias = costosData[categoriaFirebase];
        
        Object.keys(subCategorias).forEach(subCategoria => {
            const costosArray = subCategorias[subCategoria];
            if (!Array.isArray(costosArray)) return;
            
            costosArray.forEach(costo => {
                if (costo.id && idsProcesados.has(costo.id)) return;
                if (costo.id) idsProcesados.add(costo.id);
                
                const localDelCosto = costo.local || 'Sin Local';
                if (filtroLocal !== 'Todos' && localDelCosto !== filtroLocal) return;
                if (typeof window.puedeVerLocal === 'function' && !window.puedeVerLocal(localDelCosto)) return;
                
                const concepto = (costo.concepto || '').toLowerCase().trim();
                const montoMensual = costo.monto || 0;
                const montoAplicable = montoMensual * multiplicador;
                if (montoMensual === 0) return;
                
                // Mapear según la categoría y concepto (mismo código que antes)
                if (subCategoria === 'restaurante') {
                    if (concepto.includes('alquiler')) resultado.alquilerLocal += montoAplicable;
                    else if (concepto.includes('secsa')) resultado.secsa += montoAplicable;
                    else if (concepto.includes('soft restaurant')) resultado.softRestaurant += montoAplicable;
                    else if (concepto.includes('internet')) resultado.internetKolbi += montoAplicable;
                    else if (concepto.includes('televisión') || concepto.includes('tv')) resultado.televisionKolbi += montoAplicable;
                    else if (concepto.includes('adt') || concepto.includes('alarma')) resultado.adt += montoAplicable;
                    else if (concepto.includes('fumigación')) resultado.fumigacion += montoAplicable;
                    else if (concepto.includes('póliza') || concepto.includes('rt')) resultado.polizaRT += montoAplicable;
                    else if (concepto.includes('depreciación')) resultado.depreciacionActivos += montoAplicable;
                    else if (concepto.includes('patente comercial')) resultado.patenteComercial += montoAplicable;
                    else if (concepto.includes('patente licores')) resultado.patenteLicores += montoAplicable;
                    else if (concepto.includes('basura')) resultado.basuraMunicipal += montoAplicable;
                    else if (concepto.includes('interés') || concepto.includes('mora')) resultado.interesesMoraPatente += montoAplicable;
                    else if (concepto.includes('certificación gas')) resultado.certificacionGas += montoAplicable;
                    else if (concepto.includes('certificación eléctrica')) resultado.certificacionElectrica += montoAplicable;
                    else if (concepto.includes('renovación') || concepto.includes('ministerio')) resultado.renovacionMinisterioSalud += montoAplicable;
                    else if (concepto.includes('mantenimiento')) resultado.mantenimiento += montoAplicable;
                    else if (concepto.includes('hacienda') || concepto.includes('iva')) resultado.haciendaIVA += montoAplicable;
                    else if (concepto.includes('asesoría legal')) resultado.asesoriaLegalRH += montoAplicable;
                    else if (concepto.includes('honorarios contabilidad')) resultado.honorariosContabilidad += montoAplicable;
                    else if (concepto.includes('publicidad')) resultado.publicidad += montoAplicable;
                    else if (concepto.includes('otros servicios')) resultado.otrosServiciosProfesionales += montoAplicable;
                }
                // ... resto de categorías igual que antes
                else if (subCategoria === 'planta') {
                    if (concepto.includes('electricidad')) resultado.electricidadPlanta += montoAplicable;
                    else if (concepto.includes('agua')) resultado.aguaPlanta += montoAplicable;
                    else if (concepto.includes('adt')) resultado.adtPlanta += montoAplicable;
                    else if (concepto.includes('fumigación')) resultado.fumigacionPlanta += montoAplicable;
                    else if (concepto.includes('software secsa')) resultado.softwareSecsaPlanta += montoAplicable;
                    else if (concepto.includes('iva')) resultado.ivaHaciendaPlanta += montoAplicable;
                    else if (concepto.includes('asesoría legal')) resultado.asesoriaLegalPlanta += montoAplicable;
                }
                else if (subCategoria === 'oficinas') {
                    if (concepto.includes('electricidad')) resultado.electricidadOficinas += montoAplicable;
                    else if (concepto.includes('agua')) resultado.aguaOficinas += montoAplicable;
                    else if (concepto.includes('internet')) resultado.internetOficinas += montoAplicable;
                    else if (concepto.includes('teléfono') || concepto.includes('telefono') || concepto.includes('celular')) resultado.telefonoCelulares += montoAplicable;
                    else if (concepto.includes('adt')) resultado.adtOficinas += montoAplicable;
                    else if (concepto.includes('mantenimiento') || concepto.includes('papelería')) resultado.mantenimientoPapeleria += montoAplicable;
                    else if (concepto.includes('software') || concepto.includes('hosting') || concepto.includes('office')) resultado.softwareHosting += montoAplicable;
                }
                else if (subCategoria === 'transporte') {
                    if (concepto.includes('combustible')) resultado.combustible += montoAplicable;
                    else if (concepto.includes('electricidad') && concepto.includes('bodega')) resultado.electricidadBodegas += montoAplicable;
                    else if (concepto.includes('agua') && concepto.includes('bodega')) resultado.aguaBodegas += montoAplicable;
                    else if (concepto.includes('alquiler')) resultado.alquilerTaller += montoAplicable;
                    else if (concepto.includes('gps') || concepto.includes('navsat')) resultado.gpsNavsat += montoAplicable;
                    else if (concepto.includes('marchamo')) resultado.marchamos += montoAplicable;
                    else if (concepto.includes('dekra')) resultado.dekra += montoAplicable;
                    else if (concepto.includes('mantenimiento')) resultado.mantenimientoVehiculos += montoAplicable;
                }
                else if (subCategoria === 'planilla') {
                    if (concepto.includes('bodega') && !concepto.includes('alex')) resultado.planillaBodega += montoAplicable;
                    else if (concepto.includes('alex duque')) resultado.alexDuque += montoAplicable;
                    else if (concepto.includes('póliza') || concepto.includes('rt')) resultado.polizaRTBodega += montoAplicable;
                    else if (concepto.includes('ccss')) resultado.ccssBodegaOficinas += montoAplicable;
                    else if (concepto.includes('oficinas')) resultado.planillaOficinas += montoAplicable;
                }
            });
        });
    });
    
    return resultado;
}

// ============================================
// CÁLCULOS DE SERVICIOS
// ============================================

function calcularServicios(serviciosData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) {
    let agua = 0, electricidad = 0, gas = 0, total = 0;
    
    Object.keys(serviciosData).forEach(local => {
        if (filtroLocal !== 'Todos' && local !== filtroLocal) return;
        if (typeof window.puedeVerLocal === 'function' && !window.puedeVerLocal(local)) return;
        
        (serviciosData[local] || []).forEach(s => {
            if (!filtrarPorFecha(s, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin)) return;
            total += s.monto || 0;
            if (s.servicio === 'Agua') agua += s.monto || 0;
            if (s.servicio === 'Electricidad') electricidad += s.monto || 0;
            if (s.servicio === 'Gas') gas += s.monto || 0;
        });
    });
    
    return { agua, electricidad, gas, total };
}

// ============================================
// CÁLCULOS DE VENTAS Y COMISIONES
// ============================================

function calcularComisionesVentas(ventasFiltradas) {
    const COMISIONES = { uber: 0.44, pedidosYa: 0.18, didi: 0.18, bac: 0.0225 };
    
    const comisionUber = ventasFiltradas.reduce((sum, v) => sum + ((v.uber || 0) * COMISIONES.uber), 0);
    const comisionPedidosYa = ventasFiltradas.reduce((sum, v) => sum + ((v.pedidosYa || 0) * COMISIONES.pedidosYa), 0);
    const comisionDidi = ventasFiltradas.reduce((sum, v) => sum + ((v.didi || 0) * COMISIONES.didi), 0);
    const comisionDatafonos = ventasFiltradas.reduce((sum, v) => sum + ((v.bac || 0) * COMISIONES.bac), 0);
    
    return {
        uber: comisionUber,
        pedidosYa: comisionPedidosYa,
        didi: comisionDidi,
        datafonos: comisionDatafonos,
        total: comisionUber + comisionPedidosYa + comisionDidi + comisionDatafonos
    };
}

function calcularReembolsoDelivery(ventasFiltradas) {
    const totalDelivery = ventasFiltradas.reduce((sum, v) => sum + (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0), 0);
    return totalDelivery * 0.10;
}

// ============================================
// CALCULAR PAGO 10% (DESDE EL MÓDULO) - UNA SOLA VEZ
// ============================================
function calcularPago10DesdeModulo(ventasFiltradas, filtroLocal, filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin, diasPeriodo) {
    // Usar datos del módulo Pago 10% si existen
    if (window.pagos10 && window.pagos10.length > 0 && window.obtenerTotalPago10) {
        const totalPago10 = window.obtenerTotalPago10(filtroLocal, filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin);
        
        // Si hay datos en el módulo, usarlos
        if (totalPago10 > 0) {
            console.log(`📊 Usando datos del módulo Pago 10%: ₡${totalPago10.toLocaleString()}`);
            const promedioDiario = diasPeriodo > 0 ? totalPago10 / diasPeriodo : 0;
            return { total: totalPago10, promedioDiario: promedioDiario };
        }
    }
    
    // Fallback: calcular automáticamente como 10% de las ventas
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    const total = totalVentas * 0.10;
    const promedioDiario = diasPeriodo > 0 ? total / diasPeriodo : 0;
    
    console.log(`📊 Usando cálculo automático (10% de ventas): ₡${total.toLocaleString()}`);
    return { total: total, promedioDiario: promedioDiario };
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

// ============================================
// RENDERIZAR RESUMEN
// ============================================

function renderResumen() {
    console.log('📊 Renderizando Resumen Financiero...');
    
    const resumenContent = document.getElementById('resumenContent');
    if (!resumenContent) return;
    
    const filtroLocal = AppState?.filtros?.local || 'Todos';
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState?.filtros?.fechaPersonalizada;
    const fechaInicio = AppState?.filtros?.fechaInicio;
    const fechaFin = AppState?.filtros?.fechaFin;
    
    const periodoTexto = obtenerTextoPeriodo(filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin);
    
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
    const esVistaDiaria = (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado' || filtroTiempo === 'rango');
    const textoVista = esVistaDiaria ? `Diario (${diasDelMes} días/mes)` : 'Mensual';
    
    // Período para costos fijos y cálculos
    let periodo = { tipo: filtroTiempo, dias: 1 };
    let diasPeriodo = 30;
    
    if (filtroTiempo === 'mes') {
        periodo.dias = diasDelMes;
        diasPeriodo = diasDelMes;
    } else if (filtroTiempo === 'anio') {
        periodo.dias = 365;
        diasPeriodo = 365;
    } else if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio + 'T12:00:00');
        const fin = new Date(fechaFin + 'T12:00:00');
        const diffTime = Math.abs(fin - inicio);
        periodo.dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        diasPeriodo = periodo.dias;
    } else if (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado') {
        periodo.dias = 1;
        diasPeriodo = 1;
    } else {
        periodo.dias = diasDelMes;
        diasPeriodo = diasDelMes;
    }
    
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
    const ventasFiltradas = ventas.filter(v => 
        filtrarPorFecha(v, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocal(v, filtroLocal)
    );
    
    const comprasFiltradas = compras.filter(c => 
        filtrarPorFecha(c, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocal(c, filtroLocal)
    );
    
    const facturasFiltradas = facturas.filter(f => 
        filtrarPorFecha(f, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocal(f, filtroLocal)
    );
    
    const mermasFiltradas = mermas.filter(m => 
        filtrarPorFecha(m, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocal(m, filtroLocal)
    );
    
    // Cálculos de ingresos
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    const ventaEfectivo = ventasFiltradas.reduce((sum, v) => sum + (v.efectivo || 0), 0);
    const ventaBAC = ventasFiltradas.reduce((sum, v) => sum + (v.bac || 0), 0);
    const ventaUber = ventasFiltradas.reduce((sum, v) => sum + (v.uber || 0), 0);
    const ventaPedidosYa = ventasFiltradas.reduce((sum, v) => sum + (v.pedidosYa || 0), 0);
    const ventaDidi = ventasFiltradas.reduce((sum, v) => sum + (v.didi || 0), 0);
    const ventaPersonal = ventasFiltradas.reduce((sum, v) => sum + (v.personal || 0), 0);
    
    // Cálculos de gastos
    const planillaCalc = calcularPlanilla(planilla, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin);
    const prestamosTotal = calcularPrestamos(prestamos, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin);
    const comisiones = calcularComisionesVentas(ventasFiltradas);
    const reembolsoDelivery = 0;
    const pago10Result = calcularPago10DesdeModulo(ventasFiltradas, filtroLocal, filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin, diasPeriodo);
    const pago10 = pago10Result.total;
    const pago10PromedioDiario = pago10Result.promedioDiario;
    const costoMateriaPrima = calcularCostoMateriaPrima(comprasFiltradas);
    const facturacionBodegasTotal = calcularFacturacionBodegas(facturasFiltradas);
    const mermasTotal = calcularMermas(mermasFiltradas);
    const serviciosCalc = calcularServicios(servicios, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin);
    const costosFijos = calcularCostosFijos(costos, filtroLocal, periodo);
    
    // CCSS, Cesantía, Vacaciones, Aguinaldos
    const ccss = planillaCalc.total * 0.265;
    const cesantia = planillaCalc.salarioBase * 0.0533;
    const vacaciones = planillaCalc.salarioBase * 0.0416;
    const aguinaldos = planillaCalc.total * 0.0833;
    
    // Totales
    const totalGastosOperativos = 
        planillaCalc.total + ccss + cesantia + vacaciones + aguinaldos + 
        prestamosTotal + comisiones.total + reembolsoDelivery + pago10 + 
        costoMateriaPrima + facturacionBodegasTotal + mermasTotal + serviciosCalc.total +
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
    
    // Generar HTML
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
                <i class="fas fa-chart-line"></i> Costos basados en el período: <strong>${mesTexto}</strong> (${periodo.dias} días)
                ${esVistaDiaria ? `<span style="color: #fbbf24;"> | Costos diarios = Mensual ÷ ${periodo.dias}</span>` : ''}
                ${window.pagos10 && window.pagos10.length > 0 && pago10PromedioDiario > 0 ? `<span style="color: #fbbf24;"> | Pago 10% promedio diario: ₡${Math.round(pago10PromedioDiario).toLocaleString()}</span>` : ''}
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
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Nómina - Horas Nocturnas</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(planillaCalc.nocturnas).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Nómina - Horas Extra Nocturnas</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(planillaCalc.extrasNocturnas).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x CCSS (26.5%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(ccss).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Cesantía (5.33%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(cesantia).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Vacaciones (4.16%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(vacaciones).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Aguinaldos (8.33%)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(aguinaldos).toLocaleString()}</td></tr>
                    <tr>
                        <tr>
                        <td style="padding: 10px 20px 10px 40px;">Gasto x Pago 10%</td>
                        <td style="padding: 10px 20px; text-align: right;">
                            ₡${Math.round(pago10PromedioDiario).toLocaleString()}
                            <span style="font-size: 0.7rem; color: #64748b;"></span>
                        </td>
                    </tr>
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
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Comisión Datafonos (BAC)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(comisiones.datafonos).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Comisión (UBER)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(comisiones.uber).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Comisión (PEDIDOS YA)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(comisiones.pedidosYa).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Comisión (DIDI FOOD)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(comisiones.didi).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">GASTO x COMPRA PROVEEDORES</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(costoMateriaPrima).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Costo Diario (MATERIA PRIMA)</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(facturacionBodegasTotal).toLocaleString()}</td></tr>
                    <tr><td style="padding: 10px 20px 10px 40px;">Gasto x Merma</td><td style="padding: 10px 20px; text-align: right;">₡${Math.round(mermasTotal).toLocaleString()}</td></tr>
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
            Costos basados en el período: <strong>${mesTexto}</strong> (${periodo.dias} días)
        </div>
    `;
    
    resumenContent.innerHTML = html;
}

// ============================================
// INICIALIZAR
// ============================================
function initResumen() {
    console.log('🚀 Inicializando módulo de Resumen...');
    setTimeout(() => {
        if (AppState?.usuario) {
            renderResumen();
        } else {
            setTimeout(initResumen, 500);
        }
    }, 100);
}

// ============================================
// EXPORTAR
// ============================================
window.initResumen = initResumen;
window.renderResumen = renderResumen;

console.log('✅ resumen.js cargado - Versión corregida');