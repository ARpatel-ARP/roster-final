import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import generateToken from '../utils/generateToken.js';


export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    // SRS specifies single-admin login only — block registration
    // once an admin already exists, so this route can't be abused later.
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Admin already exists. Registration is closed.',
      });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists',
      });
    }

    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password, // hashed automatically by the pre('save') hook in Admin.js
    });

    generateToken(res, admin._id);

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

// @route  POST /login
// @access Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isPasswordCorrect = await admin.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    generateToken(res, admin._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// @route  GET /profile
// @access Private
export const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select(
      "name email role createdAt updatedAt"
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching admin profile",
    });
  }
};

// @route  PUT /profile
// @access Private
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Prevent changing email to one already used
    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase(),
      _id: { $ne: admin._id },
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "An admin with this email already exists",
      });
    }

    admin.name = name.trim();
    admin.email = email.toLowerCase().trim();

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating admin profile",
    });
  }
};

// @route  PUT /profile/password
// @access Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    const admin = await Admin.findById(req.admin.id).select("+password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isCurrentPasswordCorrect = await admin.comparePassword(
      currentPassword
    );

    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      admin.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    admin.password = newPassword;

    // Admin model pre-save hook hashes the new password
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
};
// @route  POST /logout
// @access Private (must be logged in to log out)
export const logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};