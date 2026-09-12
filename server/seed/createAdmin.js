import 'dotenv/config';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await Admin.findOne({ email: 'admin@rms.com' });
    if (existing) {
      console.log('Admin already exists, skipping.');
      process.exit(0);
    }

    const admin = await Admin.create({
      name: 'Ankit Raut',
      email: 'admin@rms.com',
      password: 'Admin@123', // will be hashed automatically by the pre-save hook
      role: 'admin',
    });

    console.log('Admin created:', admin.email);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();