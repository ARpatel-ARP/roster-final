import mongoose from "mongoose";

import Employee from "../models/Employee.js";
import Team from "../models/Team.js";
import Shift from "../models/Shift.js";
import Leave from "../models/Leave.js";
import Holiday from "../models/Holiday.js";
import {
  RosterEntry,
  RosterMonth,
} from "../models/Roster.js";
import {
  validateTeamShiftCompatibility,
  validateWeekendAssignment,
  validateHelpDeskNightRecovery,
} from "../services/roster/assignmentRules.service.js";


// ============================================================
// Helpers 
// ============================================================

const parseDateOnly = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};


const formatDateOnly = (date) => {
  return date.toISOString().split("T")[0];
};


const getMonthYear = (date) => {
  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
};


const getMonthRange = (month, year) => {
  const start = new Date(
    Date.UTC(year, month - 1, 1)
  );

  const end = new Date(
    Date.UTC(year, month, 1)
  );

  return { start, end };
};


const isNightShift = (shift) => {
  return shift?.name === "Night";
};


const isMorningShift = (shift) => {
  return shift?.name === "Morning";
};


const handleUnexpectedError = (error, res) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "Employee already has a roster assignment for this date",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(error.errors).map(
        (errorItem) => errorItem.message
      ),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid value for ${error.path}`,
    });
  }

  console.error("Roster controller error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};


// ============================================================
// Check whether roster month has been published
// ============================================================

const checkPublishedMonth = async (month, year) => {
  return RosterMonth.findOne({
    month,
    year,
    published: true,
  });
};


// ============================================================
// Validate employee + team
// ============================================================

const validateEmployeeAndTeam = async (
  employeeId,
  teamId = null
) => {
  if (!mongoose.isValidObjectId(employeeId)) {
    return {
      error: "Invalid employee id",
    };
  }

  const employee = await Employee.findById(employeeId);

  if (!employee) {
    return {
      error: "Employee not found",
    };
  }

  if (employee.status !== "Active") {
    return {
      error: "Only active employees can be assigned to roster",
    };
  }

  if (!employee.team) {
    return {
      error: "Employee is not assigned to any team",
    };
  }

  const employeeTeam = await Team.findById(employee.team);

  if (!employeeTeam) {
    return {
      error: "Employee's team does not exist",
    };
  }

  if (employeeTeam.status !== "active") {
    return {
      error: "Employee's team is inactive",
    };
  }

  /*
   * Team is not stored inside RosterEntry.
   * Employee.team is the source of truth.
   *
   * If frontend sends team, validate that it matches
   * the employee's actual team.
   */
  if (
    teamId !== null &&
    String(employeeTeam._id) !== String(teamId)
  ) {
    return {
      error:
        "Selected team does not match the employee's team",
    };
  }

  return {
    employee,
    team: employeeTeam,
  };
};


// ============================================================
// Validate shift
// ============================================================

const validateShift = async (shiftId) => {
  if (!mongoose.isValidObjectId(shiftId)) {
    return {
      error: "Invalid shift id",
    };
  }

  const shift = await Shift.findById(shiftId);

  if (!shift) {
    return {
      error: "Shift not found",
    };
  }

  if (shift.status !== "active") {
    return {
      error: "Selected shift is inactive",
    };
  }

  return {
    shift,
  };
};


// ============================================================
// Check approved leave conflict
// ============================================================

const findLeaveConflict = async (
  employeeId,
  date
) => {
  return Leave.findOne({
    employee: employeeId,
    status: "Approved",

    startDate: {
      $lte: date,
    },

    endDate: {
      $gte: date,
    },
  });
};


// ============================================================
// Check holiday
// ============================================================

const findHoliday = async (date) => {
  const nextDate = new Date(date);

  nextDate.setUTCDate(
    nextDate.getUTCDate() + 1
  );

  return Holiday.findOne({
    date: {
      $gte: date,
      $lt: nextDate,
    },
  });
};


// ============================================================
// Check maximum night shifts
// ============================================================

const validateNightShiftLimit = async ({
  employee,
  shift,
  date,
  excludeRosterId = null,
}) => {
  if (!isNightShift(shift)) {
    return null;
  }

  const maxNightPerMonth =
    employee.maxNightPerMonth;

  const { month, year } = getMonthYear(date);

  const { start, end } = getMonthRange(
    month,
    year
  );

  const filter = {
    employee: employee._id,
    date: {
      $gte: start,
      $lt: end,
    },
  };

  if (excludeRosterId) {
    filter._id = {
      $ne: excludeRosterId,
    };
  }

  const existingEntries =
    await RosterEntry.find(filter).populate(
      "shift",
      "name"
    );

  const nightCount =
    existingEntries.filter((entry) =>
      isNightShift(entry.shift)
    ).length;

  if (nightCount >= maxNightPerMonth) {
    return (
      "Employee has reached the maximum " +
      "night shifts allowed for this month"
    );
  }

  return null;
};


// ============================================================
// Check Night -> Morning conflict
// ============================================================

const validateNightMorningConflict = async ({
  employeeId,
  shift,
  date,
  excludeRosterId = null,
}) => {
  if (!isMorningShift(shift)) {
    return null;
  }

  const previousDate = new Date(date);

  previousDate.setUTCDate(
    previousDate.getUTCDate() - 1
  );

  const filter = {
    employee: employeeId,
    date: previousDate,
  };

  if (excludeRosterId) {
    filter._id = {
      $ne: excludeRosterId,
    };
  }

  const previousRoster =
    await RosterEntry.findOne(filter).populate(
      "shift",
      "name"
    );

  if (
    previousRoster &&
    isNightShift(previousRoster.shift)
  ) {
    return (
      "Morning shift cannot immediately " +
      "follow a night shift"
    );
  }

  return null;
};


// ============================================================
// Check maximum 6 consecutive working days
// ============================================================

const validateConsecutiveDays = async ({
  employeeId,
  date,
  excludeRosterId = null,
}) => {
  /*
   * We only need to inspect the previous 6 calendar days.
   *
   * If all six have roster entries, adding another
   * assignment would create 7 consecutive working days.
   */

  const startDate = new Date(date);

  startDate.setUTCDate(
    startDate.getUTCDate() - 6
  );

  const filter = {
    employee: employeeId,

    date: {
      $gte: startDate,
      $lt: date,
    },
  };

  if (excludeRosterId) {
    filter._id = {
      $ne: excludeRosterId,
    };
  }

  const previousEntries =
    await RosterEntry.find(filter).select(
      "date"
    );

  const assignedDates = new Set(
    previousEntries.map((entry) =>
      formatDateOnly(entry.date)
    )
  );

  let consecutiveDays = 0;

  const cursor = new Date(date);

  cursor.setUTCDate(
    cursor.getUTCDate() - 1
  );

  while (true) {
    const dateKey =
      formatDateOnly(cursor);

    if (!assignedDates.has(dateKey)) {
      break;
    }

    consecutiveDays++;

    cursor.setUTCDate(
      cursor.getUTCDate() - 1
    );
  }

  if (consecutiveDays >= 6) {
    return (
      "Employee cannot work more than " +
      "6 consecutive days"
    );
  }

  return null;
};


// ============================================================
// CREATE ROSTER ASSIGNMENT
//
// POST /api/rosters
// ============================================================

export async function createRoster(req, res) {
  try {
    const {
      employee,
      team,
      shift,
      date,
    } = req.body;

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------

    const missingFields = [];

    if (!employee) missingFields.push("employee");
    if (!shift) missingFields.push("shift");
    if (!date) missingFields.push("date");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          `Missing required field(s): ${missingFields.join(", ")}`,
      });
    }

    // --------------------------------------------------------
    // Date
    // --------------------------------------------------------

    const parsedDate =
      parseDateOnly(date);

    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid date. Use YYYY-MM-DD format.",
      });
    }

    // --------------------------------------------------------
    // Employee + team
    // --------------------------------------------------------

    const employeeResult =
      await validateEmployeeAndTeam(
        employee,
        team || null
      );

    if (employeeResult.error) {
      return res.status(400).json({
        success: false,
        message: employeeResult.error,
      });
    }

    const {
      employee: employeeDoc,
      team: teamDoc,
    } = employeeResult;

    // --------------------------------------------------------
    // Shift
    // --------------------------------------------------------

    const shiftResult =
      await validateShift(shift);

    if (shiftResult.error) {
      return res.status(400).json({
        success: false,
        message: shiftResult.error,
      });
    }

    const { shift: shiftDoc } =
      shiftResult;

    const teamShiftError =
      validateTeamShiftCompatibility({
        employee: employeeDoc,
        team: teamDoc,
        shift: shiftDoc,
      });

    if (teamShiftError) {
      return res.status(400).json({
        success: false,
        message: teamShiftError,
      });
    }

    const weekendError =
      await validateWeekendAssignment({
        employeeId: employeeDoc._id,
        date: parsedDate,
        shift: shiftDoc,
      });

    if (weekendError) {
      return res.status(400).json({
        success: false,
        message: weekendError,
      });
    }

    const helpDeskNightError =
  await validateHelpDeskNightRecovery({
    employee: employeeDoc,
    team: teamDoc,
    date: parsedDate,
    shift: shiftDoc,
  });

    if (helpDeskNightError) {
      return res.status(400).json({
        success: false,
        message: helpDeskNightError,
      });
    }

    // --------------------------------------------------------
    // Month/year
    // --------------------------------------------------------

    const {
      month,
      year,
    } = getMonthYear(parsedDate);

    // --------------------------------------------------------
    // Published roster protection
    // --------------------------------------------------------

    const publishedMonth =
      await checkPublishedMonth(
        month,
        year
      );

    if (publishedMonth) {
      return res.status(409).json({
        success: false,
        message:
          "Roster for this month has already been published and is locked",
      });
    }

    // --------------------------------------------------------
    // Duplicate assignment
    // --------------------------------------------------------

    const existingRoster =
      await RosterEntry.findOne({
        employee: employeeDoc._id,
        date: parsedDate,
      });

    if (existingRoster) {
      return res.status(409).json({
        success: false,
        message:
          "Employee already has a roster assignment for this date",
      });
    }

    // --------------------------------------------------------
    // Approved leave conflict
    // --------------------------------------------------------

    const leaveConflict =
      await findLeaveConflict(
        employeeDoc._id,
        parsedDate
      );

    if (leaveConflict) {
      return res.status(409).json({
        success: false,
        message:
          "Employee has approved leave on this date",
        conflictingLeave: {
          id: leaveConflict._id,
          startDate:
            formatDateOnly(
              leaveConflict.startDate
            ),
          endDate:
            formatDateOnly(
              leaveConflict.endDate
            ),
        },
      });
    }

    // --------------------------------------------------------
    // Night shift limit
    // --------------------------------------------------------

    const nightLimitError =
      await validateNightShiftLimit({
        employee: employeeDoc,
        shift: shiftDoc,
        date: parsedDate,
      });

    if (nightLimitError) {
      return res.status(400).json({
        success: false,
        message: nightLimitError,
      });
    }

    // --------------------------------------------------------
    // Night -> Morning rule
    // --------------------------------------------------------

    const nightMorningError =
      await validateNightMorningConflict({
        employeeId: employeeDoc._id,
        shift: shiftDoc,
        date: parsedDate,
      });

    if (nightMorningError) {
      return res.status(400).json({
        success: false,
        message: nightMorningError,
      });
    }

    // --------------------------------------------------------
    // Maximum 6 consecutive days
    // --------------------------------------------------------

    const consecutiveError =
      await validateConsecutiveDays({
        employeeId: employeeDoc._id,
        date: parsedDate,
      });

    if (consecutiveError) {
      return res.status(400).json({
        success: false,
        message: consecutiveError,
      });
    }

    // --------------------------------------------------------
    // Holiday
    // --------------------------------------------------------

    const holiday =
      await findHoliday(parsedDate);

    // --------------------------------------------------------
    // Create roster entry
    // --------------------------------------------------------

    const roster =
      await RosterEntry.create({
        employee: employeeDoc._id,
        date: parsedDate,
        shift: shiftDoc._id,

        month,
        year,

        isWeeklyOff: shiftDoc.name === "Off",
        isHoliday: Boolean(holiday),
        isLeave: false,

        manuallyEdited: true,
      });

    // --------------------------------------------------------
    // Populate response
    // --------------------------------------------------------

    await roster.populate([
      {
        path: "employee",
        select:
          "employeeId name designation team status",
        populate: {
          path: "team",
          select:
            "name description status",
        },
      },
      {
        path: "shift",
        select:
          "name startTime endTime minimumEmployees status overnight",
      },
    ]);

    return res.status(201).json({
      success: true,
      message:
        "Roster assignment created successfully",
      data: roster,
    });
  } catch (error) {
    return handleUnexpectedError(
      error,
      res
    );
  }
}


// ============================================================
// GET ROSTER
//
// GET /api/rosters
//
// Filters:
// date
// startDate
// endDate
// employee
// team
// shift
// month
// year
// page
// limit
// ============================================================

export async function getRoster(req, res) {
  try {
    const {
      date,
      startDate,
      endDate,
      employee,
      team,
      shift,
      month,
      year,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // --------------------------------------------------------
    // Employee
    // --------------------------------------------------------

    if (employee) {
      if (
        !mongoose.isValidObjectId(
          employee
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee id",
        });
      }

      filter.employee = employee;
    }

    // --------------------------------------------------------
    // Team
    //
    // RosterEntry does not contain team.
    // Employee.team is the source of truth.
    // --------------------------------------------------------

    if (team) {
      if (
        !mongoose.isValidObjectId(team)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid team id",
        });
      }

      const teamExists =
        await Team.findById(team);

      if (!teamExists) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      const employees =
        await Employee.find({
          team,
        }).select("_id");

      filter.employee = {
        $in: employees.map(
          (item) => item._id
        ),
      };
    }

    // --------------------------------------------------------
    // Shift
    // --------------------------------------------------------

    if (shift) {
      if (
        !mongoose.isValidObjectId(
          shift
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid shift id",
        });
      }

      filter.shift = shift;
    }

    // --------------------------------------------------------
    // Exact date
    // --------------------------------------------------------

    if (date) {
      const parsedDate =
        parseDateOnly(date);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid date. Use YYYY-MM-DD format.",
        });
      }

      const nextDate =
        new Date(parsedDate);

      nextDate.setUTCDate(
        nextDate.getUTCDate() + 1
      );

      filter.date = {
        $gte: parsedDate,
        $lt: nextDate,
      };
    }

    // --------------------------------------------------------
    // Date range
    // --------------------------------------------------------

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        const parsedStart =
          parseDateOnly(startDate);

        if (!parsedStart) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid startDate. Use YYYY-MM-DD format.",
          });
        }

        filter.date.$gte =
          parsedStart;
      }

      if (endDate) {
        const parsedEnd =
          parseDateOnly(endDate);

        if (!parsedEnd) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid endDate. Use YYYY-MM-DD format.",
          });
        }

        const nextDate =
          new Date(parsedEnd);

        nextDate.setUTCDate(
          nextDate.getUTCDate() + 1
        );

        filter.date.$lt =
          nextDate;
      }
    }

    // --------------------------------------------------------
    // Month/year
    // --------------------------------------------------------

    if (month !== undefined) {
      const parsedMonth =
        Number(month);

      if (
        !Number.isInteger(
          parsedMonth
        ) ||
        parsedMonth < 1 ||
        parsedMonth > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "month must be between 1 and 12",
        });
      }

      filter.month = parsedMonth;
    }

    if (year !== undefined) {
      const parsedYear =
        Number(year);

      if (
        !Number.isInteger(
          parsedYear
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid year",
        });
      }

      filter.year = parsedYear;
    }

    // --------------------------------------------------------
    // Pagination
    // --------------------------------------------------------

    const currentPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const currentLimit =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      );

    const skip =
      (currentPage - 1) *
      currentLimit;

    // --------------------------------------------------------
    // Query
    // --------------------------------------------------------

    const [
      rosters,
      total,
    ] = await Promise.all([
      RosterEntry.find(filter)
        .populate({
          path: "employee",
          select:
            "employeeId name designation team status",
          populate: {
            path: "team",
            select:
              "name description status",
          },
        })
        .populate({
          path: "shift",
          select:
            "name startTime endTime minimumEmployees status overnight",
        })
        .sort({
          date: 1,
          employee: 1,
        })
        .skip(skip)
        .limit(currentLimit),

      RosterEntry.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Roster fetched successfully",
      data: rosters,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages:
          Math.ceil(
            total / currentLimit
          ),
      },
    });
  } catch (error) {
    return handleUnexpectedError(
      error,
      res
    );
  }
}


// ============================================================
// GET SINGLE ROSTER ENTRY
//
// GET /api/rosters/:id
// ============================================================

export async function getRosterById(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid roster id",
      });
    }

    const roster =
      await RosterEntry.findById(id)
        .populate({
          path: "employee",
          select:
            "employeeId name designation team status",
          populate: {
            path: "team",
            select:
              "name description status",
          },
        })
        .populate({
          path: "shift",
          select:
            "name startTime endTime minimumEmployees status overnight",
        });

    if (!roster) {
      return res.status(404).json({
        success: false,
        message:
          "Roster entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Roster fetched successfully",
      data: roster,
    });
  } catch (error) {
    return handleUnexpectedError(
      error,
      res
    );
  }
}


// ============================================================
// UPDATE ROSTER
//
// PUT /api/rosters/:id
// ============================================================

export async function updateRoster(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid roster id",
      });
    }

    const roster =
      await RosterEntry.findById(id);

    if (!roster) {
      return res.status(404).json({
        success: false,
        message:
          "Roster entry not found",
      });
    }

    // --------------------------------------------------------
    // Determine resulting values
    // --------------------------------------------------------

    const employeeId =
      req.body.employee ??
      String(roster.employee);

    const shiftId =
      req.body.shift ??
      String(roster.shift);

    const dateValue =
      req.body.date ??
      formatDateOnly(roster.date);

    const teamId =
      req.body.team ??
      null;

    // --------------------------------------------------------
    // Date
    // --------------------------------------------------------

    const parsedDate =
      parseDateOnly(dateValue);

    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid date. Use YYYY-MM-DD format.",
      });
    }

    // --------------------------------------------------------
    // Employee + team
    // --------------------------------------------------------

    const employeeResult =
      await validateEmployeeAndTeam(
        employeeId,
        teamId
      );

    if (employeeResult.error) {
      return res.status(400).json({
        success: false,
        message:
          employeeResult.error,
      });
    }

    const {
      employee: employeeDoc,
      team: teamDoc,
    } = employeeResult;

    // --------------------------------------------------------
    // Shift
    // --------------------------------------------------------

    const shiftResult =
      await validateShift(
        shiftId
      );

    if (shiftResult.error) {
      return res.status(400).json({
        success: false,
        message:
          shiftResult.error,
      });
    }

    const {
      shift: shiftDoc,
    } = shiftResult;

    const teamShiftError =
      validateTeamShiftCompatibility({
        employee: employeeDoc,
        team: teamDoc,
        shift: shiftDoc,
      });

    if (teamShiftError) {
      return res.status(400).json({
        success: false,
        message: teamShiftError,
      });
    }

    const weekendError =
      await validateWeekendAssignment({
        employeeId: employeeDoc._id,
        date: parsedDate,
        shift: shiftDoc,
        excludeRosterId: roster._id,
      });

    if (weekendError) {
      return res.status(400).json({
        success: false,
        message: weekendError,
      });
    }

    const helpDeskNightError =
      await validateHelpDeskNightRecovery({
        employee: employeeDoc,
        date: parsedDate,
        shift: shiftDoc,
        excludeRosterId: roster._id,
      });

    if (helpDeskNightError) {
      return res.status(400).json({
        success: false,
        message: helpDeskNightError,
      });
    }

    // --------------------------------------------------------
    // Month/year
    // --------------------------------------------------------

    const {
      month,
      year,
    } = getMonthYear(
      parsedDate
    );

    // --------------------------------------------------------
    // Published month protection
    // --------------------------------------------------------

    const publishedMonth =
      await checkPublishedMonth(
        month,
        year
      );

    if (publishedMonth) {
      return res.status(409).json({
        success: false,
        message:
          "Roster for this month has already been published and is locked",
      });
    }

    // --------------------------------------------------------
    // Duplicate assignment
    // --------------------------------------------------------

    const duplicate =
      await RosterEntry.findOne({
        _id: {
          $ne: roster._id,
        },

        employee:
          employeeDoc._id,

        date:
          parsedDate,
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Employee already has another roster assignment for this date",
      });
    }

    // --------------------------------------------------------
    // Approved leave
    // --------------------------------------------------------

    const leaveConflict =
      await findLeaveConflict(
        employeeDoc._id,
        parsedDate
      );

    if (leaveConflict) {
      return res.status(409).json({
        success: false,
        message:
          "Employee has approved leave on this date",
        conflictingLeave: {
          id: leaveConflict._id,
          startDate:
            formatDateOnly(
              leaveConflict.startDate
            ),
          endDate:
            formatDateOnly(
              leaveConflict.endDate
            ),
        },
      });
    }

    // --------------------------------------------------------
    // Night shift limit
    // --------------------------------------------------------

    const nightLimitError =
      await validateNightShiftLimit({
        employee:
          employeeDoc,

        shift:
          shiftDoc,

        date:
          parsedDate,

        excludeRosterId:
          roster._id,
      });

    if (nightLimitError) {
      return res.status(400).json({
        success: false,
        message:
          nightLimitError,
      });
    }

    // --------------------------------------------------------
    // Night -> Morning
    // --------------------------------------------------------

    const nightMorningError =
      await validateNightMorningConflict({
        employeeId:
          employeeDoc._id,

        shift:
          shiftDoc,

        date:
          parsedDate,

        excludeRosterId:
          roster._id,
      });

    if (nightMorningError) {
      return res.status(400).json({
        success: false,
        message:
          nightMorningError,
      });
    }

    // --------------------------------------------------------
    // Maximum consecutive days
    // --------------------------------------------------------

    const consecutiveError =
      await validateConsecutiveDays({
        employeeId:
          employeeDoc._id,

        date:
          parsedDate,

        excludeRosterId:
          roster._id,
      });

    if (consecutiveError) {
      return res.status(400).json({
        success: false,
        message:
          consecutiveError,
      });
    }

    // --------------------------------------------------------
    // Holiday
    // --------------------------------------------------------

    const holiday =
      await findHoliday(
        parsedDate
      );

    // --------------------------------------------------------
    // Update
    // --------------------------------------------------------

    roster.employee =
      employeeDoc._id;

    roster.shift =
      shiftDoc._id;

    roster.date =
      parsedDate;

    roster.month =
      month;

    roster.year =
      year;

    roster.isHoliday =
      Boolean(holiday);

    roster.isLeave =
      false;

    roster.manuallyEdited =
      true;

    await roster.save();

    // --------------------------------------------------------
    // Populate
    // --------------------------------------------------------

    await roster.populate([
      {
        path: "employee",
        select:
          "employeeId name designation team status",
        populate: {
          path: "team",
          select:
            "name description status",
        },
      },
      {
        path: "shift",
        select:
          "name startTime endTime minimumEmployees status overnight",
      },
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Roster assignment updated successfully",
      data: roster,
    });
  } catch (error) {
    return handleUnexpectedError(
      error,
      res
    );
  }
}


// ============================================================
// DELETE ROSTER
//
// DELETE /api/rosters/:id
// ============================================================

export async function deleteRoster(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid roster id",
      });
    }

    const roster =
      await RosterEntry.findById(id);

    if (!roster) {
      return res.status(404).json({
        success: false,
        message:
          "Roster entry not found",
      });
    }

    // --------------------------------------------------------
    // Published month protection
    // --------------------------------------------------------

    const publishedMonth =
      await checkPublishedMonth(
        roster.month,
        roster.year
      );

    if (publishedMonth) {
      return res.status(409).json({
        success: false,
        message:
          "Roster for this month has already been published and is locked",
      });
    }

    await RosterEntry.findByIdAndDelete(
      id
    );

    return res.status(200).json({
      success: true,
      message:
        "Roster assignment deleted successfully",
    });
  } catch (error) {
    return handleUnexpectedError(
      error,
      res
    );
  }
}

