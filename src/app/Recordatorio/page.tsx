"use client"; // Asegúrate de que este componente sea del lado del cliente
import { useToast } from "@/hooks/use-toast"; // Importa el hook de toast de shadcn/ui
import { Bell, Send } from "lucide-react"; // Importa íconos de Lucide para un diseño más moderno

export default function Recordatorio() {
  const { toast } = useToast(); // Inicializa el hook de toast

  const handleClick = () => {
    // Muestra el toast cuando se hace clic en el botón
    toast({
      title: "Función no implementada aún",
      description: "Esta funcionalidad está en desarrollo.",
      variant: "destructive", // Usamos "destructive" para resaltar que es un mensaje de advertencia
    });
  };

  return (
    <div className="flex justify-center items-center mt-32">
      <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border border-gray-200 rounded-xl shadow-lg w-full sm:w-96">
        {/* Encabezado con ícono */}
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Bell className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Título y descripción */}
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
          Enviar Recordatorio
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Envía un recordatorio amable a tus clientes sobre pagos pendientes.
        </p>

        {/* Botón moderno con ícono */}
        <button
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
          onClick={handleClick}
        >
          <Send className="w-5 h-5" />
          <span>Enviar Recordatorio</span>
        </button>
      </div>
    </div>
  );
}
