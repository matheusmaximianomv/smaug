import { Request, Response, NextFunction } from "express";
import { InstallmentExpenseService } from "@src/application/services/installment-expense.service";
import {
  InstallmentExpensePastStartError,
  InstallmentExpenseNotFoundError,
  InstallmentFinancialImmutableError,
  InstallmentHasPastCompetenceError,
  NoFutureInstallmentsError,
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";

export class InstallmentExpenseController {
  public constructor(private readonly service: InstallmentExpenseService) {}

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.create(req.userId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof InstallmentExpensePastStartError) {
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
      if (error instanceof InstallmentExpenseNotFoundError) {
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
      if (error instanceof InstallmentExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof InstallmentFinancialImmutableError) {
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
      const result = await this.service.terminate(req.userId!, req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InstallmentExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof NoFutureInstallmentsError) {
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
      if (error instanceof InstallmentExpenseNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof InstallmentHasPastCompetenceError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }
}
