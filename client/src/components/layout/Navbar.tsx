import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { Bars3Icon, BellIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { ROLE_LABELS } from '@/utils/constants';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Menu button for mobile */}
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden -ml-2 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              onClick={onMenuClick}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Page title - could be dynamic based on route */}
            <div className="hidden sm:block ml-2">
              <h1 className="text-lg font-semibold text-gray-900">
                Sistema de Vales
              </h1>
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              type="button"
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <span className="sr-only">Ver notificaciones</span>
              <BellIcon className="h-6 w-6" />
            </button>

            {/* User dropdown */}
            <div className="relative">
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.nombre}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.rol && ROLE_LABELS[user.rol]}
                  </div>
                </div>
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Cerrar sesion"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;