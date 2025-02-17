import { useState } from "react";
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

  const handlePago = async () => {
    if (!metodoPago || !comprobante) {
      setError("Por favor complete todos los campos");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Registrar el pago
      const { error: pagoError } = await supabase
        .from('pagos')
        .insert([{
          cuota_id: cuotaId,
          prestamo_id: prestamoId,
          monto: montoCuota,
          metodo_pago: metodoPago,
          comprobante: comprobante
        }])
        .select()
        .single();

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

      // 3. Registrar el movimiento en caja
      const { error: movimientoError } = await supabase
        .from('movimientos_caja')
        .insert([{
          tipo: 'INGRESO',
          concepto: `Pago cuota ${numeroCuota} - Préstamo ${prestamoId}`,
          monto: montoCuota
        }]);

      if (movimientoError) throw movimientoError;

      onConfirm();
      onOpenChange(false);
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
            />
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="TARJETA">Tarjeta</SelectItem>
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
            onClick={() => onOpenChange(false)}
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