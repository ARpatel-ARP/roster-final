import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import {
  useCreateEmployeeMutation,
  useGetDistinctTeamsQuery,
  useGetEmployeeByIdQuery,
  useUpdateEmployeeMutation,
} from "../services/api/employeeApi";

const initialFormData = {
  employeeId: "",
  name: "",
  designation: "",
  team: "",
  mobile: "",
  email: "",
  joiningDate: "",
  experience: "",
  nightAllowed: true,
  maxNightPerMonth: 6,
  preferredShift: "General",
  preferredWeeklyOff: "Sunday",
  status: "Active",
  remarks: "",
};

function EmployeeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createEmployee, { isLoading: isCreating }] =
    useCreateEmployeeMutation();

  const [updateEmployee, { isLoading: isUpdating }] =
    useUpdateEmployeeMutation();

  const {
    data: employeeResponse,
    isLoading: employeeLoading,
    isError: employeeFetchError,
  } = useGetEmployeeByIdQuery(id, {
    skip: !isEditMode,
  });

  const {
    data: teamsResponse,
    isLoading: teamsLoading,
  } = useGetDistinctTeamsQuery();

  const teams = teamsResponse?.data || [];

  useEffect(() => {
    if (!isEditMode || !employeeResponse?.data) return;

    const employee = employeeResponse.data;

    setFormData({
      employeeId: employee.employeeId || "",
      name: employee.name || "",
      designation: employee.designation || "",
      team: employee.team?._id || employee.team || "",
      mobile: employee.mobile || "",
      email: employee.email || "",
      joiningDate: employee.joiningDate
        ? new Date(employee.joiningDate).toISOString().split("T")[0]
        : "",
      experience: employee.experience ?? "",
      nightAllowed: employee.nightAllowed ?? true,
      maxNightPerMonth: employee.maxNightPerMonth ?? 6,
      preferredShift: employee.preferredShift || "General",
      preferredWeeklyOff: employee.preferredWeeklyOff || "Sunday",
      status: employee.status || "Active",
      remarks: employee.remarks || "",
    });
  }, [employeeResponse, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    try {
      const commonPayload = {
        name: formData.name.trim(),
        designation: formData.designation.trim(),
        team: formData.team,
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        joiningDate: formData.joiningDate,
        experience:
          formData.experience === ""
            ? undefined
            : Number(formData.experience),
        nightAllowed: formData.nightAllowed,
        maxNightPerMonth: Number(formData.maxNightPerMonth),
        preferredShift: formData.preferredShift,
        preferredWeeklyOff: formData.preferredWeeklyOff,
        status: formData.status,
        remarks: formData.remarks.trim(),
      };

      if (isEditMode) {
        const response = await updateEmployee({
          id,
          ...commonPayload,
        }).unwrap();

        setSuccess(
          response?.message || "Employee updated successfully."
        );

        setTimeout(() => {
          navigate(`/employees/${id}`);
        }, 800);
      } else {
        const response = await createEmployee({
          employeeId: formData.employeeId.trim(),
          ...commonPayload,
        }).unwrap();

        setSuccess(
          response?.message || "Employee created successfully."
        );

        setTimeout(() => {
          navigate(`/employees/${response.data._id}`);
        }, 800);
      }
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.error ||
          `Failed to ${
            isEditMode ? "update" : "create"
          } employee.`
      );
    }
  };

  const isSubmitting = isCreating || isUpdating;

  if (isEditMode && employeeLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Loading employee...
          </p>
        </div>
      </div>
    );
  }

  if (isEditMode && employeeFetchError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 p-10 text-center">
          <p className="text-sm text-red-600">
            Failed to load employee details.
          </p>

          <Link
            to="/employees"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            to={isEditMode ? `/employees/${id}` : "/employees"}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            {isEditMode
              ? "Back to Employee"
              : "Back to Employees"}
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            {isEditMode ? "Edit Employee" : "Add Employee"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {isEditMode
              ? "Update employee information and roster preferences."
              : "Add a new employee to the roster management system."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Employee Information */}
          <section>
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900">
                Employee Information
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              {/* Employee ID */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Employee ID
                  {!isEditMode && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>

                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required={!isEditMode}
                  disabled={isEditMode}
                  placeholder="e.g. WIN001"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                />

                {isEditMode && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Employee ID cannot be changed.
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter employee name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Designation <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  required
                  placeholder="e.g. System Administrator"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              {/* Team */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Team <span className="text-red-500">*</span>
                </label>

                <select
                  name="team"
                  value={formData.team}
                  onChange={handleChange}
                  required
                  disabled={teamsLoading}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {teamsLoading
                      ? "Loading teams..."
                      : "Select team"}
                  </option>

                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mobile <span className="text-red-500">*</span>
                </label>

                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  required
                  placeholder="Enter mobile number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email <span className="text-red-500">*</span>
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="employee@example.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              {/* Joining Date */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Joining Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>

              {/* Experience */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Experience (Years)
                </label>

                <input
                  type="number"
                  name="experience"
                  min="0"
                  step="0.1"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g. 2"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>
            </div>
          </section>

          {/* Roster Preferences */}
          <section className="border-t border-slate-200">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900">
                Roster Preferences
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              {/* Preferred Shift */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Preferred Shift
                </label>

                <select
                  name="preferredShift"
                  value={formData.preferredShift}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="Morning">Morning</option>
                  <option value="General">General</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              {/* Weekly Off */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Preferred Weekly Off
                </label>

                <select
                  name="preferredWeeklyOff"
                  value={formData.preferredWeeklyOff}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>

              {/* Maximum Nights */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Maximum Nights / Month
                </label>

                <input
                  type="number"
                  name="maxNightPerMonth"
                  min="0"
                  value={formData.maxNightPerMonth}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              {/* Night Allowed */}
              <div className="flex items-center sm:pt-7">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="nightAllowed"
                    checked={formData.nightAllowed}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Night shift allowed
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Additional Information */}
          <section className="border-t border-slate-200">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900">
                Additional Information
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6">
              {/* Status */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Remarks
                </label>

                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Additional notes about the employee..."
                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>
            </div>
          </section>

          {/* Messages */}
          {(error || success) && (
            <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end sm:p-6">
            <Link
              to={isEditMode ? `/employees/${id}` : "/employees"}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Employee"
                : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeFormPage;