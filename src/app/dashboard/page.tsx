"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { User } from '@supabase/supabase-js';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [ingresos, setIngresos] = useState<number>(0);
  const [gastos, setGastos] = useState<number>(0);
  const [beneficioNeto, setBeneficioNeto] = useState<number>(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchIngresos();
      fetchGastos();
    }
  }, [user]);

  const fetchIngresos = async () => {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('monto')
      .eq('tipo', 'INGRESO');

    if (error) {
      console.error('Error fetching ingresos:', error);
      return;
    }

    const totalIngresos = data.reduce((acc, curr) => acc + curr.monto, 0);
    setIngresos(totalIngresos);
    setBeneficioNeto(totalIngresos - gastos);
  };

  const fetchGastos = async () => {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('monto')
      .eq('tipo', 'EGRESO');

    if (error) {
      console.error('Error fetching gastos:', error);
      return;
    }

    const totalGastos = data.reduce((acc, curr) => acc + curr.monto, 0);
    setGastos(totalGastos);
    setBeneficioNeto(ingresos - totalGastos);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex">
      <main className="w-full p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Ingresos Mensuales</h2>
            <p className="text-2xl font-bold text-blue-600">${ingresos.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Gastos Mensuales</h2>
            <p className="text-2xl font-bold text-red-600">${gastos.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Beneficio Neto</h2>
            <p className="text-2xl font-bold text-green-600">${beneficioNeto.toLocaleString()}</p>
          </div>
        </div>
      </main>
    </div>
  );
}