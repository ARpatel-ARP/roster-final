import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";
import Holiday from "../models/Holiday.js";
import Team from "../models/Team.js";

// @route GET /api/dashboard
// @access Private (protected by verifyJWT)

export const getDashboard = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalEmployees,
      activeEmployees,
      todayLeaves,
      upcomingHolidays,
      workforceByTeam,
    ] = await Promise.all([
      // Total Employees
      Employee.countDocuments(),

      // Active Employees
      Employee.countDocuments({ status: "Active" }),

      // Today's Leaves
      Leave.countDocuments({
        status: "Approved",
        startDate: { $lte: endOfToday },
        endDate: { $gte: startOfToday },
      }),

      // Upcoming Holidays
      Holiday.countDocuments({
        date: { $gte: startOfToday },
      }),

      // Active employees grouped by team
      Employee.aggregate([
        {
          $match: {
            status: "Active",
          },
        },
        {
          $group: {
            _id: "$team",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: Team.collection.name,
            localField: "_id",
            foreignField: "_id",
            as: "team",
          },
        },
        {
          $unwind: "$team",
        },
        {
          $project: {
            _id: 0,
            name: "$team.name",
            count: 1,
          },
        },
        {
          $sort: {
            name: 1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        todayLeaves,
        upcomingHolidays,
        workforceByTeam,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard data",
    });
  }
};