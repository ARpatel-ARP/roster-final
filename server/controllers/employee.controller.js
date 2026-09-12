import Employee from '../models/Employee.js';
import {
  isValidObjectId,
  validateEmployeePayload,
} from '../utils/validators.js';
import Leave from '../models/Leave.js';
import { RosterEntry } from '../models/Roster.js';
import Team from "../models/Team.js";

// @route  POST /api/employees
// @access Private (verifyJWT)
export const createEmployee = async (req, res) => {
    try {
        const {
            employeeId,
            name,
            designation,
            team,
            mobile,
            email,
            joiningDate,
            experience,
            nightAllowed,
            maxNightPerMonth,
            preferredShift,
            preferredWeeklyOff,
            status,
            remarks,
        } = req.body;

        // 1. Check required fields
        const requiredFields = { employeeId, name, designation, team, mobile, email, joiningDate };
        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(', ')}`,
            });
        }

        // 2. Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
            });
        }

        // 3. Check duplicate employeeId
        const existingById = await Employee.findOne({ employeeId });
        if (existingById) {
            return res.status(409).json({
                success: false,
                message: `Employee ID '${employeeId}' already exists`,
            });
        }

        // 4. Check duplicate email
        const existingByEmail = await Employee.findOne({ email: email.toLowerCase() });
        if (existingByEmail) {
            return res.status(409).json({
                success: false,
                message: `Email '${email}' is already registered to another employee`,
            });
        }

        // 5. Validate team (if provided) against allowed list
        if (!isValidObjectId(team)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid team id',
            });
        }

        const teamExists = await Team.findById(team);

        if (!teamExists) {
            return res.status(400).json({
                success: false,
                message: `Team with id '${team}' does not exist`,
            });
        }

        if (teamExists.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Team with id '${team}' is inactive`,
            });
        }

        // 6. Validate preferredShift enum (if provided)
        const validShifts = ['Morning', 'Evening', 'Night', 'General'];
        if (preferredShift && !validShifts.includes(preferredShift)) {
            return res.status(400).json({
                success: false,
                message: `Invalid preferredShift. Must be one of: ${validShifts.join(', ')}`,
            });
        }

        // 7. Create employee
        const employee = await Employee.create({
            employeeId,
            name,
            designation,
            team,
            mobile,
            email: email.toLowerCase(),
            joiningDate,
            experience,
            nightAllowed,
            maxNightPerMonth,
            preferredShift,
            preferredWeeklyOff,
            status,
            remarks,
        });

        // 8. Return response
        return res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: employee,
        });
    } catch (error) {
        console.error('Create employee error:', error);

        // Handle Mongoose validation errors distinctly (e.g. enum failures on schema)
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors)
                    .map((e) => e.message)
                    .join(', '),
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error while creating employee',
        });
    }
};

export const getEmployees = async (req, res) => {
    try {
        const { search, team, status, page = 1, limit = 10 } = req.query;

        const filter = {};

        // ---- Search across name, employeeId, email ----
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // case-insensitive partial match
            filter.$or = [
                { name: searchRegex },    // if name contains search
                { employeeId: searchRegex },    // if eID contains search
                { email: searchRegex },    // if Email contains search
            ];
        }

        // ---- Filter by team (exact, case-insensitive) ----
        if (team) {
            if (!isValidObjectId(team)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid team id',
                });
            }

            filter.team = team;
        }

        // ---- Filter by status (exact, case-insensitive) ----
        if (status) {
            filter.status = new RegExp(`^${status}$`, 'i');
        }

        // ---- Pagination ----
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
        const skip = (pageNum - 1) * limitNum;

        const [employees, total] = await Promise.all([
            Employee.find(filter)
    .populate('team', 'name status')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Employee.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            count: employees.length,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            data: employees,
        });
    } catch (error) {
        console.error('Get employees error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching employees',
        });
    }
};

export const getDistinctTeams = async (req, res) => {
  try {
    const teams = await Team.find(
      { status: 'active' },
      '_id name'
    ).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error('Get teams error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching teams',
    });
  }
};

// @route  GET /api/employees/:id
// @access Private (verifyJWT)
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await Employee.findById(id)
  .populate("team", "_id name status");

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: employee,
        });
    } catch (error) {
        console.error('Get employee by id error:', error);

        // Handles malformed Mongo ObjectId (e.g. /api/employees/123)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error while fetching employee',
        });
    }
}

