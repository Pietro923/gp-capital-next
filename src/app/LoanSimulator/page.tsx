"use client";
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Download, ChevronRight, ChevronDown } from "lucide-react";
import { GenerarPrestamo } from "@/components/GenerarPrestamo";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from '@/utils/supabase/client';

interface CuotaSimulada {
  numero: number;
  fechaVencimiento: string;
  capitalInicial: number;
  interes: number;
  iva: number;
  cuota: number;
  capitalRestante: number;
}

interface Proveedor {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  contacto: string | null;
  observaciones: string | null;
  created_at: string;
}

type TipoCliente = "PERSONA_FISICA" | "EMPRESA";

interface Cliente {
  id: string;
  tipo_cliente: TipoCliente; // 👈 nuevo campo
  nombre: string;
  apellido?: string; // opcional si es empresa
  empresa?: string;  // opcional si es persona
  direccion: string;
  dni?: string;
  eliminado?: boolean; // 👈 Añade esta línea
}

const LoanSimulator: React.FC = () => {
  const [monto, setMonto] = useState<number>(0);
  const [plazo, setPlazo] = useState<number>(12);
  const [tasaInteres, setTasaInteres] = useState<number>(65);
  const [empresa] = useState<string>('Proveedor');
  const [frecuencia, setFrecuencia] = useState<string>('mensual');
  const [moneda, setMoneda] = useState<string>('Pesos');
  const [porcentajeIVA, setPorcentajeIVA] = useState<number>(21);
  const [aplicarIVA, setAplicarIVA] = useState<boolean>(true);
  const [cuotas, setCuotas] = useState<CuotaSimulada[]>([]);
  const [cuotaPeriodica, setCuotaPeriodica] = useState<number>(0);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [expandedCuota, setExpandedCuota] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>("");

  const [, setProveedores] = useState<Proveedor[]>([]);
  const [, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);

  const [aplicarGastosOtorgamiento, setAplicarGastosOtorgamiento] = useState<boolean>(false);
  const [gastosOtorgamiento, setGastosOtorgamiento] = useState<number>(5000);
  const [aplicarGastosTransferencia, setAplicarGastosTransferencia] = useState<boolean>(false);
  const [gastosTransferenciaPrenda, setGastosTransferenciaPrenda] = useState<number>(3000);

  useEffect(() => {
    const fetchProveedores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: proveedoresData, error: proveedoresError } = await supabase
          .from('proveedores')
          .select('*');
        
        if (proveedoresError) throw proveedoresError;
        setProveedores(proveedoresData || []);
      } catch (error) {
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProveedores();
  }, []);
  
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('*')
          .order('apellido')
          .eq('eliminado', false) // Solo clientes no eliminados
          .order('created_at', { ascending: false });
  
        if (clientesError) throw clientesError;
        if (clientesData) setClientes(clientesData);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        setError('Error al cargar los clientes');
      }
    };
  
    fetchClientes();
  }, []);
  


  // Función calcularCuotas CORREGIDA para manejar tasa de interés 0%
