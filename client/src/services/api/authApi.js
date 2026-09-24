import { apiSlice } from "./apiSlice";

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),

    getProfile: builder.query({
      query: () => "/auth/profile",
      providesTags: ["Admin"],
    }),

    updateProfile: builder.mutation({
      query: (profileData) => ({
        url: "/auth/profile",
        method: "PUT",
        body: profileData,
      }),
      invalidatesTags: ["Admin"],
    }),

    changePassword: builder.mutation({
      query: (passwordData) => ({
        url: "/auth/profile/password",
        method: "PUT",
        body: passwordData,
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApi;