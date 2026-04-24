import { Request, Response, NextFunction } from "express";
import { RecurringExpenseService } from "@src/application/services/recurring-expense.service";
import {
  PastCompetenceError,
  ExpenseCategoryNotFoundError,
  RecurringExpenseNotFoundError,
  PastEffectiveDateError,
  EffectiveDateOutOfRangeError,
  RecurringExpenseAlreadyExpiredError,
  EndDateBeforeStartError,
} from "@src/domain/errors/domain-error";

export class RecurringExpenseController {
  public constructor(private readonly service: RecurringExpenseService) {}

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.create(req.userId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof PastCompetenceError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof ExpenseCategoryNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.get(req.userId!, req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof RecurringExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.list(req.userId!);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof ExpenseCategoryNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.update(req.userId!, req.params.id as string, req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof RecurringExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof PastEffectiveDateError || error instanceof EffectiveDateOutOfRangeError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof ExpenseCategoryNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
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
      if (error instanceof RecurringExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof PastCompetenceError || error instanceof RecurringExpenseAlreadyExpiredError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof EndDateBeforeStartError) {
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
      if (error instanceof RecurringExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }
}
