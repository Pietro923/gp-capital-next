/* eslint-disable @typescript-eslint/no-explicit-any */
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

// ✅ FUNCIONES HELPER PARA NOTAS DE CRÉDITO
const esNotaCredito = (tipoFactura: string): boolean => {
  return tipoFactura === 'NCA' || tipoFactura === 'NCB' || tipoFactura === 'NCC';
};


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
  const loadInitialData = async () => {
    await loadClientes();
    await loadFormasPago();
    await loadCobros();
    await actualizarEstadosFacturasBalanceadas(); // ← NUEVA LÍNEA
    await loadEstadoCuentaClientes();
  };
  
  loadInitialData();
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
          facturacion (
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
          numero_factura: (cobro.facturacion as any)?.numero_factura || '',
          tipo_factura: (cobro.facturacion as any)?.tipo_factura || '',
          cliente: (cobro.facturacion as any)?.clientes || {} as Cliente
        },
        fecha_cobro: cobro.fecha_cobro,
        monto_cobrado: cobro.monto_cobrado,
        forma_cobro: { nombre: (cobro.formas_pago as any)?.nombre || '' },
        numero_operacion: cobro.numero_operacion,
        observaciones: cobro.observaciones
      })) || [];
      
      setCobros(cobrosFormatted);
    } catch (error) {
      console.error('Error loading cobros:', error);
      setError('Error al cargar cobros');
    }
  };

  // Cargar estado de cuenta de clientes usando la vista CORREGIDA
  const loadEstadoCuentaClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('estado_cobros_clientes')
        .select('*')
        .order('cliente_apellido');
      if (error) throw error;
      const dataFiltrada = (data || []).filter(cliente => !cliente.eliminado);
      setEstadoCuentaClientes(dataFiltrada);
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

  // ✅ FUNCIÓN MEJORADA PARA CARGAR FACTURAS CON LÓGICA DE NOTAS DE CRÉDITO
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
      
      // ✅ PROCESAR FACTURAS CON LÓGICA CORRECTA PARA NOTAS DE CRÉDITO
      const facturasFormatted = data?.map(factura => {
        // Para notas de crédito, el saldo pendiente debe ser negativo (porque reduce la deuda)
        const saldoPendiente = esNotaCredito(factura.tipo_factura) 
          ? -(factura.total_factura - factura.monto_cobrado)  // Negativo para NC
          : (factura.total_factura - factura.monto_cobrado);  // Positivo para facturas normales
        
        return {
          ...factura,
          saldo_pendiente: saldoPendiente,
          cliente: (factura.clientes as any) || {} as Cliente
        };
      }) || [];
      
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

  // ✅ FUNCIÓN CORREGIDA PARA CALCULAR TOTAL SELECCIONADO
  const calcularTotalSeleccionado = () => {
  const totalFacturas = facturasCliente
    .filter(factura => selectedFacturas.includes(factura.id))
    .reduce((total, factura) => {
      // Para notas de crédito, sumamos el valor absoluto ya que el usuario quiere "cobrar" la NC
      return total + Math.abs(factura.saldo_pendiente);
    }, 0);
  
  // ✅ NUEVO: Si hay sobrepago configurado, usar ese monto
  return cobroForm.montoParcial > 0 ? cobroForm.montoParcial : totalFacturas;
};

 // ✅ 2. AGREGAR VALIDACIÓN Y LÓGICA PARA SOBREPAGOS
