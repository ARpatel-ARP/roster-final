import mongoose from "mongoose";
import Shift from "../models/Shift.js";

const VALID_SHIFT_NAMES = ["Morning", "Evening", "Night", "General", "Off"];
const VALID_STATUSES = ["active", "inactive"];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isValidTime = (time) => {
  return typeof time === "string" && TIME_REGEX.test(time);
};

const calculateOvernight = (startTime, endTime) => {
  return endTime < startTime;
};

const handleUnexpectedError = (error, res) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";

    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(error.errors).map((e) => e.message),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid value for ${error.path}`,
    });
  }

  console.error("Shift controller error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

/**
 * POST /api/shifts
 * Auth: authenticated user
 */
export async function createShift(req, res) {
  try {
    const {
      name,
      startTime,
      endTime,
      minimumEmployees,
      status,
    } = req.body;

    // Required fields
    const requiredFields = {
      name,
      startTime,
      endTime,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => value === undefined || value === null || value === "")
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(", ")}`,
      });
    }

    // Validate shift name
    if (!VALID_SHIFT_NAMES.includes(name)) {
      return res.status(400).json({
        success: false,
        message: `Invalid shift name. Must be one of: ${VALID_SHIFT_NAMES.join(", ")}`,
      });
    }

    // Validate times
    if (!isValidTime(startTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime. Use HH:mm format.",
      });
    }

    if (!isValidTime(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid endTime. Use HH:mm format.",
      });
    }

    // Same start/end time is not considered a valid shift
    if (name !== "Off" && startTime === endTime) {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime cannot be the same.",
      });
    }

    // Validate minimumEmployees
    if (
      minimumEmployees !== undefined &&
      (!Number.isInteger(minimumEmployees) || minimumEmployees < (shift.name === "Off" ? 0 : 1))
    ) {
      return res.status(400).json({
        success: false,
        message: "minimumEmployees must be a non-negative integer for Off and a positive integer for working shifts.",
      });
    }

    // Validate status
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // Duplicate shift name
    const existingShift = await Shift.findOne({ name });

    if (existingShift) {
      return res.status(409).json({
        success: false,
        message: `Shift with name '${name}' already exists`,
      });
    }

    // Automatically determine overnight
    const overnight = calculateOvernight(startTime, endTime);

    const shift = await Shift.create({
      name,
      startTime,
      endTime,
      minimumEmployees: minimumEmployees ?? 1,
      status: status ?? "active",
      overnight,
    });

    return res.status(201).json({
      success: true,
      message: "Shift created successfully",
      data: shift,
    });
  } catch (error) {
    return handleUnexpectedError(error, res);
  }
}

/**
 * GET /api/shifts
 * Auth: authenticated user
 *
 * Optional query parameters:
 * status
 * name
 */
export async function getShifts(req, res) {
  try {
    const { status, name } = req.query;

    const filter = {};

    // Status filter
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        });
      }

      filter.status = status;
    }

    // Name filter
    if (name) {
      filter.name = {
        $regex: name,
        $options: "i",
      };
    }

    const shifts = await Shift.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts,
    });
  } catch (error) {
    return handleUnexpectedError(error, res);
  }
}

/**
 * GET /api/shifts/:id
 * Auth: authenticated user
 */
export async function getShiftById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift id",
      });
    }

    const shift = await Shift.findById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    return handleUnexpectedError(error, res);
  }
}

/**
 * PUT /api/shifts/:id
 * Auth: authenticated user
 */
export async function updateShift(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift id",
      });
    }

    const shift = await Shift.findById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    const {
      name,
      startTime,
      endTime,
      minimumEmployees,
      status,
    } = req.body;

    // Prevent empty update
    if (
      name === undefined &&
      startTime === undefined &&
      endTime === undefined &&
      minimumEmployees === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
      });
    }

    // Validate name
    if (name !== undefined) {
      if (!VALID_SHIFT_NAMES.includes(name)) {
        return res.status(400).json({
          success: false,
          message: `Invalid shift name. Must be one of: ${VALID_SHIFT_NAMES.join(", ")}`,
        });
      }

      if (name !== shift.name) {
        const duplicate = await Shift.findOne({
          name,
          _id: { $ne: id },
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: `Shift with name '${name}' already exists`,
          });
        }
      }

      shift.name = name;
    }

    // Determine resulting times
    const newStartTime =
      startTime !== undefined ? startTime : shift.startTime;

    const newEndTime =
      endTime !== undefined ? endTime : shift.endTime;

    // Validate start time
    if (startTime !== undefined && !isValidTime(startTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime. Use HH:mm format.",
      });
    }

    // Validate end time
    if (endTime !== undefined && !isValidTime(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid endTime. Use HH:mm format.",
      });
    }

    // Validate resulting times
    if (shift.name !== "Off" && newStartTime === newEndTime) {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime cannot be the same.",
      });
    }

    if (startTime !== undefined) {
      shift.startTime = startTime;
    }

    if (endTime !== undefined) {
      shift.endTime = endTime;
    }

    // Automatically recalculate overnight
    shift.overnight = calculateOvernight(
      newStartTime,
      newEndTime
    );

    // Validate minimumEmployees
    if (minimumEmployees !== undefined) {
      if (
        !Number.isInteger(minimumEmployees) ||
        minimumEmployees < (shift.name === "Off" ? 0 : 1)
      ) {
        return res.status(400).json({
          success: false,
          message: "minimumEmployees must be a non-negative integer for Off and a positive integer for working shifts.",
        });
      }

      shift.minimumEmployees = minimumEmployees;
    }

    // Validate status
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        });
      }

      shift.status = status;
    }

    await shift.save();

    return res.status(200).json({
      success: true,
      message: "Shift updated successfully",
      data: shift,
    });
  } catch (error) {
    return handleUnexpectedError(error, res);
  }
}

/**
 * DELETE /api/shifts/:id
 * Auth: authenticated user
 */
export async function deleteShift(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift id",
      });
    }

    const shift = await Shift.findById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    /*
     * At this stage the Roster module is not yet implemented.
     * Therefore there are currently no Shift references to check.
     *
     * Once Roster is implemented, this deletion check should be
     * extended to prevent deleting a shift referenced by roster data.
     */

    await Shift.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Shift deleted successfully",
    });
  } catch (error) {
    return handleUnexpectedError(error, res);
  }
}