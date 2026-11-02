import type { Request, Response } from 'express';
import * as patients from '../patients/patient.service';
import type { ListDoctorPatientsQuery } from '../patients/patient.schema';
import * as service from './doctor.service';
import type { ListDoctorsQuery } from './doctor.schema';

const id = (req: Request) => String(req.params.id);

export const list = async (req: Request, res: Response) => {
  const { items, meta } = await service.list(req.query as unknown as ListDoctorsQuery);
  res.json({ data: items, meta });
};

export const meta = async (_req: Request, res: Response) => {
  res.json({ data: await service.getMeta() });
};

export const get = async (req: Request, res: Response) => {
  res.json({ data: await service.getById(id(req)) });
};

export const create = async (req: Request, res: Response) => {
  res.status(201).json({ data: await service.create(req.body) });
};

export const update = async (req: Request, res: Response) => {
  res.json({ data: await service.update(id(req), req.body) });
};

export const remove = async (req: Request, res: Response) => {
  await service.remove(id(req));
  res.status(204).end();
};

export const reassignCandidates = async (req: Request, res: Response) => {
  res.json({ data: await service.reassignCandidates(id(req)) });
};

export const reassignAndDelete = async (req: Request, res: Response) => {
  const data = await service.reassignAndDelete(id(req), req.body.targetDoctorId);
  res.json({ data });
};

export const listPatients = async (req: Request, res: Response) => {
  const { items, meta } = await patients.listForDoctor(id(req), req.query as unknown as ListDoctorPatientsQuery);
  res.json({ data: items, meta });
};

export const createPatient = async (req: Request, res: Response) => {
  res.status(201).json({ data: await patients.createForDoctor(id(req), req.body) });
};
