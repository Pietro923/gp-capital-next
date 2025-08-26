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
  tipo_cliente: "PERSONA_FISICA" | "EMPRESA";
  nombre: string;
  empresa: string;
  apellido?: string;
  direccion?: string;
  dni?: string;
  cuit?: string;
  eliminado?: boolean; 
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
    moneda: string;        // Agregar
    fechaInicio: string;   // Agregar
    aplicarIVA: boolean;   // Agregar
    // Nuevos campos de gastos
  aplicarGastosOtorgamiento: boolean;
  gastosOtorgamiento: number;
  aplicarGastosTransferencia: boolean;
  gastosTransferenciaPrenda: number;
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
  const [comprobante, setComprobante] = useState<string>("");
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('*')
          .eq('eliminado', false) // Agregar esta línea
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
  if (!clienteId || !comprobante) {
    setError("Por favor complete todos los campos");
    return;
  }
  
  setLoading(true);
  setError(null);
  
  try {
    // Obtener información del cliente seleccionado
    const clienteSeleccionado = clientes.find(c => c.id === clienteId);
    const nombreCliente = clienteSeleccionado ? 
      (clienteSeleccionado.tipo_cliente === "EMPRESA" 
        ? clienteSeleccionado.empresa // Usar el campo empresa
        : `${clienteSeleccionado.apellido || ''}, ${clienteSeleccionado.nombre || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '') || 'Sin nombre') 
      : 'Cliente no identificado';

    // 1. Crear el préstamo
    const { data: prestamo, error: prestamoError } = await supabase
      .from('prestamos')
      .insert([{
        cliente_id: clienteId,
        monto_total: prestamoData.monto,
        tasa_interes: prestamoData.tasaInteres,
        cantidad_cuotas: prestamoData.plazo,
        estado: 'ACTIVO',
        fecha_inicio: prestamoData.fechaInicio,
        moneda: prestamoData.moneda || 'Pesos'
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

    const gastosParaInsertar = [];

    // NUEVO: Crear gastos si están seleccionados
if (prestamoData.aplicarGastosOtorgamiento && prestamoData.gastosOtorgamiento > 0) {
  gastosParaInsertar.push({
    prestamo_id: prestamo.id,
    tipo_gasto: 'OTORGAMIENTO',
    monto: prestamoData.gastosOtorgamiento,
    moneda: prestamoData.moneda || 'Pesos',
    descripcion: 'Gastos administrativos de otorgamiento de crédito',
    estado: 'PENDIENTE'
  });
}

if (prestamoData.aplicarGastosTransferencia && prestamoData.gastosTransferenciaPrenda > 0) {
  gastosParaInsertar.push({
    prestamo_id: prestamo.id,
    tipo_gasto: 'TRANSFERENCIA_PRENDA',
    monto: prestamoData.gastosTransferenciaPrenda,
    moneda: prestamoData.moneda || 'Pesos',
    descripcion: 'Gastos de transferencia vehicular y constitución de prenda',
    estado: 'PENDIENTE'
  });
}

// Insertar gastos si existen
if (gastosParaInsertar.length > 0) {
  const { error: gastosError } = await supabase
    .from('gastos_prestamo')
    .insert(gastosParaInsertar);
    
  if (gastosError) throw gastosError;
}
    
    // 3. Registrar el movimiento en caja
    const { error: movimientoError } = await supabase
      .from('movimientos_caja')
      .insert([{
        tipo: 'EGRESO',
        concepto: `Préstamo otorgado - ${nombreCliente} - $${prestamoData.monto.toLocaleString('es-AR')}`,
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
      <DialogContent className="sm:max-w-lg">
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
      {cliente.tipo_cliente === "EMPRESA"
        ? cliente.empresa // Usar cliente.empresa
        : `${cliente.apellido || ''}, ${cliente.nombre || ''}`.trim().replace(/^,\s*/, '')
      }
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
  <Label>Resumen del Préstamo</Label>
  <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-md text-sm">
    <div><strong>Moneda:</strong> {prestamoData.moneda}</div>
    <div><strong>Monto:</strong> ${prestamoData.monto.toLocaleString('es-AR')}</div>
    <div><strong>Frecuencia:</strong> {prestamoData.frecuencia === 'semestral' ? 'Semestral' : 'Mensual'}</div>
              {/*<div>Empresa: {prestamoData.empresa}</div>*/}
    <div><strong>Plazo:</strong> {prestamoData.plazo} {prestamoData.frecuencia === 'semestral' ? 'semestres' : 'meses'}</div>
    <div><strong>Fecha Inicio:</strong> {new Date(prestamoData.fechaInicio).toLocaleDateString('es-AR')}</div>
    <div><strong>Tasa Anual:</strong> {prestamoData.tasaInteres}%</div>
    <div><strong>Aplica IVA:</strong> {prestamoData.aplicarIVA ? 'Sí' : 'No'}</div>
    {prestamoData.aplicarIVA && (
      <div><strong>IVA:</strong> {prestamoData.iva}%</div>
    )}
    {(prestamoData.aplicarGastosOtorgamiento || prestamoData.aplicarGastosTransferencia) && (
  <div className="col-span-2 border-t pt-2">
    <strong>Gastos Adicionales:</strong>
    {prestamoData.aplicarGastosOtorgamiento && (
      <div className="text-xs">• Otorgamiento: ${prestamoData.gastosOtorgamiento.toLocaleString('es-AR')}</div>
    )}
    {prestamoData.aplicarGastosTransferencia && (
      <div className="text-xs">• Transferencia y Prenda: ${prestamoData.gastosTransferenciaPrenda.toLocaleString('es-AR')}</div>
    )}
  </div>
)}
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
    onClick={() => {
      setClienteId(""); // Limpiar cliente seleccionado
      setComprobante(""); // Limpiar comprobante
      setError(null); // Limpiar errores
      onOpenChange(false); // Cerrar dialog
    }}
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