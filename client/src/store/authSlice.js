import { createSlice } from "@reduxjs/toolkit";

const storedAdmin = localStorage.getItem("admin");

const initialState = {
  admin: storedAdmin ? JSON.parse(storedAdmin) : null,
  isAuthenticated: Boolean(storedAdmin),
};

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    setCredentials: (state, action) => {
      const { admin } = action.payload;

      state.admin = admin;
      state.isAuthenticated = true;

      localStorage.setItem("admin", JSON.stringify(admin));
    },

    logout: (state) => {
      state.admin = null;
      state.isAuthenticated = false;

      localStorage.removeItem("admin");
    },
  },
});

export const {
  setCredentials,
  logout,
} = authSlice.actions;

export default authSlice.reducer;