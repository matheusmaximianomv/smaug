import { Request, Response, NextFunction } from "express";
import { OneTimeExpenseService } from "@src/application/services/one-time-expense.service";
import {
  OneTimeExpensePastCompetenceCreateError,
  OneTimeExpensePastCompetenceEditError,
  OneTimeExpensePastCompetenceDeleteError,
  OneTimeExpenseNotFoundError,
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";
import { ListOneTimeExpenseQueryDto } from "@src/application/dtos/one-time-expense.dto";

export class OneTimeExpenseController {
  public constructor(private readonly service: OneTimeExpenseService) {}

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.create(req.userId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof OneTimeExpensePastCompetenceCreateError) {
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

  public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { competenceYear, competenceMonth } = (req as Request & {
        validatedQuery: ListOneTimeExpenseQueryDto;
      }).validatedQuery;
      const result = await this.service.list(req.userId!, {
        competenceYear,
        competenceMonth,
      });
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
      if (error instanceof OneTimeExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof OneTimeExpensePastCompetenceEditError) {
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

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.delete(req.userId!, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      if (error instanceof OneTimeExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof OneTimeExpensePastCompetenceDeleteError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }
}
