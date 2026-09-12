import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { useGetEmployeesQuery } from "../services/api/employeeApi";

function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data, isLoading, isError } = useGetEmployeesQuery({
    page,
    limit: 10,
  });

  const employees = data?.data || [];

  const filteredEmployees = employees.filter((employee) => {
    const value = search.toLowerCase();

    return (
      employee.name?.toLowerCase().includes(value) ||
      employee.employeeId?.toLowerCase().includes(value) ||
      employee.designation?.toLowerCase().includes(value) ||
      employee.team?.name?.toLowerCase().includes(value)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Employees
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage employees and their roster information.
          </p>
        </div>

        <Link
          to="/employees/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Employee
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {isLoading && (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading employees...
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-sm text-red-500">
            Failed to load employees.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Employee ID</th>
                    <th className="px-5 py-3">Team</th>
                    <th className="px-5 py-3">Designation</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee._id}
                      onClick={() => navigate(`/employees/${employee._id}`)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {employee.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {employee.email}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {employee.employeeId}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {employee.team?.name || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {employee.designation || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            employee.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {employee.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/employees/${employee._id}`}
                          className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <MoreHorizontal size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredEmployees.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No employees found.
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {filteredEmployees.length} of {data?.total || 0} employees
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-sm text-slate-600">
                  {page} / {data?.totalPages || 1}
                </span>

                <button
                  disabled={page >= (data?.totalPages || 1)}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EmployeesPage;