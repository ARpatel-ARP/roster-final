import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Save } from "lucide-react";

import {
  useCreateLeaveMutation,
  useGetLeaveByIdQuery,
  useUpdateLeaveMutation,
} from "../services/api/leaveApi.js";

import { useGetEmployeesQuery } from "../services/api/employeeApi.js";

function formatDateForInput(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function LeaveFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    employee: "",
    startDate: "",
    endDate: "",
    reason: "",
    status: "Pending",
  });

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const {
    data: leaveResponse,
    isLoading: isLoadingLeave,
    isError: isLeaveError,
  } = useGetLeaveByIdQuery(id, {
    skip: !isEditMode,
  });

  const {
    data: employeesResponse,
    isLoading: isLoadingEmployees,
  } = useGetEmployeesQuery({
    page: 1,
    limit: 100,
  });

  const employees = employeesResponse?.data || [];

  const [createLeave, { isLoading: isCreating }] =
    useCreateLeaveMutation();

  const [updateLeave, { isLoading: isUpdating }] =
    useUpdateLeaveMutation();

  const isSubmitting = isCreating || isUpdating;

  useEffect(() => {
    if (!isEditMode || !leaveResponse?.data) return;

    const leave = leaveResponse.data;

    setFormData({
      employee: leave.employee?._id || leave.employee || "",
      startDate: formatDateForInput(leave.startDate),
      endDate: formatDateForInput(leave.endDate),
      reason: leave.reason || "",
      status: leave.status || "Pending",
    });
  }, [isEditMode, leaveResponse]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setFormError("");
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.employee) {
      errors.employee = "Please select an employee.";
    }

    if (!formData.startDate) {
      errors.startDate = "Start date is required.";
    }

    if (!formData.endDate) {
      errors.endDate = "End date is required.";
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      errors.endDate = "End date cannot be before start date.";
    }

    if (!formData.reason.trim()) {
      errors.reason = "Reason is required.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!validateForm()) {
      return;
    }

    const payload = {
      employee: formData.employee,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason.trim(),
      status: formData.status,
    };

    try {
      if (isEditMode) {
        await updateLeave({
          id,
          ...payload,
        }).unwrap();

        navigate(`/leaves/${id}`);
      } else {
        const response = await createLeave(payload).unwrap();

        const createdLeaveId = response?.data?._id;

        if (createdLeaveId) {
          navigate(`/leaves/${createdLeaveId}`);
        } else {
          navigate("/leaves");
        }
      }
    } catch (error) {
      console.error("Leave save error:", error);

      setFormError(
        error?.data?.message ||
          "Unable to save leave. Please check the details and try again."
      );
    }
  };

  if (isEditMode && isLoadingLeave) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Loading leave details...
          </p>
        </div>
      </div>
    );
  }

  if (isEditMode && isLeaveError) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/leaves"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Back to Leaves
          </Link>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              Unable to load leave details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <Link
          to={isEditMode ? `/leaves/${id}` : "/leaves"}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={17} />
          {isEditMode ? "Back to Leave" : "Back to Leaves"}
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <CalendarDays size={21} />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {isEditMode ? "Edit Leave" : "Add Leave"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {isEditMode
                ? "Update employee leave information"
                : "Create a new employee leave request"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Leave Information
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Enter the leave details below.
            </p>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {/* Form error */}
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">
                  Unable to save leave
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {formError}
                </p>
              </div>
            )}

            {/* Employee */}
            <div>
              <label
                htmlFor="employee"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Employee <span className="text-red-500">*</span>
              </label>

              <select
                id="employee"
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                disabled={isLoadingEmployees || isSubmitting}
                className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-slate-100 ${
                  fieldErrors.employee
                    ? "border-red-300 focus:border-red-400"
                    : "border-slate-200 focus:border-slate-400"
                } disabled:cursor-not-allowed disabled:bg-slate-50`}
              >
                <option value="">
                  {isLoadingEmployees
                    ? "Loading employees..."
                    : "Select employee"}
                </option>

                {employees
                  .filter((employee) => employee.status === "Active")
                  .map((employee) => (
                    <option
                      key={employee._id}
                      value={employee._id}
                    >
                      {employee.employeeId} — {employee.name}
                    </option>
                  ))}
              </select>

              {fieldErrors.employee && (
                <p className="mt-1.5 text-xs text-red-600">
                  {fieldErrors.employee}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Start Date{" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-slate-100 ${
                    fieldErrors.startDate
                      ? "border-red-300 focus:border-red-400"
                      : "border-slate-200 focus:border-slate-400"
                  } disabled:cursor-not-allowed disabled:bg-slate-50`}
                />

                {fieldErrors.startDate && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  End Date{" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  min={formData.startDate || undefined}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-slate-100 ${
                    fieldErrors.endDate
                      ? "border-red-300 focus:border-red-400"
                      : "border-slate-200 focus:border-slate-400"
                  } disabled:cursor-not-allowed disabled:bg-slate-50`}
                />

                {fieldErrors.endDate && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.endDate}
                  </p>
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label
                htmlFor="reason"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Reason <span className="text-red-500">*</span>
              </label>

              <textarea
                id="reason"
                name="reason"
                rows={4}
                value={formData.reason}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="Enter the reason for leave..."
                className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-100 ${
                  fieldErrors.reason
                    ? "border-red-300 focus:border-red-400"
                    : "border-slate-200 focus:border-slate-400"
                } disabled:cursor-not-allowed disabled:bg-slate-50`}
              />

              {fieldErrors.reason && (
                <p className="mt-1.5 text-xs text-red-600">
                  {fieldErrors.reason}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:max-w-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <p className="mt-1.5 text-xs text-slate-400">
                Approval information is handled by the backend.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Link
              to={isEditMode ? `/leaves/${id}` : "/leaves"}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />

              {isSubmitting
                ? "Saving..."
                : isEditMode
                ? "Save Changes"
                : "Create Leave"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LeaveFormPage;