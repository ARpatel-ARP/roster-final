import Leave from "../../models/Leave.js";
import LeaveBalance from "../../models/LeaveBalance.js";

export const ANNUAL_LEAVE_ENTITLEMENT = 15;
// Kept only as an informational average (15 / 12) stored on the balance record.
// Actual accrual is always in whole days - see getAccruedLeaveForDate().
export const MONTHLY_LEAVE_ACCRUAL = 1.25;

const dateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysInclusive = (start, end) => Math.floor((dateOnly(end) - dateOnly(start)) / 86400000) + 1;

/**
 * Leave is accrued in WHOLE days only (no fractions).
 *
 * 15 days / 12 months does not divide evenly, so we take the whole days
 * earned so far: floor(month * 15 / 12). The extra days land in Apr, Aug and
 * Dec and the running total always reaches exactly 15 by December.
 *
 *   Jan 1  | Feb 2  | Mar 3  | Apr 5  | May 6  | Jun 7
 *   Jul 8  | Aug 10 | Sep 11 | Oct 12 | Nov 13 | Dec 15
 *
 * Integer arithmetic is used on purpose to avoid floating point drift.
 */
export const getAccruedLeaveForDate = (date) => {
  const month = new Date(date).getMonth() + 1; // 1..12
  return Math.min(
    ANNUAL_LEAVE_ENTITLEMENT,
    Math.floor((month * ANNUAL_LEAVE_ENTITLEMENT) / 12)
  );
};

// Whole-day helper used for any value that may have been stored as a decimal
// by the previous (fractional) accrual logic.
const wholeDays = (value) => Math.max(0, Math.floor(Number(value) || 0));

// Same, but negative values are allowed (used for the admin adjustment).
const wholeAdjustment = (value) => Math.trunc(Number(value) || 0);

const accruedForYear = (year) => {
  const currentYear = new Date().getFullYear();
  if (year < currentYear) return ANNUAL_LEAVE_ENTITLEMENT;
  if (year > currentYear) return 0;
  return getAccruedLeaveForDate(new Date());
};

// Unclamped available balance (can be negative internally).
const rawAvailable = (balance, year) =>
  wholeDays(balance.carriedForward) +
  accruedForYear(year) +
  wholeAdjustment(balance.manualAdjustment) -
  wholeDays(balance.paidLeaveUsed);

export const ensureLeaveBalance = async (employeeId, year) => {
  let balance = await LeaveBalance.findOne({ employee: employeeId, year });
  if (balance) return balance;

  let carriedForward = 0;
  const previous = await LeaveBalance.findOne({ employee: employeeId, year: year - 1 });
  if (previous) {
    carriedForward = wholeDays(
      previous.annualEntitlement +
        wholeDays(previous.carriedForward) +
        wholeAdjustment(previous.manualAdjustment) -
        previous.paidLeaveUsed
    );
  }

  balance = await LeaveBalance.create({
    employee: employeeId,
    year,
    annualEntitlement: ANNUAL_LEAVE_ENTITLEMENT,
    monthlyAccrual: MONTHLY_LEAVE_ACCRUAL,
    openingBalance: carriedForward,
    accruedBalance: year < new Date().getFullYear() ? ANNUAL_LEAVE_ENTITLEMENT : year > new Date().getFullYear() ? 0 : getAccruedLeaveForDate(new Date()),
    carriedForward,
    paidLeaveUsed: 0,
    unpaidLeaveUsed: 0,
  });
  return balance;
};

/**
 * Recalculate paid/unpaid allocation for all approved leaves of an employee
 * in one calendar year. This avoids double-counting when an approved leave
 * is edited or rejected later.
 */
export const recalculateEmployeeYearLeave = async (employeeId, year) => {
  const balance = await ensureLeaveBalance(employeeId, year);
  const leaves = await Leave.find({
    employee: employeeId,
    status: "Approved",
    startDate: { $lte: new Date(year, 11, 31, 23, 59, 59, 999) },
    endDate: { $gte: new Date(year, 0, 1) },
  }).sort({ startDate: 1, createdAt: 1 });

  let paidUsed = 0;
  let unpaidUsed = 0;

  for (const leave of leaves) {
    const start = new Date(Math.max(leave.startDate.getTime(), new Date(year, 0, 1).getTime()));
    const end = new Date(Math.min(leave.endDate.getTime(), new Date(year, 11, 31, 23, 59, 59, 999).getTime()));
    const requestedDays = daysInclusive(start, end);
    const accruedAtLeaveEnd = getAccruedLeaveForDate(end);
    const available = Math.max(
      0,
      wholeDays(balance.carriedForward) +
        accruedAtLeaveEnd +
        wholeAdjustment(balance.manualAdjustment) -
        paidUsed
    );
    const paidDays = Math.min(requestedDays, available);
    const unpaidDays = requestedDays - paidDays;

    leave.paidDays = paidDays;
    leave.unpaidDays = unpaidDays;
    leave.leaveDays = requestedDays;
    await leave.save();

    paidUsed += paidDays;
    unpaidUsed += unpaidDays;
  }

  const currentYear = new Date().getFullYear();
  balance.accruedBalance = year < currentYear
    ? ANNUAL_LEAVE_ENTITLEMENT
    : year > currentYear
      ? 0
      : getAccruedLeaveForDate(new Date());
  balance.paidLeaveUsed = paidUsed;
  balance.unpaidLeaveUsed = unpaidUsed;
  await balance.save();
  return balance;
};

export const getLeaveBalanceSummary = async (employeeId, year) => {
  const balance = await ensureLeaveBalance(employeeId, year);
  const currentYear = new Date().getFullYear();
  const accrued = year < currentYear
    ? ANNUAL_LEAVE_ENTITLEMENT
    : year > currentYear
      ? 0
      : getAccruedLeaveForDate(new Date());
  const carriedForward = wholeDays(balance.carriedForward);
  const paidLeaveUsed = wholeDays(balance.paidLeaveUsed);
  const manualAdjustment = wholeAdjustment(balance.manualAdjustment);
  const available = Math.max(0, carriedForward + accrued + manualAdjustment - paidLeaveUsed);
  return {
    year,
    annualEntitlement: balance.annualEntitlement,
    monthlyAccrual: balance.monthlyAccrual,
    carriedForward,
    accrued,
    manualAdjustment,
    paidLeaveUsed,
    unpaidLeaveUsed: wholeDays(balance.unpaidLeaveUsed),
    availablePaidLeave: available,
  };
};


/**
 * Admin override: make the employee's available paid leave for `year` equal to
 * `target` whole days (e.g. because leave was taken before the app was in use).
 *
 * We do not store the target itself. We store the difference between the target
 * and the calculated balance as `manualAdjustment`, so monthly accrual and any
 * leave approved later keep working normally on top of it.
 */
export const setAvailablePaidLeave = async (employeeId, year, target) => {
  if (!Number.isInteger(target) || target < 0) {
    throw new RangeError("Available leave must be a whole number of days (0 or more)");
  }

  // Approving/allocating leaves depends on the adjustment, so re-check after
  // each change. This converges in one or two passes.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const balance = await recalculateEmployeeYearLeave(employeeId, year);
    const difference = target - rawAvailable(balance, year);
    if (difference === 0) break;
    balance.manualAdjustment = wholeAdjustment(balance.manualAdjustment) + difference;
    await balance.save();
  }

  // Final pass so paid/unpaid split on existing leaves matches the new balance.
  await recalculateEmployeeYearLeave(employeeId, year);
  return getLeaveBalanceSummary(employeeId, year);
};