import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import { Order, CreateOrderData, UpdateStatusData, OrderStatus } from '@/types';

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OrderCounts {
  sin_iniciar: number;
  en_proceso: number;
  completada: number;
}

const orderService = {
  getOrders: async (params?: {
    page?: number;
    limit?: number;
    estado?: OrderStatus;
  }): Promise<OrdersResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.estado) queryParams.append('estado', params.estado);

    const response = await api.get<OrdersResponse>(
      `${API_ENDPOINTS.ORDERS.BASE}?${queryParams.toString()}`
    );
    return response.data;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`${API_ENDPOINTS.ORDERS.BASE}/${id}`);
    return response.data;
  },

  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await api.post<Order>(API_ENDPOINTS.ORDERS.BASE, data);
    return response.data;
  },

  updateOrderStatus: async (id: string, data: UpdateStatusData): Promise<Order> => {
    const response = await api.put<Order>(`${API_ENDPOINTS.ORDERS.BASE}/${id}/status`, data);
    return response.data;
  },

  uploadImage: async (orderId: string, file: File): Promise<{ url: string; public_id: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post<{ url: string; public_id: string }>(
      `${API_ENDPOINTS.ORDERS.BASE}/${orderId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  getOrderCounts: async (): Promise<OrderCounts> => {
    const response = await api.get<OrderCounts>(API_ENDPOINTS.ORDERS.COUNTS);
    return response.data;
  }
};

export default orderService;