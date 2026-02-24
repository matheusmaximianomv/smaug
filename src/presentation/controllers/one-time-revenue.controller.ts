import { Request, Response, NextFunction } from "express";
import { OneTimeRevenueService } from "@src/application/services/one-time-revenue.service";
import { PastCompetenceError } from "@src/domain/use-cases/one-time-revenue/create-one-time-revenue.use-case";
import {
  RevenueNotFoundError,
  PastCompetenceEditError,
} from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";

export class OneTimeRevenueController {
  constructor(private readonly service: OneTimeRevenueService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.create(req.userId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof PastCompetenceError) {
        res.status(409).json({ error: "PAST_COMPETENCE", message: error.message });
        return;
      }
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const competenceYear = req.query.competenceYear
        ? Number(req.query.competenceYear)
        : undefined;
      const competenceMonth = req.query.competenceMonth
        ? Number(req.query.competenceMonth)
        : undefined;
      const result = await this.service.list(req.userId!, { competenceYear, competenceMonth });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.update(req.userId!, req.params.id as string, req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof RevenueNotFoundError) {
        res.status(404).json({ error: "REVENUE_NOT_FOUND", message: error.message });
        return;
      }
      if (error instanceof PastCompetenceEditError) {
        res.status(409).json({ error: "PAST_COMPETENCE", message: error.message });
        return;
      }
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.delete(req.userId!, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      if (error instanceof RevenueNotFoundError) {
        res.status(404).json({ error: "REVENUE_NOT_FOUND", message: error.message });
        return;
      }
      if (error instanceof PastCompetenceEditError) {
        res.status(409).json({ error: "PAST_COMPETENCE", message: error.message });
        return;
      }
      next(error);
    }
  };
}
