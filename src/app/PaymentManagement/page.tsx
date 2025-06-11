"use client"
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
import { Plus, DollarSign, FileText, AlertCircle, Download, Check, Clock, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/utils/supabase/client';

// Interfaces
interface Proveedor {
  id: string;
  nombre: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  tipo_iva?: string;
}

interface CompraDetalle {
  id: string;
  numero_factura: string;
  fecha_compra: string;
  total_factura: number;
  monto_pagado: number;
  estado_pago: 'PENDIENTE' | 'PAGADO_PARCIAL' | 'PAGADO_TOTAL';
  saldo_pendiente: number;
  fecha_vencimiento?: string;
  forma_pago?: string;
}

interface FormaPago {
  id: string;
  nombre: string;
}

interface OrdenPago {
  id: string;
  numero_orden: string;
  proveedor_nombre: string;
  proveedor_cuit: string;
  fecha_emision: string;
  monto_total: number;
  estado: string;
  forma_pago_nombre: string;
  numero_operacion?: string;
  fecha_pago?: string;
  observaciones?: string;
}

interface EstadoCuentaProveedor {
  proveedor_id: string;
  proveedor_nombre: string;
  proveedor_cuit: string;
  total_compras: number;
  total_pagado: number;
  saldo_pendiente: number;
  cantidad_compras: number;
  compras_pendientes: number;
}

const PaymentManagement: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [comprasProveedor, setComprasProveedor] = useState<CompraDetalle[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [ordenesPago, setOrdenesPago] = useState<OrdenPago[]>([]);
  const [estadoCuentaProveedores, setEstadoCuentaProveedores] = useState<EstadoCuentaProveedor[]>([]);
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');
  const [selectedCompras, setSelectedCompras] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedOrdenPago, setSelectedOrdenPago] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [pagoForm, setPagoForm] = useState({
    formaPagoId: '',
    numeroOperacion: '',
    observaciones: '',
    fechaPago: new Date().toISOString().split('T')[0]
  });

  const [confirmForm, setConfirmForm] = useState({
    numeroOperacion: '',
    fechaPago: new Date().toISOString().split('T')[0]
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadProveedores();
    loadFormasPago();
    loadOrdenesPago();
    loadEstadoCuentaProveedores();
  }, []);

  // Cargar proveedores
  const loadProveedores = async () => {
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select(`
          id,
          nombre,
          cuit,
          direccion,
          telefono,
          correo,
          tipos_iva:tipos_iva!inner(nombre)
        `)
        .order('nombre');

      if (error) throw error;

      const proveedoresFormatted = data?.map(p => ({
        ...p,
       tipo_iva: p.tipos_iva?.map(t => t.nombre).join(', ')
      })) || [];

      setProveedores(proveedoresFormatted);
    } catch (error) {
      console.error('Error loading proveedores:', error);
      setError('Error al cargar proveedores');
    }
  };

  // Cargar formas de pago
  const loadFormasPago = async () => {
    try {
      const { data, error } = await supabase
        .from('formas_pago')
        .select('id, nombre')
        .order('nombre');

      if (error) throw error;
      setFormasPago(data || []);
    } catch (error) {
      console.error('Error loading formas de pago:', error);
      setError('Error al cargar formas de pago');
    }
  };

  // Cargar órdenes de pago
  const loadOrdenesPago = async () => {
    try {
      const { data, error } = await supabase
        .from('ordenes_pago')
        .select(`
          id,
          numero_orden,
          fecha_emision,
          monto_total,
          estado,
          numero_operacion,
          fecha_pago,
          observaciones,
          proveedores(nombre, cuit),
          formas_pago(nombre)
        `)
        .order('fecha_emision', { ascending: false });

      if (error) throw error;

      const ordenesFormatted = data?.map(orden => ({
  id: orden.id,
  numero_orden: orden.numero_orden,
  proveedor_nombre: orden.proveedores?.map(p => p.nombre).join(', ') || '',
  proveedor_cuit: orden.proveedores?.map(p => p.cuit).join(', ') || '',
  fecha_emision: orden.fecha_emision,
  monto_total: orden.monto_total,
  estado: orden.estado,
  forma_pago_nombre: orden.formas_pago?.map(f => f.nombre).join(', ') || '',
  numero_operacion: orden.numero_operacion,
  fecha_pago: orden.fecha_pago,
  observaciones: orden.observaciones
})) || [];

      setOrdenesPago(ordenesFormatted);
    } catch (error) {
      console.error('Error loading órdenes de pago:', error);
      setError('Error al cargar órdenes de pago');
    }
  };

  // Cargar estado de cuenta de proveedores usando la vista
  const loadEstadoCuentaProveedores = async () => {
    try {
      const { data, error } = await supabase
        .from('estado_cuenta_proveedores')
        .select('*')
        .order('proveedor_nombre');

      if (error) throw error;
      setEstadoCuentaProveedores(data || []);
    } catch (error) {
      console.error('Error loading estado cuenta proveedores:', error);
      setError('Error al cargar estado de cuenta de proveedores');
    }
  };

  // Cargar compras del proveedor seleccionado
  useEffect(() => {
    if (selectedProveedor) {
      loadComprasProveedor(selectedProveedor);
    } else {
      setComprasProveedor([]);
      setSelectedCompras([]);
    }
  }, [selectedProveedor]);

  const loadComprasProveedor = async (proveedorId: string) => {
    try {
      const { data, error } = await supabase
        .from('compras')
        .select(`
          id,
          numero_factura,
          fecha_compra,
          total_factura,
          monto_pagado,
          estado_pago,
          fecha_vencimiento,
          formas_pago(nombre)
        `)
        .eq('proveedor_id', proveedorId)
        .eq('eliminado', false)
        .neq('estado_pago', 'PAGADO_TOTAL')
        .order('fecha_compra', { ascending: false });

      if (error) throw error;

     const comprasFormatted = data?.map(compra => ({
  ...compra,
  saldo_pendiente: compra.total_factura - compra.monto_pagado,
  forma_pago: compra.formas_pago?.map(f => f.nombre).join(', ') || ''
})) || [];

      setComprasProveedor(comprasFormatted);
    } catch (error) {
      console.error('Error loading compras proveedor:', error);
      setError('Error al cargar compras del proveedor');
    }
  };

  const handleCheckboxChange = (compraId: string, checked: boolean) => {
    if (checked) {
      setSelectedCompras([...selectedCompras, compraId]);
    } else {
      setSelectedCompras(selectedCompras.filter(id => id !== compraId));
    }
  };

  const calcularTotalSeleccionado = () => {
    return comprasProveedor
      .filter(compra => selectedCompras.includes(compra.id))
      .reduce((total, compra) => total + compra.saldo_pendiente, 0);
  };

  const handleGenerarOrdenPago = async () => {
    if (selectedCompras.length === 0 || !pagoForm.formaPagoId) {
      setError('Debe seleccionar al menos una factura y una forma de pago');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Generar número de orden
      const { data: ordenesCount, error: countError } = await supabase
        .from('ordenes_pago')
        .select('id', { count: 'exact' })
        .like('numero_orden', `OP-${new Date().getFullYear()}-%`);

      if (countError) throw countError;

      const numeroOrden = `OP-${new Date().getFullYear()}-${String((ordenesCount?.length || 0) + 1).padStart(3, '0')}`;

      // Calcular monto total
      const montoTotal = calcularTotalSeleccionado();

      // Crear orden de pago
      const { data: ordenCreada, error: ordenError } = await supabase
        .from('ordenes_pago')
        .insert({
          proveedor_id: selectedProveedor,
          numero_orden: numeroOrden,
          fecha_emision: pagoForm.fechaPago,
          forma_pago_id: pagoForm.formaPagoId,
          monto_total: montoTotal,
          estado: 'PENDIENTE',
          observaciones: pagoForm.observaciones,
          numero_operacion: pagoForm.numeroOperacion,
          fecha_pago: pagoForm.fechaPago
        })
        .select()
        .single();

      if (ordenError) throw ordenError;

      // Relacionar compras con la orden de pago
      const relacionesCompras = [];
      for (const compraId of selectedCompras) {
        const compra = comprasProveedor.find(c => c.id === compraId);
        if (compra) {
          relacionesCompras.push({
            orden_pago_id: ordenCreada.id,
            compra_id: compraId,
            monto_asignado: compra.saldo_pendiente
          });
        }
      }

      const { error: relacionError } = await supabase
        .from('orden_pago_compras')
        .insert(relacionesCompras);

      if (relacionError) throw relacionError;

      setSuccess(`Orden de pago ${numeroOrden} creada exitosamente`);
      setIsDialogOpen(false);
      setSelectedCompras([]);
      setPagoForm({
        formaPagoId: '',
        numeroOperacion: '',
        observaciones: '',
        fechaPago: new Date().toISOString().split('T')[0]
      });
      
      // Recargar datos
      loadOrdenesPago();
      loadComprasProveedor(selectedProveedor);
      loadEstadoCuentaProveedores();

    } catch (error) {
      console.error('Error creating orden de pago:', error);
      setError('Error al generar la orden de pago');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarPago = async () => {
    if (!confirmForm.numeroOperacion || !confirmForm.fechaPago) {
      setError('Debe completar todos los campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Actualizar orden de pago a PAGADO
      const { error: updateError } = await supabase
        .from('ordenes_pago')
        .update({
          estado: 'PAGADO',
          fecha_pago: confirmForm.fechaPago,
          numero_operacion: confirmForm.numeroOperacion
        })
        .eq('id', selectedOrdenPago);

      if (updateError) throw updateError;

      // Obtener las compras relacionadas y la orden
      const { data: ordenData, error: ordenError } = await supabase
        .from('ordenes_pago')
        .select(`
          monto_total,
          numero_orden,
          proveedores(nombre),
          orden_pago_compras(compra_id, monto_asignado)
        `)
        .eq('id', selectedOrdenPago)
        .single();

      if (ordenError) throw ordenError;

      // Actualizar montos pagados en las compras
      if (ordenData.orden_pago_compras) {
        for (const relacion of ordenData.orden_pago_compras) {
          const { error: compraError } = await supabase.rpc('actualizar_monto_pagado_compra', {
            compra_id: relacion.compra_id,
            monto_adicional: relacion.monto_asignado
          });

          if (compraError) {
            console.error('Error updating compra:', compraError);
            // Actualización manual si la función RPC no existe
            const { data: compraActual, error: getCompraError } = await supabase
              .from('compras')
              .select('monto_pagado')
              .eq('id', relacion.compra_id)
              .single();

            if (!getCompraError && compraActual) {
              await supabase
                .from('compras')
                .update({
                  monto_pagado: compraActual.monto_pagado + relacion.monto_asignado
                })
                .eq('id', relacion.compra_id);
            }
          }
        }
      }

      // Registrar movimiento de egreso en caja
      const proveedorNombre = ordenData.proveedores?.map(p => p.nombre).join(', ') || 'Proveedor desconocido';

const { error: movimientoError } = await supabase
  .from('movimientos_caja')
  .insert({
    tipo: 'EGRESO',
    concepto: `Pago a proveedor ${proveedorNombre} - Orden ${ordenData.numero_orden}`,
    monto: ordenData.monto_total,
    fecha_movimiento: confirmForm.fechaPago
  });

      if (movimientoError) {
        console.error('Error creating movimento caja:', movimientoError);
        // No fallar por esto, solo logear
      }

      setSuccess('Pago confirmado exitosamente');
      setIsConfirmDialogOpen(false);
      setConfirmForm({
        numeroOperacion: '',
        fechaPago: new Date().toISOString().split('T')[0]
      });
      
      // Recargar datos
      loadOrdenesPago();
      loadEstadoCuentaProveedores();

    } catch (error) {
      console.error('Error confirming payment:', error);
      setError('Error al confirmar el pago');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAGADO_PARCIAL':
        return 'bg-blue-100 text-blue-800';
      case 'PAGADO_TOTAL':
      case 'PAGADO':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
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
            <DollarSign className="h-5 w-5" />
            Gestión de Pagos a Proveedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nuevo-pago" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="nuevo-pago">Nuevo Pago</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="estado-cuenta">Estado de Cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="nuevo-pago">
              <div className="space-y-6">
                {/* Selección de Proveedor */}
                <div className="space-y-2">
                  <Label>Seleccionar Proveedor</Label>
                  <Select value={selectedProveedor} onValueChange={setSelectedProveedor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((proveedor) => (
                        <SelectItem key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre} - {proveedor.cuit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Facturas Pendientes */}
                {selectedProveedor && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Facturas Pendientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {comprasProveedor.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No hay facturas pendientes para este proveedor</p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]">Selec.</TableHead>
                                  <TableHead>N° Factura</TableHead>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>Vencimiento</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead className="text-right">Pagado</TableHead>
                                  <TableHead className="text-right">Saldo</TableHead>
                                  <TableHead>Estado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {comprasProveedor.map((compra) => (
                                  <TableRow key={compra.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedCompras.includes(compra.id)}
                                        onCheckedChange={(checked) => 
                                          handleCheckboxChange(compra.id, checked as boolean)
                                        }
                                        disabled={compra.estado_pago === 'PAGADO_TOTAL'}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium">{compra.numero_factura}</TableCell>
                                    <TableCell>{formatDate(compra.fecha_compra)}</TableCell>
                                    <TableCell>
                                      {compra.fecha_vencimiento ? formatDate(compra.fecha_vencimiento) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(compra.total_factura)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(compra.monto_pagado)}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(compra.saldo_pendiente)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={getEstadoColor(compra.estado_pago)}>
                                        {compra.estado_pago.replace('_', ' ')}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          {selectedCompras.length > 0 && (
                            <div className="mt-4 flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                              <div className="text-lg font-semibold">
                                Total a Pagar: {formatCurrency(calcularTotalSeleccionado())}
                              </div>
                              <Button onClick={() => setIsDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Generar Orden de Pago
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="historial">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Órdenes de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  {ordenesPago.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay órdenes de pago registradas</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>N° Orden</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead>Forma de Pago</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ordenesPago.map((orden) => (
                            <TableRow key={orden.id}>
                              <TableCell className="font-medium">{orden.numero_orden}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{orden.proveedor_nombre}</div>
                                  <div className="text-sm text-gray-500">{orden.proveedor_cuit}</div>
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(orden.fecha_emision)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(orden.monto_total)}</TableCell>
                              <TableCell>{orden.forma_pago_nombre}</TableCell>
                              <TableCell>
                                <Badge className={getEstadoColor(orden.estado)}>
                                  {orden.estado}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  {orden.estado === 'PENDIENTE' && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedOrdenPago(orden.id);
                                        setIsConfirmDialogOpen(true);
                                      }}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="estado-cuenta">
              <Card>
                <CardHeader>
                  <CardTitle>Estado de Cuenta por Proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                  {estadoCuentaProveedores.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay información de estado de cuenta disponible</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {estadoCuentaProveedores.map((estado) => (
                        <Card key={estado.proveedor_id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{estado.proveedor_nombre}</CardTitle>
                            <p className="text-sm text-gray-500">{estado.proveedor_cuit}</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Total Compras:</span>
                                <span className="font-medium">{formatCurrency(estado.total_compras)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Pagado:</span>
                                <span className="font-medium text-green-600">{formatCurrency(estado.total_pagado)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Saldo Pendiente:</span>
                                <span className="font-semibold text-red-600">{formatCurrency(estado.saldo_pendiente)}</span>
                              </div>
                              <div className="text-sm text-gray-500 pt-2">
                                <div>Facturas totales: {estado.cantidad_compras}</div>
                                <div>Pendientes: {estado.compras_pendientes}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog para Orden de Pago */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Pago</DialogTitle>
            <DialogDescription>
              Configure los detalles del pago para las facturas seleccionadas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto Total</Label>
              <Input
                type="text"
                value={formatCurrency(calcularTotalSeleccionado())}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pago</Label>
              <Select value={pagoForm.formaPagoId} onValueChange={(value) => 
                setPagoForm({...pagoForm, formaPagoId: value})
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione forma de pago" />
                </SelectTrigger>
                <SelectContent>
                  {formasPago.map(forma => (
                    <SelectItem key={forma.id} value={forma.id}>
                      {forma.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Pago</Label>
              <Input
                type="date"
                value={pagoForm.fechaPago}
                onChange={(e) => setPagoForm({...pagoForm, fechaPago: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Operación (opcional)</Label>
              <Input
                placeholder="Número de transferencia, cheque, etc."
                value={pagoForm.numeroOperacion}
                onChange={(e) => setPagoForm({...pagoForm, numeroOperacion: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                placeholder="Observaciones adicionales"
                value={pagoForm.observaciones}
                onChange={(e) => setPagoForm({...pagoForm, observaciones: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerarOrdenPago} disabled={loading}>
              {loading ? "Procesando..." : "Generar Orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Confirmar Pago */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
            <DialogDescription>
              Confirme el pago de la orden seleccionada
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fecha de Pago</Label>
              <Input
                type="date"
                value={confirmForm.fechaPago}
                onChange={(e) => setConfirmForm({...confirmForm, fechaPago: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Operación</Label>
              <Input
                placeholder="Número de transferencia, cheque, etc."
                value={confirmForm.numeroOperacion}
                onChange={(e) => setConfirmForm({...confirmForm, numeroOperacion: e.target.value})}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPago} disabled={loading}>
              {loading ? "Confirmando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentManagement;