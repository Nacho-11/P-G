// modules/resumen.js

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
    if (filtroTiempo === 'anio') return fechaItem.substring(0, 4) === anioActual;
    if (filtroTiempo === 'personalizado') return fechaItem === fechaPersonalizada;
    if (filtroTiempo === 'rango') {
        if (!fechaInicio || !fechaFin) return true;
        return fechaItem >= fechaInicio && fechaItem <= fechaFin;
    }
    return true;
}

// ============================================
// FUNCIÓN PARA OBTENER DATOS DE SERVICIOS
// ============================================

function obtenerServiciosData() {
    if (window.serviciosData && Object.keys(window.serviciosData).length > 0) {
        console.log('📊 Datos de servicios obtenidos de window.serviciosData:', Object.keys(window.serviciosData));
        return window.serviciosData;
    }
    
    if (window.serviciosData && Object.keys(window.serviciosData).length === 0) {
        console.log('⏳ Datos de servicios vacíos, forzando carga...');
        if (typeof window.cargarServiciosFirebase === 'function') {
            window.cargarServiciosFirebase();
        }
    }
    
    if (!window.serviciosData) {
        console.log('⏳ window.serviciosData no existe, esperando...');
        if (typeof window.cargarServiciosFirebase === 'function') {
            window.cargarServiciosFirebase();
        }
    }
    
    return window.serviciosData || {};
}

// ============================================
// CÁLCULOS DE PLANILLA Y PRESTAMOS
// ============================================

