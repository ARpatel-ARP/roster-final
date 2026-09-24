import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  useCreateTeamMutation,
  useGetTeamByIdQuery,
  useUpdateTeamMutation,
} from "../services/api/teamApi";
import { useGetEmployeesQuery } from "../services/api/employeeApi";
import { useForm } from "react-hook-form";

function TeamFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      manager: "",
      status: "active",
    },
  });

  const {
    data: teamResponse,
    isLoading: teamLoading,
    isError: teamError,
  } = useGetTeamByIdQuery(id, {
    skip: !isEditMode,
  });

  const {
    data: employeesResponse,
    isLoading: employeesLoading,
  } = useGetEmployeesQuery({
    page: 1,
    limit: 100,
  });

  const [createTeam, { isLoading: creating }] = useCreateTeamMutation();
  const [updateTeam, { isLoading: updating }] = useUpdateTeamMutation();

  const employees = useMemo(() => {
    return (employeesResponse?.data || []).filter(
      (employee) => employee.status === "Active"
    );
  }, [employeesResponse]);

  useEffect(() => {
    if (isEditMode && teamResponse?.data) {
      const team = teamResponse.data;

      reset({
        name: team.name || "",
        description: team.description || "",
        manager: team.manager?._id || "",
        status: team.status || "active",
      });
    }
  }, [isEditMode, teamResponse, reset]);

  const onSubmit = async (formData) => {
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        manager: formData.manager || null,
        status: formData.status,
      };

      if (isEditMode) {
        await updateTeam({
          id,
          ...payload,
        }).unwrap();
      } else {
        await createTeam(payload).unwrap();
      }

      navigate("/teams");
    } catch (error) {
      console.error(
        isEditMode ? "Update team error:" : "Create team error:",
        error?.data
      );
    }
  };

  if (isEditMode && teamLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Loading team...</p>
        </div>
      </div>
    );
  }

  if (isEditMode && teamError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-white p-6">
          <p className="text-sm text-red-600">
            Failed to load team details.
          </p>
          <button
            type="button"
            onClick={() => navigate("/teams")}
            className="mt-4 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => navigate("/teams")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Back to Teams
        </button>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
            <h1 className="text-xl font-semibold text-slate-900">
              {isEditMode ? "Edit Team" : "Create Team"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {isEditMode
                ? "Update the team information and manager assignment."
                : "Create a new team and optionally assign an active manager."}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Team Name <span className="text-red-500">*</span>
                </label>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter team name"
                  {...register("name", {
                    required: "Team name is required",
                  })}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-slate-200 ${
                    errors.name
                      ? "border-red-400"
                      : "border-slate-300 focus:border-slate-500"
                  }`}
                />

                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Status
                </label>

                <select
                  id="status"
                  {...register("status")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  rows={4}
                  placeholder="Enter team description"
                  {...register("description")}
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label
                  htmlFor="manager"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Manager
                </label>

                <select
                  id="manager"
                  disabled={employeesLoading}
                  {...register("manager")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {employeesLoading
                      ? "Loading managers..."
                      : "No manager"}
                  </option>

                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} ({employee.employeeId})
                    </option>
                  ))}
                </select>

                <p className="mt-1.5 text-xs text-slate-500">
                  Only active employees can be assigned as managers.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/teams")}
                className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creating || updating}
                className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {creating || updating
                  ? "Saving..."
                  : isEditMode
                  ? "Update Team"
                  : "Create Team"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TeamFormPage;