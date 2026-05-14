/**
 * Validation utility functions
 */

/**
 * Check if string is valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if string is valid MongoDB ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

/**
 * Check if string is valid hex color
 */
export const isValidHexColor = (color: string): boolean => {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
};

/**
 * Sanitize string input
 */
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Check if date is in valid format
 */
export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Check if date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Check if date is in the past
 */
export const isPastDate = (date: Date): boolean => {
  return date < new Date();
};