function calcularPlanilla(planillaData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) {
    let totalOrdinarias = 0;
    let totalExtras = 0;
    let totalNocturnas = 0;
    let totalExtrasNocturnas = 0;
    
    if (!planillaData || Object.keys(planillaData).length === 0) {
        return { salarioBase: 0, horasExtras: 0, nocturnas: 0, extrasNocturnas: 0, total: 0 };
    }
    
    const localesAFiltrar = filtroLocal === 'Todos' 
        ? Object.keys(planillaData) 
        : [filtroLocal];
    
    localesAFiltrar.forEach(local => {
        if (!planillaData[local]) return;
        if (typeof window.puedeVerLocal === 'function' && !window.puedeVerLocal(local)) return;
        
        const empleados = planillaData[local] || [];
        
        empleados.forEach(emp => {
            // NO FILTRAR POR ACTIVO - igual que planilla.js
            const salarioMensual = emp.salario || 0;
            const valorHora = salarioMensual / 240;
            const esAñosLocos = local.includes('Los Años Locos');
            const valorHoraNocturna = salarioMensual / 180;
            const horasJornada = 8;
            
            // Si tiene horas registradas
            if (emp.horas && Object.keys(emp.horas).length > 0) {
                Object.keys(emp.horas).forEach(fechaStr => {
                    const horas = emp.horas[fechaStr];
                    const horasOrdinariasDia = Math.min(horas.ordinarias || 0, horasJornada);
                    
                    // 🔥 PLANILLA BASE: TODAS las horas ordinarias de TODOS los días (SIN FILTRAR)
                    if (esAñosLocos) {
                        totalOrdinarias += horasOrdinariasDia * valorHoraNocturna;
                    } else {
                        totalOrdinarias += horasOrdinariasDia * valorHora;
                    }
                    
                    // 🔥 HORAS EXTRAS: TODAS las horas extras de TODOS los días (SIN FILTRAR)
                    // El módulo Planilla muestra todas las horas extras del mes, sin importar el filtro
                    const horasExtrasDia = Math.max(0, (horas.ordinarias || 0) - horasJornada);
                    const horasExtrasAdicionales = horas.extras || 0;
                    
                    if (esAñosLocos) {
                        totalExtras += (horasExtrasDia + horasExtrasAdicionales + (horas.extrasNocturnas || 0)) * valorHoraNocturna * 1.5;
                    } else {
                        totalExtras += (horasExtrasDia + horasExtrasAdicionales) * valorHora * 1.5;
                        totalNocturnas += (horas.nocturnas || 0) * valorHoraNocturna;
                        totalExtrasNocturnas += (horas.extrasNocturnas || 0) * valorHoraNocturna * 1.5;
                    }
                });
            } else {
                // Si no tiene horas, usar salario mensual
                totalOrdinarias += salarioMensual;
            }
        });
    });
    
    const totalGeneral = totalOrdinarias + totalExtras + totalNocturnas + totalExtrasNocturnas;
    
    return { 
        salarioBase: totalOrdinarias,
        horasExtras: totalExtras,
        nocturnas: totalNocturnas,
        extrasNocturnas: totalExtrasNocturnas,
        total: totalGeneral 
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

    if (filtroTiempo === 'todos') {
        return 1;
    }

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

    if (filtroTiempo === 'mes') {
        return 1;
    }

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
        certificacionElectrica: 0, renovacionMinisterioSalud: 0, asesoriaLegalRH: 0,
        honorariosContabilidad: 0, publicidad: 0, otrosServiciosProfesionales: 0,
        electricidadPlanta: 0, aguaPlanta: 0, adtPlanta: 0, fumigacionPlanta: 0,
        softwareSecsaPlanta: 0, ivaHaciendaPlanta: 0, asesoriaLegalPlanta: 0,
        electricidadOficinas: 0, aguaOficinas: 0, internetOficinas: 0,
        telefonoCelulares: 0, adtOficinas: 0, mantenimientoPapeleria: 0,
        softwareHosting: 0,
        combustible: 0, electricidadBodegas: 0, aguaBodegas: 0, alquilerTaller: 0,
        gpsNavsat: 0, marchamos: 0, dekra: 0, mantenimientoVehiculos: 0,
        planillaBodega: 0, alexDuque: 0, polizaRTBodega: 0,
        ccssBodegaOficinas: 0, planillaOficinas: 0,
        iva: 0,
        impuestoRenta: 0,
        totalRestaurante: 0,
        totalPlanta: 0,
        totalOficinas: 0,
        totalTransporte: 0,
        totalPlanillaLogistica: 0
    };

    if (!costosData || Object.keys(costosData).length === 0) {
        console.warn('⚠️ No hay datos de costos disponibles');
        return resultado;
    }

    const factorPeriodo = obtenerFactorPeriodoCostos(
        filtroTiempo,
        fechaPersonalizada,
        fechaInicio,
        fechaFin
    );

    console.log(`📊 Factor de período para costos: ${factorPeriodo}`);

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
                    const conceptoLower = concepto.toLowerCase();
                    
                    if (conceptoLower.includes('hacienda') && conceptoLower.includes('iva')) {
                        resultado.iva += montoAplicable;
                    } else if (conceptoLower.includes('iva') && !conceptoLower.includes('renta') && !conceptoLower.includes('hacienda')) {
                        resultado.iva += montoAplicable;
                    } else if (conceptoLower.includes('alquiler') && !conceptoLower.includes('iva')) {
                        resultado.alquilerLocal += montoAplicable;
                    } else if (conceptoLower.includes('secsa')) {
                        resultado.secsa += montoAplicable;
                    } else if (conceptoLower.includes('soft restaurant') || conceptoLower.includes('soft-restaurant')) {
                        resultado.softRestaurant += montoAplicable;
                    } else if (conceptoLower.includes('internet') && !conceptoLower.includes('iva')) {
                        resultado.internetKolbi += montoAplicable;
                    } else if ((conceptoLower.includes('television') || conceptoLower.includes('tv')) && !conceptoLower.includes('iva')) {
                        resultado.televisionKolbi += montoAplicable;
                    } else if ((conceptoLower.includes('adt') || conceptoLower.includes('alarma')) && !conceptoLower.includes('iva')) {
                        resultado.adt += montoAplicable;
                    } else if (conceptoLower.includes('fumigacion') && !conceptoLower.includes('iva')) {
                        resultado.fumigacion += montoAplicable;
                    } else if ((conceptoLower.includes('poliza') || conceptoLower.includes('póliza') || conceptoLower.includes('rt')) && !conceptoLower.includes('iva')) {
                        resultado.polizaRT += montoAplicable;
                    } else if (conceptoLower.includes('depreciacion') && !conceptoLower.includes('iva')) {
                        resultado.depreciacionActivos += montoAplicable;
                    } else if (conceptoLower.includes('patente comercial')) {
                        resultado.patenteComercial += montoAplicable;
                    } else if (conceptoLower.includes('patente licores')) {
                        resultado.patenteLicores += montoAplicable;
                    } else if (conceptoLower.includes('basura') && !conceptoLower.includes('iva')) {
                        resultado.basuraMunicipal += montoAplicable;
                    } else if ((conceptoLower.includes('interes') || conceptoLower.includes('mora')) && !conceptoLower.includes('iva')) {
                        resultado.interesesMoraPatente += montoAplicable;
                    } else if ((conceptoLower.includes('certificacion gas') || conceptoLower.includes('certificación gas')) && !conceptoLower.includes('iva')) {
                        resultado.certificacionGas += montoAplicable;
                    } else if ((conceptoLower.includes('certificacion electrica') || conceptoLower.includes('certificación eléctrica')) && !conceptoLower.includes('iva')) {
                        resultado.certificacionElectrica += montoAplicable;
                    } else if ((conceptoLower.includes('renovacion') || conceptoLower.includes('ministerio') || conceptoLower.includes('renovación')) && !conceptoLower.includes('iva')) {
                        resultado.renovacionMinisterioSalud += montoAplicable;
                    } else if (conceptoLower.includes('asesoria legal') || conceptoLower.includes('asesoría legal')) {
                        resultado.asesoriaLegalRH += montoAplicable;
                    } else if (conceptoLower.includes('honorarios contabilidad') && !conceptoLower.includes('iva')) {
                        resultado.honorariosContabilidad += montoAplicable;
                    } else if (conceptoLower.includes('publicidad') && !conceptoLower.includes('iva')) {
                        resultado.publicidad += montoAplicable;
                    } else if ((conceptoLower.includes('otros servicios') || conceptoLower.includes('otros servicios profesionales')) && !conceptoLower.includes('iva')) {
                        resultado.otrosServiciosProfesionales += montoAplicable;
                    }
                    
                    resultado.totalRestaurante += montoAplicable;
                    
                } else if (subCategoria === 'planta') {
                    if (concepto.includes('electricidad')) {
                        resultado.electricidadPlanta += montoAplicable;
                    } else if (concepto.includes('agua')) {
                        resultado.aguaPlanta += montoAplicable;
                    } else if (concepto.includes('adt') || concepto.includes('alarma')) {
                        resultado.adtPlanta += montoAplicable;
                    } else if (concepto.includes('fumigación')) {
                        resultado.fumigacionPlanta += montoAplicable;
                    } else if (concepto.includes('software secsa')) {
                        resultado.softwareSecsaPlanta += montoAplicable;
                    } else if (concepto.includes('iva')) {
                        resultado.ivaHaciendaPlanta += montoAplicable;
                    } else if (concepto.includes('asesoría legal')) {
                        resultado.asesoriaLegalPlanta += montoAplicable;
                    }
                    resultado.totalPlanta += montoAplicable;
                    
                } else if (subCategoria === 'oficinas') {
                    if (concepto.includes('electricidad')) {
                        resultado.electricidadOficinas += montoAplicable;
                    } else if (concepto.includes('agua')) {
                        resultado.aguaOficinas += montoAplicable;
                    } else if (concepto.includes('internet')) {
                        resultado.internetOficinas += montoAplicable;
                    } else if (concepto.includes('teléfono') || concepto.includes('telefono') || concepto.includes('celular')) {
                        resultado.telefonoCelulares += montoAplicable;
                    } else if (concepto.includes('adt')) {
                        resultado.adtOficinas += montoAplicable;
                    } else if (concepto.includes('software') || concepto.includes('hosting') || concepto.includes('office')) {
                        resultado.softwareHosting += montoAplicable;
                    }
                    resultado.totalOficinas += montoAplicable;
                    
                } else if (subCategoria === 'transporte') {
                    if (concepto.includes('combustible')) {
                        resultado.combustible += montoAplicable;
                    } else if (concepto.includes('electricidad')) {
                        resultado.electricidadBodegas += montoAplicable;
                    } else if (concepto.includes('agua')) {
                        resultado.aguaBodegas += montoAplicable;
                    } else if (concepto.includes('alquiler')) {
                        resultado.alquilerTaller += montoAplicable;
                    } else if (concepto.includes('gps')) {
                        resultado.gpsNavsat += montoAplicable;
                    } else if (concepto.includes('marchamo')) {
                        resultado.marchamos += montoAplicable;
                    } else if (concepto.includes('dekra')) {
                        resultado.dekra += montoAplicable;
                    } else if (concepto.includes('mantenimiento')) {
                        resultado.mantenimientoVehiculos += montoAplicable;
                    }
                    resultado.totalTransporte += montoAplicable;
                    
                } else if (subCategoria === 'planilla') {
                    if (concepto.includes('planilla bodega')) {
                        resultado.planillaBodega += montoAplicable;
                    } else if (concepto.includes('alex duque')) {
                        resultado.alexDuque += montoAplicable;
                    } else if (concepto.includes('poliza rt')) {
                        resultado.polizaRTBodega += montoAplicable;
                    } else if (concepto.includes('ccss')) {
                        resultado.ccssBodegaOficinas += montoAplicable;
                    } else if (concepto.includes('planilla oficinas')) {
                        resultado.planillaOficinas += montoAplicable;
                    }
                    resultado.totalPlanillaLogistica += montoAplicable;
                }
            });
        });
    });

    console.log('📊 Resultado de costos fijos:', {
        iva: resultado.iva,
        totalRestaurante: resultado.totalRestaurante,
        totalPlanta: resultado.totalPlanta,
        totalOficinas: resultado.totalOficinas,
        totalTransporte: resultado.totalTransporte,
        totalPlanillaLogistica: resultado.totalPlanillaLogistica
    });

    return resultado;
}

// ============================================
// CÁLCULOS DE SERVICIOS
// ============================================

