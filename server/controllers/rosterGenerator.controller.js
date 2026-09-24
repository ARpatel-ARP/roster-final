import mongoose from "mongoose";
import ExcelJS from "exceljs";
import Leave from "../models/Leave.js";
import Team from "../models/Team.js";
import Employee from "../models/Employee.js";
import Shift from "../models/Shift.js";
import Holiday from "../models/Holiday.js";
import { RosterEntry, RosterMonth } from "../models/Roster.js";
import { generateRoster } from "../services/roster/generator.service.js";
import { getPreviousWorkingDays } from "../services/roster/constraints.js";
import { validateTeamShiftCompatibility, validateWeekendAssignment, validateHelpDeskNightRecovery } from "../services/roster/assignmentRules.service.js";

const getDateKey = (date) => {
    const d = new Date(date);

    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

const parseDateOnly = (value) => {
    if (typeof value !== "string") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) return null;

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

const startOfDay = (date) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};
const endOfDay = (date) => {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
};
const getDatesBetween = (start, end) => {
    const dates = [];

    const current = new Date(start);
    current.setUTCHours(0, 0, 0, 0);

    const last = new Date(end);
    last.setUTCHours(0, 0, 0, 0);

    while (current <= last) {
        dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
};

// ============================================================
// MONTHLY ROSTER GENERATOR
// ============================================================

export const generateMonthlyRoster =
    async (req, res) => {
        const session =
            await mongoose.startSession();

        try {
            const {
                month,
                year,
                teamId,
            } = req.body;

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Month must be an integer between 1 and 12",
                });
            }

            if (
                !Number.isInteger(year) ||
                year < 2000
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid year is required",
                });
            }

            if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid teamId is required",
                });
            }
            const team = await Team.findById(teamId).lean();

            if (!team) {
                return res.status(404).json({
                    success: false,
                    message: "Team not found",
                });
            }

            if (team.status !== "active") {
                return res.status(409).json({
                    success: false,
                    message: "Inactive team cannot have a roster generated",
                });
            }


            const monthStart = new Date(
                Date.UTC(year, month - 1, 1)
            );

            const monthEnd = new Date(
                Date.UTC(year, month, 0)
            );

            const dates = getDatesBetween(
                monthStart,
                monthEnd
            );

            session.startTransaction();

            /**
             * Check month tracker.
             */
            const rosterMonth =
                await RosterMonth.findOne({
                    team: teamId,
                    month,
                    year,
                }).session(session);

            if (
                rosterMonth?.published
            ) {
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message:
                        "Roster for this month is already published",
                });
            }

            /**
             * Don't silently duplicate a roster.
             */
            const existingEntries =
                await RosterEntry.find({
                    team: teamId,
                    month,
                    year,
                })
                    .populate(
                        "employee",
                        "_id name"
                    )
                    .populate(
                        "shift",
                        "name"
                    )
                    .session(session)
                    .lean();

            if (
                existingEntries.length
            ) {
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message:
                        "Roster entries already exist for this month. Review or remove them before generating again.",
                });
            }

            const result =
                await generateRoster({
                    dates,
                    month,
                    year,
                    existingEntries,
                    generationType: "monthly",
                    teamId,
                });

            if (
                !result.generatedEntries.length
            ) {
                throw new Error(
                    "No roster assignments could be generated"
                );
            }

            await RosterEntry.insertMany(
                result.generatedEntries,
                {
                    session,
                }
            );

            let savedMonth;

            if (rosterMonth) {
                rosterMonth.generatedAt =
                    new Date();

                rosterMonth.generationType =
                    "monthly";

                savedMonth =
                    await rosterMonth.save({
                        session,
                    });
            } else {
                const created =
                    await RosterMonth.create(
                        [
                            {
                                team: teamId,
                                month,
                                year,
                                generationType: "monthly",
                                published: false,
                                generatedAt:
                                    new Date(),
                            },
                        ],
                        {
                            session,
                        }
                    );

                savedMonth =
                    created[0];
            }

            await session.commitTransaction();

            return res.status(201).json({
                success: true,
                message:
                    "Monthly roster generated successfully",

                data: {
                    team: {
                        _id: team._id,
                        name: team.name,
                    },
                    rosterMonth:
                        savedMonth,

                    month,
                    year,

                    summary:
                        result.summary,

                    warnings:
                        result.warnings,
                },
            });
        } catch (error) {
            await session.abortTransaction();

            console.error(
                "Monthly roster generation error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to generate monthly roster",
                error:
                    error.message,
            });
        } finally {
            await session.endSession();
        }
    };


// ============================================================
// GET GENERATED MONTHLY ROSTER
// ============================================================

