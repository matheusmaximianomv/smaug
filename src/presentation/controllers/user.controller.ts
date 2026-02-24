import { Request, Response, NextFunction } from "express";
import { UserService } from "@src/application/services/user.service";
import { EmailAlreadyExistsError } from "@src/domain/use-cases/user/create-user.use-case";
import { UserNotFoundError } from "@src/domain/use-cases/user/get-user.use-case";

export class UserController {
  constructor(private readonly userService: UserService) {}

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.userService.createUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        res.status(409).json({
          error: error.code,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.userService.getUserById(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          error: error.code,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }
}