const ALLOWED_UPDATE_FIELDS = [
    'name',
    'designation',
    'team',
    'mobile',
    'email',
    'joiningDate',
    'experience',
    'nightAllowed',
    'maxNightPerMonth',
    'preferredShift',
    'preferredWeeklyOff',
    'status',
    'remarks',
];

// @route  PUT /api/employees/:id
// @access Private (verifyJWT)
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // ---- 1. Validate ID exists ----

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found',
            });
        }

        // ---- 2. Build update object from only allowed fields ----

        const updates = {};
        for (const field of ALLOWED_UPDATE_FIELDS) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided to update',
            });
        }

        // ---- 3. Validate email format if being changed ----

        if (updates.email !== undefined) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(updates.email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format',
                });
            }
            updates.email = updates.email.toLowerCase();

            // Prevent duplicate email (excluding this employee's own record)

            const emailConflict = await Employee.findOne({
                email: updates.email,
                _id: { $ne: id },
            });
            if (emailConflict) {
                return res.status(409).json({
                    success: false,
                    message: `Email '${updates.email}' is already registered to another employee`,
                });
            }
        }

        // ---- 4. Validate preferredShift enum if provided ----

        const validShifts = ['Morning', 'Evening', 'Night', 'General'];

        if (updates.preferredShift !== undefined && !validShifts.includes(updates.preferredShift)) {
            return res.status(400).json({
                success: false,
                message: `Invalid preferredShift. Must be one of: ${validShifts.join(', ')}`,
            });
        }

        // ---- 5. Validate status enum if provided ----

        const validStatuses = ['Active', 'Inactive', 'On Leave'];

        if (updates.status !== undefined && !validStatuses.includes(updates.status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        // Note: employeeId is deliberately not updatable (see ALLOWED_UPDATE_FIELDS).
        // If req.body includes employeeId, it's silently ignored rather than erroring,
        // so partial-form submissions from the frontend don't fail unnecessarily.

        // ---- 6. Apply update ----
        if (updates.team !== undefined) {
    if (!isValidObjectId(updates.team)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid team id',
        });
    }

    const teamExists = await Team.findById(updates.team);

    if (!teamExists) {
        return res.status(400).json({
            success: false,
            message: `Team with id '${updates.team}' does not exist`,
        });
    }

    if (teamExists.status !== 'active') {
        return res.status(400).json({
            success: false,
            message: `Team with id '${updates.team}' is inactive`,
        });
    }
}

        const updatedEmployee = await Employee.findByIdAndUpdate(id, updates, {
            new: true, // return the updated document
            runValidators: true, // enforce schema-level validation (enums, required, etc.)
        });

        return res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            data: updatedEmployee,
        });
    } catch (error) {
        console.error('Update employee error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format',
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors)
                    .map((e) => e.message)
                    .join(', '),
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error while updating employee',
        });
    }
};

export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await Employee.findById(id)
    .populate('team', 'name status');
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found',
            });
        }

        // ---- Check references before allowing delete ----

        // 1. Is this employee referenced in any Leave record?
        const leaveCount = await Leave.countDocuments({ employee: id });

        // 2. Is this employee referenced in any Roster entry?
        const rosterCount = await RosterEntry.countDocuments({ employee: id });

        // 3. Is this employee a manager on one or more teams?
        const managedTeamsCount = await Team.countDocuments({ manager: id });

        if (leaveCount > 0 || rosterCount > 0 || managedTeamsCount > 0) {
            return res.status(409).json({
                success: false,
                message:
                    managedTeamsCount > 0
                        ? 'Employee manages one or more teams. Remove/reassign manager first.'
                        : 'Cannot delete employee: existing records reference this employee.',
                details: {
                    leaveRecords: leaveCount,
                    rosterEntries: rosterCount,
                    managedTeams: managedTeamsCount,
                },
                suggestion:
                    'Consider deactivating this employee instead (PUT /api/employees/:id with { "status": "Inactive" }) to preserve historical data.',
            });
        }

        // No references found — safe to hard delete
        await Employee.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: 'Employee deleted successfully',
        });
    } catch (error) {
        console.error('Delete employee error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error while deleting employee',
        });
    }
};