const handleGenerarCobro = async () => {
  if (selectedFacturas.length === 0 || !cobroForm.formaPagoId) {
    setError('Debe seleccionar al menos una factura y una forma de cobro');
    return;
  }

  const totalFacturas = facturasCliente
    .filter(factura => selectedFacturas.includes(factura.id))
    .reduce((total, factura) => total + Math.abs(factura.saldo_pendiente), 0);

  const montoAPagar = cobroForm.montoParcial > 0 ? cobroForm.montoParcial : totalFacturas;
  const esSobrepago = montoAPagar > totalFacturas;

  // ✅ CONFIRMAR SOBREPAGO
  if (esSobrepago) {
    const diferencia = montoAPagar - totalFacturas;
    const confirmar = confirm(
      `⚠️ SOBREPAGO DETECTADO\n\n` +
      `Monto a pagar: ${formatCurrency(montoAPagar)}\n` +
      `Total adeudado: ${formatCurrency(totalFacturas)}\n` +
      `Sobrepago: ${formatCurrency(diferencia)}\n\n` +
      `El sobrepago quedará como CRÉDITO A FAVOR del cliente.\n\n` +
      `¿Continuar?`
    );
    
    if (!confirmar) return;
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

    let montoRestante = montoAPagar;

    // ✅ PROCESAR FACTURAS EN ORDEN: PRIMERO LAS NORMALES, LUEGO LAS NC
    const facturasOrdenadas = facturasCliente
      .filter(factura => selectedFacturas.includes(factura.id))
      .sort((a, b) => {
        // Primero facturas normales (positivas), luego notas de crédito (negativas)
        if (esNotaCredito(a.tipo_factura) && !esNotaCredito(b.tipo_factura)) return 1;
        if (!esNotaCredito(a.tipo_factura) && esNotaCredito(b.tipo_factura)) return -1;
        return 0;
      });

    for (const factura of facturasOrdenadas) {
      if (montoRestante <= 0) break;

      const saldoFactura = Math.abs(factura.saldo_pendiente);
      const montoCobrar = Math.min(montoRestante, saldoFactura);

      // Crear cobro para esta factura
      const { error: cobroError } = await supabase
        .from('cobros')
        .insert({
          factura_id: factura.id,
          numero_recibo: facturasOrdenadas.length === 1 ? numeroRecibo : `${numeroRecibo}-${factura.id.slice(-4)}`,
          fecha_cobro: cobroForm.fechaCobro,
          forma_cobro_id: cobroForm.formaPagoId,
          monto_cobrado: montoCobrar,
          numero_operacion: cobroForm.numeroOperacion,
          observaciones: cobroForm.observaciones
        });
      if (cobroError) throw cobroError;

      // Actualizar estado de la factura
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
        .eq('id', factura.id);
      if (facturaError) throw facturaError;

      montoRestante -= montoCobrar;
    }

    // ✅ MANEJAR SOBREPAGO: CREAR CRÉDITO A FAVOR
    if (montoRestante > 0) {
      
      // Crear una "nota de crédito virtual" por el sobrepago
      const { error: creditoError } = await supabase
        .from('facturacion')
        .insert({
          cliente_id: selectedCliente,
          numero_factura: `CRE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          tipo_factura: 'CRE', // Crédito por sobrepago
          fecha_emision: cobroForm.fechaCobro,
          total_factura: -montoRestante, // Negativo porque es a favor del cliente
          monto_cobrado: -montoRestante,
          estado_cobro: 'COBRADO_TOTAL',
          observaciones: `Crédito por sobrepago del recibo ${numeroRecibo}`,
          eliminado: false
        });
      
      if (creditoError) throw creditoError;

      // Registrar el cobro del sobrepago como crédito
      const { error: cobroCreditoError } = await supabase
        .from('cobros')
        .insert({
          factura_id: null, // Sin factura específica
          numero_recibo: `${numeroRecibo}-CRE`,
          fecha_cobro: cobroForm.fechaCobro,
          forma_cobro_id: cobroForm.formaPagoId,
          monto_cobrado: montoRestante,
          numero_operacion: cobroForm.numeroOperacion,
          observaciones: `Sobrepago generó crédito a favor por ${formatCurrency(montoRestante)}`
        });
      
      if (cobroCreditoError) throw cobroCreditoError;
    }

    // ✅ REGISTRAR MOVIMIENTO POR EL MONTO TOTAL RECIBIDO
    const formaPago = formasPago.find(f => f.id === cobroForm.formaPagoId);
    const esEfectivo = formaPago?.nombre.toLowerCase().includes('efectivo') || 
                     formaPago?.nombre.toLowerCase().includes('caja');

    const clienteData = clientes.find(c => c.id === selectedCliente);
    const nombreCliente = clienteData?.tipo_cliente === 'EMPRESA' 
      ? clienteData.empresa || clienteData.nombre
      : `${clienteData?.apellido}, ${clienteData?.nombre}`;

    let conceptoMovimiento = `Cobro de facturas - Cliente: ${nombreCliente}`;
    if (esSobrepago) {
      conceptoMovimiento += ` (incluye sobrepago de ${formatCurrency(montoAPagar - totalFacturas)})`;
    }

    if (esEfectivo) {
      await supabase
        .from('movimientos_caja')
        .insert({
          tipo: 'INGRESO',
          concepto: conceptoMovimiento,
          monto: montoAPagar,
          fecha_movimiento: cobroForm.fechaCobro
        });
    } else {
      await supabase
        .from('movimientos_banco')
        .insert({
          tipo: 'INGRESO',
          concepto: conceptoMovimiento,
          monto: montoAPagar,
          numero_operacion: cobroForm.numeroOperacion,
          fecha_movimiento: cobroForm.fechaCobro
        });
    }

    // Mensaje de éxito
    let mensajeExito = `Cobro registrado exitosamente con recibo ${numeroRecibo}`;
    if (esSobrepago) {
      mensajeExito += `\n\n✅ Sobrepago de ${formatCurrency(montoRestante)} registrado como crédito a favor del cliente.`;
    }

    setSuccess(mensajeExito);
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

  // ✅ FUNCIÓN CORREGIDA PARA ELIMINAR COBROS
const handleDeleteCobro = async (cobroId: string) => {
  if (!confirm('¿Está seguro de eliminar este cobro?\n\nEsta acción revertirá el estado de la factura correspondiente.')) return;
  
  setLoading(true);
  try {
    // 1. OBTENER DATOS DEL COBRO ANTES DE ELIMINARLO
    const { data: cobroData, error: cobroError } = await supabase
      .from('cobros')
      .select(`
        *,
        facturacion (
          id,
          numero_factura,
          tipo_factura,
          total_factura,
          monto_cobrado,
          estado_cobro,
          clientes (
            id,
            nombre,
            apellido,
            empresa,
            tipo_cliente
          )
        ),
        formas_pago (nombre)
      `)
      .eq('id', cobroId)
      .single();

    if (cobroError) throw cobroError;
    
    if (!cobroData) {
      throw new Error('No se encontró el cobro a eliminar');
    }

    const factura = cobroData.facturacion as any;
    const montoCobro = cobroData.monto_cobrado;

    // 2. REVERTIR EL ESTADO DE LA FACTURA (si existe una factura asociada)
    if (cobroData.factura_id && factura) {
      const nuevoMontoCobrado = factura.monto_cobrado - montoCobro;
      
      // Determinar nuevo estado
      let nuevoEstado = 'PENDIENTE';
      if (nuevoMontoCobrado > 0) {
        nuevoEstado = nuevoMontoCobrado >= factura.total_factura ? 'COBRADO_TOTAL' : 'COBRADO_PARCIAL';
      }

      const { error: facturaError } = await supabase
        .from('facturacion')
        .update({
          monto_cobrado: Math.max(0, nuevoMontoCobrado), // No permitir valores negativos
          estado_cobro: nuevoEstado
        })
        .eq('id', cobroData.factura_id);

      if (facturaError) throw facturaError;
    }

    // 3. REGISTRAR MOVIMIENTO DE REVERSIÓN
    const formaPago = cobroData.formas_pago as any;
    const esEfectivo = formaPago?.nombre.toLowerCase().includes('efectivo') || 
                     formaPago?.nombre.toLowerCase().includes('caja');

    // Obtener nombre del cliente para el concepto
    let nombreCliente = 'Cliente no identificado';
    if (factura?.clientes) {
      const cliente = factura.clientes;
      nombreCliente = cliente.tipo_cliente === 'EMPRESA' 
        ? cliente.empresa || cliente.nombre
        : `${cliente.apellido}, ${cliente.nombre}`;
    }

    const conceptoReversion = `REVERSIÓN - Eliminación cobro ${cobroData.numero_recibo} - ${nombreCliente}${factura ? ` - Factura ${factura.numero_factura}` : ''}`;

    if (esEfectivo) {
      // Registrar egreso en caja (salida de dinero por reversión)
      await supabase
        .from('movimientos_caja')
        .insert({
          tipo: 'EGRESO',
          concepto: conceptoReversion,
          monto: montoCobro,
          fecha_movimiento: new Date().toISOString().split('T')[0]
        });
    } else {
      // Registrar egreso bancario
      await supabase
        .from('movimientos_banco')
        .insert({
          tipo: 'EGRESO',
          concepto: conceptoReversion,
          monto: montoCobro,
          numero_operacion: cobroData.numero_operacion,
          fecha_movimiento: new Date().toISOString().split('T')[0]
        });
    }

    // 4. ELIMINAR EL COBRO
    const { error: deleteError } = await supabase
      .from('cobros')
      .delete()
      .eq('id', cobroId);

    if (deleteError) throw deleteError;

    // 5. ACTUALIZAR ESTADOS DE FACTURAS BALANCEADAS
    await actualizarEstadosFacturasBalanceadas();

    setSuccess(`Cobro ${cobroData.numero_recibo} eliminado exitosamente. La factura ha sido revertida al estado anterior.`);
    
    // Recargar datos
    loadCobros();
    loadEstadoCuentaClientes();
    if (selectedCliente) {
      loadFacturasCliente(selectedCliente);
    }

  } catch (error) {
    console.error('Error deleting cobro:', error);
    setError(`Error al eliminar el cobro: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  } finally {
    setLoading(false);
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

  // ✅ FUNCIÓN PARA OBTENER COLOR DEL SALDO SEGÚN EL TIPO
  const getSaldoColor = (tipoFactura: string, saldo: number) => {
    if (esNotaCredito(tipoFactura)) {
      return saldo < 0 ? 'text-green-600' : 'text-red-600'; // Verde para NC disponible, rojo si ya se aplicó
    }
    return saldo > 0 ? 'text-red-600' : 'text-green-600'; // Rojo para deuda, verde para pagado
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

  const actualizarEstadosFacturasBalanceadas = async () => {
  try {
    // Paso 1: Obtener clientes que tienen saldo 0 (balanceados)
    const { data: facturasData, error: facturaError } = await supabase
      .from('facturacion')
      .select('cliente_id, tipo_factura, total_factura, id, estado_cobro')
      .eq('eliminado', false);

    if (facturaError) {
      console.error('Error obteniendo facturas:', facturaError);
      return;
    }

    // Paso 2: Agrupar por cliente y calcular saldos
    const saldosPorCliente: { [key: string]: { saldo: number; facturas: any[] } } = {};
    
    facturasData?.forEach(factura => {
      if (!saldosPorCliente[factura.cliente_id]) {
        saldosPorCliente[factura.cliente_id] = { saldo: 0, facturas: [] };
      }
      
      // Calcular impacto en el saldo
      const esNotaCredito = ['NCA', 'NCB', 'NCC'].includes(factura.tipo_factura);
      const impacto = esNotaCredito ? -factura.total_factura : factura.total_factura;
      
      saldosPorCliente[factura.cliente_id].saldo += impacto;
      saldosPorCliente[factura.cliente_id].facturas.push(factura);
    });

    // Paso 3: Identificar clientes balanceados (saldo = 0) y actualizar sus facturas
    for (const [clienteId, datos] of Object.entries(saldosPorCliente)) {
      if (Math.abs(datos.saldo) < 0.01) { // Considerar saldo 0 (con tolerancia para decimales)
        // Este cliente está balanceado, actualizar todas sus facturas pendientes
        const facturasPendientes = datos.facturas.filter(f => f.estado_cobro === 'PENDIENTE');
        
        for (const factura of facturasPendientes) {
          const { error: updateError } = await supabase
            .from('facturacion')
            .update({
              estado_cobro: 'COBRADO_TOTAL',
              monto_cobrado: factura.total_factura
            })
            .eq('id', factura.id);

          if (updateError) {
            console.error(`Error actualizando factura ${factura.id}:`, updateError);
          }
        }
        
        if (facturasPendientes.length > 0) {
          console.log(`Cliente ${clienteId}: ${facturasPendientes.length} facturas balanceadas`);
        }
      }
    }

    console.log('Estados de facturas balanceadas actualizados correctamente');
  } catch (error) {
    console.error('Error en actualizarEstadosFacturasBalanceadas:', error);
  }
};

// Agregar esta función al componente Chequera
const formatearFecha = (fechaString: string) => {
  const fechaSolo = fechaString.split('T')[0];
  const [año, mes, dia] = fechaSolo.split('-');
  return `${dia}/${mes}/${año}`;
}

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
                                    <td className="p-3">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        esNotaCredito(factura.tipo_factura) 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {factura.tipo_factura}
                                        {esNotaCredito(factura.tipo_factura) && ' 💳'}
                                      </span>
                                    </td>
                                    <td className="p-3">{formatDate(factura.fecha_emision)}</td>
                                    <td className="p-3">
                                      {factura.fecha_vencimiento ? formatDate(factura.fecha_vencimiento) : '-'}
                                    </td>
                                    <td className="text-right p-3">
                                      <span className={esNotaCredito(factura.tipo_factura) ? 'text-green-600' : ''}>
                                        {formatCurrency(factura.total_factura)}
                                        {esNotaCredito(factura.tipo_factura) && ' (NC)'}
                                      </span>
                                    </td>
                                    <td className="text-right p-3">{formatCurrency(factura.monto_cobrado)}</td>
                                    <td className="text-right p-3 font-medium">
                                      <span className={getSaldoColor(factura.tipo_factura, factura.saldo_pendiente)}>
                                        {formatCurrency(Math.abs(factura.saldo_pendiente))}
                                        {esNotaCredito(factura.tipo_factura) && ' (NC)'}
                                      </span>
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
                              <div className="space-y-1">
                                <div className="text-lg font-semibold">
                                  Total a Procesar: {formatCurrency(calcularTotalSeleccionado())}
                                </div>
                                {selectedFacturas.some(id => {
                                  const factura = facturasCliente.find(f => f.id === id);
                                  return factura && esNotaCredito(factura.tipo_factura);
                                }) && (
                                  <div className="text-sm text-green-600">
                                    ✅ Incluye notas de crédito que reducirán la deuda del cliente
                                  </div>
                                )}
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
                                  <div className="font-medium flex items-center gap-2">
                                    {cobro.factura.numero_factura}
                                    {esNotaCredito(cobro.factura.tipo_factura) && (
                                      <span className="text-green-600 text-xs">💳 NC</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">Tipo {cobro.factura.tipo_factura}</div>
                                </div>
                              </td>
                              <td className="p-3">{formatearFecha(cobro.fecha_cobro)}</td>
                              <td className="text-right p-3">
                                <span className={esNotaCredito(cobro.factura.tipo_factura) ? 'text-green-600' : ''}>
                                  {formatCurrency(cobro.monto_cobrado)}
                                </span>
                              </td>
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
                                        formaPagoId: '',
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
                  <div className="text-sm text-gray-600">
                    ✅ Los valores ahora reflejan correctamente el impacto de las notas de crédito
                  </div>
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
                        <Card key={estado.cliente_id} className="relative">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {getClienteNombreEstado(estado)}
                            </CardTitle>
                            <p className="text-sm text-gray-500">
                              {estado.tipo_cliente === 'EMPRESA' ? 'CUIT' : 'DNI'}: {getClienteIdentificacionEstado(estado)}
                            </p>
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
                                <span className={`font-semibold ${
                                  estado.saldo_pendiente > 0 ? 'text-red-600' : 
                                  estado.saldo_pendiente < 0 ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {formatCurrency(estado.saldo_pendiente)}
                                </span>
                              </div>
                              {estado.saldo_pendiente === 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
                                  <div className="text-green-800 text-sm font-medium text-center">
                                    ✅ Cuenta balanceada
                                  </div>
                                </div>
                              )}
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
      {/* Dialog para Nuevo Cobro - ACTUALIZADO PARA SOBREPAGOS */}
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Registrar Cobro</DialogTitle>
      <DialogDescription>
        Configure los detalles del cobro para las facturas seleccionadas
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      {/* ✅ SECCIÓN INFORMATIVA DEL TOTAL ADEUDADO */}
      <div className="space-y-2">
        <Label>Monto Total</Label>
        <Input
          type="text"
          value={formatCurrency(facturasCliente
            .filter(factura => selectedFacturas.includes(factura.id))
            .reduce((total, factura) => total + Math.abs(factura.saldo_pendiente), 0)
          )}
          disabled
          className="bg-gray-50"
        />
        {selectedFacturas.some(id => {
          const factura = facturasCliente.find(f => f.id === id);
          return factura && esNotaCredito(factura.tipo_factura);
        }) && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            ℹ️ Se incluyen notas de crédito que reducirán la deuda del cliente
          </div>
        )}
      </div>
      
      {/* ✅ NUEVA SECCIÓN: MONTO A COBRAR (PERMITE SOBREPAGO) */}
      <div className="space-y-2">
        <Label>Monto a Cobrar</Label>
        <Input
          type="number"
          placeholder={`Dejar vacío para cobrar exactamente: ${formatCurrency(facturasCliente
            .filter(factura => selectedFacturas.includes(factura.id))
            .reduce((total, factura) => total + Math.abs(factura.saldo_pendiente), 0)
          )}`}
          value={cobroForm.montoParcial || ''}
          onChange={(e) => setCobroForm({...cobroForm, montoParcial: Number(e.target.value)})}
          min={0}
          step="0.01"
        />
        <div className="text-xs space-y-1">
          <p className="text-gray-600">
            💡 <strong>Dejar vacío</strong> para cobrar exactamente: {formatCurrency(facturasCliente
              .filter(factura => selectedFacturas.includes(factura.id))
              .reduce((total, factura) => total + Math.abs(factura.saldo_pendiente), 0)
            )}
          </p>
          {cobroForm.montoParcial > 0 && (() => {
            const totalAdeudado = facturasCliente
              .filter(factura => selectedFacturas.includes(factura.id))
              .reduce((total, factura) => total + Math.abs(factura.saldo_pendiente), 0);
            
            if (cobroForm.montoParcial < totalAdeudado) {
              return (
                <p className="text-orange-600">
                  ⚠️ <strong>Pago parcial:</strong> Faltarán {formatCurrency(totalAdeudado - cobroForm.montoParcial)}
                </p>
              );
            } else if (cobroForm.montoParcial > totalAdeudado) {
              return (
                <p className="text-green-600">
                  ✅ <strong>Sobrepago:</strong> {formatCurrency(cobroForm.montoParcial - totalAdeudado)} quedará como crédito a favor
                </p>
              );
            } else {
              return (
                <p className="text-blue-600">
                  ✅ <strong>Pago exacto</strong>
                </p>
              );
            }
          })()}
        </div>
      </div>
      
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