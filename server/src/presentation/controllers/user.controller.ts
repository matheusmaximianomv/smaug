import { Request, Response, NextFunction } from "express";
import { UserService } from "@src/application/services/user.service";
import { UserNotFoundError } from "@src/domain/use-cases/user/get-user.use-case";

export class UserController {
  constructor(private readonly userService: UserService) {}

  public async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.userService.getProfile(req.userId!);
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
