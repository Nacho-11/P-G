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

function obtenerFactorPeriodoCostos(filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin) {
    const hoy = new Date();

    // TODO el historial: dejar mensual base
    if (filtroTiempo === 'todos') {
        return 1;
    }

    // AYER o FECHA PERSONALIZADA: 1 día / días del mes correspondiente
    if (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado') {
        let fechaBase;

        if (filtroTiempo === 'personalizado' && fechaPersonalizada) {
            fechaBase = new Date(fechaPersonalizada + 'T12:00:00');
        } else {
            fechaBase = new Date();
            fechaBase.setDate(fechaBase.getDate() - 1);
        }

        const diasMes = new Date(
            fechaBase.getFullYear(),
            fechaBase.getMonth() + 1,
            0
        ).getDate();

        return 1 / diasMes;
    }

    // MES: mes completo = 1
    if (filtroTiempo === 'mes') {
        return 1;
    }

    // RANGO: prorrateo exacto incluso si cruza meses
    if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
        let actual = new Date(fechaInicio + 'T12:00:00');
        const fin = new Date(fechaFin + 'T12:00:00');
        let factor = 0;

        while (actual <= fin) {
            const diasMes = new Date(
                actual.getFullYear(),
                actual.getMonth() + 1,
                0
            ).getDate();

            factor += 1 / diasMes;
            actual.setDate(actual.getDate() + 1);
        }

        return factor;
    }

    return 1;
}

// ============================================
// CÁLCULOS DE COSTOS FIJOS
// ============================================

