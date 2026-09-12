import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";

import RosterStepper from "../components/roster/RosterStepper.jsx";
import ShiftSelector from "../components/roster/ShiftSelector.jsx";

import {
  useCreateRosterMutation,
} from "../services/api/rosterApi.js";

import {
  useGetEmployeesQuery,
} from "../services/api/employeeApi.js";

import {
  useGetTeamsQuery,
} from "../services/api/teamApi.js";

const initialForm = {
  employee: "",
  team: "",
  date: "",
  shift: "",
};

function getErrorMessage(error) {
  if (!error) return "";

  if (typeof error === "string") {
    return error;
  }

  return (
    error?.data?.message ||
    error?.error ||
    "Unable to create roster entry."
  );
}

function RosterCreatePage() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftError, setShiftError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [createRoster, { isLoading: isCreating }] =
    useCreateRosterMutation();

  const {
    data: employeesResponse,
    isLoading: employeesLoading,
    isError: employeesError,
  } = useGetEmployeesQuery({
    page: 1,
    limit: 100,
  });

  const {
    data: teamsResponse,
    isLoading: teamsLoading,
    isError: teamsError,
  } = useGetTeamsQuery();

  /*
   * There is intentionally no shiftApi.js in this project.
   * Therefore shifts are loaded from the existing backend endpoint.
   */
  useEffect(() => {
    let cancelled = false;

    const loadShifts = async () => {
      try {
        setShiftsLoading(true);
        setShiftError("");

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/shifts`,
          {
            credentials: "include",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message || "Failed to load shifts."
          );
        }

        if (!cancelled) {
          const shiftData =
            result?.data?.shifts ||
            result?.data ||
            [];

          setShifts(Array.isArray(shiftData) ? shiftData : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Load shifts error:", error);
          setShiftError(
            error?.message || "Failed to load shifts."
          );
        }
      } finally {
        if (!cancelled) {
          setShiftsLoading(false);
        }
      }
    };

    loadShifts();

    return () => {
      cancelled = true;
    };
  }, []);

  const employees = useMemo(() => {
    return (
      employeesResponse?.data?.employees ||
      employeesResponse?.data ||
      []
    );
  }, [employeesResponse]);

  const teams = useMemo(() => {
    return (
      teamsResponse?.data?.teams ||
      teamsResponse?.data ||
      []
    );
  }, [teamsResponse]);

  const selectedEmployee = useMemo(() => {
    return employees.find(
      (employee) =>
        String(employee._id || employee.id) ===
        String(form.employee)
    );
  }, [employees, form.employee]);

  const selectedTeam = useMemo(() => {
    return teams.find(
      (team) =>
        String(team._id || team.id) ===
        String(form.team)
    );
  }, [teams, form.team]);

  const selectedShift = useMemo(() => {
    return shifts.find(
      (shift) =>
        String(shift._id || shift.id) ===
        String(form.shift)
    );
  }, [shifts, form.shift]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSubmitError("");
    setSuccessMessage("");
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!form.employee) {
        setSubmitError("Please select an employee.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.date) {
        setSubmitError("Please select a date.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.shift) {
        setSubmitError("Please select a shift.");
        return false;
      }
    }

    setSubmitError("");
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    setCurrentStep((previous) =>
      Math.min(previous + 1, 4)
    );
  };

  const handleBack = () => {
    setSubmitError("");

    setCurrentStep((previous) =>
      Math.max(previous - 1, 1)
    );
  };

  const handleSubmit = async () => {
    if (!form.employee || !form.date || !form.shift) {
      setSubmitError(
        "Employee, date and shift are required."
      );
      return;
    }

    try {
      setSubmitError("");
      setSuccessMessage("");

      const payload = {
        employee: form.employee,
        date: form.date,
        shift: form.shift,
      };

      if (form.team) {
        payload.team = form.team;
      }

      const response = await createRoster(payload).unwrap();

      setSuccessMessage(
        response?.message || "Roster entry created successfully."
      );

      setTimeout(() => {
        const rosterId =
          response?.data?._id ||
          response?.data?.id ||
          response?.roster?._id ||
          response?.roster?.id;

        if (rosterId) {
          navigate(`/rosters/${rosterId}`);
        } else {
          navigate("/rosters");
        }
      }, 900);
    } catch (error) {
      console.error("Create roster error:", error);
      setSubmitError(getErrorMessage(error));
    }
  };

  const employeeName =
    selectedEmployee?.name ||
    selectedEmployee?.employeeId ||
    "Not selected";

  const teamName =
    selectedTeam?.name ||
    "No team selected";

  const shiftName =
    selectedShift?.name ||
    selectedShift?.shiftName ||
    selectedShift?.type ||
    "Not selected";

  const isLoading =
    employeesLoading ||
    teamsLoading ||
    shiftsLoading;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/rosters"
              className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              title="Back to rosters"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Create Roster
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Create a manual roster assignment.
              </p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <RosterStepper currentStep={currentStep} />
        </div>

        {/* Errors */}
        {(employeesError || teamsError || shiftError) && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {shiftError ||
              "Unable to load the required roster data."}
          </div>
        )}

        {submitError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check size={17} />
            {successMessage}
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Loading */}
          {isLoading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2
                  size={20}
                  className="animate-spin"
                />
                Loading roster data...
              </div>
            </div>
          ) : (
            <>
              {/* Step 1 */}
              {currentStep === 1 && (
                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Select Employee
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Choose the employee for this roster assignment.
                    </p>
                  </div>

                  <div className="max-w-xl">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Employee
                    </label>

                    <select
                      value={form.employee}
                      onChange={(event) =>
                        updateField(
                          "employee",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">
                        Select employee
                      </option>

                      {employees.map((employee) => (
                        <option
                          key={
                            employee._id ||
                            employee.id
                          }
                          value={
                            employee._id ||
                            employee.id
                          }
                        >
                          {employee.name}{" "}
                          {employee.employeeId
                            ? `(${employee.employeeId})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedEmployee && (
                    <div className="mt-6 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">
                        {selectedEmployee.name}
                      </p>

                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-500 sm:grid-cols-2">
                        <span>
                          ID:{" "}
                          {selectedEmployee.employeeId ||
                            "—"}
                        </span>

                        <span>
                          Designation:{" "}
                          {selectedEmployee.designation ||
                            "—"}
                        </span>

                        <span>
                          Status:{" "}
                          {selectedEmployee.status ||
                            "—"}
                        </span>

                        <span>
                          Team:{" "}
                          {selectedEmployee.team?.name ||
                            "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 */}
              {currentStep === 2 && (
                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Select Date
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Choose the date for the roster assignment.
                    </p>
                  </div>

                  <div className="max-w-xl">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Date
                    </label>

                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) =>
                        updateField(
                          "date",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      The backend will validate leave,
                      weekly-off, weekend and scheduling
                      constraints.
                    </p>
                  </div>

                  {form.date && (
                    <div className="mt-6 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-600">
                        Selected date
                      </p>

                      <p className="mt-1 font-medium text-slate-900">
                        {form.date}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && (
                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Select Shift
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Choose the shift for this assignment.
                    </p>
                  </div>

                  <div className="max-w-xl">
                    <ShiftSelector
                      shifts={shifts}
                      value={form.shift}
                      onChange={(value) =>
                        updateField("shift", value)
                      }
                    />
                  </div>

                  {selectedShift && (
                    <div className="mt-6 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Selected shift
                      </p>

                      <p className="mt-1 font-medium text-slate-900">
                        {shiftName}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 */}
              {currentStep === 4 && (
                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Review Roster
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Review the assignment before creating it.
                    </p>
                  </div>

                  <div className="max-w-2xl overflow-hidden rounded-xl border border-slate-200">
                    <div className="divide-y divide-slate-200">
                      <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-slate-500">
                          Employee
                        </span>

                        <span className="font-medium text-slate-900 sm:text-right">
                          {employeeName}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-slate-500">
                          Team
                        </span>

                        <span className="font-medium text-slate-900 sm:text-right">
                          {teamName}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-slate-500">
                          Date
                        </span>

                        <span className="font-medium text-slate-900 sm:text-right">
                          {form.date || "Not selected"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-slate-500">
                          Shift
                        </span>

                        <span className="font-medium text-slate-900 sm:text-right">
                          {shiftName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    The backend remains the source of truth
                    for roster policy validation. If this
                    assignment conflicts with approved leave,
                    shift/team rules, Night restrictions,
                    weekly-off rules or another roster entry,
                    the backend will reject it.
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isCreating}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={17} />
                  Back
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isCreating}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                    <ChevronRight size={17} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isCreating}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save size={17} />
                        Create Roster
                      </>
                    )}
                  </button>
                )}
              </div>
            </> 
          )}
        </div>
      </div>
    </div>
  );
}

export default RosterCreatePage;