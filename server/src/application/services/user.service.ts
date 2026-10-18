import { User } from "@src/domain/entities/user.entity";
import { GetUserUseCase } from "@src/domain/use-cases/user/get-user.use-case";
import { UserResponseDto } from "@src/application/dtos/user.dto";

export class UserService {
  constructor(private readonly getUserUseCase: GetUserUseCase) {}

  public async getProfile(id: string): Promise<UserResponseDto> {
    const user = await this.getUserUseCase.execute(id);
    return UserService.toResponseDto(user);
  }

  public static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
