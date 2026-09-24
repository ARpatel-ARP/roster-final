import { apiSlice } from "./apiSlice.js";

export const rosterApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // =========================
        // MANUAL ROSTER
        // =========================
        getShifts: builder.query({
            query: () => "/shifts",
            providesTags: ["Shift"],
        }),

        getRosters: builder.query({
            query: ({
                date = "",
                startDate = "",
                endDate = "",
                employee = "",
                team = "",
                shift = "",
                month = "",
                year = "",
                page = 1,
                limit = 20,
            } = {}) => {
                const params = new URLSearchParams();

                if (date) params.append("date", date);
                if (startDate) params.append("startDate", startDate);
                if (endDate) params.append("endDate", endDate);
                if (employee) params.append("employee", employee);
                if (team) params.append("team", team);
                if (shift) params.append("shift", shift);
                if (month) params.append("month", month);
                if (year) params.append("year", year);

                params.append("page", page);
                params.append("limit", limit);

                return `/rosters?${params.toString()}`;
            },
            providesTags: ["Roster"],
        }),

        getRosterById: builder.query({
            query: (id) => `/rosters/${id}`,
            providesTags: ["Roster"],
        }),

        createRoster: builder.mutation({
            query: (rosterData) => ({
                url: "/rosters",
                method: "POST",
                body: rosterData,
            }),
            invalidatesTags: ["Roster"],
        }),

        updateRoster: builder.mutation({
            query: ({ id, ...rosterData }) => ({
                url: `/rosters/${id}`,
                method: "PUT",
                body: rosterData,
            }),
            invalidatesTags: ["Roster"],
        }),

        deleteRoster: builder.mutation({
            query: (id) => ({
                url: `/rosters/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Roster"],
        }),

        // =========================
        // AUTOMATIC DAILY ROSTER
        // =========================
        generateDailyRoster: builder.mutation({
            query: ({ date, teamId }) => ({
                url: "/rosters/generate/daily",
                method: "POST",
                body: { date, teamId },
            }),
            invalidatesTags: ["Roster"],
        }),

        getGeneratedDailyRoster: builder.query({
            query: ({ date, teamId }) =>
                `/rosters/generate/daily?date=${encodeURIComponent(date)}&teamId=${encodeURIComponent(teamId)}`,
            providesTags: ["Roster"],
        }),

        // =========================
        // AUTOMATIC MONTHLY ROSTER
        // =========================

        generateMonthlyRoster: builder.mutation({
            query: ({ month, year, teamId }) => ({
                url: "/rosters/generate/monthly",
                method: "POST",
                body: { month, year, teamId },
            }),
            invalidatesTags: ["Roster"],
        }),

        getGeneratedMonthlyRoster: builder.query({
            query: ({ month, year, teamId }) => {
                const params = new URLSearchParams({ month, year });
                if (teamId) params.append("teamId", teamId);
                return `/rosters/generate/monthly?${params.toString()}`;
            },
            providesTags: ["Roster"],
        }),

        // =========================
        // AUTOMATIC WEEKLY ROSTER
        // =========================

        generateWeeklyRoster: builder.mutation({
            query: ({ startDate, teamId }) => ({
                url: "/rosters/generate/weekly",
                method: "POST",
                body: { startDate, teamId },
            }),
            invalidatesTags: ["Roster"],
        }),

        getGeneratedWeeklyRoster: builder.query({
            query: ({ startDate, teamId }) => {
                const params = new URLSearchParams({ startDate });
                if (teamId) params.append("teamId", teamId);
                return `/rosters/generate/weekly?${params.toString()}`;
            },
            providesTags: ["Roster"],
        }),

        // =========================
        // GENERATED ENTRY UPDATE
        // =========================

        updateGeneratedRoster: builder.mutation({
            query: ({ id, employee, date, shift }) => ({
                url: `/rosters/generate/${id}`,
                method: "PUT",
                body: {
                    employee,
                    date,
                    shift,
                },
            }),
            invalidatesTags: ["Roster"],
        }),

        // =========================
        // GENERATED ENTRY DELETE
        // =========================

        deleteGeneratedRoster: builder.mutation({
            query: (id) => ({
                url: `/rosters/generate/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Roster"],
        }),
    }),
});

export const {
    // Manual
    useGetShiftsQuery,
    useGetRostersQuery,
    useGetRosterByIdQuery,
    useCreateRosterMutation,
    useUpdateRosterMutation,
    useDeleteRosterMutation,

    // Automatic daily
    useGenerateDailyRosterMutation,
    useGetGeneratedDailyRosterQuery,

    // Automatic monthly
    useGenerateMonthlyRosterMutation,
    useGetGeneratedMonthlyRosterQuery,

    // Automatic weekly
    useGenerateWeeklyRosterMutation,
    useGetGeneratedWeeklyRosterQuery,

    // Generated entry
    useUpdateGeneratedRosterMutation,
    useDeleteGeneratedRosterMutation,
} = rosterApi;


export const downloadRosterExcel = async (type, month, year) => {
    const baseUrl = import.meta.env.VITE_API_URL;

    const response = await fetch(
        `${baseUrl}/rosters/export/${type}?month=${month}&year=${year}`,
        {
            method: "GET",
            credentials: "include",
        }
    );

    if (!response.ok) {
        throw new Error("Failed to download roster");
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;

    if (type === "help-desk") {
        link.download = `Help-Desk-Roster-${month}-${year}.xlsx`;
    } else {
        link.download = `CCC-Roster-${month}-${year}.xlsx`;
    }

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
};