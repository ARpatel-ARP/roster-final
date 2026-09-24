import express from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

router.get('/', verifyJWT, getDashboard); // protected — requires login

export default router;