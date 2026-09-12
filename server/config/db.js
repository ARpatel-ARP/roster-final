import mongoose from 'mongoose';

/**
 * Connects to MongoDB using the URI from environment variables.
 * Call this once when the server starts (in server.js / index.js).
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1); // stop the server if DB connection fails
  }
};

// Optional: log connection state changes (useful during dev/debugging)
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB error: ${err.message}`);
});

export default connectDB;