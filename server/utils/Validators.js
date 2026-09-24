const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const TEAM_STATUSES = ['active', 'inactive'];
export const EMPLOYEE_STATUSES = ['Active', 'Inactive', 'On Leave'];

export function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

export function isValidObjectId(id) {
    return typeof id === 'string' && OBJECT_ID_REGEX.test(id);
}
export function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates the raw request body for employee creation.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateEmployeePayload(body) {
    const errors = [];

    if (!body || typeof body !== 'object') {
        return { valid: false, errors: ['Request body is required'] };
    }

    const { employeeId, name, email, team } = body;

    if (!employeeId || typeof employeeId !== 'string' || !employeeId.trim()) {
        errors.push('employeeId is required');
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
        errors.push('name is required');
    }

    if (email !== undefined && email !== null && email !== '') {
        if (!isValidEmail(email)) {
            errors.push('email is invalid');
        }
    }

    if (team !== undefined && team !== null && team !== '') {
        if (!isValidObjectId(team)) {
            errors.push('team is invalid');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validates the raw request body for team creation.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateTeamCreatePayload(body) {
    const errors = [];

    if (!body || typeof body !== 'object') {
        return { valid: false, errors: ['Request body is required'] };
    }

    const { name, manager, status } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        errors.push('name is required');
    }

    if (manager !== undefined && manager !== null && manager !== '') {
        if (!isValidObjectId(manager)) {
            errors.push('manager is invalid');
        }
    }

    if (status !== undefined && status !== null && status !== '') {
        if (!TEAM_STATUSES.includes(status)) {
            errors.push(`status must be one of: ${TEAM_STATUSES.join(', ')}`);
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validates the raw request body for team updates.
 * All fields optional, but whatever is present must be well-formed.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateTeamUpdatePayload(body) {
    const errors = [];

    if (!body || typeof body !== 'object') {
        return { valid: false, errors: ['Request body is required'] };
    }

    const { name, description, manager, status } = body;

    if (
        name === undefined &&
        description === undefined &&
        manager === undefined &&
        status === undefined
    ) {
        return { valid: false, errors: ['At least one field must be provided to update'] };
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        errors.push('name must be a non-empty string');
    }

    if (
        description !== undefined &&
        description !== null &&
        typeof description !== 'string'
    ) {
        errors.push('description must be a string');
    }

    if (manager !== undefined && manager !== null && manager !== '') {
        if (!isValidObjectId(manager)) {
            errors.push('manager is invalid');
        }
    }

    if (status !== undefined && status !== null && status !== '') {
        if (!TEAM_STATUSES.includes(status)) {
            errors.push(`status must be one of: ${TEAM_STATUSES.join(', ')}`);
        }
    }

    return { valid: errors.length === 0, errors };
}