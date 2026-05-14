import React from 'react';

interface HistorialItem {
  quien: string;
  rol?: string;
  accion: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  timestamp: string;
  hora?: string;
}

interface Props {
  historial: HistorialItem[] | undefined;
  onClose: () => void;
}

export const OrderHistory: React.FC<Props> = ({ historial, onClose }) => {
  if (!historial || historial.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
          <h2 className="text-xl font-bold mb-4">Historial de Cambios</h2>
          <p className="text-gray-600">No hay cambios registrados</p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white">Historial de Cambios</h2>
        <div className="space-y-4">
          {historial.map((item, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">{item.quien}</p>
                  {item.rol && <p className="text-xs text-gray-500">Rol: {item.rol}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{item.hora || new Date(item.timestamp).toLocaleTimeString('es-MX')}</p>
                  <p className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleDateString('es-MX')}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-2">{item.accion}</p>
              {item.estadoAnterior && item.estadoNuevo && (
                <p className="text-xs text-gray-600 mt-1">
                  {item.estadoAnterior} → {item.estadoNuevo}
                </p>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
