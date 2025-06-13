/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/utils/supabase/client';
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PagarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  numeroCuota: number;
  cuotaId: string;
  prestamoId: string;
  montoCuota: number;
}

interface FormaPago {
  id: string;
  nombre: string;
}

export function PagarDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  numeroCuota, 
  cuotaId, 
  prestamoId,
  montoCuota 
}: PagarDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<string>("");
  const [comprobante, setComprobante] = useState<string>("");
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);

  // Cargar formas de pago desde la base de datos
  useEffect(() => {
    const fetchFormasPago = async () => {
      try {
        const { data, error } = await supabase
          .from('formas_pago')
          .select('*')
          .order('nombre');
        
        if (error) throw error;
        setFormasPago(data || []);
      } catch (err) {
        console.error('Error cargando formas de pago:', err);
        // Fallback a opciones predeterminadas
        setFormasPago([
          { id: '1', nombre: 'Efectivo' },
          { id: '2', nombre: 'Transferencia' },
          { id: '3', nombre: 'Tarjeta de Crédito' }
        ]);
      }
    };

    if (open) {
      fetchFormasPago();
    }
  }, [open]);

  // Limpiar formulario cuando se abre/cierra el dialog
  useEffect(() => {
    if (open) {
      setMetodoPago("");
      setComprobante("");
      setError(null);
    }
  }, [open]);

  const handleCancel = () => {
    setMetodoPago("");
    setComprobante("");
    setError(null);
    onOpenChange(false);
  };

  const handlePago = async () => {
  if (!metodoPago || !comprobante.trim()) {
    setError("Por favor complete todos los campos");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // Obtener información del cliente para el concepto del movimiento
    const { data: prestamoData, error: prestamoError } = await supabase
      .from('prestamos')
      .select(`
        cliente:clientes(nombre, apellido, empresa, tipo_cliente)
      `)
      .eq('id', prestamoId)
      .single();

    if (prestamoError) throw prestamoError;

    // Usar any para evitar problemas de tipos con Supabase
    const cliente: any = Array.isArray(prestamoData.cliente) 
      ? prestamoData.cliente[0] 
      : prestamoData.cliente;

    const nombreCliente = cliente.tipo_cliente === "EMPRESA"
      ? cliente.empresa
      : `${cliente.apellido || ''}, ${cliente.nombre || ''}`.trim().replace(/^,\s*/, '');

    // 1. Registrar el pago
    const { error: pagoError } = await supabase
      .from('pagos')
      .insert([{
        cuota_id: cuotaId,
        prestamo_id: prestamoId,
        monto: montoCuota,
        metodo_pago: metodoPago,
        comprobante: comprobante.trim()
      }]);

    if (pagoError) throw pagoError;

    // 2. Actualizar el estado de la cuota
    const { error: cuotaError } = await supabase
      .from('cuotas')
      .update({ 
        estado: 'PAGADO',
        fecha_pago: new Date().toISOString()
      })
      .eq('id', cuotaId);

    if (cuotaError) throw cuotaError;

    // 3. Registrar el movimiento en caja con mejor descripción
    const { error: movimientoError } = await supabase
      .from('movimientos_caja')
      .insert([{
        tipo: 'INGRESO',
        concepto: `Pago cuota ${numeroCuota} - ${nombreCliente} - $${montoCuota.toLocaleString('es-AR')}`,
        monto: montoCuota,
        fecha_movimiento: new Date().toISOString().split('T')[0] // Solo la fecha, sin hora
      }]);

    if (movimientoError) throw movimientoError;

    // Verificar si todas las cuotas están pagadas para actualizar estado del préstamo
    const { data: cuotasPendientes, error: cuotasError } = await supabase
      .from('cuotas')
      .select('id')
      .eq('prestamo_id', prestamoId)
      .eq('estado', 'PENDIENTE');

    if (cuotasError) throw cuotasError;

    // Si no hay cuotas pendientes, marcar préstamo como completado
    if (cuotasPendientes.length === 0) {
      const { error: prestamoUpdateError } = await supabase
        .from('prestamos')
        .update({ estado: 'COMPLETADO' })
        .eq('id', prestamoId);

      if (prestamoUpdateError) throw prestamoUpdateError;
    }

    onConfirm();
    handleCancel();
  } catch (err) {
    console.error('Error al procesar el pago:', err);
    setError('Error al procesar el pago. Por favor intente nuevamente.');
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago - Cuota {numeroCuota}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label>Monto a pagar</Label>
            <Input
              type="text"
              value={`$${montoCuota.toLocaleString('es-AR')}`}
              disabled
              className="bg-slate-50"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione método de pago" />
              </SelectTrigger>
              <SelectContent>
                {formasPago.map((forma) => (
                  <SelectItem key={forma.id} value={forma.nombre}>
                    {forma.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Comprobante</Label>
            <Input
              placeholder="Número de comprobante o referencia"
              value={comprobante}
              onChange={(e) => setComprobante(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            variant="default" 
            onClick={handlePago}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}