/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/utils/supabase/client';
import { AlertCircle, Calculator } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
  moneda: string; // 👈 CAMPO AGREGADO
}

interface PrestamoConCuotas extends Prestamo {
  cliente: Cliente;
  cuotas: Cuota[];
  cuotas_pagadas: number;
}

interface EditarPrestamoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  prestamo: PrestamoConCuotas;
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

export function EditarPrestamoDialog({ open, onOpenChange, onConfirm, prestamo }: EditarPrestamoDialogProps) {
  // Estados básicos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activeSection, setActiveSection] = useState<'general' | 'cuotas' | 'gastos'>('general');
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    clienteId: "",
    montoTotal: 0,
    tasaInteres: 0,
    cantidadCuotas: 0,
    estado: 'ACTIVO' as 'ACTIVO' | 'CANCELADO' | 'COMPLETADO',
    fechaInicio: "",
    moneda: "Pesos" as "Pesos" | "Dolar"  
  });

  // Estados para cuotas
  const [cuotasEditadas, setCuotasEditadas] = useState<Cuota[]>([]);
  const [cuotaEditando, setCuotaEditando] = useState<string | null>(null);

 // Estados para Gastos
  const [gastosExistentes, setGastosExistentes] = useState<GastoPrestamo[]>([]);
  const [nuevoGastoOtorgamiento, setNuevoGastoOtorgamiento] = useState<number>(5000);
  const [nuevoGastoTransferencia, setNuevoGastoTransferencia] = useState<number>(3000);
  const [agregarGastoOtorgamiento, setAgregarGastoOtorgamiento] = useState<boolean>(false);
  const [agregarGastoTransferencia, setAgregarGastoTransferencia] = useState<boolean>(false);

  // Para editar los gastos
  const [gastoEditando, setGastoEditando] = useState<string | null>(null);
  const [montoEditando, setMontoEditando] = useState<number>(0);

  // Obtener nombre del cliente
  const getNombreCliente = (cliente: Cliente) => {
    if (cliente.tipo_cliente === "EMPRESA") {
      return cliente.empresa || 'Empresa sin nombre';
    }
    return `${cliente.apellido || ''}, ${cliente.nombre || ''}`.trim().replace(/^,\s*/, '') || 'Sin nombre';
  };

  // Formatear fecha
  const formatearFecha = (fechaString: string) => {
    return fechaString.split('T')[0];
  };

  // Cargar datos al abrir
  useEffect(() => {
    if (open && prestamo) {
      setFormData({
        clienteId: prestamo.cliente_id,
        montoTotal: prestamo.monto_total,
        tasaInteres: prestamo.tasa_interes,
        cantidadCuotas: prestamo.cantidad_cuotas,
        estado: prestamo.estado,
        fechaInicio: formatearFecha(prestamo.fecha_inicio),
        moneda: prestamo.moneda === "Pesos" || prestamo.moneda === "Dolar" ? prestamo.moneda : "Pesos"
      });
      setCuotasEditadas([...prestamo.cuotas]);
      setActiveSection('general');
      setError(null);
      setCuotaEditando(null);
      cargarClientes();
      cargarGastosExistentes(); // AGREGAR ESTA LÍNEA
    }
  }, [open, prestamo]);

  const cargarGastosExistentes = async () => {
  try {
    const { data, error } = await supabase
      .from('gastos_prestamo')
      .select('*')
      .eq('prestamo_id', prestamo.id)
      .eq('eliminado', false)
      .order('fecha_creacion');

    if (error) throw error;
    setGastosExistentes(data || []);
    
    // Verificar qué tipos de gastos ya existen para no duplicar
    const tieneOtorgamiento = data?.some(g => g.tipo_gasto === 'OTORGAMIENTO');
    const tieneTransferencia = data?.some(g => g.tipo_gasto === 'TRANSFERENCIA_PRENDA');
    
    setAgregarGastoOtorgamiento(!tieneOtorgamiento);
    setAgregarGastoTransferencia(!tieneTransferencia);
  } catch (error) {
    console.error('Error cargando gastos:', error);
  }
};

