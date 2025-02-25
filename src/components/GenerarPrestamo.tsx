import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/utils/supabase/client';
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  direccion: string;
  dni: string;
}

interface GenerarPrestamoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  prestamoData: {
    monto: number;
    plazo: number;
    tasaInteres: number;
    empresa: string;
    frecuencia: string;
    iva: number;
    cuotas: Array<{
      numero: number;
      fechaVencimiento: string;
      cuota: number;
    }>;
  };
}

export function GenerarPrestamo({ open, onOpenChange, onConfirm, prestamoData }: GenerarPrestamoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState<string>("");
  const [metodoPago] = useState<string>("");
  const [comprobante, setComprobante] = useState<string>("");
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('*')
          .order('apellido');

        if (clientesError) throw clientesError;
        if (clientesData) setClientes(clientesData);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        setError('Error al cargar los clientes');
      }
    };

    if (open) {
      fetchClientes();
    }
  }, [open]);

  const handleGenerarPrestamo = async () => {
    if (!clienteId || !metodoPago || !comprobante) {
      setError("Por favor complete todos los campos");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Crear el préstamo
      const { data: prestamo, error: prestamoError } = await supabase
        .from('prestamos')
        .insert([{
          cliente_id: clienteId,
          monto_total: prestamoData.monto,
          tasa_interes: prestamoData.tasaInteres,
          cantidad_cuotas: prestamoData.plazo,
          estado: 'ACTIVO',
          fecha_inicio: new Date().toISOString()
        }])
        .select()
        .single();

      if (prestamoError) throw prestamoError;

      // 2. Crear las cuotas
      const cuotasInsert = prestamoData.cuotas.map(cuota => ({
        prestamo_id: prestamo.id,
        numero_cuota: cuota.numero,
        monto: cuota.cuota,
        fecha_vencimiento: cuota.fechaVencimiento,
        estado: 'PENDIENTE'
      }));

      const { error: cuotasError } = await supabase
        .from('cuotas')
        .insert(cuotasInsert);

      if (cuotasError) throw cuotasError;

      // 3. Registrar el movimiento en caja
      const { error: movimientoError } = await supabase
        .from('movimientos_caja')
        .insert([{
          tipo: 'EGRESO',
          concepto: `Préstamo otorgado a cliente ${clienteId} - ${prestamoData.empresa}`,
          monto: prestamoData.monto
        }]);

      if (movimientoError) throw movimientoError;

      onConfirm();
      onOpenChange(false);
    } catch (err) {
      console.error('Error al generar el préstamo:', err);
      setError('Error al generar el préstamo. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar Préstamo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.apellido}, {cliente.nombre} - DNI: {cliente.dni}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resumen del Préstamo</Label>
            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-md">
              <div>Monto: ${prestamoData.monto.toLocaleString('es-AR')}</div>
              <div>Plazo: {prestamoData.plazo} meses</div>
              <div>Tasa: {prestamoData.tasaInteres}%</div>
              <div>Empresa: {prestamoData.empresa}</div>
            </div>
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
            onClick={handleGenerarPrestamo}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Generar Préstamo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}