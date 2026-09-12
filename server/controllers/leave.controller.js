import mongoose from "mongoose";
import Leave from "../models/Leave.js";
import Employee from "../models/Employee.js";
import { getLeaveBalanceSummary, recalculateEmployeeYearLeave } from "../services/leave/leaveBalance.service.js";

const VALID_STATUSES = ["Approved", "Rejected", "Pending"];

/**
 * Convert YYYY-MM-DD into a Date representing the start of that day.
 *
 * We intentionally accept date-only values for Leave APIs.
 */
const parseDateOnly = (value) => {
    if (typeof value !== "string") {
        return null;
    }

    // Strict YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    // Prevent JavaScript from accepting impossible dates such as
    // 2026-02-31 and silently rolling them into another month.
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

/**
 * Return YYYY-MM-DD from a Date.
 */
const formatDateOnly = (date) => {
    return date.toISOString().split("T")[0];
};

/**
 * Validate status.
 */
const isValidStatus = (status) => {
    return VALID_STATUSES.includes(status);
};

/**
 * Common unexpected error handler.
 */
function handleUnexpectedError(error, res) {
    if (error.code === 11000) {
        const field =
            Object.keys(error.keyPattern || {})[0] || "field";

        return res.status(409).json({
            success: false,
            message: `Duplicate value for ${field}`,
        });
    }

    if (error.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: Object.values(error.errors).map(
                (e) => e.message
            ),
        });
    }

    if (error instanceof mongoose.Error.CastError) {
        return res.status(400).json({
            success: false,
            message: `Invalid value for ${error.path}`,
        });
    }

    console.error("Leave controller error:", error);

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}

/**
 * Check whether an employee has an overlapping
 * Pending or Approved leave.
 *
 * Overlap condition:
 *
 * existing.startDate <= new.endDate
 * AND
 * existing.endDate >= new.startDate
 */
async function findOverlappingLeave(
    employeeId,
    startDate,
    endDate,
    excludeLeaveId = null
) {
    const filter = {
        employee: employeeId,

        // Rejected leave should not block future leave.
        status: {
            $in: ["Pending", "Approved"],
        },

        startDate: {
            $lte: endDate,
        },

        endDate: {
            $gte: startDate,
        },
    };

    if (excludeLeaveId) {
        filter._id = {
            $ne: excludeLeaveId,
        };
    }

    return Leave.findOne(filter);
}

/**
 * POST /api/leaves
 * Auth: authenticated user
 */
