import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  MoreHorizontal,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useGetLeavesQuery } from "../services/api/leaveApi.js";

function getStatusClasses(status) {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "Pending":
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function formatDate(date) {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "-";

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return "-";

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "-";
  }

  const difference =
    Math.round(
      (Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate()
      ) -
        Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate()
        )) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  return difference > 0 ? difference : "-";
}

function LeavesPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const limit = 10;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetLeavesQuery({
    status,
    page,
    limit,
  });

  const leaves = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const filteredLeaves = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return leaves;

    return leaves.filter((leave) => {
      const employee = leave.employee;

      return (
        employee?.name?.toLowerCase().includes(value) ||
        employee?.employeeId?.toLowerCase().includes(value) ||
        employee?.designation?.toLowerCase().includes(value) ||
        leave?.reason?.toLowerCase().includes(value)
      );
    });
  }, [leaves, search]);

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage((current) => current - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setPage((current) => current + 1);
    }
  };

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <CalendarDays size={20} />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Leaves
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage employee leave requests
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/leaves/new"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            <Plus size={18} />
            Add Leave
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search employee, ID or reason..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="w-full lg:w-48">
              <select
                value={status}
                onChange={(event) =>
                  handleStatusChange(event.target.value)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              Unable to load leaves
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error?.data?.message ||
                "Something went wrong while fetching leave records."}
            </p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Leave Period
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Days
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reason
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Loading leaves...
                    </td>
                  </tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-12 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                          <CalendarDays
                            size={20}
                            className="text-slate-400"
                          />
                        </div>

                        <p className="text-sm font-medium text-slate-700">
                          No leaves found
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Try changing your search or status filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((leave) => {
                    const employee = leave.employee;

                    return (
                      <tr
                        key={leave._id}
                        onClick={() =>
                          navigate(`/leaves/${leave._id}`)
                        }
                        className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50"
                      >
                        {/* Employee */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {employee?.name || "-"}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {employee?.employeeId || "-"}
                            </p>
                          </div>
                        </td>

                        {/* Leave period */}
                        <td className="px-5 py-4">
                          <div className="text-sm text-slate-700">
                            {formatDate(leave.startDate)}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            to {formatDate(leave.endDate)}
                          </div>
                        </td>

                        {/* Days */}
                        <td className="px-5 py-4 text-sm font-medium text-slate-700">
                          {calculateLeaveDays(
                            leave.startDate,
                            leave.endDate
                          )}
                        </td>

                        {/* Reason */}
                        <td className="max-w-xs px-5 py-4">
                          <p
                            className="truncate text-sm text-slate-600"
                            title={leave.reason}
                          >
                            {leave.reason || "-"}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              leave.status
                            )}`}
                          >
                            {leave.status || "Pending"}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/leaves/${leave._id}`}
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label="View leave"
                          >
                            <MoreHorizontal size={18} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && total > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {filteredLeaves.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {total}
                </span>{" "}
                leaves
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={page <= 1 || isFetching}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="min-w-20 text-center text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    page >= totalPages || isFetching
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeavesPage;