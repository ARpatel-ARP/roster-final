import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Holiday', holidaySchema);