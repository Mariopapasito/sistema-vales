export type ForwardArea = 'sistemas' | 'compras';

export interface PolicyResult {
  allowed: boolean;
  status?: 400 | 403;
  message?: string;
}

const FORWARD_AREAS: ForwardArea[] = ['sistemas', 'compras'];

export const canUseBitacoras = (role?: string): boolean =>
  role === 'jefe' || role === 'estacion';

export const canEditBitacora = (role: string | undefined, userId: number | undefined, ownerId: number): boolean => {
  if (!canUseBitacoras(role)) return false;
  return role === 'jefe' || userId === ownerId;
};

export const validateOrderForward = (
  role: string | undefined,
  currentArea: string,
  destination?: string,
): PolicyResult => {
  if (!FORWARD_AREAS.includes(role as ForwardArea)) {
    return { allowed: false, status: 403, message: 'Solo Sistemas y Compras pueden reenviar vales' };
  }

  if (!destination || !FORWARD_AREAS.includes(destination as ForwardArea)) {
    return { allowed: false, status: 400, message: 'El destino debe ser sistemas o compras' };
  }

  if (currentArea !== role) {
    return { allowed: false, status: 403, message: 'Solo el área responsable actual puede reenviar este vale' };
  }

  if (destination === currentArea) {
    return { allowed: false, status: 400, message: 'El vale ya pertenece al área seleccionada' };
  }

  return { allowed: true };
};
