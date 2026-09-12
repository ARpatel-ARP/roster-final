import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["Morning", "Evening", "Night", "General", "Off"],
      required: [true, "Shift name is required"],
      unique: true,
      trim: true,
    },

    startTime: {
      type: String,
      required: [true, "Start time is required"],
      trim: true,
    },

    endTime: {
      type: String,
      required: [true, "End time is required"],
      trim: true,
    },

    minimumEmployees: {
      type: Number,
      required: true,
      default: 1,
      min: [0, "Minimum employees cannot be negative"],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    overnight: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Shift", shiftSchema);