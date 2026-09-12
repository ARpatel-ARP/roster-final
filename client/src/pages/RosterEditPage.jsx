import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  useGetRosterByIdQuery,
  useGetShiftsQuery,
  useUpdateRosterMutation,
} from "../services/api/rosterApi";

function formatDateForInput(date) {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  return d.toISOString().split("T")[0];
}

export default function RosterEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: rosterResponse,
    isLoading: rosterLoading,
    isError: rosterError,
  } = useGetRosterByIdQuery(id);

  const {
    data: shiftResponse,
    isLoading: shiftsLoading,
  } = useGetShiftsQuery();

  const [updateRoster, { isLoading: isUpdating }] =
    useUpdateRosterMutation();

  const roster = rosterResponse?.data;

  const shifts = useMemo(() => {
    return Array.isArray(shiftResponse?.data)
      ? shiftResponse.data
      : [];
  }, [shiftResponse]);

  const [date, setDate] = useState("");
  const [shift, setShift] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!roster) return;

    setDate(formatDateForInput(roster.date));
    setShift(roster.shift?._id || roster.shift || "");
  }, [roster]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!date || !shift) {
      setError("Date and shift are required.");
      return;
    }

    try {
      await updateRoster({
        id,
        date,
        shift,
      }).unwrap();

      setSuccess("Roster assignment updated successfully.");

      setTimeout(() => {
        navigate(`/rosters/${id}`);
      }, 700);
    } catch (err) {
      setError(
        err?.data?.message ||
          "Failed to update roster assignment."
      );
    }
  };

  if (rosterLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
          Loading roster...
        </div>
      </div>
    );
  }

  if (rosterError || !roster) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Failed to load roster.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(`/rosters/${id}`)}
            className="mb-3 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to roster details
          </button>

          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Edit Roster Assignment
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Update the date or shift for this roster assignment.
          </p>
        </div>

        {/* Employee information */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Employee
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">
                Employee ID
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {roster.employee?.employeeId || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Name
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {roster.employee?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Team
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {roster.employee?.team?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Designation
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {roster.employee?.designation || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <h2 className="mb-5 text-sm font-semibold text-slate-900">
            Assignment
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Date */}
            <div>
              <label
                htmlFor="roster-date"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Date
              </label>

              <input
                id="roster-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Shift */}
            <div>
              <label
                htmlFor="roster-shift"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Shift
              </label>

              <select
                id="roster-shift"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                disabled={shiftsLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              >
                <option value="">
                  {shiftsLoading
                    ? "Loading shifts..."
                    : "Select shift"}
                </option>

                {shifts.map((item) => (
                  <option
                    key={item._id}
                    value={item._id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm text-emerald-700">
                {success}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(`/rosters/${id}`)}
              disabled={isUpdating}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUpdating || shiftsLoading}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}