"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (user) {
      generarInforme();
    }
  }, [user, filtro]);

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

  // Función principal para generar el informe completo
  const generarInforme = async () => {
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
  };

  // Funciones específicas para cada tipo de dato
  const obtenerMovimientosCaja = async () => {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('tipo, monto')
      .gte('fecha_movimiento', filtro.fechaInicio)
      .lte('fecha_movimiento', filtro.fechaFin + ' 23:59:59');

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
      .lte('fecha_movimiento', filtro.fechaFin + ' 23:59:59');

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
      .select('total_factura')
      .gte('fecha_emision', filtro.fechaInicio)
      .lte('fecha_emision', filtro.fechaFin);

    if (error) throw error;

    const total = data.reduce((acc, factura) => acc + Number(factura.total_factura), 0);
    return { total };
  };

  const obtenerCompras = async () => {
    const { data, error } = await supabase
      .from('compras')
      .select('total_factura')
      .gte('fecha_compra', filtro.fechaInicio)
      .lte('fecha_compra', filtro.fechaFin);

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

    {/*
    // Crear análisis de rentabilidad
    const analisisRentabilidad = [
      ["ANÁLISIS DE RENTABILIDAD", "", "", ""],
      ["Concepto", "Monto", "Porcentaje", ""],
      ["Total Ingresos", informe.ingresosCaja + informe.ingresosBanco + informe.totalFacturado, "100%", ""],
      ["Total Egresos", informe.egresosCaja + informe.egresosBanco + informe.gastosBancarios + informe.totalCompras, 
       `${(((informe.egresosCaja + informe.egresosBanco + informe.gastosBancarios + informe.totalCompras) / 
           (informe.ingresosCaja + informe.ingresosBanco + informe.totalFacturado)) * 100).toFixed(2)}%`, ""],
      ["Margen de Beneficio", informe.beneficioNeto, 
       `${((informe.beneficioNeto / (informe.ingresosCaja + informe.ingresosBanco + informe.totalFacturado)) * 100).toFixed(2)}%`, ""],
      ["", "", "", ""]
    ];
    */}

    // Combinar todos los datos
    const datosCompletos = [
      ...resumenEjecutivo,
      ...movimientosCajaData,
      ...movimientosBancoData,
      ...facturacionData,
      ...prestamosData,
      //...analisisRentabilidad
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

  if (!user) {
    return <div className="flex justify-center items-center h-screen">
      <div className="text-xl">Cargando...</div>
    </div>;
  }


  // Función para exportar informe de Movimientos de Caja
const exportarMovimientosCaja = async () => {
  setLoading(true);
  try {
    // Obtener datos detallados
    const { data: movimientos, error } = await supabase
      .from('movimientos_caja')
      .select('fecha_movimiento, tipo, monto')
      .gte('fecha_movimiento', filtro.fechaInicio)
      .lte('fecha_movimiento', filtro.fechaFin + ' 23:59:59')
      .order('fecha_movimiento', { ascending: false });

    if (error) throw error;

    // Crear datos para el Excel
    const datos = [
      ["MOVIMIENTOS DE CAJA - GP CAPITAL", "", "", ""],
      [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", ""],
      ["", "", "", ""],
      ["RESUMEN", "", "", ""],
      ["Concepto", "Monto", "", ""],
      ["Ingresos de Caja", informe.ingresosCaja, "", ""],
      ["Egresos de Caja", informe.egresosCaja, "", ""],
      ["Saldo Neto Caja", informe.saldoCaja, "", ""],
      ["", "", "", ""],
      ["DETALLE DE MOVIMIENTOS", "", "", ""],
      ["Fecha", "Tipo", "Monto"],
      ...movimientos.map(mov => [
        new Date(mov.fecha_movimiento).toLocaleDateString(),
        mov.tipo,
        mov.monto
      ])
    ];

    // Crear el libro de trabajo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datos);
    
    // Configurar el ancho de las columnas
    ws['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 15 }
    ];

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos Caja");

    // Generar el archivo Excel
    //const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Movimientos_Caja_${filtro.fechaInicio}_${filtro.fechaFin}.xlsx`;
    
    XLSX.writeFile(wb, nombreArchivo);
  } catch (error) {
    console.error('Error exportando movimientos de caja:', error);
  } finally {
    setLoading(false);
  }
};

// Función para exportar informe de Movimientos Bancarios
const exportarMovimientosBanco = () => {
  const datos = [
    ["MOVIMIENTOS BANCARIOS - GP CAPITAL", "", "", ""],
    [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", ""],
    ["", "", "", ""],
    ["Concepto", "Monto", "", ""],
    ["Ingresos Bancarios", informe.ingresosBanco, "", ""],
    ["Egresos Bancarios", informe.egresosBanco, "", ""],
    ["Gastos Bancarios", informe.gastosBancarios, "", ""],
    ["Saldo Neto Banco", informe.saldoBanco, "", ""],
    ["", "", "", ""],
    ["Detalle de Movimientos", "", "", ""],
    ["Fecha", "Tipo", "Descripción", "Monto"]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(datos);
  ws['!cols'] = [
    { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Movimientos Banco");
  
  //const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Movimientos_Banco_${filtro.fechaInicio}_${filtro.fechaFin}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
};

// Función para exportar informe de Facturación y Compras
const exportarFacturacionCompras = () => {
  const datos = [
    ["FACTURACIÓN Y COMPRAS - GP CAPITAL", "", "", ""],
    [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", ""],
    ["", "", "", ""],
    ["Concepto", "Monto", "", ""],
    ["Total Facturado", informe.totalFacturado, "", ""],
    ["Total Compras", informe.totalCompras, "", ""],
    ["Diferencia", informe.totalFacturado - informe.totalCompras, "", ""],
    ["", "", "", ""],
    ["Detalle de Facturación", "", "", ""],
    ["Fecha", "N° Factura", "Cliente", "Monto"],
    ["", "", "", ""],
    ["Detalle de Compras", "", "", ""],
    ["Fecha", "N° Factura", "Proveedor", "Monto"]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(datos);
  ws['!cols'] = [
    { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Facturación y Compras");
  
  //const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Facturacion_Compras_${filtro.fechaInicio}_${filtro.fechaFin}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
};

// Función para exportar informe de Gestión de Préstamos
const exportarGestionPrestamos = () => {
  const datos = [
    ["GESTIÓN DE PRÉSTAMOS - GP CAPITAL", "", "", ""],
    [`Período: ${filtro.fechaInicio} al ${filtro.fechaFin}`, "", "", ""],
    ["", "", "", ""],
    ["Concepto", "Monto", "", ""],
    ["Préstamos Otorgados", informe.prestamosOtorgados, "", ""],
    ["Cuotas Cobradas", informe.cuotasCobradas, "", ""],
    ["Cuotas Pendientes", informe.cuotasPendientes, "", ""],
    ["", "", "", ""],
    ["Detalle de Préstamos", "", "", ""],
    ["Fecha", "Cliente", "Monto Total", "Estado"],
    ["", "", "", ""],
    ["Detalle de Cuotas", "", "", ""],
    ["Fecha Vencimiento", "Préstamo", "Cliente", "Monto", "Estado"]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(datos);
  ws['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Gestión Préstamos");
  
  //const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Gestion_Prestamos_${filtro.fechaInicio}_${filtro.fechaFin}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
};

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