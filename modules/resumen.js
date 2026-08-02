// modules/resumen.js - VERSIÓN CON FILTRO POR LOCAL OBLIGATORIO

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
// OBTENER FILTRO LOCAL (FORZADO)
// ============================================
function obtenerFiltroLocal() {
    // Si el usuario tiene un local asignado y NO es gerencia, forzar ese local
    if (AppState?.usuario?.local && !window.esGerencia?.()) {
        return AppState.usuario.local;
    }
    
    // Si hay un filtro guardado en AppState
    if (AppState?.filtros?.local && AppState.filtros.local !== 'Todos') {
        return AppState.filtros.local;
    }
    
    return 'Todos';
}

// ============================================
// FUNCIÓN PARA OBTENER DATOS DE SERVICIOS
// ============================================

function obtenerServiciosData() {
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
        
        const empleados = planillaData[local] || [];
        
        empleados.forEach(emp => {
            const salarioMensual = emp.salario || 0;
            const valorHora = salarioMensual / 240;
            const esAñosLocos = local.includes('Los Años Locos');
            const valorHoraNocturna = salarioMensual / 180;
            const horasJornada = 8;
            
            if (emp.horas && Object.keys(emp.horas).length > 0) {
                Object.keys(emp.horas).forEach(fechaStr => {
                    let fechaItem = fechaStr;
                    if (fechaItem.includes('T')) fechaItem = fechaItem.split('T')[0];
                    
                    let fechaValida = false;
                    if (filtroTiempo === 'todos') fechaValida = true;
                    else if (filtroTiempo === 'ayer') fechaValida = fechaItem === ayerStr;
                    else if (filtroTiempo === 'mes') fechaValida = fechaItem.substring(0, 7) === mesActual;
                    else if (filtroTiempo === 'anio') fechaValida = fechaItem.substring(0, 4) === anioActual;
                    else if (filtroTiempo === 'personalizado') fechaValida = fechaItem === fechaPersonalizada;
                    else if (filtroTiempo === 'rango') {
                        if (!fechaInicio || !fechaFin) fechaValida = true;
                        else fechaValida = fechaItem >= fechaInicio && fechaItem <= fechaFin;
                    }
                    
                    if (!fechaValida) return;
                    
                    const horas = emp.horas[fechaStr];
                    const horasOrdinariasDia = Math.min(horas.ordinarias || 0, horasJornada);
                    
                    if (esAñosLocos) {
                        totalOrdinarias += horasOrdinariasDia * valorHoraNocturna;
                    } else {
                        totalOrdinarias += horasOrdinariasDia * valorHora;
                    }
                    
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
                totalOrdinarias += salarioMensual;
            }
        });
    });
    
    return { 
        salarioBase: totalOrdinarias,
        horasExtras: totalExtras,
        nocturnas: totalNocturnas,
        extrasNocturnas: totalExtrasNocturnas,
        total: totalOrdinarias + totalExtras + totalNocturnas + totalExtrasNocturnas
    };
}

function calcularPrestamos(prestamosData, filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) {
    if (!prestamosData || prestamosData.length === 0) return 0;
    
    return prestamosData
        .filter(p => {
            // Filtro por fecha
            if (!filtrarPorFecha(p, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin)) return false;
            // Filtro por local
            if (filtroLocal !== 'Todos' && p.local !== filtroLocal) return false;
            return true;
        })
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
        return resultado;
    }

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

                // ✅ FILTRO POR LOCAL
                if (filtroLocal !== 'Todos' && localDelCosto !== filtroLocal) return;

                const concepto = (costo.concepto || '').toLowerCase().trim();
                const montoMensual = costo.monto || 0;
                const montoAplicable = montoMensual * factorPeriodo;

                if (montoMensual === 0) return;

                // ... resto del código de clasificación de costos ...
                if (subCategoria === 'restaurante') {
                    resultado.totalRestaurante += montoAplicable;
                } else if (subCategoria === 'planta') {
                    resultado.totalPlanta += montoAplicable;
                } else if (subCategoria === 'oficinas') {
                    resultado.totalOficinas += montoAplicable;
                } else if (subCategoria === 'transporte') {
                    resultado.totalTransporte += montoAplicable;
                } else if (subCategoria === 'planilla') {
                    resultado.totalPlanillaLogistica += montoAplicable;
                }
            });
        });
    });

    return resultado;
}

// ============================================
// CÁLCULOS DE SERVICIOS
// ============================================

function calcularServicios(filtroLocal, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) {
    const serviciosData = obtenerServiciosData();
    
    if (!serviciosData || Object.keys(serviciosData).length === 0) {
        return { agua: 0, electricidad: 0, gas: 0, gasTotalPeriodo: 0, gasPromedioDiario: 0, total: 0 };
    }
    
    let agua = 0, electricidad = 0, gas = 0, total = 0;
    let gasPromedioDiario = 0;
    let gasTotalPeriodo = 0;
    let contadorGas = 0;
    
    Object.keys(serviciosData).forEach(local => {
        // ✅ FILTRO POR LOCAL
        if (filtroLocal !== 'Todos' && local !== filtroLocal) {
            return;
        }
        
        (serviciosData[local] || []).forEach(s => {
            if (!s.fecha) return;
            
            let fechaItem = s.fecha;
            if (fechaItem.includes('T')) fechaItem = fechaItem.split('T')[0];
            
            let fechaValida = false;
            if (filtroTiempo === 'todos') fechaValida = true;
            else if (filtroTiempo === 'ayer') fechaValida = fechaItem === ayerStr;
            else if (filtroTiempo === 'mes') fechaValida = fechaItem.substring(0, 7) === mesActual;
            else if (filtroTiempo === 'anio') fechaValida = fechaItem.substring(0, 4) === anioActual;
            else if (filtroTiempo === 'personalizado') fechaValida = fechaItem === fechaPersonalizada;
            else if (filtroTiempo === 'rango') {
                if (!fechaInicio || !fechaFin) fechaValida = true;
                else fechaValida = fechaItem >= fechaInicio && fechaItem <= fechaFin;
            }
            
            if (!fechaValida) return;
            
            let montoServicio = 0;
            
            if (s.servicio === 'Agua') {
                if (s.consumoTotal && s.consumoTotal > 0) {
                    const precio = window.obtenerPrecioLocal ? window.obtenerPrecioLocal(local, 'Agua') : 1528.68;
                    montoServicio = s.consumoTotal * precio;
                } else {
                    montoServicio = s.monto || 0;
                }
                agua += montoServicio;
            } else if (s.servicio === 'Electricidad') {
                if (s.consumoTotal && s.consumoTotal > 0) {
                    const precio = window.obtenerPrecioLocal ? window.obtenerPrecioLocal(local, 'Electricidad') : 126.84;
                    montoServicio = s.consumoTotal * precio;
                } else {
                    montoServicio = s.monto || 0;
                }
                electricidad += montoServicio;
            } else if (s.servicio === 'Gas') {
                montoServicio = s.monto || 0;
                const diasGas = s.dias || 30;
                if (diasGas > 0) {
                    gasPromedioDiario += montoServicio / diasGas;
                }
                contadorGas++;
                gas += montoServicio;
                gasTotalPeriodo += montoServicio;
            }
            
            total += montoServicio;
        });
    });
    
    if (contadorGas > 0) {
        gasPromedioDiario = gasPromedioDiario / contadorGas;
    }
    
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
            comisionUber += (v.uber || 0) * 0.44;
            comisionPedidosYa += (v.pedidosYa || 0) * 0.18;
            comisionDidi += (v.didi || 0) * 0.18;
            comisionDatafonos += (v.bac || 0) * 0.0225;
        }
    });
    
    return {
        uber: comisionUber,
        pedidosYa: comisionPedidosYa,
        didi: comisionDidi,
        datafonos: comisionDatafonos,
        total: comisionUber + comisionPedidosYa + comisionDidi + comisionDatafonos
    };
}

