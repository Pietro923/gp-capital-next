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
import { Calendar } from "lucide-react";

export default function Purchases() {
  const [purchases] = useState([
    { 
      id: 1, 
      date: '2025-01-08', 
      provider: 'Pueble', 
      product: 'Case', 
      amount: 15000,
      status: 'Pendiente'
    }
  ]);

  const providers = [
    { id: 1, name: 'Pueble', product: 'Case' },
    { id: 2, name: 'Semage', product: 'Repuestos' },
    { id: 3, name: 'Magi', product: 'Ducati' },
    { id: 4, name: 'ub.ti', product: 'Audi' },
    { id: 5, name: 'Cpm', product: 'Kia' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => (
                    <SelectItem key={provider.id} value={provider.name}>
                      {provider.name} - {provider.product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <div className="relative">
                <Input type="date" />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div className="flex items-end">
              <Button className="w-full">Registrar Compra</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>{purchase.date}</TableCell>
                  <TableCell>{purchase.provider}</TableCell>
                  <TableCell>{purchase.product}</TableCell>
                  <TableCell>${purchase.amount.toLocaleString()}</TableCell>
                  <TableCell>{purchase.status}</TableCell>
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
