import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { UserRole } from '@/types';
import {
  HomeIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  UsersIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { ROLE_LABELS } from '@/utils/constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Ordenes', href: '/orders', icon: DocumentTextIcon },
  {
    name: 'Calendario',
    href: '/calendar',
    icon: CalendarDaysIcon,
    roles: [UserRole.SISTEMAS, UserRole.JEFE]
  },
  {
    name: 'Usuarios',
    href: '/users',
    icon: UsersIcon,
    roles: [UserRole.JEFE]
  },
  {
    name: 'Logs',
    href: '/activity-logs',
    icon: ClipboardDocumentListIcon,
    roles: [UserRole.JEFE, UserRole.SISTEMAS]
  }
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.rol as UserRole);
  });

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo and close button */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-lg font-bold text-gray-900">Vales</span>
          </div>
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* User info (mobile) */}
        <div className="lg:hidden px-4 py-4 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-900">{user?.nombre}</div>
          <div className="text-xs text-gray-500">{user?.rol && ROLE_LABELS[user.rol]}</div>
          <div className="text-xs text-gray-500">{user?.estacion}</div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));

            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={`
                  flex items-center px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-200
                  ${isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`}
                />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;