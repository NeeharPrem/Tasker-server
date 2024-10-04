import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
    title: string;
    details: string;
    date: Date;
    assignedTo: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
}

const TaskSchema: Schema = new Schema({
    title: { type: String, required: true },
    details: { type: String, required: true },
    date: { type: Date, required: true },
    assignedTo: { type: [Schema.Types.ObjectId], ref: 'User'},
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;