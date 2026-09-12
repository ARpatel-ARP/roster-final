import { apiSlice } from "./apiSlice";

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query({
      query: () => "/dashboard",
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;