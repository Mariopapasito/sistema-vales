import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrdersState, Order, CreateOrderData, UpdateStatusData, OrderStatus } from '../../types';
import { API_ENDPOINTS, PAGINATION } from '../../utils/constants';
import api from '../../services/api';

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  pagination: {
    page: PAGINATION.DEFAULT_PAGE,
    limit: PAGINATION.DEFAULT_LIMIT,
    total: 0,
    pages: 0
  },
  filters: {},
  counts: {
    sin_iniciar: 0,
    en_proceso: 0,
    completada: 0
  }
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (
    params: { page?: number; limit?: number; estado?: OrderStatus } = {},
    { rejectWithValue }
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.estado) queryParams.append('estado', params.estado);

      const response = await api.get(`${API_ENDPOINTS.ORDERS.BASE}?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar ordenes');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.ORDERS.BASE}/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar orden');
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: CreateOrderData, { rejectWithValue }) => {
    try {
      const response = await api.post(API_ENDPOINTS.ORDERS.BASE, orderData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear orden');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async (
    { id, data }: { id: string; data: UpdateStatusData },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(
        `${API_ENDPOINTS.ORDERS.BASE}/${id}/status`,
        data
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar estado');
    }
  }
);

export const fetchOrderCounts = createAsyncThunk(
  'orders/fetchOrderCounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDERS.COUNTS);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar conteos');
    }
  }
);

// Slice
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    setFilter: (state, action: PayloadAction<{ estado?: OrderStatus }>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    }
  },
  extraReducers: (builder) => {
    // Fetch orders
    builder.addCase(fetchOrders.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchOrders.fulfilled, (state, action) => {
      state.isLoading = false;
      state.orders = action.payload.orders;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchOrders.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch order by ID
    builder.addCase(fetchOrderById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchOrderById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentOrder = action.payload;
    });
    builder.addCase(fetchOrderById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create order
    builder.addCase(createOrder.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createOrder.fulfilled, (state, action) => {
      state.isLoading = false;
      state.orders.unshift(action.payload);
    });
    builder.addCase(createOrder.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update order status
    builder.addCase(updateOrderStatus.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateOrderStatus.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentOrder = action.payload;
      const index = state.orders.findIndex(o => o._id === action.payload._id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
    });
    builder.addCase(updateOrderStatus.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch order counts
    builder.addCase(fetchOrderCounts.fulfilled, (state, action) => {
      state.counts = action.payload;
    });
  }
});

export const { clearError, clearCurrentOrder, setFilter, clearFilters } = ordersSlice.actions;
export default ordersSlice.reducer;