export const getGeneratedMonthlyRoster = async (req, res) => {
    try {
        const { month, year, teamId } = req.query;

        const parsedMonth = Number(month);
        const parsedYear = Number(year);

        // Validate month
        if (
            !Number.isInteger(parsedMonth) ||
            parsedMonth < 1 ||
            parsedMonth > 12
        ) {
            return res.status(400).json({
                success: false,
                message: "Month must be an integer between 1 and 12",
            });
        }

        // Validate year
        if (
            !Number.isInteger(parsedYear) ||
            parsedYear < 2000
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid year is required",
            });
        }

        // Find the roster month
        const rosterMonthQuery = { month: parsedMonth, year: parsedYear };
        if (teamId) {
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({ success: false, message: "Invalid teamId" });
            }
            rosterMonthQuery.team = teamId;
        }
        const rosterMonth = await RosterMonth.findOne(rosterMonthQuery)
            .populate("publishedBy", "name email");

        if (!rosterMonth) {
            return res.status(404).json({
                success: false,
                message: "No generated roster found for this month",
            });
        }

        // Get all entries belonging to this month
        const entryQuery = { month: parsedMonth, year: parsedYear };
        if (teamId) entryQuery.team = teamId;
        const entries = await RosterEntry.find(entryQuery)
            .populate(
                "employee",
                "employeeId name designation team"
            )
            .populate(
                "shift",
                "name startTime endTime minimumEmployees overnight"
            )
            .sort({
                date: 1,
                employee: 1,
            });

        return res.status(200).json({
            success: true,
            message: "Monthly roster fetched successfully",
            data: {
                month: parsedMonth,
                year: parsedYear,
                published: rosterMonth.published,
                generatedAt: rosterMonth.generatedAt,
                publishedAt: rosterMonth.publishedAt,
                entries,
            },
        });
    } catch (error) {
        console.error(
            "Get generated monthly roster error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch monthly roster",
            error: error.message,
        });
    }
};

// ============================================================
// WEEKLY ROSTER GENERATOR
// ============================================================

export const generateWeeklyRoster =
    async (req, res) => {
        const session =
            await mongoose.startSession();

        try {
            const {
                startDate,
                teamId,
            } = req.body;

            if (!startDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "startDate is required",
                });
            }


            if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid teamId is required",
                });
            }

            const team = await Team.findById(teamId).lean();
            if (!team) {
                return res.status(404).json({
                    success: false,
                    message: "Team not found",
                });
            }
            if (team.status !== "active") {
                return res.status(409).json({
                    success: false,
                    message: "Inactive team cannot have a roster generated",
                });
            }

            const parsedDate =
                parseDateOnly(startDate);

            if (!parsedDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid startDate. Use YYYY-MM-DD format.",
                });
            }

            const weekStart =
                startOfDay(parsedDate);

            const weekEnd =
                new Date(weekStart);

            weekEnd.setUTCDate(
                weekEnd.getUTCDate() + 6
            );

            const dates =
                getDatesBetween(
                    weekStart,
                    weekEnd
                );

            const month =
                weekStart.getUTCMonth() + 1;

            const year =
                weekStart.getUTCFullYear();

            session.startTransaction();

            /**
             * Check whether month is published.
             */
            const rosterMonth =
                await RosterMonth.findOne({
                    team: teamId,
                    month,
                    year,
                }).session(session);

            if (
                rosterMonth?.published
            ) {
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message:
                        "This month's roster is already published",
                });
            }

            /**
             * Get existing assignments.
             */
            const historyStart = new Date(weekStart);
            historyStart.setUTCDate(
                historyStart.getUTCDate() - 6
            );

            const existingEntries =
                await RosterEntry.find({
                    team: teamId,
                    date: {
                        $gte: historyStart,
                        $lte:
                            endOfDay(weekEnd),
                    },
                })
                    .populate(
                        "employee",
                        "_id name"
                    )
                    .populate(
                        "shift",
                        "name"
                    )
                    .session(session)
                    .lean();

            const weekEntries = existingEntries.filter((entry) => {
                const date = new Date(entry.date);
                return date >= weekStart && date <= endOfDay(weekEnd);
            });

            if (
                weekEntries.length
            ) {
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message:
                        "Roster entries already exist for part or all of this week. Review them before generating again.",
                });
            }

            const result =
                await generateRoster({
                    dates,
                    month,
                    year,
                    existingEntries,
                    generationType: "weekly",
                    teamId,
                });

            result.warnings = result.warnings.filter(
                (warning) => warning.type !== "WEEKEND_OFF_SHORTAGE"
            );

            if (
                !result.generatedEntries.length
            ) {
                throw new Error(
                    "No roster assignments could be generated"
                );
            }

            await RosterEntry.insertMany(
                result.generatedEntries,
                {
                    session,
                }
            );

            /**
             * Create month tracker if necessary.
             *
             * Weekly generation does NOT mark the
             * whole month as generated.
             */
            if (!rosterMonth) {
                await RosterMonth.create(
                    [
                        {
                            team: teamId,
                            month,
                            year,
                            generationType: "weekly",
                            published: false,
                            generatedAt: null,
                        }
                    ],
                    {
                        session,
                    }
                );
            }

            await session.commitTransaction();

            return res.status(201).json({
                success: true,
                message:
                    "Weekly roster generated successfully",

                data: {
                    team: {
                        _id: team._id,
                        name: team.name,
                    },
                    week: {
                        startDate:
                            getDateKey(
                                weekStart
                            ),

                        endDate:
                            getDateKey(
                                weekEnd
                            ),
                    },

                    summary:
                        result.summary,

                    warnings:
                        result.warnings,
                },
            });
        } catch (error) {
            await session.abortTransaction();

            console.error(
                "Weekly roster generation error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to generate weekly roster",
                error:
                    error.message,
            });
        } finally {
            await session.endSession();
        }
    };

// ============================================================
// GET GENERATED WEEKLY ROSTER
// ============================================================