function calcularServicios(filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) {
    const serviciosData = obtenerServiciosData();
    
    if (!serviciosData || Object.keys(serviciosData).length === 0) {
        console.warn('⚠️ No hay datos de servicios disponibles en calcularServicios');
        return { agua: 0, electricidad: 0, gas: 0, gasTotalPeriodo: 0, gasPromedioDiario: 0, total: 0 };
    }
    
    console.log('📊 Datos de servicios recibidos en calcularServicios:', serviciosData);
    console.log('📊 Filtros:', { filtroLocal, filtroTiempo, fechaInicio, fechaFin });
    
    let agua = 0, electricidad = 0, gas = 0, total = 0;
    let gasPromedioDiario = 0;
    let gasTotalPeriodo = 0;
    let contadorGas = 0;
    let contadorTotal = 0;
    
    Object.keys(serviciosData).forEach(local => {
        if (filtroLocal !== 'Todos' && local !== filtroLocal) {
            return;
        }
        if (typeof window.puedeVerLocal === 'function' && !window.puedeVerLocal(local)) {
            return;
        }
        
        (serviciosData[local] || []).forEach(s => {
            if (!s.fecha) return;
            
            let fechaItem = s.fecha;
            if (fechaItem.includes('T')) fechaItem = fechaItem.split('T')[0];
            
            // FILTRO DE FECHA
            let fechaValida = false;
            if (filtroTiempo === 'todos') {
                fechaValida = true;
            } else if (filtroTiempo === 'ayer') {
                fechaValida = fechaItem === ayerStr;
            } else if (filtroTiempo === 'mes') {
                fechaValida = fechaItem.substring(0, 7) === mesActual;
            } else if (filtroTiempo === 'anio') {
                fechaValida = fechaItem.substring(0, 4) === anioActual;
            } else if (filtroTiempo === 'personalizado') {
                fechaValida = fechaItem === fechaPersonalizada;
            } else if (filtroTiempo === 'rango') {
                if (!fechaInicio || !fechaFin) {
                    fechaValida = true;
                } else {
                    fechaValida = fechaItem >= fechaInicio && fechaItem <= fechaFin;
                }
            } else {
                fechaValida = true;
            }
            
            if (!fechaValida) return;
            
            contadorTotal++;
            
            // ✅ CALCULAR MONTO - MISMA LÓGICA QUE renderServicios()
            let montoServicio = 0;
            
            if (s.servicio === 'Agua') {
                // ✅ SIEMPRE calcular con consumoTotal * precio (como en renderServicios)
                if (s.consumoTotal && s.consumoTotal > 0) {
                    const precio = window.obtenerPrecioLocal ? window.obtenerPrecioLocal(local, 'Agua') : 1528.68;
                    montoServicio = s.consumoTotal * precio;
                    console.log(`💧 Agua - ${local}: ${s.consumoTotal} M³ * ₡${precio} = ₡${montoServicio}`);
                } else {
                    // Fallback: usar s.monto si existe
                    montoServicio = s.monto || 0;
                    console.log(`💧 Agua - ${local}: usando monto guardado ₡${montoServicio}`);
                }
            } else if (s.servicio === 'Electricidad') {
                // ✅ SIEMPRE calcular con consumoTotal * precio (como en renderServicios)
                if (s.consumoTotal && s.consumoTotal > 0) {
                    const precio = window.obtenerPrecioLocal ? window.obtenerPrecioLocal(local, 'Electricidad') : 126.84;
                    montoServicio = s.consumoTotal * precio;
                    console.log(`⚡ Electricidad - ${local}: ${s.consumoTotal} kWh * ₡${precio} = ₡${montoServicio}`);
                } else {
                    // Fallback: usar s.monto si existe
                    montoServicio = s.monto || 0;
                    console.log(`⚡ Electricidad - ${local}: usando monto guardado ₡${montoServicio}`);
                }
            } else if (s.servicio === 'Gas') {
                // ✅ Gas: usar monto directo
                montoServicio = s.monto || 0;
                const diasGas = s.dias || 30;
                if (diasGas > 0) {
                    gasPromedioDiario += montoServicio / diasGas;
                }
                contadorGas++;
                console.log(`🔥 Gas - ${local}: ₡${montoServicio}`);
            }
            
            total += montoServicio;
            
            if (s.servicio === 'Agua') {
                agua += montoServicio;
            } else if (s.servicio === 'Electricidad') {
                electricidad += montoServicio;
            } else if (s.servicio === 'Gas') {
                gas += montoServicio;
                gasTotalPeriodo += montoServicio;
            }
        });
    });
    
    if (contadorGas > 0) {
        gasPromedioDiario = gasPromedioDiario / contadorGas;
    }
    
    console.log(`📊 RESULTADO FINAL SERVICIOS (${contadorTotal} registros):`, { 
        agua, 
        electricidad, 
        gas, 
        gasTotalPeriodo, 
        gasPromedioDiario, 
        total 
    });
    
    return { agua, electricidad, gas, gasTotalPeriodo, gasPromedioDiario, total };
}

// ============================================
// CÁLCULOS DE VENTAS Y COMISIONES
// ============================================

function calcularComisionesVentas(ventasFiltradas) {
    let comisionUber = 0;
    let comisionPedidosYa = 0;
    let comisionDidi = 0;
    let comisionDatafonos = 0;
    
    ventasFiltradas.forEach(v => {
        if (v.comisiones) {
            comisionUber += v.comisiones.uber || 0;
            comisionPedidosYa += v.comisiones.pedidosYa || 0;
            comisionDidi += v.comisiones.didi || 0;
            comisionDatafonos += v.comisiones.bac || 0;
        } else {
            console.warn('⚠️ Venta sin comisiones calculadas:', v.id);
            comisionUber += (v.uber || 0) * 0.44;
            comisionPedidosYa += (v.pedidosYa || 0) * 0.18;
            comisionDidi += (v.didi || 0) * 0.18;
            comisionDatafonos += (v.bac || 0) * 0.0225;
        }
    });
    
    const total = comisionUber + comisionPedidosYa + comisionDidi + comisionDatafonos;
    
    console.log('📊 COMISIONES CALCULADAS:', {
        uber: comisionUber,
        pedidosYa: comisionPedidosYa,
        didi: comisionDidi,
        datafonos: comisionDatafonos,
        total: total
    });
    
    return {
        uber: comisionUber,
        pedidosYa: comisionPedidosYa,
        didi: comisionDidi,
        datafonos: comisionDatafonos,
        total: total
    };
}

function calcularReembolsoDelivery(ventasFiltradas) {
    const totalDelivery = ventasFiltradas.reduce((sum, v) => sum + (v.pedidosYa || 0) + (v.didi || 0) + (v.uber || 0), 0);
    return totalDelivery * 0.10;
}

// ============================================
// CALCULAR PAGO 10%
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
// RENDERIZAR RESUMEN (VERSIÓN CORREGIDA)
// ============================================

