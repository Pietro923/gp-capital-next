"use client";

import { useState } from "react";

interface NuevoClienteProps {
  onClientAdded: () => void;
}

export default function NuevoCliente({ onClientAdded }: NuevoClienteProps) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Aquí iría la lógica para agregar un cliente (ejemplo: enviar a una API)
    console.log("Cliente agregado:", { nombre, email, telefono, direccion });
    
    // Limpiar los campos después de enviar el formulario
    setNombre("");
    setEmail("");
    setTelefono("");
    setDireccion("");
    
    // Llamar a la función de callback
    onClientAdded();
  };

  return (
    <div className="max-w-md mx-auto p-4 border rounded-md shadow">
      <h2 className="text-xl font-bold mb-4">Nuevo Cliente</h2>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border rounded" required />
        </div>

        <div>
          <label className="block text-sm font-medium">Correo Electrónico</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
        </div>

        <div>
          <label className="block text-sm font-medium">Teléfono</label>
          <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full p-2 border rounded" required />
        </div>

        <div>
          <label className="block text-sm font-medium">Dirección (Opcional)</label>
          <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-2 border rounded" />
        </div>

        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Agregar Cliente</button>
      </form>
    </div>
  );
}