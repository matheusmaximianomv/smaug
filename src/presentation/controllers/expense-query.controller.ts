import { Request, Response, NextFunction } from "express";
import { ExpenseQueryService } from "@src/application/services/expense-query.service";
import { expenseQuerySchema } from "@src/application/dtos/expense-query.dto";

export class ExpenseQueryController {
  public constructor(private readonly service: ExpenseQueryService) {}

  public async query(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { competenceYear, competenceMonth } = expenseQuerySchema.parse(req.query);
      const result = await this.service.getConsolidatedExpenses(req.userId!, {
        competenceYear,
        competenceMonth,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
