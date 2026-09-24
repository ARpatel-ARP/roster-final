import { useNavigate, useParams } from "react-router-dom";
import {
    useDeleteGeneratedRosterMutation,
    useGetRosterByIdQuery,
} from "../../services/api/rosterApi";
import { useState } from "react";

function GeneratedRosterDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [showDeleteWarning, setShowDeleteWarning] = useState(false);

    const {
        data: rosterResponse,
        isLoading,
        isError,
    } = useGetRosterByIdQuery(id);

    const [deleteGeneratedRoster, { isLoading: isDeleting }] =
        useDeleteGeneratedRosterMutation();

    const roster = rosterResponse?.data;

    const handleDelete = async () => {
        try {
            await deleteGeneratedRoster(id).unwrap();
            navigate("/rosters");
        } catch (error) {
            console.error("Generated roster deletion failed:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6">
                <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
                    Loading generated roster...
                </div>
            </div>
        );
    }

    if (isError || !roster) {
        return (
            <div className="p-4 sm:p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                    <p className="font-medium text-red-800">
                        Unable to load generated roster.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/rosters")}
                        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                    >
                        Back to Roster
                    </button>
                </div>
            </div>
        );
    }

    const employee =
        typeof roster.employee === "object"
            ? roster.employee
            : null;

    const team =
        typeof roster.team === "object"
            ? roster.team
            : null;

    const shift =
        typeof roster.shift === "object"
            ? roster.shift
            : null;

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                        Generated Roster Details
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        View and manage this generated roster assignment.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            navigate(`/generated-rosters/${id}/edit`)
                        }
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowDeleteWarning(true)}
                        disabled={isDeleting}
                        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>

            {showDeleteWarning && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-800">
                        Delete this generated roster assignment?
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                        This action cannot be undone.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {isDeleting ? "Deleting..." : "Yes, Delete"}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowDeleteWarning(false)}
                            disabled={isDeleting}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <DetailItem
                        label="Employee"
                        value={employee?.name || "—"}
                    />

                    <DetailItem
                        label="Employee ID"
                        value={employee?.employeeId || "—"}
                    />

                    <DetailItem
                        label="Designation"
                        value={employee?.designation || "—"}
                    />

                    <DetailItem
                        label="Team"
                        value={team?.name || "—"}
                    />

                    <DetailItem
                        label="Date"
                        value={formatDate(roster.date)}
                    />

                    <DetailItem
                        label="Shift"
                        value={shift?.name || shift?.shiftName || "—"}
                    />

                    <DetailItem
                        label="Roster Type"
                        value="Generated"
                    />

                    <DetailItem
                        label="Status"
                        value={roster.status || "Active"}
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={() => navigate("/rosters")}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                Back to Roster
            </button>
        </div>
    );
}

function DetailItem({ label, value }) {
    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-medium text-slate-900">
                {value}
            </p>
        </div>
    );
}

function formatDate(date) {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "—";
    }

    return parsed.toLocaleDateString();
}

export default GeneratedRosterDetailsPage;