"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Plus, Receipt, FileText, AlertCircle, Download, Pencil, Trash2, Check, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/utils/supabase/client';

// Interfaces
interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  cuit?: string;
  tipo_cliente: 'PERSONA_FISICA' | 'EMPRESA';
  empresa?: string;
}

interface FacturaDetalle {
  id: string;
  numero_factura: string;
  tipo_factura: string;
  fecha_emision: string;
  total_factura: number;
  monto_cobrado: number;
  estado_cobro: 'PENDIENTE' | 'COBRADO_PARCIAL' | 'COBRADO_TOTAL';
  saldo_pendiente: number;
  fecha_vencimiento?: string;
  cliente: Cliente;
}

interface FormaPago {
  id: string;
  nombre: string;
}

interface Cobro {
  id: string;
  numero_recibo: string;
  factura_id: string;
  factura: { 
    numero_factura: string; 
    tipo_factura: string;
    cliente: Cliente 
  };
  fecha_cobro: string;
  monto_cobrado: number;
  forma_cobro: { nombre: string };
  numero_operacion?: string;
  observaciones?: string;
}

interface EstadoCuentaCliente {
  cliente_id: string;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_dni: string;
  cliente_cuit?: string;
  tipo_cliente: 'PERSONA_FISICA' | 'EMPRESA';
  empresa?: string;
  total_facturado: number;
  total_cobrado: number;
  saldo_pendiente: number;
  cantidad_facturas: number;
  facturas_pendientes: number;
}

