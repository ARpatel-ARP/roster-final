import {
  Search,
  SlidersHorizontal,
  Plus,
  CalendarDays,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

function RosterToolbar({
  search = "",
  onSearchChange,

  view = "week",
  onViewChange,

  onCreateRoster,

  onGenerateRoster,

  showFilters = false,
  onToggleFilters,

  filters = {},
  onFilterChange,

  teams = [],
  employees = [],
  shifts = [],
}) {
  const {
    startDate = "",
    endDate = "",
    team = "",
    employee = "",
    shift = "",
  } = filters;

  const handleFilterChange = (field, value) => {
    onFilterChange?.({
      ...filters,
      [field]: value,
    });
  };

  const clearFilters = () => {
    onFilterChange?.({
      startDate: "",
      endDate: "",
      team: "",
      employee: "",
      shift: "",
    });
  };

  const hasFilters =
    startDate ||
    endDate ||
    team ||
    employee ||
    shift;

  return (
    <div className="space-y-3">
      {/* Main toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Search + Filters */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                onSearchChange?.(e.target.value)
              }
              placeholder="Search roster..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {/* Filters button */}
          <button
            type="button"
            onClick={onToggleFilters}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
              showFilters || hasFilters
                ? "border-slate-300 bg-slate-100 text-slate-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={16} />

            <span>Filters</span>

            {hasFilters && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-800 px-1.5 text-[11px] font-semibold text-white">
                {[
                  startDate,
                  endDate,
                  team,
                  employee,
                  shift,
                ].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Right actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* View selector */}
          <div className="flex h-10 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {["day", "week", "month"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onViewChange?.(item)}
                className={`rounded-md px-3 text-sm font-medium capitalize transition ${
                  view === item
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Generate */}
          {onGenerateRoster && (
            <button
              type="button"
              onClick={onGenerateRoster}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw size={16} />
              <span>Generate</span>
            </button>
          )}

          {/* Create */}
          {onCreateRoster && (
            <button
              type="button"
              onClick={onCreateRoster}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus size={17} />
              <span>Create Roster</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Start date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                From
              </label>

              <div className="relative">
                <CalendarDays
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    handleFilterChange(
                      "startDate",
                      e.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* End date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                To
              </label>

              <div className="relative">
                <CalendarDays
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    handleFilterChange(
                      "endDate",
                      e.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* Team */}
            <FilterSelect
              label="Team"
              value={team}
              onChange={(value) =>
                handleFilterChange("team", value)
              }
              options={teams}
              placeholder="All teams"
            />

            {/* Employee */}
            <FilterSelect
              label="Employee"
              value={employee}
              onChange={(value) =>
                handleFilterChange("employee", value)
              }
              options={employees}
              placeholder="All employees"
            />

            {/* Shift */}
            <FilterSelect
              label="Shift"
              value={shift}
              onChange={(value) =>
                handleFilterChange("shift", value)
              }
              options={shifts}
              placeholder="All shifts"
            />
          </div>

          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          <option value="">{placeholder}</option>

          {options.map((option) => {
            const id =
              option._id ||
              option.id ||
              option.value;

            const name =
              option.name ||
              option.label ||
              option.employeeId;

            return (
              <option key={id} value={id}>
                {name}
              </option>
            );
          })}
        </select>

        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

export default RosterToolbar;