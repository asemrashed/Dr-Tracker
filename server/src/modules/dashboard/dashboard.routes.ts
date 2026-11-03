import { Router } from 'express';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './dashboard.controller';
import { statsQuery } from './dashboard.schema';

export const dashboardRouter = Router();

dashboardRouter.use(requireRole('admin'));
dashboardRouter.get('/stats', validate({ query: statsQuery }), controller.stats);
