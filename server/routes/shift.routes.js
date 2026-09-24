import express from "express";

import {
  createShift,
  getShifts,
  getShiftById,
  updateShift,
  deleteShift,
} from "../controllers/shift.controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";

const router = express.Router();

// POST /api/shifts
router.post("/", verifyJWT, createShift);

// GET /api/shifts
router.get("/", verifyJWT, getShifts);

// GET /api/shifts/:id
router.get("/:id", verifyJWT, getShiftById);

// PUT /api/shifts/:id
router.put("/:id", verifyJWT, updateShift);

// DELETE /api/shifts/:id
router.delete("/:id", verifyJWT, deleteShift);

export default router;