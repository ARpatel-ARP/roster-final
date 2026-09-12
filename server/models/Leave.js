import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Approved', 'Rejected', 'Pending'],
      default: 'Pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    leaveDays: { type: Number, default: 0, min: 0 },
    paidDays: { type: Number, default: 0, min: 0 },
    unpaidDays: { type: Number, default: 0, min: 0 },
    salaryDeduction: { type: Number, default: null, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Leave', leaveSchema);