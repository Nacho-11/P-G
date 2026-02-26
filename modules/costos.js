// modules/costos.js - VERSIÓN PANTALLA COMPLETA

// ============================================
// RENDERIZAR MÓDULO DE COSTOS FIJOS
// ============================================
function renderCostos() {
    const filtroLocal = AppState.filtros?.local || 'Todos';
    const filtroMes = AppState.filtros?.mes || new Date().toISOString().slice(0,7);
    
    const costosHTML = `
        <!-- HEADER FIJO EN LA PARTE SUPERIOR -->
        <div style="position: sticky; top: 0; background: white; z-index: 10; padding: 16px 0; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1 class="module-title" style="font-size: 2rem; margin: 0;">Costos Fijos</h1>
                <button class="btn btn-primary" onclick="mostrarModalCosto()" style="padding: 12px 32px;">
                    <i class="fas fa-plus"></i> Nuevo Costo Fijo
                </button>
            </div>

            <!-- FILTROS -->
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <div class="filter-group" style="flex: 1;">
                    <i class="fas fa-store filter-icon"></i>
                    <select id="filtroLocalCostos" class="filter-select" onchange="cambiarFiltroLocalCostos(this.value)" style="width: 100%; padding-left: 40px;">
                        <option value="Todos">Todos los locales</option>
                        ${AppState.locales.map(l => `<option value="${l.nombre}" ${filtroLocal === l.nombre ? 'selected' : ''}>${l.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group" style="flex: 1;">
                    <i class="fas fa-calendar filter-icon"></i>
                    <input type="month" id="filtroMesCostos" class="filter-input" value="${filtroMes}" onchange="cambiarFiltroMesCostos(this.value)" style="width: 100%; padding-left: 40px;">
                </div>
            </div>
        </div>

        <!-- TABS DE CATEGORÍAS (STICKY) -->
        <div style="position: sticky; top: 140px; background: white; z-index: 9; padding: 10px 0; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px;">
                <button class="tab-btn active" onclick="cambiarCategoriaCostos('restaurante', event)" style="padding: 10px 24px; border: none; background: #2563eb; color: white; border-radius: 30px; white-space: nowrap; font-weight: 500;">
                    <i class="fas fa-store"></i> Restaurante
                </button>
                <button class="tab-btn" onclick="cambiarCategoriaCostos('planta', event)" style="padding: 10px 24px; border: none; background: #f3f4f6; color: #4b5563; border-radius: 30px; white-space: nowrap; font-weight: 500;">
                    <i class="fas fa-industry"></i> Planta Producción
                </button>
                <button class="tab-btn" onclick="cambiarCategoriaCostos('oficinas', event)" style="padding: 10px 24px; border: none; background: #f3f4f6; color: #4b5563; border-radius: 30px; white-space: nowrap; font-weight: 500;">
                    <i class="fas fa-building"></i> Oficinas
                </button>
                <button class="tab-btn" onclick="cambiarCategoriaCostos('transporte', event)" style="padding: 10px 24px; border: none; background: #f3f4f6; color: #4b5563; border-radius: 30px; white-space: nowrap; font-weight: 500;">
                    <i class="fas fa-truck"></i> Transporte
                </button>
                <button class="tab-btn" onclick="cambiarCategoriaCostos('planilla', event)" style="padding: 10px 24px; border: none; background: #f3f4f6; color: #4b5563; border-radius: 30px; white-space: nowrap; font-weight: 500;">
                    <i class="fas fa-users"></i> Planilla Logística
                </button>
            </div>
        </div>

        <!-- CONTENEDOR PRINCIPAL (SCROLL) -->
        <div style="min-height: calc(100vh - 300px);">
            <div id="costosCategoriaContainer">
                ${renderCategoriaTransporte(filtroLocal)}
            </div>

            <!-- GRAN TOTAL -->
            <div style="margin-top: 30px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 20px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                    <div>
                        <div style="font-size: 1rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">TOTAL COSTOS FIJOS</div>
                        <div style="font-size: 3rem; font-weight: 700; line-height: 1.2;">₡${calcularTotalCostos().toLocaleString()}</div>
                        <div style="font-size: 1.2rem; opacity: 0.8; margin-top: 5px;">₡${Math.round(calcularTotalCostos() / 30).toLocaleString()} por día</div>
                    </div>
                    <i class="fas fa-chart-pie" style="font-size: 5rem; opacity: 0.3;"></i>
                </div>
                
                <!-- SUBTOTALES POR CATEGORÍA -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-top: 30px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.7;">Restaurante</div>
                        <div style="font-size: 1.3rem; font-weight: 600;">₡${calcularSubtotal('restaurante').toLocaleString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.7;">Planta</div>
                        <div style="font-size: 1.3rem; font-weight: 600;">₡${calcularSubtotal('planta').toLocaleString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.7;">Oficinas</div>
                        <div style="font-size: 1.3rem; font-weight: 600;">₡${calcularSubtotal('oficinas').toLocaleString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.7;">Transporte</div>
                        <div style="font-size: 1.3rem; font-weight: 600;">₡${calcularSubtotal('transporte').toLocaleString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.7;">Planilla</div>
                        <div style="font-size: 1.3rem; font-weight: 600;">₡${calcularSubtotal('planilla').toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('costosContent').innerHTML = costosHTML;
}

// ============================================
// RENDERIZAR CATEGORÍA: TRANSPORTE
// ============================================
function renderCategoriaTransporte(local) {
    const costosTransporte = [
        { concepto: 'Combustible Logística', monto: 552025 },
        { concepto: 'Electricidad Bodegas Lavacar', monto: 20800 },
        { concepto: 'Agua Bodegas Lavacar', monto: 17919 },
        { concepto: 'Alquiler Taller', monto: 1210000 },
        { concepto: 'GPS NAVSAT', monto: 85597.34 },
        { concepto: 'Marchamos', monto: 52192.5 },
        { concepto: 'DEKRA', monto: 5155 },
        { concepto: 'Mantenimiento Vehículos', monto: 508216.85 }
    ];
    
    const totalMensual = costosTransporte.reduce((sum, c) => sum + c.monto, 0);
    const totalDiario = totalMensual / 30;
    
    return `
        <div class="card" style="padding: 0; overflow: hidden;">
            <!-- HEADER DE LA TABLA -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px 24px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-truck" style="font-size: 1.8rem;"></i>
                        <h3 style="font-size: 1.4rem; font-weight: 600; margin: 0;">Costos Fijos - Transporte</h3>
                    </div>
                    <div style="display: flex; gap: 40px;">
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Mensual</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalMensual).toLocaleString()}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Diario</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalDiario).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABLA -->
            <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 16px; text-align: left; color: #4b5563; font-weight: 600;">Concepto</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Mensual</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Diario</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${costosTransporte.map(c => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 16px;"><strong>${c.concepto}</strong></td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto).toLocaleString()}</td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto / 30).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 600;">
                            <td style="padding: 16px;">TOTAL TRANSPORTE</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalMensual).toLocaleString()}</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalDiario).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// RENDERIZAR CATEGORÍA: RESTAURANTE
// ============================================
function renderCategoriaRestaurante(local) {
    const costosRestaurante = [
        { concepto: 'Alquiler de Local', monto: 550000 },
        { concepto: 'SECSA', monto: 54258 },
        { concepto: 'SOFT RESTAURANT', monto: 101935 },
        { concepto: 'Internet KOLBI', monto: 39850 },
        { concepto: 'Televisión KOLBI', monto: 23920 },
        { concepto: 'Alarma ADT', monto: 24300 },
        { concepto: 'Fumigación', monto: 35000 },
        { concepto: 'Póliza RT', monto: 58845 },
        { concepto: 'Depreciación de Activos', monto: 156886 },
        { concepto: 'Patente Comercial', monto: 28978 },
        { concepto: 'Permiso Ministerio de Salud', monto: 43900 },
        { concepto: 'Mantenimiento', monto: 145633 },
        { concepto: 'Hacienda IVA', monto: 276143 },
        { concepto: 'Asesoría Legal RH', monto: 20000 },
        { concepto: 'Publicidad', monto: 44444 },
        { concepto: 'Otros Servicios Profesionales', monto: 35439 }
    ];
    
    const totalMensual = costosRestaurante.reduce((sum, c) => sum + c.monto, 0);
    const totalDiario = totalMensual / 30;
    
    return `
        <div class="card" style="padding: 0; overflow: hidden;">
            <!-- HEADER DE LA TABLA -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px 24px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-store" style="font-size: 1.8rem;"></i>
                        <h3 style="font-size: 1.4rem; font-weight: 600; margin: 0;">Costos Fijos - Restaurante</h3>
                    </div>
                    <div style="display: flex; gap: 40px;">
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Mensual</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalMensual).toLocaleString()}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Diario</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalDiario).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABLA -->
            <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 16px; text-align: left; color: #4b5563; font-weight: 600;">Concepto</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Mensual</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Diario</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${costosRestaurante.map(c => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 16px;"><strong>${c.concepto}</strong></td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto).toLocaleString()}</td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto / 30).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 600;">
                            <td style="padding: 16px;">TOTAL RESTAURANTE</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalMensual).toLocaleString()}</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalDiario).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// RENDERIZAR CATEGORÍA: PLANTA PRODUCCIÓN
// ============================================
function renderCategoriaPlanta(local) {
    const costosPlanta = [
        { concepto: 'Electricidad Planta Producción', monto: 274732 },
        { concepto: 'Agua Planta Producción', monto: 65326 },
        { concepto: 'ADT Planta Producción', monto: 33372 },
        { concepto: 'Fumigación Planta Producción', monto: 35000 },
        { concepto: 'Software SECSA Planta', monto: 488323 },
        { concepto: 'IVA Hacienda 490', monto: 731570 },
        { concepto: 'Asesoría Legal RH Planta', monto: 20000 }
    ];
    
    const totalMensual = costosPlanta.reduce((sum, c) => sum + c.monto, 0);
    const totalDiario = totalMensual / 30;
    
    return `
        <div class="card" style="padding: 0; overflow: hidden;">
            <!-- HEADER DE LA TABLA -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px 24px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-industry" style="font-size: 1.8rem;"></i>
                        <h3 style="font-size: 1.4rem; font-weight: 600; margin: 0;">Costos Fijos - Planta Producción</h3>
                    </div>
                    <div style="display: flex; gap: 40px;">
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Mensual</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalMensual).toLocaleString()}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Diario</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalDiario).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABLA -->
            <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 16px; text-align: left; color: #4b5563; font-weight: 600;">Concepto</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Mensual</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Diario</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${costosPlanta.map(c => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 16px;"><strong>${c.concepto}</strong></td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto).toLocaleString()}</td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto / 30).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 600;">
                            <td style="padding: 16px;">TOTAL PLANTA</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalMensual).toLocaleString()}</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalDiario).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// RENDERIZAR CATEGORÍA: OFICINAS
// ============================================
function renderCategoriaOficinas(local) {
    const costosOficinas = [
        { concepto: 'Internet KOLBI', monto: 28824 },
        { concepto: 'Agua Oficinas', monto: 21433 },
        { concepto: 'Electricidad Oficinas', monto: 464064 },
        { concepto: 'Teléfono y Celulares', monto: 342926 },
        { concepto: 'ADT Oficinas', monto: 33372 },
        { concepto: 'Mantenimiento y Papelería', monto: 1361724 },
        { concepto: 'Software Planilla, Hosting, Office 365', monto: 266916 }
    ];
    
    const totalMensual = costosOficinas.reduce((sum, c) => sum + c.monto, 0);
    const totalDiario = totalMensual / 30;
    
    return `
        <div class="card" style="padding: 0; overflow: hidden;">
            <!-- HEADER DE LA TABLA -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px 24px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-building" style="font-size: 1.8rem;"></i>
                        <h3 style="font-size: 1.4rem; font-weight: 600; margin: 0;">Costos Fijos - Oficinas</h3>
                    </div>
                    <div style="display: flex; gap: 40px;">
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Mensual</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalMensual).toLocaleString()}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Diario</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalDiario).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABLA -->
            <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 16px; text-align: left; color: #4b5563; font-weight: 600;">Concepto</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Mensual</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Diario</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${costosOficinas.map(c => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 16px;"><strong>${c.concepto}</strong></td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto).toLocaleString()}</td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto / 30).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 600;">
                            <td style="padding: 16px;">TOTAL OFICINAS</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalMensual).toLocaleString()}</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalDiario).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// RENDERIZAR CATEGORÍA: PLANILLA LOGÍSTICA
