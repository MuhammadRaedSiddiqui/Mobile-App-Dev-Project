import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { favoritesService } from '@/services';
import { STORAGE_KEYS } from '@/utils/constants';
import { readCache, writeCache } from '@/utils/cache';

interface FavoritesState {
  ids: string[];
  loading: boolean;
  error: string | null;
  /** True when ids came from an expired/offline cache. */
  fromCache: boolean;
}

const initialState: FavoritesState = {
  ids: [],
  loading: false,
  error: null,
  fromCache: false,
};

async function persistFavorites(uid: string | undefined, ids: string[]) {
  if (!uid) return;
  await writeCache(STORAGE_KEYS.favorites(uid), ids);
}

export const loadFavorites = createAsyncThunk(
  'favorites/load',
  async (uid: string | undefined, { rejectWithValue }) => {
    try {
      const ids = await favoritesService.list();
      if (uid) await persistFavorites(uid, ids);
      return { ids, fromCache: false };
    } catch (err) {
      if (uid) {
        const cached = await readCache<string[]>(STORAGE_KEYS.favorites(uid));
        if (cached) return { ids: cached.data, fromCache: true };
      }
      return rejectWithValue('We couldn’t load your saved listings.');
    }
  },
);

/** Optimistic toggle with rollback on error (Technical Docs §Phase 3.3). */
export const toggleFavorite = createAsyncThunk<
  { listingId: string; saved: boolean; uid?: string },
  { listingId: string; currentlySaved: boolean; uid?: string },
  { rejectValue: { listingId: string; currentlySaved: boolean } }
>('favorites/toggle', async ({ listingId, currentlySaved, uid }, { rejectWithValue }) => {
  try {
    if (currentlySaved) {
      await favoritesService.remove(listingId);
      return { listingId, saved: false, uid };
    }
    await favoritesService.add(listingId);
    return { listingId, saved: true, uid };
  } catch {
    return rejectWithValue({ listingId, currentlySaved });
  }
});

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.ids = action.payload.ids;
        state.fromCache = action.payload.fromCache;
      })
      .addCase(loadFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'We couldn’t load your saved listings.';
      });

    builder
      .addCase(toggleFavorite.pending, (state, action) => {
        const { listingId, currentlySaved } = action.meta.arg;
        if (currentlySaved) {
          state.ids = state.ids.filter((id) => id !== listingId);
        } else if (!state.ids.includes(listingId)) {
          state.ids.push(listingId);
        }
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { uid } = action.payload;
        if (uid) void persistFavorites(uid, state.ids);
        state.fromCache = false;
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        const payload = action.payload;
        if (!payload) return;
        if (payload.currentlySaved) {
          if (!state.ids.includes(payload.listingId)) state.ids.push(payload.listingId);
        } else {
          state.ids = state.ids.filter((id) => id !== payload.listingId);
        }
      });
  },
});

export default favoritesSlice.reducer;
