/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { 
  obtenerPrimero,
  type ProveedorPayment,
  type CompraPayment,
  type OrdenPagoData,
} from "@/types/supabase";

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
  
  // Para las acciones:
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrdenDetalle, setSelectedOrdenDetalle] = useState<OrdenPago | null>(null);
  const [ordenDetalles, setOrdenDetalles] = useState<any[]>([]); 


  const [pagoForm, setPagoForm] = useState({
    formaPagoId: '',
    numeroOperacion: '',
    observaciones: '',
    fechaPago: new Date().toISOString().split('T')[0],
    montoParcial: 0  // AGREGAR ESTE CAMPO
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
        tipos_iva(nombre)
      `)
      .order('nombre');

    if (error) throw error;

    const proveedoresFormatted = (data as ProveedorPayment[])?.map(p => ({
      ...p,
      tipo_iva: obtenerPrimero(p.tipos_iva)?.nombre
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

  // Función loadOrdenesPago corregida
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

    const ordenesFormatted = (data as OrdenPagoData[])?.map(orden => ({
      id: orden.id,
      numero_orden: orden.numero_orden,
      proveedor_nombre: obtenerPrimero(orden.proveedores)?.nombre || '',
      proveedor_cuit: obtenerPrimero(orden.proveedores)?.cuit || '',
      fecha_emision: orden.fecha_emision,
      monto_total: orden.monto_total,
      estado: orden.estado,
      forma_pago_nombre: obtenerPrimero(orden.formas_pago)?.nombre || '',
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
     .in('estado_pago', ['PENDIENTE', 'PAGADO_PARCIAL'])
      .order('fecha_compra', { ascending: false });

    if (error) throw error;

    const comprasFormatted = (data as CompraPayment[])?.map(compra => ({
      ...compra,
      saldo_pendiente: compra.total_factura - compra.monto_pagado,
      forma_pago: obtenerPrimero(compra.formas_pago)?.nombre
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

  // NUEVA VALIDACIÓN: No permitir pago parcial para múltiples facturas
  if (selectedCompras.length > 1 && pagoForm.montoParcial > 0) {
    setError('No se puede hacer pago parcial para múltiples facturas');
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

    // MODIFICAR: Calcular monto total considerando pago parcial
    let montoTotal;
    if (selectedCompras.length === 1 && pagoForm.montoParcial > 0) {
      montoTotal = pagoForm.montoParcial;
    } else {
      montoTotal = calcularTotalSeleccionado();
    }

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

    // MODIFICAR: Relacionar compras con montos específicos
    const relacionesCompras = [];
    for (const compraId of selectedCompras) {
      const compra = comprasProveedor.find(c => c.id === compraId);
      if (compra) {
        // Usar monto parcial si es pago parcial, sino el saldo completo
        const montoAsignado = selectedCompras.length === 1 && pagoForm.montoParcial > 0 
          ? pagoForm.montoParcial 
          : compra.saldo_pendiente;

        relacionesCompras.push({
          orden_pago_id: ordenCreada.id,
          compra_id: compraId,
          monto_asignado: montoAsignado
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
      fechaPago: new Date().toISOString().split('T')[0],
      montoParcial: 0  // RESETEAR
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
    console.log('🔍 Confirmando pago para orden:', selectedOrdenPago);
    
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
    console.log('✅ Orden actualizada a PAGADO');

    // Obtener las compras relacionadas con la orden
    const { data: relacionesCompras, error: relacionesError } = await supabase
      .from('orden_pago_compras')
      .select('compra_id, monto_asignado')
      .eq('orden_pago_id', selectedOrdenPago);

    if (relacionesError) throw relacionesError;
    console.log('🔍 Relaciones encontradas:', relacionesCompras);

    // **CAMBIO CRÍTICO:** Actualizar cada compra individualmente
    if (relacionesCompras && relacionesCompras.length > 0) {
      for (const relacion of relacionesCompras) {
        console.log(`🔍 Procesando compra: ${relacion.compra_id}, monto: ${relacion.monto_asignado}`);
        
        // **PASO 1:** Obtener datos actuales de la compra
        const { data: compraActual, error: getCompraError } = await supabase
          .from('compras')
          .select('monto_pagado, total_factura, estado_pago')
          .eq('id', relacion.compra_id)
          .single();

        if (getCompraError) {
          console.error('❌ Error obteniendo compra:', getCompraError);
          throw getCompraError;
        }
        
        console.log('🔍 Estado ANTES:', {
          monto_pagado_actual: compraActual.monto_pagado,
          monto_a_sumar: relacion.monto_asignado,
          total_factura: compraActual.total_factura,
          estado_actual: compraActual.estado_pago
        });

        // **PASO 2:** Calcular nuevos valores
        const nuevoMontoPagado = Number(compraActual.monto_pagado) + Number(relacion.monto_asignado);
        const totalFactura = Number(compraActual.total_factura);
        
        let nuevoEstado = 'PENDIENTE';
        if (nuevoMontoPagado >= totalFactura) {
          nuevoEstado = 'PAGADO_TOTAL';
        } else if (nuevoMontoPagado > 0) {
          nuevoEstado = 'PAGADO_PARCIAL';
        }

        console.log('🔍 Estado DESPUÉS:', {
          nuevo_monto_pagado: nuevoMontoPagado,
          nuevo_estado: nuevoEstado,
          diferencia: nuevoMontoPagado - totalFactura
        });

        // **PASO 3:** Actualizar la compra con valores explícitos
        const { data: compraActualizada, error: updateCompraError } = await supabase
          .from('compras')
          .update({
            monto_pagado: nuevoMontoPagado,
            estado_pago: nuevoEstado
          })
          .eq('id', relacion.compra_id)
          .select('monto_pagado, estado_pago')
          .single();

        if (updateCompraError) {
          console.error('❌ Error actualizando compra:', updateCompraError);
          throw updateCompraError;
        }
        
        console.log('✅ Compra actualizada a:', compraActualizada);
      }
    }

    // Registrar movimiento de egreso - CORREGIDO para manejar transferencias
const { data: ordenData, error: ordenError } = await supabase
  .from('ordenes_pago')
  .select(`
    monto_total,
    numero_orden,
    proveedores(nombre),
    formas_pago(nombre)
  `)
  .eq('id', selectedOrdenPago)
  .single();

if (ordenError) throw ordenError;

const proveedor = obtenerPrimero(ordenData.proveedores);
const proveedorNombre = proveedor?.nombre || 'Proveedor desconocido';
const formaPago = obtenerPrimero(ordenData.formas_pago);
const formaPagoNombre = formaPago?.nombre || '';

// Determinar si es transferencia bancaria o efectivo
const esTransferenciaBancaria = formaPagoNombre.toLowerCase().includes('transferencia') || 
                              formaPagoNombre.toLowerCase().includes('bancaria') ||
                              formaPagoNombre.toLowerCase().includes('banco');

if (esTransferenciaBancaria) {
  // Registrar en movimientos bancarios
  const { error: movimientoError } = await supabase
    .from('movimientos_banco')
    .insert({
      tipo: 'EGRESO',
      concepto: `Pago a proveedor ${proveedorNombre} - Orden ${ordenData.numero_orden}`,
      monto: ordenData.monto_total,
      numero_operacion: confirmForm.numeroOperacion,
      fecha_movimiento: confirmForm.fechaPago
    });

  if (movimientoError) {
    console.error('Error creating movimento banco:', movimientoError);
  }
} else {
  // Registrar en movimientos de caja (efectivo)
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
  }
}

    setSuccess('Pago confirmado exitosamente');
    setIsConfirmDialogOpen(false);
    setConfirmForm({
      numeroOperacion: '',
      fechaPago: new Date().toISOString().split('T')[0]
    });
    
    console.log('🔄 Recargando datos...');
    
    // Esperar un poco antes de recargar para asegurar que la BD se actualice
    setTimeout(async () => {
      await loadOrdenesPago();
      await loadEstadoCuentaProveedores();
      if (selectedProveedor) {
        await loadComprasProveedor(selectedProveedor);
      }
      console.log('✅ Datos recargados');
    }, 500);
    
  } catch (error) {
    console.error('❌ Error confirming payment:', error);
    setError(`Error al confirmar el pago: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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

  // Función para cargar detalles de una orden de pago
const loadOrdenDetalles = async (ordenId: string) => {
  try {
    const { data, error } = await supabase
      .from('orden_pago_compras')
      .select(`
        monto_asignado,
        compras(
          numero_factura,
          fecha_compra,
          total_factura,
          tipo_factura
        )
      `)
      .eq('orden_pago_id', ordenId);

    if (error) throw error;
    setOrdenDetalles(data || []);
  } catch (error) {
    console.error('Error loading orden detalles:', error);
    setError('Error al cargar detalles de la orden');
  }
};

// Función para abrir modal de ver detalles
const handleVerDetalle = async (orden: OrdenPago) => {
  setSelectedOrdenDetalle(orden);
  await loadOrdenDetalles(orden.id);
  setIsViewDialogOpen(true);
};

// Función para exportar orden de pago
const exportarOrdenPago = async (orden: OrdenPago) => {
  try {
    // Cargar detalles de la orden
    const { data: detalles, error } = await supabase
      .from('orden_pago_compras')
      .select(`
        monto_asignado,
        compras(
          numero_factura,
          fecha_compra,
          total_factura,
          tipo_factura
        )
      `)
      .eq('orden_pago_id', orden.id);

    if (error) throw error;

    // Crear contenido del archivo
    const ordenData = `
ORDEN DE PAGO
N° ${orden.numero_orden}

Proveedor: ${orden.proveedor_nombre}
CUIT: ${orden.proveedor_cuit}
Fecha de Emisión: ${formatDate(orden.fecha_emision)}
${orden.fecha_pago ? `Fecha de Pago: ${formatDate(orden.fecha_pago)}` : ''}
Forma de Pago: ${orden.forma_pago_nombre}
${orden.numero_operacion ? `N° Operación: ${orden.numero_operacion}` : ''}
Estado: ${orden.estado}

DETALLE DE FACTURAS:
${detalles?.map((detalle: any) => 
  `- Factura: ${detalle.compras?.numero_factura} | Tipo: ${detalle.compras?.tipo_factura} | Fecha: ${detalle.compras?.fecha_compra ? formatDate(detalle.compras.fecha_compra) : 'N/A'} | Monto: ${formatCurrency(detalle.monto_asignado)}`
).join('\n') || 'Sin detalles disponibles'}

MONTO TOTAL: ${formatCurrency(orden.monto_total)}

${orden.observaciones ? `Observaciones: ${orden.observaciones}` : ''}

Fecha de emisión del reporte: ${formatDate(new Date().toISOString())}
    `;

    // Crear y descargar archivo
    const blob = new Blob([ordenData], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Orden_Pago_${orden.numero_orden}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting orden:', error);
    setError('Error al exportar la orden de pago');
  }
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
      Total a Pagar: {selectedCompras.length === 1 && pagoForm.montoParcial > 0 
        ? formatCurrency(pagoForm.montoParcial)
        : formatCurrency(calcularTotalSeleccionado())
      }
      {selectedCompras.length === 1 && pagoForm.montoParcial > 0 && (
        <span className="text-sm text-gray-500 ml-2">
          (Pago parcial de {formatCurrency(calcularTotalSeleccionado())})
        </span>
      )}
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
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => handleVerDetalle(orden)}
      title="Ver detalles"
    >
      <Eye className="h-4 w-4" />
    </Button>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => exportarOrdenPago(orden)}
      title="Descargar orden"
    >
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
        title="Confirmar pago"
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

            {/* AGREGAR ESTE CAMPO PARA PAGO PARCIAL */}
  {selectedCompras.length === 1 && (
    <div className="space-y-2">
      <Label>Monto Parcial (opcional)</Label>
      <Input
        type="number"
        placeholder="Dejar vacío para pago total"
        value={pagoForm.montoParcial || ''}
        onChange={(e) => setPagoForm({...pagoForm, montoParcial: Number(e.target.value)})}
        max={calcularTotalSeleccionado()}
      />
      <p className="text-xs text-gray-500">
        Máximo: {formatCurrency(calcularTotalSeleccionado())}
      </p>
    </div>
  )}

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

      {/* Dialog para Ver Detalles de Orden */}
<Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
  <DialogContent className="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Detalles de Orden de Pago</DialogTitle>
      <DialogDescription>
        Información completa de la orden seleccionada
      </DialogDescription>
    </DialogHeader>
    
    {selectedOrdenDetalle && (
      <div className="space-y-4">
        {/* Información general */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-sm text-gray-600">N° Orden</Label>
            <p className="font-medium">{selectedOrdenDetalle.numero_orden}</p>
          </div>
          <div>
            <Label className="text-sm text-gray-600 p-3">Estado</Label>
            <Badge className={getEstadoColor(selectedOrdenDetalle.estado)}>
              {selectedOrdenDetalle.estado}
            </Badge>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Proveedor</Label>
            <p className="font-medium">{selectedOrdenDetalle.proveedor_nombre}</p>
            <p className="text-sm text-gray-500">{selectedOrdenDetalle.proveedor_cuit}</p>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Monto Total</Label>
            <p className="font-medium text-lg">{formatCurrency(selectedOrdenDetalle.monto_total)}</p>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Fecha Emisión</Label>
            <p>{formatDate(selectedOrdenDetalle.fecha_emision)}</p>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Forma de Pago</Label>
            <p>{selectedOrdenDetalle.forma_pago_nombre}</p>
          </div>
          {selectedOrdenDetalle.fecha_pago && (
            <div>
              <Label className="text-sm text-gray-600">Fecha Pago</Label>
              <p>{formatDate(selectedOrdenDetalle.fecha_pago)}</p>
            </div>
          )}
          {selectedOrdenDetalle.numero_operacion && (
            <div>
              <Label className="text-sm text-gray-600">N° Operación</Label>
              <p>{selectedOrdenDetalle.numero_operacion}</p>
            </div>
          )}
        </div>

        {/* Facturas incluidas */}
        <div>
          <Label className="text-lg font-semibold">Facturas Incluidas</Label>
          <div className="mt-2 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Factura</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto Asignado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenDetalles.map((detalle, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {detalle.compras?.numero_factura || 'N/A'}
                    </TableCell>
                    <TableCell>{detalle.compras?.tipo_factura || 'N/A'}</TableCell>
                    <TableCell>
                      {detalle.compras?.fecha_compra ? formatDate(detalle.compras.fecha_compra) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(detalle.monto_asignado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Observaciones */}
        {selectedOrdenDetalle.observaciones && (
          <div>
            <Label className="text-sm text-gray-600">Observaciones</Label>
            <p className="mt-1 p-2 bg-gray-50 rounded border text-sm">
              {selectedOrdenDetalle.observaciones}
            </p>
          </div>
        )}
      </div>
    )}
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
        Cerrar
      </Button>
      {selectedOrdenDetalle && (
        <Button onClick={() => exportarOrdenPago(selectedOrdenDetalle)}>
          <Download className="h-4 w-4 mr-2" />
          Descargar
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default PaymentManagement;