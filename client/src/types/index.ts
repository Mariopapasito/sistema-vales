export * from './user';
export * from './order';
export * from './calendar';

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  orders: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}