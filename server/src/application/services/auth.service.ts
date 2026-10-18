import { User } from "@src/domain/entities/user.entity";
import { GetUserUseCase } from "@src/domain/use-cases/user/get-user.use-case";
import { LoginWithPasswordUseCase } from "@src/domain/use-cases/auth/login-with-password.use-case";
import { RefreshSessionUseCase } from "@src/domain/use-cases/auth/refresh-session.use-case";
import { RegisterWithPasswordUseCase } from "@src/domain/use-cases/auth/register-with-password.use-case";
import { RevokeAllSessionsUseCase } from "@src/domain/use-cases/auth/revoke-all-sessions.use-case";
import { RevokeSessionUseCase } from "@src/domain/use-cases/auth/revoke-session.use-case";
import {
  SessionTokens,
  StartSessionUseCase,
} from "@src/domain/use-cases/auth/start-session.use-case";
import { AuthSessionResult, LoginDto, RegisterDto } from "@src/application/dtos/auth.dto";
import { UserService } from "@src/application/services/user.service";

const MS_PER_SECOND = 1000;

/**
 * Orquestra "autenticar -> abrir sessão": todo método de login termina num `User` e reutiliza o
 * mesmo `StartSessionUseCase`. Não sabe que cookie existe — devolve o refresh em claro e a
 * expiração para o controller.
 */
export class AuthService {
  constructor(
    private readonly registerUseCase: RegisterWithPasswordUseCase,
    private readonly loginWithPasswordUseCase: LoginWithPasswordUseCase,
    private readonly startSessionUseCase: StartSessionUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
    private readonly getUserUseCase: GetUserUseCase,
  ) {}

  public async register(input: RegisterDto): Promise<AuthSessionResult> {
    const user = await this.registerUseCase.execute(input);
    return this.startSession(user);
  }

  public async loginWithPassword(input: LoginDto): Promise<AuthSessionResult> {
    const user = await this.loginWithPasswordUseCase.execute(input);
    return this.startSession(user);
  }

  public async refresh(refreshToken: string | undefined): Promise<AuthSessionResult> {
    const tokens = await this.refreshSessionUseCase.execute({ refreshToken });
    const user = await this.getUserUseCase.execute(tokens.userId);
    return AuthService.toResult(user, tokens);
  }

  public async logout(input: { refreshToken?: string; sessionId?: string }): Promise<void> {
    await this.revokeSessionUseCase.execute(input);
  }

  public async logoutAll(userId: string): Promise<void> {
    await this.revokeAllSessionsUseCase.execute({ userId });
  }

  private async startSession(user: User): Promise<AuthSessionResult> {
    const tokens = await this.startSessionUseCase.execute({
      userId: user.id,
      authMethod: "password",
    });
    return AuthService.toResult(user, tokens);
  }

  private static toResult(user: User, tokens: SessionTokens): AuthSessionResult {
    const remainingMs = tokens.accessTokenExpiresAt.getTime() - Date.now();
    return {
      response: {
        accessToken: tokens.accessToken,
        tokenType: "Bearer",
        expiresIn: Math.ceil(remainingMs / MS_PER_SECOND),
        user: UserService.toResponseDto(user),
      },
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    };
  }
}
