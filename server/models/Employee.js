import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    experience: {
      type: Number, // years of experience
      default: 0,
    },
    nightAllowed: {
      type: Boolean,
      default: true,
    },
    maxNightPerMonth: {
      type: Number,
      default: 0,
    },
    preferredShift: {
      type: String,
      enum: ['Morning', 'Evening', 'Night', 'General'],
    },
    preferredWeeklyOff: {
      type: String,
      enum: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'On Leave'],
      default: 'Active',
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Employee', employeeSchema);