import Leave from "../../models/Leave.js";
import LeaveBalance from "../../models/LeaveBalance.js";

export const ANNUAL_LEAVE_ENTITLEMENT = 15;
export const MONTHLY_LEAVE_ACCRUAL = 1.25;

const dateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysInclusive = (start, end) => Math.floor((dateOnly(end) - dateOnly(start)) / 86400000) + 1;

export const getAccruedLeaveForDate = (date) => Math.min(
  ANNUAL_LEAVE_ENTITLEMENT,
  (new Date(date).getMonth() + 1) * MONTHLY_LEAVE_ACCRUAL
);

export const ensureLeaveBalance = async (employeeId, year) => {
  let balance = await LeaveBalance.findOne({ employee: employeeId, year });
  if (balance) return balance;

  let carriedForward = 0;
  const previous = await LeaveBalance.findOne({ employee: employeeId, year: year - 1 });
  if (previous) {
    carriedForward = Math.max(
      0,
      previous.annualEntitlement + previous.carriedForward - previous.paidLeaveUsed
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
    const available = Math.max(0, balance.carriedForward + accruedAtLeaveEnd - paidUsed);
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
  const available = Math.max(0, balance.carriedForward + accrued - balance.paidLeaveUsed);
  return {
    year,
    annualEntitlement: balance.annualEntitlement,
    monthlyAccrual: balance.monthlyAccrual,
    carriedForward: balance.carriedForward,
    accrued,
    paidLeaveUsed: balance.paidLeaveUsed,
    unpaidLeaveUsed: balance.unpaidLeaveUsed,
    availablePaidLeave: available,
  };
};
