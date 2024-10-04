import { Request } from 'express';
import { IUser } from '../model/userModel';

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}