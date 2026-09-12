import express from "express";

import {
    createLeave,
    getLeaves,
    getLeaveById,
    updateLeave,
    deleteLeave,
    getLeaveBalance,
} from "../controllers/leave.controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";

const router = express.Router();

// POST /api/leaves
router.post("/", verifyJWT, createLeave);

// GET /api/leaves
router.get("/", verifyJWT, getLeaves);

// GET /api/leaves/:id
router.get("/balance/:employeeId", verifyJWT, getLeaveBalance);
router.get("/:id", verifyJWT, getLeaveById);

// PUT /api/leaves/:id
router.put("/:id", verifyJWT, updateLeave);

// DELETE /api/leaves/:id
router.delete("/:id", verifyJWT, deleteLeave);

export default router;