const calcularCuotas = () => {
  // Validaciones básicas
  if (!monto || monto <= 0) {
    alert('Por favor ingrese un monto válido mayor a 0');
    return;
  }
  
  if (!plazo || plazo <= 0) {
    alert('Por favor ingrese un plazo válido mayor a 0');
    return;
  }

  if (tasaInteres < 0) {
    alert('La tasa de interés no puede ser negativa');
    return;
  }

  try {
    // Determinar periodos por año según la frecuencia
    const periodosPorAnio = frecuencia === 'semestral' ? 2 : 12;
    
    // Calcular tasa por periodo
    const tasaPorPeriodo = tasaInteres / periodosPorAnio / 100;
    
    const nuevasCuotas: CuotaSimulada[] = [];
    let capitalPendiente = monto;
    
    // Configurar fecha base
    const fecha = new Date(fechaInicio + 'T12:00:00'); // Agregar hora para evitar problemas de zona horaria
const diaVencimiento = fecha.getDate();

    let montoTotalCalculado = 0;
    
    // ========================================
    // CASO ESPECIAL: TASA DE INTERÉS 0%
    // ========================================
    if (tasaInteres === 0 || tasaPorPeriodo === 0) {
      // Sin intereses, solo dividir el capital en cuotas iguales
      const capitalPorCuota = monto / plazo;
      
      for (let i = 1; i <= plazo; i++) {
        // Calcular fecha de vencimiento
        const fechaVencimiento = new Date(fechaInicio + 'T12:00:00');
if (frecuencia === 'semestral') {
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (i * 6));
} else {
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i);
}
fechaVencimiento.setDate(diaVencimiento);
        
        // Sin intereses
        const interesCuota = 0;
        
        // Calcular IVA sobre el interés (será 0)
        const ivaCuota = aplicarIVA ? interesCuota * (porcentajeIVA / 100) : 0;
        
        // Cuota = solo capital (sin intereses ni IVA)
        const cuotaFinal = capitalPorCuota + ivaCuota; // IVA será 0
        
        // Actualizar capital restante
        capitalPendiente -= capitalPorCuota;
        
        // Asegurar que la última cuota no deje saldo negativo
        if (i === plazo) {
          capitalPendiente = 0;
        }
        
        montoTotalCalculado += cuotaFinal;
        
        nuevasCuotas.push({
          numero: i,
          fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
          capitalInicial: monto - (capitalPorCuota * (i - 1)),
          interes: interesCuota,
          iva: ivaCuota,
          cuota: cuotaFinal,
          capitalRestante: Math.max(0, capitalPendiente)
        });
      }
    } 
    // ========================================
    // CASO NORMAL: CON TASA DE INTERÉS
    // ========================================
    else {
      // Calcular cuota base usando fórmula de anualidades
      const cuotaBase = 
        (monto * tasaPorPeriodo * Math.pow(1 + tasaPorPeriodo, plazo)) / 
        (Math.pow(1 + tasaPorPeriodo, plazo) - 1);
      
      // Verificar que el cálculo sea válido
      if (isNaN(cuotaBase) || !isFinite(cuotaBase)) {
        alert('Error en el cálculo. Verifique los valores ingresados.');
        return;
      }
      
      for (let i = 1; i <= plazo; i++) {
        // Calcular fecha de vencimiento
        const fechaVencimiento = new Date(fechaInicio);
if (frecuencia === 'semestral') {
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (i * 6));
} else {
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i);
}
fechaVencimiento.setDate(diaVencimiento);
        
        // Calcular interés sobre capital pendiente
        const interesCuota = capitalPendiente * tasaPorPeriodo;
        
        // Calcular IVA sobre el interés si corresponde
        const ivaCuota = aplicarIVA ? interesCuota * (porcentajeIVA / 100) : 0;
        
        // Capital que se amortiza en esta cuota
        const capitalCuota = cuotaBase - interesCuota;
        
        // Cuota final incluye capital + interés + IVA
        const cuotaFinal = capitalCuota + interesCuota + ivaCuota;
        
        // Actualizar capital pendiente
        capitalPendiente -= capitalCuota;
        
        // Asegurar que la última cuota no deje saldo negativo
        if (i === plazo && capitalPendiente < 0.01) {
          capitalPendiente = 0;
        }
        
        montoTotalCalculado += cuotaFinal;
        
        nuevasCuotas.push({
          numero: i,
          fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
          capitalInicial: capitalPendiente + capitalCuota,
          interes: interesCuota,
          iva: ivaCuota,
          cuota: cuotaFinal,
          capitalRestante: Math.max(0, capitalPendiente)
        });
      }
    }
    
    // Actualizar estados
    setCuotas(nuevasCuotas);
    setCuotaPeriodica(nuevasCuotas[0]?.cuota || 0);
    setMontoTotal(montoTotalCalculado);
    
    console.log(`✅ Simulación generada: ${nuevasCuotas.length} cuotas, Total: $${montoTotalCalculado.toFixed(2)}`);
    
  } catch (error) {
    console.error('Error calculando cuotas:', error);
    alert('Error al calcular las cuotas. Verifique los datos ingresados.');
  }
};

