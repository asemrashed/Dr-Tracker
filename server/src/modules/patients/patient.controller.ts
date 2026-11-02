import type { Request, Response } from 'express';
import * as service from './patient.service';

export const remove = async (req: Request, res: Response) => {
  await service.softDelete(String(req.params.id));
  res.status(204).end();
};