export async function createLeave(req, res) {
    try {
        const {
            employee,
            startDate,
            endDate,
            reason,
            status,
        } = req.body;

        // ---------------------------------------
        // 1. Required fields
        // ---------------------------------------

        const requiredFields = {
            employee,
            startDate,
            endDate,
            reason,
        };

        const missingFields = Object.entries(requiredFields)
            .filter(
                ([, value]) =>
                    value === undefined ||
                    value === null ||
                    value === ""
            )
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(
                    ", "
                )}`,
            });
        }

        // ---------------------------------------
        // 2. Validate employee ID
        // ---------------------------------------

        if (!mongoose.isValidObjectId(employee)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        // ---------------------------------------
        // 3. Check employee exists
        // ---------------------------------------

        const employeeExists = await Employee.findById(employee);

        if (!employeeExists) {
            return res.status(400).json({
                success: false,
                message: `Employee with id '${employee}' does not exist`,
            });
        }

        // ---------------------------------------
        // 4. Check employee is active
        // ---------------------------------------

        if (employeeExists.status !== "Active") {
            return res.status(400).json({
                success: false,
                message: `Employee with id '${employee}' is not active`,
            });
        }

        // ---------------------------------------
        // 5. Validate dates
        // ---------------------------------------

        const parsedStartDate = parseDateOnly(startDate);
        const parsedEndDate = parseDateOnly(endDate);

        if (!parsedStartDate) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid startDate. Use YYYY-MM-DD format.",
            });
        }

        if (!parsedEndDate) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid endDate. Use YYYY-MM-DD format.",
            });
        }

        if (parsedStartDate > parsedEndDate) {
            return res.status(400).json({
                success: false,
                message:
                    "startDate cannot be later than endDate",
            });
        }

        // ---------------------------------------
        // 6. Validate reason
        // ---------------------------------------

        if (typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "Reason cannot be empty",
            });
        }

        // ---------------------------------------
        // 7. Validate status
        // ---------------------------------------

        const leaveStatus = status || "Pending";

        if (!isValidStatus(leaveStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(
                    ", "
                )}`,
            });
        }

        // ---------------------------------------
        // 8. Prevent overlapping leave
        // ---------------------------------------

        const overlappingLeave =
            await findOverlappingLeave(
                employee,
                parsedStartDate,
                parsedEndDate
            );

        if (overlappingLeave) {
            return res.status(409).json({
                success: false,
                message:
                    "Employee already has an overlapping leave for the selected dates",
                conflictingLeave: {
                    id: overlappingLeave._id,
                    startDate:
                        formatDateOnly(
                            overlappingLeave.startDate
                        ),
                    endDate:
                        formatDateOnly(
                            overlappingLeave.endDate
                        ),
                    status: overlappingLeave.status,
                },
            });
        }

        // ---------------------------------------
        // 9. approvedBy handling
        // ---------------------------------------

        let approvedBy = null;

        if (leaveStatus === "Approved") {
            approvedBy = req.admin.id;
        }

        // Client cannot decide approvedBy.
        const leave = await Leave.create({
            employee,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            reason: reason.trim(),
            status: leaveStatus,
            approvedBy,
        });

        if (leaveStatus === "Approved") {
            await recalculateEmployeeYearLeave(employee, parsedStartDate.getFullYear());
            if (parsedEndDate.getFullYear() !== parsedStartDate.getFullYear()) {
                await recalculateEmployeeYearLeave(employee, parsedEndDate.getFullYear());
            }
        }

        // Populate employee and approver for response
        await leave.populate([
            {
                path: "employee",
                select: "employeeId name designation team status",
            },
            {
                path: "approvedBy",
                select: "name email role",
            },
        ]);

        return res.status(201).json({
            success: true,
            message: "Leave created successfully",
            data: leave,
        });
    } catch (error) {
        return handleUnexpectedError(error, res);
    }
}

/**
 * GET /api/leaves
 *
 * Optional filters:
 * employee
 * status
 * startDate
 * endDate
 * page
 * limit
 */
