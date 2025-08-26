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

export function EditarPrestamoDialog({ open, onOpenChange, onConfirm, prestamo }: EditarPrestamoDialogProps) {
  // Estados básicos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activeSection, setActiveSection] = useState<'general' | 'cuotas'>('general');
  
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
    }
  }, [open, prestamo]);

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