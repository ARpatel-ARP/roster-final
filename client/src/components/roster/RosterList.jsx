import { MoreHorizontal } from "lucide-react";

function RosterList({
  entries = [],
  onEntryClick,
  onEdit,
  onDelete,
}) {
  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getEmployee = (entry) => {
    if (typeof entry.employee === "object") {
      return entry.employee;
    }

    return null;
  };

  const getShift = (entry) => {
    if (typeof entry.shift === "object") {
      return entry.shift;
    }

    return null;
  };

  const getTeamName = (entry) => {
    const employee = getEmployee(entry);

    if (employee?.team?.name) {
      return employee.team.name;
    }

    if (typeof entry.team === "object") {
      return entry.team?.name || "—";
    }

    return "—";
  };

  const getShiftName = (entry) => {
    if (entry.isLeave) return "Leave";
    if (entry.isWeeklyOff) return "Off";
    if (entry.isHoliday) return "Holiday";

    const shift = getShift(entry);

    return shift?.name || entry.shift || "—";
  };

  const getShiftClass = (shiftName) => {
    const normalized = String(shiftName).toLowerCase();

    if (normalized === "morning") {
      return "bg-blue-50 text-blue-700 border-blue-100";
    }

    if (normalized === "general") {
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    }

    if (normalized === "evening") {
      return "bg-orange-50 text-orange-700 border-orange-100";
    }

    if (normalized === "night") {
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
    }

    if (normalized === "off") {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }

    if (normalized === "leave") {
      return "bg-amber-50 text-amber-700 border-amber-100";
    }

    if (normalized === "holiday") {
      return "bg-purple-50 text-purple-700 border-purple-100";
    }

    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-700">
          No roster entries found
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Try changing your filters or create a roster entry.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[850px] w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employee
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Team
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Shift
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type
              </th>

              <th className="w-12 px-2 py-3" />
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => {
              const employee = getEmployee(entry);
              const shiftName = getShiftName(entry);

              return (
                <tr
                  key={entry._id}
                  onClick={() => onEntryClick?.(entry)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  {/* Employee */}
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {getInitials(employee?.name)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {employee?.name || "Unknown Employee"}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {employee?.employeeId || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Team */}
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {getTeamName(entry)}
                  </td>

                  {/* Date */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {formatDate(entry.date)}
                  </td>

                  {/* Shift */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getShiftClass(
                        shiftName
                      )}`}
                    >
                      {shiftName}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    {entry.manuallyEdited ? (
                      <span className="text-xs font-medium text-slate-600">
                        Manual
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        Generated
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEntryClick?.(entry);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        aria-label="Roster entry actions"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default RosterList;