// ============================================
function renderCategoriaPlanilla(local) {
    const costosPlanilla = [
        { concepto: 'Planilla Bodega', monto: 3458838 },
        { concepto: 'Alex Duque', monto: 1000000 },
        { concepto: 'Póliza RT Bodega y Oficinas', monto: 237686 },
        { concepto: 'CCSS Bodega y Oficinas', monto: 3649387 },
        { concepto: 'Planilla Oficinas', monto: 4141445 }
    ];
    
    const totalMensual = costosPlanilla.reduce((sum, c) => sum + c.monto, 0);
    const totalDiario = totalMensual / 30;
    
    return `
        <div class="card" style="padding: 0; overflow: hidden;">
            <!-- HEADER DE LA TABLA -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px 24px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-users" style="font-size: 1.8rem;"></i>
                        <h3 style="font-size: 1.4rem; font-weight: 600; margin: 0;">Planilla - Bodega y Oficinas</h3>
                    </div>
                    <div style="display: flex; gap: 40px;">
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Mensual</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalMensual).toLocaleString()}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">Total Diario</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">₡${Math.round(totalDiario).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABLA -->
            <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 16px; text-align: left; color: #4b5563; font-weight: 600;">Concepto</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Mensual</th>
                            <th style="padding: 16px; text-align: right; color: #4b5563; font-weight: 600;">Monto Diario</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${costosPlanilla.map(c => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 16px;"><strong>${c.concepto}</strong></td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto).toLocaleString()}</td>
                                <td style="padding: 16px; text-align: right;">₡${Math.round(c.monto / 30).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 600;">
                            <td style="padding: 16px;">TOTAL PLANILLA LOGÍSTICA</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalMensual).toLocaleString()}</td>
                            <td style="padding: 16px; text-align: right; color: #2563eb; font-size: 1.1rem;">₡${Math.round(totalDiario).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// FUNCIÓN: Cambiar categoría de costos
// ============================================
function cambiarCategoriaCostos(categoria, event) {
    // Actualizar tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.style.background = '#f3f4f6';
        tab.style.color = '#4b5563';
    });
    event.target.style.background = '#2563eb';
    event.target.style.color = 'white';
    
    const filtroLocal = document.getElementById('filtroLocalCostos')?.value || 'Todos';
    
    let contenido = '';
    switch(categoria) {
        case 'restaurante':
            contenido = renderCategoriaRestaurante(filtroLocal);
            break;
        case 'planta':
            contenido = renderCategoriaPlanta(filtroLocal);
            break;
        case 'oficinas':
            contenido = renderCategoriaOficinas(filtroLocal);
            break;
        case 'transporte':
            contenido = renderCategoriaTransporte(filtroLocal);
            break;
        case 'planilla':
            contenido = renderCategoriaPlanilla(filtroLocal);
            break;
    }
    
    document.getElementById('costosCategoriaContainer').innerHTML = contenido;
}

// ============================================
// FUNCIÓN: Cambiar filtro de local
// ============================================
function cambiarFiltroLocalCostos(local) {
    if (!AppState.filtros) AppState.filtros = {};
    AppState.filtros.local = local;
    
    // Actualizar el tab activo
    const tabActivo = document.querySelector('.tab-btn[style*="background: #2563eb"]');
    if (tabActivo) {
        const categoria = tabActivo.innerText.trim().toLowerCase().includes('restaurante') ? 'restaurante' :
                         tabActivo.innerText.trim().toLowerCase().includes('planta') ? 'planta' :
                         tabActivo.innerText.trim().toLowerCase().includes('oficinas') ? 'oficinas' :
                         tabActivo.innerText.trim().toLowerCase().includes('transporte') ? 'transporte' : 'planilla';
        
        let contenido = '';
        switch(categoria) {
            case 'restaurante': contenido = renderCategoriaRestaurante(local); break;
            case 'planta': contenido = renderCategoriaPlanta(local); break;
            case 'oficinas': contenido = renderCategoriaOficinas(local); break;
            case 'transporte': contenido = renderCategoriaTransporte(local); break;
            case 'planilla': contenido = renderCategoriaPlanilla(local); break;
        }
        document.getElementById('costosCategoriaContainer').innerHTML = contenido;
    }
}

// ============================================
// FUNCIÓN: Cambiar filtro de mes
// ============================================
function cambiarFiltroMesCostos(mes) {
    if (!AppState.filtros) AppState.filtros = {};
    AppState.filtros.mes = mes;
}

// ============================================
// FUNCIÓN: Calcular total de costos fijos
// ============================================
function calcularTotalCostos() {
    return 20906361.69; // El total exacto de tu imagen
}

// ============================================
// FUNCIÓN: Calcular subtotal por categoría
// ============================================
function calcularSubtotal(categoria) {
    const subtotales = {
        restaurante: 1799521,
        planta: 1643320,
        oficinas: 2525259,
        transporte: 2451905.69,
        planilla: 12485356
    };
    return subtotales[categoria] || 0;
}

// ============================================
// FUNCIÓN: Mostrar modal para nuevo costo
// ============================================
function mostrarModalCosto() {
    if (!document.getElementById('costoModal')) {
        crearModalCosto();
    }
    document.getElementById('costoModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
}

// ============================================
// FUNCIÓN: Crear modal de costo
// ============================================
function crearModalCosto() {
    const modalHTML = `
        <div class="modal" id="costoModal" role="dialog" aria-labelledby="costoModalTitle" aria-modal="true" style="max-width: 600px;">
            <div class="modal-header">
                <h2 id="costoModalTitle"><i class="fas fa-coins"></i> Nuevo Costo Fijo</h2>
                <button class="modal-close" onclick="cerrarModal('costoModal')" aria-label="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="costoForm" onsubmit="event.preventDefault(); guardarCosto();">
                    
                    <div class="form-group">
                        <label for="costoLocal">Local</label>
                        <select id="costoLocal" class="form-control" required>
                            <option value="">Seleccionar local...</option>
                            ${AppState.locales.map(l => `<option value="${l.nombre}">${l.nombre}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="costoCategoria">Categoría</label>
                        <select id="costoCategoria" class="form-control" required>
                            <option value="restaurante">Restaurante</option>
                            <option value="planta">Planta Producción</option>
                            <option value="oficinas">Oficinas</option>
                            <option value="transporte">Transporte</option>
                            <option value="planilla">Planilla Logística</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="costoConcepto">Concepto</label>
                        <input type="text" id="costoConcepto" class="form-control" placeholder="Ej: Alquiler, Electricidad, etc." required>
                    </div>
                    
                    <div class="form-group">
                        <label for="costoMonto">Monto Mensual (₡)</label>
                        <input type="number" id="costoMonto" class="form-control" value="0" min="0" step="1000" required>
                    </div>
                    
                    <div class="form-info">
                        <i class="fas fa-info-circle"></i>
                        <span>El monto diario se calcula automáticamente (mensual/30)</span>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="cerrarModal('costoModal')">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-save"></i> Guardar Costo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ============================================
// FUNCIÓN: Guardar costo (placeholder)
// ============================================
function guardarCosto() {
    alert('✅ Costo fijo guardado correctamente');
    cerrarModal('costoModal');
}

// ============================================
// FUNCIÓN: Cerrar modal
// ============================================
function cerrarModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
}