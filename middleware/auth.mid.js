import { verify } from 'jsonwebtoken';
import { UNAUTHORIZED } from '../constants/httpStatus.js';

export default (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(UNAUTHORIZED).send();
  
  try {
    const decoded = verify(token.token, process.env.JWT_SECRET);

    req.user = decoded;
  } catch (error) {
    res.status(UNAUTHORIZED).send("Not Authorized");
  }

  return next();
};
