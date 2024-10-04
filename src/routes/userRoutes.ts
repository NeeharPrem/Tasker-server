import express from 'express';
import { registerUser, loginUser, getEmployees,logout} from '../controller/userController';
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/:managerId', getEmployees)
router.post('/logout',logout)

export default router;