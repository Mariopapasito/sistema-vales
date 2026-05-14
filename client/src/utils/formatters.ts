import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Format date for display
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Fecha invalida';
  return format(dateObj, 'dd/MM/yyyy', { locale: es });
};

/**
 * Format date and time for display
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Fecha invalida';
  return format(dateObj, "dd/MM/yyyy HH:mm", { locale: es });
};

/**
 * Format date for API input
 */
export const formatDateForInput = (date: Date): string => {
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Format relative time (e.g., "hace 5 minutos")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Fecha invalida';
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
};

/**
 * Format date for calendar display
 */
export const formatCalendarDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, 'EEEE, d MMMM yyyy', { locale: es });
};

/**
 * Format time range
 */
export const formatTimeRange = (start: string | Date, end: string | Date): string => {
  const startObj = typeof start === 'string' ? parseISO(start) : start;
  const endObj = typeof end === 'string' ? parseISO(end) : end;

  if (!isValid(startObj) || !isValid(endObj)) return '';

  const startTime = format(startObj, 'HH:mm');
  const endTime = format(endObj, 'HH:mm');

  return `${startTime} - ${endTime}`;
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Truncate text
 */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};