export async function getLeaves(req, res) {
    try {
        const {
            employee,
            status,
            startDate,
            endDate,
            page = 1,
            limit = 10,
        } = req.query;

        const filter = {};

        // ---------------------------------------
        // Employee filter
        // ---------------------------------------

        if (employee) {
            if (!mongoose.isValidObjectId(employee)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid employee id",
                });
            }

            filter.employee = employee;
        }

        // ---------------------------------------
        // Status filter
        // ---------------------------------------

        if (status) {
            if (!isValidStatus(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${VALID_STATUSES.join(
                        ", "
                    )}`,
                });
            }

            filter.status = status;
        }

        // ---------------------------------------
        // Date filters
        // ---------------------------------------

        if (startDate) {
            const parsedStartDate = parseDateOnly(startDate);

            if (!parsedStartDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid startDate. Use YYYY-MM-DD format.",
                });
            }

            filter.startDate = {
                ...(filter.startDate || {}),
                $gte: parsedStartDate,
            };
        }

        if (endDate) {
            const parsedEndDate = parseDateOnly(endDate);

            if (!parsedEndDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid endDate. Use YYYY-MM-DD format.",
                });
            }

            filter.endDate = {
                ...(filter.endDate || {}),
                $lte: parsedEndDate,
            };
        }

        // ---------------------------------------
        // Pagination
        // ---------------------------------------

        const pageNum = Math.max(
            parseInt(page, 10) || 1,
            1
        );

        const limitNum = Math.max(
            parseInt(limit, 10) || 10,
            1
        );

        const skip = (pageNum - 1) * limitNum;

        // ---------------------------------------
        // Query
        // ---------------------------------------

        const [leaves, total] = await Promise.all([
            Leave.find(filter)
                .populate(
                    "employee",
                    "employeeId name designation team status"
                )
                .populate(
                    "approvedBy",
                    "name email role"
                )
                .sort({
                    startDate: 1,
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limitNum),

            Leave.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            count: leaves.length,
            total,
            page: pageNum,
            totalPages: Math.ceil(
                total / limitNum
            ),
            data: leaves,
        });
    } catch (error) {
        return handleUnexpectedError(error, res);
    }
}

/**
 * GET /api/leaves/:id
 */
export async function getLeaveById(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave id",
            });
        }

        const leave = await Leave.findById(id)
            .populate(
                "employee",
                "employeeId name designation team status"
            )
            .populate(
                "approvedBy",
                "name email role"
            );

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: leave,
        });
    } catch (error) {
        return handleUnexpectedError(error, res);
    }
}

/**
 * PUT /api/leaves/:id
 */
export async function updateLeave(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave id",
            });
        }

        const leave = await Leave.findById(id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        const previousEmployeeId = leave.employee.toString();
        const previousStartYear = leave.startDate.getFullYear();
        const previousEndYear = leave.endDate.getFullYear();
        const previousStatus = leave.status;

        const {
            employee,
            startDate,
            endDate,
            reason,
            status,
        } = req.body;

        // ---------------------------------------
        // No valid fields
        // ---------------------------------------

        if (
            employee === undefined &&
            startDate === undefined &&
            endDate === undefined &&
            reason === undefined &&
            status === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid fields provided to update",
            });
        }

        // ---------------------------------------
        // Determine resulting employee
        // ---------------------------------------

        const resultingEmployee =
            employee !== undefined
                ? employee
                : leave.employee.toString();

        if (!mongoose.isValidObjectId(resultingEmployee)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        const employeeExists =
            await Employee.findById(resultingEmployee);

        if (!employeeExists) {
            return res.status(400).json({
                success: false,
                message: `Employee with id '${resultingEmployee}' does not exist`,
            });
        }

        if (employeeExists.status !== "Active") {
            return res.status(400).json({
                success: false,
                message: `Employee with id '${resultingEmployee}' is not active`,
            });
        }

        // ---------------------------------------
        // Determine resulting dates
        // ---------------------------------------

        let resultingStartDate = leave.startDate;
        let resultingEndDate = leave.endDate;

        if (startDate !== undefined) {
            const parsedStartDate =
                parseDateOnly(startDate);

            if (!parsedStartDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid startDate. Use YYYY-MM-DD format.",
                });
            }

            resultingStartDate = parsedStartDate;
        }

        if (endDate !== undefined) {
            const parsedEndDate =
                parseDateOnly(endDate);

            if (!parsedEndDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid endDate. Use YYYY-MM-DD format.",
                });
            }

            resultingEndDate = parsedEndDate;
        }

        if (resultingStartDate > resultingEndDate) {
            return res.status(400).json({
                success: false,
                message:
                    "startDate cannot be later than endDate",
            });
        }

        // ---------------------------------------
        // Validate reason
        // ---------------------------------------

        if (reason !== undefined) {
            if (
                typeof reason !== "string" ||
                !reason.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Reason cannot be empty",
                });
            }

            leave.reason = reason.trim();
        }

        // ---------------------------------------
        // Determine resulting status
        // ---------------------------------------

        const resultingStatus =
            status !== undefined
                ? status
                : leave.status;

        if (!isValidStatus(resultingStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(
                    ", "
                )}`,
            });
        }

        // ---------------------------------------
        // Prevent overlapping leave
        // ---------------------------------------

        const overlappingLeave =
            await findOverlappingLeave(
                resultingEmployee,
                resultingStartDate,
                resultingEndDate,
                id
            );

        /*
         * Only check overlap if the resulting leave
         * itself is Pending or Approved.
         *
         * Rejected leaves do not block dates.
         */
        if (
            ["Pending", "Approved"].includes(
                resultingStatus
            ) &&
            overlappingLeave
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Employee already has an overlapping leave for the selected dates",
                conflictingLeave: {
                    id: overlappingLeave._id,
                    startDate:
                        formatDateOnly(
                            overlappingLeave.startDate
                        ),
                    endDate:
                        formatDateOnly(
                            overlappingLeave.endDate
                        ),
                    status: overlappingLeave.status,
                },
            });
        }

        // ---------------------------------------
        // Apply employee
        // ---------------------------------------

        leave.employee = resultingEmployee;

        // ---------------------------------------
        // Apply dates
        // ---------------------------------------

        leave.startDate = resultingStartDate;
        leave.endDate = resultingEndDate;

        // ---------------------------------------
        // Apply status + approvedBy
        // ---------------------------------------

        if (resultingStatus === "Approved") {
            /*
             * Whenever a leave becomes approved,
             * the current authenticated admin becomes
             * the approver.
             */
            leave.status = "Approved";
            leave.approvedBy = req.admin.id;
        } else if (resultingStatus === "Rejected") {
            /*
             * Rejected leaves don't have an approver.
             */
            leave.status = "Rejected";
            leave.approvedBy = null;
        } else {
            /*
             * Pending leaves should not have an approver.
             */
            leave.status = "Pending";
            leave.approvedBy = null;
        }

        await leave.save();

        const affectedYears = new Set([
            previousStartYear,
            previousEndYear,
            resultingStartDate.getFullYear(),
            resultingEndDate.getFullYear(),
        ]);
        const affectedEmployees = new Set([
            previousEmployeeId,
            resultingEmployee,
        ]);

        for (const employeeId of affectedEmployees) {
            for (const affectedYear of affectedYears) {
                await recalculateEmployeeYearLeave(employeeId, affectedYear);
            }
        }

        await leave.populate([
            {
                path: "employee",
                select:
                    "employeeId name designation team status",
            },
            {
                path: "approvedBy",
                select: "name email role",
            },
        ]);

        return res.status(200).json({
            success: true,
            message: "Leave updated successfully",
            data: leave,
        });
    } catch (error) {
        return handleUnexpectedError(error, res);
    }
}

