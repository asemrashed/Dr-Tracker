import { Router } from 'express';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idParams } from '../../shared/search';
import * as controller from './patient.controller';

/** Phase 2 only needs delete (used from the doctor detail page). List/edit arrive in Phase 3. */
export const patientsRouter = Router();

patientsRouter.use(requireRole('admin'));
patientsRouter.delete('/:id', validate({ params: idParams }), controller.remove);
