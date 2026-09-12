import { apiSlice } from "./apiSlice.js";

export const teamApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTeams: builder.query({
      query: ({ status = "", name = "" } = {}) => {
        const params = new URLSearchParams();

        if (status) {
          params.append("status", status);
        }

        if (name) {
          params.append("name", name);
        }

        const queryString = params.toString();

        return queryString
          ? `/teams?${queryString}`
          : "/teams";
      },
      providesTags: ["Team"],
    }),

    getTeamById: builder.query({
      query: (id) => `/teams/${id}`,
      providesTags: ["Team"],
    }),

    createTeam: builder.mutation({
      query: (teamData) => ({
        url: "/teams",
        method: "POST",
        body: teamData,
      }),
      invalidatesTags: ["Team"],
    }),

    updateTeam: builder.mutation({
      query: ({ id, ...teamData }) => ({
        url: `/teams/${id}`,
        method: "PUT",
        body: teamData,
      }),
      invalidatesTags: ["Team"],
    }),

    deleteTeam: builder.mutation({
      query: (id) => ({
        url: `/teams/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Team"],
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useGetTeamByIdQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
} = teamApi;