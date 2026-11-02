import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { loginLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import * as controller from './auth.controller';
import { loginSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post('/logout', controller.logout);
authRouter.get('/me', requireAuth, controller.me);
