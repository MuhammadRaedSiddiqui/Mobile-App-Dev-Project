import { createSlice } from '@reduxjs/toolkit';

interface MetaState {
  /** Incremented after agent CRUD / verify so browse hooks refetch. */
  browseGeneration: number;
}

const initialState: MetaState = { browseGeneration: 0 };

const metaSlice = createSlice({
  name: 'meta',
  initialState,
  reducers: {
    invalidateBrowse(state) {
      state.browseGeneration += 1;
    },
  },
});

export const { invalidateBrowse } = metaSlice.actions;
export default metaSlice.reducer;
