import mongoose from 'mongoose';

/**
 * RosterMonth — one document per calendar month.
 * Tracks whether that month's roster has been generated/published.
 */
const rosterMonthSchema = new mongoose.Schema(
  {
    month: {
      type: Number, // 1-12
      required: true,
      min: 1,
      max: 12,
    },
    team: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Team",
  required: true,
},
    year: {
  type: Number,
  required: true,
},
generationType: {
  type: String,
  enum: ["daily", "weekly", "monthly"],
  required: true,
},
published: {
      type: Boolean,
      default: false,
    },
    generatedAt: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true }
);

rosterMonthSchema.index({ team: 1, month: 1, year: 1 }, { unique: true });

export const RosterMonth = mongoose.model('RosterMonth', rosterMonthSchema);

/**
 * RosterEntry — one document per employee per date.
 * Actual roster data used for calendar view, manual edits,
 * and business-rule validation (night balancing, consecutive days, etc).
 */
const rosterEntrySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    month: {
      type: Number, // denormalized for fast month-level queries
      required: true,
    },
    year: {
      type: Number, // denormalized for fast month-level queries
      required: true,
    },
    isWeeklyOff: {
      type: Boolean,
      default: false,
    },
    isHoliday: {
      type: Boolean,
      default: false,
    },
    isLeave: {
      type: Boolean,
      default: false,
    },
    manuallyEdited: {
      type: Boolean,
      default: false, // true if admin overrode the auto-generated entry
    },
  },
  { timestamps: true }
);

// Enforces "one shift per employee per day"
rosterEntrySchema.index({ employee: 1, date: 1 }, { unique: true });
// Speeds up month-view queries and night-shift-balance calculations
rosterEntrySchema.index({ month: 1, year: 1, employee: 1 });

export const RosterEntry = mongoose.model('RosterEntry', rosterEntrySchema);