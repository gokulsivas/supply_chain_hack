// Save as: backend/src/routes/procurement.routes.ts
import { Router } from 'express';
import { extractFromChat, createPurchaseRequest } from '../controllers/procurement.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const procurementRouter = Router();

procurementRouter.use(authMiddleware);
procurementRouter.post('/extract', extractFromChat);
procurementRouter.post('/purchase-requests', createPurchaseRequest);