function calcularPago10DesdeModulo(filtroLocal, filtroTiempo, fechaPersonalizada, fechaInicio, fechaFin, diasPeriodo) {
    if (window.pagos10 && window.pagos10.length > 0 && window.obtenerTotalPago10) {
        const totalPago10 = window.obtenerTotalPago10(
            filtroLocal,
            filtroTiempo,
            fechaPersonalizada,
            fechaInicio,
            fechaFin
        );

        if (totalPago10 > 0) {
            const promedioDiario = diasPeriodo > 0 ? totalPago10 / diasPeriodo : 0;
            return { total: totalPago10, promedioDiario };
        }
    }

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

async function renderResumen() {
    console.log('📊 Renderizando Resumen Financiero...');
    
    const resumenContent = document.getElementById('resumenContent');
    if (!resumenContent) {
        console.error('❌ Elemento resumenContent no encontrado');
        return;
    }
    
    // ============================================
    // ✅ OBTENER FILTRO DE LOCAL OBLIGATORIO
    // ============================================
    const filtroLocal = obtenerFiltroLocal();
    const filtroTiempo = AppState?.filtros?.tiempo || 'todos';
    const fechaPersonalizada = AppState?.filtros?.fechaPersonalizada;
    const fechaInicio = AppState?.filtros?.fechaInicio;
    const fechaFin = AppState?.filtros?.fechaFin;
    
    console.log('🔍 FILTRO LOCAL APLICADO:', filtroLocal);
    console.log('🔍 FILTRO TIEMPO:', filtroTiempo);
    
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
    
    let diasPeriodo = 30;
    if (filtroTiempo === 'mes') {
        diasPeriodo = diasDelMes;
    } else if (filtroTiempo === 'rango' && fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio + 'T12:00:00');
        const fin = new Date(fechaFin + 'T12:00:00');
        const diffTime = Math.abs(fin - inicio);
        diasPeriodo = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else if (filtroTiempo === 'ayer' || filtroTiempo === 'personalizado') {
        diasPeriodo = 1;
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

    // ============================================
    // ✅ FILTRO POR LOCAL - OBLIGATORIO
    // ============================================
    const filtrarPorLocalFn = (item) => {
        if (filtroLocal === 'Todos') return true;
        if (!item || !item.local) return false;
        return item.local === filtroLocal;
    };

    // Filtrar TODOS los datos por local Y fecha
    const ventasFiltradas = ventas.filter(v => 
        filtrarPorFecha(v, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocalFn(v)
    );

    const comprasFiltradas = compras.filter(c => 
        filtrarPorFecha(c, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocalFn(c)
    );
    
    const facturasFiltradas = facturas.filter(f => 
        filtrarPorFecha(f, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocalFn(f)
    );
    
    const mermasFiltradas = mermas.filter(m => 
        filtrarPorFecha(m, filtroTiempo, ayerStr, mesActual, anioActual, fechaPersonalizada, fechaInicio, fechaFin) && 
        filtrarPorLocalFn(m)
    );
    
    console.log('📊 RESULTADO FILTROS:');
    console.log('  Ventas filtradas:', ventasFiltradas.length);
    console.log('  Compras filtradas:', comprasFiltradas.length);
    console.log('  Facturas filtradas:', facturasFiltradas.length);
    console.log('  Mermas filtradas:', mermasFiltradas.length);
    
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
    const planillaCalc = calcularPlanilla(
        planilla, 
        filtroLocal,
        filtroTiempo, 
        ayerStr, 
        mesActual, 
        anioActual, 
        fechaPersonalizada, 
        fechaInicio, 
        fechaFin
    );

    // ============================================
    // PRÉSTAMOS - DECLARADO ANTES DE USARLO
    // ============================================
    const prestamosTotal = calcularPrestamos(
        prestamos, 
        filtroLocal, 
        filtroTiempo, 
        ayerStr, 
        mesActual, 
        anioActual, 
        fechaPersonalizada, 
        fechaInicio, 
        fechaFin
    );

    // ============================================
    // COMISIONES - DECLARADO ANTES DE USARLO
    // ============================================
    const comisiones = calcularComisionesVentas(ventasFiltradas);

    // ============================================
    // PAGO 10% - DECLARADO ANTES DE USARLO
    // ============================================
    const pago10Result = calcularPago10DesdeModulo(
        filtroLocal, 
        filtroTiempo, 
        fechaPersonalizada, 
        fechaInicio, 
        fechaFin, 
        diasPeriodo
    );
    const pago10PromedioDiario = pago10Result.promedioDiario || 0;

    // ============================================
    // COSTO MATERIA PRIMA - DECLARADO ANTES DE USARLO
    // ============================================
    const costoMateriaPrima = calcularCostoMateriaPrima(comprasFiltradas);

    // ============================================
    // FACTURACIÓN BODEGAS - DECLARADO ANTES DE USARLO
    // ============================================
    const facturacionBodegasTotal = calcularFacturacionBodegas(facturasFiltradas);

    // ============================================
    // MERMAS - DECLARADO ANTES DE USARLO
    // ============================================
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

    console.log('📊 Variables calculadas:', {
        planillaBase: planillaCalc.salarioBase,
        prestamosTotal: prestamosTotal,
        comisionesTotal: comisiones.total,
        pago10PromedioDiario: pago10PromedioDiario,
        costoMateriaPrima: costoMateriaPrima,
        facturacionBodegasTotal: facturacionBodegasTotal,
        mermasTotal: mermasTotal
    });

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
    if (filtroLocal !== 'Todos') {
        try {
            const { porcentajes } = await window.obtenerPorcentajesPorLocal?.({ tipo: filtroTiempo, dias: diasPeriodo }) || { porcentajes: {} };
            porcentajeLocal = porcentajes[filtroLocal] || 1;
        } catch(e) {
            porcentajeLocal = 1;
        }
    }

    const getValor = (valorMensual) => {
        if (!valorMensual) return 0;
        
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
        
        const year = mesReferencia.getFullYear();
        const month = mesReferencia.getMonth();
        const diasDelMes = new Date(year, month + 1, 0).getDate();
        
        const valorDiario = valorMensual / diasDelMes;
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
    const totalGastos = totalGastosOperativos + totalGastosAdminLogistica;
    const utilidadAntesImpuestos = totalVentas - totalGastos;
    const iva = costosFijos.iva || 0;
    const retencionTarjetaVenta = ventaBAC * 0.0531;
    const utilidadAntesRenta = utilidadAntesImpuestos - (retencionTarjetaVenta + iva);
    const impuestoRenta = utilidadAntesRenta > 0 ? utilidadAntesRenta * 0.30 : 0;
    const utilidadDespuesRenta = utilidadAntesRenta - impuestoRenta;
    const retencionTarjetaRenta = ventaBAC * 0.0171;
    const utilidadNeta = utilidadDespuesRenta - retencionTarjetaRenta;
    const margenUtilidad = totalVentas > 0 ? ((totalVentas - totalGastos) / totalVentas) * 100 : 0;

    const esUtilidad = utilidadNeta >= 0;
    const tipoResultado = esUtilidad ? 'UTILIDAD' : 'PÉRDIDA';

    // ============================================
    // FUNCIONES DE FORMATO
    // ============================================
    const pctIngresos = (valor) => totalVentas > 0 ? ((valor / totalVentas) * 100).toFixed(2) : '0.00';
    const pctGastosTotales = (valor) => totalGastos > 0 ? ((valor / totalGastos) * 100).toFixed(2) : '0.00';

    const money = (n) => `₡${Math.round(n || 0).toLocaleString()}`;
    
    const moneySigned = (n) => {
        const valor = n || 0;
        if (valor < 0) {
            return `-${money(Math.abs(valor))}`;
        }
        return money(valor);
    };

    const fila = (label, value) => `
        <tr>
            <td style="padding: 8px 20px 8px 40px; font-size: 0.9rem; color: #334155;">${label}</td>
            <td style="padding: 8px 20px; text-align: right; font-weight: 600;">${money(value)}</td>
            <td style="padding: 8px 20px; text-align: right; color: #64748b; font-weight: 600;">${pctIngresos(value)}%</td>
        </tr>
    `;

    const filaTotal = (label, value, bg, color) => `
        <tr style="background:${bg}; font-weight:800; border-top:2px solid #e2e8f0;">
            <td style="padding: 12px 20px;">${label}</td>
            <td style="padding: 12px 20px; text-align: right; color:${color}; font-weight:800;">${money(value)}</td>
            <td style="padding: 12px 20px; text-align: right; color:${color}; font-weight:800;">${pctIngresos(value)}%</td>
        </tr>
    `;

    const filaGasto = (label, value) => `
        <tr>
            <td style="padding: 8px 20px 8px 40px; font-size: 0.9rem; color: #334155;">${label}</td>
            <td style="padding: 8px 20px; text-align: right; font-weight: 600;">${money(value)}</td>
            <td style="padding: 8px 20px; text-align: right; color: #64748b; font-weight: 600;">${totalGastos > 0 ? ((value / totalGastos) * 100).toFixed(2) : '0.00'}%</td>
        </tr>
    `;

    // ============================================
    // CONSTRUIR HTML
    // ============================================
    let html;

    if (totalVentas === 0 && totalGastos === 0) {
        html = `
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
            
            <div class="card" style="padding: 60px 30px; text-align: center; border-radius: 24px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 24px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-inbox" style="font-size: 2.5rem; color: #94a3b8;"></i>
                </div>
                <h3 style="color: #475569; margin-bottom: 10px;">No hay datos para este local</h3>
                <p style="color: #94a3b8; max-width: 400px; margin: 0 auto;">
                    ${filtroLocal !== 'Todos' ? `No se encontraron registros para <strong>${filtroLocal}</strong> en el período seleccionado.` : 'No hay datos para mostrar en este período.'}
                </p>
            </div>
        `;
        resumenContent.innerHTML = html;
        return;
    }

    html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
            <div>
                <h2 style="margin:0; font-size:1.9rem; display:flex; align-items:center; gap:10px;">
                    <span style="display:inline-flex; width:48px; height:48px; align-items:center; justify-content:center; border-radius:16px; background:linear-gradient(135deg,#0ea5e9,#2563eb); color:white;">
                        <i class="fas fa-chart-line"></i>
                    </span>
                    Resumen Financiero
                </h2>
                <p style="margin:6px 0 0 58px; color:#64748b;">
                    Estado de resultados y análisis financiero
                    ${filtroLocal !== 'Todos' ? `<span style="background: #e0e7ff; color: #3730a3; padding: 2px 12px; border-radius: 12px; font-size: 0.85rem; margin-left: 8px;">${filtroLocal}</span>` : ''}
                </p>
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
                        ${gastosOperativos.map(item => filaGasto(item.label, item.value)).join('')}
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
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:#b91c1c;">${moneySigned(totalGastos)}</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:#b91c1c;">${pctGastosTotales(totalGastos)}%</td>
                        </tr>
                        
                        <tr style="border-top:2px solid #e2e8f0;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad Antes de Impuestos</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${utilidadAntesImpuestos < 0 ? '#b91c1c' : '#166534'};">${moneySigned(utilidadAntesImpuestos)}</td>
                            <td style="padding:12px 20px; text-align:right; color:#64748b;">—</td>
                        </tr>
                        
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#334155;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> IVA
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#b91c1c; font-weight:600;">${moneySigned(iva)}</td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#94a3b8;">—</td>
                        </tr>
                        
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#334155;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> Retención tarjeta (5.31%)
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#b91c1c; font-weight:600;">${moneySigned(retencionTarjetaVenta)}</td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#94a3b8;">—</td>
                        </tr>
                        
                        <tr style="background:#fefce8; border-top:1px solid #fde047;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad Antes de Renta</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${utilidadAntesRenta < 0 ? '#b91c1c' : '#854d0e'};">${moneySigned(utilidadAntesRenta)}</td>
                            <td style="padding:12px 20px; text-align:right; color:#64748b;">—</td>
                        </tr>
                        
                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#334155;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> Impuesto Renta (30%) ${impuestoRenta === 0 ? '<span style="color:#94a3b8; font-size:0.8rem;">(sin utilidad)</span>' : ''}
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#b91c1c; font-weight:600;">${impuestoRenta > 0 ? moneySigned(impuestoRenta) : '₡0'}</td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#94a3b8;">—</td>
                        </tr>

                        <tr style="background:#fefce8; border-top:1px solid #fde047;">
                            <td style="padding:12px 20px; font-weight:700;">Utilidad después de Renta</td>
                            <td style="padding:12px 20px; text-align:right; font-weight:700; color:${utilidadDespuesRenta < 0 ? '#b91c1c' : '#854d0e'};">${moneySigned(utilidadDespuesRenta)}</td>
                            <td style="padding:12px 20px; text-align:right; color:#64748b;">—</td>
                        </tr>

                        <tr>
                            <td style="padding:8px 20px 8px 40px; font-size:0.9rem; color:#334155;">
                                <i class="fas fa-minus" style="color:#dc2626; margin-right:8px;"></i> Retención tarjeta (1.71%)
                            </td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#b91c1c; font-weight:600;">${moneySigned(retencionTarjetaRenta)}</td>
                            <td style="padding:8px 20px; text-align:right; font-size:0.9rem; color:#94a3b8;">—</td>
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
                                ${moneySigned(utilidadNeta)}
                            </td>
                            <td style="padding:18px 20px; text-align:right; font-weight:700; font-size:1.1rem; color:${esUtilidad ? '#166534' : '#b91c1c'};">
                                ${pctIngresos(utilidadNeta)}%
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:12px 20px; color:#64748b; font-size:0.9rem;">
                                <i class="fas fa-info-circle" style="margin-right:8px;"></i> Margen de Utilidad
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
    `;

    resumenContent.innerHTML = html;
    console.log('✅ Resumen renderizado correctamente');
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

console.log('✅ resumen.js cargado correctamente');