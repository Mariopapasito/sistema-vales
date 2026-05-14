import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import ordersReducer from './slices/ordersSlice';
import calendarReducer from './slices/calendarSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: ordersReducer,
    calendar: calendarReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;