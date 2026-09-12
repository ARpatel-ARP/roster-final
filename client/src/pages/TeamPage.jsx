import { useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Plus, Search, Users } from "lucide-react";
import { useGetTeamsQuery } from "../services/api/teamApi";
import { useGetEmployeesQuery } from "../services/api/employeeApi";

function TeamsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const {
    data: teamsResponse,
    isLoading,
    isError,
    error,
  } = useGetTeamsQuery({
    name: search,
    status,
  });

  const { data: employeesResponse } = useGetEmployeesQuery({
  page: 1,
  limit: 100
});

const employees = employeesResponse?.data || [];

  const teams = teamsResponse?.data || [];

  const getEmployeeCount = (teamId) => {
  return employees.filter(
    (employee) => String(employee.team?._id || employee.team) === String(teamId)
  ).length;
};

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Teams
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage teams, managers, and team status.
            </p>
          </div>

          <Link
            to="/teams/new"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            <Plus size={18} />
            Add Team
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:w-44"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">Loading teams...</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-white p-6">
            <p className="text-sm font-medium text-red-600">
              Failed to load teams.
            </p>

            {error?.data?.message && (
              <p className="mt-1 text-sm text-slate-500">
                {error.data.message}
              </p>
            )}
          </div>
        )}

        {/* Team table */}
        {!isLoading && !isError && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Users size={22} className="text-slate-500" />
                </div>

                <h2 className="text-sm font-semibold text-slate-900">
                  No teams found
                </h2>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Try changing your search or filters, or create a new team.
                </p>

                <Link
                  to="/teams/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Plus size={17} />
                  Add Team
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6">
                        Team
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Manager
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="w-16 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {teams.map((team) => (
                      <tr
                        key={team._id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 sm:px-6">
                          <Link
                            to={`/teams/${team._id}`}
                            className="block"
                          >
                           <div className="flex items-center gap-2">
  <h3>{team.name}</h3>

  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
    {getEmployeeCount(team._id)}
  </span>
</div>
                            {team.description && (
                              <p className="mt-1 max-w-md truncate text-sm text-slate-500">
                                {team.description}
                              </p>
                            )}
                          </Link>
                        </td>

                        <td className="px-4 py-4">
                          {team.manager ? (
                            <Link
                              to={`/employees/${team.manager._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block"
                            >
                              <p className="text-sm font-medium text-slate-800 hover:text-slate-900">
                                {team.manager.name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {team.manager.employeeId}
                              </p>
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No manager
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              team.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {team.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right sm:px-6">
                          <Link
                            to={`/teams/${team._id}`}
                            aria-label={`View ${team.name}`}
                            className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <MoreHorizontal size={19} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!isLoading && !isError && teamsResponse?.count !== undefined && (
          <p className="mt-3 text-sm text-slate-500">
            {teamsResponse.count}{" "}
            {teamsResponse.count === 1 ? "team" : "teams"}
          </p>
        )}
      </div>
    </div>
  );
}

export default TeamsPage;