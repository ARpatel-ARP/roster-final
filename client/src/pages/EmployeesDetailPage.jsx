import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Edit,
    Trash2,
} from "lucide-react";

import {
    useDeleteEmployeeMutation,
    useGetEmployeeByIdQuery,
} from "../services/api/employeeApi";
import { useGetLeaveBalanceQuery } from "../services/api/leaveApi";

function EmployeeDetailsPage() {
    const { id } = useParams();
    const currentYear = new Date().getFullYear();

    const {
        data: leaveBalanceResponse,
        isLoading: isLoadingLeaveBalance,
    } = useGetLeaveBalanceQuery({
        employeeId: id,
        year: currentYear,
    });
    const navigate = useNavigate();

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const {
        data: employeeResponse,
        isLoading,
        isError,
    } = useGetEmployeeByIdQuery(id);

    const [deleteEmployee, { isLoading: isDeleting }] =
        useDeleteEmployeeMutation();

    const employee = employeeResponse?.data;

    const handleDelete = async () => {
        setDeleteError("");

        try {
            await deleteEmployee(id).unwrap();

            navigate("/employees", { replace: true });
        } catch (error) {
            setDeleteError(
                error?.data?.message ||
                "Unable to delete this employee."
            );
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-10 text-center">
                    <p className="text-sm text-slate-500">
                        Loading employee...
                    </p>
                </div>
            </div>
        );
    }

    if (isError || !employee) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-red-50 p-10 text-center">
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
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        to="/employees"
                        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft size={16} />
                        Back to Employees
                    </Link>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Link
                            to={`/employees/${id}/edit`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            <Edit size={16} />
                            Edit Employee
                        </Link>

                        <button
                            type="button"
                            onClick={() => {
                                setDeleteError("");
                                setShowDeleteConfirm(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                            <Trash2 size={16} />
                            Delete Employee
                        </button>
                    </div>
                </div>

                {/* Employee heading */}
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700">
                            {employee.name?.charAt(0)?.toUpperCase() || "E"}
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold text-slate-900">
                                {employee.name}
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                {employee.designation}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    {employee.employeeId}
                                </span>

                                <span
                                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${employee.status === "Active"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : employee.status === "On Leave"
                                            ? "bg-amber-50 text-amber-700"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    {employee.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee information */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                            <h2 className="font-semibold text-slate-900">
                                Employee Information
                            </h2>
                        </div>

                        <div className="divide-y divide-slate-100">
                            <DetailRow
                                label="Employee ID"
                                value={employee.employeeId}
                            />

                            <DetailRow
                                label="Full Name"
                                value={employee.name}
                            />

                            <DetailRow
                                label="Designation"
                                value={employee.designation}
                            />

                            <DetailRow
                                label="Team"
                                value={
                                    employee.team?.name ||
                                    employee.team ||
                                    "—"
                                }
                            />

                            <DetailRow
                                label="Mobile"
                                value={employee.mobile}
                            />

                            <DetailRow
                                label="Email"
                                value={employee.email}
                            />

                            <DetailRow
                                label="Joining Date"
                                value={
                                    employee.joiningDate
                                        ? new Date(
                                            employee.joiningDate
                                        ).toLocaleDateString("en-IN")
                                        : "—"
                                }
                            />

                            <DetailRow
                                label="Experience"
                                value={
                                    employee.experience !== undefined &&
                                        employee.experience !== null
                                        ? `${employee.experience} years`
                                        : "—"
                                }
                            />
                        </div>
                    </section>
                    
                    {/* LeaveBalance */}

                    <div className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900">
                                        Leave Balance
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Leave summary for {currentYear}
                                    </p>
                                </div>

                                <span className="text-xs font-medium text-slate-500">
                                    {currentYear}
                                </span>
                            </div>
                        </div>

                        <div className="p-5">
                            {isLoadingLeaveBalance ? (
                                <p className="text-sm text-slate-500">
                                    Loading leave balance...
                                </p>
                            ) : !leaveBalanceResponse?.data ? (
                                <p className="text-sm text-slate-500">
                                    Leave balance information is not available.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-medium text-slate-500">
                                            Annual Entitlement
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                                            {leaveBalanceResponse.data.annualEntitlement ?? 0}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-medium text-slate-500">
                                            Accrued Leave
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                                            {leaveBalanceResponse.data.accrued ?? 0}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-medium text-slate-500">
                                            Paid Leave Used
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                                            {leaveBalanceResponse.data.paidLeaveUsed ?? 0}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-medium text-slate-500">
                                            Available Paid Leave
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                                            {leaveBalanceResponse.data.availablePaidLeave ?? 0}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Roster preferences */}
                    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                            <h2 className="font-semibold text-slate-900">
                                Roster Preferences
                            </h2>
                        </div>

                        <div className="divide-y divide-slate-100">
                            <DetailRow
                                label="Preferred Shift"
                                value={employee.preferredShift || "—"}
                            />

                            <DetailRow
                                label="Preferred Weekly Off"
                                value={employee.preferredWeeklyOff || "—"}
                            />

                            <DetailRow
                                label="Night Shift"
                                value={
                                    employee.nightAllowed
                                        ? "Allowed"
                                        : "Not Allowed"
                                }
                            />

                            <DetailRow
                                label="Maximum Nights / Month"
                                value={
                                    employee.maxNightPerMonth ??
                                    "—"
                                }
                            />

                            <DetailRow
                                label="Status"
                                value={employee.status || "—"}
                            />

                            <DetailRow
                                label="Remarks"
                                value={employee.remarks || "—"}
                            />
                        </div>
                    </section>
                </div>

                {/* Delete error */}
                {deleteError && !showDeleteConfirm && (
                    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {deleteError}
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                            <Trash2
                                size={20}
                                className="text-red-600"
                            />
                        </div>

                        <h2 className="text-lg font-semibold text-slate-900">
                            Delete Employee?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Are you sure you want to permanently delete{" "}
                            <span className="font-medium text-slate-700">
                                {employee.name}
                            </span>
                            ? This action cannot be undone.
                        </p>

                        {deleteError && (
                            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                                {deleteError}
                            </div>
                        )}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteError("");
                                }}
                                disabled={isDeleting}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isDeleting
                                    ? "Deleting..."
                                    : "Yes, Delete Employee"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-6">
            <span className="text-sm text-slate-500">
                {label}
            </span>

            <span className="break-words text-sm font-medium text-slate-900 sm:max-w-[60%] sm:text-right">
                {value}
            </span>
        </div>
    );
}

export default EmployeeDetailsPage;