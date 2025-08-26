/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, AlertCircle, ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/utils/supabase/client';
import { PagarDialog } from "@/components/PagarDialog";
import { EditarPrestamoDialog } from "@/components/EditarPrestamoDialog";
import * as XLSX from 'xlsx';

// Interfaces actualizadas
interface Cliente {
  id: string;
  tipo_cliente: "PERSONA_FISICA" | "EMPRESA";
  nombre: string;
  apellido?: string;
  empresa?: string;
  dni?: string;
  cuit?: string;
  eliminado: boolean;
}

interface Cuota {
  id: string;
  prestamo_id: string;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
}

interface Prestamo {
  id: string;
  cliente_id: string;
  monto_total: number;
  tasa_interes: number;
  cantidad_cuotas: number;
  estado: 'ACTIVO' | 'CANCELADO' | 'COMPLETADO';
  fecha_inicio: string;
  moneda: string;
}

interface GastoPrestamo {
  id: string;
  prestamo_id: string;
  tipo_gasto: 'OTORGAMIENTO' | 'TRANSFERENCIA_PRENDA';
  monto: number;
  moneda: string;
  estado: 'PENDIENTE' | 'FACTURADO' | 'COBRADO';
  descripcion: string;
  fecha_creacion: string;
}

interface PrestamoConCuotas extends Prestamo {
  cliente: Cliente;
  cuotas: Cuota[];
  gastos: GastoPrestamo[];
  cuotas_pagadas: number;
}

interface ExcelRow {
  Cliente: string;
  Documento: string;
  Moneda: string;
  Tipo: string;
  'Número de Cuota': number | string;
  'Fecha Vencimiento': string;
  'Monto': number;
  'Estado': string;
  'Fecha Pago': string;
  'Tasa Interés': number;
}

// Función para obtener el color del estado de gasto
const getColorEstadoGasto = (estado: string) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
    case 'FACTURADO': return 'bg-blue-100 text-blue-800';
    case 'COBRADO': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Función para obtener descripción corta del gasto
const getDescripcionCorta = (tipo_gasto: string) => {
  switch (tipo_gasto) {
    case 'OTORGAMIENTO': return 'Gastos Otorgamiento';
    case 'TRANSFERENCIA_PRENDA': return 'Gastos Transf. y Prenda';
    default: return 'Gasto';
  }
};

