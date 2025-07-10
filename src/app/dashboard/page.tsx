/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";
import { User } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { Download } from "lucide-react";


// Tipos para los datos del informe
interface InformeFinanciero {
  ingresosCaja: number;
  egresosCaja: number;
  saldoCaja: number;
  ingresosBanco: number;
  egresosBanco: number;
  gastosBancarios: number;
  saldoBanco: number;
  totalFacturado: number;
  totalCompras: number;
  prestamosOtorgados: number;
  cuotasCobradas: number;
  cuotasPendientes: number;
  clientesNuevos: number;
  beneficioNeto: number;
}

type PeriodoTipo = 'dia' | 'semana' | 'mes' | 'trimestre' | 'año' | 'personalizado';

interface FiltroInforme {
  fechaInicio: string;
  fechaFin: string;
  periodo: PeriodoTipo;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [informe, setInforme] = useState<InformeFinanciero>({
    ingresosCaja: 0,
    egresosCaja: 0,
    saldoCaja: 0,
    ingresosBanco: 0,
    egresosBanco: 0,
    gastosBancarios: 0,
    saldoBanco: 0,
    totalFacturado: 0,
    totalCompras: 0,
    prestamosOtorgados: 0,
    cuotasCobradas: 0,
    cuotasPendientes: 0,
    clientesNuevos: 0,
    beneficioNeto: 0
  });
  