async function renderResumen() {
    console.log('📊 Renderizando Resumen Financiero...');
    
    const resumenContent = document.getElementById('resumenContent');
    if (!resumenContent) {
        console.error('❌ Elemento resumenContent no encontrado');
        return;
    }
    
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
    const costos = window.costosData || {};

    const filtrarPorLocalFn = (item, local) => {
        if (local === 'Todos') return true;
        return item.local === local;
    };

    const ventasFiltradas = ventas.filter(v => 
        filtrarPorFecha(v, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocalFn(v, filtroLocal)
    );

    const comprasFiltradas = compras.filter(c => 
        filtrarPorFecha(c, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocalFn(c, filtroLocal)
    );
    
    const facturasFiltradas = facturas.filter(f => 
        filtrarPorFecha(f, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocalFn(f, filtroLocal)
    );
    
    const mermasFiltradas = mermas.filter(m => 
        filtrarPorFecha(m, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocalFn(m, filtroLocal)
    );
    
    // ============================================
    // INGRESOS
    // ============================================
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    const ventaEfectivo = ventasFiltradas.reduce((sum, v) => sum + (v.efectivo || 0), 0);
    const ventaBAC = ventasFiltradas.reduce((sum, v) => sum + (v.bac || 0), 0);
    const ventaUber = ventasFiltradas.reduce((sum, v) => sum + (v.uber || 0), 0);
    const ventaPedidosYa = ventasFiltradas.reduce((sum, v) => sum + (v.pedidosYa || 0), 0);
    const ventaDidi = ventasFiltradas.reduce((sum, v) => sum + (v.didi || 0), 0);
    const ventaPersonal = ventasFiltradas.reduce((sum, v) => sum + (v.personal || 0), 0);
    
    // ============================================
    // GASTOS BASE
    // ============================================
    const planillaCalc = calcularPlanilla(planilla, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin);
    const prestamosTotal = calcularPrestamos(prestamos, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin);
    const comisiones = calcularComisionesVentas(ventasFiltradas);
    const pago10Result = calcularPago10DesdeModulo(ventasFiltradas, filtroLocal, filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin, diasPeriodo);
    const pago10 = pago10Result.total;
    const pago10PromedioDiario = pago10Result.promedioDiario;
    const costoMateriaPrima = calcularCostoMateriaPrima(comprasFiltradas);
    const facturacionBodegasTotal = calcularFacturacionBodegas(facturasFiltradas);
    const mermasTotal = calcularMermas(mermasFiltradas);
    
    // ============================================
    // SERVICIOS
    // ============================================
    const serviciosCalc = calcularServicios(
        filtroLocal,
        filtroTiempo,
        ayerStr,
        mesActual,
        anioActual,
        fechaPersonalizada,
        fechaInicio,
        fechaFin
    );
    
    const costosFijos = calcularCostosFijos(
        costos,
        filtroLocal,
        filtroTiempo,
        fechaPersonalizada,
        fechaInicio,
        fechaFin
    );

    // ============================================
    // CARGAS SOCIALES
    // ============================================
    const ccss = (planillaCalc.salarioBase + planillaCalc.horasExtras) * 0.265;
    const cesantia = (planillaCalc.salarioBase + planillaCalc.horasExtras) * 0.0533;
    const vacaciones = planillaCalc.salarioBase * 0.0416;
    const aguinaldos = (planillaCalc.horasExtras + ccss) * 0.0833;

    // ============================================
    // GASTOS OPERATIVOS
    // ============================================
    let valorGas = 0;
    
    if (filtroTiempo === 'mes' || filtroTiempo === 'todos' || filtroTiempo === 'rango') {
        valorGas = serviciosCalc.gasTotalPeriodo || 0;
    } else {
        valorGas = serviciosCalc.gasPromedioDiario || 0;
    }

    const getValorCostosFijos = (valorMensual) => {
        if (!valorMensual) return 0;
        // Usar el factor de período para costos fijos
        if (filtroTiempo === 'mes' || filtroTiempo === 'todos') {
            return valorMensual;
        }
        const dias = diasPeriodo || 30;
        return (valorMensual / dias) * (diasPeriodo || 1);
    };

    const gastosOperativos = [
        { label: 'Gasto x Nómina - Planilla Base', value: planillaCalc.salarioBase },
        { label: 'Gasto x Nómina - Hrs Extras', value: planillaCalc.horasExtras },
        { label: 'Gasto x Nómina - Horas Nocturnas', value: planillaCalc.nocturnas },
        { label: 'Gasto x Nómina - Horas Extra Nocturnas', value: planillaCalc.extrasNocturnas },
        { label: 'Gasto x CCSS - Planilla Base (26.5%)', value: ccss },
        { label: 'Cesantía (5.33%)', value: cesantia },
        { label: 'Ajuste Planilla (Préstamo Locales)', value: prestamosTotal },
        { label: 'Gasto x Provisiones - Vacaciones (4.16%)', value: vacaciones },
        { label: 'Gasto x Provisiones - Aguinaldos (8.33%)', value: aguinaldos },
        { label: 'Gasto x Pago 10%', value: pago10PromedioDiario },
        { label: 'Gasto x Arrendamiento', value: getValorCostosFijos(costosFijos.alquilerLocal || 0) },
        { label: 'Caja Chica', value: 0 },
        { label: 'Gasto x Servicio Eléctrico', value: serviciosCalc.electricidad || 0 },
        { label: 'Gasto x Servicio Gas', value: valorGas },
        { label: 'Gasto por Cortesía', value: 0 },
        { label: 'Gasto x Servicio Agua', value: serviciosCalc.agua || 0 },
        { label: 'TELEVISIÓN', value: getValorCostosFijos(costosFijos.televisionKolbi || 0) },
        { label: 'Gasto x Servicio ADT', value: getValorCostosFijos(costosFijos.adt || 0) },
        { label: 'Gasto x Servicio Fumigación', value: getValorCostosFijos(costosFijos.fumigacion || 0) },
        { label: 'Gasto por Póliza RT', value: getValorCostosFijos(costosFijos.polizaRT || 0) },
        { label: 'GASTO x SOFTWARE SECSA', value: getValorCostosFijos(costosFijos.secsa || 0) },
        { label: 'GASTO por SOFTWARE SOFT-RESTAURANT', value: getValorCostosFijos(costosFijos.softRestaurant || 0) },
        { label: 'GASTO por PATENTE COMERCIAL', value: getValorCostosFijos(costosFijos.patenteComercial || 0) },
        { label: 'GASTO por PATENTE DE LICORES', value: getValorCostosFijos(costosFijos.patenteLicores || 0) },
        { label: 'BASURA MUNICIPAL', value: getValorCostosFijos(costosFijos.basuraMunicipal || 0) },
        { label: 'INTERESES POR MORA DE PATENTE', value: getValorCostosFijos(costosFijos.interesesMoraPatente || 0) },
        { label: 'CERTIFICACIÓN DE GAS', value: getValorCostosFijos(costosFijos.certificacionGas || 0) },
        { label: 'CERTIFICACIÓN ELÉCTRICA', value: getValorCostosFijos(costosFijos.certificacionElectrica || 0) },
        { label: 'GASTO por RENOVACIÓN MINISTERIO DE SALUD', value: getValorCostosFijos(costosFijos.renovacionMinisterioSalud || 0) },
        { label: 'Gasto x Comisión Datafonos (BAC)', value: comisiones.datafonos || 0 },
        { label: 'GASTO x DEPRECIACIÓN DE ACTIVOS', value: getValorCostosFijos(costosFijos.depreciacionActivos || 0) },
        { label: 'Gasto x comisión (UBER)', value: comisiones.uber || 0 },
        { label: 'Gasto x comisión (PEDIDOS YA)', value: comisiones.pedidosYa || 0 },
        { label: 'Gasto x Comisión (DIDI FOOD)', value: comisiones.didi || 0 },
        { label: 'GASTO x COMPRA PROVEEDORES EXTERNOS', value: costoMateriaPrima || 0 },
        { label: 'Gasto x Costo Diario (MATERIA PRIMA)', value: facturacionBodegasTotal || 0 },
        { label: 'Gasto x Merma', value: mermasTotal || 0 },
        { label: 'Reembolso Delivery', value: 0 },
        { label: 'INTERNET-INTERNET', value: getValorCostosFijos(costosFijos.internetKolbi || 0) }
    ];

    const totalGastosOperativos = gastosOperativos.reduce((sum, item) => sum + (item.value || 0), 0);

    // ============================================
    // GASTOS ADMINISTRATIVOS & LOGÍSTICA
    // ============================================
        let porcentajeLocal = 1;
    if (filtroLocal !== 'Todos' && filtroLocal !== 'Todos los locales') {
        porcentajeLocal = await obtenerPorcentajeLocal(filtroLocal);
        console.log(`📊 Porcentaje para ${filtroLocal}: ${(porcentajeLocal * 100).toFixed(2)}%`);
    }

    const getValor = (valorMensual) => {
        if (!valorMensual) return 0;
        
        // Si es "todos" o "mes", mostrar valor mensual
        if (filtroTiempo === 'todos' || filtroTiempo === 'mes') {
            return valorMensual * porcentajeLocal;
        }
        
        let mesReferencia = new Date();
        if (filtroTiempo === 'rango' && fechaInicio) {
            mesReferencia = new Date(fechaInicio + 'T12:00:00');
        } else if (filtroTiempo === 'ayer' && ayerStr) {
            mesReferencia = new Date(ayerStr + 'T12:00:00');
        } else if (filtroTiempo === 'personalizado' && fechaPersonalizada) {
            mesReferencia = new Date(fechaPersonalizada + 'T12:00:00');
        }
        
        // Calcular días del mes de referencia
        const year = mesReferencia.getFullYear();
        const month = mesReferencia.getMonth();
        const diasDelMes = new Date(year, month + 1, 0).getDate();
        
        // Valor diario = mensual / días del mes
        const valorDiario = valorMensual / diasDelMes;
        
        // Multiplicar por los días del período
        return valorDiario * diasPeriodo * porcentajeLocal;
    };

    const gastosAdminLogistica = [
        { label: 'Gasto x Honorarios Servicios Asesoria Legal RH', value: costosFijos.asesoriaLegalRH || 0 },
        { label: 'Gasto x Honorarios Contabilidad', value: costosFijos.honorariosContabilidad || 0 },
        { label: 'Gasto x Servicios Publicidad', value: costosFijos.publicidad || 0 },
        { label: 'Gasto x Otros Servicios Profesionales', value: costosFijos.otrosServiciosProfesionales || 0 },
        { label: 'Gasto x Planta Producción (Costos Fijos)', value: getValor(costosFijos.totalPlanta || 0) },
        { label: 'Gasto x Oficinas (Costos Fijos)', value: getValor(costosFijos.totalOficinas || 0) },
        { label: 'Gasto x Bodega & Transporte (Costos Fijos)', value: getValor(costosFijos.totalTransporte || 0) },
        { label: 'Gasto x Planillas (SALARIOS LOGÍSTICA)', value: getValor(costosFijos.totalPlanillaLogistica || 0) }
    ];

    const totalGastosAdminLogistica = gastosAdminLogistica.reduce((sum, item) => sum + (item.value || 0), 0);

    // ============================================
    // TOTALES E IMPUESTOS
    // ============================================
    
    const totalIngresos = totalVentas;
    
    const totalGastos = totalGastosOperativos + totalGastosAdminLogistica;
    
    const utilidadAntesImpuestos = totalIngresos - totalGastos;
    
    const iva = costosFijos.iva || costosFijos.haciendaIVA || 0;
    
    const retencionTarjetaVenta = ventaBAC * 0.0531;
    
    const utilidadAntesRenta = utilidadAntesImpuestos - (retencionTarjetaVenta + iva);
    
    const impuestoRenta = utilidadAntesRenta > 0 ? utilidadAntesRenta * 0.30 : 0;
    
    const utilidadDespuesRenta = utilidadAntesRenta - impuestoRenta;
    
    const retencionTarjetaRenta = ventaBAC * 0.0171;
    
    const utilidadNeta = utilidadDespuesRenta - retencionTarjetaRenta;
    
    const margenUtilidad = totalVentas > 0 ? ((totalVentas - totalGastos) / totalVentas) * 100 : 0;

    const esUtilidad = utilidadNeta >= 0;
    const tipoResultado = esUtilidad ? 'UTILIDAD' : 'PÉRDIDA';

    console.log('📊 FÓRMULAS EXCEL - Resumen:', {
        '(Ingresos)': totalIngresos,
        '(Gastos)': totalGastos,
        '(Utilidad Antes Imp)': utilidadAntesImpuestos,
        '(IVA)': iva,
        '(Venta BAC)': ventaBAC,
        '(Ret 5.31%)': retencionTarjetaVenta,
        '(Utilidad Antes Renta)': utilidadAntesRenta,
        '(Imp Renta)': impuestoRenta,
        '(Utilidad Desp Renta)': utilidadDespuesRenta,
        '(Ret 1.71%)': retencionTarjetaRenta,
        '(Utilidad Neta)': utilidadNeta
    });

    // ============================================
    // FUNCIONES DE FORMATO
    // ============================================
        
    const pctIngresos = (valor) => totalVentas > 0 ? ((valor / totalVentas) * 100).toFixed(2) : '0.00';

    const pctGastosOperativos = (valor) => totalGastosOperativos > 0 ? ((valor / totalGastosOperativos) * 100).toFixed(2) : '0.00';

    const pctGastosTotales = (valor) => totalGastos > 0 ? ((valor / totalGastos) * 100).toFixed(2) : '0.00';

    // Para compatibilidad
    const porcentaje = pctIngresos;

    const money = (n) => `₡${Math.round(n || 0).toLocaleString()}`;
    
    const moneySigned = (n) => {
        const valor = n || 0;
        if (valor < 0) {
            return `-${money(Math.abs(valor))}`;
        }
        return money(valor);
    };

    // Fila para INGRESOS (usa pctIngresos)
    const fila = (label, value, percent = true, extraStyle = '') => `
        <tr style="${extraStyle}">
            <td style="padding: 8px 20px 8px 40px; font-size: 0.9rem; color: #334155;">${label}</td>
            <td style="padding: 8px 20px; text-align: right; font-weight: 600;">${money(value)}</td>
            <td style="padding: 8px 20px; text-align: right; color: #64748b; font-weight: 600;">${percent ? pctIngresos(value) + '%' : '—'}</td>
        </tr>
    `;

    // Fila TOTAL para INGRESOS (usa pctIngresos)
    const filaTotal = (label, value, bg, color) => `
        <tr style="background:${bg}; font-weight:800; border-top:2px solid #e2e8f0;">
            <td style="padding: 12px 20px;">${label}</td>
            <td style="padding: 12px 20px; text-align: right; color:${color}; font-weight:800;">${money(value)}</td>
            <td style="padding: 12px 20px; text-align: right; color:${color}; font-weight:800;">${pctIngresos(value)}%</td>
        </tr>
    `;

    const filaGasto = (label, value, extraStyle = '') => `
        <tr style="${extraStyle}">
            <td style="padding: 8px 20px 8px 40px; font-size: 0.9rem; color: #334155;">${label}</td>
            <td style="padding: 8px 20px; text-align: right; font-weight: 600;">${money(value)}</td>
            <td style="padding: 8px 20px; text-align: right; color: #64748b; font-weight: 600;">${pctGastosOperativos(value)}%</td>
        </tr>
    `;

    const filaTotalGasto = (label, value, bg, color) => `
        <tr style="background:${bg}; font-weight:800; border-top:2px solid #e2e8f0;">
            <td style="padding: 12px 20px;">${label}</td>
            <td style="padding: 12px 20px; text-align: right; color:${color}; font-weight:800;">${money(value)}</td>
            <td style="padding: 12px 20px; text-align: right; color:${color}; font-weight:800;">${pctGastosTotales(value)}%</td>
        </tr>
    `;

    // ============================================
    // CONSTRUIR HTML
    // ============================================
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
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                <div style="position:relative; display:inline-block;">
                    <button onclick="toggleExportMenu()" 
                            style="padding:12px 20px; 
                                background:linear-gradient(135deg, #0f172a, #1e293b); 
                                color:white; 
                                border:none; 
                                border-radius:14px; 
                                font-weight:700; 
                                cursor:pointer;
                                display:flex;
                                align-items:center;
                                gap:10px;
                                box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
                        <i class="fas fa-file-export"></i>
                        Exportar
                        <i class="fas fa-chevron-down" style="font-size:0.75rem;"></i>
                    </button>
                    <div id="exportMenu" 
                        style="display:none; 
                                position:absolute; 
                                top:calc(100% + 8px); 
                                right:0; 
                                background:white; 
                                border-radius:16px; 
                                box-shadow:0 20px 40px rgba(0,0,0,0.18); 
                                min-width:200px; 
                                overflow:hidden; 
                                z-index:100;
                                border:1px solid #e2e8f0;">
                        <button onclick="exportarResumen('excel')" 
                                style="display:flex; 
                                    align-items:center; 
                                    gap:12px; 
                                    width:100%; 
                                    padding:14px 20px; 
                                    border:none; 
                                    background:transparent; 
                                    cursor:pointer; 
                                    font-size:0.95rem; 
                                    font-weight:600; 
                                    color:#0f172a;">
                            <i class="fas fa-file-excel" style="color:#217346; font-size:1.2rem;"></i>
                            Exportar a Excel
                        </button>
                        <div style="border-bottom:1px solid #e2e8f0;"></div>
                        <button onclick="exportarResumen('pdf')" 
                                style="display:flex; 
                                    align-items:center; 
                                    gap:12px; 
                                    width:100%; 
                                    padding:14px 20px; 
                                    border:none; 
                                    background:transparent; 
                                    cursor:pointer; 
                                    font-size:0.95rem; 
                                    font-weight:600; 
                                    color:#0f172a;">
                            <i class="fas fa-file-pdf" style="color:#dc2626; font-size:1.2rem;"></i>
                            Exportar a PDF
                        </button>
                    </div>
                </div>
                <div style="padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; color:#334155; font-weight:700;">
                    <i class="fas fa-calendar-alt"></i> ${periodoTexto}
                </div>
            </div>
        </div>

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

                    <!-- INGRESOS -->
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
                        ${fila('Ingreso x venta (uber)', ventaUber)}
                        ${fila('Ingreso x venta (pedidos ya)', ventaPedidosYa)}
                        ${fila('Ingreso x Venta (DIDI FOOD)', ventaDidi)}
                        ${fila('Ingreso x Venta (PERSONAL)', ventaPersonal)}
                        ${filaTotal('TOTAL GENERAL INGRESOS', totalVentas, '#f0fdf4', '#166534')}
                    </tbody>

                    <!-- GASTOS OPERATIVOS -->
                    <thead>
                        <tr style="background:#fff7ed;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #fdba74;">
                                <i class="fas fa-store" style="color:#ea580c; margin-right:10px;"></i> GASTOS OPERATIVOS
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${gastosOperativos.map(item => filaGasto(item.label, item.value)).join('')}
                        ${filaTotalGasto('TOTAL GASTOS OPERATIVOS', totalGastosOperativos, '#fff7ed', '#c2410c')}
                    </tbody>

                    <!-- GASTOS ADMINISTRATIVOS & LOGÍSTICA -->
                    <thead>
                        <tr style="background:#eff6ff;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #93c5fd;">
                                <i class="fas fa-truck" style="color:#2563eb; margin-right:10px;"></i> GASTOS ADMINISTRATIVOS & LOGÍSTICA
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${gastosAdminLogistica.map(item => filaGasto(item.label, item.value)).join('')}
                        ${filaTotalGasto('TOTAL GASTOS ADMINISTRATIVOS & LOGÍSTICA', totalGastosAdminLogistica, '#eff6ff', '#1d4ed8')}
                    </tbody>

                    <!-- IMPUESTOS Y RETENCIONES -->
                    <thead>
                        <tr style="background:#fef2f2;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #fca5a5;">
                                <i class="fas fa-file-invoice" style="color:#dc2626; margin-right:10px;"></i> IMPUESTOS Y RETENCIONES
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- TOTAL GENERAL GASTOS -->
                        <tr style="background:#fef2f2; border-top:2px solid #e2e8f0;">
                            <td style="padding:12px 20px; font-weight:700;">TOTAL GENERAL GASTOS</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:#b91c1c;">
                                ${moneySigned(totalGastos)}
                            </td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:#b91c1c;">
                                ${pctGastosTotales(totalGastos)}%
                            </td>
                        </tr>
                        
                        <!-- Utilidad Antes de Impuestos -->
                        <tr style="border-top:2px solid #e2e8f0;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad Antes de Impuestos a la Utilidad</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${utilidadAntesImpuestos < 0 ? '#b91c1c' : '#166534'};">
                                ${moneySigned(utilidadAntesImpuestos)}
                            </td>
                            <td style="padding:12px 20px; text-align:right; color:#64748b;">
                                —
                            </td>
                        </tr>
                        
                        <!-- IVA -->
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#334155;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> IVA (Impuesto Valor Agregado)
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#b91c1c; font-weight:600;">
                                ${moneySigned(iva)}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#94a3b8;">
                                —
                            </td>
                        </tr>
                        
                        <!-- Retención 5.31% -->
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#334155;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> Retención de tarjeta (5.31%)
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#b91c1c; font-weight:600;">
                                ${moneySigned(retencionTarjetaVenta)}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#94a3b8;">
                                —
                            </td>
                        </tr>
                        
                        <!-- Utilidad Antes de Renta -->
                        <tr style="background:#fefce8; border-top:1px solid #fde047;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad Antes de Renta</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${utilidadAntesRenta < 0 ? '#b91c1c' : '#854d0e'};">
                                ${moneySigned(utilidadAntesRenta)}
                            </td>
                            <td style="padding:12px 20px; text-align:right; color:${utilidadAntesRenta < 0 ? '#b91c1c' : '#854d0e'};">
                                —
                            </td>
                        </tr>
                        
                        <!-- Impuesto de Renta (30%) -->
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#334155;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> 
                                Impuesto de Renta (30%) ${impuestoRenta === 0 ? '<span style="color:#94a3b8; font-size:0.8rem;">(sin utilidad)</span>' : ''}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#b91c1c; font-weight:600;">
                                ${impuestoRenta > 0 ? moneySigned(impuestoRenta) : '₡0'}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#94a3b8;">
                                —
                            </td>
                        </tr>

                        <!-- Utilidad después de Renta -->
                        <tr style="background:#fefce8; border-top:1px solid #fde047;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad o pérdida después de Impuesto de Renta</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${utilidadDespuesRenta < 0 ? '#b91c1c' : '#854d0e'};">
                                ${moneySigned(utilidadDespuesRenta)}
                            </td>
                            <td style="padding:12px 20px; text-align:right; color:${utilidadDespuesRenta < 0 ? '#b91c1c' : '#854d0e'};">
                                —
                            </td>
                        </tr>

                        <!-- Retención 1.71% -->
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#334155;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> Retención de tarjeta (1.71%)
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#b91c1c; font-weight:600;">
                                ${moneySigned(retencionTarjetaRenta)}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#94a3b8;">
                                —
                            </td>
                        </tr>
                    </tbody>

                    <!-- RESULTADO FINAL -->
                    <thead>
                        <tr style="background:#f0fdf4;">
                            <th colspan="3" style="padding:15px 20px; text-align:left; font-size:1rem; border-bottom:2px solid #86efac;">
                                <i class="fas fa-trophy" style="color:#16a34a; margin-right:10px;"></i> RESULTADO FINAL
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Utilidad Neta -->
                        <tr style="background:${esUtilidad ? '#f0fdf4' : '#fef2f2'}; border-top:3px solid ${esUtilidad ? '#86efac' : '#fca5a5'};">
                            <td style="padding:18px 20px; font-weight:900; font-size:1.1rem;">
                                ${tipoResultado} NETA ${esUtilidad ? '💰' : '⚠️'}
                            </td>
                            <td style="padding:18px 20px; text-align:right; font-weight:900; font-size:1.1rem; color:${esUtilidad ? '#166534' : '#b91c1c'};">
                                ${moneySigned(utilidadNeta)}
                            </td>
                            <td style="padding:18px 20px; text-align:right; font-weight:700; font-size:1.1rem; color:${esUtilidad ? '#166534' : '#b91c1c'};">
                                ${pctIngresos(utilidadNeta)}%
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:12px 20px; color:#64748b; font-size:0.9rem;">
                                <i class="fas fa-info-circle" style="margin-right:8px;"></i> Margen de Utilidad (sobre ingresos)
                            </td>
                            <td style="padding:12px 20px; text-align:right; font-weight:600; color:#64748b;">
                                ${margenUtilidad.toFixed(2)}%
                            </td>
                            <td style="padding:12px 20px; text-align:right; color:#94a3b8; font-size:0.8rem;">
                                antes de impuestos
                            </td>
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
    console.log('✅ Resumen renderizado correctamente');
}

// ============================================
// OBTENER COSTOS DE PLANTA PARA RESUMEN
// ============================================

function getCostosPlantaParaResumen(localNombre) {
    if (!window.costosData) return { electricidad: 0, agua: 0, adt: 0, total: 0 };
    
    const costosData = window.costosData;
    const periodo = obtenerPeriodoActual();
    const dias = periodo.dias;
    
    const { porcentajes } = obtenerPorcentajesPorLocal(periodo);
    const pct = porcentajes[localNombre] || 0;
    
    let electricidadMensual = 0;
    let aguaMensual = 0;
    let adtMensual = 0;
    
    Object.keys(costosData).forEach(categoriaFirebase => {
        const subCategorias = costosData[categoriaFirebase];
        
        Object.keys(subCategorias).forEach(subCategoria => {
            if (subCategoria === 'planta') {
                const costosArray = subCategorias[subCategoria];
                if (!Array.isArray(costosArray)) return;
                costosArray.forEach(costo => {
                    const concepto = (costo.concepto || '').toLowerCase();
                    const monto = costo.monto || 0;
                    
                    if (concepto.includes('electricidad')) {
                        electricidadMensual += monto;
                    } else if (concepto.includes('agua')) {
                        aguaMensual += monto;
                    } else if (concepto.includes('adt') || concepto.includes('alarma')) {
                        adtMensual += monto;
                    }
                });
            }
        });
    });
    
    const electricidadDiaria = dias > 0 ? (electricidadMensual / dias) * pct : 0;
    const aguaDiaria = dias > 0 ? (aguaMensual / dias) * pct : 0;
    const adtDiaria = dias > 0 ? (adtMensual / dias) * pct : 0;
    
    return {
        electricidad: electricidadDiaria,
        agua: aguaDiaria,
        adt: adtDiaria,
        total: electricidadDiaria + aguaDiaria + adtDiaria
    };
}

// ============================================
// OBTENER COSTOS DE LOGÍSTICA POR LOCAL
// ============================================

async function getCostosLogisticaPorLocal(localNombre, costosFijos, periodo) {
    if (!costosFijos || !localNombre) {
        return { planta: 0, oficinas: 0, transporte: 0, planilla: 0, total: 0 };
    }

    let porcentajeLocal = 0;
    
    const porcentajesManuales = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};
    if (Object.keys(porcentajesManuales).length > 0) {
        porcentajeLocal = (porcentajesManuales[localNombre] || 0) / 100;
    } else {
        try {
            const { porcentajes } = await window.obtenerPorcentajesPorLocal(periodo);
            porcentajeLocal = porcentajes[localNombre] || 0;
        } catch(e) {
            console.warn('Error obteniendo porcentaje de logística:', e);
            const localesCount = AppState?.locales?.length || 1;
            porcentajeLocal = 1 / localesCount;
        }
    }

    const dias = periodo?.dias || 30;

    const planta = (costosFijos.totalPlanta || 0) / dias * porcentajeLocal;
    const oficinas = (costosFijos.totalOficinas || 0) / dias * porcentajeLocal;
    const transporte = (costosFijos.totalTransporte || 0) / dias * porcentajeLocal;
    const planilla = (costosFijos.totalPlanillaLogistica || 0) / dias * porcentajeLocal;

    console.log(`📊 Costos Logística para ${localNombre}:`, {
        porcentaje: porcentajeLocal * 100 + '%',
        planta: planta,
        oficinas: oficinas,
        transporte: transporte,
        planilla: planilla,
        total: planta + oficinas + transporte + planilla
    });

    return {
        planta,
        oficinas,
        transporte,
        planilla,
        total: planta + oficinas + transporte + planilla
    };
}

// ============================================
// OBTENER VALOR DE COSTO SEGÚN PERÍODO
// ============================================

function getValorSegunPeriodo(valorMensual, filtroTiempo, diasPeriodo) {
    if (!valorMensual) return 0;
    
    if (filtroTiempo === 'mes' || filtroTiempo === 'todos') {
        return valorMensual;
    }
    
    const dias = diasPeriodo || 30;
    return valorMensual / dias;
}

// ============================================
// OBTENER PERÍODO ACTUAL
// ============================================

function obtenerPeriodoActual() {
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState?.filtros?.fechaPersonalizada;
    const fechaInicio = AppState?.filtros?.fechaInicio;
    const fechaFin = AppState?.filtros?.fechaFin;
    
    const hoy = new Date();
    let dias = 30;
    let valor = hoy.toISOString().substring(0, 7);
    
    if (filtroTiempo === 'mes') {
        const fechaBase = fechaPersonalizada ? parseFechaDDMMYYYY(fechaPersonalizada) : hoy;
        dias = getDiasDelMes(fechaBase);
        valor = fechaBase.toISOString().substring(0, 7);
    } else if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio + 'T12:00:00');
        const fin = new Date(fechaFin + 'T12:00:00');
        const diffTime = Math.abs(fin - inicio);
        dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        valor = `${fechaInicio}_${fechaFin}`;
    } else if (filtroTiempo === 'ayer') {
        dias = 1;
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);
        valor = ayer.toISOString().substring(0, 7);
    } else if (filtroTiempo === 'personalizado') {
        dias = 1;
        valor = fechaPersonalizada || hoy.toISOString().substring(0, 7);
    }
    
    return { tipo: filtroTiempo, dias, valor };
}

async function obtenerPorcentajeLocal(localNombre) {
    if (!localNombre) return 0;

    const periodo = obtenerPeriodoActual();

    if (typeof window.obtenerPorcentajesPorLocal !== "function") {
        console.warn("No existe obtenerPorcentajesPorLocal()");
        return 0;
    }

    try {
        const { porcentajes } = await window.obtenerPorcentajesPorLocal(periodo);
        return porcentajes[localNombre] || 0;
    } catch (error) {
        console.warn('Error obteniendo porcentaje local:', error);
        return 0;
    }
}

// ============================================
// FUNCIONES DE EXPORTACIÓN
// ============================================

function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', function(e) {
    const menu = document.getElementById('exportMenu');
    if (menu && !e.target.closest('#exportMenu') && !e.target.closest('button[onclick="toggleExportMenu()"]')) {
        menu.style.display = 'none';
    }
});

