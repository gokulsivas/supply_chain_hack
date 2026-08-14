// Save as: backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);