"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string | null } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/"); // Redirigir al login si no está autenticado
      } else {
        setUser({ email: data.user.email ?? null });
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white p-6 rounded shadow-md">
        <h1 className="text-3xl mb-4">Panel de Administración</h1>
        <p>¡Bienvenido, {user?.email || "Usuario"}!</p>
        <button
          onClick={handleLogout}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
