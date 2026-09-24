import express from 'express';
import { verifyJWT } from '../middleware/verifyJWT.js';

import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
} from '../controllers/team.controller.js';

const router = express.Router();

// POST /api/teams - admin only
router.post('/', verifyJWT, createTeam);

// GET /api/teams - authenticated user
router.get('/', verifyJWT, getTeams);

// GET /api/teams/:id - authenticated user
router.get('/:id', verifyJWT, getTeamById);

// PUT /api/teams/:id - admin only
router.put('/:id', verifyJWT, updateTeam);

// DELETE /api/teams/:id - admin only
router.delete('/:id', verifyJWT, deleteTeam);

export default router;