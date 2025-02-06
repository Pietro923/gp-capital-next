"use client"
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Caja = () => {
  const [cajaMovements] = useState([
    { 
      id: 1, 
      date: '2025-01-08',
      type: 'Ingreso',
      concept: 'Venta de vehículo',
      amount: 25000,
      balance: 25000
    }
  ]);

  const [currentBalance] = useState(25000);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Saldo Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${currentBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Ingresos del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">+$3,500</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Egresos del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">-$1,200</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Movimiento</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="egreso">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input placeholder="Descripción del movimiento" />
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Registrar Movimiento</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cajaMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{movement.date}</TableCell>
                  <TableCell>
                    <span className={movement.type === 'Ingreso' ? 'text-green-600' : 'text-red-600'}>
                      {movement.type}
                    </span>
                  </TableCell>
                  <TableCell>{movement.concept}</TableCell>
                  <TableCell>${movement.amount.toLocaleString()}</TableCell>
                  <TableCell>${movement.balance.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">Ver detalle</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Caja