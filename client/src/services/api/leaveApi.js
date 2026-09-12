import { apiSlice } from "./apiSlice.js";

export const leaveApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLeaves: builder.query({
      query: ({
        employee = "",
        status = "",
        startDate = "",
        endDate = "",
        page = 1,
        limit = 10,
      } = {}) => {
        const params = new URLSearchParams();

        if (employee) params.append("employee", employee);
        if (status) params.append("status", status);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        params.append("page", page);
        params.append("limit", limit);

        return `/leaves?${params.toString()}`;
      },
      providesTags: ["Leave"],
    }),

    getLeaveById: builder.query({
      query: (id) => `/leaves/${id}`,
      providesTags: ["Leave"],
    }),

    getLeaveBalance: builder.query({
      query: ({ employeeId, year }) =>
        `/leaves/balance/${employeeId}?year=${year}`,
      providesTags: ["Leave"],
    }),

    createLeave: builder.mutation({
      query: (leaveData) => ({
        url: "/leaves",
        method: "POST",
        body: leaveData,
      }),
      invalidatesTags: ["Leave", "Employee", "Roster"],
    }),

    updateLeave: builder.mutation({
      query: ({ id, ...leaveData }) => ({
        url: `/leaves/${id}`,
        method: "PUT",
        body: leaveData,
      }),
      invalidatesTags: ["Leave", "Employee", "Roster"],
    }),

    deleteLeave: builder.mutation({
      query: (id) => ({
        url: `/leaves/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Leave", "Employee", "Roster"],
    }),
  }),
});

export const {
  useGetLeavesQuery,
  useGetLeaveByIdQuery,
  useGetLeaveBalanceQuery,
  useCreateLeaveMutation,
  useUpdateLeaveMutation,
  useDeleteLeaveMutation,
} = leaveApi;