import express, { Request, Response } from 'express';
import Task from "../model/taskModel";
import User,{IUser} from "../model/userModel";
import { roleCheck } from '../middleware/roleMiddleware';
import mongoose, { Types } from "mongoose";
import jwt from 'jsonwebtoken';

interface CustomRequest extends Request {
    user?: IUser;
}

// Create a task
export const createTask = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        const { title, details, date, employeeIds } = req.body;
        const managerId = req.params.id;

        const task = new Task({
            title,
            details,
            date,
            assignedTo: employeeIds || [],
            createdBy: managerId
        });
        await task.save();

        if (employeeIds && employeeIds.length) {
            await User.updateMany(
                { _id: { $in: employeeIds }, managerId: { $exists: false } },
                { $set: { managerId: managerId } }
            );
        }

        res.status(201).json({ message: "Task created successfully", task });
    } catch (error: unknown) {
        console.error('Error creating task:', error);
        res.status(500).json({
            message: "Error creating task",
            error: (error instanceof Error) ? error.message : "An unknown error occurred"
        });
    }
};

// assign task to employee
export const assignTask = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        const { taskId, managerId } = req.params;
        const { employeeIds } = req.body;

        if (!managerId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        if (!Types.ObjectId.isValid(taskId)) {
            res.status(400).json({ message: "Invalid task ID" });
            return;
        }

        const task = await Task.findById(taskId);
        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        if (task.createdBy.toString() !== managerId.toString()) {
            res.status(403).json({ message: "Not authorized to add employees to this task" });
            return;
        }

        if (!Array.isArray(employeeIds) || employeeIds.some(id => !Types.ObjectId.isValid(id))) {
            res.status(400).json({ message: "Invalid employee IDs" });
            return;
        }

        const uniqueEmployeeIds = [...new Set([...task.assignedTo.map(id => id.toString()), ...employeeIds])];
        task.assignedTo = uniqueEmployeeIds.map(id => new Types.ObjectId(id));
        await task.save();

        res.json({ message: "Employees added to the task successfully", task });
    } catch (error: unknown) {
        console.error('Error in assignTask:', error);
        res.status(500).json({
            message: "Error adding employees to task",
            error: (error instanceof Error) ? error.message : "An unknown error occurred"
        });
    }
};

// Update task
export const updateTask = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        const { taskId, managerId } = req.params;
        let authenticatedManagerId
        let token = req.cookies.userJWT;
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            role: string; id: string 
        };
        
        if(decoded?.role === 'Manager'){
            authenticatedManagerId = decoded.id;
        }else{
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { title, details, date, employeeIds } = req.body;

        if (!authenticatedManagerId || authenticatedManagerId !== managerId) {
            res.status(401).json({ message: "User not authenticated or does not have permission" });
            return;
        }

        if (!Types.ObjectId.isValid(taskId)) {
            res.status(400).json({ message: "Invalid task ID" });
            return;
        }

        const task = await Task.findById(taskId);
        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }


        if (task.createdBy.toString() !== authenticatedManagerId.toString()) {
            res.status(403).json({ message: "Not authorized to update this task" });
            return;
        }

        const updateFields: Partial<{ title: string; details: string; date: Date; assignedTo: string[] }> = {};


        if (title) updateFields.title = title;
        if (details) updateFields.details = details;
        if (date) updateFields.date = new Date(date);

        if (employeeIds && Array.isArray(employeeIds)) {

            const isValid = employeeIds.every((id: string) => Types.ObjectId.isValid(id));
            if (!isValid) {
                res.status(400).json({ message: "Invalid employee IDs in employeeIds array" });
                return;
            }

            const currentAssignedTo = task.assignedTo.map((id: Types.ObjectId) => id.toString());
            const newAssignedTo = employeeIds.map((id: string) => id.toString());

            const addedEmployees = newAssignedTo.filter(id => !currentAssignedTo.includes(id));
            const removedEmployees = currentAssignedTo.filter(id => !newAssignedTo.includes(id));

            if (addedEmployees.length > 0 || removedEmployees.length > 0) {
                updateFields.assignedTo = newAssignedTo;
            }
        }

        const updateResult = await Task.updateOne(
            { _id: taskId },
            { $set: updateFields }
        );

        if (updateResult.modifiedCount === 0) {
            res.status(404).json({ message: "Task not updated or not found" });
            return;
        }

        const updatedTask = await Task.findById(taskId);
        res.json({ message: "Task updated successfully", task: updatedTask });
    } catch (error) {
        console.error("Error in updateTask:", error);
        res.status(500).json({ message: "Error updating task" });
    }
};

// Delete task
export const deleteTask = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        const { taskId } = req.params;
        let token = req.cookies.userJWT;
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            role: string; id: string 
        };

        let managerId
        if(decoded?.role === 'Manager'){
            managerId = decoded.id;
        }else{
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const task = await Task.findById(taskId);
        if (!task || task.createdBy.toString() !== managerId.toString()) {
            res.status(403).json({ message: "Not authorized to delete this task" });
            return;
        }

        await Task.deleteOne({ _id: taskId });
        res.json({ message: "Task removed successfully" });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            message: "Error deleting task",
            error: (error instanceof Error) ? error.message : "An unknown error occurred"
        });
    }
};

//get tasks

export const getTasks = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        const { managerId } = req.params;
        const { date, role } = req.body;

        console.log('Role:', role);
        console.log('Manager/Employee ID:', managerId);
        console.log('Received date:', date);

        if (!Types.ObjectId.isValid(managerId)) {
            res.status(400).json({ message: "Invalid ID" });
            return;
        }

        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            res.status(400).json({ message: "Invalid date format" });
            return;
        }

        const year = parsedDate.getUTCFullYear();
        const month = parsedDate.getUTCMonth();
        const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

        console.log('Start date:', startDate.toISOString());
        console.log('End date:', endDate.toISOString());

        let query;

        if (role === 'Manager') {
            query = {
                createdBy: new Types.ObjectId(managerId),
                date: { $gte: startDate, $lte: endDate }
            };
        } else if (role === 'Employee') {
            query = {
                assignedTo: new Types.ObjectId(managerId),
                date: { $gte: startDate, $lte: endDate }
            };
        } else {
            res.status(400).json({ message: "Invalid role" });
            return;
        }

        const tasks = await Task.find(query);

        console.log('Tasks found:', tasks.length);

        if (tasks.length === 0) {
            res.status(404).json({ message: `No tasks found for the specified month for the ${role}` });
            return;
        }

        res.json({ message: "Tasks retrieved successfully", tasks });
    } catch (error) {
        console.error('Error retrieving tasks:', error);
        res.status(500).json({
            message: "Error retrieving tasks",
            error: (error instanceof Error) ? error.message : "An unknown error occurred"
        });
    }
};


//get task details
export const getTaskDetails = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        const { taskId } = req.params;

        if (!taskId) {
            res.status(400).json({ message: "Task ID is required" });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            res.status(400).json({ message: "Invalid Task ID" });
            return;
        }

        const task = await Task.findById(taskId).populate('assignedTo','name');

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        res.json({ message: "Task retrieved successfully", task });
    } catch (error) {
        console.error('Error retrieving task:', error);
        res.status(500).json({
            message: "Error retrieving task",
            error: (error instanceof Error) ? error.message : "An unknown error occurred"
        });
    }
};