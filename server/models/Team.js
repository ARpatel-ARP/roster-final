import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    manager: {
      // team lead / manager — references an Employee
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Team', teamSchema);