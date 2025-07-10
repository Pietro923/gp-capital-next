/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRightLeft, Download, Pencil, Trash2, Check, AlertCircle, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/utils/supabase/client';
import * as XLSX from 'xlsx';

// Interfaces
interface MovimientoIntercompany {
  id: string;
  tipo_operacion: 'RECIBIR' | 'ENTREGAR' | 'CANJE';
  empresa_origen: 'GP_CAPITAL' | 'PUEBLE' | 'SEMAGE';
  empresa_destino: 'GP_CAPITAL' | 'PUEBLE' | 'SEMAGE';
  concepto: string;
  tipo_recibe?: 'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA';
  monto_recibe?: number;
  detalle_recibe?: string;
  tipo_entrega?: 'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA';
  monto_entrega?: number;
  detalle_entrega?: string;
  fecha_operacion: string;
  observaciones?: string;
  created_at: string;
}

const Chequera: React.FC = () => {
  const [movimientos, setMovimientos] = useState<MovimientoIntercompany[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoIntercompany | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tipoOperacion: 'RECIBIR' as 'RECIBIR' | 'ENTREGAR' | 'CANJE',
    empresaOrigen: 'GP_CAPITAL' as 'GP_CAPITAL' | 'PUEBLE' | 'SEMAGE',
    empresaDestino: 'PUEBLE' as 'GP_CAPITAL' | 'PUEBLE' | 'SEMAGE',
    concepto: '',
    
    // Lo que se recibe
    tipoRecibe: '' as '' | 'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA',
    montoRecibe: 0,
    detalleRecibe: '',
    
    // Lo que se entrega
    tipoEntrega: '' as '' | 'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA',
    montoEntrega: 0,
    detalleEntrega: '',
    
    fechaOperacion: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  // Cargar movimientos
  useEffect(() => {
    loadMovimientos();
  }, []);

  const loadMovimientos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('movimientos_intercompany')
        .select('*')
        .eq('eliminado', false)
        .order('fecha_operacion', { ascending: false });

      if (error) throw error;
      setMovimientos(data || []);
    } catch (error) {
      console.error('Error loading movimientos:', error);
      setError('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar formulario
  const limpiarFormulario = () => {
    setFormData({
      tipoOperacion: 'RECIBIR',
      empresaOrigen: 'GP_CAPITAL',
      empresaDestino: 'PUEBLE',
      concepto: '',
      tipoRecibe: '',
      montoRecibe: 0,
      detalleRecibe: '',
      tipoEntrega: '',
      montoEntrega: 0,
      detalleEntrega: '',
      fechaOperacion: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validar formulario
  const validarFormulario = () => {
    if (!formData.concepto.trim()) {
      setError('El concepto es obligatorio');
      return false;
    }

    if (formData.tipoOperacion === 'RECIBIR') {
      if (!formData.tipoRecibe || !formData.montoRecibe || formData.montoRecibe <= 0) {
        setError('Debe completar los datos de lo que recibe');
        return false;
      }
    } else if (formData.tipoOperacion === 'ENTREGAR') {
      if (!formData.tipoEntrega || !formData.montoEntrega || formData.montoEntrega <= 0) {
        setError('Debe completar los datos de lo que entrega');
        return false;
      }
    } else if (formData.tipoOperacion === 'CANJE') {
      if (!formData.tipoRecibe || !formData.montoRecibe || formData.montoRecibe <= 0 ||
          !formData.tipoEntrega || !formData.montoEntrega || formData.montoEntrega <= 0) {
        setError('Para un canje debe completar tanto lo que recibe como lo que entrega');
        return false;
      }
    }

    return true;
  };

  // Registrar movimiento en caja/banco
  const registrarMovimientosContables = async (movimiento: any) => {
    try {
      // Si recibe algo, es un ingreso
      if (movimiento.tipo_recibe && movimiento.monto_recibe) {
        if (movimiento.tipo_recibe === 'EFECTIVO') {
          await supabase
            .from('movimientos_caja')
            .insert({
              tipo: 'INGRESO',
              concepto: `Intercompany - ${movimiento.concepto} - Recibe ${movimiento.tipo_recibe} de ${movimiento.empresa_origen}`,
              monto: movimiento.monto_recibe,
              fecha_movimiento: movimiento.fecha_operacion
            });
        } else {
          await supabase
            .from('movimientos_banco')
            .insert({
              tipo: 'INGRESO',
              concepto: `Intercompany - ${movimiento.concepto} - Recibe ${movimiento.tipo_recibe} de ${movimiento.empresa_origen}`,
              monto: movimiento.monto_recibe,
              numero_operacion: movimiento.detalle_recibe,
              fecha_movimiento: movimiento.fecha_operacion
            });
        }
      }

      // Si entrega algo, es un egreso
      if (movimiento.tipo_entrega && movimiento.monto_entrega) {
        if (movimiento.tipo_entrega === 'EFECTIVO') {
          await supabase
            .from('movimientos_caja')
            .insert({
              tipo: 'EGRESO',
              concepto: `Intercompany - ${movimiento.concepto} - Entrega ${movimiento.tipo_entrega} a ${movimiento.empresa_destino}`,
              monto: movimiento.monto_entrega,
              fecha_movimiento: movimiento.fecha_operacion
            });
        } else {
          await supabase
            .from('movimientos_banco')
            .insert({
              tipo: 'EGRESO',
              concepto: `Intercompany - ${movimiento.concepto} - Entrega ${movimiento.tipo_entrega} a ${movimiento.empresa_destino}`,
              monto: movimiento.monto_entrega,
              numero_operacion: movimiento.detalle_entrega,
              fecha_movimiento: movimiento.fecha_operacion
            });
        }
      }
    } catch (error) {
      console.error('Error registrando movimientos contables:', error);
      // No fallar la operación principal, solo log del error
    }
  };

  // Crear nuevo movimiento
  const handleCrearMovimiento = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    setError(null);

    try {
      const nuevoMovimiento = {
        tipo_operacion: formData.tipoOperacion,
        empresa_origen: formData.empresaOrigen,
        empresa_destino: formData.empresaDestino,
        concepto: formData.concepto,
        tipo_recibe: formData.tipoRecibe || null,
        monto_recibe: formData.montoRecibe || null,
        detalle_recibe: formData.detalleRecibe || null,
        tipo_entrega: formData.tipoEntrega || null,
        monto_entrega: formData.montoEntrega || null,
        detalle_entrega: formData.detalleEntrega || null,
        fecha_operacion: formData.fechaOperacion,
        observaciones: formData.observaciones || null
      };

      const { data, error } = await supabase
        .from('movimientos_intercompany')
        .insert([nuevoMovimiento])
        .select()
        .single();

      if (error) throw error;

      // Registrar movimientos contables automáticamente
      await registrarMovimientosContables(data);

      setSuccess('Movimiento creado exitosamente');
      setIsDialogOpen(false);
      limpiarFormulario();
      loadMovimientos();
    } catch (error) {
      console.error('Error creating movimiento:', error);
      setError('Error al crear el movimiento');
    } finally {
      setLoading(false);
    }
  };

  // Editar movimiento
  const handleEditarMovimiento = async () => {
    if (!selectedMovimiento || !validarFormulario()) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('movimientos_intercompany')
        .update({
          concepto: formData.concepto,
          tipo_recibe: formData.tipoRecibe || null,
          monto_recibe: formData.montoRecibe || null,
          detalle_recibe: formData.detalleRecibe || null,
          tipo_entrega: formData.tipoEntrega || null,
          monto_entrega: formData.montoEntrega || null,
          detalle_entrega: formData.detalleEntrega || null,
          fecha_operacion: formData.fechaOperacion,
          observaciones: formData.observaciones || null
        })
        .eq('id', selectedMovimiento.id);

      if (error) throw error;

      setSuccess('Movimiento actualizado exitosamente');
      setIsEditDialogOpen(false);
      setSelectedMovimiento(null);
      limpiarFormulario();
      loadMovimientos();
    } catch (error) {
      console.error('Error updating movimiento:', error);
      setError('Error al actualizar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar movimiento
  const handleEliminarMovimiento = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este movimiento?')) return;

    try {
      const { error } = await supabase
        .from('movimientos_intercompany')
        .update({ 
          eliminado: true, 
          fecha_eliminacion: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

      setSuccess('Movimiento eliminado exitosamente');
      loadMovimientos();
    } catch (error) {
      console.error('Error deleting movimiento:', error);
      setError('Error al eliminar el movimiento');
    }
  };

  // Abrir dialog de edición
  const abrirEdicion = (movimiento: MovimientoIntercompany) => {
    setSelectedMovimiento(movimiento);
    setFormData({
      tipoOperacion: movimiento.tipo_operacion,
      empresaOrigen: movimiento.empresa_origen,
      empresaDestino: movimiento.empresa_destino,
      concepto: movimiento.concepto,
      tipoRecibe: movimiento.tipo_recibe || '',
      montoRecibe: movimiento.monto_recibe || 0,
      detalleRecibe: movimiento.detalle_recibe || '',
      tipoEntrega: movimiento.tipo_entrega || '',
      montoEntrega: movimiento.monto_entrega || 0,
      detalleEntrega: movimiento.detalle_entrega || '',
      fechaOperacion: movimiento.fecha_operacion,
      observaciones: movimiento.observaciones || ''
    });
    setIsEditDialogOpen(true);
  };

  // Exportar reporte
  const exportarReporte = () => {
  try {
    // Preparar datos para Excel
    const excelData = movimientos.map(mov => ({
      'Fecha': formatDate(mov.fecha_operacion),
      'Tipo Operación': mov.tipo_operacion,
      'Empresa Origen': mov.empresa_origen.replace('_', ' '),
      'Empresa Destino': mov.empresa_destino.replace('_', ' '),
      'Concepto': mov.concepto,
      'Tipo Recibe': mov.tipo_recibe || '',
      'Monto Recibe': mov.monto_recibe || 0,
      'Detalle Recibe': mov.detalle_recibe || '',
      'Tipo Entrega': mov.tipo_entrega || '',
      'Monto Entrega': mov.monto_entrega || 0,
      'Detalle Entrega': mov.detalle_entrega || '',
      'Observaciones': mov.observaciones || '',
      'Fecha Creación': formatDate(mov.created_at)
    }));

    // Crear hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Ajustar ancho de columnas
    const wscols = [
      { wch: 12 }, // Fecha
      { wch: 15 }, // Tipo Operación
      { wch: 15 }, // Empresa Origen
      { wch: 15 }, // Empresa Destino
      { wch: 30 }, // Concepto
      { wch: 15 }, // Tipo Recibe
      { wch: 15 }, // Monto Recibe
      { wch: 20 }, // Detalle Recibe
      { wch: 15 }, // Tipo Entrega
      { wch: 15 }, // Monto Entrega
      { wch: 20 }, // Detalle Entrega
      { wch: 25 }, // Observaciones
      { wch: 15 }  // Fecha Creación
    ];
    worksheet['!cols'] = wscols;

    // Crear libro y agregar hoja
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos Intercompany');

    // Descargar archivo
    const fechaActual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Reporte_Intercompany_${fechaActual}.xlsx`);

  } catch (error) {
    console.error('Error exportando reporte:', error);
    setError('Error al exportar el reporte');
  }
};

  // Funciones de formato
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  // Agregar esta función al componente Chequera
const formatearFecha = (fechaString: string) => {
  const fechaSolo = fechaString.split('T')[0];
  const [año, mes, dia] = fechaSolo.split('-');
  return `${dia}/${mes}/${año}`;
}

  const getTipoOperacionColor = (tipo: string) => {
    switch (tipo) {
      case 'RECIBIR':
        return 'bg-green-100 text-green-800';
      case 'ENTREGAR':
        return 'bg-red-100 text-red-800';
      case 'CANJE':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 h-auto p-0" 
              onClick={clearMessages}
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 h-auto p-0" 
              onClick={clearMessages}
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Chequera - Movimientos Intercompany
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="movimientos" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
              <TabsTrigger value="reportes">Reportes</TabsTrigger>
            </TabsList>

            <TabsContent value="movimientos">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Historial de Movimientos</h3>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Movimiento
                  </Button>
                </div>

                {movimientos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay movimientos intercompany registrados</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Empresas</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Recibe</TableHead>
                          <TableHead>Entrega</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientos.map((movimiento) => (
                          <TableRow key={movimiento.id}>

                            <TableCell>
                               {formatearFecha(movimiento.fecha_operacion)}
                            </TableCell>
                            
                            <TableCell>
                              <Badge className={getTipoOperacionColor(movimiento.tipo_operacion)}>
                                {movimiento.tipo_operacion}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{movimiento.empresa_origen} →</div>
                                <div>{movimiento.empresa_destino}</div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={movimiento.concepto}>
                              {movimiento.concepto}
                            </TableCell>
                            <TableCell>
                              {movimiento.tipo_recibe && movimiento.monto_recibe ? (
                                <div className="text-sm">
                                  <div className="font-medium text-green-600">
                                    {formatCurrency(movimiento.monto_recibe)}
                                  </div>
                                  <div className="text-gray-500">{movimiento.tipo_recibe}</div>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {movimiento.tipo_entrega && movimiento.monto_entrega ? (
                                <div className="text-sm">
                                  <div className="font-medium text-red-600">
                                    {formatCurrency(movimiento.monto_entrega)}
                                  </div>
                                  <div className="text-gray-500">{movimiento.tipo_entrega}</div>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => abrirEdicion(movimiento)}
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600"
                                  onClick={() => handleEliminarMovimiento(movimiento.id)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reportes">
              <Card>
                <CardHeader>
                  <CardTitle>Reportes de Movimientos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Genere reportes detallados de todos los movimientos intercompany.
                    </p>
                    <Button onClick={exportarReporte}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Reporte Completo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog para Nuevo Movimiento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento Intercompany</DialogTitle>
            <DialogDescription>
              Registre intercambios de cheques, efectivo y transferencias entre empresas
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Información General */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-semibold">Información General</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Operación</Label>
                  <Select value={formData.tipoOperacion} onValueChange={(value: any) => 
                    handleInputChange('tipoOperacion', value)
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECIBIR">Solo Recibir</SelectItem>
                      <SelectItem value="ENTREGAR">Solo Entregar</SelectItem>
                      <SelectItem value="CANJE">Canje (Recibir y Entregar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Empresa Origen</Label>
                  <Select value={formData.empresaOrigen} onValueChange={(value: any) => 
                    handleInputChange('empresaOrigen', value)
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GP_CAPITAL">GP Capital</SelectItem>
                      <SelectItem value="PUEBLE">PUEBLE</SelectItem>
                      <SelectItem value="SEMAGE">SEMAGE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Empresa Destino</Label>
                  <Select value={formData.empresaDestino} onValueChange={(value: any) => 
                    handleInputChange('empresaDestino', value)
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GP_CAPITAL">GP Capital</SelectItem>
                      <SelectItem value="PUEBLE">PUEBLE</SelectItem>
                      <SelectItem value="SEMAGE">SEMAGE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Concepto</Label>
                  <Input
                    placeholder="Descripción del movimiento"
                    value={formData.concepto}
                    onChange={(e) => handleInputChange('concepto', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formData.fechaOperacion}
                    onChange={(e) => handleInputChange('fechaOperacion', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Lo que se Recibe */}
            {(formData.tipoOperacion === 'RECIBIR' || formData.tipoOperacion === 'CANJE') && (
              <div className="space-y-4">
                <h4 className="font-semibold text-green-600">Lo que Recibe GP Capital</h4>
                
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipoRecibe} onValueChange={(value: any) => 
                    handleInputChange('tipoRecibe', value)
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.montoRecibe || ''}
                    onChange={(e) => handleInputChange('montoRecibe', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detalle</Label>
                  <Input
                    placeholder="Nº de cheque, operación, etc."
                    value={formData.detalleRecibe}
                    onChange={(e) => handleInputChange('detalleRecibe', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Lo que se Entrega */}
            {(formData.tipoOperacion === 'ENTREGAR' || formData.tipoOperacion === 'CANJE') && (
              <div className="space-y-4">
                <h4 className="font-semibold text-red-600">Lo que Entrega GP Capital</h4>
                
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipoEntrega} onValueChange={(value: any) => 
                    handleInputChange('tipoEntrega', value)
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.montoEntrega || ''}
                    onChange={(e) => handleInputChange('montoEntrega', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detalle</Label>
                  <Input
                    placeholder="Nº de cheque, operación, etc."
                    value={formData.detalleEntrega}
                    onChange={(e) => handleInputChange('detalleEntrega', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="space-y-2 md:col-span-2">
              <Label>Observaciones</Label>
              <Input
                placeholder="Observaciones adicionales"
                value={formData.observaciones}
                onChange={(e) => handleInputChange('observaciones', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              limpiarFormulario();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCrearMovimiento} disabled={loading}>
              {loading ? "Creando..." : "Crear Movimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Movimiento */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Movimiento Intercompany</DialogTitle>
            <DialogDescription>
              Modifique los detalles del movimiento seleccionado
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Información General */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-semibold">Información General</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Concepto</Label>
                  <Input
                    placeholder="Descripción del movimiento"
                    value={formData.concepto}
                    onChange={(e) => handleInputChange('concepto', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formData.fechaOperacion}
                    onChange={(e) => handleInputChange('fechaOperacion', e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  <strong>Tipo:</strong> {formData.tipoOperacion} | 
                  <strong> Empresas:</strong> {formData.empresaOrigen} → {formData.empresaDestino}
                </p>
              </div>
            </div>

            {/* Lo que se Recibe */}
            {(formData.tipoOperacion === 'RECIBIR' || formData.tipoOperacion === 'CANJE') && (
              <div className="space-y-4">
                <h4 className="font-semibold text-green-600">Lo que Recibe GP Capital</h4>
                
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipoRecibe} onValueChange={(value: any) => 
                    handleInputChange('tipoRecibe', value)
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.montoRecibe || ''}
                    onChange={(e) => handleInputChange('montoRecibe', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detalle</Label>
                  <Input
                    placeholder="Nº de cheque, operación, etc."
                    value={formData.detalleRecibe}
                    onChange={(e) => handleInputChange('detalleRecibe', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Lo que se Entrega */}
            {(formData.tipoOperacion === 'ENTREGAR' || formData.tipoOperacion === 'CANJE') && (
              <div className="space-y-4">
                <h4 className="font-semibold text-red-600">Lo que Entrega GP Capital</h4>
                
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipoEntrega} onValueChange={(value: any) => 
                    handleInputChange('tipoEntrega', value)
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.montoEntrega || ''}
                    onChange={(e) => handleInputChange('montoEntrega', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detalle</Label>
                  <Input
                    placeholder="Nº de cheque, operación, etc."
                    value={formData.detalleEntrega}
                    onChange={(e) => handleInputChange('detalleEntrega', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="space-y-2 md:col-span-2">
              <Label>Observaciones</Label>
              <Input
                placeholder="Observaciones adicionales"
                value={formData.observaciones}
                onChange={(e) => handleInputChange('observaciones', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedMovimiento(null);
              limpiarFormulario();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleEditarMovimiento} disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chequera;