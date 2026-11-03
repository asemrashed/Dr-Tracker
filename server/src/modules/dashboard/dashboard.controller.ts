import type { Request, Response } from 'express';
import type { StatsQuery } from './dashboard.schema';
import * as service from './dashboard.service';

export const stats = async (req: Request, res: Response) => {
  const { days } = req.query as unknown as StatsQuery;
  res.json({ data: await service.stats(days) });
};