const InvoiceCollections: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [facturasCliente, setFacturasCliente] = useState<FacturaDetalle[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [estadoCuentaClientes, setEstadoCuentaClientes] = useState<EstadoCuentaCliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedFacturas, setSelectedFacturas] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);

  const [cobroForm, setCobroForm] = useState({
    formaPagoId: '',
    numeroOperacion: '',
    observaciones: '',
    fechaCobro: new Date().toISOString().split('T')[0],
    montoParcial: 0
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadClientes();
    loadFormasPago();
    loadCobros();
    loadEstadoCuentaClientes();
  }, []);

  // Cargar clientes
  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nombre,
          apellido,
          dni,
          cuit,
          tipo_cliente,
          empresa
        `)
        .eq('eliminado', false)
        .order('apellido');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error loading clientes:', error);
      setError('Error al cargar clientes');
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

  // Cargar cobros
  const loadCobros = async () => {
    try {
      const { data, error } = await supabase
        .from('cobros')
        .select(`
        id,
        numero_recibo,
        factura_id,
        fecha_cobro,
        monto_cobrado,
        numero_operacion,
        observaciones,
        facturacion!inner (
            numero_factura,
            tipo_factura,
            clientes (
            id,
            nombre,
            apellido,
            dni,
            cuit,
            tipo_cliente,
            empresa
            )
        ),
        formas_pago (nombre)
        `)
        .order('fecha_cobro', { ascending: false });

      if (error) throw error;

      const cobrosFormatted = data?.map(cobro => ({
        id: cobro.id,
        numero_recibo: cobro.numero_recibo,
        factura_id: cobro.factura_id,
        factura: {
        numero_factura: cobro.facturacion?.map(f => f.numero_factura).join(', ') || '',
tipo_factura: cobro.facturacion?.map(f => f.tipo_factura).join(', ') || '',
cliente: cobro.facturacion?.map(f => f.clientes?.[0]).filter(Boolean)[0] || {} as Cliente
        },
        fecha_cobro: cobro.fecha_cobro,
        monto_cobrado: cobro.monto_cobrado,
        forma_cobro: { nombre: cobro.formas_pago?.map(f => f.nombre).join(', ') || '' },
        numero_operacion: cobro.numero_operacion,
        observaciones: cobro.observaciones
      })) || [];

      setCobros(cobrosFormatted);
    } catch (error) {
      console.error('Error loading cobros:', error);
      setError('Error al cargar cobros');
    }
  };

  // Cargar estado de cuenta de clientes usando la vista
  const loadEstadoCuentaClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('estado_cobros_clientes')
        .select('*')
        .order('cliente_apellido');

      if (error) throw error;
      setEstadoCuentaClientes(data || []);
    } catch (error) {
      console.error('Error loading estado cuenta clientes:', error);
      setError('Error al cargar estado de cuenta de clientes');
    }
  };

  // Cargar facturas del cliente seleccionado
  useEffect(() => {
    if (selectedCliente) {
      loadFacturasCliente(selectedCliente);
    } else {
      setFacturasCliente([]);
      setSelectedFacturas([]);
    }
  }, [selectedCliente]);

  const loadFacturasCliente = async (clienteId: string) => {
  try {
    const { data, error } = await supabase
      .from('facturacion')
      .select(`
        id,
        numero_factura,
        tipo_factura,
        fecha_emision,
        total_factura,
        monto_cobrado,
        estado_cobro,
        fecha_vencimiento,
        clientes (
          id,
          nombre,
          apellido,
          dni,
          cuit,
          tipo_cliente,
          empresa
        )
      `)
      .eq('cliente_id', clienteId)
      .eq('eliminado', false)
      .neq('estado_cobro', 'COBRADO_TOTAL')
      .order('fecha_emision', { ascending: false });

    if (error) throw error;

    const facturasFormatted = data?.map(factura => ({
      ...factura,
      saldo_pendiente: factura.total_factura - factura.monto_cobrado,
      cliente: factura.clientes?.map(c => c)[0] || {} as Cliente // Tomar el primer cliente del array
    })) || [];

    setFacturasCliente(facturasFormatted);
  } catch (error) {
    console.error('Error loading facturas cliente:', error);
    setError('Error al cargar facturas del cliente');
  }
};

  const handleCheckboxChange = (facturaId: string, checked: boolean) => {
    if (checked) {
      setSelectedFacturas([...selectedFacturas, facturaId]);
    } else {
      setSelectedFacturas(selectedFacturas.filter(id => id !== facturaId));
    }
  };

  const calcularTotalSeleccionado = () => {
    return facturasCliente
      .filter(factura => selectedFacturas.includes(factura.id))
      .reduce((total, factura) => total + factura.saldo_pendiente, 0);
  };

  const handleGenerarCobro = async () => {
    if (selectedFacturas.length === 0 || !cobroForm.formaPagoId) {
      setError('Debe seleccionar al menos una factura y una forma de cobro');
      return;
    }

    if (selectedFacturas.length > 1 && cobroForm.montoParcial > 0) {
      setError('No se puede hacer cobro parcial para múltiples facturas');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Generar número de recibo
      const { data: recibosCount, error: countError } = await supabase
        .from('cobros')
        .select('id', { count: 'exact' })
        .like('numero_recibo', `REC-${new Date().getFullYear()}-%`);

      if (countError) throw countError;

      const numeroRecibo = `REC-${new Date().getFullYear()}-${String((recibosCount?.length || 0) + 1).padStart(3, '0')}`;

      // Procesar cada factura seleccionada
      for (const facturaId of selectedFacturas) {
        const factura = facturasCliente.find(f => f.id === facturaId);
        if (!factura) continue;

        // Calcular monto a cobrar
        const montoCobrar = selectedFacturas.length === 1 && cobroForm.montoParcial > 0 
          ? cobroForm.montoParcial 
          : factura.saldo_pendiente;

        // Crear cobro
        const { error: cobroError } = await supabase
          .from('cobros')
          .insert({
            factura_id: facturaId,
            numero_recibo: selectedFacturas.length === 1 ? numeroRecibo : `${numeroRecibo}-${facturaId.slice(-4)}`,
            fecha_cobro: cobroForm.fechaCobro,
            forma_cobro_id: cobroForm.formaPagoId,
            monto_cobrado: montoCobrar,
            numero_operacion: cobroForm.numeroOperacion,
            observaciones: cobroForm.observaciones
          });

        if (cobroError) throw cobroError;

        // Actualizar monto cobrado en la factura
        const nuevoMontoCobrado = factura.monto_cobrado + montoCobrar;
        const nuevoEstado = nuevoMontoCobrado >= factura.total_factura 
          ? 'COBRADO_TOTAL' 
          : nuevoMontoCobrado > 0 ? 'COBRADO_PARCIAL' : 'PENDIENTE';

        const { error: facturaError } = await supabase
          .from('facturacion')
          .update({
            monto_cobrado: nuevoMontoCobrado,
            estado_cobro: nuevoEstado
          })
          .eq('id', facturaId);

        if (facturaError) throw facturaError;

        // Registrar movimiento en caja o banco
        const formaPago = formasPago.find(f => f.id === cobroForm.formaPagoId);
        const esEfectivo = formaPago?.nombre.toLowerCase().includes('efectivo') || 
                         formaPago?.nombre.toLowerCase().includes('caja');

        if (esEfectivo) {
          // Movimiento de caja
          await supabase
            .from('movimientos_caja')
            .insert({
              tipo: 'INGRESO',
              concepto: `Cobro factura ${factura.numero_factura} - Cliente: ${factura.cliente.apellido}, ${factura.cliente.nombre}`,
              monto: montoCobrar,
              fecha_movimiento: cobroForm.fechaCobro
            });
        } else {
          // Movimiento bancario
          await supabase
            .from('movimientos_banco')
            .insert({
              tipo: 'INGRESO',
              concepto: `Cobro factura ${factura.numero_factura} - Cliente: ${factura.cliente.apellido}, ${factura.cliente.nombre}`,
              monto: montoCobrar,
              numero_operacion: cobroForm.numeroOperacion,
              fecha_movimiento: cobroForm.fechaCobro
            });
        }
      }

      setSuccess(`Cobro registrado exitosamente con recibo ${numeroRecibo}`);
      setIsDialogOpen(false);
      setSelectedFacturas([]);
      setCobroForm({
        formaPagoId: '',
        numeroOperacion: '',
        observaciones: '',
        fechaCobro: new Date().toISOString().split('T')[0],
        montoParcial: 0
      });
      
      // Recargar datos
      loadCobros();
      loadFacturasCliente(selectedCliente);
      loadEstadoCuentaClientes();

    } catch (error) {
      console.error('Error creating cobro:', error);
      setError('Error al registrar el cobro');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCobro = async () => {
    if (!selectedCobro) return;

    setLoading(true);
    setError(null);

    try {
      // Actualizar cobro
      const { error: updateError } = await supabase
        .from('cobros')
        .update({
          fecha_cobro: cobroForm.fechaCobro,
          monto_cobrado: cobroForm.montoParcial,
          numero_operacion: cobroForm.numeroOperacion,
          observaciones: cobroForm.observaciones
        })
        .eq('id', selectedCobro.id);

      if (updateError) throw updateError;

      setSuccess('Cobro actualizado exitosamente');
      setIsEditDialogOpen(false);
      setSelectedCobro(null);
      
      // Recargar datos
      loadCobros();
      loadEstadoCuentaClientes();

    } catch (error) {
      console.error('Error updating cobro:', error);
      setError('Error al actualizar el cobro');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCobro = async (cobroId: string) => {
    if (!confirm('¿Está seguro de eliminar este cobro?')) return;

    try {
      const { error } = await supabase
        .from('cobros')
        .delete()
        .eq('id', cobroId);

      if (error) throw error;

      setSuccess('Cobro eliminado exitosamente');
      loadCobros();
      loadEstadoCuentaClientes();
    } catch (error) {
      console.error('Error deleting cobro:', error);
      setError('Error al eliminar el cobro');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'COBRADO_PARCIAL':
        return 'bg-blue-100 text-blue-800';
      case 'COBRADO_TOTAL':
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

  const exportarRecibo = (cobro: Cobro) => {
  const reciboData = `
