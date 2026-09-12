import 'dotenv/config'; // loads .env before anything else runs
import app from './app.js';
import connectDB from './config/db.js';
import { RosterMonth } from './models/Roster.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB, then start the server
connectDB().then(async () => {
  // Team-wise rosters require team+month+year to be unique.
  // Remove the legacy month/year-only index if it exists.
  try {
    const indexes = await RosterMonth.collection.indexes();
    const legacyIndexes = indexes.filter(
      (index) =>
        index.unique &&
        index.key?.month === 1 &&
        index.key?.year === 1 &&
        !index.key?.team
    );
    for (const index of legacyIndexes) {
      await RosterMonth.collection.dropIndex(index.name);
      console.log(`Removed legacy RosterMonth index: ${index.name}`);
    }
    await RosterMonth.createIndexes();
  } catch (error) {
    console.error("RosterMonth index migration error:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});