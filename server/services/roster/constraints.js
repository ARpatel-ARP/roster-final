import {
  isSaturday,
  isSunday,
  getTeamRule,
} from "./teamRules.js";

const getDateKey = (date) => {
  const d = new Date(date);

  return `${d.getUTCFullYear()}-${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
};

const getEmployeeMap = (
  assignments,
  employeeId
) => assignments.get(employeeId.toString());

const isWorkingAssignment = (assignment) =>
  assignment &&
  assignment.shift?.name !== "Off" &&
  !assignment.isWeeklyOff &&
  !assignment.isLeave;

/*
 * Count consecutive working days immediately
 * before the given date.
 *
 * Maximum allowed working days = 6.
 */
export const getPreviousWorkingDays = (
  employeeId,
  date,
  assignments
) => {
  const map = getEmployeeMap(
    assignments,
    employeeId
  );

  if (!map) return 0;

  let count = 0;

  const cursor = new Date(date);

  cursor.setUTCDate(
    cursor.getUTCDate() - 1
  );

  while (count < 6) {
    const entry = map.get(
      getDateKey(cursor)
    );

    if (!isWorkingAssignment(entry)) {
      break;
    }

    count++;

    cursor.setUTCDate(
      cursor.getUTCDate() - 1
    );
  }

  return count;
};

/*
 * Count Night shifts already assigned.
 */
export const getNightCount = (
  employeeId,
  assignments
) => {
  const map = getEmployeeMap(
    assignments,
    employeeId
  );

  if (!map) return 0;

  return [...map.values()].filter(
    (entry) =>
      entry.shift?.name === "Night" &&
      !entry.isLeave &&
      !entry.isWeeklyOff
  ).length;
};

/*
 * Night -> Morning conflict.
 *
 * Morning shift cannot immediately follow
 * a Night shift from the previous day.
 */
export const hasNightMorningConflict = (
  employeeId,
  date,
  assignments
) => {
  const map = getEmployeeMap(
    assignments,
    employeeId
  );

  if (!map) return false;

  const previous = new Date(date);

  previous.setUTCDate(
    previous.getUTCDate() - 1
  );

  return (
    map.get(
      getDateKey(previous)
    )?.shift?.name === "Night"
  );
};

/*
 * Weekend conflict applies ONLY to teams
 * configured with weekendDifferentEmployees.
 *
 * For example:
 * - Windows
 * - Linux
 * - Network
 *
 * Saturday employee cannot work Sunday,
 * and Sunday employee cannot work Saturday.
 */
export const hasWeekendConflict = (
  employee,
  date,
  assignments
) => {
  if (
    !isSaturday(date) &&
    !isSunday(date)
  ) {
    return false;
  }

  const teamName =
    employee.team?.name ||
    employee.teamName ||
    "";

  const rule = getTeamRule(teamName);

  /*
   * Help Desk and other teams are not
   * blocked unless their policy explicitly
   * requires different weekend employees.
   */
  if (!rule?.weekendDifferentEmployees) {
    return false;
  }

  const map = getEmployeeMap(
    assignments,
    employee._id
  );

  if (!map) return false;

  const other = new Date(date);

  other.setUTCDate(
    other.getUTCDate() +
      (isSaturday(date) ? 1 : -1)
  );

  return isWorkingAssignment(
    map.get(getDateKey(other))
  );
};

/*
 * Help Desk recovery rule.
 *
 * If an employee worked Night shift on the
 * previous two consecutive days, the current
 * day must be Off.
 */
export const hasHelpDeskNightRecoveryConflict = (
  employee,
  date,
  assignments
) => {
  const teamName =
    employee.team?.name ||
    employee.teamName ||
    "";

  const rule = getTeamRule(teamName);

  if (!rule?.helpDesk) {
    return false;
  }

  const map = getEmployeeMap(
    assignments,
    employee._id
  );

  if (!map) return false;

  const oneDayBefore = new Date(date);
  const twoDaysBefore = new Date(date);

  oneDayBefore.setUTCDate(
    oneDayBefore.getUTCDate() - 1
  );

  twoDaysBefore.setUTCDate(
    twoDaysBefore.getUTCDate() - 2
  );

  const previousDay =
    map.get(
      getDateKey(oneDayBefore)
    );

  const twoDaysPrevious =
    map.get(
      getDateKey(twoDaysBefore)
    );

  return (
    previousDay?.shift?.name === "Night" &&
    !previousDay.isLeave &&
    twoDaysPrevious?.shift?.name === "Night" &&
    !twoDaysPrevious.isLeave
  );
};

/*
 * Get all Saturday-Sunday pairs within
 * the generation period.
 */
export const getWeekendPairs = (dates) => {
  const pairs = [];
  const seen = new Set();

  for (const date of dates) {
    const d = new Date(date);
    const day = d.getUTCDay();

    if (day !== 6 && day !== 0) {
      continue;
    }

    const saturday = new Date(d);

    if (day === 0) {
      saturday.setUTCDate(
        d.getUTCDate() - 1
      );
    }

    saturday.setUTCHours(
      0,
      0,
      0,
      0
    );

    const sunday = new Date(saturday);

    sunday.setUTCDate(
      saturday.getUTCDate() + 1
    );

    const key = getDateKey(saturday);

    if (!seen.has(key)) {
      seen.add(key);

      pairs.push({
        saturday,
        sunday,
        key,
      });
    }
  }

  return pairs;
};

/*
 * Check whether an employee received
 * both Saturday and Sunday off.
 */
export const hasCompleteWeekendOff = (
  employeeId,
  weekendPair,
  assignments
) => {
  const map = getEmployeeMap(
    assignments,
    employeeId
  );

  if (!map) return true;

  return (
    !isWorkingAssignment(
      map.get(
        getDateKey(
          weekendPair.saturday
        )
      )
    ) &&
    !isWorkingAssignment(
      map.get(
        getDateKey(
          weekendPair.sunday
        )
      )
    )
  );
};

/*
 * Main assignment validation.
 */
export const validateAssignmentConstraints = ({
  employee,
  shift,
  date,
  assignments,
  maxNightPerMonth =
    employee.maxNightPerMonth ?? 0,
}) => {
  const map = getEmployeeMap(
    assignments,
    employee._id
  );

  const key = getDateKey(date);

  /*
   * One assignment per employee per day.
   */
  if (map?.has(key)) {
    return {
      allowed: false,
      reason:
        "Employee already has an assignment on this date",
    };
  }

  /*
   * Weekend different-employee policy.
   */
  if (
    hasWeekendConflict(
      employee,
      date,
      assignments
    )
  ) {
    return {
      allowed: false,
      reason:
        "Employee cannot work both Saturday and Sunday of the same weekend",
    };
  }

  /*
   * Help Desk:
   * After two consecutive Night shifts,
   * next day must be Off.
   */
  if (
    hasHelpDeskNightRecoveryConflict(
      employee,
      date,
      assignments
    )
  ) {
    return {
      allowed: false,
      reason:
        "Help Desk employee must receive a day off after two consecutive Night shifts",
    };
  }

  /*
   * Night -> Morning conflict.
   */
  if (
    shift.name === "Morning" &&
    hasNightMorningConflict(
      employee._id,
      date,
      assignments
    )
  ) {
    return {
      allowed: false,
      reason:
        "Morning shift cannot immediately follow Night shift",
    };
  }

  /*
   * Maximum 6 consecutive working days.
   */
  if (
    isWorkingAssignment({ shift }) &&
    getPreviousWorkingDays(
      employee._id,
      date,
      assignments
    ) >= 6
  ) {
    return {
      allowed: false,
      reason:
        "Employee has already worked 6 consecutive days",
    };
  }

  /*
   * Monthly Night shift limit.
   *
   * 0 means the employee cannot be assigned
   * any Night shift.
   */
  if (
    shift.name === "Night" &&
    getNightCount(
      employee._id,
      assignments
    ) >= maxNightPerMonth
  ) {
    return {
      allowed: false,
      reason:
        "Maximum monthly Night shift limit reached",
    };
  }

  return {
    allowed: true,
  };
};