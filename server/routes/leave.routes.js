import express from "express";

import {
    createLeave,
    getLeaves,
    getLeaveById,
    updateLeave,
    deleteLeave,
    getLeaveBalance,
    updateLeaveBalance,
} from "../controllers/leave.controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";

const router = express.Router();

// POST /api/leaves
router.post("/", verifyJWT, createLeave);

// GET /api/leaves
router.get("/", verifyJWT, getLeaves);

// GET /api/leaves/:id
router.get("/balance/:employeeId", verifyJWT, getLeaveBalance);

// PUT /api/leaves/balance/:employeeId - admin correction of available leave
router.put("/balance/:employeeId", verifyJWT, updateLeaveBalance);

router.get("/:id", verifyJWT, getLeaveById);

// PUT /api/leaves/:id
router.put("/:id", verifyJWT, updateLeave);

// DELETE /api/leaves/:id
router.delete("/:id", verifyJWT, deleteLeave);

export default router;