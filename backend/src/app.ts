// Save as: backend/src/app.ts
import express from 'express';
import cors from 'cors';
import { router } from './routes';
import { errorMiddleware } from './middleware/error.middleware';

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', router);

app.use(errorMiddleware);