function calcularCostosFijos(costosData, filtroLocal, filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin) {
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

    if (!costosData || Object.keys(costosData).length === 0) return resultado;

    const factorPeriodo = obtenerFactorPeriodoCostos(
        filtroTiempo,
        fechaPersonalizada,
        fechaInicio,
        fechaFin
    );

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
                const montoAplicable = montoMensual * factorPeriodo;

                if (montoMensual === 0) return;

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
                } else if (subCategoria === 'planta') {
                    if (concepto.includes('electricidad')) resultado.electricidadPlanta += montoAplicable;
                    else if (concepto.includes('agua')) resultado.aguaPlanta += montoAplicable;
                    else if (concepto.includes('adt')) resultado.adtPlanta += montoAplicable;
                    else if (concepto.includes('fumigación')) resultado.fumigacionPlanta += montoAplicable;
                    else if (concepto.includes('software secsa')) resultado.softwareSecsaPlanta += montoAplicable;
                    else if (concepto.includes('iva')) resultado.ivaHaciendaPlanta += montoAplicable;
                    else if (concepto.includes('asesoría legal')) resultado.asesoriaLegalPlanta += montoAplicable;
                } else if (subCategoria === 'oficinas') {
                    if (concepto.includes('electricidad')) resultado.electricidadOficinas += montoAplicable;
                    else if (concepto.includes('agua')) resultado.aguaOficinas += montoAplicable;
                    else if (concepto.includes('internet')) resultado.internetOficinas += montoAplicable;
                    else if (concepto.includes('teléfono') || concepto.includes('telefono') || concepto.includes('celular')) resultado.telefonoCelulares += montoAplicable;
                    else if (concepto.includes('adt')) resultado.adtOficinas += montoAplicable;
                    else if (concepto.includes('mantenimiento') || concepto.includes('papelería')) resultado.mantenimientoPapeleria += montoAplicable;
                    else if (concepto.includes('software') || concepto.includes('hosting') || concepto.includes('office')) resultado.softwareHosting += montoAplicable;
                } else if (subCategoria === 'transporte') {
                    if (concepto.includes('combustible')) resultado.combustible += montoAplicable;
                    else if (concepto.includes('electricidad')) resultado.electricidadBodegas += montoAplicable;
                    else if (concepto.includes('agua')) resultado.aguaBodegas += montoAplicable;
                    else if (concepto.includes('alquiler')) resultado.alquilerTaller += montoAplicable;
                    else if (concepto.includes('gps')) resultado.gpsNavsat += montoAplicable;
                    else if (concepto.includes('marchamo')) resultado.marchamos += montoAplicable;
                    else if (concepto.includes('dekra')) resultado.dekra += montoAplicable;
                    else if (concepto.includes('mantenimiento')) resultado.mantenimientoVehiculos += montoAplicable;
                } else if (subCategoria === 'planilla') {
                    if (concepto.includes('planilla bodega')) resultado.planillaBodega += montoAplicable;
                    else if (concepto.includes('alex duque')) resultado.alexDuque += montoAplicable;
                    else if (concepto.includes('poliza rt')) resultado.polizaRTBodega += montoAplicable;
                    else if (concepto.includes('ccss')) resultado.ccssBodegaOficinas += montoAplicable;
                    else if (concepto.includes('planilla oficinas')) resultado.planillaOficinas += montoAplicable;
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
    let gasPromedioDiario = 0;
    
    Object.keys(serviciosData).forEach(local => {
        if (filtroLocal !== 'Todos' && local !== filtroLocal) return;
        if (typeof window.puedeVerLocal === 'function' && !window.puedeVerLocal(local)) return;
        
        (serviciosData[local] || []).forEach(s => {
            if (!filtrarPorFecha(s, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin)) return;
            
            const monto = s.monto || 0;
            total += monto;
            
            if (s.servicio === 'Agua') agua += monto;
            if (s.servicio === 'Electricidad') electricidad += monto;
            
            if (s.servicio === 'Gas') {
                gas += monto;
                const diasGas = s.dias || 30;
                gasPromedioDiario += diasGas > 0 ? monto / diasGas : 0;
            }
        });
    });
    
    return { agua, electricidad, gas, gasPromedioDiario, total };
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
    if (window.pagos10 && window.pagos10.length > 0 && window.obtenerTotalPago10) {
        const totalPago10 = window.obtenerTotalPago10(
            filtroLocal,
            filtroTiempo,
            fechaPersonalizada,
            fechaInicio,
            fechaFin
        );

        if (totalPago10 > 0) {
            console.log(`📊 Usando datos del módulo Pago 10%: ₡${totalPago10.toLocaleString()}`);
            const promedioDiario = diasPeriodo > 0 ? totalPago10 / diasPeriodo : 0;
            return { total: totalPago10, promedioDiario };
        }
    }

    console.log('📊 No hay registros guardados en Pago 10%, se devuelve 0');
    return { total: 0, promedioDiario: 0 };
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
    
    let periodo = { tipo: filtroTiempo, dias: 1 };
    let diasPeriodo = 30;

    if (filtroTiempo === 'mes') {
        periodo.dias = diasDelMes;
        diasPeriodo = diasDelMes;
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
        // Para "todos", usar el mes base de costos para prorratear
        periodo.dias = diasDelMes;
        diasPeriodo = diasDelMes;
    }

    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('en-CA');
    const mesActual = hoyStr.substring(0, 7);
    const anioActual = hoyStr.substring(0, 4);

    const ventas = window.ventasData || [];
    const planilla = window.planillaData || {};
    const prestamos = window.prestamos || [];
    const compras = window.comprasExternas || [];
    const facturas = window.facturacionBodegas || [];
    const mermas = window.mermas || [];
    const servicios = window.serviciosData || {};
    const costos = window.costosData || {};;

    const filtrarPorLocal = (item, local) => {
        if (local === 'Todos') return true;
        return item.local === local;
    };

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
    
    // INGRESOS
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    const ventaEfectivo = ventasFiltradas.reduce((sum, v) => sum + (v.efectivo || 0), 0);
    const ventaBAC = ventasFiltradas.reduce((sum, v) => sum + (v.bac || 0), 0);
    const ventaUber = ventasFiltradas.reduce((sum, v) => sum + (v.uber || 0), 0);
    const ventaPedidosYa = ventasFiltradas.reduce((sum, v) => sum + (v.pedidosYa || 0), 0);
    const ventaDidi = ventasFiltradas.reduce((sum, v) => sum + (v.didi || 0), 0);
    const ventaPersonal = ventasFiltradas.reduce((sum, v) => sum + (v.personal || 0), 0);
    
    // GASTOS BASE
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
    const costosFijos = calcularCostosFijos(
        costos,
        filtroLocal,
        filtroTiempo,
        fechaPersonalizada,
        fechaInicio,
        fechaFin
    );

    // CARGAS SOCIALES
    const ccss = planillaCalc.total * 0.265;
    const cesantia = planillaCalc.salarioBase * 0.0533;
    const vacaciones = planillaCalc.salarioBase * 0.0416;
    const aguinaldos = planillaCalc.total * 0.0833;

    // =========================
    // GASTOS OPERATIVOS
    // =========================
    const gastosOperativos = {
        planillaBase: planillaCalc.salarioBase,
        horasExtras: planillaCalc.horasExtras,
        horasNocturnas: planillaCalc.nocturnas,
        extrasNocturnas: planillaCalc.extrasNocturnas,
        ccss,
        cesantia,
        vacaciones,
        aguinaldos,
        pago10Diario: pago10PromedioDiario,
        arrendamiento: costosFijos.alquilerLocal || 0,
        servicioElectrico: serviciosCalc.electricidad || 0,
        servicioGasDiario: serviciosCalc.gasPromedioDiario || 0,
        servicioAgua: serviciosCalc.agua || 0,
        comprasProveedores: costoMateriaPrima || 0,
        costoDiarioMateriaPrima: facturacionBodegasTotal || 0,
        mermas: mermasTotal || 0,
        prestamosEmpleados: prestamosTotal || 0
    };

    const totalGastosOperativos = Object.values(gastosOperativos).reduce((a, b) => a + (b || 0), 0);

    // =========================
    // GASTOS ADMINISTRATIVOS & LOGÍSTICA
    // =========================
    const gastosAdminLogistica = {
        secsa: costosFijos.secsa || 0,
        softRestaurant: costosFijos.softRestaurant || 0,
        internetKolbi: costosFijos.internetKolbi || 0,
        televisionKolbi: costosFijos.televisionKolbi || 0,
        adt: costosFijos.adt || 0,
        fumigacion: costosFijos.fumigacion || 0,
        polizaRT: costosFijos.polizaRT || 0,
        depreciacionActivos: costosFijos.depreciacionActivos || 0,
        patenteComercial: costosFijos.patenteComercial || 0,
        patenteLicores: costosFijos.patenteLicores || 0,
        basuraMunicipal: costosFijos.basuraMunicipal || 0,
        interesesMoraPatente: costosFijos.interesesMoraPatente || 0,
        certificacionGas: costosFijos.certificacionGas || 0,
        certificacionElectrica: costosFijos.certificacionElectrica || 0,
        renovacionMinisterioSalud: costosFijos.renovacionMinisterioSalud || 0,
        mantenimiento: costosFijos.mantenimiento || 0,
        asesoriaLegalRH: costosFijos.asesoriaLegalRH || 0,
        honorariosContabilidad: costosFijos.honorariosContabilidad || 0,
        publicidad: costosFijos.publicidad || 0,
        otrosServiciosProfesionales: costosFijos.otrosServiciosProfesionales || 0,
        electricidadPlanta: costosFijos.electricidadPlanta || 0,
        aguaPlanta: costosFijos.aguaPlanta || 0,
        adtPlanta: costosFijos.adtPlanta || 0,
        comisionBAC: comisiones.datafonos || 0,
        comisionUber: comisiones.uber || 0,
        comisionPedidosYa: comisiones.pedidosYa || 0,
        comisionDidi: comisiones.didi || 0
    };

    const totalGastosAdminLogistica = Object.values(gastosAdminLogistica).reduce((a, b) => a + (b || 0), 0);

    // =========================
    // TOTALES E IMPUESTOS
    // =========================
    const totalGastos = totalGastosOperativos + totalGastosAdminLogistica;
    const utilidadAntesImpuestos = totalVentas - totalGastos;
    const iva = totalVentas * 0.13;
    const retencionTarjetaVenta = ventaBAC * 0.0531;
    const utilidadAntesRenta = utilidadAntesImpuestos - iva - retencionTarjetaVenta;
    const impuestoRenta = utilidadAntesRenta > 0 ? utilidadAntesRenta * 0.30 : 0;
    const retencionTarjetaRenta = ventaBAC * 0.0171;
    const utilidadNeta = utilidadAntesRenta - impuestoRenta - retencionTarjetaRenta;
    const margenUtilidad = totalVentas > 0 ? (utilidadNeta / totalVentas) * 100 : 0;

    const porcentaje = (valor, base = totalVentas) => base > 0 ? ((valor / base) * 100).toFixed(2) : '0.00';
    const money = (n) => `₡${Math.round(n || 0).toLocaleString()}`;

    const fila = (label, value, percent = true, extraStyle = '') => `
        <tr style="${extraStyle}">
            <td style="padding: 11px 20px 11px 40px;">${label}</td>
            <td style="padding: 11px 20px; text-align: right; font-weight: 600;">${money(value)}</td>
            <td style="padding: 11px 20px; text-align: right; color: #64748b; font-weight: 600;">${percent ? porcentaje(value) + '%' : '—'}</td>
        </tr>
    `;

    const filaTotal = (label, value, bg, color) => `
        <tr style="background:${bg}; font-weight:800; border-top:2px solid #e2e8f0;">
            <td style="padding: 14px 20px;">${label}</td>
            <td style="padding: 14px 20px; text-align: right; color:${color}; font-weight:800;">${money(value)}</td>
            <td style="padding: 14px 20px; text-align: right; color:${color}; font-weight:800;">${porcentaje(value)}%</td>
        </tr>
    `;

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
            <div>
                <h2 style="margin:0; font-size:1.9rem; display:flex; align-items:center; gap:10px;">
                    <span style="display:inline-flex; width:48px; height:48px; align-items:center; justify-content:center; border-radius:16px; background:linear-gradient(135deg,#0ea5e9,#2563eb); color:white;">
                        <i class="fas fa-chart-line"></i>
                    </span>
                    Resumen Financiero
                </h2>
                <p style="margin:6px 0 0 58px; color:#64748b;">Estado de resultados y análisis financiero</p>
            </div>

            <div style="padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; color:#334155; font-weight:700;">
                <i class="fas fa-calendar-alt"></i> ${periodoTexto}
            </div>
        </div>
    `;

    // =========================
    // DASHBOARD SUPERIOR
    // =========================
    html += `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:26px;">
            <div class="card" style="border-radius:24px; padding:22px; background:linear-gradient(135deg,#ecfdf5,#d1fae5); border:1px solid #86efac;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.85rem; color:#15803d; font-weight:700;">Ingresos Totales</div>
                        <div style="font-size:1.9rem; font-weight:900; color:#166534; margin-top:8px;">${money(totalVentas)}</div>
                    </div>
                    <div style="width:52px; height:52px; border-radius:18px; background:rgba(34,197,94,0.15); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-arrow-up" style="font-size:1.3rem; color:#16a34a;"></i>
                    </div>
                </div>
            </div>

            <div class="card" style="border-radius:24px; padding:22px; background:linear-gradient(135deg,#fef2f2,#fee2e2); border:1px solid #fca5a5;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.85rem; color:#b91c1c; font-weight:700;">Gastos Totales</div>
                        <div style="font-size:1.9rem; font-weight:900; color:#991b1b; margin-top:8px;">${money(totalGastos)}</div>
                    </div>
                    <div style="width:52px; height:52px; border-radius:18px; background:rgba(239,68,68,0.15); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-arrow-down" style="font-size:1.3rem; color:#dc2626;"></i>
                    </div>
                </div>
            </div>

            <div class="card" style="border-radius:24px; padding:22px; background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1px solid #93c5fd;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.85rem; color:#1d4ed8; font-weight:700;">Utilidad Neta</div>
                        <div style="font-size:1.9rem; font-weight:900; color:${utilidadNeta >= 0 ? '#1d4ed8' : '#b91c1c'}; margin-top:8px;">${money(utilidadNeta)}</div>
                    </div>
                    <div style="width:52px; height:52px; border-radius:18px; background:rgba(59,130,246,0.15); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-coins" style="font-size:1.3rem; color:#2563eb;"></i>
                    </div>
                </div>
            </div>

            <div class="card" style="border-radius:24px; padding:22px; background:linear-gradient(135deg,#faf5ff,#ede9fe); border:1px solid #c4b5fd;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.85rem; color:#7c3aed; font-weight:700;">Margen</div>
                        <div style="font-size:1.9rem; font-weight:900; color:#6d28d9; margin-top:8px;">${margenUtilidad.toFixed(2)}%</div>
                    </div>
                    <div style="width:52px; height:52px; border-radius:18px; background:rgba(139,92,246,0.15); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-percent" style="font-size:1.3rem; color:#7c3aed;"></i>
                    </div>
                </div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap:14px; margin-bottom:28px;">
            <div class="card" style="border-radius:18px; padding:18px; background:#fff7ed; border:1px solid #fdba74;">
                <div style="font-size:0.82rem; color:#c2410c; font-weight:700;">Pago 10% Diario</div>
                <div style="font-size:1.35rem; font-weight:900; color:#9a3412; margin-top:6px;">${money(pago10PromedioDiario)}</div>
            </div>
            <div class="card" style="border-radius:18px; padding:18px; background:#fefce8; border:1px solid #fde047;">
                <div style="font-size:0.82rem; color:#a16207; font-weight:700;">Servicios Totales</div>
                <div style="font-size:1.35rem; font-weight:900; color:#854d0e; margin-top:6px;">${money(serviciosCalc.total)}</div>
            </div>
            <div class="card" style="border-radius:18px; padding:18px; background:#fff1f2; border:1px solid #fda4af;">
                <div style="font-size:0.82rem; color:#be123c; font-weight:700;">Gas Diario</div>
                <div style="font-size:1.35rem; font-weight:900; color:#9f1239; margin-top:6px;">${money(serviciosCalc.gasPromedioDiario)}</div>
            </div>
            <div class="card" style="border-radius:18px; padding:18px; background:#ecfdf5; border:1px solid #86efac;">
                <div style="font-size:0.82rem; color:#15803d; font-weight:700;">Materia Prima</div>
                <div style="font-size:1.35rem; font-weight:900; color:#166534; margin-top:6px;">${money(costoMateriaPrima)}</div>
            </div>
            <div class="card" style="border-radius:18px; padding:18px; background:#eff6ff; border:1px solid #93c5fd;">
                <div style="font-size:0.82rem; color:#1d4ed8; font-weight:700;">Comisiones</div>
                <div style="font-size:1.35rem; font-weight:900; color:#1e40af; margin-top:6px;">${money(comisiones.total)}</div>
            </div>
        </div>
    `;

    // =========================
    // TABLA PRINCIPAL
    // =========================
    html += `
        <div class="card" style="border-radius:28px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 16px 40px rgba(15,23,42,0.08);">
            <div style="padding:22px 24px; background:linear-gradient(135deg,#ffffff,#f8fafc); border-bottom:1px solid #e2e8f0;">
                <h3 style="margin:0; display:flex; align-items:center; gap:10px;">
                    <span style="width:42px; height:42px; border-radius:14px; background:#eff6ff; display:flex; align-items:center; justify-content:center; color:#2563eb;">
                        <i class="fas fa-file-invoice-dollar"></i>
                    </span>
                    Estado de Resultados
                </h3>
                <p style="margin:6px 0 0 52px; color:#64748b;">Desglose completo del período seleccionado</p>
            </div>

            <div class="table-container" style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; min-width:980px; font-size:0.95rem;">
                    <thead>
                        <tr style="background:#0f172a; color:white;">
                            <th style="padding:16px 20px; text-align:left;">Concepto</th>
                            <th style="padding:16px 20px; text-align:right;">Monto</th>
                            <th style="padding:16px 20px; text-align:right;">% sobre Ingresos</th>
                        </tr>
                    </thead>

                    <thead>
                        <tr style="background:#ecfdf5;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #bbf7d0;">
                                <i class="fas fa-arrow-up" style="color:#16a34a; margin-right:10px;"></i> INGRESOS
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fila('Ingreso x Venta (EFECTIVO)', ventaEfectivo)}
                        ${fila('Ingreso x Venta (BAC)', ventaBAC)}
                        ${fila('Ingreso x Venta (UBER)', ventaUber)}
                        ${fila('Ingreso x Venta (PEDIDOS YA)', ventaPedidosYa)}
                        ${fila('Ingreso x Venta (DIDI FOOD)', ventaDidi)}
                        ${fila('Ingreso x Venta (PERSONAL)', ventaPersonal)}
                        ${filaTotal('TOTAL GENERAL INGRESOS', totalVentas, '#f0fdf4', '#166534')}
                    </tbody>

                    <thead>
                        <tr style="background:#fff7ed;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #fdba74;">
                                <i class="fas fa-store" style="color:#ea580c; margin-right:10px;"></i> GASTOS OPERATIVOS
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fila('Gasto x Nómina - Planilla Base', gastosOperativos.planillaBase)}
                        ${fila('Gasto x Nómina - Horas Extras', gastosOperativos.horasExtras)}
                        ${fila('Gasto x Nómina - Horas Nocturnas', gastosOperativos.horasNocturnas)}
                        ${fila('Gasto x Nómina - Horas Extra Nocturnas', gastosOperativos.extrasNocturnas)}
                        ${fila('Gasto x CCSS (26.5%)', gastosOperativos.ccss)}
                        ${fila('Cesantía (5.33%)', gastosOperativos.cesantia)}
                        ${fila('Vacaciones (4.16%)', gastosOperativos.vacaciones)}
                        ${fila('Aguinaldos (8.33%)', gastosOperativos.aguinaldos)}
                        ${fila('Gasto x Pago 10%', gastosOperativos.pago10Diario)}
                        ${fila('Gasto x Arrendamiento', gastosOperativos.arrendamiento)}
                        ${fila('Gasto x Servicio Eléctrico', gastosOperativos.servicioElectrico)}
                        ${fila('Gasto x Servicio Gas', gastosOperativos.servicioGasDiario)}
                        ${fila('Gasto x Servicio Agua', gastosOperativos.servicioAgua)}
                        ${fila('GASTO x COMPRA PROVEEDORES', gastosOperativos.comprasProveedores)}
                        ${fila('Gasto x Costo Diario (MATERIA PRIMA)', gastosOperativos.costoDiarioMateriaPrima)}
                        ${fila('Gasto x Merma', gastosOperativos.mermas)}
                        ${fila('Préstamos a Empleados', gastosOperativos.prestamosEmpleados)}
                        ${filaTotal('TOTAL GASTOS OPERATIVOS', totalGastosOperativos, '#fff7ed', '#c2410c')}
                    </tbody>

                    <thead>
                        <tr style="background:#eff6ff;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #93c5fd;">
                                <i class="fas fa-truck" style="color:#2563eb; margin-right:10px;"></i> GASTOS ADMINISTRATIVOS & LOGÍSTICA
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fila('GASTO x SOFTWARE SECSA', gastosAdminLogistica.secsa)}
                        ${fila('GASTO x SOFT-RESTAURANT', gastosAdminLogistica.softRestaurant)}
                        ${fila('INTERNET', gastosAdminLogistica.internetKolbi)}
                        ${fila('TELEVISIÓN', gastosAdminLogistica.televisionKolbi)}
                        ${fila('Gasto x Servicio ADT', gastosAdminLogistica.adt)}
                        ${fila('Gasto x Servicio Fumigación', gastosAdminLogistica.fumigacion)}
                        ${fila('Gasto x Póliza RT', gastosAdminLogistica.polizaRT)}
                        ${fila('GASTO x DEPRECIACION ACTIVOS', gastosAdminLogistica.depreciacionActivos)}
                        ${fila('GASTO x PATENTE COMERCIAL', gastosAdminLogistica.patenteComercial)}
                        ${fila('GASTO x PATENTE LICORES', gastosAdminLogistica.patenteLicores)}
                        ${fila('BASURA MUNICIPAL', gastosAdminLogistica.basuraMunicipal)}
                        ${fila('INTERESES x MORA PATENTE', gastosAdminLogistica.interesesMoraPatente)}
                        ${fila('CERTIFICACION DE GAS', gastosAdminLogistica.certificacionGas)}
                        ${fila('CERTIFICACION ELECTRICA', gastosAdminLogistica.certificacionElectrica)}
                        ${fila('GASTO x RENOVACIÓN SALUD', gastosAdminLogistica.renovacionMinisterioSalud)}
                        ${fila('MANTENIMIENTO', gastosAdminLogistica.mantenimiento)}
                        ${fila('ASESORIA LEGAL RH', gastosAdminLogistica.asesoriaLegalRH)}
                        ${fila('Honorarios Contabilidad', gastosAdminLogistica.honorariosContabilidad)}
                        ${fila('SERV. PROF PUBLICIDAD', gastosAdminLogistica.publicidad)}
                        ${fila('OTROS SERVICIOS PROFESIONALES', gastosAdminLogistica.otrosServiciosProfesionales)}
                        ${fila('Electricidad Planta', gastosAdminLogistica.electricidadPlanta)}
                        ${fila('Agua Planta', gastosAdminLogistica.aguaPlanta)}
                        ${fila('ADT Planta', gastosAdminLogistica.adtPlanta)}
                        ${fila('Gasto x Comisión Datafonos (BAC)', gastosAdminLogistica.comisionBAC)}
                        ${fila('Gasto x Comisión (UBER)', gastosAdminLogistica.comisionUber)}
                        ${fila('Gasto x Comisión (PEDIDOS YA)', gastosAdminLogistica.comisionPedidosYa)}
                        ${fila('Gasto x Comisión (DIDI FOOD)', gastosAdminLogistica.comisionDidi)}
                        ${filaTotal('TOTAL GASTOS ADMINISTRATIVOS & LOGÍSTICA', totalGastosAdminLogistica, '#eff6ff', '#1d4ed8')}
                    </tbody>

                    <thead>
                        <tr style="background:#fef2f2;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #fca5a5;">
                                <i class="fas fa-file-invoice" style="color:#dc2626; margin-right:10px;"></i> IMPUESTOS Y RETENCIONES
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filaTotal('TOTAL GENERAL GASTOS', totalGastos, '#fef2f2', '#b91c1c')}
                        ${fila('Utilidad Antes de Impuestos', utilidadAntesImpuestos)}
                        ${fila('IVA (Impuesto Valor Agregado)', iva)}
                        ${fila('Retención de tarjeta (5.31%) - imp venta', retencionTarjetaVenta)}
                        ${fila('Utilidad antes del impuesto de renta', utilidadAntesRenta)}
                        ${fila('Impuesto de Renta (30%)', impuestoRenta)}
                        ${fila('Retención de tarjeta (1.71%) - imp renta', retencionTarjetaRenta)}
                    </tbody>

                    <thead>
                        <tr style="background:#f0fdf4;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #86efac;">
                                <i class="fas fa-trophy" style="color:#16a34a; margin-right:10px;"></i> RESULTADO FINAL
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background:#f0fdf4;">
                            <td style="padding:18px 20px; font-weight:900; font-size:1.08rem;">UTILIDAD O PÉRDIDA NETA</td>
                            <td style="padding:18px 20px; text-align:right; font-weight:900; font-size:1.08rem; color:${utilidadNeta >= 0 ? '#166534' : '#b91c1c'};">${money(utilidadNeta)}</td>
                            <td style="padding:18px 20px; text-align:right; font-weight:900; font-size:1.08rem; color:${utilidadNeta >= 0 ? '#166534' : '#b91c1c'};">${margenUtilidad.toFixed(2)}%</td>
                        </tr>
                        <tr>
                            <td style="padding:12px 20px;">Margen de Utilidad</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700;">${margenUtilidad.toFixed(2)}%</td>
                            <td style="padding:12px 20px; text-align:right; color:#64748b;">sobre ingresos</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div style="margin-top:20px; padding:15px; background:#f8fafc; border-radius:16px; text-align:center; font-size:0.82rem; color:#64748b;">
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