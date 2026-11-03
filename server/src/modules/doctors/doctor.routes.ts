import { Router } from 'express';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idParams } from '../../shared/search';
import { createPatientSchema, listDoctorPatientsQuery } from '../patients/patient.schema';
import * as controller from './doctor.controller';
import {
  createDoctorSchema,
  listDoctorsQuery,
  reassignBodySchema,
  updateDoctorSchema,
} from './doctor.schema';

export const doctorsRouter = Router();

doctorsRouter.use(requireRole('admin'));

doctorsRouter.get('/', validate({ query: listDoctorsQuery }), controller.list);
doctorsRouter.post('/', validate({ body: createDoctorSchema }), controller.create);
// Static path must be registered before '/:id'.
doctorsRouter.get('/meta/specializations', controller.meta);
doctorsRouter.get('/meta/options', controller.options);

doctorsRouter.get('/:id', validate({ params: idParams }), controller.get);
doctorsRouter.patch('/:id', validate({ params: idParams, body: updateDoctorSchema }), controller.update);
doctorsRouter.delete('/:id', validate({ params: idParams }), controller.remove);

doctorsRouter.get('/:id/reassign-candidates', validate({ params: idParams }), controller.reassignCandidates);
doctorsRouter.post(
  '/:id/reassign-and-delete',
  validate({ params: idParams, body: reassignBodySchema }),
  controller.reassignAndDelete,
);

doctorsRouter.get(
  '/:id/patients',
  validate({ params: idParams, query: listDoctorPatientsQuery }),
  controller.listPatients,
);
doctorsRouter.post(
  '/:id/patients',
  validate({ params: idParams, body: createPatientSchema }),
  controller.createPatient,
);
