import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Edit,
  Trash2,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import {
  useGetLeaveByIdQuery,
  useDeleteLeaveMutation,
} from "../services/api/leaveApi.js";

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

  return (
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
    ) + 1
  );
}

function getStatusClasses(status) {
  switch (status) {
    case "Approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "Pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function LeaveDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const {
    data,
    isLoading,
    isError,
    error,
  } = useGetLeaveByIdQuery(id);

  const [deleteLeave, { isLoading: isDeleting }] =
    useDeleteLeaveMutation();

  const leave = data?.data;

  const handleDelete = async () => {
    setDeleteError("");

    try {
      await deleteLeave(id).unwrap();

      setShowDeleteModal(false);
      navigate("/leaves");
    } catch (deleteErrorResponse) {
      console.error("Delete leave error:", deleteErrorResponse);

      setDeleteError(
        deleteErrorResponse?.data?.message ||
          "Unable to delete this leave."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Loading leave details...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !leave) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/leaves"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Back to Leaves
          </Link>

          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-sm font-semibold text-red-700">
                  Unable to load leave
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {error?.data?.message ||
                    "The requested leave could not be found."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const employee = leave.employee;

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          to="/leaves"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={17} />
          Back to Leaves
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <CalendarDays size={21} />
            </div>

            <div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Leave Details
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                View leave request information
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              to={`/leaves/${id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Edit size={17} />
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

        {/* Status */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Current Status
              </p>

              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${getStatusClasses(
                    leave.status
                  )}`}
                >
                  {leave.status === "Approved" && (
                    <CheckCircle2 size={15} />
                  )}

                  {leave.status}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Leave ID
              </p>

              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {leave._id}
              </p>
            </div>
          </div>
        </div>

        {/* Employee */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Employee Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <User
                size={18}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div>
                <p className="text-xs text-slate-400">
                  Employee
                </p>

                <Link
                  to={
                    employee?._id
                      ? `/employees/${employee._id}`
                      : "#"
                  }
                  className="mt-1 block text-sm font-medium text-slate-900 hover:underline"
                >
                  {employee?.name || "-"}
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Employee ID
              </p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {employee?.employeeId || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Designation
              </p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {employee?.designation || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Leave Information */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Leave Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-slate-400">
                Start Date
              </p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatDate(leave.startDate)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                End Date
              </p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatDate(leave.endDate)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Total Days
              </p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {calculateLeaveDays(
                  leave.startDate,
                  leave.endDate
                )}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs text-slate-400">
                Reason
              </p>

              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {leave.reason || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Approval */}
        {leave.approvedBy && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Approval Information
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">
                  Approved By
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {leave.approvedBy.name || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Email
                </p>

                <p className="mt-1 break-all text-sm text-slate-700">
                  {leave.approvedBy.email || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Role
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {leave.approvedBy.role || "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                  <Trash2
                    size={18}
                    className="text-red-600"
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Delete leave?
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    This action cannot be undone. The leave
                    record will be permanently removed if the
                    backend allows deletion.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />

                    <div>
                      <p className="text-sm font-medium text-red-700">
                        Cannot delete leave
                      </p>

                      <p className="mt-1 text-sm leading-5 text-red-600">
                        {deleteError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError("");
                    setShowDeleteModal(false);
                  }}
                  disabled={isDeleting}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete Leave"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaveDetailsPage;