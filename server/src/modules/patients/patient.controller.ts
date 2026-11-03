import type { Request, Response } from 'express';
import type { ListPatientsQuery } from './patient.schema';
import * as service from './patient.service';

const id = (req: Request) => String(req.params.id);

export const list = async (req: Request, res: Response) => {
  const { items, meta } = await service.list(req.query as unknown as ListPatientsQuery);
  res.json({ data: items, meta });
};

export const get = async (req: Request, res: Response) => {
  res.json({ data: await service.getById(id(req)) });
};

export const update = async (req: Request, res: Response) => {
  res.json({ data: await service.update(id(req), req.body) });
};

export const remove = async (req: Request, res: Response) => {
  await service.softDelete(id(req));
  res.status(204).end();
};