  const [filtro, setFiltro] = useState<FiltroInforme>({
    fechaInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    periodo: 'mes'
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // Funciones específicas para cada tipo de dato
  const obtenerMovimientosCaja = async () => {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('tipo, monto')
      .gte('fecha_movimiento', filtro.fechaInicio)
      .lte('fecha_movimiento', filtro.fechaFin + ' 23:59:59')
      .eq('eliminado', false);
    if (error) throw error;
    return data.reduce((acc, mov) => {
      if (mov.tipo === 'INGRESO') {
        acc.ingresos += Number(mov.monto);
      } else {
        acc.egresos += Number(mov.monto);
      }
      return acc;
    }, { ingresos: 0, egresos: 0 });
  };

  const obtenerMovimientosBanco = async () => {
    const { data, error } = await supabase
      .from('movimientos_banco')
      .select('tipo, monto')
      .gte('fecha_movimiento', filtro.fechaInicio)
      .lte('fecha_movimiento', filtro.fechaFin + ' 23:59:59')
      .eq('eliminado', false);
    if (error) throw error;
    return data.reduce((acc, mov) => {
      switch (mov.tipo) {
        case 'INGRESO':
          acc.ingresos += Number(mov.monto);
          break;
        case 'EGRESO':
          acc.egresos += Number(mov.monto);
          break;
        case 'GASTO_BANCARIO':
          acc.gastos += Number(mov.monto);
          break;
      }
      return acc;
    }, { ingresos: 0, egresos: 0, gastos: 0 });
  };

  const obtenerFacturas = async () => {
  const { data, error } = await supabase
    .from('facturacion')
    .select('total_factura, tipo_factura') // ✅ Agregar tipo_factura
    .gte('fecha_factura', filtro.fechaInicio)
    .lte('fecha_factura', filtro.fechaFin)
    .eq('eliminado', false); // ✅ Asegurar que no incluya eliminadas
  
  if (error) throw error;
  
  // ✅ CALCULAR IMPACTO REAL: Facturas suman, Notas de Crédito restan
  const total = data.reduce((acc, factura) => {
    const esNotaCredito = ['NCA', 'NCB', 'NCC'].includes(factura.tipo_factura);
    const impacto = esNotaCredito ? -factura.total_factura : factura.total_factura;
    return acc + impacto;
  }, 0);
  
  return { total };
};

  const obtenerCompras = async () => {
    const { data, error } = await supabase
      .from('compras')
      .select('total_factura')
      .gte('fecha_compra', filtro.fechaInicio)
      .lte('fecha_compra', filtro.fechaFin)
      .eq('eliminado', false);
    if (error) throw error;
    const total = data.reduce((acc, compra) => acc + Number(compra.total_factura), 0);
    return { total };
  };

  const obtenerPrestamos = async () => {
    const { data, error } = await supabase
      .from('prestamos')
      .select('monto_total')
      .gte('fecha_inicio', filtro.fechaInicio)
      .lte('fecha_inicio', filtro.fechaFin);
    if (error) throw error;
    const monto = data.reduce((acc, prestamo) => acc + Number(prestamo.monto_total), 0);
    return { monto };
  };

  const obtenerCuotas = async () => {
    const { data, error } = await supabase
      .from('cuotas')
      .select('monto, estado')
      .gte('fecha_vencimiento', filtro.fechaInicio)
      .lte('fecha_vencimiento', filtro.fechaFin);
    if (error) throw error;
    const pendientes = data
      .filter(cuota => cuota.estado === 'PENDIENTE')
      .reduce((acc, cuota) => acc + Number(cuota.monto), 0);
    return { pendientes };
  };

  const obtenerPagos = async () => {
    const { data, error } = await supabase
      .from('pagos')
      .select('monto')
      .gte('fecha_pago', filtro.fechaInicio)
      .lte('fecha_pago', filtro.fechaFin + ' 23:59:59');
    if (error) throw error;
    const total = data.reduce((acc, pago) => acc + Number(pago.monto), 0);
    return { total };
  };

  const obtenerClientesNuevos = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id')
      .eq('eliminado', false)
      .gte('created_at', filtro.fechaInicio)
      .lte('created_at', filtro.fechaFin + ' 23:59:59');
    if (error) throw error;
    return { nuevos: data.length };
  };

  // Función principal para generar el informe completo - CORREGIDA con useCallback
  const generarInforme = useCallback(async () => {

    // Validar que las fechas estén completas y sean válidas
      if (!filtro.fechaInicio || !filtro.fechaFin || 
          filtro.fechaInicio.length < 10 || filtro.fechaFin.length < 10 ||
          isNaN(Date.parse(filtro.fechaInicio)) || isNaN(Date.parse(filtro.fechaFin))) {
        console.log('Fechas incompletas o inválidas, esperando...');
        return;
      }

    setLoading(true);
    try {
      const [
        movimientosCaja,
        movimientosBanco,
        facturas,
        compras,
        prestamos,
        cuotas,
        pagos,
        clientes
      ] = await Promise.all([
        obtenerMovimientosCaja(),
        obtenerMovimientosBanco(),
        obtenerFacturas(),
        obtenerCompras(),
        obtenerPrestamos(),
        obtenerCuotas(),
        obtenerPagos(),
        obtenerClientesNuevos()
      ]);

      const nuevoInforme: InformeFinanciero = {
        ingresosCaja: movimientosCaja.ingresos,
        egresosCaja: movimientosCaja.egresos,
        saldoCaja: movimientosCaja.ingresos - movimientosCaja.egresos,
        ingresosBanco: movimientosBanco.ingresos,
        egresosBanco: movimientosBanco.egresos,
        gastosBancarios: movimientosBanco.gastos,
        saldoBanco: movimientosBanco.ingresos - movimientosBanco.egresos - movimientosBanco.gastos,
        totalFacturado: facturas.total,
        totalCompras: compras.total,
        prestamosOtorgados: prestamos.monto,
        cuotasCobradas: pagos.total,
        cuotasPendientes: cuotas.pendientes,
        clientesNuevos: clientes.nuevos,
        beneficioNeto: (movimientosCaja.ingresos + movimientosBanco.ingresos + facturas.total) - 
                      (movimientosCaja.egresos + movimientosBanco.egresos + movimientosBanco.gastos + compras.total)
      };
      setInforme(nuevoInforme);
    } catch (error) {
      console.error('Error generando informe:', error);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    if (user) {
      generarInforme();
    }
  }, [user, filtro, generarInforme]);

  // Función para cambiar el período predefinido
  const cambiarPeriodo = (periodo: PeriodoTipo) => {
    const hoy = new Date();
    let fechaInicio: Date | null = null;
    const fechaFin: Date = new Date();

    // Manejar solo los periodos predefinidos
    if (periodo === 'personalizado') {
      setFiltro({ ...filtro, periodo });
      return;
    }

    switch (periodo) {
      case 'dia':
        fechaInicio = new Date();
        break;
      case 'semana':
        fechaInicio = new Date();
        fechaInicio.setDate(hoy.getDate() - 7);
        break;
      case 'mes':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        break;
      case 'trimestre':
        const mesActual = hoy.getMonth();
        const inicioTrimestre = Math.floor(mesActual / 3) * 3;
        fechaInicio = new Date(hoy.getFullYear(), inicioTrimestre, 1);
        break;
      case 'año':
        fechaInicio = new Date(hoy.getFullYear(), 0, 1);
        break;
    }

    if (fechaInicio) {
      setFiltro({
        ...filtro,
        periodo,
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        fechaFin: fechaFin.toISOString().split('T')[0]
      });
    }
  };

  // Función para exportar informe a Excel
  const exportarInforme = () => {
    // Crear datos para el resumen ejecutivo
    const resumenEjecutivo = [
      ["INFORME FINANCIERO - GP CAPITAL", "", "", ""],
      [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", ""],
      ["", "", "", ""],
      ["RESUMEN EJECUTIVO", "", "", ""],
      ["Concepto", "Monto", "", ""],
      ["Beneficio Neto", informe.beneficioNeto, "", ""],
      ["Saldo Total Caja", informe.saldoCaja, "", ""],
      ["Saldo Total Banco", informe.saldoBanco, "", ""],
      ["Clientes Nuevos", informe.clientesNuevos, "", ""],
      ["", "", "", ""]
    ];

    // Datos detallados por categoría
    const movimientosCajaData = [
      ["MOVIMIENTOS DE CAJA", "", "", ""],
      ["Concepto", "Monto", "", ""],
      ["Ingresos de Caja", informe.ingresosCaja, "", ""],
      ["Egresos de Caja", informe.egresosCaja, "", ""],
      ["Saldo Neto Caja", informe.saldoCaja, "", ""],
      ["", "", "", ""]
    ];

    const movimientosBancoData = [
      ["MOVIMIENTOS BANCARIOS", "", "", ""],
      ["Concepto", "Monto", "", ""],
      ["Ingresos Bancarios", informe.ingresosBanco, "", ""],
      ["Egresos Bancarios", informe.egresosBanco, "", ""],
      ["Gastos Bancarios", informe.gastosBancarios, "", ""],
      ["Saldo Neto Banco", informe.saldoBanco, "", ""],
      ["", "", "", ""]
    ];

    const facturacionData = [
      ["FACTURACIÓN Y COMPRAS", "", "", ""],
      ["Concepto", "Monto", "", ""],
      ["Total Facturado", informe.totalFacturado, "", ""],
      ["Total Compras", informe.totalCompras, "", ""],
      ["Diferencia", informe.totalFacturado - informe.totalCompras, "", ""],
      ["", "", "", ""]
    ];

    const prestamosData = [
      ["GESTIÓN DE PRÉSTAMOS", "", "", ""],
      ["Concepto", "Monto", "", ""],
      ["Préstamos Otorgados", informe.prestamosOtorgados, "", ""],
      ["Cuotas Cobradas", informe.cuotasCobradas, "", ""],
      ["Cuotas Pendientes", informe.cuotasPendientes, "", ""],
      ["", "", "", ""]
    ];

    // Combinar todos los datos
    const datosCompletos = [
      ...resumenEjecutivo,
      ...movimientosCajaData,
      ...movimientosBancoData,
      ...facturacionData,
      ...prestamosData
    ];

    // Crear el libro de trabajo
    const wb = XLSX.utils.book_new();
    
    // Crear la hoja principal con el informe completo
    const ws = XLSX.utils.aoa_to_sheet(datosCompletos);

    // Configurar el ancho de las columnas
    ws['!cols'] = [
      { wch: 25 }, // Columna A - Conceptos
      { wch: 15 }, // Columna B - Montos
      { wch: 12 }, // Columna C - Porcentajes
      { wch: 10 }  // Columna D - Extra
    ];

    // Verificar que la hoja tenga rango definido
    if (!ws['!ref']) {
      console.error('La hoja de cálculo no tiene rango definido');
      return;
    }

    // Agregar estilos y formato (SheetJS básico)
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Formatear celdas de títulos principales
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({c: C, r: R});
        if (!ws[cell_address]) continue;
        
        const cell = ws[cell_address];
        if (typeof cell.v === 'string' && 
            (cell.v.includes('CAPITAL') || 
            cell.v.includes('MOVIMIENTOS DE CAJA') || 
            cell.v.includes('MOVIMIENTOS BANCARIOS') ||
            cell.v.includes('FACTURACIÓN Y COMPRAS') ||
            cell.v.includes('GESTIÓN DE PRÉSTAMOS') ||
            cell.v.includes('ANÁLISIS DE RENTABILIDAD'))) {
          if (!cell.s) cell.s = {};
          cell.s.font = { bold: true };
        }
      }
    }

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, "Informe Financiero");

    // Crear hoja adicional con datos en formato tabla para análisis
    const datosTabla = [
      ["Métrica", "Valor"],
      ["Ingresos Caja", informe.ingresosCaja],
      ["Egresos Caja", informe.egresosCaja],
      ["Saldo Caja", informe.saldoCaja],
      ["Ingresos Banco", informe.ingresosBanco],
      ["Egresos Banco", informe.egresosBanco],
      ["Gastos Bancarios", informe.gastosBancarios],
      ["Saldo Banco", informe.saldoBanco],
      ["Total Facturado", informe.totalFacturado],
      ["Total Compras", informe.totalCompras],
      ["Préstamos Otorgados", informe.prestamosOtorgados],
      ["Cuotas Cobradas", informe.cuotasCobradas],
      ["Cuotas Pendientes", informe.cuotasPendientes],
      ["Clientes Nuevos", informe.clientesNuevos],
      ["Beneficio Neto", informe.beneficioNeto]
    ];

    const wsTabla = XLSX.utils.aoa_to_sheet(datosTabla);
    wsTabla['!cols'] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTabla, "Datos Tabulados");