RECIBO DE COBRO
N° ${cobro.numero_recibo}

Cliente: ${cobro.factura.cliente.tipo_cliente === 'EMPRESA' 
  ? `${cobro.factura.cliente.empresa || cobro.factura.cliente.nombre} (${cobro.factura.cliente.cuit})`
  : `${cobro.factura.cliente.apellido}, ${cobro.factura.cliente.nombre} (DNI: ${cobro.factura.cliente.dni})`}

Factura: ${cobro.factura.numero_factura} (Tipo ${cobro.factura.tipo_factura})
Fecha: ${formatDate(cobro.fecha_cobro)}
Monto Cobrado: ${formatCurrency(cobro.monto_cobrado)}
Forma de Cobro: ${cobro.forma_cobro.nombre}
${cobro.numero_operacion ? `N° Operación: ${cobro.numero_operacion}` : ''}
${cobro.observaciones ? `Observaciones: ${cobro.observaciones}` : ''}

Fecha de emisión: ${formatDate(new Date().toISOString())}
    `;

    const blob = new Blob([reciboData], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Recibo_${cobro.numero_recibo}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

const getClienteNombreEstado = (estado: EstadoCuentaCliente) => {
  if (estado.tipo_cliente === 'EMPRESA') {
    return estado.empresa || `${estado.cliente_nombre} ${estado.cliente_apellido}`;
  }
  return `${estado.cliente_apellido}, ${estado.cliente_nombre}`;
};

const getClienteIdentificacionEstado = (estado: EstadoCuentaCliente) => {
  if (estado.tipo_cliente === 'EMPRESA') {
    return estado.cliente_cuit || estado.cliente_dni;
  }
  return estado.cliente_dni;
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
            <Receipt className="h-5 w-5" />
            Gestión de Cobros de Facturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nuevo-cobro" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="nuevo-cobro">Nuevo Cobro</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="estado-cuenta">Estado de Cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="nuevo-cobro">
              <div className="space-y-6">
                {/* Selección de Cliente */}
                <div className="space-y-2">
                  <Label>Seleccionar Cliente</Label>
                  <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un cliente" />
                    </SelectTrigger>
                    <SelectContent>
  {clientes.map((cliente) => (
    <SelectItem key={cliente.id} value={cliente.id}>
      {cliente.tipo_cliente === 'EMPRESA' 
        ? `${cliente.empresa || cliente.nombre} (${cliente.cuit})` 
        : `${cliente.apellido}, ${cliente.nombre} (${cliente.dni})`}
    </SelectItem>
  ))}
</SelectContent>
                  </Select>
                </div>

                {/* Facturas Pendientes */}
                {selectedCliente && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Facturas Pendientes de Cobro</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {facturasCliente.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No hay facturas pendientes para este cliente</p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-md border">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b bg-gray-50">
                                  <th className="text-left p-3 w-[50px]">Selec.</th>
                                  <th className="text-left p-3">N° Factura</th>
                                  <th className="text-left p-3">Tipo</th>
                                  <th className="text-left p-3">Fecha</th>
                                  <th className="text-left p-3">Vencimiento</th>
                                  <th className="text-right p-3">Total</th>
                                  <th className="text-right p-3">Cobrado</th>
                                  <th className="text-right p-3">Saldo</th>
                                  <th className="text-left p-3">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {facturasCliente.map((factura) => (
                                  <tr key={factura.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">
                                      <Checkbox
                                        checked={selectedFacturas.includes(factura.id)}
                                        onCheckedChange={(checked) => 
                                          handleCheckboxChange(factura.id, checked as boolean)
                                        }
                                        disabled={factura.estado_cobro === 'COBRADO_TOTAL'}
                                      />
                                    </td>
                                    <td className="p-3 font-medium">{factura.numero_factura}</td>
                                    <td className="p-3">{factura.tipo_factura}</td>
                                    <td className="p-3">{formatDate(factura.fecha_emision)}</td>
                                    <td className="p-3">
                                      {factura.fecha_vencimiento ? formatDate(factura.fecha_vencimiento) : '-'}
                                    </td>
                                    <td className="text-right p-3">{formatCurrency(factura.total_factura)}</td>
                                    <td className="text-right p-3">{formatCurrency(factura.monto_cobrado)}</td>
                                    <td className="text-right p-3 font-medium">
                                      {formatCurrency(factura.saldo_pendiente)}
                                    </td>
                                    <td className="p-3">
                                      <Badge className={getEstadoColor(factura.estado_cobro)}>
                                        {factura.estado_cobro.replace('_', ' ')}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {selectedFacturas.length > 0 && (
                            <div className="mt-4 flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                              <div className="text-lg font-semibold">
                                Total a Cobrar: {formatCurrency(calcularTotalSeleccionado())}
                              </div>
                              <Button onClick={() => setIsDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Registrar Cobro
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
                  <CardTitle>Historial de Cobros</CardTitle>
                </CardHeader>
                <CardContent>
                  {cobros.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay cobros registrados</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3">N° Recibo</th>
                            <th className="text-left p-3">Cliente</th>
                            <th className="text-left p-3">Factura</th>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-right p-3">Monto</th>
                            <th className="text-left p-3">Forma Cobro</th>
                            <th className="text-left p-3">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cobros.map((cobro) => (
                            <tr key={cobro.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-medium">{cobro.numero_recibo}</td>
                              <td className="p-3">
  <div>
    <div className="font-medium">
      {cobro.factura.cliente.tipo_cliente === 'EMPRESA' 
        ? cobro.factura.cliente.empresa || cobro.factura.cliente.nombre
        : `${cobro.factura.cliente.apellido}, ${cobro.factura.cliente.nombre}`}
    </div>
    <div className="text-sm text-gray-500">
      {cobro.factura.cliente.tipo_cliente === 'EMPRESA' 
        ? cobro.factura.cliente.cuit 
        : cobro.factura.cliente.dni}
    </div>
  </div>
</td>
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">{cobro.factura.numero_factura}</div>
                                  <div className="text-sm text-gray-500">Tipo {cobro.factura.tipo_factura}</div>
                                </div>
                              </td>
                              <td className="p-3">{formatDate(cobro.fecha_cobro)}</td>
                              <td className="text-right p-3">{formatCurrency(cobro.monto_cobrado)}</td>
                              <td className="p-3">{cobro.forma_cobro.nombre}</td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => exportarRecibo(cobro)}
                                    title="Descargar recibo"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedCobro(cobro);
                                      setCobroForm({
                                        formaPagoId: '', // Se necesitaría el ID de la forma de pago
                                        numeroOperacion: cobro.numero_operacion || '',
                                        observaciones: cobro.observaciones || '',
                                        fechaCobro: cobro.fecha_cobro,
                                        montoParcial: cobro.monto_cobrado
                                      });
                                      setIsEditDialogOpen(true);
                                    }}
                                    title="Editar cobro"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => handleDeleteCobro(cobro.id)}
                                    title="Eliminar cobro"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="estado-cuenta">
              <Card>
                <CardHeader>
                  <CardTitle>Estado de Cuenta por Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  {estadoCuentaClientes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay información de estado de cuenta disponible</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {estadoCuentaClientes.map((estado) => (
                        <Card key={estado.cliente_id}>
                          <CardHeader>
                            <CardTitle className="text-lg">
  {getClienteNombreEstado(estado)}
</CardTitle>
<p className="text-sm text-gray-500">
  {estado.tipo_cliente === 'EMPRESA' ? 'CUIT' : 'DNI'}: {getClienteIdentificacionEstado(estado)}
</p>
                            <p className="text-sm text-gray-500">DNI: {estado.cliente_dni}</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Total Facturado:</span>
                                <span className="font-medium">{formatCurrency(estado.total_facturado)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Cobrado:</span>
                                <span className="font-medium text-green-600">{formatCurrency(estado.total_cobrado)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Saldo Pendiente:</span>
                                <span className="font-semibold text-red-600">{formatCurrency(estado.saldo_pendiente)}</span>
                              </div>
                              <div className="text-sm text-gray-500 pt-2">
                                <div>Facturas totales: {estado.cantidad_facturas}</div>
                                <div>Pendientes: {estado.facturas_pendientes}</div>
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

      {/* Dialog para Nuevo Cobro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Cobro</DialogTitle>
            <DialogDescription>
              Configure los detalles del cobro para las facturas seleccionadas
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
            {selectedFacturas.length === 1 && (
              <div className="space-y-2">
                <Label>Monto Parcial (opcional)</Label>
                <Input
                  type="number"
                  placeholder="Dejar vacío para cobro total"
                  value={cobroForm.montoParcial || ''}
                  onChange={(e) => setCobroForm({...cobroForm, montoParcial: Number(e.target.value)})}
                  max={calcularTotalSeleccionado()}
                />
                <p className="text-xs text-gray-500">
                  Máximo: {formatCurrency(calcularTotalSeleccionado())}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Forma de Cobro</Label>
              <Select value={cobroForm.formaPagoId} onValueChange={(value) => 
                setCobroForm({...cobroForm, formaPagoId: value})
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione forma de cobro" />
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
              <Label>Fecha de Cobro</Label>
              <Input
                type="date"
                value={cobroForm.fechaCobro}
                onChange={(e) => setCobroForm({...cobroForm, fechaCobro: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Operación (opcional)</Label>
              <Input
                placeholder="Número de transferencia, cheque, etc."
                value={cobroForm.numeroOperacion}
                onChange={(e) => setCobroForm({...cobroForm, numeroOperacion: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                placeholder="Observaciones adicionales"
                value={cobroForm.observaciones}
                onChange={(e) => setCobroForm({...cobroForm, observaciones: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerarCobro} disabled={loading}>
              {loading ? "Procesando..." : "Registrar Cobro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Cobro */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cobro</DialogTitle>
            <DialogDescription>
              Modifique los datos del cobro seleccionado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto Cobrado</Label>
              <Input
                type="number"
                value={cobroForm.montoParcial}
                onChange={(e) => setCobroForm({...cobroForm, montoParcial: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Cobro</Label>
              <Input
                type="date"
                value={cobroForm.fechaCobro}
                onChange={(e) => setCobroForm({...cobroForm, fechaCobro: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Operación</Label>
              <Input
                value={cobroForm.numeroOperacion}
                onChange={(e) => setCobroForm({...cobroForm, numeroOperacion: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={cobroForm.observaciones}
                onChange={(e) => setCobroForm({...cobroForm, observaciones: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCobro} disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceCollections;