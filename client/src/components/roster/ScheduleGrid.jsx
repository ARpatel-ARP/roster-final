import { ChevronLeft, ChevronRight } from "lucide-react";

function ScheduleGrid({
  employees = [],
  dates = [],
  entries = [],
  onEntryClick,
  onPrevious,
  onNext,
  onToday,
}) {
  const getDateKey = (date) => {
    if (!date) return "";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "";

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  };

  const formatDay = (date) => {
    const d = new Date(date);

    return d.toLocaleDateString("en-US", {
      weekday: "short",
    });
  };

  const formatDate = (date) => {
    const d = new Date(date);

    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });
  };

  const getEmployeeId = (employee) =>
    employee?._id || employee?.id;

  const getEntryForCell = (employee, date) => {
    const employeeId = getEmployeeId(employee);
    const dateKey = getDateKey(date);

    return entries.find((entry) => {
      const entryEmployee =
        entry.employee?._id ||
        entry.employee?.id ||
        entry.employee;

      return (
        String(entryEmployee) === String(employeeId) &&
        getDateKey(entry.date) === dateKey
      );
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Calendar header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Roster Schedule
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Employee shift assignments
          </p>
        </div>

        {(onPrevious || onNext || onToday) && (
          <div className="flex items-center gap-1 self-start sm:self-auto">
            {onPrevious && (
              <button
                type="button"
                onClick={onPrevious}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Previous period"
              >
                <ChevronLeft size={17} />
              </button>
            )}

            {onToday && (
              <button
                type="button"
                onClick={onToday}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Today
              </button>
            )}

            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Next period"
              >
                <ChevronRight size={17} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Horizontally scrollable schedule */}
      <div className="overflow-x-auto">
  <div className="min-w-[880px] sm:min-w-[900px] [--employee-col:150px] sm:[--employee-col:220px]">
          {/* Date header */}
          <div
            className="grid border-b border-slate-200 bg-slate-50"
            style={{
              gridTemplateColumns: `var(--employee-col) repeat(${dates.length}, minmax(105px, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employee
              </span>
            </div>

            {dates.map((date) => {
              const d = new Date(date);
              const isWeekend =
                d.getDay() === 0 || d.getDay() === 6;

              return (
                <div
                  key={getDateKey(date)}
                  className={`border-r border-slate-200 px-3 py-3 text-center last:border-r-0 ${
                    isWeekend ? "bg-slate-100" : ""
                  }`}
                >
                  <p className="text-xs font-medium text-slate-500">
                    {formatDay(date)}
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-slate-800">
                    {formatDate(date)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Employees */}
          {employees.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No employees found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                There are no employees matching the current filters.
              </p>
            </div>
          ) : (
            employees.map((employee) => (
              <div
                key={getEmployeeId(employee)}
                className="grid border-b border-slate-100 last:border-b-0"
                style={{
                  gridTemplateColumns: `220px repeat(${dates.length}, minmax(105px, 1fr))`,
                }}
              >
                {/* Employee */}
                <div className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {employee.name || "Unnamed Employee"}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {employee.employeeId || "—"}
                    {employee.designation
                      ? ` • ${employee.designation}`
                      : ""}
                  </p>
                </div>

                {/* Daily assignments */}
                {dates.map((date) => {
                  const entry = getEntryForCell(
                    employee,
                    date
                  );

                  const d = new Date(date);
                  const isWeekend =
                    d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <div
                      key={`${getEmployeeId(employee)}-${getDateKey(
                        date
                      )}`}
                      className={`min-h-[82px] border-r border-slate-100 p-1.5 last:border-r-0 ${
                        isWeekend ? "bg-slate-50/70" : ""
                      }`}
                    >
                      {entry ? (
                        <ScheduleEntry
                          entry={entry}
                          onClick={() =>
                            onEntryClick?.(entry)
                          }
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onEntryClick?.({
                              employee,
                              date,
                              empty: true,
                            })
                          }
                          className="flex h-full min-h-[68px] w-full items-center justify-center rounded-lg border border-dashed border-transparent text-slate-300 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-500"
                          aria-label={`Add roster entry for ${
                            employee.name
                          } on ${formatDate(date)}`}
                        >
                          <span className="text-lg">+</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleEntry({ entry, onClick }) {
  const shift = entry.shift;

  const shiftName =
    typeof shift === "object"
      ? shift?.name
      : shift;

  const employeeOnLeave =
    entry.isLeave === true;

  const weeklyOff =
    entry.isWeeklyOff === true ||
    shiftName?.toLowerCase() === "off";

  const holiday =
    entry.isHoliday === true;

  const getEntryLabel = () => {
    if (employeeOnLeave) return "Leave";
    if (holiday) return "Holiday";
    if (weeklyOff) return "Off";

    return shiftName || "Unassigned";
  };

  const label = getEntryLabel();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[68px] w-full flex-col justify-between rounded-lg border p-2 text-left transition hover:shadow-sm ${getEntryClass(
        label
      )}`}
    >
      <div>
        <p className="truncate text-xs font-semibold">
          {label}
        </p>

        {!employeeOnLeave &&
          !weeklyOff &&
          !holiday &&
          shift?.startTime && (
            <p className="mt-1 truncate text-[11px] opacity-70">
              {shift.startTime}
              {shift.endTime
                ? ` - ${shift.endTime}`
                : ""}
            </p>
          )}
      </div>

      {entry.manuallyEdited && (
        <span className="mt-1 text-[10px] font-medium opacity-60">
          Manual
        </span>
      )}
    </button>
  );
}

function getEntryClass(label) {
  const normalized = String(label).toLowerCase();

  if (normalized === "morning") {
    return "border-blue-100 bg-blue-50 text-blue-800";
  }

  if (normalized === "general") {
    return "border-emerald-100 bg-emerald-50 text-emerald-800";
  }

  if (normalized === "evening") {
    return "border-orange-100 bg-orange-50 text-orange-800";
  }

  if (normalized === "night") {
    return "border-indigo-100 bg-indigo-50 text-indigo-800";
  }

  if (normalized === "off") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (normalized === "leave") {
    return "border-amber-100 bg-amber-50 text-amber-800";
  }

  if (normalized === "holiday") {
    return "border-purple-100 bg-purple-50 text-purple-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

export default ScheduleGrid;