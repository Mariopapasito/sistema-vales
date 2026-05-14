import { Link } from 'react-router-dom';
import { HomeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="flex justify-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-400" />
        </div>
        <h1 className="mt-4 text-4xl font-bold text-gray-900">404</h1>
        <h2 className="mt-2 text-xl font-medium text-gray-700">Pagina no encontrada</h2>
        <p className="mt-2 text-gray-500">
          La pagina que buscas no existe o ha sido movida.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn btn-primary">
            <HomeIcon className="h-5 w-5 mr-2" />
            Ir al Dashboard
          </Link>
          <Link to="/orders" className="btn btn-secondary">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Ver Ordenes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;