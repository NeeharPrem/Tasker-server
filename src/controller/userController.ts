import { Request, Response } from "express";
import User from "../model/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Register
export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400).json({
                success: false,
                message: "User already exists",
                data: null
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
        });

        await user.save();
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: { id: user._id, name: user.name, role: user.role }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};

// Login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid email or password",
                data: null
            });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: "Invalid email or password",
                data: null
            });
            return;
        }

        const role = user.role === 'Manager' ? 'Manager' : 'Employee';

        const token = jwt.sign({ id: user._id,role:role }, process.env.JWT_SECRET!, { expiresIn: "1h" });
        res.cookie('userJWT', token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

    
        const data = {
            name: user.name,
            id: user._id,
            role
        };

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: { token, user: data }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};

// Get employees
export const getEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
        const { managerId } = req.params;
        const users = await User.find({
            $or: [
                { managerId: managerId },
                { managerId: { $exists: false } },
                { managerId: null }
            ],
            _id: { $ne: managerId }
        }).select(['name', '_id']);

        if (!users.length) {
            res.status(404).json({
                success: false,
                message: "No employees found for this manager",
                data: null
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Employees fetched successfully",
            data: { employees: users }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};


//logout
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        res.cookie("userJWT", "", {
            httpOnly: true,
            expires: new Date(0),
        });
        res.status(200).json("Logged Out Successfully");
    } catch (error) {
        console.log(error)
    }
};