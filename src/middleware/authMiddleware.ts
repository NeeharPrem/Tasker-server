import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../model/userModel';
import dotenv from 'dotenv';
import asyncHandler from 'express-async-handler';
import { decode } from 'punycode';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;


interface AuthRequest extends Request {
  user?: IUser;
}

const authMiddleware = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.cookies.userJWT) {
    try {
      token = req.cookies.userJWT;

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

      req.user = await User.findById(decoded.id).select('-password') as IUser;

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

export default authMiddleware;