import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface RoleRouteProps extends React.PropsWithChildren {
  roles: string[];
}

export default function RoleRoute({ roles, children }: RoleRouteProps) {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user || !roles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
