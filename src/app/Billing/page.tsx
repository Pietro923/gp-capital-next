"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Receipt, Trash2 } from "lucide-react";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const Billing: React.FC = () => {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItem, setNewItem] = useState<InvoiceItem>({
    description: '',
    quantity: 0,
    unitPrice: 0,
    total: 0
  });

  const handleAddItem = () => {
    if (newItem.description && newItem.quantity && newItem.unitPrice) {
      setItems([...items, {
        ...newItem,
        total: newItem.quantity * newItem.unitPrice
      }]);
      setNewItem({
        description: '',
        quantity: 0,
        unitPrice: 0,
        total: 0
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturación AFIP
          </CardTitle>
          <CardDescription>
            Generación de facturas electrónicas tipo A/B
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Datos básicos de la factura */}
            <div className="space-y-4">
              <div>
                <Label>Tipo de Factura</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Factura A</SelectItem>
                    <SelectItem value="B">Factura B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Cliente</Label>
                <Input placeholder="Nombre o Razón Social" />
              </div>

              <div>
                <Label>CUIT</Label>
                <Input placeholder="XX-XXXXXXXX-X" />
              </div>
            </div>

            {/* Datos adicionales */}
            <div className="space-y-4">
              <div>
                <Label>Condición IVA</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar condición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ri">Responsable Inscripto</SelectItem>
                    <SelectItem value="mt">Monotributista</SelectItem>
                    <SelectItem value="cf">Consumidor Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dirección</Label>
                <Input placeholder="Dirección completa" />
              </div>

              <div>
                <Label>Forma de Pago</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar forma de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="credito">Tarjeta de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Items de la factura */}
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <Input 
                  placeholder="Descripción"
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Input 
                  type="number"
                  placeholder="Cantidad"
                  value={newItem.quantity || ''}
                  onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                />
              </div>
              <div className="col-span-2">
                <Input 
                  type="number"
                  placeholder="Precio"
                  value={newItem.unitPrice || ''}
                  onChange={(e) => setNewItem({...newItem, unitPrice: Number(e.target.value)})}
                />
              </div>
              <div className="col-span-3">
                <Button 
                  className="w-full"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>${item.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                Total: ${total.toFixed(2)}
              </div>
              <Button>
                <Receipt className="mr-2 h-4 w-4" />
                Generar Factura
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;