import { RosterEntry } from "../../models/Roster.js";

import {
  getTeamRule,
  getRequiredShiftsForDate,
  isSaturday,
  isSunday,
} from "./teamRules.js";

// --------------------------------------------------
// Date Helpers — UTC Safe
// --------------------------------------------------

const getDateKey = (date) => {
  const d = new Date(date);

  return `${d.getUTCFullYear()}-${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
};

const dayRange = (date) => {
  const start = new Date(date);

  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);

  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
};

// --------------------------------------------------
// Team ↔ Shift Compatibility
// --------------------------------------------------

export const validateTeamShiftCompatibility = ({
  employee,
  team,
  shift,
  date,
}) => {
  const rule = getTeamRule(team?.name);

  if (!rule || shift.name === "Off") {
    return null;
  }

  const requiredShifts = getRequiredShiftsForDate(
    team.name,
    date
  );

  if (!requiredShifts[shift.name]) {
    return `${team.name} employees cannot be assigned to the ${shift.name} shift under the roster policy`;
  }

  return null;
};

// --------------------------------------------------
// Weekend Assignment Validation
// --------------------------------------------------

export const validateWeekendAssignment = async ({
  employeeId,
  date,
  shift,
  excludeRosterId = null,
}) => {
  if (shift.name === "Off") return null;

  if (!isSaturday(date) && !isSunday(date)) {
    return null;
  }

  const otherDate = new Date(date);

  otherDate.setUTCDate(
    otherDate.getUTCDate() +
      (isSaturday(date) ? 1 : -1)
  );

  const { start, end } = dayRange(otherDate);

  const filter = {
    employee: employeeId,
    date: {
      $gte: start,
      $lte: end,
    },
  };

  if (excludeRosterId) {
    filter._id = {
      $ne: excludeRosterId,
    };
  }

  const otherEntry =
    await RosterEntry.findOne(filter)
      .populate("shift", "name")
      .lean();

  // Only reject if the employee actually
  // has a working assignment on the
  // opposite day.
  if (
    otherEntry &&
    otherEntry.shift?.name !== "Off"
  ) {
    return "An employee cannot work both Saturday and Sunday of the same weekend";
  }

  return null;
};

// --------------------------------------------------
// Help Desk Night → Off Recovery
// --------------------------------------------------

export const validateHelpDeskNightRecovery = async ({
  employee,
  team = null,
  date,
  shift,
  excludeRosterId = null,
}) => {
  const rule = getTeamRule(
    team?.name ||
      employee.team?.name ||
      employee.teamName
  );

  if (!rule?.helpDesk || shift.name === "Off") {
    return null;
  }

  const first = new Date(date);

  first.setUTCDate(
    first.getUTCDate() - 1
  );

  const second = new Date(date);

  second.setUTCDate(
    second.getUTCDate() - 2
  );

  const { start } = dayRange(second);
  const { end } = dayRange(first);

  const filter = {
    employee: employee._id,
    date: {
      $gte: start,
      $lte: end,
    },
  };

  if (excludeRosterId) {
    filter._id = {
      $ne: excludeRosterId,
    };
  }

  const entries =
    await RosterEntry.find(filter)
      .populate("shift", "name")
      .lean();

  const byDate = new Map(
    entries.map((entry) => [
      getDateKey(entry.date),
      entry,
    ])
  );

  const firstEntry = byDate.get(
    getDateKey(first)
  );

  const secondEntry = byDate.get(
    getDateKey(second)
  );

  if (
    firstEntry?.shift?.name === "Night" &&
    secondEntry?.shift?.name === "Night"
  ) {
    return "Help Desk employee must receive a day off after two consecutive Night shifts";
  }

  return null;
};