"use client"; // Indica que este es un componente del lado del cliente
import React, { useState } from 'react';
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
import { Calculator, Download } from "lucide-react";
import { GenerarPrestamo } from "@/components/GenerarPrestamo";

interface CuotaSimulada {
  numero: number;
  fechaVencimiento: string;
  capitalInicial: number;
  interes: number;
  cuota: number;
  capitalRestante: number;
}

interface ExcelRow {
  [key: string]: string | number;
}

const LoanSimulator: React.FC = () => {
  const [monto, setMonto] = useState<number>(0);
  const [plazo, setPlazo] = useState<number>(12);
  const [tasaInteres, setTasaInteres] = useState<number>(65);
  const [empresa, setEmpresa] = useState<string>('Pueble');
  const [cuotas, setCuotas] = useState<CuotaSimulada[]>([]);
  const [cuotaMensual, setCuotaMensual] = useState<number>(0);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [open, setOpen] = useState(false);

  const calcularCuotas = () => {
    const tasaMensual = tasaInteres / 12 / 100;
    const cuotaFija = 
      (monto * tasaMensual * Math.pow(1 + tasaMensual, plazo)) / 
      (Math.pow(1 + tasaMensual, plazo) - 1);
    
    setCuotaMensual(cuotaFija);
    
    const nuevasCuotas: CuotaSimulada[] = [];
    let capitalPendiente = monto;
    let fecha = new Date();
    
    for (let i = 1; i <= plazo; i++) {
      fecha = new Date(fecha.setMonth(fecha.getMonth() + 1));
      const interesCuota = capitalPendiente * tasaMensual;
      const capitalCuota = cuotaFija - interesCuota;
      capitalPendiente -= capitalCuota;

      nuevasCuotas.push({
        numero: i,
        fechaVencimiento: fecha.toISOString().split('T')[0],
        capitalInicial: capitalPendiente + capitalCuota,
        interes: interesCuota,
        cuota: cuotaFija,
        capitalRestante: capitalPendiente
      });
    }

    setCuotas(nuevasCuotas);
    setMontoTotal(cuotaFija * plazo);
  };

  const exportToExcel = () => {
    const excelData: ExcelRow[] = cuotas.map(cuota => ({
      'Número de Cuota': cuota.numero,
      'Fecha Vencimiento': new Date(cuota.fechaVencimiento).toLocaleDateString('es-AR'),
      'Capital Inicial': Math.round(cuota.capitalInicial),
      'Interés': Math.round(cuota.interes),
      'Cuota': Math.round(cuota.cuota),
      'Capital Restante': Math.round(cuota.capitalRestante)
    }));

    let csvContent = '\ufeff';
    const headers = Object.keys(excelData[0]);
    csvContent += headers.join(';') + '\n';

    excelData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvContent += values.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `simulacion_prestamo_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <label className="text-sm font-medium">Empresa</label>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pueble">Pueble (Case)</SelectItem>
                  <SelectItem value="Semage">Semage (Repuestos)</SelectItem>
                  <SelectItem value="Magi">Magi (Ducati)</SelectItem>
                  <SelectItem value="ub.ti">ub.ti (Audi)</SelectItem>
                  <SelectItem value="Cpm">Cpm (Kia)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
              <label className="text-sm font-medium">Plazo (meses)</label>
              <Select value={plazo.toString()} onValueChange={(v) => setPlazo(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plazo" />
                </SelectTrigger>
                <SelectContent>
                  {[12, 24, 36, 48, 60].map((p) => (
                    <SelectItem key={p} value={p.toString()}>{p} meses</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div className="flex justify-between items-center mb-6">
            <Button onClick={calcularCuotas}>
              <Calculator className="mr-2 h-4 w-4" />
              Calcular
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Calculator className="mr-2 h-4 w-4" />
              Generar Prestamo
            </Button>
            <GenerarPrestamo
  open={open}
  onOpenChange={setOpen}
  onConfirm={() => {
    setOpen(false);
    // Opcional: limpiar el formulario después de generar el préstamo
    setMonto(0);
    setPlazo(12);
    setTasaInteres(65);
    setCuotas([]);
  }}
  prestamoData={{
    monto,
    plazo,
    tasaInteres,
    empresa,
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
                Exportar
              </Button>
            )}
          </div>

          {cuotas.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      ${Math.round(cuotaMensual).toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm text-slate-500">Cuota Mensual</div>
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
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuota</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Interés</TableHead>
                      <TableHead className="text-right">Cuota</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotas.map((cuota) => (
                      <TableRow key={cuota.numero}>
                        <TableCell>{cuota.numero}</TableCell>
                        <TableCell>
                          {new Date(cuota.fechaVencimiento).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(cuota.capitalInicial).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(cuota.interes).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanSimulator;