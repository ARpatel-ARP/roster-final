import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import RosterToolbar from "../components/roster/RosterToolbar";
import ScheduleGrid from "../components/roster/ScheduleGrid";

import { useGetEmployeesQuery } from "../services/api/employeeApi";
import {
  downloadRosterExcel,
  useDeleteGeneratedRosterMutation,
  useGetGeneratedMonthlyRosterQuery,
  useGetGeneratedWeeklyRosterQuery,
  useGetRostersQuery,
  useGetShiftsQuery,
} from "../services/api/rosterApi";
import { useGetTeamsQuery } from "../services/api/teamApi";

function RosterPage() {
  const navigate = useNavigate();

  const [deleteGeneratedRoster, { isLoading: isDeleting }] =
  useDeleteGeneratedRosterMutation();

  const [view, setView] = useState("week");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    team: "",
    employee: "",
    shift: "",
  });

  const [downloaded, setDownloaded] = useState({
  ccc: false,
  "help-desk": false,
});

const [downloadStatus, setDownloadStatus] = useState(null);

  const [currentDate, setCurrentDate] = useState(
    getStartOfWeek(new Date())
  );

  /*
   * ==========================================
   * REAL BACKEND DATA
   * ==========================================
   */

  const {
    data: employeeResponse,
    isLoading: employeesLoading,
    isError: employeesError,
  } = useGetEmployeesQuery({
    page: 1,
    limit: 100,
  });

  const {
    data: teamResponse,
    isLoading: teamsLoading,
  } = useGetTeamsQuery();

  const weeklyStartDate = formatDateOnly(currentDate);

  const monthlyParams = {
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  };
  const {
    data: weeklyRosterResponse,
    isLoading: weeklyLoading,
    isError: weeklyError,
  } = useGetGeneratedWeeklyRosterQuery(
    {
      startDate: weeklyStartDate,
    },
    {
      skip: view !== "week",
    }
  );

  const {
    data: monthlyRosterResponse,
    isLoading: monthlyLoading,
    isError: monthlyError,
  } = useGetGeneratedMonthlyRosterQuery(
    monthlyParams,
    {
      skip: view !== "month",
    }
  );

  /*
   * ==========================================
   * NORMALIZE API RESPONSES
   * ==========================================
   */

  const employees = useMemo(() => {
    return employeeResponse?.data || [];
  }, [employeeResponse]);

  const teams = useMemo(() => {
    return teamResponse?.data || [];
  }, [teamResponse]);

  const {
  data: shiftResponse,
  isLoading: shiftsLoading,
} = useGetShiftsQuery();

const shifts = useMemo(() => {
  return shiftResponse?.data || [];
}, [shiftResponse]);

const {
  data: dayRosterResponse,
  isLoading: dayLoading,
  isError: dayError,
} = useGetRostersQuery(
  { date: formatDateOnly(currentDate) },
  { skip: view !== "day" }
);

  const rosterEntries = useMemo(() => {
  if (view === "day") {
    return Array.isArray(dayRosterResponse?.data)
      ? dayRosterResponse.data
      : [];
  }

  if (view === "week") {
    return weeklyRosterResponse?.data?.entries || [];
  }

  if (view === "month") {
    return monthlyRosterResponse?.data?.entries || [];
  }

  return [];
}, [
  view,
  dayRosterResponse,
  weeklyRosterResponse,
  monthlyRosterResponse,
]);

  /*
   * ==========================================
   * FILTER EMPLOYEES
   * ==========================================
   */

  const filteredEmployees = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !searchValue ||
        employee.name
          ?.toLowerCase()
          .includes(searchValue) ||
        employee.employeeId
          ?.toLowerCase()
          .includes(searchValue) ||
        employee.designation
          ?.toLowerCase()
          .includes(searchValue);

      const employeeTeamId =
        employee.team?._id || employee.team;

      const matchesTeam =
        !filters.team ||
        String(employeeTeamId) === String(filters.team);

      const matchesEmployee =
        !filters.employee ||
        String(employee._id) === String(filters.employee);

      return (
        matchesSearch &&
        matchesTeam &&
        matchesEmployee
      );
    });
  }, [employees, search, filters]);

  /*
   * ==========================================
   * DATES FOR GRID
   * ==========================================
   */

  const dates = useMemo(() => {
    if (view === "week") {
      return getWeekDates(currentDate);
    }

    if (view === "month") {
      return getMonthDates(
        currentDate.getFullYear(),
        currentDate.getMonth()
      );
    }

    return [currentDate];
  }, [currentDate, view]);

  /*
   * ==========================================
   * FILTER ROSTER ENTRIES
   * ==========================================
   */

  const filteredEntries = useMemo(() => {
    return rosterEntries.filter((entry) => {
      const entryEmployeeId =
        entry.employee?._id || entry.employee;

      const entryTeamId =
        entry.team?._id ||
        entry.employee?.team?._id ||
        entry.team;

      const entryShiftId =
        entry.shift?._id || entry.shift;

      const matchesEmployee =
        !filters.employee ||
        String(entryEmployeeId) ===
          String(filters.employee);

      const matchesTeam =
        !filters.team ||
        String(entryTeamId) === String(filters.team);

      const matchesShift =
        !filters.shift ||
        String(entryShiftId) === String(filters.shift);

      const dateKey = formatDateOnly(entry.date);

      const matchesStart =
        !filters.startDate ||
        dateKey >= filters.startDate;

      const matchesEnd =
        !filters.endDate ||
        dateKey <= filters.endDate;

      return (
        matchesEmployee &&
        matchesTeam &&
        matchesShift &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [rosterEntries, filters]);

  /*
   * ==========================================
   * NAVIGATION
   * ==========================================
   */

  const handlePrevious = () => {
    setCurrentDate((previous) => {
      const next = new Date(previous);

      if (view === "month") {
        next.setMonth(next.getMonth() - 1);
      } else if (view === "week") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setDate(next.getDate() - 1);
      }

      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((previous) => {
      const next = new Date(previous);

      if (view === "month") {
        next.setMonth(next.getMonth() + 1);
      } else if (view === "week") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }

      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(
      view === "week"
        ? getStartOfWeek(new Date())
        : new Date()
    );
  };

  const handleViewChange = (nextView) => {
    setView(nextView);

    if (nextView === "week") {
      setCurrentDate(getStartOfWeek(currentDate));
    }
  };

 const handleDownload = async (type) => {
  const rosterName =
    type === "ccc" ? "CCC Roster" : "Help Desk Roster";

  try {
    setDownloadStatus({
      type: "loading",
      message: `Downloading ${rosterName}...`,
    });

    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    await downloadRosterExcel(type, month, year);

    setDownloadStatus({
      type: "success",
      message: `${rosterName} downloaded successfully.`,
    });

    setTimeout(() => {
      setDownloadStatus(null);
    }, 3000);
  } catch (error) {
    console.error("Roster download failed:", error);

    setDownloadStatus({
      type: "error",
      message: `Unable to download ${rosterName}.`,
    });

    setTimeout(() => {
      setDownloadStatus(null);
    }, 4000);
  }
};

  /*
   * ==========================================
   * ENTRY CLICK
   * ==========================================
   */

const handleEntryClick = (entry) => {
  if (entry?.empty) {
    navigate("/rosters/new", {
      state: {
        employee: entry.employee,
        date: formatDateOnly(entry.date),
      },
    });
    return;
  }

  if (entry?._id) {
    if (view === "week" || view === "month") {
      navigate(`/generated-rosters/${entry._id}`);
    } else {
      navigate(`/rosters/${entry._id}`);
    }
  }
};

  const isLoading =
    employeesLoading ||
    teamsLoading ||
  shiftsLoading ||
    (view === "week" && weeklyLoading) ||
    (view === "month" && monthlyLoading);

const isNoWeeklyRoster =
  view === "week" && Boolean(weeklyError);

const isNoMonthlyRoster =
  view === "month" && Boolean(monthlyError);

const isError =
  employeesError ||
  (view === "week" && weeklyError && !isNoWeeklyRoster) ||
  (view === "month" && monthlyError && !isNoMonthlyRoster);
  return (
    <div className="space-y-4 p-4 sm:p-6">
    {downloadStatus && (
  <div
    className={`fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
      downloadStatus.type === "loading"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : downloadStatus.type === "success"
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-red-200 bg-red-50 text-red-700"
    }`}
  >
    {downloadStatus.type === "loading" && "↓ "}
    {downloadStatus.type === "success" && "✓ "}
    {downloadStatus.type === "error" && "✕ "}
    {downloadStatus.message}
  </div>
)}
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Roster
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage employee schedules and shift assignments.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <RosterToolbar
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={handleViewChange}
        onCreateRoster={() =>
          navigate("/rosters/new")
        }
        onGenerateRoster={() => {
          navigate("/team-rosters");
        }}
        showFilters={showFilters}
        onToggleFilters={() =>
          setShowFilters((previous) => !previous)
        }
        filters={filters}
        onFilterChange={setFilters}
        teams={teams}
        employees={employees}
        shifts={shifts}
      />

      {/* Generated Roster Actions */}
<div className="flex flex-wrap items-center justify-end gap-2">
  <button
    type="button"
    onClick={() => handleDownload("ccc")}
    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
      downloaded.ccc
        ? "border-green-300 bg-green-50 text-green-700"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`}
  >
    {downloaded.ccc
      ? "✓ CCC Roster Downloaded"
      : "Download CCC Roster"}
  </button>

  <button
    type="button"
    onClick={() => handleDownload("help-desk")}
    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
      downloaded["help-desk"]
        ? "border-green-300 bg-green-50 text-green-700"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`}
  >
    {downloaded["help-desk"]
      ? "✓ Help Desk Downloaded"
      : "Download Help Desk"}
  </button>
</div>

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Unable to load roster data.
          </p>

          <p className="mt-1 text-xs text-red-600">
            Please check the backend connection and try again.
          </p>
        </div>
      )}

      {/* Loading */}
      {!isLoading && !isError && (isNoWeeklyRoster || isNoMonthlyRoster) && (
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
    <p className="text-sm font-medium text-amber-800">
      No roster has been generated for this period yet.
    </p>

    <p className="mt-1 text-xs text-amber-700">
      Click Generate to create the roster.
    </p>
  </div>
)}

{!isLoading && !isError && !isNoWeeklyRoster && !isNoMonthlyRoster && (
  <ScheduleGrid
    employees={filteredEmployees}
    dates={dates}
    entries={filteredEntries}
    onEntryClick={handleEntryClick}
    onPrevious={handlePrevious}
    onNext={handleNext}
    onToday={handleToday}
  />
)}
    </div>
  );
}

/*
 * ==========================================
 * DATE HELPERS
 * ==========================================
 */

function formatDateOnly(date) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function getStartOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(
    result.getDate() - day
  );

  result.setHours(0, 0, 0, 0);

  return result;
}

function getWeekDates(date) {
  const start = getStartOfWeek(date);

  return Array.from(
    { length: 7 },
    (_, index) => {
      const current = new Date(start);

      current.setDate(
        start.getDate() + index
      );

      return current;
    }
  );
}

function getMonthDates(year, month) {
  const firstDay = new Date(
    year,
    month,
    1
  );

  const lastDay = new Date(
    year,
    month + 1,
    0
  );

  const dates = [];

  for (
    let day = 1;
    day <= lastDay.getDate();
    day += 1
  ) {
    dates.push(
      new Date(
        year,
        month,
        day
      )
    );
  }

  return dates;
}

export default RosterPage;