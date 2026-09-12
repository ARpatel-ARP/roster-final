import jwt from 'jsonwebtoken';

const generateToken = (res, adminId) => {
  const token = jwt.sign({ id: adminId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '1d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  return token;
};

export default generateToken;