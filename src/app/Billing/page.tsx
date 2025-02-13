"use client"
import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/utils/supabase/client';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  direccion: string;
  dni: string;
}

interface TipoIva {
  id: string;
  nombre: string;
}

interface FormaPago {
  id: string;
  nombre: string;
}

interface FacturaFormData {
  tipoFactura: string;
  clienteId: string;
  tipoIvaId: string;
  formaPagoId: string;
}

const Billing: React.FC = () => {
  // Estados para los items de la factura
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItem, setNewItem] = useState<InvoiceItem>({
    description: '',
    quantity: 0,
    unitPrice: 0,
    total: 0
  });

  // Estados para los datos de la factura
  const [formData, setFormData] = useState<FacturaFormData>({
    tipoFactura: '',
    clienteId: '',
    tipoIvaId: '',
    formaPagoId: '',
  });

  // Estados para los datos externos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposIva, setTiposIva] = useState<TipoIva[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos necesarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar clientes
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('*');
        if (clientesData) setClientes(clientesData);

        // Cargar tipos de IVA
        const { data: tiposIvaData } = await supabase
          .from('tipos_iva')
          .select('*');
        if (tiposIvaData) setTiposIva(tiposIvaData);

        // Cargar formas de pago
        const { data: formasPagoData } = await supabase
          .from('formas_pago')
          .select('*');
        if (formasPagoData) setFormasPago(formasPagoData);

      } catch (error) {
        console.error('Error cargando datos:', error);
        setError('Error al cargar los datos necesarios');
      }
    };

    fetchData();
  }, []);

  // Manejar items de la factura
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

  // Manejar cambios en los datos de la factura
  const handleFacturaDataChange = (field: keyof FacturaFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generar factura
  // Generar factura
  const handleGenerarFactura = async () => {
    if (!formData.tipoFactura || !formData.clienteId || !formData.tipoIvaId || !formData.formaPagoId || items.length === 0) {
      setError('Por favor complete todos los campos necesarios');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Insertar la factura principal
      const { data: nuevaFactura, error: facturaError } = await supabase
        .from('facturacion')
        .insert([
          {
            tipo_factura: formData.tipoFactura,
            cliente_id: formData.clienteId,
            tipo_iva_id: formData.tipoIvaId,
            forma_pago_id: formData.formaPagoId,
            total_neto: total / 1.21, // Asumiendo IVA 21%
            iva: (total / 1.21) * 0.21,
            total_factura: total
          }
        ])
        .select()
        .single();

      if (facturaError) throw facturaError;
      if (!nuevaFactura) throw new Error('No se pudo crear la factura');

      // Insertar los detalles de la factura
      const detallesPromises = items.map(item => 
        supabase
          .from('detalles_factura')
          .insert([
            {
              factura_id: nuevaFactura.id,
              descripcion: item.description,
              cantidad: item.quantity,
              precio_unitario: item.unitPrice,
              subtotal: item.total
            }
          ])
      );

      await Promise.all(detallesPromises);

      // Limpiar el formulario
      setItems([]);
      setFormData({
        tipoFactura: '',
        clienteId: '',
        tipoIvaId: '',
        formaPagoId: '',
      });

      alert('Factura generada exitosamente');

    } catch (error) {
      console.error('Error generando factura:', error);
      setError('Error al generar la factura');
    } finally {
      setIsLoading(false);
    }
  };
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
                <Select onValueChange={(value) => handleFacturaDataChange('tipoFactura', value)}>
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
                <Select onValueChange={(value) => handleFacturaDataChange('clienteId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre} {cliente.apellido} - {cliente.dni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Datos adicionales */}
            <div className="space-y-4">
              <div>
                <Label>Condición IVA</Label>
                <Select onValueChange={(value) => handleFacturaDataChange('tipoIvaId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar condición" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposIva.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pago</Label>
                <Select onValueChange={(value) => handleFacturaDataChange('formaPagoId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar forma de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPago.map((forma) => (
                      <SelectItem key={forma.id} value={forma.id}>
                        {forma.nombre}
                      </SelectItem>
                    ))}
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
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                Total: ${total.toFixed(2)}
              </div>
              <Button 
                onClick={handleGenerarFactura}
                disabled={isLoading}
              >
                <Receipt className="mr-2 h-4 w-4" />
                {isLoading ? 'Generando...' : 'Generar Factura'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;