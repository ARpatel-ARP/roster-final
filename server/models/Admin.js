import mongoose from "mongoose"
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"]
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 70,
        },
        role: {
            type: String,
            enum: ['admin', 'superadmin'],
            default: 'admin',
            required:true,
        },
    },
    { timestamps: true }
);

// saves the password as hash on mongoDb , for safety

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

adminSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};



export default mongoose.model("Admin", adminSchema);