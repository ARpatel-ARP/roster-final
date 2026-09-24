/**
 * Mentor-defined team scheduling rules.
 *
 * Weekday and weekend coverage are kept separate because
 * some teams have different requirements on Saturday and Sunday.
 */

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const TEAM_RULES = {
  windows: {
    aliases: ["windows", "windows administrators"],

    // Monday-Friday
    requiredShifts: {
      Morning: 1,
      General: 1,
      Evening: 1,
    },

    // Saturday-Sunday
    weekendCoverage: true,
    weekendShifts: {
      General: 1,
    },

    weekendDifferentEmployees: true,
  },

  linux: {
    aliases: ["linux", "linux administrators"],

    // Monday-Friday
    requiredShifts: {
      Morning: 1,
      General: 1,
      Evening: 1,
    },

    // Saturday-Sunday
    weekendCoverage: true,
    weekendShifts: {
      General: 1,
    },

    weekendDifferentEmployees: true,
    rotation: true,
  },

  network: {
    aliases: ["network", "network administrator", "network administrators"],

    // Monday-Friday
    requiredShifts: {
      General: 1,
      Evening: 1,
    },

    // Saturday-Sunday: only 1 employee required
    weekendCoverage: true,
    weekendShifts: {
      General: 1,
    },

    // Saturday employee cannot work Sunday
    weekendDifferentEmployees: true,
  },

  cloud: {
    aliases: [
      "cloud",
      "cloud administrator",
      "cloud administrators",
    ],

    requiredShifts: {
      General: 1,
    },

    weekendCoverage: false,
  },

  storage: {
    aliases: [
      "storage",
      "storage administrator",
      "storage administrators",
    ],

    requiredShifts: {
      General: 1,
    },

    weekendCoverage: false,
  },

  "help desk": {
    aliases: ["help desk", "helpdesk"],

    requiredShifts: {
      Morning: 1,
      General: 1,
      Evening: 1,
      Night: 1,
    },

    weekendCoverage: true,

    weekendShifts: {
    General: 1,
  },

    helpDesk: true,
    nightRotation: true,
  },
};

export const getTeamRule = (teamName) => {
  const normalized = normalize(teamName);

  return (
    Object.values(TEAM_RULES).find((rule) =>
      rule.aliases.some(
        (alias) => normalize(alias) === normalized
      )
    ) || null
  );
};

export const isConfiguredTeam = (teamName) =>
  Boolean(getTeamRule(teamName));

export const isWeekend = (date) => {
  const day = new Date(date).getUTCDay();
  return day === 0 || day === 6;
};

export const isSaturday = (date) =>
  new Date(date).getUTCDay() === 6;

export const isSunday = (date) =>
  new Date(date).getUTCDay() === 0;

export const getWeekendKey = (date) => {
  const d = new Date(date);
  const day = d.getUTCDay();

  const saturday = new Date(d);

  saturday.setUTCDate(
    d.getUTCDate() - (day === 0 ? 1 : 0)
  );

  saturday.setUTCHours(0, 0, 0, 0);

  return saturday.toISOString().slice(0, 10);
};

export const isWorkingShift = (shift) =>
  shift?.name !== "Off";

/**
 * Returns the required shifts depending on whether
 * the given date is a weekday or weekend.
 */
export const getRequiredShiftsForDate = (
  teamName,
  date
) => {
  const rule = getTeamRule(teamName);

  if (!rule) return {};

  if (isWeekend(date)) {
    if (!rule.weekendCoverage) {
      return {};
    }

    return rule.weekendShifts || {};
  }

  return rule.requiredShifts || {};
};

export const teamNeedsShift = (
  teamName,
  shiftName,
  date
) => {
  const requiredShifts =
    getRequiredShiftsForDate(teamName, date);

  return Boolean(requiredShifts[shiftName]);
};

export const requiredShiftCount = (
  teamName,
  shiftName,
  date
) => {
  const requiredShifts =
    getRequiredShiftsForDate(teamName, date);

  return requiredShifts[shiftName] || 0;
};