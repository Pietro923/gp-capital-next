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

// Interfaces actualizadas según el esquema de Supabase
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
}

interface PrestamoConCuotas extends Prestamo {
  cliente: Cliente;
  cuotas: Cuota[];
  cuotas_pagadas: number;
}

interface ExcelRow {
  Cliente: string;
  Documento: string;
  'Número de Cuota': number;
  'Fecha Vencimiento': string;
  'Monto': number;
  'Estado': string;
  'Fecha Pago': string;
  'Tasa Interés': number;
}

const LoanDetails = () => {
  const [prestamos, setPrestamos] = useState<PrestamoConCuotas[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPrestamos, setExpandedPrestamos] = useState<string[]>([]);
  
  // ✅ SEPARAR LOS ESTADOS DE LOS DIALOGS COMPLETAMENTE
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
      ? cliente.empresa || 'Empresa sin nombre'
      : `${cliente.apellido || ''}, ${cliente.nombre || ''}`.trim().replace(/^,\s*/, '') || 'Sin nombre';
  };

  // Función para formatear fechas correctamente
  const formatearFecha = (fechaString: string) => {
    const fechaSolo = fechaString.split('T')[0];
    const [año, mes, dia] = fechaSolo.split('-');
    return `${dia}/${mes}/${año}`;
  };

 const fetchData = async () => {
  try {
    setLoading(true);
    const { data: prestamosData, error: prestamosError } = await supabase
      .from('prestamos')
      .select(`
        *,
        cliente:clientes!inner(*),
        cuotas(*)
      `)
      .eq('cliente.eliminado', false) // Solo clientes no eliminados
      .eq('eliminado', false) // ✅ NUEVO: Solo préstamos no eliminados
      .order('fecha_inicio', { ascending: false });

    if (prestamosError) throw prestamosError;

    const prestamosProcessed: PrestamoConCuotas[] = prestamosData.map(prestamo => ({
      ...prestamo,
      // ✅ FILTRAR CUOTAS NO ELIMINADAS al contar pagadas
      cuotas: prestamo.cuotas.filter((c: any) => !c.eliminado), // Solo cuotas no eliminadas
      cuotas_pagadas: prestamo.cuotas
        .filter((c: any) => !c.eliminado && c.estado === 'PAGADO').length
    }));

    setPrestamos(prestamosProcessed);
  } catch (err) {
    console.error('Error al cargar datos:', err);
    setError('Error al cargar los datos de préstamos');
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

  // ✅ FUNCIÓN PARA OBTENER COLOR DEL ESTADO DEL PRÉSTAMO
  const getEstadoPrestamoColor = (estado: Prestamo['estado']) => {
    switch (estado) {
      case 'COMPLETADO':
        return 'text-green-600 bg-green-100';
      case 'CANCELADO':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  // ✅ FUNCIONES LIMPIAS PARA MANEJAR DIALOGS
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

  // ✅ FUNCIONES PARA CERRAR DIALOGS
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

  // ✅ FUNCIONES PARA CONFIRMAR ACCIONES
  const confirmarPago = () => {
    fetchData();
    cerrarPagarDialog();
  };

  const confirmarEdicion = () => {
    fetchData();
    cerrarEditarDialog();
  };

  // ✅ NUEVA FUNCIÓN PARA ELIMINAR PRÉSTAMO CON SOFT DELETE Y CONFIRMACIÓN DOBLE
const handleEliminarClick = async (prestamo: PrestamoConCuotas) => {
  // Verificar si tiene cuotas pagadas
  const cuotasPagadas = prestamo.cuotas.filter(c => c.estado === 'PAGADO').length;
  
  // ✅ PRIMERA CONFIRMACIÓN
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

  // ✅ SEGUNDA CONFIRMACIÓN (MÁS SERIA)
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

    // ✅ SOFT DELETE - Solo marcar como eliminado
    
    // 1. Marcar pagos como eliminados
    const { error: pagosError } = await supabase
      .from('pagos')
      .update({ 
        eliminado: true, 
        fecha_eliminacion: fechaEliminacion 
      })
      .eq('prestamo_id', prestamo.id)
      .eq('eliminado', false); // Solo actualizar los no eliminados

    if (pagosError) throw pagosError;

    // 2. Marcar cuotas como eliminadas
    const { error: cuotasError } = await supabase
      .from('cuotas')
      .update({ 
        eliminado: true, 
        fecha_eliminacion: fechaEliminacion 
      })
      .eq('prestamo_id', prestamo.id)
      .eq('eliminado', false); // Solo actualizar las no eliminadas

    if (cuotasError) throw cuotasError;

    // 3. Marcar préstamo como eliminado
    const { error: prestamoError } = await supabase
      .from('prestamos')
      .update({ 
        eliminado: true, 
        fecha_eliminacion: fechaEliminacion 
      })
      .eq('id', prestamo.id);

    if (prestamoError) throw prestamoError;

    // 4. Registrar movimiento de reversión en caja (solo si tenía pagos)
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

    // 5. Refrescar datos
    await fetchData();
    
    alert('✅ Préstamo eliminado exitosamente\n\nNota: Los datos se conservan en la base de datos para auditoría.');
    
  } catch (err) {
    console.error('Error eliminando préstamo:', err);
    alert('❌ Error al eliminar el préstamo. Intente nuevamente.');
  } finally {
    setLoading(false);
  }
};

  // Filtro mejorado que incluye búsqueda por documento
  const filteredPrestamos = prestamos.filter(prestamo => {
    const nombreCliente = getNombreCliente(prestamo.cliente);
    const documento = prestamo.cliente.dni || prestamo.cliente.cuit || '';
    
    return (
      nombreCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      documento.includes(searchTerm)
    );
  });

  const exportToExcel = () => {
    if (filteredPrestamos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const excelData: ExcelRow[] = filteredPrestamos.flatMap(prestamo => 
      prestamo.cuotas.map(cuota => ({
        'Cliente': getNombreCliente(prestamo.cliente),
        'Documento': prestamo.cliente.tipo_cliente === "EMPRESA" 
          ? prestamo.cliente.cuit || '' 
          : prestamo.cliente.dni || '',
        'Número de Cuota': cuota.numero_cuota,
        'Fecha Vencimiento': formatearFecha(cuota.fecha_vencimiento),
        'Monto': cuota.monto,
        'Estado': cuota.estado,
        'Fecha Pago': cuota.fecha_pago ? formatearFecha(cuota.fecha_pago) : '',
        'Tasa Interés': prestamo.tasa_interes
      }))
    );

    let csvContent = '\ufeff';
    const headers = Object.keys(excelData[0]) as (keyof ExcelRow)[];
    csvContent += headers.join(';') + '\n';

    excelData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvContent += values.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `prestamos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center p-4">Cargando...</div>;
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
                        <TableCell className="text-right">
                          ${prestamo.monto_total.toLocaleString('es-AR')}
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
                      {expandedPrestamos.includes(prestamo.id) && prestamo.cuotas.map(cuota => (
                        <TableRow key={cuota.id} className="bg-slate-50">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="text-sm">
                            <div>
                              <div className="font-medium">Cuota {cuota.numero_cuota}</div>
                              <div className="text-xs text-slate-500">
                                Vencimiento: {formatearFecha(cuota.fecha_vencimiento)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            ${cuota.monto.toLocaleString('es-AR')}
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
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Vista de tarjetas para móviles - ACTUALIZADA */}
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
                        <div className="text-xs">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoPrestamoColor(prestamo.estado)}`}>
                            {prestamo.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${prestamo.monto_total.toLocaleString('es-AR')}</div>
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
                      {prestamo.cuotas.map(cuota => (
                        <div key={cuota.id} className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <div className="font-medium">Cuota {cuota.numero_cuota}</div>
                              <div className="text-xs text-slate-500">
                                Vencimiento: {formatearFecha(cuota.fecha_vencimiento)}
                              </div>
                            </div>
                            <div className="font-medium">${cuota.monto.toLocaleString('es-AR')}</div>
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

      {/* ✅ RENDERIZADO LIMPIO DE DIALOGS - SIEMPRE RENDERIZAR, CONTROLAR SOLO CON 'open' */}
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