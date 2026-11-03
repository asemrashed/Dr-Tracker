import { Router } from 'express';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idParams } from '../../shared/search';
import * as controller from './patient.controller';
import { listPatientsQuery, updatePatientSchema } from './patient.schema';

export const patientsRouter = Router();

patientsRouter.use(requireRole('admin'));

patientsRouter.get('/', validate({ query: listPatientsQuery }), controller.list);
patientsRouter.get('/:id', validate({ params: idParams }), controller.get);
patientsRouter.patch('/:id', validate({ params: idParams, body: updatePatientSchema }), controller.update);
patientsRouter.delete('/:id', validate({ params: idParams }), controller.remove);