    // Generar el archivo Excel
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Informe_GP_Capital_${filtro.fechaInicio}_${filtro.fechaFin}_${fechaActual}.xlsx`;
    
    XLSX.writeFile(wb, nombreArchivo);
  };

  // Función para exportar informe DETALLADO de Facturación y Compras - CORREGIDA
  const exportarFacturacionCompras = async () => {
  setLoading(true);
  try {
    // Obtener datos detallados de facturación
    const { data: facturasDetalle, error: facturaError } = await supabase
      .from('facturacion')
      .select(`
        fecha_factura,  
        numero_factura,
        punto_venta,
        tipo_factura,
        total_factura,
        cliente:cliente_id(
          nombre,
          apellido,
          tipo_cliente,
          empresa
        )
      `)
      .eq('eliminado', false)
      .gte('fecha_factura', filtro.fechaInicio)
      .lte('fecha_factura', filtro.fechaFin)
      .order('fecha_factura', { ascending: false });

    if (facturaError) throw facturaError;

    // Obtener datos detallados de compras
    const { data: comprasDetalle, error: compraError } = await supabase
      .from('compras')
      .select(`
        fecha_compra,
        numero_factura,
        punto_venta,
        tipo_factura,
        total_factura,
        proveedor:proveedor_id(
          nombre,
          cuit
        )
      `)
      .gte('fecha_compra', filtro.fechaInicio)
      .lte('fecha_compra', filtro.fechaFin)
      .eq('eliminado', false)
      .order('fecha_compra', { ascending: false });

    if (compraError) throw compraError;

    // ✅ CALCULAR TOTALES CORRECTOS CON IMPACTO DE NOTAS DE CRÉDITO
    const totalFacturadoReal = facturasDetalle?.reduce((acc, factura) => {
      const esNotaCredito = ['NCA', 'NCB', 'NCC'].includes(factura.tipo_factura);
      return acc + (esNotaCredito ? -factura.total_factura : factura.total_factura);
    }, 0) || 0;

    const totalCompras = comprasDetalle?.reduce((acc, compra) => acc + compra.total_factura, 0) || 0;

    // ✅ SEPARAR FACTURAS Y NOTAS DE CRÉDITO PARA ANÁLISIS
    const facturas = facturasDetalle?.filter(f => !['NCA', 'NCB', 'NCC'].includes(f.tipo_factura)) || [];
    const notasCredito = facturasDetalle?.filter(f => ['NCA', 'NCB', 'NCC'].includes(f.tipo_factura)) || [];
    
    const totalFacturas = facturas.reduce((sum, f) => sum + f.total_factura, 0);
    const totalNotasCredito = notasCredito.reduce((sum, f) => sum + f.total_factura, 0);

    // Crear datos base del informe CON VALORES CORREGIDOS
    const datosBase = [
      ["FACTURACIÓN Y COMPRAS - GP CAPITAL", "", "", ""],
      [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", ""],
      ["", "", "", ""],
      ["RESUMEN EJECUTIVO", "", "", ""],
      ["Concepto", "Monto", "", ""],
      ["Total Facturas Emitidas", totalFacturas, "", ""],
      ["Total Notas de Crédito", -totalNotasCredito, "", ""], // ✅ Mostrar como negativo
      ["TOTAL NETO FACTURADO", totalFacturadoReal, "", ""], // ✅ Valor neto real
      ["Total Compras", totalCompras, "", ""],
      ["Diferencia Neta", totalFacturadoReal - totalCompras, "", ""],
      ["", "", "", ""],
      ["ANÁLISIS DE DOCUMENTOS", "", "", ""],
      ["Cantidad Facturas", facturas.length, "", ""],
      ["Cantidad Notas Crédito", notasCredito.length, "", ""],
      ["Total Documentos", facturasDetalle?.length || 0, "", ""],
      ["", "", "", ""],
      ["DETALLE DE FACTURACIÓN", "", "", ""],
      ["Fecha", "N° Factura", "Cliente", "Monto"]
    ];

    // ✅ AGREGAR DETALLES DE FACTURACIÓN CON INDICADORES DE NC
    const detallesFacturacion = facturasDetalle?.map(factura => {
      const numeroCompleto = factura.punto_venta 
        ? `${factura.punto_venta}-${String(factura.numero_factura).padStart(8, '0')}`
        : String(factura.numero_factura).padStart(8, '0');

      const nombreCliente = factura.cliente 
        ? ((factura.cliente as any).tipo_cliente === 'EMPRESA'
            ? (factura.cliente as any).empresa || (factura.cliente as any).nombre
            : `${(factura.cliente as any).apellido || ''}, ${(factura.cliente as any).nombre || ''}`.trim())
        : 'Cliente no encontrado';

      const esNotaCredito = ['NCA', 'NCB', 'NCC'].includes(factura.tipo_factura);
      const montoImpacto = esNotaCredito ? -factura.total_factura : factura.total_factura;

      return [
        new Date(factura.fecha_factura).toLocaleDateString('es-AR'),
        `${factura.tipo_factura}-${numeroCompleto}${esNotaCredito ? ' (NOTA CRÉDITO)' : ''}`,
        nombreCliente,
        montoImpacto // ✅ Mostrar impacto real (negativo para NC)
      ];
    }) || [];

    // Separador entre facturas y compras
    const separador = [
      ["", "", "", ""],
      ["DETALLE DE COMPRAS", "", "", ""],
      ["Fecha", "N° Factura", "Proveedor", "Monto"]
    ];

    // Agregar detalles de compras (sin cambios)
    const detallesCompras = comprasDetalle?.map(compra => {
      const numeroCompleto = compra.punto_venta 
        ? `${compra.punto_venta}-${compra.numero_factura}`
        : compra.numero_factura;

      const nombreProveedor = compra.proveedor 
        ? (compra.proveedor as any).nombre
        : 'Proveedor no encontrado';

      return [
        new Date(compra.fecha_compra).toLocaleDateString('es-AR'),
        `${compra.tipo_factura}-${numeroCompleto}`,
        nombreProveedor,
        compra.total_factura
      ];
    }) || [];

    // Combinar todos los datos
    const datosCompletos = [
      ...datosBase,
      ...detallesFacturacion,
      ...separador,
      ...detallesCompras
    ];

    // Crear el libro de trabajo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datosCompletos);

    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }
    ];

    // Formatear celdas importantes
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({c: C, r: R});
          if (!ws[cell_address]) continue;
          
          const cell = ws[cell_address];
          
          if (typeof cell.v === 'string' && 
              (cell.v.includes('CAPITAL') || 
              cell.v.includes('DETALLE DE FACTURACIÓN') ||
              cell.v.includes('DETALLE DE COMPRAS') ||
              cell.v.includes('RESUMEN') ||
              cell.v.includes('ANÁLISIS'))) {
            if (!cell.s) cell.s = {};
            cell.s.font = { bold: true };
          }
          
          if (typeof cell.v === 'number' && Math.abs(cell.v) > 1000) {
            if (!cell.s) cell.s = {};
            cell.s.numFmt = '#,##0.00';
          }

          // ✅ COLOREAR NOTAS DE CRÉDITO EN ROJO
          if (typeof cell.v === 'number' && cell.v < 0) {
            if (!cell.s) cell.s = {};
            cell.s.font = { ...cell.s.font, color: { rgb: "FF0000" } };
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Facturación y Compras");

    // ✅ CREAR HOJA SEPARADA SOLO CON FACTURAS REGULARES
    if (facturas.length > 0) {
      const facturasParaAnalisis = [
        ["SOLO FACTURAS REGULARES", "", "", "", ""],
        ["Fecha", "Tipo", "N° Factura", "Cliente", "Monto"],
        ...facturas.map(f => [
          new Date(f.fecha_factura).toLocaleDateString('es-AR'),
          f.tipo_factura,
          f.punto_venta ? `${f.punto_venta}-${String(f.numero_factura).padStart(8, '0')}` : String(f.numero_factura),
          f.cliente 
            ? ((f.cliente as any).tipo_cliente === 'EMPRESA' 
                ? (f.cliente as any).empresa 
                : `${(f.cliente as any).apellido}, ${(f.cliente as any).nombre}`)
            : 'Cliente no encontrado',
          f.total_factura
        ]),
        ["", "", "", "", ""],
        ["TOTAL FACTURAS", "", "", "", totalFacturas]
      ];
      
      const wsFacturas = XLSX.utils.aoa_to_sheet(facturasParaAnalisis);
      wsFacturas['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsFacturas, "Solo Facturas");
    }

    // ✅ CREAR HOJA SEPARADA SOLO CON NOTAS DE CRÉDITO
    if (notasCredito.length > 0) {
      const notasCreditoAnalisis = [
        ["SOLO NOTAS DE CRÉDITO", "", "", "", ""],
        ["Fecha", "Tipo", "N° Factura", "Cliente", "Monto (Descuento)"],
        ...notasCredito.map(f => [
          new Date(f.fecha_factura).toLocaleDateString('es-AR'),
          f.tipo_factura,
          f.punto_venta ? `${f.punto_venta}-${String(f.numero_factura).padStart(8, '0')}` : String(f.numero_factura),
          f.cliente 
            ? ((f.cliente as any).tipo_cliente === 'EMPRESA' 
                ? (f.cliente as any).empresa 
                : `${(f.cliente as any).apellido}, ${(f.cliente as any).nombre}`)
            : 'Cliente no encontrado',
          -f.total_factura // ✅ Mostrar como negativo
        ]),
        ["", "", "", "", ""],
        ["TOTAL NOTAS CRÉDITO", "", "", "", -totalNotasCredito]
      ];
      
      const wsNotasCredito = XLSX.utils.aoa_to_sheet(notasCreditoAnalisis);
      wsNotasCredito['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsNotasCredito, "Notas de Crédito");
    }

    // ✅ CREAR HOJA CON RESUMEN COMPARATIVO
    const resumenComparativo = [
      ["RESUMEN COMPARATIVO", "", ""],
      ["", "", ""],
      ["FACTURACIÓN", "", ""],
      ["Concepto", "Cantidad", "Monto Total"],
      ["Facturas Regulares", facturas.length, totalFacturas],
      ["Notas de Crédito", notasCredito.length, -totalNotasCredito],
      ["NETO FACTURADO", facturasDetalle?.length || 0, totalFacturadoReal],
      ["", "", ""],
      ["COMPRAS", "", ""],
      ["Total Compras", comprasDetalle?.length || 0, totalCompras],
      ["", "", ""],
      ["RESULTADO", "", ""],
      ["Diferencia (Facturación - Compras)", "", totalFacturadoReal - totalCompras],
      ["", "", ""],
      ["ANÁLISIS", "", ""],
      ["% Notas Crédito vs Facturas", "", facturas.length > 0 ? ((notasCredito.length / facturas.length) * 100).toFixed(2) + "%" : "0%"],
      ["Promedio por Factura", "", facturas.length > 0 ? (totalFacturas / facturas.length).toFixed(2) : "0"],
      ["Promedio por Nota Crédito", "", notasCredito.length > 0 ? (totalNotasCredito / notasCredito.length).toFixed(2) : "0"]
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenComparativo);
    wsResumen['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Comparativo");

    // Crear hoja adicional solo con compras (sin cambios)
    if (comprasDetalle && comprasDetalle.length > 0) {
      const comprasParaAnalisis = [
        ["ANÁLISIS DE COMPRAS", "", "", ""],
        ["Fecha", "Tipo", "N° Factura", "Proveedor", "Monto"],
        ...comprasDetalle.map(c => [
          new Date(c.fecha_compra).toLocaleDateString('es-AR'),
          c.tipo_factura,
          c.punto_venta ? `${c.punto_venta}-${c.numero_factura}` : c.numero_factura,
          c.proveedor 
            ? (c.proveedor as any).nombre
            : 'Proveedor no encontrado',
          c.total_factura
        ])
      ];
      
      const wsCompras = XLSX.utils.aoa_to_sheet(comprasParaAnalisis);
      wsCompras['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsCompras, "Solo Compras");
    }

    const nombreArchivo = `Facturacion_Compras_Detallado_${filtro.fechaInicio}_${filtro.fechaFin}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    
    console.log(`✅ Exportado: ${facturas.length} facturas, ${notasCredito.length} notas crédito, ${comprasDetalle?.length || 0} compras`);
    console.log(`📊 Total Neto Facturado: $${totalFacturadoReal.toLocaleString()}`);
    
  } catch (error) {
    console.error('Error exportando facturación y compras:', error);
    alert('Error al exportar el informe detallado');
  } finally {
    setLoading(false);
  }
};

  // Función para exportar informe DETALLADO de Gestión de Préstamos - CORREGIDA
  const exportarGestionPrestamos = async () => {
    setLoading(true);
    try {
      // Obtener datos detallados de préstamos
      const { data: prestamos, error: prestamosError } = await supabase
        .from('prestamos')
        .select(`
          *,
          cliente:cliente_id(
            nombre,
            apellido,
            tipo_cliente,
            empresa,
            dni,
            cuit
          )
        `)
        .gte('fecha_inicio', filtro.fechaInicio)
        .lte('fecha_inicio', filtro.fechaFin)
        .order('fecha_inicio', { ascending: false });

      if (prestamosError) throw prestamosError;

      // Obtener datos detallados de cuotas del período
      const { data: cuotas, error: cuotasError } = await supabase
        .from('cuotas')
        .select(`
          *,
          prestamo:prestamo_id(
            cliente_id,
            monto_total,
            cliente:cliente_id(
              nombre,
              apellido,
              tipo_cliente,
              empresa
            )
          )
        `)
        .gte('fecha_vencimiento', filtro.fechaInicio)
        .lte('fecha_vencimiento', filtro.fechaFin)
        .order('fecha_vencimiento', { ascending: false });

      if (cuotasError) throw cuotasError;

      // Obtener pagos del período
      const { data: pagos, error: pagosError } = await supabase
        .from('pagos')
        .select(`
          *,
          cuota:cuota_id(
            numero_cuota,
            prestamo:prestamo_id(
              cliente:cliente_id(
                nombre,
                apellido,
                tipo_cliente,
                empresa
              )
            )
          )
        `)
        .gte('fecha_pago', filtro.fechaInicio)
        .lte('fecha_pago', filtro.fechaFin + ' 23:59:59')
        .order('fecha_pago', { ascending: false });

      if (pagosError) throw pagosError;

      // Calcular totales
      const totales = {
        prestamosOtorgados: prestamos?.reduce((sum, p) => sum + Number(p.monto_total), 0) || 0,
        cuotasPendientes: cuotas?.filter(c => c.estado === 'PENDIENTE').reduce((sum, c) => sum + Number(c.monto), 0) || 0,
        cuotasCobradas: pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
      };

      // Crear datos base
      const datosBase = [
        ["GESTIÓN DE PRÉSTAMOS - GP CAPITAL", "", "", "", "", ""],
        [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", "", "", ""],
        ["", "", "", "", "", ""],
        ["RESUMEN", "", "", "", "", ""],
        ["Concepto", "Monto", "", "", "", ""],
        ["Préstamos Otorgados", totales.prestamosOtorgados, "", "", "", ""],
        ["Cuotas Cobradas", totales.cuotasCobradas, "", "", "", ""],
        ["Cuotas Pendientes", totales.cuotasPendientes, "", "", "", ""],
        ["", "", "", "", "", ""],
        ["DETALLE DE PRÉSTAMOS", "", "", "", "", ""],
        ["Fecha", "Cliente", "Monto Total", "Tasa (%)", "Cuotas", "Estado"]
      ];

      // Agregar detalles de préstamos - CORREGIDO con as any
      const detallesPrestamos = prestamos?.map(prestamo => {
        const nombreCliente = (prestamo.cliente as any)?.tipo_cliente === 'EMPRESA'
          ? (prestamo.cliente as any).empresa || (prestamo.cliente as any).nombre
          : `${(prestamo.cliente as any)?.apellido || ''}, ${(prestamo.cliente as any)?.nombre || ''}`.trim();

        return [
          new Date(prestamo.fecha_inicio).toLocaleDateString('es-AR'),
          nombreCliente,
          prestamo.monto_total,
          prestamo.tasa_interes,
          prestamo.cantidad_cuotas,
          prestamo.estado
        ];
      }) || [];

      // Separador para cuotas
      const separadorCuotas = [
        ["", "", "", "", "", ""],
        ["DETALLE DE CUOTAS", "", "", "", "", ""],
        ["Fecha Vencimiento", "Cliente", "N° Cuota", "Monto", "Estado", "Fecha Pago"]
      ];

      // Agregar detalles de cuotas - CORREGIDO con as any
      const detallesCuotas = cuotas?.map(cuota => {
        const nombreCliente = (cuota.prestamo as any)?.cliente?.tipo_cliente === 'EMPRESA'
          ? (cuota.prestamo as any).cliente.empresa || (cuota.prestamo as any).cliente.nombre
          : `${(cuota.prestamo as any)?.cliente?.apellido || ''}, ${(cuota.prestamo as any)?.cliente?.nombre || ''}`.trim();

        return [
          new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR'),
          nombreCliente,
          cuota.numero_cuota,
          cuota.monto,
          cuota.estado,
          cuota.fecha_pago ? new Date(cuota.fecha_pago).toLocaleDateString('es-AR') : '-'
        ];
      }) || [];

      // Separador para pagos
      const separadorPagos = [
        ["", "", "", "", "", ""],
        ["DETALLE DE PAGOS", "", "", "", "", ""],
        ["Fecha Pago", "Cliente", "N° Cuota", "Monto", "Método Pago", "Comprobante"]
      ];

      // Agregar detalles de pagos - CORREGIDO con as any
      const detallesPagos = pagos?.map(pago => {
        const nombreCliente = (pago.cuota as any)?.prestamo?.cliente?.tipo_cliente === 'EMPRESA'
          ? (pago.cuota as any).prestamo.cliente.empresa || (pago.cuota as any).prestamo.cliente.nombre
          : `${(pago.cuota as any)?.prestamo?.cliente?.apellido || ''}, ${(pago.cuota as any)?.prestamo?.cliente?.nombre || ''}`.trim();

        return [
          new Date(pago.fecha_pago).toLocaleDateString('es-AR'),
          nombreCliente,
          (pago.cuota as any)?.numero_cuota || '-',
          pago.monto,
          pago.metodo_pago,
          pago.comprobante
        ];
      }) || [];

      // Estadísticas
      const estadisticas = [
        ["", "", "", "", "", ""],
        ["ESTADÍSTICAS", "", "", "", "", ""],
        ["Total Préstamos", prestamos?.length || 0, "", "", "", ""],
        ["Total Cuotas", cuotas?.length || 0, "", "", "", ""],
        ["Cuotas Pendientes", cuotas?.filter(c => c.estado === 'PENDIENTE').length || 0, "", "", "", ""],
        ["Cuotas Pagadas", cuotas?.filter(c => c.estado === 'PAGADO').length || 0, "", "", "", ""],
        ["Cuotas Vencidas", cuotas?.filter(c => c.estado === 'VENCIDO').length || 0, "", "", "", ""],
        ["Total Pagos", pagos?.length || 0, "", "", "", ""],
        ["Promedio Préstamo", prestamos?.length ? (totales.prestamosOtorgados / prestamos.length).toFixed(2) : 0, "", "", "", ""]
      ];

      // Combinar todos los datos
      const datosCompletos = [
        ...datosBase,
        ...detallesPrestamos,
        ...separadorCuotas,
        ...detallesCuotas,
        ...separadorPagos,
        ...detallesPagos,
        ...estadisticas
      ];

      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(datosCompletos);
      ws['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
      ];

      // Formatear
      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({c: C, r: R});
            if (!ws[cell_address]) continue;
            
            const cell = ws[cell_address];
            if (typeof cell.v === 'string' && 
                (cell.v.includes('CAPITAL') || cell.v.includes('RESUMEN') || 
                 cell.v.includes('DETALLE') || cell.v.includes('ESTADÍSTICAS'))) {
              if (!cell.s) cell.s = {};
              cell.s.font = { bold: true };
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Gestión Préstamos");

      // Crear hojas adicionales - CORREGIDO con as any
      if (prestamos && prestamos.length > 0) {
        const prestamosData = [
          ["SOLO PRÉSTAMOS", "", "", "", ""],
          ["Fecha", "Cliente", "Monto", "Tasa", "Cuotas", "Estado"],
          ...prestamos.map(p => [
            new Date(p.fecha_inicio).toLocaleDateString('es-AR'),
            (p.cliente as any)?.tipo_cliente === 'EMPRESA' ? (p.cliente as any).empresa : `${(p.cliente as any)?.apellido}, ${(p.cliente as any)?.nombre}`,
            p.monto_total,
            p.tasa_interes,
            p.cantidad_cuotas,
            p.estado
          ])
        ];
        
        const wsPrestamos = XLSX.utils.aoa_to_sheet(prestamosData);
        wsPrestamos['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsPrestamos, "Solo Préstamos");
      }

      if (cuotas && cuotas.length > 0) {
        const cuotasData = [
          ["SOLO CUOTAS", "", "", "", ""],
          ["Fecha Venc.", "Cliente", "N° Cuota", "Monto", "Estado"],
          ...cuotas.map(c => [
            new Date(c.fecha_vencimiento).toLocaleDateString('es-AR'),
            (c.prestamo as any)?.cliente?.tipo_cliente === 'EMPRESA' ? (c.prestamo as any).cliente.empresa : `${(c.prestamo as any)?.cliente?.apellido}, ${(c.prestamo as any)?.cliente?.nombre}`,
            c.numero_cuota,
            c.monto,
            c.estado
          ])
        ];
        
        const wsCuotas = XLSX.utils.aoa_to_sheet(cuotasData);
        wsCuotas['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsCuotas, "Solo Cuotas");
      }

      const nombreArchivo = `Gestion_Prestamos_Detallado_${filtro.fechaInicio}_${filtro.fechaFin}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
      console.log(`✅ Exportado: ${prestamos?.length || 0} préstamos, ${cuotas?.length || 0} cuotas, ${pagos?.length || 0} pagos`);
      
    } catch (error) {
      console.error('Error exportando gestión de préstamos:', error);
      alert('Error al exportar gestión de préstamos');
    } finally {
      setLoading(false);
    }
  };

  // Función para exportar informe de Movimientos de Caja
  const exportarMovimientosCaja = async () => {
    setLoading(true);
    try {
      const { data: movimientos, error } = await supabase
        .from('movimientos_caja')
        .select('fecha_movimiento, tipo, concepto, monto, created_at')
        .gte('fecha_movimiento', filtro.fechaInicio)
        .lte('fecha_movimiento', filtro.fechaFin + ' 23:59:59')
        .order('fecha_movimiento', { ascending: false })
        .eq('eliminado', false);

      if (error) throw error;

      const totales = movimientos?.reduce((acc, mov) => {
        if (mov.tipo === 'INGRESO') {
          acc.ingresos += Number(mov.monto);
        } else {
          acc.egresos += Number(mov.monto);
        }
        return acc;
      }, { ingresos: 0, egresos: 0 }) || { ingresos: 0, egresos: 0 };

      const datosBase = [
        ["MOVIMIENTOS DE CAJA - GP CAPITAL", "", "", "", ""],
        [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", "", ""],
        ["", "", "", "", ""],
        ["RESUMEN", "", "", "", ""],
        ["Concepto", "Monto", "", "", ""],
        ["Ingresos de Caja", totales.ingresos, "", "", ""],
        ["Egresos de Caja", totales.egresos, "", "", ""],
        ["Saldo Neto Caja", totales.ingresos - totales.egresos, "", "", ""],
        ["", "", "", "", ""],
        ["DETALLE DE MOVIMIENTOS", "", "", "", ""],
        ["Fecha", "Tipo", "Concepto", "Monto", "Fecha Registro"]
      ];

      const detallesMovimientos = movimientos?.map(mov => [
        new Date(mov.fecha_movimiento).toLocaleDateString('es-AR'),
        mov.tipo,
        mov.concepto || 'Sin concepto',
        mov.monto,
        new Date(mov.created_at).toLocaleDateString('es-AR')
      ]) || [];

      const estadisticas = [
        ["", "", "", "", ""],
        ["ESTADÍSTICAS", "", "", "", ""],
        ["Total de Movimientos", movimientos?.length || 0, "", "", ""],
        ["Movimientos de Ingreso", movimientos?.filter(m => m.tipo === 'INGRESO').length || 0, "", "", ""],
        ["Movimientos de Egreso", movimientos?.filter(m => m.tipo === 'EGRESO').length || 0, "", "", ""],
        ["Promedio Ingresos", totales.ingresos > 0 ? (totales.ingresos / (movimientos?.filter(m => m.tipo === 'INGRESO').length || 1)).toFixed(2) : 0, "", "", ""],
        ["Promedio Egresos", totales.egresos > 0 ? (totales.egresos / (movimientos?.filter(m => m.tipo === 'EGRESO').length || 1)).toFixed(2) : 0, "", "", ""]
      ];

      const datosCompletos = [
        ...datosBase,
        ...detallesMovimientos,
        ...estadisticas
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(datosCompletos);
      
      ws['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 40 }, { wch: 15 }, { wch: 15 }
      ];

      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({c: C, r: R});
            if (!ws[cell_address]) continue;
            
            const cell = ws[cell_address];
            if (typeof cell.v === 'string' && 
                (cell.v.includes('CAPITAL') || cell.v.includes('RESUMEN') || 
                 cell.v.includes('DETALLE') || cell.v.includes('ESTADÍSTICAS'))) {
              if (!cell.s) cell.s = {};
              cell.s.font = { bold: true };
            }
            
            if (typeof cell.v === 'number' && cell.v > 100) {
              if (!cell.s) cell.s = {};
              cell.s.numFmt = '#,##0.00';
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Movimientos Caja");

      if (movimientos && movimientos.length > 0) {
        const ingresos = movimientos.filter(m => m.tipo === 'INGRESO');
        if (ingresos.length > 0) {
          const ingresosData = [
            ["SOLO INGRESOS DE CAJA", "", "", ""],
            ["Fecha", "Concepto", "Monto", "Fecha Registro"],
            ...ingresos.map(ing => [
              new Date(ing.fecha_movimiento).toLocaleDateString('es-AR'),
              ing.concepto,
              ing.monto,
              new Date(ing.created_at).toLocaleDateString('es-AR')
            ])
          ];
          
          const wsIngresos = XLSX.utils.aoa_to_sheet(ingresosData);
          wsIngresos['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
          XLSX.utils.book_append_sheet(wb, wsIngresos, "Solo Ingresos");
        }

        const egresos = movimientos.filter(m => m.tipo === 'EGRESO');
        if (egresos.length > 0) {
          const egresosData = [
            ["SOLO EGRESOS DE CAJA", "", "", ""],
            ["Fecha", "Concepto", "Monto", "Fecha Registro"],
            ...egresos.map(egr => [
              new Date(egr.fecha_movimiento).toLocaleDateString('es-AR'),
              egr.concepto,
              egr.monto,
              new Date(egr.created_at).toLocaleDateString('es-AR')
            ])
          ];
          
          const wsEgresos = XLSX.utils.aoa_to_sheet(egresosData);
          wsEgresos['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
          XLSX.utils.book_append_sheet(wb, wsEgresos, "Solo Egresos");
        }
      }

      const nombreArchivo = `Movimientos_Caja_Detallado_${filtro.fechaInicio}_${filtro.fechaFin}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
      console.log(`✅ Exportado: ${movimientos?.length || 0} movimientos de caja`);
      
    } catch (error) {
      console.error('Error exportando movimientos de caja:', error);
      alert('Error al exportar movimientos de caja');
    } finally {
      setLoading(false);
    }
  };

  // Función para exportar informe DETALLADO de Movimientos Bancarios
  const exportarMovimientosBanco = async () => {
    setLoading(true);
    try {
      const { data: movimientosBanco, error } = await supabase
        .from('movimientos_banco')
        .select('fecha_movimiento, tipo, concepto, monto, numero_operacion, detalle_gastos, created_at')
        .gte('fecha_movimiento', filtro.fechaInicio)
        .lte('fecha_movimiento', filtro.fechaFin + ' 23:59:59')
        .order('fecha_movimiento', { ascending: false })
        .eq('eliminado', false);

      if (error) throw error;

      const totales = movimientosBanco?.reduce((acc, mov) => {
        switch (mov.tipo) {
          case 'INGRESO':
            acc.ingresos += Number(mov.monto);
            break;
          case 'EGRESO':
            acc.egresos += Number(mov.monto);
            break;
          case 'GASTO_BANCARIO':
            acc.gastos += Number(mov.monto);
            break;
        }
        return acc;
      }, { ingresos: 0, egresos: 0, gastos: 0 }) || { ingresos: 0, egresos: 0, gastos: 0 };

      const datosBase = [
        ["MOVIMIENTOS BANCARIOS - GP CAPITAL", "", "", "", "", ""],
        [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", "", "", ""],
        ["", "", "", "", "", ""],
        ["RESUMEN", "", "", "", "", ""],
        ["Concepto", "Monto", "", "", "", ""],
        ["Ingresos Bancarios", totales.ingresos, "", "", "", ""],
        ["Egresos Bancarios", totales.egresos, "", "", "", ""],
        ["Gastos Bancarios", totales.gastos, "", "", "", ""],
        ["Saldo Neto Banco", totales.ingresos - totales.egresos - totales.gastos, "", "", "", ""],
        ["", "", "", "", "", ""],
        ["DETALLE DE MOVIMIENTOS", "", "", "", "", ""],
        ["Fecha", "Tipo", "Concepto", "Monto", "N° Operación", "Detalle Gastos"]
      ];

      const detallesMovimientos = movimientosBanco?.map(mov => [
        new Date(mov.fecha_movimiento).toLocaleDateString('es-AR'),
        mov.tipo === 'GASTO_BANCARIO' ? 'GASTO BANCARIO' : mov.tipo,
        mov.concepto || 'Sin concepto',
        mov.monto,
        mov.numero_operacion || '-',
        mov.detalle_gastos || '-'
      ]) || [];

      const estadisticas = [
        ["", "", "", "", "", ""],
        ["ESTADÍSTICAS", "", "", "", "", ""],
        ["Total de Movimientos", movimientosBanco?.length || 0, "", "", "", ""],
        ["Ingresos Bancarios", movimientosBanco?.filter(m => m.tipo === 'INGRESO').length || 0, "", "", "", ""],
        ["Egresos Bancarios", movimientosBanco?.filter(m => m.tipo === 'EGRESO').length || 0, "", "", "", ""],
        ["Gastos Bancarios", movimientosBanco?.filter(m => m.tipo === 'GASTO_BANCARIO').length || 0, "", "", "", ""],
        ["Promedio Ingresos", totales.ingresos > 0 ? (totales.ingresos / (movimientosBanco?.filter(m => m.tipo === 'INGRESO').length || 1)).toFixed(2) : 0, "", "", "", ""]
      ];

      const datosCompletos = [
        ...datosBase,
        ...detallesMovimientos,
        ...estadisticas
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(datosCompletos);
      ws['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 30 }
      ];

      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({c: C, r: R});
            if (!ws[cell_address]) continue;
            
            const cell = ws[cell_address];
            if (typeof cell.v === 'string' && 
                (cell.v.includes('CAPITAL') || cell.v.includes('RESUMEN') || 
                 cell.v.includes('DETALLE') || cell.v.includes('ESTADÍSTICAS'))) {
              if (!cell.s) cell.s = {};
              cell.s.font = { bold: true };
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Movimientos Banco");

      ['INGRESO', 'EGRESO', 'GASTO_BANCARIO'].forEach(tipo => {
        const movimientosTipo = movimientosBanco?.filter(m => m.tipo === tipo);
        if (movimientosTipo && movimientosTipo.length > 0) {
          const tipoData = [
            [`${tipo} BANCARIO`, "", "", "", ""],
            ["Fecha", "Concepto", "Monto", "N° Operación", "Detalle"],
            ...movimientosTipo.map(mov => [
              new Date(mov.fecha_movimiento).toLocaleDateString('es-AR'),
              mov.concepto,
              mov.monto,
              mov.numero_operacion || '-',
              mov.detalle_gastos || '-'
            ])
          ];
          
          const wsTipo = XLSX.utils.aoa_to_sheet(tipoData);
          wsTipo['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 30 }];
          XLSX.utils.book_append_sheet(wb, wsTipo, tipo === 'GASTO_BANCARIO' ? 'Gastos' : tipo.toLowerCase());
        }
      });

      const nombreArchivo = `Movimientos_Banco_Detallado_${filtro.fechaInicio}_${filtro.fechaFin}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
      console.log(`✅ Exportado: ${movimientosBanco?.length || 0} movimientos bancarios`);
      
    } catch (error) {
      console.error('Error exportando movimientos bancarios:', error);
      alert('Error al exportar movimientos bancarios');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="flex justify-center items-center h-screen">
      <div className="text-xl">Cargando...</div>
    </div>;
  }

  return (
    <div className="min-h-screen ">
      <main className="w-full p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Dashboard GP Capital</h1>
          
          {/* Controles de filtro */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Filtros de Informe</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
                <select 
                  value={filtro.periodo}
                  onChange={(e) => cambiarPeriodo(e.target.value as PeriodoTipo)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="dia">Hoy</option>
                  <option value="semana">Última Semana</option>
                  <option value="mes">Este Mes</option>
                  <option value="trimestre">Este Trimestre</option>
                  <option value="año">Este Año</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  value={filtro.fechaInicio}
                  onChange={(e) => setFiltro({...filtro, fechaInicio: e.target.value, periodo: 'personalizado'})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                <input
                  type="date"
                  value={filtro.fechaFin}
                  onChange={(e) => setFiltro({...filtro, fechaFin: e.target.value, periodo: 'personalizado'})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={generarInforme}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg transition font-medium
                  ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                  text-white shadow-md disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                      ></path>
                    </svg>
                    Generando...
                  </>
                ) : (
                  'Actualizar Informe'
                )}
              </button>
              
              <button
                onClick={exportarInforme}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md transition hover:bg-green-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <Download className="h-5 w-5" />
                <span className="font-medium">Exportar Informe</span>
              </button>
            </div>
          </div>
        </div>


        {/* Tarjetas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-700">Beneficio Neto</h3>
            <p className={`text-2xl font-bold ${informe.beneficioNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${informe.beneficioNeto.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-700">Saldo Caja</h3>
            <p className={`text-2xl font-bold ${informe.saldoCaja >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ${informe.saldoCaja.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-gray-700">Saldo Banco</h3>
            <p className={`text-2xl font-bold ${informe.saldoBanco >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
              ${informe.saldoBanco.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-gray-700">Clientes Nuevos</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {informe.clientesNuevos}
            </p>
          </div>
        </div>

        {/* Secciones detalladas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Movimientos de Caja */}
          <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Movimientos de Caja</h3>
          <button
          onClick={exportarMovimientosCaja}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
  title="Exportar a Excel"
>
  <Download className="h-4 w-4" />
  Exportar
</button>
          </div>
          <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ingresos:</span>
                <span className="font-semibold text-green-600">${informe.ingresosCaja.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Egresos:</span>
                <span className="font-semibold text-red-600">${informe.egresosCaja.toLocaleString()}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between font-bold">
                <span>Saldo:</span>
                <span className={informe.saldoCaja >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${informe.saldoCaja.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Movimientos Bancarios */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Movimientos Bancarios</h3>
            <button
                  onClick={exportarMovimientosBanco}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
              title="Exportar a Excel"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
                </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ingresos:</span>
                <span className="font-semibold text-green-600">${informe.ingresosBanco.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Egresos:</span>
                <span className="font-semibold text-red-600">${informe.egresosBanco.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gastos Bancarios:</span>
                <span className="font-semibold text-orange-600">${informe.gastosBancarios.toLocaleString()}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between font-bold">
                <span>Saldo:</span>
                <span className={informe.saldoBanco >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${informe.saldoBanco.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Facturación y Compras */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
    <h3 className="text-xl font-semibold text-gray-700">Facturación y Compras</h3>
    <button
      onClick={exportarFacturacionCompras}
      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
  title="Exportar a Excel"
>
  <Download className="h-4 w-4" />
  Exportar
</button>
  </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Facturado:</span>
                <span className="font-semibold text-blue-600">${informe.totalFacturado.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Compras:</span>
                <span className="font-semibold text-red-600">${informe.totalCompras.toLocaleString()}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between font-bold">
                <span>Diferencia:</span>
                <span className={(informe.totalFacturado - informe.totalCompras) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${(informe.totalFacturado - informe.totalCompras).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Préstamos */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-700">Gestión de Préstamos</h3>
              <button
                onClick={exportarGestionPrestamos}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
            title="Exportar a Excel"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Préstamos Otorgados:</span>
                <span className="font-semibold text-purple-600">${informe.prestamosOtorgados.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cuotas Cobradas:</span>
                <span className="font-semibold text-green-600">${informe.cuotasCobradas.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cuotas Pendientes:</span>
                <span className="font-semibold text-orange-600">${informe.cuotasPendientes.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}