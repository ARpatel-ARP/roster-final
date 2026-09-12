import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Edit3,
  Loader2,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  useGetRosterByIdQuery,
  useDeleteRosterMutation,
} from "../services/api/rosterApi.js";

function getErrorMessage(error) {
  if (!error) return "";

  return (
    error?.data?.message ||
    error?.error ||
    "Unable to complete this action."
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getEmployee(roster) {
  return roster?.employee || null;
}

function getTeam(roster) {
  return roster?.team || null;
}

function getShift(roster) {
  return roster?.shift || null;
}

function RosterDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);
  const [deleteError, setDeleteError] = useState("");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetRosterByIdQuery(id, {
    skip: !id,
  });

  const [
    deleteRoster,
    { isLoading: isDeleting },
  ] = useDeleteRosterMutation();

  const roster =
    data?.data ||
    data?.roster ||
    data;

  const employee = getEmployee(roster);
  const team = getTeam(roster);
  const shift = getShift(roster);

  const employeeName =
    employee?.name ||
    "Unknown employee";

  const employeeId =
    employee?.employeeId ||
    employee?.id ||
    employee?._id ||
    "—";

  const teamName =
    team?.name ||
    "—";

  const shiftName =
    shift?.name ||
    shift?.shiftName ||
    shift?.type ||
    "—";

  const handleDelete = async () => {
    try {
      setDeleteError("");

      await deleteRoster(id).unwrap();

      navigate("/rosters");
    } catch (deleteRequestError) {
      console.error(
        "Delete roster error:",
        deleteRequestError
      );

      setDeleteError(
        getErrorMessage(deleteRequestError)
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2
            size={20}
            className="animate-spin"
          />
          Loading roster details...
        </div>
      </div>
    );
  }

  if (isError || !roster) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            to="/rosters"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Back to Rosters
          </Link>

          <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              Unable to load roster
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {getErrorMessage(error) ||
                "The requested roster entry could not be found."}
            </p>

            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/rosters"
              className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              title="Back to rosters"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <p className="text-sm text-slate-500">
                Roster Details
              </p>

              <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
                {employeeName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {formatDate(roster.date)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to={`/rosters/${id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Edit3 size={17} />
              Edit
            </Link>

            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={17} />
              Delete
            </button>
          </div>
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Top summary */}
          <div className="border-b border-slate-200 p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <UserRound size={25} />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">
                  {employeeName}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Employee ID: {employeeId}
                </p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2">

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                  <UserRound size={18} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Employee
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {employeeName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {employeeId}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                  <Users size={18} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Team
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {teamName}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                  <CalendarDays size={18} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDate(roster.date)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                  <Clock3 size={18} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Shift
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {shiftName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional information */}
          <div className="border-t border-slate-200 p-5 sm:p-7">
            <h2 className="text-base font-semibold text-slate-900">
              Assignment Information
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Assignment ID
                </p>

                <p className="mt-1 break-all text-sm text-slate-700">
                  {roster._id ||
                    roster.id ||
                    id}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Type
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {roster.manuallyEdited
                    ? "Manual"
                    : "Generated"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {roster.isWeeklyOff
                    ? "Weekly Off"
                    : roster.isLeave
                    ? "Leave"
                    : roster.isHoliday
                    ? "Holiday"
                    : "Working Assignment"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Delete Roster
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                disabled={isDeleting}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm leading-6 text-slate-600">
                Are you sure you want to delete this roster
                assignment for{" "}
                <span className="font-medium text-slate-900">
                  {employeeName}
                </span>{" "}
                on{" "}
                <span className="font-medium text-slate-900">
                  {formatDate(roster.date)}
                </span>
                ?
              </p>

              {deleteError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                disabled={isDeleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {isDeleting
                  ? "Deleting..."
                  : "Delete Roster"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RosterDetailsPage;