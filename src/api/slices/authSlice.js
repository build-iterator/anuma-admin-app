import { createSlice } from "@reduxjs/toolkit";

const TOKEN_KEY = "anuma_admin_token";

// Hydrate from localStorage so a refresh keeps the user signed in until /me
// either confirms or invalidates the token.
const initialToken =
  typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    accessToken: initialToken,
  },
  reducers: {
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
      if (typeof window === "undefined") return;
      if (action.payload) {
        window.localStorage.setItem(TOKEN_KEY, action.payload);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    },
  },
});

export const { setAccessToken } = authSlice.actions;
export default authSlice.reducer;
