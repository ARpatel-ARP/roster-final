import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    annualEntitlement: {
      type: Number,
      default: 15,
      min: 0,
    },
    monthlyAccrual: {
      type: Number,
      default: 1.25,
      min: 0,
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    accruedBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    carriedForward: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidLeaveUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    unpaidLeaveUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

export default mongoose.model("LeaveBalance", leaveBalanceSchema);
