import express from 'express';
import { changePassword, getProfile, login, logout, register, updateProfile } from '../controllers/auth.controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);       // public
router.get('/profile', verifyJWT, getProfile);    
router.put("/profile", verifyJWT, updateProfile);
router.put("/profile/password", verifyJWT, changePassword);
router.post('/logout', verifyJWT, logout); // must be logged in to log out

export default router;