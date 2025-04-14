"use client"
import { useEffect, useState } from 'react';
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
import { supabase } from '@/utils/supabase/client';

interface Provider {
  status: string;
  id: number;
  marca: string;
  contacto: string | number | readonly string[] | undefined;
  nombre: string;
  correo: string;
  telefono: string;
  direc: string;
}

interface Purchase {
  id: string;
  date: string;
  provider: string;
  product: string;
  amount: number;
  status: string;
}

export default function Purchases() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formaPagoId, setFormaPagoId] = useState<string>('');

  // Estado para el formulario
  const [formData, setFormData] = useState({
    providerId: '',
    amount: '',
    date: '',
    product: '',
    quantity: '1', // Agregado campo cantidad
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar forma de pago por defecto
  useEffect(() => {
    const fetchFormaPago = async () => {
      try {
        const { data, error } = await supabase
          .from('formas_pago')
          .select('id')
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setFormaPagoId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching forma_pago:', error);
      }
    };

    fetchFormaPago();
  }, []);

  // Cargar proveedores
  useEffect(() => {
    const fetchProveedores = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('proveedores')
          .select('*');

        if (error) throw error;
        setProviders(data || []);
      } catch (error) {
        console.error('Error fetching proveedores:', error);
        setError('Error al cargar los proveedores');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProveedores();
  }, []);

  // Cargar compras con sus detalles
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const { data, error } = await supabase
          .from('compras')
          .select(`
            *,
            proveedores (nombre),
            detalles_compra (
              descripcion,
              cantidad,
              precio_unitario
            )
          `)
          .order('fecha_compra', { ascending: false });
        if (error) throw error;
        const formattedPurchases = data.map(purchase => ({
          id: purchase.id,
          date: purchase.fecha_compra,
          provider: purchase.proveedores?.nombre || 'Desconocido',
          product: purchase.detalles_compra[0]?.descripcion || 'Sin detalle',
          amount: purchase.total_factura,
          status: 'Completado'
        }));
        setPurchases(formattedPurchases);
      } catch (error) {
        console.error('Error fetching purchases:', error);
        setError('Error al cargar las compras');
      }
    };

    fetchPurchases();
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Registrar nueva compra
  const handleSubmit = async () => {
    if (!formData.providerId || !formData.amount || !formData.date || !formData.product) {
      setError('Por favor complete todos los campos');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const provider = providers.find(p => p.id.toString() === formData.providerId);
      
      // Insertar la compra principal
const { data: compraData, error: compraError } = await supabase
.from('compras')
.insert([
  {
    proveedor_id: formData.providerId, // Use the provider ID instead of name
    total_factura: parseFloat(formData.amount),
    fecha_compra: formData.date,
    tipo_factura: 'A',
    total_neto: parseFloat(formData.amount) / 1.21,
    iva: (parseFloat(formData.amount) / 1.21) * 0.21,
    forma_pago_id: formaPagoId,
    numero_factura: `F-${Date.now()}`
  }
])
.select();

      if (compraError) throw compraError;

      // Insertar en detalles_compra
      const { error: detalleError } = await supabase
        .from('detalles_compra')
        .insert([
          {
            compra_id: compraData[0].id,
            descripcion: formData.product,
            cantidad: parseInt(formData.quantity),
            precio_unitario: parseFloat(formData.amount) / parseInt(formData.quantity),
            subtotal: parseFloat(formData.amount)
          }
        ]);

      if (detalleError) throw detalleError;

      // Actualizar la lista de compras
setPurchases(prev => [{
  id: compraData[0].id,
  date: compraData[0].fecha_compra,
  provider: provider?.nombre || 'Desconocido', // Usar el nombre del proveedor del objeto provider
  product: formData.product,
  amount: compraData[0].total_factura,
  status: 'Completado'
}, ...prev]);

      // Limpiar el formulario
      setFormData({
        providerId: '',
        amount: '',
        date: '',
        product: '',
        quantity: '1'
      });

    } catch (error) {
      console.error('Error registering purchase:', error);
      setError('Error al registrar la compra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select 
                onValueChange={(value) => handleChange('providerId', value)}
                value={formData.providerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id.toString()}>
                      {provider.nombre} - {provider.marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Producto</Label>
              <Input 
                type="text" 
                placeholder="Descripción del producto"
                value={formData.product}
                onChange={(e) => handleChange('product', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input 
                type="number" 
                min="1"
                placeholder="1"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto Total</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <div className="relative">
                <Input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2">
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Button 
                className="w-full" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Compra'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="hidden md:table-cell">Producto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="hidden sm:table-cell">{purchase.date}</TableCell>
                    <TableCell className="font-medium">{purchase.provider}</TableCell>
                    <TableCell className="hidden md:table-cell">{purchase.product}</TableCell>
                    <TableCell>${purchase.amount.toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell">{purchase.status}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">Ver detalle</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}