const LoanDetails = () => {
  const [prestamos, setPrestamos] = useState<PrestamoConCuotas[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPrestamos, setExpandedPrestamos] = useState<string[]>([]);
  
  const [pagarDialog, setPagarDialog] = useState({
    open: false,
    cuotaId: '',
    prestamoId: '',
    numeroCuota: 0,
    montoCuota: 0
  });

  const [editarDialog, setEditarDialog] = useState({
    open: false,
    prestamo: null as PrestamoConCuotas | null
  });

  // Función para obtener el nombre correcto del cliente
  const getNombreCliente = (cliente: Cliente) => {
    return cliente.tipo_cliente === "EMPRESA" 
      ? (cliente.empresa || cliente.nombre)
      : `${cliente.apellido || ''}, ${cliente.nombre || ''}`.trim();
  };

  // Función para formatear fechas correctamente
  const formatearFecha = (fechaString: string) => {
    const fechaSolo = fechaString.split('T')[0];
    const [año, mes, dia] = fechaSolo.split('-');
    return `${dia}/${mes}/${año}`;
  };

  // Función para obtener el símbolo de moneda correcto
  const getSimboloMoneda = (moneda: string) => {
    return (moneda === 'Dolar' || moneda === 'USD') ? 'US$' : '$';
  };

  // Función para obtener el código de moneda
  const getCodigoMoneda = (moneda: string) => {
    return (moneda === 'Dolar' || moneda === 'USD') ? 'USD' : 'ARS';
  };

  // Función para obtener el color del badge de moneda
  const getColorMoneda = (moneda: string) => {
    return (moneda === 'Dolar' || moneda === 'USD') 
      ? 'bg-green-100 text-green-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Obtener préstamos con información de clientes
      const { data: prestamosData, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          cliente:cliente_id(
            id,
            tipo_cliente,
            nombre,
            apellido,
            empresa,
            dni,
            cuit,
            eliminado
          )
        `)
        .eq('eliminado', false)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      // Obtener cuotas y gastos para cada préstamo
      const prestamosConCuotas: PrestamoConCuotas[] = await Promise.all(
        (prestamosData || []).map(async (prestamo) => {
          // Obtener cuotas
          const { data: cuotasData } = await supabase
            .from('cuotas')
            .select('*')
            .eq('prestamo_id', prestamo.id)
            .eq('eliminado', false)
            .order('numero_cuota');

          // Obtener gastos
          const { data: gastosData } = await supabase
            .from('gastos_prestamo')
            .select('*')
            .eq('prestamo_id', prestamo.id)
            .eq('eliminado', false)
            .order('fecha_creacion');

          const cuotasPagadas = cuotasData?.filter(c => c.estado === 'PAGADO').length || 0;

          return {
            ...prestamo,
            moneda: prestamo.moneda || 'Pesos',
            cuotas: cuotasData || [],
            gastos: gastosData || [],
            cuotas_pagadas: cuotasPagadas,
          };
        })
      );

      setPrestamos(prestamosConCuotas);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getEstadoColor = (estado: Cuota['estado']) => {
    switch (estado) {
      case 'PAGADO':
        return 'text-green-600 bg-green-100';
      case 'VENCIDO':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getEstadoPrestamoColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVO': return 'bg-green-100 text-green-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      case 'COMPLETADO': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePagarClick = (cuota: Cuota, prestamoId: string) => {
    setPagarDialog({
      open: true,
      cuotaId: cuota.id,
      prestamoId: prestamoId,
      numeroCuota: cuota.numero_cuota,
      montoCuota: cuota.monto
    });
  };

  const handleEditarClick = (prestamo: PrestamoConCuotas) => {
    setEditarDialog({
      open: true,
      prestamo: prestamo
    });
  };

  const cerrarPagarDialog = () => {
    setPagarDialog({
      open: false,
      cuotaId: '',
      prestamoId: '',
      numeroCuota: 0,
      montoCuota: 0
    });
  };

  const cerrarEditarDialog = () => {
    setEditarDialog({
      open: false,
      prestamo: null
    });
  };

  const confirmarPago = () => {
    fetchData();
    cerrarPagarDialog();
  };

  const confirmarEdicion = () => {
    fetchData();
    cerrarEditarDialog();
  };

  const handleEliminarClick = async (prestamo: PrestamoConCuotas) => {
    const cuotasPagadas = prestamo.cuotas.filter(c => c.estado === 'PAGADO').length;
    
    let confirmar1: boolean;
    if (cuotasPagadas > 0) {
      confirmar1 = confirm(
        `⚠️ ATENCIÓN: Este préstamo tiene ${cuotasPagadas} cuotas pagadas.\n\n` +
        `¿Está seguro de eliminarlo?\n\n` +
        `Cliente: ${getNombreCliente(prestamo.cliente)}\n` +
        `Monto: $${prestamo.monto_total.toLocaleString('es-AR')}`
      );
    } else {
      confirmar1 = confirm(
        `¿Está seguro de eliminar este préstamo?\n\n` +
        `Cliente: ${getNombreCliente(prestamo.cliente)}\n` +
        `Monto: $${prestamo.monto_total.toLocaleString('es-AR')}`
      );
    }
    
    if (!confirmar1) return;

    const confirmar2 = confirm(
      `⚠️ ÚLTIMA CONFIRMACIÓN\n\n` +
      `El préstamo será marcado como eliminado.\n` +
      `Los datos se conservarán para auditoría.\n\n` +
      `¿Continuar con la eliminación?`
    );
    
    if (!confirmar2) return;

    try {
      setLoading(true);
      
      const fechaEliminacion = new Date().toISOString();

      const { error: pagosError } = await supabase
        .from('pagos')
        .update({ 
          eliminado: true, 
          fecha_eliminacion: fechaEliminacion 
        })
        .eq('prestamo_id', prestamo.id)
        .eq('eliminado', false);

      if (pagosError) throw pagosError;

      const { error: cuotasError } = await supabase
        .from('cuotas')
        .update({ 
          eliminado: true, 
          fecha_eliminacion: fechaEliminacion 
        })
        .eq('prestamo_id', prestamo.id)
        .eq('eliminado', false);

      if (cuotasError) throw cuotasError;

      const { error: prestamoError } = await supabase
        .from('prestamos')
        .update({ 
          eliminado: true, 
          fecha_eliminacion: fechaEliminacion 
        })
        .eq('id', prestamo.id);

      if (prestamoError) throw prestamoError;

      if (cuotasPagadas > 0) {
        const totalPagado = prestamo.cuotas
          .filter(c => c.estado === 'PAGADO')
          .reduce((sum, c) => sum + c.monto, 0);
        
        await supabase
          .from('movimientos_caja')
          .insert([{
            tipo: 'EGRESO',
            concepto: `Reversión por eliminación de préstamo (SOFT DELETE) - ${getNombreCliente(prestamo.cliente)} - $${totalPagado.toLocaleString('es-AR')}`,
            monto: totalPagado
          }]);
      }

      await fetchData();
      
      alert('Préstamo eliminado exitosamente\n\nNota: Los datos se conservan en la base de datos para auditoría.');
      
    } catch (err) {
      console.error('Error eliminando préstamo:', err);
      alert('Error al eliminar el préstamo. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtro mejorado que incluye búsqueda por documento
  const filteredPrestamos = prestamos.filter(prestamo => {
    const nombreCliente = getNombreCliente(prestamo.cliente).toLowerCase();
    const documento = prestamo.cliente.tipo_cliente === "EMPRESA" 
      ? prestamo.cliente.cuit || ''
      : prestamo.cliente.dni || '';
    
    return (
      nombreCliente.includes(searchTerm.toLowerCase()) ||
      documento.includes(searchTerm.toLowerCase())
    );
  });

  const exportToExcel = async () => {
    if (filteredPrestamos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const excelData: ExcelRow[] = [];

      filteredPrestamos.forEach(prestamo => {
        // Primero agregar gastos
        prestamo.gastos.forEach(gasto => {
          excelData.push({
            Cliente: getNombreCliente(prestamo.cliente),
            Documento: prestamo.cliente.tipo_cliente === "EMPRESA" 
              ? prestamo.cliente.cuit || 'Sin CUIT'
              : prestamo.cliente.dni || 'Sin DNI',
            Moneda: getCodigoMoneda(gasto.moneda),
            Tipo: 'GASTO',
            'Número de Cuota': getDescripcionCorta(gasto.tipo_gasto),
            'Fecha Vencimiento': 'Inmediato',
            'Monto': gasto.monto,
            'Estado': gasto.estado,
            'Fecha Pago': gasto.estado === 'COBRADO' ? 'Cobrado' : 'Pendiente',
            'Tasa Interés': 0
          });
        });

        // Luego agregar cuotas
        prestamo.cuotas.forEach(cuota => {
          excelData.push({
            Cliente: getNombreCliente(prestamo.cliente),
            Documento: prestamo.cliente.tipo_cliente === "EMPRESA" 
              ? prestamo.cliente.cuit || 'Sin CUIT'
              : prestamo.cliente.dni || 'Sin DNI',
            Moneda: getCodigoMoneda(prestamo.moneda),
            Tipo: 'CUOTA',
            'Número de Cuota': cuota.numero_cuota,
            'Fecha Vencimiento': formatearFecha(cuota.fecha_vencimiento),
            'Monto': cuota.monto,
            'Estado': cuota.estado,
            'Fecha Pago': cuota.fecha_pago ? formatearFecha(cuota.fecha_pago) : 'No pagado',
            'Tasa Interés': prestamo.tasa_interes
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      ws['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, 
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, 
        { wch: 15 }, { wch: 12 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Préstamos y Gastos");
      
      const fechaActual = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `prestamos_cuotas_gastos_${fechaActual}.xlsx`);
      
      console.log('Archivo exportado exitosamente con gastos incluidos');
    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error al exportar los datos');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando préstamos y cuotas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const toggleExpanded = (prestamoId: string) => {
    setExpandedPrestamos(prev => 
      prev.includes(prestamoId) 
        ? prev.filter(id => id !== prestamoId)
        : [...prev, prestamoId]
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
          <CardTitle>Detalle de Préstamos y Cuotas</CardTitle>
          <Button variant="outline" onClick={exportToExcel} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente o documento..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {filteredPrestamos.some(p => p.cuotas.some(c => c.estado === 'VENCIDO')) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Hay cuotas vencidas que requieren atención inmediata.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Tabla para pantallas medianas y grandes */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Moneda</TableHead> 
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="text-right">Cuotas Pagadas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrestamos.map(prestamo => (
                    <React.Fragment key={prestamo.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleExpanded(prestamo.id)}
                      >
                        <TableCell>
                          {expandedPrestamos.includes(prestamo.id) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getNombreCliente(prestamo.cliente)}
                        </TableCell>
                        <TableCell>
                          {prestamo.cliente.tipo_cliente === "EMPRESA" 
                            ? prestamo.cliente.cuit || 'Sin CUIT'
                            : prestamo.cliente.dni || 'Sin DNI'
                          }
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColorMoneda(prestamo.moneda)}`}>
                            {getCodigoMoneda(prestamo.moneda)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {getSimboloMoneda(prestamo.moneda)}{prestamo.monto_total.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {prestamo.cuotas_pagadas}/{prestamo.cantidad_cuotas}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoPrestamoColor(prestamo.estado)}`}>
                            {prestamo.estado}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${(prestamo.cuotas_pagadas / prestamo.cantidad_cuotas) * 100}%` }}
                            ></div>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditarClick(prestamo)}
                              className="h-8 px-3 hover:bg-blue-50"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEliminarClick(prestamo)}
                              className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {expandedPrestamos.includes(prestamo.id) && (
                        <>
                          {/* MOSTRAR GASTOS PRIMERO */}
                          {prestamo.gastos.map((gasto) => (
                            <TableRow key={`gasto-${gasto.id}`} className="bg-orange-50 border-l-4 border-orange-400">
                              <TableCell></TableCell>
                              <TableCell colSpan={3} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                  <div>
                                    <div className="font-medium text-orange-800">
                                      {getDescripcionCorta(gasto.tipo_gasto)}
                                    </div>
                                    <div className="text-xs text-orange-600">
                                      Creado: {new Date(gasto.fecha_creacion).toLocaleDateString('es-AR')}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <div className="font-medium text-orange-700">
                                  {getSimboloMoneda(gasto.moneda)}{gasto.monto.toLocaleString('es-AR')}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <span className="text-orange-500">-</span>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColorEstadoGasto(gasto.estado)}`}>
                                  {gasto.estado}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="w-full bg-orange-200 rounded-full h-2.5">
                                  <div 
                                    className={`h-2.5 rounded-full ${gasto.estado === 'COBRADO' ? 'bg-green-500' : gasto.estado === 'FACTURADO' ? 'bg-blue-500' : 'bg-orange-300'}`}
                                    style={{ width: gasto.estado === 'COBRADO' ? '100%' : gasto.estado === 'FACTURADO' ? '50%' : '10%' }}
                                  ></div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {gasto.estado === 'PENDIENTE' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                                  >
                                    Facturar
                                  </Button>
                                )}
                                {gasto.estado === 'FACTURADO' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                  >
                                    Cobrar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          
                          {/* SEPARADOR VISUAL SI HAY GASTOS */}
                          {prestamo.gastos.length > 0 && (
                            <TableRow className="bg-slate-100">
                              <TableCell colSpan={9} className="text-center text-xs text-slate-500 py-1">
                                ─── Cuotas del Préstamo ───
                              </TableCell>
                            </TableRow>
                          )}
                          
                          {/* MOSTRAR CUOTAS NORMALES */}
                          {prestamo.cuotas.map(cuota => (
                            <TableRow key={cuota.id} className="bg-slate-50">
                              <TableCell></TableCell>
                              <TableCell colSpan={3} className="text-sm">
                                <div>
                                  <div className="font-medium">Cuota {cuota.numero_cuota}</div>
                                  <div className="text-xs text-slate-500">
                                    Vencimiento: {formatearFecha(cuota.fecha_vencimiento)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {getSimboloMoneda(prestamo.moneda)}{cuota.monto.toLocaleString('es-AR')}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {cuota.fecha_pago ? 
                                  formatearFecha(cuota.fecha_pago) : 
                                  '-'}
                              </TableCell>
                              <TableCell colSpan={3}>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(cuota.estado)}`}>
                                    {cuota.estado}
                                  </span>
                                  
                                  {cuota.estado !== 'PAGADO' && (
                                    <Button 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePagarClick(cuota, prestamo.id);
                                      }}
                                    >
                                      Pagar
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Vista de tarjetas para móviles */}
            <div className="block md:hidden space-y-4">
              {filteredPrestamos.map(prestamo => (
                <div key={prestamo.id} className="border rounded-lg shadow-sm overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-slate-50"
                    onClick={() => toggleExpanded(prestamo.id)}
                  >
                    <div className="flex items-center space-x-2">
                      {expandedPrestamos.includes(prestamo.id) ? 
                        <ChevronDown className="h-4 w-4 flex-shrink-0" /> : 
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                      <div>
                        <div className="font-medium">{getNombreCliente(prestamo.cliente)}</div>
                        <div className="text-sm text-slate-500">
                          {prestamo.cliente.tipo_cliente === "EMPRESA" 
                            ? `CUIT: ${prestamo.cliente.cuit || 'Sin CUIT'}`
                            : `DNI: ${prestamo.cliente.dni || 'Sin DNI'}`
                          }
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoPrestamoColor(prestamo.estado)}`}>
                            {prestamo.estado}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColorMoneda(prestamo.moneda)}`}>
                            {getCodigoMoneda(prestamo.moneda)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{getSimboloMoneda(prestamo.moneda)}{prestamo.monto_total.toLocaleString('es-AR')}</div>
                      <div className="text-sm text-slate-500">
                        {prestamo.cuotas_pagadas}/{prestamo.cantidad_cuotas} cuotas
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditarClick(prestamo);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminarClick(prestamo);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-4 pb-2">
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${(prestamo.cuotas_pagadas / prestamo.cantidad_cuotas) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {expandedPrestamos.includes(prestamo.id) && (
                    <div className="bg-slate-50 divide-y divide-slate-200">
                      {/* GASTOS PRIMERO EN MÓVIL */}
                      {prestamo.gastos.map((gasto) => (
                        <div key={`gasto-${gasto.id}`} className="p-4 bg-orange-50 border-l-4 border-orange-400">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <div className="font-medium text-orange-800">{getDescripcionCorta(gasto.tipo_gasto)}</div>
                              <div className="text-xs text-orange-600">Creado: {new Date(gasto.fecha_creacion).toLocaleDateString('es-AR')}</div>
                            </div>
                            <div className="font-medium text-orange-700">{getSimboloMoneda(gasto.moneda)}{gasto.monto.toLocaleString('es-AR')}</div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColorEstadoGasto(gasto.estado)}`}>
                              {gasto.estado}
                            </span>
                            {gasto.estado === 'PENDIENTE' && <Button size="sm" variant="outline">Facturar</Button>}
                            {gasto.estado === 'FACTURADO' && <Button size="sm" variant="outline">Cobrar</Button>}
                          </div>
                        </div>
                      ))}
                      
                      {/* SEPARADOR SI HAY GASTOS */}
                      {prestamo.gastos.length > 0 && (
                        <div className="p-2 bg-slate-100 text-center text-xs text-slate-500">
                          ─── Cuotas del Préstamo ───
                        </div>
                      )}
                      
                      {/* CUOTAS NORMALES */}
                      {prestamo.cuotas.map(cuota => (
                        <div key={cuota.id} className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <div className="font-medium">Cuota {cuota.numero_cuota}</div>
                              <div className="text-xs text-slate-500">
                                Vencimiento: {formatearFecha(cuota.fecha_vencimiento)}
                              </div>
                            </div>
                            <div className="font-medium">{getSimboloMoneda(prestamo.moneda)}{cuota.monto.toLocaleString('es-AR')}</div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-slate-500">
                              {cuota.fecha_pago ? 
                                `Pagado: ${formatearFecha(cuota.fecha_pago)}` : 
                                'No pagado'}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(cuota.estado)}`}>
                                {cuota.estado}
                              </span>
                              
                              {cuota.estado !== 'PAGADO' && (
                                <Button 
                                  size="sm"
                                  onClick={() => handlePagarClick(cuota, prestamo.id)}
                                >
                                  Pagar
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Mostrar mensaje si no hay préstamos */}
            {filteredPrestamos.length === 0 && !loading && (
              <div className="text-center py-8 text-slate-500">
                {searchTerm ? 'No se encontraron préstamos que coincidan con la búsqueda' : 'No hay préstamos registrados'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diálogos */}
      <PagarDialog
        open={pagarDialog.open}
        onOpenChange={(open) => !open && cerrarPagarDialog()}
        onConfirm={confirmarPago}
        numeroCuota={pagarDialog.numeroCuota}
        cuotaId={pagarDialog.cuotaId}
        prestamoId={pagarDialog.prestamoId}
        montoCuota={pagarDialog.montoCuota}
      />

      {editarDialog.prestamo && (
        <EditarPrestamoDialog
          open={editarDialog.open}
          onOpenChange={(open) => !open && cerrarEditarDialog()}
          onConfirm={confirmarEdicion}
          prestamo={editarDialog.prestamo}
        />
      )}
    </div>
  );
};

export default LoanDetails;