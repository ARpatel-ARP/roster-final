import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Users,
} from "lucide-react";
import {
    useDeleteTeamMutation,
    useGetTeamByIdQuery,
} from "../services/api/teamApi";
import { useGetEmployeesQuery } from "../services/api/employeeApi";

function TeamDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const {
        data: teamResponse,
        isLoading,
        isError,
        error,
    } = useGetTeamByIdQuery(id);

    const { data: employeesResponse } = useGetEmployeesQuery({
        page: 1,
        limit: 100,
    });

    const [deleteTeam, { isLoading: deleting }] = useDeleteTeamMutation();

    const team = teamResponse?.data;

    const teamEmployees =
        employeesResponse?.data?.filter(
            (employee) =>
                employee.team?._id === id || employee.team === id
        ) || [];

    const handleDelete = async () => {
        setDeleteError("");

        try {
            await deleteTeam(id).unwrap();

            setShowDeleteModal(false);
            navigate("/teams");
        } catch (error) {
            console.error("Delete team error:", error);

            setDeleteError(
                error?.data?.message ||
                "Unable to delete this team."
            );
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm text-slate-500">
                        Loading team details...
                    </p>
                </div>
            </div>
        );
    }

    if (isError || !team) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-white p-6">
                    <p className="font-medium text-red-600">
                        Failed to load team details.
                    </p>

                    {error?.data?.message && (
                        <p className="mt-1 text-sm text-slate-500">
                            {error.data.message}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() => navigate("/teams")}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                        <ArrowLeft size={17} />
                        Back to Teams
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl">
                {/* Back */}
                <button
                    type="button"
                    onClick={() => navigate("/teams")}
                    className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft size={18} />
                    Back to Teams
                </button>

                {/* Team Header */}
                <div className="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                                <Users
                                    size={23}
                                    className="text-slate-600"
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                                        {team.name}
                                    </h1>

                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${team.status === "Active"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                            }`}
                                    >
                                        {team.status}
                                    </span>
                                </div>

                                {team.description && (
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                        {team.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                            <Link
                                to={`/teams/${id}/edit`}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex-none"
                            >
                                <Edit size={17} />
                                Edit
                            </Link>

                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(true)}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 sm:flex-none"
                            >
                                <Trash2 size={17} />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>

                {/* Team Information */}
                <div className="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                        <h2 className="font-semibold text-slate-900">
                            Team Information
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Team Name
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                                {team.name}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Status
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                                {team.status}
                            </p>
                        </div>

                        <div className="sm:col-span-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Description
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-700">
                                {team.description || "No description provided."}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Manager
                            </p>

                            {team.manager ? (
                                <Link
                                    to={`/employees/${team.manager._id}`}
                                    className="mt-1 block"
                                >
                                    <p className="text-sm font-medium text-slate-900 hover:underline">
                                        {team.manager.name}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {team.manager.employeeId}
                                    </p>

                                    {team.manager.email && (
                                        <p className="mt-0.5 break-all text-xs text-slate-500">
                                            {team.manager.email}
                                        </p>
                                    )}
                                </Link>
                            ) : (
                                <p className="mt-1 text-sm text-slate-400">
                                    No manager assigned.
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Team Members
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-900">
                                {teamEmployees.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Team Employees */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Team Members
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Employees currently assigned to this team.
                            </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {teamEmployees.length}
                        </span>
                    </div>

                    {teamEmployees.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                            <Users
                                size={25}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-2 text-sm text-slate-500">
                                No employees are assigned to this team.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[650px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6">
                                            Employee
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Employee ID
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Designation
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Status
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {teamEmployees.map((employee) => (
                                        <tr
                                            key={employee._id}
                                            onClick={() =>
                                                navigate(`/employees/${employee._id}`)
                                            }
                                            className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                        >
                                            <td className="px-4 py-4 sm:px-6">
                                                <p className="text-sm font-medium text-slate-900">
                                                    {employee.name}
                                                </p>

                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {employee.email}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {employee.employeeId}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {employee.designation}
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${employee.status === "Active"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : employee.status === "On Leave"
                                                            ? "bg-amber-50 text-amber-700"
                                                            : "bg-slate-100 text-slate-600"
                                                        }`}
                                                >
                                                    {employee.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Delete Team?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Are you sure you want to delete{" "}
                            <span className="font-medium text-slate-700">
                                {team.name}
                            </span>
                            ? This action cannot be undone.
                        </p>

                        {teamEmployees.length > 0 && (
                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <p className="text-sm text-amber-700">
                                    This team currently has{" "}
                                    <span className="font-semibold">
                                        {teamEmployees.length}
                                    </span>{" "}
                                    employee
                                    {teamEmployees.length === 1 ? "" : "s"} assigned.
                                    The backend will prevent deletion until they are
                                    reassigned.
                                </p>
                            </div>
                        )}
                        {deleteError && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />

                                    <div>
                                        <p className="text-sm font-medium text-red-700">
                                            Cannot delete team
                                        </p>

                                        <p className="mt-1 text-sm leading-5 text-red-600">
                                            {deleteError}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteError("");
                                }}
                                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => {
                                    setDeleteError("");
                                    handleDelete();
                                }}
                                className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                {deleting ? "Deleting..." : "Delete Team"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeamDetailsPage;