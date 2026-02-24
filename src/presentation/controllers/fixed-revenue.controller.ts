import { Request, Response, NextFunction } from "express";
import { FixedRevenueService } from "@src/application/services/fixed-revenue.service";
import { PastStartDateError } from "@src/domain/use-cases/fixed-revenue/create-fixed-revenue.use-case";
import { FixedRevenueNotFoundError } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import {
  UnalterableRevenueError,
  PastEffectiveDateError,
  EffectiveDateBeforeStartError,
  EffectiveDateAfterEndError,
  VersionConflictError,
} from "@src/domain/use-cases/fixed-revenue/update-fixed-revenue.use-case";
import {
  AlreadyExpiredError,
  PastTerminationDateError,
} from "@src/domain/use-cases/fixed-revenue/terminate-fixed-revenue.use-case";

export class FixedRevenueController {
  constructor(private readonly service: FixedRevenueService) {}

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.create(req.userId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof PastStartDateError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getById(req.userId!, req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof FixedRevenueNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.update(req.userId!, req.params.id as string, req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof FixedRevenueNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof UnalterableRevenueError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof PastEffectiveDateError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof EffectiveDateBeforeStartError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof EffectiveDateAfterEndError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof VersionConflictError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async terminate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.terminate(req.userId!, req.params.id as string, req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof FixedRevenueNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof AlreadyExpiredError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof PastTerminationDateError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.delete(req.userId!, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      if (error instanceof FixedRevenueNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }
}
