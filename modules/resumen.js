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
    if (filtroTiempo === 'anio') return fechaItem.substring(0, 4) === anioActual;
    if (filtroTiempo === 'personalizado') return fechaItem === fechaPersonalizada;
    if (filtroTiempo === 'rango') {
        if (!fechaInicio || !fechaFin) return true;
        return fechaItem >= fechaInicio && fechaItem <= fechaFin;
    }
    return true;
}

// ============================================
// FUNCIÓN PARA OBTENER DATOS DE SERVICIOS (CORREGIDA)
// ============================================

function obtenerServiciosData() {
    // Si los datos ya están cargados, devolverlos
    if (window.serviciosData && Object.keys(window.serviciosData).length > 0) {
        console.log('📊 Datos de servicios obtenidos de window.serviciosData:', Object.keys(window.serviciosData));
        return window.serviciosData;
    }
    
    // Si hay datos pero están vacíos, forzar carga desde Firebase
    if (window.serviciosData && Object.keys(window.serviciosData).length === 0) {
        console.log('⏳ Datos de servicios vacíos, forzando carga...');
        if (typeof window.cargarServiciosFirebase === 'function') {
            window.cargarServiciosFirebase();
        }
    }
    
    // Si no hay datos en window.serviciosData, intentar obtener de otra forma
    if (!window.serviciosData) {
        console.log('⏳ window.serviciosData no existe, esperando...');
        // Intentar obtener de firebase directamente si es posible
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
        // Restaurante
        alquilerLocal: 0, secsa: 0, softRestaurant: 0, internetKolbi: 0, televisionKolbi: 0,
        adt: 0, fumigacion: 0, polizaRT: 0, depreciacionActivos: 0, patenteComercial: 0,
        patenteLicores: 0, basuraMunicipal: 0, interesesMoraPatente: 0, certificacionGas: 0,
        certificacionElectrica: 0, renovacionMinisterioSalud: 0, asesoriaLegalRH: 0,
        honorariosContabilidad: 0, publicidad: 0, otrosServiciosProfesionales: 0,
        
        // Planta
        electricidadPlanta: 0, aguaPlanta: 0, adtPlanta: 0, fumigacionPlanta: 0,
        softwareSecsaPlanta: 0, ivaHaciendaPlanta: 0, asesoriaLegalPlanta: 0,
        
        // Oficinas
        electricidadOficinas: 0, aguaOficinas: 0, internetOficinas: 0,
        telefonoCelulares: 0, adtOficinas: 0, mantenimientoPapeleria: 0,
        softwareHosting: 0,
        
        // Transporte
        combustible: 0, electricidadBodegas: 0, aguaBodegas: 0, alquilerTaller: 0,
        gpsNavsat: 0, marchamos: 0, dekra: 0, mantenimientoVehiculos: 0,
        
        // Planilla Logística
        planillaBodega: 0, alexDuque: 0, polizaRTBodega: 0,
        ccssBodegaOficinas: 0, planillaOficinas: 0,
        
        // Impuestos
        iva: 0,
        impuestoRenta: 0,
        
        // Totales por categoría
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

                // RESTAURANTE
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
                    
                // PLANTA
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
                    
                // OFICINAS
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
                    
                // TRANSPORTE
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
                    
                // PLANILLA LOGÍSTICA
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
    // OBTENER DATOS DE SERVICIOS
    const serviciosData = obtenerServiciosData();
    
    // Si no hay datos de servicios, devolver ceros
    if (!serviciosData || Object.keys(serviciosData).length === 0) {
        console.warn('⚠️ No hay datos de servicios disponibles en calcularServicios');
        return { agua: 0, electricidad: 0, gas: 0, gasTotalPeriodo: 0, gasPromedioDiario: 0, total: 0 };
    }
    
    console.log('📊 Datos de servicios recibidos en calcularServicios:', serviciosData);
    console.log('📊 Filtros aplicados:', { filtroLocal, filtroTiempo, ayerStr, mesActual, fechaPersonalizada, fechaInicio, fechaFin });
    
    let agua = 0, electricidad = 0, gas = 0, total = 0;
    let gasPromedioDiario = 0;
    let gasTotalPeriodo = 0;
    let contadorGas = 0;
    let contadorTotal = 0;
    
    // Recorrer todos los locales
    Object.keys(serviciosData).forEach(local => {
        // Filtrar por local - IMPORTANTE: si filtroLocal es 'Todos', mostrar todos
        if (filtroLocal !== 'Todos' && local !== filtroLocal) {
            console.log(`⏭️ Saltando local ${local} (filtro: ${filtroLocal})`);
            return;
        }
        if (typeof window.puedeVerLocal === 'function' && !window.puedeVerLocal(local)) {
            console.log(`⏭️ Saltando local ${local} (sin permisos)`);
            return;
        }
        
        console.log(`📊 Procesando local: ${local}, servicios: ${serviciosData[local].length}`);
        
        (serviciosData[local] || []).forEach(s => {
            // Verificar que el servicio tenga fecha
            if (!s.fecha) {
                console.log(`⏭️ Servicio sin fecha:`, s);
                return;
            }
            
            // Extraer fecha en formato YYYY-MM-DD
            let fechaItem = s.fecha;
            if (fechaItem.includes('T')) fechaItem = fechaItem.split('T')[0];
            
            // FILTRAR POR FECHA - CORREGIDO
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
            
            if (!fechaValida) {
                console.log(`⏭️ Servicio ${s.servicio} fecha ${fechaItem} no coincide con filtro ${filtroTiempo}`);
                return;
            }
            
            contadorTotal++;
            console.log(`📊 ✅ Servicio válido: ${s.servicio}, fecha: ${fechaItem}, monto: ${s.monto}, consumoTotal: ${s.consumoTotal}`);
            
            // Calcular monto del servicio
            let montoServicio = 0;
            
            if (montoServicio === 0 && s.consumoTotal && s.consumoTotal > 0) {
                let precio = 0;
                if (s.servicio === 'Agua') {
                    precio = window.obtenerPrecioLocal ? window.obtenerPrecioLocal(local, 'Agua') : 1528.68;
                } else if (s.servicio === 'Electricidad') {
                    precio = window.obtenerPrecioLocal ? window.obtenerPrecioLocal(local, 'Electricidad') : 126.84;
                }
                montoServicio = s.consumoTotal * precio;
                console.log(`📊 Monto calculado para ${s.servicio}: ${montoServicio} (${s.consumoTotal} * ${precio})`);
            }
            
            total += montoServicio;
            
            if (s.servicio === 'Agua') {
                agua += montoServicio;
                console.log(`💧 Agua acumulado: ${agua} (sumando ${montoServicio})`);
            } else if (s.servicio === 'Electricidad') {
                electricidad += montoServicio;
                console.log(`⚡ Electricidad acumulado: ${electricidad} (sumando ${montoServicio})`);
            } else if (s.servicio === 'Gas') {
                gas += montoServicio;
                gasTotalPeriodo += montoServicio;
                const diasGas = s.dias || 30;
                gasPromedioDiario += diasGas > 0 ? montoServicio / diasGas : 0;
                contadorGas++;
                console.log(`🔥 Gas acumulado: ${gas} (sumando ${montoServicio})`);
            }
        });
    });
    
    // Si hay múltiples registros de gas, promediar el costo diario
    if (contadorGas > 0) {
        gasPromedioDiario = gasPromedioDiario / contadorGas;
    }
    
    console.log(`📊 RESULTADO FINAL: ${contadorTotal} servicios procesados`, { agua, electricidad, gas, gasTotalPeriodo, gasPromedioDiario, total });
    
    return { agua, electricidad, gas, gasTotalPeriodo, gasPromedioDiario, total };
}

// ============================================
// CÁLCULOS DE VENTAS Y COMISIONES
// ============================================

function calcularComisionesVentas(ventasFiltradas) {
    // Usar las comisiones que ya están calculadas en cada venta
    let comisionUber = 0;
    let comisionPedidosYa = 0;
    let comisionDidi = 0;
    let comisionDatafonos = 0;
    
    ventasFiltradas.forEach(v => {
        // Si la venta tiene el objeto comisiones, usarlo
        if (v.comisiones) {
            comisionUber += v.comisiones.uber || 0;
            comisionPedidosYa += v.comisiones.pedidosYa || 0;
            comisionDidi += v.comisiones.didi || 0;
            comisionDatafonos += v.comisiones.bac || 0;
        } else {
            // Fallback: si no tiene comisiones, calcularlas (pero esto no debería pasar)
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
// RENDERIZAR RESUMEN (VERSIÓN COMPLETA CORREGIDA)
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
    // SERVICIOS (CORREGIDO - AHORA USA LOS DATOS DE window.serviciosData)
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
    const ccss = planillaCalc.total * 0.265;
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
        if (filtroTiempo === 'mes' || filtroTiempo === 'todos' || filtroTiempo === 'rango') {
            return valorMensual;
        }
        const dias = diasPeriodo || 30;
        return valorMensual / dias;
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
        porcentajeLocal = obtenerPorcentajeLocal(filtroLocal);
        console.log(`📊 Porcentaje para ${filtroLocal}: ${(porcentajeLocal * 100).toFixed(2)}%`);
    }

    const getValor = (valorMensual) => {
        if (!valorMensual) return 0;
        if (filtroTiempo === 'mes' || filtroTiempo === 'todos' || filtroTiempo === 'rango') {
            return valorMensual * porcentajeLocal;
        }
        const dias = diasPeriodo || 30;
        return (valorMensual / dias) * porcentajeLocal;
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
    const totalGastos = totalGastosOperativos + totalGastosAdminLogistica;
    const utilidadAntesImpuestos = totalVentas - totalGastos;

    const iva = costosFijos.iva || costosFijos.haciendaIVA || 0;
    console.log(`📊 IVA desde costos fijos: ₡${iva}`);

    const retencionTarjetaVenta = ventaBAC * 0.0531;
    const retencionTarjetaRenta = ventaBAC * 0.0171;

    console.log(`📊 ventaBAC: ₡${ventaBAC.toLocaleString()}`);
    console.log(`📊 Retención Tarjeta (5.31%): ₡${retencionTarjetaVenta.toLocaleString()}`);
    console.log(`📊 Retención Tarjeta (1.71%): ₡${retencionTarjetaRenta.toLocaleString()}`);

    const utilidadAntesRenta = utilidadAntesImpuestos - iva - retencionTarjetaVenta;
    const impuestoRenta = utilidadAntesRenta > 0 ? utilidadAntesRenta * 0.30 : 0;
    const utilidadDespuesRenta = utilidadAntesRenta - impuestoRenta;
    const utilidadNeta = utilidadDespuesRenta - retencionTarjetaRenta;
    const margenUtilidad = totalVentas > 0 ? ((totalVentas - totalGastos) / totalVentas) * 100 : 0;

    const esUtilidad = utilidadNeta >= 0;
    const tipoResultado = esUtilidad ? 'UTILIDAD' : 'PÉRDIDA';

    console.log('📊 Resumen de utilidades:', {
        totalVentas,
        totalGastos,
        totalGastosOperativos,
        totalGastosAdminLogistica,
        utilidadAntesImpuestos,
        iva,
        retencionTarjetaVenta,
        utilidadAntesRenta,
        impuestoRenta,
        utilidadDespuesRenta,
        retencionTarjetaRenta,
        utilidadNeta
    });

    // ============================================
    // FUNCIONES DE FORMATO
    // ============================================
    const porcentaje = (valor, base = totalVentas) => base > 0 ? ((valor / base) * 100).toFixed(2) : '0.00';
    const money = (n) => `₡${Math.round(n || 0).toLocaleString()}`;

    const fila = (label, value, percent = true, extraStyle = '') => `
        <tr style="${extraStyle}">
            <td style="padding: 8px 20px 8px 40px; font-size: 0.9rem; color: #334155;">${label}</td>
            <td style="padding: 8px 20px; text-align: right; font-weight: 600;">${money(value)}</td>
            <td style="padding: 8px 20px; text-align: right; color: #64748b; font-weight: 600;">${percent ? porcentaje(value) + '%' : '—'}</td>
        </tr>
    `;

    const filaTotal = (label, value, bg, color) => `
        <tr style="background:${bg}; font-weight:800; border-top:2px solid #e2e8f0;">
            <td style="padding: 12px 20px;">${label}</td>
            <td style="padding: 12px 20px; text-align: right; color:${color}; font-weight:800;">${money(value)}</td>
            <td style="padding: 12px 20px; text-align: right; color:${color}; font-weight:800;">${porcentaje(value)}%</td>
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
            <div style="padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; color:#334155; font-weight:700;">
                <i class="fas fa-calendar-alt"></i> ${periodoTexto}
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
                        ${gastosOperativos.map(item => fila(item.label, item.value)).join('')}
                        ${filaTotal('TOTAL GASTOS OPERATIVOS', totalGastosOperativos, '#fff7ed', '#c2410c')}
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
                        ${gastosAdminLogistica.map(item => fila(item.label, item.value)).join('')}
                        ${filaTotal('TOTAL GASTOS ADMINISTRATIVOS & LOGÍSTICA', totalGastosAdminLogistica, '#eff6ff', '#1d4ed8')}
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
                        ${filaTotal('TOTAL GENERAL GASTOS', totalGastos, '#fef2f2', '#b91c1c')}
                        
                        <tr style="border-top:2px solid #e2e8f0;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad Antes de Impuestos a la Utilidad</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${utilidadAntesImpuestos >= 0 ? '#166534' : '#b91c1c'};">
                                ${money(utilidadAntesImpuestos)}
                            </td>
                            <td style="padding:12px 20px; text-align:right; color:#64748b;">
                                ${porcentaje(utilidadAntesImpuestos)}%
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#64748b;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> IVA (Impuesto Valor Agregado)
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#64748b;">
                                -${money(iva)}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#64748b;">
                                ${porcentaje(iva)}%
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#64748b;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> Retención de tarjeta (5.31%)
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#64748b;">
                                -${money(retencionTarjetaVenta)}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#64748b;">
                                ${porcentaje(retencionTarjetaVenta)}%
                            </td>
                        </tr>
                        
                        <tr style="background:#fefce8; border-top:1px solid #fde047;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad Antes de Renta</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${utilidadAntesRenta >= 0 ? '#854d0e' : '#b91c1c'};">
                                ${money(utilidadAntesRenta)}
                            </td>
                            <td style="padding:12px 20px; text-align:right; color:#854d0e;">
                                ${porcentaje(utilidadAntesRenta)}%
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#64748b;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> 
                                Impuesto de Renta (30%) ${impuestoRenta === 0 ? '<span style="color:#64748b; font-size:0.8rem;"></span>' : ''}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#64748b;">
                                ${impuestoRenta > 0 ? `-${money(impuestoRenta)}` : '₡0'}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#64748b;">
                                ${impuestoRenta > 0 ? porcentaje(impuestoRenta) + '%' : '0%'}
                            </td>
                        </tr>

                        <tr style="background:#fefce8; border-top:1px solid #fde047;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad o pérdida después de Impuesto de Renta</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${(utilidadAntesRenta - impuestoRenta) >= 0 ? '#854d0e' : '#b91c1c'};">
                                ${money(utilidadAntesRenta - impuestoRenta)}
                            </td>
                            <td style="padding:12px 20px; text-align:right; color:#854d0e;">
                                ${porcentaje(utilidadAntesRenta - impuestoRenta)}%
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#64748b;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> 
                                Retención de tarjeta (1.71%)
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#64748b;">
                                -${money(retencionTarjetaRenta)}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#64748b;">
                                ${porcentaje(retencionTarjetaRenta)}%
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
                        <tr style="background:${esUtilidad ? '#f0fdf4' : '#fef2f2'}; border-top:3px solid ${esUtilidad ? '#86efac' : '#fca5a5'};">
                            <td style="padding:18px 20px; font-weight:900; font-size:1.1rem;">
                                ${tipoResultado} NETA ${esUtilidad ? '💰' : '⚠️'}
                            </td>
                            <td style="padding:18px 20px; text-align:right; font-weight:900; font-size:1.1rem; color:${esUtilidad ? '#166534' : '#b91c1c'};">
                                ${money(utilidadNeta)}
                            </td>
                            <td style="padding:18px 20px; text-align:right; font-weight:700; font-size:1.1rem; color:${esUtilidad ? '#166534' : '#b91c1c'};">
                                ${porcentaje(utilidadNeta)}%
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

function getCostosLogisticaPorLocal(localNombre, costosFijos, periodo) {
    if (!costosFijos || !localNombre) {
        return { planta: 0, oficinas: 0, transporte: 0, planilla: 0, total: 0 };
    }

    let porcentajeLocal = 0;
    
    const porcentajesManuales = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};
    if (Object.keys(porcentajesManuales).length > 0) {
        porcentajeLocal = (porcentajesManuales[localNombre] || 0) / 100;
    } else {
        try {
            const { porcentajes } = window.obtenerPorcentajesPorLocal(periodo);
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
// OBTENER PORCENTAJE DEL LOCAL
// ============================================

function obtenerPorcentajeLocal(localNombre) {
    if (!localNombre) return 0;
    
    const porcentajesManuales = JSON.parse(localStorage.getItem('porcentajesLogistica')) || {};
    if (Object.keys(porcentajesManuales).length > 0) {
        return (porcentajesManuales[localNombre] || 0) / 100;
    }
    
    try {
        const periodo = {
            tipo: 'mes',
            dias: 30,
            valor: new Date().toISOString().substring(0, 7)
        };
        if (typeof window.obtenerPorcentajesPorLocal === 'function') {
            const { porcentajes } = window.obtenerPorcentajesPorLocal(periodo);
            return porcentajes[localNombre] || 0;
        }
    } catch(e) {
        console.warn('Error obteniendo porcentaje de logística:', e);
    }
    
    const localesCount = AppState?.locales?.length || 1;
    return 1 / localesCount;
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

// ============================================
// OBTENER PORCENTAJES POR LOCAL
// ============================================

function obtenerPorcentajesPorLocal(periodo) {
    const locales = AppState?.locales || [];
    const resultados = {};
    let total = 0;
    
    locales.forEach(local => {
        const pct = obtenerPorcentajeLocal(local.nombre);
        resultados[local.nombre] = pct;
        total += pct;
    });
    
    // Normalizar para que sumen 1
    if (total > 0) {
        Object.keys(resultados).forEach(key => {
            resultados[key] = resultados[key] / total;
        });
    }
    
    return { porcentajes: resultados, total: total };
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

console.log('✅ resumen.js');