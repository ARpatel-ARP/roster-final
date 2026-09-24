import {
  useGetEmployeesQuery,
} from "../services/api/employeeApi";



import {
  useGenerateDailyRosterMutation,
  useGenerateWeeklyRosterMutation,
  useGenerateMonthlyRosterMutation,
  useGetGeneratedDailyRosterQuery,
  useGetGeneratedWeeklyRosterQuery,
  useGetGeneratedMonthlyRosterQuery,
} from "../services/api/rosterApi";

import ScheduleGrid from "../components/roster/ScheduleGrid";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetTeamsQuery } from "../services/api/teamApi";

export default function TeamRosterPage() {
  const navigate = useNavigate();

  const [teamId, setTeamId] = useState("");
  const [period, setPeriod] = useState("daily");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState("");

  const { data: teamsResponse, isLoading: teamsLoading } =
    useGetTeamsQuery({ status: "active" });

  const teams = useMemo(() => {
    const raw =
      teamsResponse?.data ||
      teamsResponse?.teams ||
      teamsResponse ||
      [];

    const list = Array.isArray(raw) ? raw : [];

    return list.filter(
      (team, index, self) =>
        team?._id &&
        index === self.findIndex((t) => t._id === team._id)
    );
  }, [teamsResponse]);

  const selectedTeam = teams.find((team) => team._id === teamId);

  const { data: employeesResponse, isLoading: employeesLoading } =
    useGetEmployeesQuery(
      {
        team: teamId,
        status: "Active",
        page: 1,
        limit: 100,
      },
      {
        skip: !teamId,
      }
    );

  const employees = useMemo(() => {
    const raw =
      employeesResponse?.data ||
      employeesResponse?.employees ||
      employeesResponse ||
      [];

    return Array.isArray(raw) ? raw : [];
  }, [employeesResponse]);

  const [generateDaily, dailyState] =
    useGenerateDailyRosterMutation();

  const [generateWeekly, weeklyState] =
    useGenerateWeeklyRosterMutation();

  const [generateMonthly, monthlyState] =
    useGenerateMonthlyRosterMutation();

  const dailyQuery = useGetGeneratedDailyRosterQuery(
    {
      date,
      teamId,
    },
    {
      skip: !teamId || period !== "daily" || !date,
    }
  );

  const weeklyQuery = useGetGeneratedWeeklyRosterQuery(
    {
      startDate,
      teamId,
    },
    {
      skip: !teamId || period !== "weekly" || !startDate,
    }
  );

  const monthlyQuery = useGetGeneratedMonthlyRosterQuery(
    {
      month,
      year,
      teamId,
    },
    {
      skip: !teamId || period !== "monthly",
    }
  );

  const loading =
    dailyState.isLoading ||
    weeklyState.isLoading ||
    monthlyState.isLoading;

  const handleGenerate = async () => {
    if (!teamId) {
      alert("Please select a team.");
      return;
    }

    try {
      if (period === "daily") {
        if (!date) {
          alert("Please select a date.");
          return;
        }

        await generateDaily({
          date,
          teamId,
        }).unwrap();
      }

      if (period === "weekly") {
        if (!startDate) {
          alert("Please select the week start date.");
          return;
        }

        await generateWeekly({
          startDate,
          teamId,
        }).unwrap();
      }

      if (period === "monthly") {
        await generateMonthly({
          month,
          year,
          teamId,
        }).unwrap();
      }
    } catch (error) {
      alert(
        error?.data?.message ||
          error?.message ||
          "Failed to generate roster."
      );
    }
  };

  const rosterData =
    period === "daily"
      ? dailyQuery.data?.data
      : period === "weekly"
      ? weeklyQuery.data?.data
      : monthlyQuery.data?.data;

  const entries = rosterData?.entries || [];

  const scheduleDates = useMemo(() => {
    if (!entries.length) return [];

    return [
      ...new Set(
        entries
          .map((entry) => entry.date)
          .filter(Boolean)
      ),
    ].sort();
  }, [entries]);

  const employeeRows = useMemo(() => {
    const map = new Map();

    entries.forEach((entry) => {
      const employee = entry.employee;

      const id =
        employee?._id ||
        employee?.id ||
        entry.employee;

      if (!id) return;

      if (!map.has(id)) {
        map.set(id, {
          ...employee,
          _id: id,
        });
      }
    });

    return [...map.values()];
  }, [entries]);

  const getShiftForEmployeeDate = (employeeId, dateValue) => {
    const entry = entries.find(
      (item) =>
        (item.employee?._id || item.employee) === employeeId &&
        item.date === dateValue
    );

    return entry?.shift?.name || entry?.shift || "—";
  };

  const handleEntryClick = (entry) => {
  if (!entry) return;

  if (entry._id) {
    navigate(`/generated-rosters/${entry._id}`);
  }
};

 return (
  <div className="min-h-full bg-slate-50 p-4 md:p-6">
    {/* Header */}
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <button
          onClick={() => navigate("/rosters")}
          className="mb-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Back to Rosters
        </button>

        <h1 className="text-2xl font-bold text-slate-900">
          Team-wise Roster
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Generate daily, weekly or monthly rosters for one team at a time.
        </p>
      </div>
    </div>

    {/* Generator Card */}
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* Team */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Team
          </label>

          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
          >
            <option value="">Select team</option>

            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Period */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Period
          </label>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Date */}
        {period === "daily" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
            />
          </div>
        )}

        {/* Week */}
        {period === "weekly" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Week starts
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
            />
          </div>
        )}

        {/* Month */}
        {period === "monthly" && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Month
              </label>

              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString("en", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Year
              </label>

              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </>
        )}

        {/* Generate */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !teamId}
            className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Roster"}
          </button>
        </div>
      </div>

      {/* Team employee preview */}
      {teamId && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                {selectedTeam?.name || "Selected Team"}
              </h2>

              <p className="text-sm text-slate-500">
                {employeesLoading
                  ? "Loading employees..."
                  : `${employees.length} active employee${
                      employees.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {employees.map((employee) => (
                <span
                  key={employee._id}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {employee.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Generated roster */}
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-slate-900">
            Roster Preview
          </h2>

          <p className="text-sm text-slate-500">
            {selectedTeam?.name || "Select a team"} ·{" "}
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </p>
        </div>
      </div>

      {!teamId ? (
        <div className="p-10 text-center text-sm text-slate-500">
          Select a team to view its roster.
        </div>
      ) : !entries.length ? (
        <div className="p-10 text-center text-sm text-slate-500">
          No generated roster found for this selection.
        </div>
      ) : (
        <ScheduleGrid
          employees={employees}
          dates={scheduleDates}
          entries={entries}
          onEntryClick={handleEntryClick}
        />
      )}
    </div>
  </div>
);
}