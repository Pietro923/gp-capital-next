"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MovimientoCaja {
  id: string;
  tipo: "INGRESO" | "EGRESO";
  concepto: string;
  monto: number;
  fecha_movimiento: string;
  created_at: string;
}

interface NewMovementForm {
  tipo: "INGRESO" | "EGRESO";
  concepto: string;
  monto: number;
}

const initialFormState: NewMovementForm = {
  tipo: "INGRESO",
  concepto: "",
  monto: 0,
};

const CashRegister: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<NewMovementForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);

  // Obtener movimientos de caja
  const fetchMovimientos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("movimientos_caja")
        .select("*")
        .order("fecha_movimiento", { ascending: false });

      if (error) throw error;
      setMovimientos(data || []);
    } catch (error) {
      console.error("Error fetching movimientos:", error);
      setError("Error al cargar los movimientos de caja");
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener el saldo actual
  const fetchCurrentBalance = async () => {
    try {
      const { data, error } = await supabase
        .from("saldo_caja")
        .select("saldo_actual")
        .single();

      if (error) throw error;
      setCurrentBalance(data.saldo_actual);
    } catch (error) {
      console.error("Error fetching current balance:", error);
    }
  };

  // Manejar cambios en los inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar cambios en el select
  const handleSelectChange = (value: "INGRESO" | "EGRESO") => {
    setFormData((prev) => ({
      ...prev,
      tipo: value,
    }));
  };

  // Agregar un nuevo movimiento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const { data, error } = await supabase
        .from("movimientos_caja")
        .insert([
          {
            ...formData,
            fecha_movimiento: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      setMovimientos((prev) => [data[0], ...prev]);
      setFormData(initialFormState);
      setIsDialogOpen(false);
      fetchCurrentBalance(); // Actualizar el saldo
    } catch (error) {
      console.error("Error al agregar movimiento:", error);
      setFormError("Error al agregar el movimiento. Por favor, intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchMovimientos();
    fetchCurrentBalance();
  }, []);

  // Filtrar movimientos
  const filteredMovimientos = movimientos.filter((movimiento) =>
    movimiento.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando movimientos...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
          <CardTitle>Movimientos de Caja</CardTitle>
          <div className="flex space-x-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Nuevo Movimiento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Nuevo Movimiento</DialogTitle>
                  <DialogDescription>
                    Registre un nuevo ingreso o egreso
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="tipo-movimiento">Tipo de Movimiento</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => 
                        handleSelectChange(value as "INGRESO" | "EGRESO")
                      }
                    >
                      <SelectTrigger id="tipo-movimiento" className="w-full">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INGRESO">Ingreso</SelectItem>
                        <SelectItem value="EGRESO">Egreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="concepto">Concepto</Label>
                    <Input
                      id="concepto"
                      name="concepto"
                      required
                      value={formData.concepto}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monto">Monto</Label>
                    <Input
                      id="monto"
                      name="monto"
                      type="number"
                      required
                      value={formData.monto}
                      onChange={handleInputChange}
                    />
                  </div>
                  {formError && (
                    <Alert variant="destructive">
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                  <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Guardar Movimiento
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por concepto..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimientos.map((movimiento) => (
                    <TableRow key={movimiento.id} className="hover:bg-slate-50">
                      <TableCell className="hidden sm:table-cell">
                        {new Date(movimiento.fecha_movimiento).toLocaleDateString()}
                      </TableCell>
                      <TableCell
                        className={
                          movimiento.tipo === "INGRESO"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {movimiento.tipo}
                      </TableCell>
                      <TableCell className="max-w-[150px] sm:max-w-none truncate">
                        {movimiento.concepto}
                      </TableCell>
                      <TableCell>${movimiento.monto.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Saldo Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">${currentBalance.toLocaleString()}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashRegister;