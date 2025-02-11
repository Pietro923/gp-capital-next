"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { User } from '@supabase/supabase-js';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error logging out:', error);
      }
      router.push("/"); // Redirect to login page
    } catch (error) {
      console.error('Unexpected error during logout:', error);
    }
  };

  return (
    <div className="flex">
      <main className="w-full min-h-screen p-8 bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Ingresos Mensuales</h2>
            <p className="text-2xl font-bold text-blue-600">$25,000</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Gastos Mensuales</h2>
            <p className="text-2xl font-bold text-red-600">$15,000</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Beneficio Neto</h2>
            <p className="text-2xl font-bold text-green-600">$10,000</p>
          </div>
        </div>
        <button
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Generar Reporte
        </button>
      </main>
    </div>
  );
}