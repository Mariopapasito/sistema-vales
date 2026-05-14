/**
 * Generate a unique folio for orders
 * Format: VAL-YYYY-NNNN (e.g., VAL-2024-0001)
 */
export const generateFolio = async (model: any): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `VAL-${year}`;

  // Get the count of documents this year
  const count = await model.countDocuments({
    folio: new RegExp(`^${prefix}`)
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}-${sequence}`;
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Format date for API requests
 */
export const formatDateISO = (date: Date): string => {
  return date.toISOString();
};

/**
 * Parse date string to Date object
 */
export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};