/**
 * GET /api/leaves/balance/:employeeId?year=YYYY
 * Returns accrued, carried-forward, paid and unpaid leave.
 */
export async function getLeaveBalance(req, res) {
    try {
        const { employeeId } = req.params;
        const year = Number(req.query.year || new Date().getFullYear());
        if (!mongoose.isValidObjectId(employeeId)) {
            return res.status(400).json({ success: false, message: "Invalid employee id" });
        }
        if (!Number.isInteger(year) || year < 2000) {
            return res.status(400).json({ success: false, message: "Valid year is required" });
        }
        const employee = await Employee.findById(employeeId).lean();
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
        await recalculateEmployeeYearLeave(employeeId, year);
        const balance = await getLeaveBalanceSummary(employeeId, year);
        return res.status(200).json({ success: true, data: balance });
    } catch (error) {
        return handleUnexpectedError(error, res);
    }
}

/**
 * DELETE /api/leaves/:id
 */
export async function deleteLeave(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave id",
            });
        }

        const leave = await Leave.findById(id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        /*
         * Approved leave affects roster planning.
         * Therefore don't silently hard-delete an approved
         * leave.
         *
         * At this stage Roster is not implemented yet,
         * but preserving approved leave history is safer.
         */
        if (leave.status === "Approved") {
            return res.status(409).json({
                success: false,
                message:
                    "Approved leave cannot be deleted. Reject it instead if it should no longer apply.",
            });
        }

        await Leave.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Leave deleted successfully",
        });
    } catch (error) {
        return handleUnexpectedError(error, res);
    }
}