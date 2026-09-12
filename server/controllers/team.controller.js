import mongoose from "mongoose";
import Team from "../models/Team.js";
import Employee from "../models/Employee.js";

import {
    isValidObjectId,
    normalizeName,
  escapeRegex,
    validateTeamCreatePayload,
    validateTeamUpdatePayload,
} from "../utils/validators.js"

/**
 * POST /api/teams
 * Auth: admin only
 */
export async function createTeam(req, res) {
    try {
        const { valid, errors } = validateTeamCreatePayload(req.body);

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
        }

        const { name, description, manager, status } = req.body;

        const normalizedName = normalizeName(name);

        const existing = await Team.findOne({ name: normalizedName });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Team with name '${normalizedName}' already exists`,
            });
        }

        if (manager) {
            const managerEmployee = await Employee.findById(manager);

            if (!managerEmployee) {
                return res.status(400).json({
                    success: false,
                    message: `Manager (employee) with id '${manager}' does not exist`,
                });
            }

            if (managerEmployee.status !== "Active") {
                return res.status(400).json({
                    success: false,
                    message: `Manager (employee) with id '${manager}' is not active`,
                });
            }
        }

        const team = await Team.create({
            name: normalizedName,
            ...(description && { description: description.trim() }),  // ... spreads that object into the main object:
            ...(manager && { manager }),
            ...(status && { status }),
        });

        return res.status(201).json({
            success: true,
            message: "Team created successfully",
            data: team,
        });
    } catch (err) {
        return handleUnexpectedError(err, res);
    }
}

/**
 * GET /api/teams
 * Auth: any authenticated user
 * Optional query filters: status, name (partial, case-insensitive)
 */
export async function getTeams(req, res) {
    try {
        const { status, name } = req.query;
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (name) {
            filter.name = { $regex: escapeRegex(name), // $regex allows MongoDB to perform pattern matching.
                 $options: "i"  // case insensitive
                };
        }

        const teams = await Team.find(filter)
            .populate("manager", "employeeId name email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: teams.length,
            data: teams,
        });
    } catch (err) {
        return handleUnexpectedError(err, res);
    }
}

/**
 * GET /api/teams/:id
 * Auth: any authenticated user
 */
export async function getTeamById(req, res) {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid team id",
            });
        }

        const team = await Team.findById(id).populate(
            "manager",
            "employeeId name email"
        );

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Team not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: team,
        });
    } catch (err) {
        return handleUnexpectedError(err, res);
    }
}

/**
 * PUT /api/teams/:id
 * Auth: admin only
 */
export async function updateTeam(req, res) {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid team id",
            });
        }

        const { valid, errors } = validateTeamUpdatePayload(req.body);

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
        }

        const team = await Team.findById(id);

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Team not found",
            });
        }

        const { name, description, manager, status } = req.body;

        if (name !== undefined) {
            const normalizedName = normalizeName(name);

            if (normalizedName !== team.name) {
                const duplicate = await Team.findOne({
                    name: normalizedName,
                    _id: { $ne: id },
                });

                if (duplicate) {
                    return res.status(409).json({
                        success: false,
                        message: `Team with name '${normalizedName}' already exists`,
                    });
                }
            }

            team.name = normalizedName;
        }

        if (manager !== undefined) {
            if (manager === null || manager === "") {
                team.manager = undefined;
            } else {
                const managerEmployee = await Employee.findById(manager);

                if (!managerEmployee) {
                    return res.status(400).json({
                        success: false,
                        message: `Manager (employee) with id '${manager}' does not exist`,
                    });
                }

                if (managerEmployee.status !== "Active") {
                    return res.status(400).json({
                        success: false,
                        message: `Manager (employee) with id '${manager}' is not active`,
                    });
                }

                team.manager = manager;
            }
        }

        if (description !== undefined) {
            team.description = description
                ? description.trim()
                : undefined;
        }

        if (status !== undefined) {
            team.status = status;
        }

        // IMPORTANT: Persist all changes to MongoDB
        await team.save();

        // Populate only after saving
        await team.populate(
            "manager",
            "employeeId name email"
        );

        return res.status(200).json({
            success: true,
            message: "Team updated successfully",
            data: team,
        });

    } catch (err) {
        return handleUnexpectedError(err, res);
    }
}

/**
 * DELETE /api/teams/:id
 * Auth: admin only
 *
 * Prevents deleting a team while employees still reference it.
 */
export async function deleteTeam(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team id",
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const dependentCount = await Employee.countDocuments({
      team: id,
    });

    if (dependentCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete team: ${dependentCount} employee(s) still reference it. Reassign them to another team first.`,
        dependentEmployeeCount: dependentCount,
      });
    }

    await Team.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (err) {
    return handleUnexpectedError(err, res);
  }
}

function handleUnexpectedError(err, res) {
    if (err.code === 11000) {
        const field =
            Object.keys(err.keyPattern || {})[0] || "field";

        return res.status(409).json({
            success: false,
            message: `Duplicate value for ${field}`,
        });
    }

    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: Object.values(err.errors).map(
                (e) => e.message
            ),
        });
    }

    if (err instanceof mongoose.Error.CastError) {
        return res.status(400).json({
            success: false,
            message: `Invalid value for ${err.path}`,
        });
    }

    console.error("Team controller error:", err);

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}