// Función principal de exportación
function exportarResumen(formato) {
    const menu = document.getElementById('exportMenu');
    if (menu) menu.style.display = 'none';
    
    if (formato === 'excel') {
        exportarExcel();
    } else if (formato === 'pdf') {
        exportarPDFDirecto();
    }
}

// ============================================
// EXPORTAR A EXCEL
// ============================================
function exportarExcel() {
    try {
        const content = document.getElementById('resumenContent');
        if (!content) {
            mostrarToast('error', '❌ No hay datos para exportar');
            return;
        }
        
        const table = content.querySelector('.table-container table');
        if (!table) {
            mostrarToast('error', '❌ No se encontró la tabla de datos');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.table_to_sheet(table);
        ws['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
        
        const nombre = `Resumen_Financiero_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, nombre);
        mostrarToast('success', `✅ Excel exportado: ${nombre}`);
        
    } catch (error) {
        console.error(error);
        mostrarToast('error', '❌ Error al exportar Excel: ' + error.message);
    }
}

// ============================================
// EXPORTAR A PDF DIRECTO
// ============================================
function exportarPDFDirecto() {
    try {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            mostrarToast('error', '❌ Librería PDF no disponible');
            return;
        }
        
        mostrarToast('info', '⏳ Generando PDF...');
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Obtener datos de la tabla
        const content = document.getElementById('resumenContent');
        const table = content.querySelector('.table-container table');
        
        if (!table) {
            mostrarToast('error', '❌ No se encontró la tabla');
            return;
        }
        
        // Obtener filtros actuales
        const filtroLocal = document.getElementById('filtroLocal');
        const nombreLocal = filtroLocal ? filtroLocal.options[filtroLocal.selectedIndex]?.text || 'Todos los locales' : 'Todos los locales';
        
        const filtroTiempo = document.getElementById('filtroTiempo');
        const nombreTiempo = filtroTiempo ? filtroTiempo.options[filtroTiempo.selectedIndex]?.text || 'Todo' : 'Todo';
        
        // Extraer datos de la tabla
        const datos = [];
        const filas = table.querySelectorAll('tbody tr');
        
        filas.forEach(row => {
            const celdas = row.querySelectorAll('td');
            if (celdas.length >= 2) {
                let concepto = celdas[0]?.textContent?.trim() || '';
                let monto = celdas[1]?.textContent?.trim() || '';
                let porcentaje = celdas[2]?.textContent?.trim() || '';
                
                // Limpiar monto: eliminar cualquier símbolo y dejar solo números
                monto = monto.replace(/[^0-9,.]/g, '').trim();
                porcentaje = porcentaje.replace('%', '').trim();
                
                // Identificar si es título o total
                const esTitulo = concepto.includes('INGRESOS') || 
                               concepto.includes('GASTOS OPERATIVOS') || 
                               concepto.includes('GASTOS ADMINISTRATIVOS') ||
                               concepto.includes('IMPUESTOS') ||
                               concepto.includes('RESULTADO FINAL');
                
                const esTotal = concepto.includes('TOTAL') || 
                               concepto.includes('UTILIDAD') || 
                               concepto.includes('PÉRDIDA') ||
                               concepto.includes('RESULTADO FINAL');
                
                // Detectar si es la fila del margen de utilidad
                const esMargen = concepto.includes('Margen de Utilidad');
                
                datos.push({
                    concepto,
                    monto: monto || '0',
                    porcentaje: porcentaje || '0',
                    esTitulo,
                    esTotal,
                    esMargen
                });
            }
        });
        
        // Configurar página
        const margin = 15;
        const pageWidth = 210;
        const maxWidth = pageWidth - (margin * 2);
        
        // ============================================
        // ENCABEZADO
        // ============================================
        let y = 25;
        
        // Título
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text('RESUMEN FINANCIERO', pageWidth / 2, y, { align: 'center' });
        y += 7;
        
        // Línea
        pdf.setDrawColor(37, 99, 235);
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 6;
        
        // Información en una línea
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        const infoTexto = `${new Date().toLocaleDateString('es-CR')}  |  ${nombreLocal}  |  ${nombreTiempo}`;
        pdf.text(infoTexto, pageWidth / 2, y, { align: 'center' });
        y += 8;
        
        // ============================================
        // TABLA
        // ============================================
        let pageNumber = 1;
        
        function dibujarEncabezadosTabla() {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.setFillColor(15, 23, 42);
            pdf.rect(margin, y, maxWidth, 6, 'F');
            pdf.text('CONCEPTO', margin + 3, y + 4.5);
            pdf.text('MONTO', margin + 140, y + 4.5);
            pdf.text('%', margin + 185, y + 4.5);
            y += 8;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(15, 23, 42);
        }
        
        function nuevaPagina() {
            pdf.addPage();
            pageNumber++;
            y = 20;
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Resumen Financiero - Pág. ${pageNumber}`, margin, y);
            y += 6;
            dibujarEncabezadosTabla();
        }
        
        // Dibujar encabezados en primera página
        dibujarEncabezadosTabla();
        
        // Recorrer datos
        datos.forEach((item) => {
            if (y > 275) {
                nuevaPagina();
            }
            
            let fontStyle = 'normal';
            let fontSize = 8;
            let textColor = [15, 23, 42];
            let fillColor = null;
            
            // Si es la fila del margen de utilidad, formatear como porcentaje
            if (item.esMargen) {
                fontStyle = 'normal';
                fontSize = 8;
                textColor = [100, 116, 139];
                // El porcentaje ya viene en el campo porcentaje, lo usamos directamente
            }
            
            if (item.esTitulo) {
                fontStyle = 'bold';
                fontSize = 9;
                textColor = [37, 99, 235];
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.2);
                pdf.line(margin, y - 1, pageWidth - margin, y - 1);
            }
            
            if (item.esTotal) {
                fontStyle = 'bold';
                fontSize = 9;
                textColor = [0, 0, 0];
                fillColor = [241, 245, 249];
                pdf.setDrawColor(15, 23, 42);
                pdf.setLineWidth(0.3);
                pdf.line(margin, y - 1, pageWidth - margin, y - 1);
            }
            
            if (item.concepto.includes('UTILIDAD NETA') || item.concepto.includes('PÉRDIDA NETA')) {
                const montoNum = parseFloat(item.monto.replace(/\./g, '').replace(',', '.'));
                const esUtilidad = montoNum >= 0;
                textColor = esUtilidad ? [22, 163, 74] : [220, 38, 38];
                fontStyle = 'bold';
                fontSize = 10;
                fillColor = esUtilidad ? [236, 253, 245] : [254, 242, 242];
            }
            
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', fontStyle);
            pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
            
            if (fillColor) {
                pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
                pdf.rect(margin, y - 3, maxWidth, 6.5, 'F');
            }
            
            // Concepto
            let concepto = item.concepto;
            if (concepto.length > 50) {
                concepto = concepto.substring(0, 47) + '...';
            }
            pdf.text(concepto, margin + 3, y + 4);
            
            // Monto - solo el número con separadores
            const montoLimpio = item.monto.replace(/[^0-9,.]/g, '');
            const montoNumero = parseFloat(montoLimpio.replace(/\./g, '').replace(',', '.'));
            let montoTexto;
            if (isNaN(montoNumero) || montoNumero === 0) {
                montoTexto = '0';
            } else {
                montoTexto = Math.round(montoNumero).toLocaleString('es-CR');
            }
            pdf.text(montoTexto, margin + 138, y + 4, { align: 'right' });
            
            // Porcentaje - CORREGIDO: para el margen de utilidad mostramos el porcentaje correctamente
            let pctTexto = '';
            if (item.esMargen) {
                // Si es margen de utilidad, mostramos el porcentaje que viene de la tabla
                pctTexto = item.porcentaje ? `${item.porcentaje}%` : '';
            } else {
                pctTexto = item.porcentaje ? `${item.porcentaje}%` : '';
            }
            pdf.text(pctTexto, margin + 183, y + 4, { align: 'right' });
            
            y += 7;
        });
        
        // Footer
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(7);
            pdf.setTextColor(150, 150, 150);
            pdf.setFont('helvetica', 'italic');
            pdf.text(`Generado desde Perdidas y Ganancias`, margin, 285);
            pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 285, { align: 'right' });
        }
        
        pdf.save(`Resumen_Financiero_${new Date().toISOString().slice(0,10)}.pdf`);
        mostrarToast('success', `✅ PDF exportado correctamente (${totalPages} páginas)`);
        
    } catch (error) {
        console.error('Error exportando PDF:', error);
        mostrarToast('error', '❌ Error al exportar PDF: ' + error.message);
    }
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
window.getCostosPlantaParaResumen = getCostosPlantaParaResumen;
window.getCostosLogisticaPorLocal = getCostosLogisticaPorLocal;
window.obtenerPorcentajeLocal = obtenerPorcentajeLocal;
window.getValorSegunPeriodo = getValorSegunPeriodo;
window.obtenerServiciosData = obtenerServiciosData;
window.calcularServicios = calcularServicios;
window.obtenerPorcentajesPorLocal = obtenerPorcentajesPorLocal;

console.log('✅ resumen.js');