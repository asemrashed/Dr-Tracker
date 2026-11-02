import { Router } from 'express';
import { requireAuth } from './middleware/auth';
import { authRouter } from './modules/auth/auth.routes';
import { doctorsRouter } from './modules/doctors/doctor.routes';
import { patientsRouter } from './modules/patients/patient.routes';

/**
 * API v1 router. Each domain module mounts here.
 * Everything except /auth/* and /health must use requireAuth.
 * (the dashboard module is added in a later phase)
 */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/doctors', requireAuth, doctorsRouter);
apiRouter.use('/patients', requireAuth, patientsRouter);