export const getGeneratedWeeklyRoster = async (req, res) => {
    try {
        const { startDate, teamId } = req.query;

        if (!startDate) {
            return res.status(400).json({
                success: false,
                message: "startDate is required in YYYY-MM-DD format",
            });
        }

        // Use the same date parser that fixes the timezone bug
        const parsedStartDate = parseDateOnly(startDate);

        if (!parsedStartDate) {
            return res.status(400).json({
                success: false,
                message: "Invalid startDate. Use YYYY-MM-DD format.",
            });
        }

        const start = startOfDay(parsedStartDate);

        const end = new Date(start);
        end.setUTCDate(
            end.getUTCDate() + 6
        );

        end.setUTCHours(
            23, 59, 59, 999
        );

        const entryQuery = {
            date: { $gte: start, $lte: end },
        };
        if (teamId) {
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({ success: false, message: "Invalid teamId" });
            }
            entryQuery.team = teamId;
        }
        const entries = await RosterEntry.find(entryQuery)
            .populate(
                "employee",
                "employeeId name designation team"
            )
            .populate(
                "shift",
                "name startTime endTime minimumEmployees overnight"
            )
            .sort({
                date: 1,
                employee: 1,
            });

        if (!entries.length) {
            return res.status(404).json({
                success: false,
                message: "No generated roster found for this week",
            });
        }

        // Get publication status of the roster month(s)
        const months = [
            ...new Set(
                entries.map(
                    (entry) =>
                        `${entry.year}-${entry.month}`
                )
            ),
        ];

        const rosterMonthQuery = {
            $or: months.map((value) => {
                const [year, month] = value
                    .split("-")
                    .map(Number);

                return {
                    year,
                    month,
                };
            }),
        };
        if (teamId) rosterMonthQuery.team = teamId;
        const rosterMonths = await RosterMonth.find(rosterMonthQuery);

        return res.status(200).json({
            success: true,
            message: "Weekly roster fetched successfully",
            data: {
                startDate: getDateKey(start),
                endDate: getDateKey(end),
                entries,
                rosterMonths,
            },
        });
    } catch (error) {
        console.error(
            "Get generated weekly roster error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch weekly roster",
            error: error.message,
        });
    }
};

// ============================================================
// UPDATE GENERATED ROSTER ENTRY
// Draft and Published entries can both be updated.
// Minimum staffing is a SOFT rule.
// ============================================================

