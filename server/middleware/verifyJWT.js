import jwt from 'jsonwebtoken';

/**
 * Verifies the JWT stored in the HttpOnly cookie.
 * Attaches decoded admin info to req.admin if valid.
 * Blocks the request with 401 if missing/invalid/expired.
 */
export const verifyJWT = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.admin = { id: decoded.id };
    next();
  } catch (error) {
    // jwt.verify throws TokenExpiredError for expired tokens specifically
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired, please log in again',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid token',
    });
  }
};