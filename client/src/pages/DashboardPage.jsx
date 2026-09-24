import { useGetDashboardQuery } from "../services/api/dashApi.js";
import { useGetEmployeesQuery } from "../services/api/employeeApi";

function DashboardPage() {
  const { data, error, isLoading } = useGetDashboardQuery();

  const {
    data: employeesResponse,
    isLoading: employeesLoading,
    isError: employeesError,
  } = useGetEmployeesQuery({ page: 1, limit: 5 });

  const recentEmployees = employeesResponse?.data || [];
  const workforceByTeam = data?.data?.workforceByTeam || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">
            Unable to load dashboard
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const dashboard = data?.data;

  const stats = [
    {
      label: "Total Employees",
      value: dashboard?.totalEmployees ?? 0,
      description: "All employees",
    },
    {
      label: "Active Employees",
      value: dashboard?.activeEmployees ?? 0,
      description: "Currently active",
    },
    {
      label: "Today's Leaves",
      value: dashboard?.todayLeaves ?? 0,
      description: "Employees on leave",
    },
    {
      label: "Upcoming Holidays",
      value: dashboard?.upcomingHolidays ?? 0,
      description: "Scheduled holidays",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Welcome back! Here's what's happening with your workforce.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
        {/* Recent employee section */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent Employees
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recently added employees
                </p>
              </div>

              <span className="text-sm text-slate-500">
                {employeesResponse?.total ?? 0} employees
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {employeesLoading ? (
              <div className="p-6 text-sm text-slate-500">
                Loading employees...
              </div>
            ) : employeesError ? (
              <div className="p-6 text-sm text-red-500">
                Unable to load recent employees.
              </div>
            ) : recentEmployees.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No employees found.
              </div>
            ) : (
              recentEmployees.map((employee) => (
                <div
                  key={employee._id}
                  className="p-4 sm:px-6 flex flex-row items-start gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-slate-600">
                        {employee.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {employee.name}
                      </p>

                      <p className="text-sm text-slate-500 truncate">
                        {employee.designation}
                      </p>
                    </div>
                  </div>

                  <div className="w-36 sm:w-40 text-right shrink-0">
                    <p className="text-sm font-medium text-slate-700">
                      {employee.employeeId}
                    </p>

                    <p className="text-xs text-slate-500 truncate">
                      {employee.team?.name || "No team"}
                    </p>
                  </div>

                  <div className="sm:w-24">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${employee.status === "Active"
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {employee.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workforce Overview */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 sm:p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Workforce Overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Current employee status and team distribution
            </p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-sm text-slate-500">
                  Active workforce
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {dashboard?.activeEmployees ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Total workforce
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {dashboard?.totalEmployees ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  On leave today
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {dashboard?.todayLeaves ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Employees by Team
              </h3>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {workforceByTeam.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No team workforce data available.
                  </p>
                ) : (
                  workforceByTeam.map((team) => (
                    <div
                      key={team.name}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {team.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Active employees
                        </p>
                      </div>

                      <span className="ml-3 text-lg font-semibold text-slate-900">
                        {team.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Today's Leaves
            </h2>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {dashboard?.todayLeaves ?? 0}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Approved employee leaves for today
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Upcoming Holidays
            </h2>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {dashboard?.upcomingHolidays ?? 0}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Holidays scheduled from today onward
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;