export const updateGeneratedRosterById = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            employee: employeeId,
            date: dateString,
            shift: shiftId,
        } = req.body;

        // --------------------------------------------------------
        // Validate roster entry ID
        // --------------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid roster entry ID",
            });
        }

        // --------------------------------------------------------
        // Find existing roster entry
        // --------------------------------------------------------

        const rosterEntry =
            await RosterEntry.findById(id);

        if (!rosterEntry) {
            return res.status(404).json({
                success: false,
                message: "Roster entry not found",
            });
        }

        // --------------------------------------------------------
        // Validate required fields
        // --------------------------------------------------------

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: "Employee is required",
            });
        }

        if (!shiftId) {
            return res.status(400).json({
                success: false,
                message: "Shift is required",
            });
        }

        if (!dateString) {
            return res.status(400).json({
                success: false,
                message: "Date is required",
            });
        }

        // --------------------------------------------------------
        // Validate ObjectIds
        // --------------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee ID",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(shiftId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid shift ID",
            });
        }

        // --------------------------------------------------------
        // Parse date safely
        // --------------------------------------------------------

        const parsedDate =
            parseDateOnly(dateString);

        if (!parsedDate) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid date. Use YYYY-MM-DD format.",
            });
        }

        const newDate =
            startOfDay(parsedDate);

        // --------------------------------------------------------
        // Find employee
        // --------------------------------------------------------

        const employee =
            await Employee.findById(employeeId).lean();

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        if (employee.status !== "active") {
            return res.status(409).json({
                success: false,
                message:
                    "Inactive employees cannot be assigned to roster",
            });
        }

        const employeeTeam = employee.team
            ? await Team.findById(employee.team).lean()
            : null;

        if (!employeeTeam) {
            return res.status(409).json({
                success: false,
                message: "Employee must belong to an active team",
            });
        }

        // --------------------------------------------------------
        // Find shift
        // --------------------------------------------------------

        const shift =
            await Shift.findById(shiftId).lean();

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: "Shift not found",
            });
        }

        if (shift.status !== "active") {
            return res.status(409).json({
                success: false,
                message:
                    "Inactive shifts cannot be assigned to roster",
            });
        }

        const teamShiftError = validateTeamShiftCompatibility({
            employee,
            team: employeeTeam,
            shift,
        });

        if (teamShiftError) {
            return res.status(400).json({
                success: false,
                message: teamShiftError,
            });
        }

        const weekendError = await validateWeekendAssignment({
            employeeId,
            date: newDate,
            shift,
            excludeRosterId: id,
        });

        if (weekendError) {
            return res.status(400).json({ success: false, message: weekendError });
        }

        employee.team = employeeTeam;
        const helpDeskNightError = await validateHelpDeskNightRecovery({
            employee,
            date: newDate,
            shift,
            excludeRosterId: id,
        });

        if (helpDeskNightError) {
            return res.status(400).json({ success: false, message: helpDeskNightError });
        }

        // --------------------------------------------------------
        // Duplicate / one shift per employee per day
        //
        // Exclude the current entry itself.
        // --------------------------------------------------------

        const duplicate =
            await RosterEntry.findOne({
                _id: { $ne: id },
                employee: employeeId,
                date: newDate,
            });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message:
                    "Employee already has a roster assignment on this date",
                data: {
                    conflictingRosterId:
                        duplicate._id,
                },
            });
        }

        // --------------------------------------------------------
        // Approved leave validation
        // --------------------------------------------------------

        const approvedLeave =
            await Leave.findOne({
                employee: employeeId,
                status: "Approved",
                startDate: {
                    $lte: endOfDay(newDate),
                },
                endDate: {
                    $gte: startOfDay(newDate),
                },
            }).lean();

        if (approvedLeave) {
            return res.status(409).json({
                success: false,
                message:
                    "Employee is on approved leave on this date",
                data: {
                    leaveId: approvedLeave._id,
                    startDate:
                        approvedLeave.startDate,
                    endDate:
                        approvedLeave.endDate,
                },
            });
        }

        // --------------------------------------------------------
        // Get assignments around this employee
        //
        // We need surrounding days for:
        // - Night -> Morning
        // - 6 consecutive working days
        // - Night balancing
        // --------------------------------------------------------

        const previousDate =
            new Date(newDate);

        previousDate.setUTCDate(
            previousDate.getUTCDate() - 1
        );

        const nextDate =
            new Date(newDate);

        nextDate.setUTCDate(
            nextDate.getUTCDate() + 1
        );

        const nearbyEntries =
            await RosterEntry.find({
                employee: employeeId,
                date: {
                    $gte: startOfDay(
                        previousDate
                    ),
                    $lte: endOfDay(
                        nextDate
                    ),
                },
                _id: {
                    $ne: id,
                },
            })
                .populate(
                    "shift",
                    "name startTime endTime overnight"
                )
                .lean();

        // --------------------------------------------------------
        // Night -> Morning conflict
        // --------------------------------------------------------

        if (shift.name === "Morning") {
            const previousEntry =
                nearbyEntries.find(
                    (entry) =>
                        getDateKey(entry.date) ===
                        getDateKey(previousDate)
                );

            if (
                previousEntry?.shift?.name ===
                "Night"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Morning shift cannot immediately follow a Night shift",
                    data: {
                        previousDate:
                            getDateKey(previousDate),
                        previousShift:
                            previousEntry.shift.name,
                    },
                });
            }
        }

        // --------------------------------------------------------
        // Build assignments map for consecutive-day checking
        // --------------------------------------------------------

        const assignments =
            new Map();

        assignments.set(
            employeeId.toString(),
            new Map()
        );

        // Current entry is intentionally excluded.
        for (
            const entry of nearbyEntries
        ) {
            assignments
                .get(employeeId.toString())
                .set(
                    getDateKey(entry.date),
                    {
                        employee:
                            employeeId,
                        date:
                            entry.date,
                        shift:
                            entry.shift,
                    }
                );
        }

        // --------------------------------------------------------
        // Maximum 6 consecutive working days
        // --------------------------------------------------------

        const previousWorkingDays =
            getPreviousWorkingDays(
                employeeId,
                newDate,
                assignments
            );

        if (
            previousWorkingDays >= 6
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Employee would exceed 6 consecutive working days",
            });
        }

        // --------------------------------------------------------
        // Maximum monthly Night shifts
        // --------------------------------------------------------

        let nightCount = 0;

        const month =
            newDate.getUTCMonth() + 1;

        const year =
            newDate.getUTCFullYear();

        const monthlyEntries =
            await RosterEntry.find({
                employee: employeeId,
                month,
                year,
                _id: {
                    $ne: id,
                },
            })
                .populate(
                    "shift",
                    "name"
                )
                .lean();

        for (
            const entry of monthlyEntries
        ) {
            if (
                entry.shift?.name ===
                "Night"
            ) {
                nightCount++;
            }
        }

        if (
            shift.name === "Night" &&
            nightCount >=
            (employee.maxNightPerMonth ?? 0)
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Maximum monthly Night shift limit reached",
                data: {
                    maxNightPerMonth:
                        employee.maxNightPerMonth ?? 0,
                    currentNightCount:
                        nightCount,
                },
            });
        }

        // --------------------------------------------------------
        // Holiday flag
        // --------------------------------------------------------

        const holiday =
            await Holiday.findOne({
                date: {
                    $gte: startOfDay(newDate),
                    $lte: endOfDay(newDate),
                },
            }).lean();

        // --------------------------------------------------------
        // Update roster entry
        //
        // Published status is NOT checked.
        // Mentor's rule: published entries remain editable.
        // --------------------------------------------------------

        rosterEntry.employee =
            employeeId;

        rosterEntry.date =
            newDate;

        rosterEntry.shift =
            shiftId;

        rosterEntry.month =
            month;

        rosterEntry.year =
            year;

        rosterEntry.isHoliday =
            Boolean(holiday);

        rosterEntry.isLeave =
            false;

        rosterEntry.isWeeklyOff =
            shift.name === "Off";

        rosterEntry.manuallyEdited =
            true;

        await rosterEntry.save();

        // --------------------------------------------------------
        // Populate response
        // --------------------------------------------------------

        const updatedEntry =
            await RosterEntry.findById(
                rosterEntry._id
            )
                .populate(
                    "employee",
                    "employeeId name designation team"
                )
                .populate(
                    "shift",
                    "name startTime endTime minimumEmployees overnight"
                );

        return res.status(200).json({
            success: true,
            message:
                "Generated roster entry updated successfully",
            data: updatedEntry,
        });
    } catch (error) {
        console.error(
            "Update generated roster entry error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update generated roster entry",
            error: error.message,
        });
    }
};

