import { Request, Response, NextFunction } from "express";
import { RevenueQueryService } from "@src/application/services/revenue-query.service";

export class RevenueQueryController {
  constructor(private readonly service: RevenueQueryService) {}

  query = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const competenceYear = Number(req.query.competenceYear);
      const competenceMonth = Number(req.query.competenceMonth);

      const result = await this.service.getConsolidatedRevenues(
        req.userId!,
        competenceYear,
        competenceMonth,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
