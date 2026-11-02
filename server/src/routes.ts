import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';

/**
 * API v1 router. Each domain module mounts here.
 * Everything except /auth/* and /health must use requireAuth.
 * (doctors, patients and dashboard modules are added in later phases)
 */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() } });
});

apiRouter.use('/auth', authRouter);