// ============================================================
// DELETE GENERATED ROSTER ENTRY BY ID
// Only draft/unpublished rosters can be deleted
// ============================================================

export const deleteGeneratedRosterById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid roster entry ID",
            });
        }

        // Find roster entry
        const rosterEntry = await RosterEntry.findById(id);

        if (!rosterEntry) {
            return res.status(404).json({
                success: false,
                message: "Roster entry not found",
            });
        }

        // Find the month to which this roster entry belongs
        const rosterMonth = await RosterMonth.findOne({
            team: rosterEntry.team,
            month: rosterEntry.month,
            year: rosterEntry.year,
        });

        if (!rosterMonth) {
            return res.status(404).json({
                success: false,
                message: "Roster month record not found",
            });
        }

        // Published roster is locked
        if (rosterMonth.published) {
            return res.status(409).json({
                success: false,
                message:
                    "Published roster cannot be deleted",
            });
        }

        // Delete only if draft/unpublished
        await RosterEntry.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message:
                "Generated roster entry deleted successfully",
            data: {
                deletedRosterId: id,
                month: rosterEntry.month,
                year: rosterEntry.year,
            },
        });
    } catch (error) {
        console.error(
            "Delete generated roster entry error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to delete generated roster entry",
            error: error.message,
        });
    }
};

// ============================================================
// DAILY TEAM ROSTER GENERATOR
// ============================================================

export const generateDailyRoster = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { date, teamId } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: "date is required" });
        }
        if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
            return res.status(400).json({ success: false, message: "Valid teamId is required" });
        }

        const parsedDate = parseDateOnly(date);
        if (!parsedDate) {
            return res.status(400).json({
                success: false,
                message: "Invalid date. Use YYYY-MM-DD format.",
            });
        }

        const team = await Team.findById(teamId).lean();
        if (!team) return res.status(404).json({ success: false, message: "Team not found" });
        if (team.status !== "active") {
            return res.status(409).json({
                success: false,
                message: "Inactive team cannot have a roster generated",
            });
        }

        const dayStart = startOfDay(parsedDate);
        const dayEnd = endOfDay(parsedDate);
        const month = parsedDate.getUTCMonth() + 1;
        const year = parsedDate.getUTCFullYear();

        session.startTransaction();

        const rosterMonth = await RosterMonth.findOne({
            team: teamId,
            month,
            year,
        }).session(session);

        if (rosterMonth?.published) {
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                message: "This team's roster for this month is already published",
            });
        }

        const historyStart = new Date(dayStart);
        historyStart.setUTCDate(historyStart.getUTCDate() - 6);

        const existingEntries = await RosterEntry.find({
            team: teamId,
            date: { $gte: historyStart, $lte: dayEnd },
        })
            .populate("employee", "_id name")
            .populate("shift", "name")
            .session(session)
            .lean();

        if (existingEntries.some((entry) => {
            const d = new Date(entry.date);
            return d >= dayStart && d <= dayEnd;
        })) {
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                message: "Roster entries already exist for this team and date. Review or remove them before generating again.",
            });
        }

        const result = await generateRoster({
            dates: [dayStart],
            month,
            year,
            existingEntries,
            generationType: "daily",
            teamId,
        });

        if (!result.generatedEntries.length) {
            throw new Error("No roster assignments could be generated");
        }

        await RosterEntry.insertMany(result.generatedEntries, { session });

        if (!rosterMonth) {
            await RosterMonth.create([{
                team: teamId,
                month,
                year,
                generationType: "daily",
                published: false,
                generatedAt: null,
            }], { session });
        }

        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            message: "Daily roster generated successfully",
            data: {
                date: getDateKey(dayStart),
                team: { _id: team._id, name: team.name },
                summary: result.summary,
                warnings: result.warnings,
            },
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("Daily roster generation error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate daily roster",
            error: error.message,
        });
    } finally {
        await session.endSession();
    }
};

// ============================================================
// GET DAILY TEAM ROSTER
// ============================================================

export const getGeneratedDailyRoster = async (req, res) => {
    try {
        const { date, teamId } = req.query;
        if (!date) return res.status(400).json({ success: false, message: "date is required" });
        if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
            return res.status(400).json({ success: false, message: "Valid teamId is required" });
        }

        const parsedDate = parseDateOnly(date);
        if (!parsedDate) {
            return res.status(400).json({
                success: false,
                message: "Invalid date. Use YYYY-MM-DD format.",
            });
        }

        const entries = await RosterEntry.find({
            team: teamId,
            date: { $gte: startOfDay(parsedDate), $lte: endOfDay(parsedDate) },
        })
            .populate("employee", "employeeId name designation team")
            .populate("team", "name")
            .populate("shift", "name startTime endTime minimumEmployees overnight")
            .sort({ employee: 1 });

        if (!entries.length) {
            return res.status(404).json({
                success: false,
                message: "No generated roster found for this date and team",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Daily roster fetched successfully",
            data: {
                date: getDateKey(parsedDate),
                teamId,
                entries,
            },
        });
    } catch (error) {
        console.error("Get generated daily roster error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch daily roster",
            error: error.message,
        });
    }
};

// ============================================================
// EXCEL EXPORTS
// CCC/Admin = every active team except Help Desk
// Help Desk = only Help Desk
// ============================================================

