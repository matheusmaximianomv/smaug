import { AccessTokenClaims, AccessTokenService } from "@src/domain/ports/access-token-service";
import { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";

export interface AuthenticateRequestInput {
  accessToken: string;
}

/**
 * Identifica o autor de uma requisição (§3.3): o token precisa ser válido **e** a sessão dele
 * existir, pertencer ao mesmo usuário e estar ativa — é o que faz o logout valer na requisição
 * seguinte. `null` em qualquer falha; o motivo não sai daqui.
 */
export class AuthenticateRequestUseCase {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  public async execute(input: AuthenticateRequestInput): Promise<AccessTokenClaims | null> {
    const claims = await this.accessTokenService.verify(input.accessToken);
    if (!claims) {
      return null;
    }

    const session = await this.sessionRepository.findSessionById(claims.sessionId);
    if (!session || session.userId !== claims.userId || !session.isActive(new Date())) {
      return null;
    }
    return claims;
  }
}
