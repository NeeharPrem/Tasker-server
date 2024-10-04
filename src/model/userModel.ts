import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    role: "Employee" | "Manager";
    managerId?: mongoose.Types.ObjectId;
}

const userSchema: Schema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String,defalut:'Employee'},
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const User = mongoose.model<IUser>("User", userSchema);
export default User;