const buildRosterWorkbook = async ({
    month,
    year,
    helpDeskOnly = false,
}) => {
    // ============================================================
    // GET ROSTER ENTRIES
    // ============================================================

    const entries = await RosterEntry.find({
        month,
        year,
    })
        .populate(
            "employee",
            "employeeId name designation team status"
        )
        .populate("team", "name status")
        .populate("shift", "name startTime endTime")
        .sort({ date: 1 })
        .lean();

    const filteredEntries = entries.filter((entry) => {
        const teamName = entry.team?.name
            ?.trim()
            .toLowerCase();

        return helpDeskOnly
            ? teamName === "help desk"
            : teamName !== "help desk";
    });

    // ============================================================
    // WORKBOOK
    // ============================================================

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Roster Management System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(
        helpDeskOnly
            ? "Help Desk Roster"
            : "CCC Admin Roster"
    );

    // ============================================================
    // DATES
    // ============================================================

    const dates = [];

    const cursor = new Date(
        Date.UTC(year, month - 1, 1)
    );

    const last = new Date(
        Date.UTC(year, month, 0)
    );

    while (cursor <= last) {
        dates.push(new Date(cursor));

        cursor.setUTCDate(
            cursor.getUTCDate() + 1
        );
    }

    // ============================================================
    // MAP ROSTER ENTRIES
    // ============================================================

    const entryMap = new Map();
    const employeeMap = new Map();

    for (const entry of filteredEntries) {
        if (!entry.employee || !entry.team) {
            continue;
        }

        const employeeMongoId =
            entry.employee._id.toString();

        const teamMongoId =
            entry.team._id.toString();

        const dateKey =
            getDateKey(entry.date);

        // --------------------------------------------------------
        // Entry lookup
        // --------------------------------------------------------

        const entryKey =
            `${teamMongoId}|${employeeMongoId}|${dateKey}`;

        entryMap.set(entryKey, entry);

        // --------------------------------------------------------
        // Employee lookup
        // --------------------------------------------------------

        const employeeKey =
            `${teamMongoId}|${employeeMongoId}`;

        if (!employeeMap.has(employeeKey)) {
            employeeMap.set(employeeKey, {
                teamId: teamMongoId,
                employeeId: employeeMongoId,
                teamName:
                    entry.team.name || "",
                employeeCode:
                    entry.employee.employeeId || "",
                employeeName:
                    entry.employee.name || "",
                designation:
                    entry.employee.designation || "",
            });
        }
    }

    const employees =
        Array.from(employeeMap.values());

    // ============================================================
    // VALUE TO PUT INTO EXCEL
    // ============================================================

    const getRosterValue = (entry) => {
        if (!entry) {
            return "";
        }

        // Leave has highest priority
        if (entry.isLeave) {
            return "Leave";
        }

        // Holiday
        if (entry.isHoliday) {
            return "Holiday";
        }

        // Weekly Off
        if (entry.isWeeklyOff) {
            return "WOF";
        }

        const shiftName =
            entry.shift?.name
                ?.trim()
                .toLowerCase();

        // --------------------------------------------------------
        // Normal shifts
        // --------------------------------------------------------

        if (shiftName === "morning") {
            return "M";
        }

        if (shiftName === "general") {
            return "G";
        }

        if (shiftName === "evening") {
            return "E";
        }

        if (shiftName === "night") {
            return "Night";
        }

        // Some existing data may already contain Nightoff
        if (
            shiftName === "nightoff" ||
            shiftName === "night off"
        ) {
            return "Night off";
        }

        if (shiftName === "off") {
            return "WOF";
        }

        // Preserve any other existing shift name
        return entry.shift?.name || "";
    };

    // ============================================================
    // COMMON STYLES
    // ============================================================

    const headerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFF2F2F2",
        },
    };

    const headerFont = {
        bold: true,
        size: 11,
    };

    const centerAlignment = {
        horizontal: "center",
        vertical: "middle",
    };

    const thinBorder = {
        top: {
            style: "thin",
        },
        left: {
            style: "thin",
        },
        bottom: {
            style: "thin",
        },
        right: {
            style: "thin",
        },
    };

    // ============================================================
    // HELP DESK EXCEL
    // ============================================================

    if (helpDeskOnly) {
        // --------------------------------------------------------
        // COLUMN WIDTHS
        // --------------------------------------------------------

        sheet.getColumn(1).width = 26;

        for (let i = 2; i <= dates.length + 1; i++) {
            sheet.getColumn(i).width = 12;
        }

        // --------------------------------------------------------
        // ROW 1 - WEEKDAY
        // --------------------------------------------------------

        const weekdayRow = sheet.getRow(1);

        weekdayRow.getCell(1).value =
            "HELPDESK TEAM";

        weekdayRow.getCell(1).font = {
            bold: false,
            size: 11,
        };

        weekdayRow.getCell(1).alignment = {
            horizontal: "left",
            vertical: "middle",
        };

        for (let i = 0; i < dates.length; i++) {
            const cell =
                weekdayRow.getCell(i + 2);

            cell.value =
                dates[i].toLocaleDateString(
                    "en-US",
                    {
                        weekday: "long",
                        timeZone: "UTC",
                    }
                );

            cell.font = headerFont;
            cell.alignment = centerAlignment;
        }

        weekdayRow.height = 26;

        // --------------------------------------------------------
        // ROW 2 - DATE
        // --------------------------------------------------------

        const dateRow = sheet.getRow(2);

        dateRow.getCell(1).value =
            "NAME/DATE";

        dateRow.getCell(1).font = {
            bold: false,
            size: 11,
        };

        dateRow.getCell(1).alignment = {
            horizontal: "left",
            vertical: "middle",
        };

        for (let i = 0; i < dates.length; i++) {
            const cell =
                dateRow.getCell(i + 2);

            cell.value = dates[i];

            cell.numFmt = "dd-mmm";

            cell.font = {
                bold: true,
                size: 10,
            };

            cell.alignment = centerAlignment;
        }

        // --------------------------------------------------------
        // EMPLOYEES
        // --------------------------------------------------------

        employees.sort((a, b) =>
            a.employeeName.localeCompare(
                b.employeeName
            )
        );

        let rowNumber = 3;

        for (const employee of employees) {
            const row =
                sheet.getRow(rowNumber);

            row.getCell(1).value =
                employee.employeeName;

            for (let i = 0; i < dates.length; i++) {
                const dateKey =
                    getDateKey(dates[i]);

                const key =
                    `${employee.teamId}|${employee.employeeId}|${dateKey}`;

                const entry =
                    entryMap.get(key);

                row.getCell(i + 2).value =
                    getRosterValue(entry);

                row.getCell(i + 2).alignment =
                    centerAlignment;
            }

            row.getCell(1).alignment = {
                horizontal: "left",
                vertical: "middle",
            };

            rowNumber++;
        }

        // --------------------------------------------------------
        // BORDERS
        // --------------------------------------------------------

        for (
            let r = 1;
            r < rowNumber;
            r++
        ) {
            for (
                let c = 1;
                c <= dates.length + 1;
                c++
            ) {
                sheet.getCell(r, c).border =
                    thinBorder;
            }
        }

        // --------------------------------------------------------
        // FREEZE
        // --------------------------------------------------------

        sheet.freezePane = "B3";

        return workbook;
    }

    // ============================================================
    // COMBINED CCC EXCEL
    // ============================================================

    // ------------------------------------------------------------
    // COLUMN WIDTHS
    // ------------------------------------------------------------

    sheet.getColumn(1).width = 13;
    sheet.getColumn(2).width = 18;
    sheet.getColumn(3).width = 25;

    for (
        let i = 4;
        i <= dates.length + 3;
        i++
    ) {
        sheet.getColumn(i).width = 9;
    }

    // ============================================================
    // ROW 1
    // ============================================================

    sheet.getCell("A1").value = "CCC";

    sheet.mergeCells("A1:C1");

    sheet.getCell("A1").font = {
        bold: true,
        size: 14,
    };

    sheet.getCell("A1").fill = headerFill;

    sheet.getCell("A1").alignment = centerAlignment;

    // Weekdays
    for (let i = 0; i < dates.length; i++) {
        const cell =
            sheet.getCell(1, i + 4);

        cell.value =
            dates[i].toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    timeZone: "UTC",
                }
            );

        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = centerAlignment;
    }

    sheet.getRow(1).height = 53.25;

    // ============================================================
    // ROW 2
    // ============================================================

    sheet.getCell("A2").value = "Shift";
    sheet.getCell("B2").value = "Timing";

    sheet.getCell("A2").font = headerFont;
    sheet.getCell("B2").font = headerFont;

    sheet.getCell("A2").fill = headerFill;
    sheet.getCell("B2").fill = headerFill;

    sheet.getCell("A2").alignment = centerAlignment;
    sheet.getCell("B2").alignment = centerAlignment;

    // Blank C2
    sheet.getCell("C2").value = "";

    for (let i = 0; i < dates.length; i++) {
        const cell =
            sheet.getCell(2, i + 4);

        cell.value = dates[i];

        cell.numFmt = "dd-mmm";

        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = centerAlignment;
    }

    // ============================================================
    // SHIFT LEGEND
    // ============================================================

    const shiftRows = [
        {
            row: 3,
            code: "M",
            timing: "8:00AM - 4:00PM",
        },
        {
            row: 4,
            code: "G",
            timing: "9:00AM - 5:00 PM",
        },
        {
            row: 5,
            code: "E",
            timing: "12:00PM - 8:00 PM",
        },
    ];

    for (const item of shiftRows) {
        sheet.getCell(item.row, 1).value =
            item.code;

        sheet.getCell(item.row, 2).value =
            item.timing;

        sheet.getCell(item.row, 1).font =
            headerFont;

        sheet.getCell(item.row, 2).font =
            {
                bold: false,
            };

        sheet.getCell(item.row, 1).fill =
            headerFill;

        sheet.getCell(item.row, 2).fill =
            headerFill;

        sheet.getCell(item.row, 1).alignment =
            centerAlignment;

        sheet.getCell(item.row, 2).alignment =
            centerAlignment;
    }

    // ============================================================
    // EMPLOYEE GROUPING
    // ============================================================

    employees.sort((a, b) => {
        const teamCompare =
            a.teamName.localeCompare(
                b.teamName
            );

        if (teamCompare !== 0) {
            return teamCompare;
        }

        return a.employeeName.localeCompare(
            b.employeeName
        );
    });

    /*
     * In the CCC template:
     *
     * Column A = main group
     * Column B = sub-team
     * Column C = employee
     *
     * All current CCC teams belong to the Admin
     * group, so column A is "Admin".
     */

    const groupedTeams = new Map();

    for (const employee of employees) {
        const teamName =
            employee.teamName || "Other";

        if (!groupedTeams.has(teamName)) {
            groupedTeams.set(
                teamName,
                []
            );
        }

        groupedTeams
            .get(teamName)
            .push(employee);
    }

    let rowNumber = 6;

    const teamStartRows = [];

    for (
        const [teamName, teamEmployees]
        of groupedTeams
    ) {
        const teamStart = rowNumber;

        for (
            const employee
            of teamEmployees
        ) {
            const row =
                sheet.getRow(rowNumber);

            // ----------------------------------------------------
            // Column B = sub-team
            // Only first employee gets the value.
            // It will be merged below.
            // ----------------------------------------------------

            if (rowNumber === teamStart) {
                row.getCell(2).value =
                    teamName;
            }

            // ----------------------------------------------------
            // Column C = employee
            // ----------------------------------------------------

            row.getCell(3).value =
                employee.employeeName;

            row.getCell(3).font = {
                bold: true,
            };

            row.getCell(3).alignment = {
                horizontal: "left",
                vertical: "middle",
            };

            // ----------------------------------------------------
            // Daily roster
            // ----------------------------------------------------

            for (let i = 0; i < dates.length; i++) {
                const dateKey =
                    getDateKey(dates[i]);

                const key =
                    `${employee.teamId}|${employee.employeeId}|${dateKey}`;

                const entry =
                    entryMap.get(key);

                const cell =
                    row.getCell(i + 4);

                cell.value =
                    getRosterValue(entry);

                cell.alignment =
                    centerAlignment;
            }

            rowNumber++;
        }

        const teamEnd =
            rowNumber - 1;

        // --------------------------------------------------------
        // Merge sub-team cells
        // --------------------------------------------------------

        if (teamEnd > teamStart) {
            sheet.mergeCells(
                teamStart,
                2,
                teamEnd,
                2
            );
        }

        const teamCell =
            sheet.getCell(teamStart, 2);

        teamCell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
        };

        teamCell.font = {
            bold: true,
        };

        teamStartRows.push({
            start: teamStart,
            end: teamEnd,
        });
    }

    // ============================================================
    // MERGE ADMIN COLUMN
    // ============================================================

    if (rowNumber > 6) {
        sheet.mergeCells(
            6,
            1,
            rowNumber - 1,
            1
        );

        const adminCell =
            sheet.getCell("A6");

        adminCell.value = "Admin";

        adminCell.font = {
            bold: true,
        };

        adminCell.alignment = {
            horizontal: "center",
            vertical: "middle",
        };
    }

    // ============================================================
    // BORDERS
    // ============================================================

    for (
        let r = 1;
        r < rowNumber;
        r++
    ) {
        for (
            let c = 1;
            c <= dates.length + 3;
            c++
        ) {
            sheet.getCell(r, c).border =
                thinBorder;
        }
    }

    // ============================================================
    // HEADER FILL
    // ============================================================

    for (
        let r = 1;
        r <= 5;
        r++
    ) {
        for (
            let c = 1;
            c <= dates.length + 3;
            c++
        ) {
            sheet.getCell(r, c).fill =
                headerFill;
        }
    }

    // ============================================================
    // FREEZE
    // ============================================================

    sheet.views = [
        {
            state: "frozen",
            xSplit: 3,
            ySplit: 2,
        },
    ];

    // ============================================================
    // FILTER
    // ============================================================

    sheet.autoFilter = {
        from: "A6",
        to: `A${rowNumber - 1}`,
    };

    return workbook;
};