// 6. Función para agregar gastos nuevos
const agregarGastosNuevos = async () => {
  try {
    const gastosParaAgregar = [];

    // Agregar gasto de otorgamiento si está seleccionado y no existe
    if (agregarGastoOtorgamiento && !gastosExistentes.some(g => g.tipo_gasto === 'OTORGAMIENTO')) {
      gastosParaAgregar.push({
        prestamo_id: prestamo.id,
        tipo_gasto: 'OTORGAMIENTO',
        monto: nuevoGastoOtorgamiento,
        moneda: formData.moneda,
        descripcion: 'Gastos administrativos de otorgamiento de crédito (agregado posteriormente)',
        estado: 'PENDIENTE'
      });
    }

    // Agregar gasto de transferencia si está seleccionado y no existe
    if (agregarGastoTransferencia && !gastosExistentes.some(g => g.tipo_gasto === 'TRANSFERENCIA_PRENDA')) {
      gastosParaAgregar.push({
        prestamo_id: prestamo.id,
        tipo_gasto: 'TRANSFERENCIA_PRENDA',
        monto: nuevoGastoTransferencia,
        moneda: formData.moneda,
        descripcion: 'Gastos de transferencia vehicular y constitución de prenda (agregado posteriormente)',
        estado: 'PENDIENTE'
      });
    }

    // Insertar gastos si hay alguno para agregar
    if (gastosParaAgregar.length > 0) {
      const { error: gastosError } = await supabase
        .from('gastos_prestamo')
        .insert(gastosParaAgregar);

      if (gastosError) throw gastosError;

      // Recargar gastos existentes
      await cargarGastosExistentes();
    }

  } catch (error) {
    console.error('Error agregando gastos:', error);
    setError('Error al agregar los gastos al préstamo');
  }
};

  // Cargar clientes
  const cargarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('eliminado', false)
        .order('apellido');
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      setError('Error al cargar los clientes');
    }
  };

  // ✅ FUNCIÓN PARA CERRAR Y LIMPIAR
  const handleClose = () => {
    setActiveSection('general');
    setError(null);
    setLoading(false);
    setCuotaEditando(null);

    // Limpiar estado de edición de gastos
    setGastoEditando(null);
    setMontoEditando(0);

    onOpenChange(false);
  };

  // Actualizar préstamo
  const actualizarPrestamo = async () => {
    if (!formData.clienteId) {
      setError("Por favor seleccione un cliente");
      return;
    }

    if (formData.montoTotal <= 0 || formData.tasaInteres < 0 || formData.cantidadCuotas <= 0) {
      setError("Por favor ingrese valores válidos");
      return;
    }

    const cuotasPagadas = prestamo.cuotas.filter(c => c.estado === 'PAGADO').length;
    
    if (cuotasPagadas > 0) {
      const cambiosCriticos = 
        formData.montoTotal !== prestamo.monto_total ||
        formData.cantidadCuotas !== prestamo.cantidad_cuotas ||
        formData.clienteId !== prestamo.cliente_id;

      if (cambiosCriticos) {
        const confirmar = confirm(
          `⚠️ ATENCIÓN: Este préstamo tiene ${cuotasPagadas} cuotas pagadas.\n\n` +
          `Cambiar datos críticos puede afectar los registros existentes.\n\n` +
          `¿Está seguro de continuar?`
        );
        
        if (!confirmar) return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Actualizar préstamo
      const { error: prestamoError } = await supabase
        .from('prestamos')
        .update({
          cliente_id: formData.clienteId,
          monto_total: formData.montoTotal,
          tasa_interes: formData.tasaInteres,
          cantidad_cuotas: formData.cantidadCuotas,
          estado: formData.estado,
          fecha_inicio: formData.fechaInicio,
          moneda: formData.moneda
        })
        .eq('id', prestamo.id);

      if (prestamoError) throw prestamoError;

      // Actualizar cuotas no pagadas
      for (const cuota of cuotasEditadas) {
        if (cuota.estado !== 'PAGADO') {
          const { error: cuotaError } = await supabase
            .from('cuotas')
            .update({
              monto: cuota.monto,
              fecha_vencimiento: cuota.fecha_vencimiento
            })
            .eq('id', cuota.id);

          if (cuotaError) throw cuotaError;
        }
      }

      await agregarGastosNuevos();

      onConfirm();
      handleClose();
      
    } catch (err) {
      console.error('Error actualizando préstamo:', err);
      setError('Error al actualizar el préstamo');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar cuota específica
  const actualizarCuota = (cuotaId: string, campo: 'monto' | 'fecha_vencimiento', valor: any) => {
    setCuotasEditadas(prev => 
      prev.map(cuota => 
        cuota.id === cuotaId 
          ? { ...cuota, [campo]: campo === 'monto' ? Number(valor) : valor }
          : cuota
      )
    );
  };

  const getDescripcionCorta = (tipo_gasto: string) => {
  switch (tipo_gasto) {
    case 'OTORGAMIENTO': return 'Gastos Otorgamiento';
    case 'TRANSFERENCIA_PRENDA': return 'Gastos Transf. y Prenda';
    default: return 'Gasto';
  }
};

// 9. Función para obtener color del estado
const getColorEstado = (estado: string) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
    case 'FACTURADO': return 'bg-blue-100 text-blue-800';
    case 'COBRADO': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

  // Recalcular cuotas
  const recalcularCuotas = () => {
    if (!formData.montoTotal || !formData.cantidadCuotas || formData.cantidadCuotas <= 0) {
      setError("Complete monto total y cantidad de cuotas para recalcular");
      return;
    }

    const confirmar = confirm(
      "⚠️ Esto recalculará todas las cuotas pendientes.\n\n" +
      "Las cuotas ya pagadas no se modificarán.\n\n" +
      "¿Continuar?"
    );

    if (!confirmar) return;

    const cuotasPendientes = cuotasEditadas.filter(c => c.estado === 'PENDIENTE');
    const montoTotalPendiente = formData.montoTotal - cuotasEditadas
      .filter(c => c.estado === 'PAGADO')
      .reduce((sum, c) => sum + c.monto, 0);

    const montoPorCuota = cuotasPendientes.length > 0 ? montoTotalPendiente / cuotasPendientes.length : 0;

    setCuotasEditadas(prev => 
      prev.map(cuota => 
        cuota.estado === 'PENDIENTE'
          ? { ...cuota, monto: Math.round(montoPorCuota) }
          : cuota
      )
    );

    setError(null);
  };

  // TODO PARA EDITAR GASTOS AQUI ABAJO

  const iniciarEdicionGasto = (gasto: GastoPrestamo) => {
  setGastoEditando(gasto.id);
  setMontoEditando(gasto.monto);
};

// 3. Función para guardar cambios en el gasto
const guardarCambiosGasto = async (gastoId: string) => {
  try {
    const { error } = await supabase
      .from('gastos_prestamo')
      .update({ monto: montoEditando })
      .eq('id', gastoId);

    if (error) throw error;

    // Actualizar el estado local
    setGastosExistentes(prev => 
      prev.map(g => g.id === gastoId ? { ...g, monto: montoEditando } : g)
    );

    setGastoEditando(null);
    setMontoEditando(0);

  } catch (error) {
    console.error('Error actualizando gasto:', error);
    setError('Error al actualizar el gasto');
  }
};

// 4. Función para cancelar edición
const cancelarEdicionGasto = () => {
  setGastoEditando(null);
  setMontoEditando(0);
};

// 5. Función para eliminar gasto
const eliminarGasto = async (gasto: GastoPrestamo) => {
  // Confirmación doble si el gasto está facturado o cobrado
  let mensaje = `¿Está seguro de eliminar este gasto?\n\n${getDescripcionCorta(gasto.tipo_gasto)}: ${gasto.moneda === 'Dolar' ? 'US$' : '$'}${gasto.monto.toLocaleString('es-AR')}`;
  
  if (gasto.estado !== 'PENDIENTE') {
    mensaje += `\n\n⚠️ ATENCIÓN: Este gasto está en estado ${gasto.estado}.\nLa eliminación podría afectar la facturación.`;
  }

  const confirmar = confirm(mensaje);
  if (!confirmar) return;

  // Segunda confirmación para gastos no pendientes
  if (gasto.estado !== 'PENDIENTE') {
    const confirmar2 = confirm('⚠️ ÚLTIMA CONFIRMACIÓN\n\nEste gasto no está PENDIENTE.\n¿Continuar con la eliminación?');
    if (!confirmar2) return;
  }

  try {
    // Soft delete del gasto
    const { error } = await supabase
      .from('gastos_prestamo')
      .update({ 
        eliminado: true, 
        fecha_eliminacion: new Date().toISOString() 
      })
      .eq('id', gasto.id);

    if (error) throw error;

    // Actualizar lista local
    setGastosExistentes(prev => prev.filter(g => g.id !== gasto.id));

  } catch (error) {
    console.error('Error eliminando gasto:', error);
    setError('Error al eliminar el gasto');
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Préstamo - {prestamo ? getNombreCliente(prestamo.cliente) : ''}
          </DialogTitle>
        </DialogHeader>

        {/* Navegación */}
        <div className="flex space-x-2 mb-6">
        <Button
          variant={activeSection === 'general' ? 'default' : 'outline'}
          onClick={() => setActiveSection('general')}
          className="flex-1"
        >
          Datos Generales
        </Button>
        <Button
          variant={activeSection === 'cuotas' ? 'default' : 'outline'}
          onClick={() => setActiveSection('cuotas')}
          className="flex-1"
        >
          Cuotas ({cuotasEditadas.length})
        </Button>
        <Button
          variant={activeSection === 'gastos' ? 'default' : 'outline'}
          onClick={() => setActiveSection('gastos')}
          className="flex-1"
        >
          Gastos ({gastosExistentes.length})
        </Button>
      </div>

        {/* Errores */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sección: Datos Generales */}
        {activeSection === 'general' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Préstamo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select 
                      value={formData.clienteId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, clienteId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {getNombreCliente(cliente)}
                            {cliente.tipo_cliente === "EMPRESA" && cliente.cuit 
                              ? ` - CUIT: ${cliente.cuit}` 
                              : cliente.dni 
                              ? ` - DNI: ${cliente.dni}` 
                              : ''
                            }
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado del Préstamo</Label>
                    <Select 
                      value={formData.estado} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, estado: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVO">ACTIVO</SelectItem>
                        <SelectItem value="CANCELADO">CANCELADO</SelectItem>
                        <SelectItem value="COMPLETADO">COMPLETADO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Monto Total</Label>
                    <Input
                      type="number"
                      value={formData.montoTotal}
                      onChange={(e) => setFormData(prev => ({ ...prev, montoTotal: Number(e.target.value) }))}
                      placeholder="Monto total del préstamo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={formData.moneda} onValueChange={(value) => setFormData(prev => ({ ...prev, moneda: value as "Pesos" | "Dolar" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="Pesos">Pesos</SelectItem>
                      <SelectItem value="Dolar">Dólar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                  <div className="space-y-2">
                    <Label>Tasa de Interés Anual (%)</Label>
                    <Input
                      type="number"
                      value={formData.tasaInteres}
                      onChange={(e) => setFormData(prev => ({ ...prev, tasaInteres: Number(e.target.value) }))}
                      placeholder="Tasa de interés"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cantidad de Cuotas</Label>
                    <Input
                      type="number"
                      value={formData.cantidadCuotas}
                      onChange={(e) => setFormData(prev => ({ ...prev, cantidadCuotas: Number(e.target.value) }))}
                      placeholder="Número de cuotas"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Inicio</Label>
                    <Input
                      type="date"
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={recalcularCuotas} variant="outline">
                    <Calculator className="mr-2 h-4 w-4" />
                    Recalcular Cuotas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sección: Cuotas */}
        {activeSection === 'cuotas' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edición de Cuotas</CardTitle>
                <div className="text-sm text-gray-600">
                  <p>💡 Puede editar individualmente las cuotas pendientes.</p>
                  <p>⚠️ Las cuotas ya pagadas no se pueden modificar.</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 border-b font-medium">Cuota</th>
                          <th className="text-left p-3 border-b font-medium">Fecha Vencimiento</th>
                          <th className="text-right p-3 border-b font-medium">Monto</th>
                          <th className="text-left p-3 border-b font-medium">Estado</th>
                          <th className="text-left p-3 border-b font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuotasEditadas.map((cuota) => (
                          <tr key={cuota.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <Badge variant="outline">
                                {cuota.numero_cuota}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {cuotaEditando === cuota.id && cuota.estado !== 'PAGADO' ? (
                                <Input
                                  type="date"
                                  value={formatearFecha(cuota.fecha_vencimiento)}
                                  onChange={(e) => actualizarCuota(cuota.id, 'fecha_vencimiento', e.target.value)}
                                  className="w-full"
                                />
                              ) : (
                                <span>{new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR')}</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {cuotaEditando === cuota.id && cuota.estado !== 'PAGADO' ? (
                                <Input
                                  type="number"
                                  value={cuota.monto}
                                  onChange={(e) => actualizarCuota(cuota.id, 'monto', e.target.value)}
                                  className="w-full text-right"
                                />
                              ) : (
                                <span>${cuota.monto.toLocaleString('es-AR')}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge 
                                variant={
                                  cuota.estado === 'PAGADO' ? 'default' :
                                  cuota.estado === 'VENCIDO' ? 'destructive' : 'secondary'
                                }
                              >
                                {cuota.estado}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {cuota.estado !== 'PAGADO' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => 
                                    setCuotaEditando(
                                      cuotaEditando === cuota.id ? null : cuota.id
                                    )
                                  }
                                >
                                  {cuotaEditando === cuota.id ? 'Guardar' : 'Editar'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen de cuotas */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {cuotasEditadas.length}
                    </div>
                    <div className="text-sm text-gray-500">Total Cuotas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {cuotasEditadas.filter(c => c.estado === 'PAGADO').length}
                    </div>
                    <div className="text-sm text-gray-500">Pagadas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {cuotasEditadas.filter(c => c.estado === 'PENDIENTE').length}
                    </div>
                    <div className="text-sm text-gray-500">Pendientes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'gastos' && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Gastos del Préstamo</CardTitle>
        <div className="text-sm text-gray-600">
          <p>💡 Aquí puede ver y agregar gastos adicionales al préstamo.</p>
          <p>⚠️ Solo se pueden agregar gastos que no existan previamente.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Gastos existentes */}
        {gastosExistentes.length > 0 && (
  <div>
    <h4 className="font-semibold mb-3">Gastos Actuales</h4>
    <div className="space-y-2">
      {gastosExistentes.map((gasto) => (
        <div key={gasto.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-medium text-orange-800">
                {getDescripcionCorta(gasto.tipo_gasto)}
              </div>
              <div className="text-xs text-orange-600">
                Creado: {new Date(gasto.fecha_creacion).toLocaleDateString('es-AR')}
              </div>
            </div>

                    <div className="flex flex-col items-end gap-2">
              {/* Monto - Editable o no */}
              {gastoEditando === gasto.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={montoEditando}
                    onChange={(e) => setMontoEditando(parseFloat(e.target.value) || 0)}
                    className="w-24 h-8 text-right"
                    min="0"
                  />
                  <span className="text-sm text-orange-700">
                    {gasto.moneda === 'Dolar' ? 'US$' : '$'}
                  </span>
                </div>
              ) : (
                <div className="font-semibold text-orange-700">
                  {gasto.moneda === 'Dolar' ? 'US$' : '$'}{gasto.monto.toLocaleString('es-AR')}
                </div>
              )}
              
              {/* Estado */}
              <Badge className={getColorEstado(gasto.estado)}>
                {gasto.estado}
              </Badge>

              {/* Botones de acción */}
              <div className="flex gap-1">
                {gastoEditando === gasto.id ? (
                  // Modo edición
                  <>
                    <Button
                      size="sm"
                      onClick={() => guardarCambiosGasto(gasto.id)}
                      className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelarEdicionGasto}
                      className="h-7 px-2 text-xs"
                    >
                      ✕
                    </Button>
                  </>
                ) : (
                  // Modo normal
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => iniciarEdicionGasto(gasto)}
                      className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      disabled={gasto.estado === 'COBRADO'} // No editar gastos ya cobrados
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => eliminarGasto(gasto)}
                      className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Eliminar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mensaje informativo para gastos no pendientes */}
          {gasto.estado !== 'PENDIENTE' && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs text-yellow-800">
              💡 Este gasto está {gasto.estado.toLowerCase()}. 
              {gasto.estado === 'COBRADO' ? ' No se puede editar el monto.' : ' Tenga cuidado al modificarlo.'}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}

        {/* Agregar nuevos gastos */}
        <div>
          <h4 className="font-semibold mb-3">Agregar Gastos Nuevos</h4>
          
          {/* Gasto de otorgamiento */}
          {!gastosExistentes.some(g => g.tipo_gasto === 'OTORGAMIENTO') && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50 mb-4">
              <div className="flex items-center space-x-3 mb-3">
                <Checkbox 
                  id="agregarGastoOtorgamiento"
                  checked={agregarGastoOtorgamiento}
                  onCheckedChange={(checked) => setAgregarGastoOtorgamiento(checked as boolean)}
                />
                <Label htmlFor="agregarGastoOtorgamiento" className="font-semibold cursor-pointer">
                  Agregar Gastos de Otorgamiento
                </Label>
              </div>
              
              {agregarGastoOtorgamiento && (
                <div className="ml-6 space-y-2">
                  <Label className="text-sm">Monto:</Label>
                  <Input
                    type="number"
                    value={nuevoGastoOtorgamiento}
                    onChange={(e) => setNuevoGastoOtorgamiento(parseFloat(e.target.value) || 0)}
                    placeholder="5000"
                    min="0"
                  />
                </div>
              )}
            </div>
          )}

          {/* Gasto de transferencia */}
          {!gastosExistentes.some(g => g.tipo_gasto === 'TRANSFERENCIA_PRENDA') && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50 mb-4">
              <div className="flex items-center space-x-3 mb-3">
                <Checkbox 
                  id="agregarGastoTransferencia"
                  checked={agregarGastoTransferencia}
                  onCheckedChange={(checked) => setAgregarGastoTransferencia(checked as boolean)}
                />
                <Label htmlFor="agregarGastoTransferencia" className="font-semibold cursor-pointer">
                  Agregar Gastos de Transferencia y Prenda
                </Label>
              </div>
              
              {agregarGastoTransferencia && (
                <div className="ml-6 space-y-2">
                  <Label className="text-sm">Monto:</Label>
                  <Input
                    type="number"
                    value={nuevoGastoTransferencia}
                    onChange={(e) => setNuevoGastoTransferencia(parseFloat(e.target.value) || 0)}
                    placeholder="3000"
                    min="0"
                  />
                </div>
              )}
            </div>
          )}

          {/* Mensaje si ya tiene todos los gastos */}
          {gastosExistentes.length >= 2 && (
            <div className="text-center py-6 text-slate-500">
              Este préstamo ya tiene todos los tipos de gastos disponibles.
            </div>
          )}

          {/* Resumen de nuevos gastos */}
          {(agregarGastoOtorgamiento || agregarGastoTransferencia) && (
            <div className="border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-semibold mb-2 text-blue-800">Resumen de Gastos a Agregar:</h5>
                <div className="space-y-1 text-sm">
                  {agregarGastoOtorgamiento && (
                    <div className="flex justify-between">
                      <span>Gastos de Otorgamiento:</span>
                      <span className="font-medium">
                        {formData.moneda === 'Dolar' ? 'US$' : '$'}{nuevoGastoOtorgamiento.toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                  {agregarGastoTransferencia && (
                    <div className="flex justify-between">
                      <span>Gastos Transferencia y Prenda:</span>
                      <span className="font-medium">
                        {formData.moneda === 'Dolar' ? 'US$' : '$'}{nuevoGastoTransferencia.toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 font-semibold flex justify-between text-blue-800">
                    <span>Total a Agregar:</span>
                    <span>
                      {formData.moneda === 'Dolar' ? 'US$' : '$'}
                      {((agregarGastoOtorgamiento ? nuevoGastoOtorgamiento : 0) + 
                        (agregarGastoTransferencia ? nuevoGastoTransferencia : 0)).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
)}

        {/* ✅ FOOTER CORREGIDO usando DialogClose */}
        <DialogFooter>
          <DialogClose asChild>
            <Button 
              variant="outline" 
              disabled={loading}
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            onClick={actualizarPrestamo}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}