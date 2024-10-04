import { Router } from 'express';
import {createTask,assignTask,updateTask,deleteTask,getTasks,getTaskDetails} from "../controller/taskController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();
// router.use(authMiddleware);
router.post("/:id", createTask);
router.post("/:taskId/:managerId/employees", assignTask);
router.put("/:taskId/:managerId", updateTask);
router.delete("/:taskId", deleteTask);
router.post('/:managerId/tasks', getTasks)
router.get('/:taskId',getTaskDetails)
export default router;