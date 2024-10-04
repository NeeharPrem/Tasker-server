import express from 'express';
import { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import taskRoutes from './routes/taskRoutes'
import userRoutes from './routes/userRoutes'
import cors from 'cors'

dotenv.config();

const PORT: number = 3000;
const mongouri: string = process.env.MONGO_URI as string;

const app: Express = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_URL || 'http://localhost:5173', credentials: true }));
app.options("*", cors());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

mongoose.connect(mongouri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err: Error) => console.error('Error connecting to MongoDB', err));

app.use("/api/tasks", taskRoutes);
app.use('/api/users', userRoutes)

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});