import { User } from "@src/domain/entities/user.entity";
import { CreateUserUseCase } from "@src/domain/use-cases/user/create-user.use-case";
import { GetUserUseCase } from "@src/domain/use-cases/user/get-user.use-case";
import { UserResponseDto } from "@src/application/dtos/user.dto";

export class UserService {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
  ) {}

  async createUser(input: { name: string; email: string }): Promise<UserResponseDto> {
    const user = await this.createUserUseCase.execute(input);
    return UserService.toResponseDto(user);
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.getUserUseCase.execute(id);
    return UserService.toResponseDto(user);
  }

  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