// Función exportToExcel MEJORADA con más información
const exportToExcel = () => {
  if (cuotas.length === 0) {
    alert('No hay cuotas para exportar. Primero calcule la simulación.');
    return;
  }

  try {
    // Obtener información del cliente seleccionado
    const clienteSeleccionado = clientes.find(c => c.id === clienteId);
    const nombreCliente = clienteSeleccionado ? 
      (clienteSeleccionado.tipo_cliente === "EMPRESA" 
        ? clienteSeleccionado.empresa 
        : `${clienteSeleccionado.apellido}, ${clienteSeleccionado.nombre}`) 
      : 'Cliente no seleccionado';

    // Crear datos del encabezado con información de la simulación
    const encabezado = [
      [`SIMULACIÓN DE PRÉSTAMO - GP CAPITAL`, '', '', '', '', '', ''],
      [`Fecha de Simulación: ${new Date().toLocaleDateString('es-AR')}`, '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['DATOS DEL PRÉSTAMO', '', '', '', '', '', ''],
      ['Cliente:', nombreCliente, '', '', '', '', ''],
      ['Moneda:', moneda, '', '', '', '', ''],
      ['Monto del Préstamo:', `$${monto.toLocaleString('es-AR')}`, '', '', '', '', ''],
      ['Tasa de Interés Anual:', `${tasaInteres}%`, '', '', '', '', ''],
      ['Frecuencia de Pago:', frecuencia === 'semestral' ? 'Semestral' : 'Mensual', '', '', '', '', ''],
      ['Plazo:', `${plazo} ${frecuencia === 'semestral' ? 'semestres' : 'meses'}`, '', '', '', '', ''],
      ['Aplicar IVA:', aplicarIVA ? 'Sí' : 'No', '', '', '', '', ''],
      ...(aplicarIVA ? [['Porcentaje IVA:', `${porcentajeIVA}%`, '', '', '', '', '']] : []),
      ['', '', '', '', '', '', ''],
      ['RESUMEN', '', '', '', '', '', ''],
      ['Cuota Periódica:', `$${Math.round(cuotaPeriodica).toLocaleString('es-AR')}`, '', '', '', '', ''],
      ['Monto Total a Pagar:', `$${Math.round(montoTotal).toLocaleString('es-AR')}`, '', '', '', '', ''],
      ['Costo Financiero Total:', `$${Math.round(montoTotal - monto).toLocaleString('es-AR')}`, '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['DETALLE DE CUOTAS', '', '', '', '', '', '']
    ];

    // Crear encabezado de la tabla
    const cabeceras = aplicarIVA 
      ? ['Número de Cuota', 'Fecha Vencimiento', 'Capital Inicial', 'Interés', 'IVA', 'Cuota Total', 'Capital Restante']
      : ['Número de Cuota', 'Fecha Vencimiento', 'Capital Inicial', 'Interés', 'Cuota Total', 'Capital Restante'];

    // Crear datos de las cuotas
    const excelData = cuotas.map(cuota => {
      const filaBase = [
        cuota.numero,
        new Date(cuota.fechaVencimiento).toLocaleDateString('es-AR'),
        Math.round(cuota.capitalInicial),
        Math.round(cuota.interes),
        ...(aplicarIVA ? [Math.round(cuota.iva)] : []),
        Math.round(cuota.cuota),
        Math.round(cuota.capitalRestante)
      ];
      return filaBase;
    });

    // Combinar todos los datos
    const datosCompletos = [
      ...encabezado,
      cabeceras,
      ...excelData
    ];

    // Generar CSV
    let csvContent = '\ufeff'; // BOM para UTF-8
    datosCompletos.forEach(row => {
      const processedRow = row.map(cell => {
        if (typeof cell === 'number') {
          return cell;
        }
        return `"${cell}"`;
      });
      csvContent += processedRow.join(';') + '\n';
    });

    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Nombre de archivo más descriptivo
    const fechaActual = new Date().toISOString().split('T')[0];
    const tipoTasa = tasaInteres === 0 ? 'SinInteres' : `${tasaInteres}pct`;
    const nombreArchivo = `Simulacion_${(nombreCliente || 'SinNombre').replace(/[^a-zA-Z0-9]/g, '_')}_${tipoTasa}_${fechaActual}.csv`;
    
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`✅ Exportado: ${cuotas.length} cuotas a ${nombreArchivo}`);
    
  } catch (error) {
    console.error('Error exportando:', error);
    alert('Error al exportar los datos');
  }
};

  const toggleCuotaDetails = (numero: number) => {
    if (expandedCuota === numero) {
      setExpandedCuota(null);
    } else {
      setExpandedCuota(numero);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulador de Préstamos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Moneda</label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger>
                  <SelectValue>{moneda}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dolar">Dólar</SelectItem>
                  <SelectItem value="Pesos">Pesos</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
      ? cliente.empresa
      : `${cliente.apellido ? cliente.apellido + ', ' : ''}${cliente.nombre}`}
  </SelectItem>
  ))}
