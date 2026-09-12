import express from "express";

import {
  createRoster,
  getRoster,
  getRosterById,
  updateRoster,
  deleteRoster,
} from "../controllers/roster.controller.js";

import {
  generateMonthlyRoster,
  generateWeeklyRoster,
  generateDailyRoster,
  getGeneratedDailyRoster,
  exportCombinedRoster,
  exportHelpDeskRoster,
   deleteGeneratedRosterById,
   getGeneratedMonthlyRoster,
   getGeneratedWeeklyRoster,
   updateGeneratedRosterById,
   getAllGeneratedRosters,
} from "../controllers/rosterGenerator.controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";

const router = express.Router();


// ===============================
// MANUAL ROSTER
// ===============================

router.post("/", verifyJWT, createRoster);

router.get("/", verifyJWT, getRoster);


// ===============================
// AUTOMATIC ROSTER GENERATION
// ===============================

router.post(
  "/generate/monthly",
  verifyJWT,
  generateMonthlyRoster
);

router.get(
  "/generate/monthly",
  verifyJWT,
  getGeneratedMonthlyRoster
);

router.get(
    "/generate/all",
    verifyJWT,
    getAllGeneratedRosters
);

router.post(
  "/generate/daily",
  verifyJWT,
  generateDailyRoster
);

router.get(
  "/generate/daily",
  verifyJWT,
  getGeneratedDailyRoster
);

router.post(
  "/generate/weekly",
  verifyJWT,
  generateWeeklyRoster
);

router.get(
  "/generate/weekly",
  verifyJWT,
  getGeneratedWeeklyRoster
);

router.put(
    "/generate/:id",
    verifyJWT,
    updateGeneratedRosterById
);

router.delete(
  "/generate/:id",
  verifyJWT,
  deleteGeneratedRosterById
);

router.get(
  "/export/ccc",
  verifyJWT,
  exportCombinedRoster
);

router.get(
  "/export/help-desk",
  verifyJWT,
  exportHelpDeskRoster
);

// ===============================
// SINGLE ROSTER ENTRY
// ===============================

router.get(
  "/:id",
  verifyJWT,
  getRosterById
);

router.put(
  "/:id",
  verifyJWT,
  updateRoster
);

router.delete(
  "/:id",
  verifyJWT,
  deleteRoster
);

export default router;