export const exportCombinedRoster = async (req, res) => {
    try {
        const { month, year } = req.query;
        const parsedMonth = Number(month);
        const parsedYear = Number(year);
        if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12 ||
            !Number.isInteger(parsedYear) || parsedYear < 2000) {
            return res.status(400).json({
                success: false,
                message: "Valid month and year are required",
            });
        }

        const workbook = await buildRosterWorkbook({
            month: parsedMonth,
            year: parsedYear,
            helpDeskOnly: false,
        });
        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="CCC_Admin_Roster_${parsedYear}-${String(parsedMonth).padStart(2, "0")}.xlsx"`
        );
        return res.send(buffer);
    } catch (error) {
        console.error("CCC roster export error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to export CCC/Admin roster",
            error: error.message,
        });
    }
};

export const exportHelpDeskRoster = async (req, res) => {
    try {
        const { month, year } = req.query;
        const parsedMonth = Number(month);
        const parsedYear = Number(year);
        if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12 ||
            !Number.isInteger(parsedYear) || parsedYear < 2000) {
            return res.status(400).json({
                success: false,
                message: "Valid month and year are required",
            });
        }

        const workbook = await buildRosterWorkbook({
            month: parsedMonth,
            year: parsedYear,
            helpDeskOnly: true,
        });
        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="HelpDesk_Roster_${parsedYear}-${String(parsedMonth).padStart(2, "0")}.xlsx"`
        );
        return res.send(buffer);
    } catch (error) {
        console.error("Help Desk roster export error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to export Help Desk roster",
            error: error.message,
        });
    }
};


// =====================================================
// GET ALL GENERATED ROSTERS
// =====================================================

export const getAllGeneratedRosters = async (req, res) => {
    try {
        const rosters = await RosterMonth.find({})
            .populate("team", "name")
            .sort({
                year: -1,
                month: -1,
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            count: rosters.length,
            data: rosters,
        });
    } catch (error) {
        console.error("Get all generated rosters error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch generated rosters",
            error: error.message,
        });
    }
};