</SelectContent>
            </Select>
            </div>

            {/* <div className="space-y-2">
              <label className="text-sm font-medium">Empresa</label>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger>
                  <SelectValue>{empresa}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Seleccionar empresa
                  </SelectItem>
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor.id} value={proveedor.nombre}>
                      {proveedor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            */}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto del Préstamo</label>
              <Input
                type="number"
                min="0"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                placeholder="Ingrese el monto"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Frecuencia de Pago</label>
              <Select 
                value={frecuencia} 
                onValueChange={(v) => {
                  setFrecuencia(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Plazo ({frecuencia === 'semestral' ? 'Semestres' : 'Meses'})</label>
              <Input
                type="number"
                min="1"
                value={plazo}
                onChange={(e) => setPlazo(Number(e.target.value))}
                placeholder="Ingrese el plazo"
              />
            </div>
            <div className="space-y-2">
  <label className="text-sm font-medium">Fecha de Inicio del Préstamo</label>
  <Input
    type="date"
    value={fechaInicio}
    onChange={(e) => setFechaInicio(e.target.value)}
  />
</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tasa de Interés Anual (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={tasaInteres}
                onChange={(e) => setTasaInteres(Number(e.target.value))}
                placeholder="Ingrese la tasa"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="aplicarIVA" 
                  checked={aplicarIVA} 
                  onCheckedChange={(checked: boolean) => setAplicarIVA(checked as boolean)}
                />
                <Label htmlFor="aplicarIVA">Aplicar IVA sobre el interés</Label>
              </div>
            </div>
            {aplicarIVA && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Porcentaje de IVA (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={porcentajeIVA}
                  onChange={(e) => setPorcentajeIVA(Number(e.target.value))}
                  placeholder="Ingrese el porcentaje de IVA"
                />
              </div>
            )}
          </div>
         <div className="col-span-full mt-6">
  <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2 text-orange-800">
        <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
          💼
        </div>
        Gastos Adicionales del Crédito
      </CardTitle>
      <p className="text-sm text-orange-600">
        Configure los gastos asociados que se cobrarán al cliente además del monto del préstamo
      </p>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Gastos de Otorgamiento */}
      <div className="border border-orange-200 rounded-lg p-4 bg-white/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Checkbox 
              id="aplicarGastosOtorgamiento"
              checked={aplicarGastosOtorgamiento}
              onCheckedChange={(checked) => {
                setAplicarGastosOtorgamiento(checked as boolean);
                if (!checked) {
                  setGastosOtorgamiento(0);
                }
              }}
              className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <div className="flex-1">
              <Label htmlFor="aplicarGastosOtorgamiento" className="text-sm font-semibold text-slate-800 cursor-pointer">
                Gastos de Otorgamiento de Crédito
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Gastos administrativos obligatorios del otorgamiento del crédito
              </p>
            </div>
          </div>
          {aplicarGastosOtorgamiento && (
            <div className="text-right">
              <div className="text-lg font-bold text-orange-600">
                {moneda === 'Dolar' ? 'US$' : '$'}{gastosOtorgamiento.toLocaleString('es-AR')}
              </div>
            </div>
          )}
        </div>
        
        {aplicarGastosOtorgamiento && (
          <div className="mt-4 space-y-2">
            <Label className="text-xs font-medium text-slate-600">Monto del gasto</Label>
            <Input
              type="number"
              value={gastosOtorgamiento || ''}
              onChange={(e) => setGastosOtorgamiento(parseFloat(e.target.value) || 0)}
              placeholder="Ej: 5000"
              className="border-orange-200 focus:border-orange-400"
              min="0"
            />
          </div>
        )}
      </div>

      {/* Gastos de Transferencia y Prenda */}
      <div className="border border-orange-200 rounded-lg p-4 bg-white/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Checkbox 
              id="aplicarGastosTransferencia"
              checked={aplicarGastosTransferencia}
              onCheckedChange={(checked) => {
                setAplicarGastosTransferencia(checked as boolean);
                if (!checked) {
                  setGastosTransferenciaPrenda(0);
                }
              }}
              className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <div className="flex-1">
              <Label htmlFor="aplicarGastosTransferencia" className="text-sm font-semibold text-slate-800 cursor-pointer">
                Gastos de Transferencia y Prenda
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Gastos de transferencia vehicular y constitución de prenda (opcional)
              </p>
            </div>
          </div>
          {aplicarGastosTransferencia && (
            <div className="text-right">
              <div className="text-lg font-bold text-orange-600">
                {moneda === 'Dolar' ? 'US$' : '$'}{gastosTransferenciaPrenda.toLocaleString('es-AR')}
              </div>
            </div>
          )}
        </div>
        
        {aplicarGastosTransferencia && (
          <div className="mt-4 space-y-2">
            <Label className="text-xs font-medium text-slate-600">Monto del gasto</Label>
            <Input
              type="number"
              value={gastosTransferenciaPrenda || ''}
              onChange={(e) => setGastosTransferenciaPrenda(parseFloat(e.target.value) || 0)}
              placeholder="Ej: 3000"
              className="border-orange-200 focus:border-orange-400"
              min="0"
            />
          </div>
        )}
      </div>

      {/* Resumen de gastos */}
      {(aplicarGastosOtorgamiento || aplicarGastosTransferencia) && (
        <div className="border-t border-orange-200 pt-4">
          <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                📊 Resumen de Gastos Adicionales
              </h4>
            </div>
            
            <div className="space-y-2 text-sm">
              {aplicarGastosOtorgamiento && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Gastos de Otorgamiento:</span>
                  <span className="font-semibold text-orange-700">
                    {moneda === 'Dolar' ? 'US$' : '$'}{gastosOtorgamiento.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
              
              {aplicarGastosTransferencia && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Gastos Transferencia y Prenda:</span>
                  <span className="font-semibold text-orange-700">
                    {moneda === 'Dolar' ? 'US$' : '$'}{gastosTransferenciaPrenda.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
              
              <div className="border-t border-orange-300 pt-2 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-orange-800">Total Gastos Adicionales:</span>
                  <span className="font-bold text-lg text-orange-800 bg-orange-200 px-3 py-1 rounded-full">
                    {moneda === 'Dolar' ? 'US$' : '$'}
                    {((aplicarGastosOtorgamiento ? gastosOtorgamiento : 0) + 
                      (aplicarGastosTransferencia ? gastosTransferenciaPrenda : 0)).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700 text-center">
                  💡 Estos gastos se cobrarán al cliente por separado y aparecerán como ítems adicionales en el detalle del préstamo
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
</div>
          
          {/* Botones responsivos */}
          <div className="flex flex-wrap gap-2 justify-between items-center mb-6 mt-10">
            <Button onClick={calcularCuotas}>
              <Calculator className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Calcular</span>
              <span className="sm:hidden">Calc</span>
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Calculator className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Generar Préstamo</span>
              <span className="sm:hidden">Generar</span>
            </Button>
            <GenerarPrestamo
              open={open}
              onOpenChange={setOpen}
              onConfirm={() => {
                setOpen(false);
                // Opcional: limpiar el formulario después de generar el préstamo
                setMonto(0);
                setPlazo(frecuencia === 'semestral' ? 2 : 12);
                setTasaInteres(65);
                setCuotas([]);
              }}
              prestamoData={{
                  monto,
                  plazo,
                  tasaInteres,
                  empresa,
                  frecuencia,
                  iva: aplicarIVA ? porcentajeIVA : 0,
                  moneda,           // Agregar
                  fechaInicio,      // Agregar
                  aplicarIVA,       // Agregar
                  // Agregar gastos opcionales
                  aplicarGastosOtorgamiento,
                  gastosOtorgamiento: aplicarGastosOtorgamiento ? gastosOtorgamiento : 0,
                  aplicarGastosTransferencia,
                  gastosTransferenciaPrenda: aplicarGastosTransferencia ? gastosTransferenciaPrenda : 0,
                  cuotas: cuotas.map(c => ({
                    numero: c.numero,
                    fechaVencimiento: c.fechaVencimiento,
                    cuota: c.cuota
                  }))
                }}
              />
            
            {cuotas.length > 0 && (
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Exp</span>
              </Button>
            )}
          </div>
          
          {cuotas.length > 0 && (
            <div className="space-y-4">
              {/* Cards responsivas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      ${Math.round(cuotaPeriodica).toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm text-slate-500">
                      Cuota {frecuencia === 'semestral' ? 'Semestral' : 'Mensual'}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      ${Math.round(montoTotal).toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm text-slate-500">Monto Total a Pagar</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-600">
                      ${Math.round(montoTotal - monto).toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm text-slate-500">
                      Costo Financiero Total
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Vista de tabla para escritorio */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuota</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Interés</TableHead>
                      {aplicarIVA && (
                        <TableHead className="text-right">IVA</TableHead>
                      )}
                      <TableHead className="text-right">Cuota Total</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotas.map((cuota) => (
                      <TableRow key={cuota.numero}>
                        <TableCell>
                          <Badge variant="outline">
                            {cuota.numero}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(cuota.fechaVencimiento).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(cuota.capitalInicial - cuota.capitalRestante).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(cuota.interes).toLocaleString('es-AR')}
                        </TableCell>
                        {aplicarIVA && (
                          <TableCell className="text-right">
                            ${Math.round(cuota.iva).toLocaleString('es-AR')}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          ${Math.round(cuota.cuota).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(cuota.capitalRestante).toLocaleString('es-AR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Vista acordeón para móviles */}
              <div className="md:hidden space-y-2">
                {cuotas.map((cuota) => (
                  <Card key={cuota.numero} className="overflow-hidden">
                    <div 
                      className="flex justify-between items-center p-4 cursor-pointer"
                      onClick={() => toggleCuotaDetails(cuota.numero)}
                    >
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">
                          {cuota.numero}
                        </Badge>
                        <span>{new Date(cuota.fechaVencimiento).toLocaleDateString('es-AR')}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">
                          ${Math.round(cuota.cuota).toLocaleString('es-AR')}
                        </span>
                        {expandedCuota === cuota.numero ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </div>
                    
                    {expandedCuota === cuota.numero && (
                      <div className="px-4 pb-4 pt-0 border-t">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Capital:</div>
                          <div className="text-right">
                            ${Math.round(cuota.capitalInicial - cuota.capitalRestante).toLocaleString('es-AR')}
                          </div>
                          
                          <div className="text-slate-500">Interés:</div>
                          <div className="text-right">
                            ${Math.round(cuota.interes).toLocaleString('es-AR')}
                          </div>
                          
                          {aplicarIVA && (
                            <>
                              <div className="text-slate-500">IVA:</div>
                              <div className="text-right">
                                ${Math.round(cuota.iva).toLocaleString('es-AR')}
                              </div>
                            </>
                          )}
                          
                          <div className="text-slate-500">Saldo:</div>
                          <div className="text-right">
                            ${Math.round(cuota.capitalRestante).toLocaleString('es-AR')}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanSimulator;