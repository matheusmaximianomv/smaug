import { Request, Response, NextFunction } from "express";
import { ExpenseCategoryService } from "@src/application/services/expense-category.service";
import {
  ExpenseCategoryHasLinkedExpensesError,
  ExpenseCategoryNameAlreadyExistsError,
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";

export class ExpenseCategoryController {
  public constructor(private readonly service: ExpenseCategoryService) {}

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.create(req.userId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ExpenseCategoryNameAlreadyExistsError) {
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
      if (error instanceof ExpenseCategoryNotFoundError) {
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
      next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.update(req.userId!, req.params.id as string, req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof ExpenseCategoryNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof ExpenseCategoryNameAlreadyExistsError) {
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
      if (error instanceof ExpenseCategoryNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof ExpenseCategoryHasLinkedExpensesError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }
}
