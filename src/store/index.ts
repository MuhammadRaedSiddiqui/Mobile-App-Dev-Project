import { configureStore } from '@reduxjs/toolkit';
import authReducer, { wireAuthToken } from './slices/authSlice';
import favoritesReducer from './slices/favoritesSlice';
import metaReducer from './slices/metaSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    favorites: favoritesReducer,
    meta: metaReducer,
  },
});

// Every outgoing API request picks up the current session token from the store.
wireAuthToken(() => store.getState().auth.token);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
